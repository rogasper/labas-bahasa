import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { env } from "@labas/env/server";
import { generateQuestionsQuick, generateQuestionsAgentic, type GenerationInput } from "@labas/ai";
import { db } from "@labas/db";
import { generationJob, question, testPackage, packageSection, sectionQuestion } from "@labas/db";
import { and, eq, notInArray } from "drizzle-orm";

const connectionOptions = { maxRetriesPerRequest: null };

/** Thrown when the job was cancelled (DB status or cooperative poll). */
export class GenerationJobCancelledError extends Error {
  constructor() {
    super("JOB_CANCELLED");
    this.name = "GenerationJobCancelledError";
  }
}

const CANCEL_POLL_MS = 500;

function createCancellationPoller(jobId: string) {
  let cancelled = false;
  const interval = setInterval(() => {
    db
      .select({ status: generationJob.status })
      .from(generationJob)
      .where(eq(generationJob.id, jobId))
      .limit(1)
      .then(([row]) => {
        if (row?.status === "cancelled") cancelled = true;
      })
      .catch(() => {});
  }, CANCEL_POLL_MS);
  return {
    stop: () => clearInterval(interval),
    check: () => {
      if (cancelled) throw new GenerationJobCancelledError();
    },
  };
}

export type CancelGenerationJobResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "forbidden" | "not_cancellable" };

/**
 * Marks the job cancelled in Postgres, then removes the BullMQ job if it is still waiting/delayed.
 * Active jobs are stopped cooperatively by the worker (cancellation poller).
 */
export async function cancelGenerationJob(
  userId: string,
  jobId: string,
): Promise<CancelGenerationJobResult> {
  const [row] = await db
    .select({
      id: generationJob.id,
      userId: generationJob.userId,
      status: generationJob.status,
    })
    .from(generationJob)
    .where(eq(generationJob.id, jobId))
    .limit(1);

  if (!row) return { ok: false, reason: "not_found" };
  if (row.userId !== userId) return { ok: false, reason: "forbidden" };
  if (row.status === "completed" || row.status === "failed" || row.status === "cancelled") {
    return { ok: false, reason: "not_cancellable" };
  }

  await db
    .update(generationJob)
    .set({
      status: "cancelled",
      errorMessage: "Dibatalkan pengguna",
      completedAt: new Date(),
    })
    .where(eq(generationJob.id, jobId));

  try {
    const bullJob = await generationQueue.getJob(jobId);
    if (bullJob) {
      try {
        await bullJob.remove();
      } catch {
        // Job is likely active (or already gone) — worker exits via DB `cancelled` + poller.
      }
    }
  } catch {
    // Redis/BullMQ hiccup — DB already cancelled; worker will exit cooperatively if active.
  }

  return { ok: true };
}

export const generationQueue = new Queue("generation", {
  connection: new IORedis(env.REDIS_URL, connectionOptions),
});

export const generationWorker = new Worker(
  "generation",
  async (job: Job<{ input: GenerationInput; jobId: string }>) => {
    const { input, jobId } = job.data;
    const start = Date.now();

    const [initialRow] = await db
      .select({ status: generationJob.status })
      .from(generationJob)
      .where(eq(generationJob.id, jobId))
      .limit(1);

    if (!initialRow || initialRow.status === "cancelled" || initialRow.status === "completed") {
      return;
    }

    const claimed = await db
      .update(generationJob)
      .set({ status: "running" })
      .where(
        and(eq(generationJob.id, jobId), notInArray(generationJob.status, ["cancelled", "completed"])),
      )
      .returning({ id: generationJob.id });

    if (!claimed.length) {
      return;
    }

    const cancelPoll = createCancellationPoller(jobId);

    const updateProgress = async (progress: number, message: string) => {
      cancelPoll.check();
      await job.updateProgress(progress);
      await db
        .update(generationJob)
        .set({ progress, progressMessage: message })
        .where(eq(generationJob.id, jobId));
    };

    // Heartbeat: update DB every 10s so BullMQ knows worker is alive
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    const startHeartbeat = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        db
          .update(generationJob)
          .set({ updatedAt: new Date() })
          .where(eq(generationJob.id, jobId))
          .catch(() => {});
      }, 10_000);
    };
    const stopHeartbeat = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };

    try {
      if (input.mode === "agentic") {
        await updateProgress(10, "Generating passage...");
      }

      startHeartbeat();

      let approxTokens = 0;
      const countToken = (token: string) => {
        approxTokens += Math.ceil(token.length / 4);
      };

      const result =
        input.mode === "agentic"
          ? await generateQuestionsAgentic(input, async (p) => {
              cancelPoll.check();
              const stepProgress = Math.min(
                10 + Math.round((p.currentStep / p.steps.length) * 80),
                90,
              );
              const msg = p.steps[p.currentStep]?.message ?? p.steps[p.currentStep]?.step ?? "Processing...";
              await updateProgress(stepProgress, msg);
            })
          : await generateQuestionsQuick(input, {
              onToken: (token) => {
                cancelPoll.check();
                countToken(token);
                // Update progress message with token count every ~500 chars
                if (approxTokens % 20 === 0) {
                  job.updateProgress(job.progress ?? 5).catch(() => {});
                  db
                    .update(generationJob)
                    .set({ progressMessage: `Generating... (~${approxTokens} tokens)` })
                    .where(eq(generationJob.id, jobId))
                    .catch(() => {});
                }
              },
            });

      cancelPoll.check();
      await updateProgress(95, "Saving to bank...");

      // Idempotent auto-save: check if already saved
      const [existingJob] = await db
        .select({ resultJson: generationJob.resultJson })
        .from(generationJob)
        .where(eq(generationJob.id, jobId))
        .limit(1);

      const alreadySaved =
        existingJob?.resultJson &&
        typeof existingJob.resultJson === "object" &&
        "savedQuestionIds" in (existingJob.resultJson as any) &&
        Array.isArray((existingJob.resultJson as any).savedQuestionIds) &&
        (existingJob.resultJson as any).savedQuestionIds.length > 0;

      let savedQuestionIds: string[] = [];
      let generatedPackageId: string | null = null;

      if (!alreadySaved) {
        const [jobRow] = await db
          .select({ userId: generationJob.userId })
          .from(generationJob)
          .where(eq(generationJob.id, jobId))
          .limit(1);

        const userId = jobRow?.userId;
        if (userId) {
          const toInsert = result.questions.map((q) => ({
            examTypeId: input.examType,
            sectionTypeId: input.section,
            format: q.format,
            passageText: q.passageText,
            questionText: q.questionText,
            options: (q as any).options ?? null,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty,
            skillTags: q.skillTags,
            source: "ai" as const,
            aiModel: input.apiKeyConfig.model,
            creatorUserId: userId,
            isPublic: false,
          }));

          const inserted = await db
            .insert(question)
            .values(toInsert as any)
            .returning({ id: question.id });

          savedQuestionIds = inserted.map((r) => r.id);

          // Auto-create a package from generated questions
          if (savedQuestionIds.length > 0) {
            const dateStr = new Date().toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const pkgTitle = `AI Generated — ${input.examType} ${input.section} — ${dateStr}`;

            const [pkg] = await db
              .insert(testPackage)
              .values({
                title: pkgTitle,
                description: `Paket latihan AI-generated dengan ${savedQuestionIds.length} soal ${input.examType} ${input.section}.`,
                examTypeId: input.examType,
                creatorUserId: userId,
                isPublic: false,
                totalQuestions: savedQuestionIds.length,
                totalSections: 1,
                estimatedDurationMin: Math.ceil(savedQuestionIds.length * 1.5),
              })
              .returning();

            if (pkg) {
              generatedPackageId = pkg.id;

              const [sec] = await db
                .insert(packageSection)
                .values({
                  packageId: pkg.id,
                  sectionTypeId: input.section,
                  title: `${input.section} Section`,
                  orderIndex: 0,
                })
                .returning();

              if (sec) {
                await db.insert(sectionQuestion).values(
                  savedQuestionIds.map((qid, idx) => ({
                    sectionId: sec.id,
                    questionId: qid,
                    orderIndex: idx,
                  })),
                );
              }
            }
          }
        }
      }

      await updateProgress(100, "Completed");

      cancelPoll.check();
      await db
        .update(generationJob)
        .set({
          status: "completed",
          resultJson: { ...result, savedQuestionIds, generatedPackageId } as any,
          tokensUsed: result.meta.tokensUsed ?? approxTokens,
          durationMs: Date.now() - start,
          completedAt: new Date(),
        })
        .where(eq(generationJob.id, jobId));
    } catch (err: any) {
      if (err instanceof GenerationJobCancelledError || err?.name === "GenerationJobCancelledError") {
        await db
          .update(generationJob)
          .set({
            status: "cancelled",
            errorMessage: "Dibatalkan pengguna",
            durationMs: Date.now() - start,
            completedAt: new Date(),
          })
          .where(eq(generationJob.id, jobId));
        return;
      }
      await db
        .update(generationJob)
        .set({
          status: "failed",
          errorMessage: err.message ?? String(err),
          durationMs: Date.now() - start,
          completedAt: new Date(),
        })
        .where(eq(generationJob.id, jobId));
      throw err;
    } finally {
      stopHeartbeat();
      cancelPoll.stop();
    }
  },
  {
    connection: new IORedis(env.REDIS_URL, connectionOptions),
    concurrency: 2,
  },
);

export async function enqueueGeneration(
  userId: string,
  input: GenerationInput,
): Promise<string> {
  const [jobRecord] = await db
    .insert(generationJob)
    .values({
      userId,
      mode: input.mode,
      examTypeId: input.examType,
      sectionTypeId: input.section,
      questionCount: input.questionCount,
      status: "pending",
      progress: 0,
    })
    .returning();

  if (!jobRecord) {
    throw new Error("Failed to create generation job");
  }

  await generationQueue.add(
    "generate",
    { input, jobId: jobRecord.id },
    {
      jobId: jobRecord.id,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  );

  return jobRecord.id;
}
