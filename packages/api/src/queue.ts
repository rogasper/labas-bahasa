import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { env } from "@labas/env/server";
import { generateQuestionsQuick, generateQuestionsAgentic, GenerationError, type GenerationInput, type GenerationResult } from "@labas/ai";
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

function computeSectionSplit(
  selectedSections: string[],
  count: number,
): { section: string; count: number }[] {
  const sections = selectedSections.length > 0 ? selectedSections : ["READING"];
  if (count < 20 || sections.length <= 1) {
    return [{ section: sections[0]!, count }];
  }
  const base = Math.floor(count / sections.length);
  const remainder = count % sections.length;
  const result = sections.map((section, i) => ({
    section,
    count: base + (i < remainder ? 1 : 0),
  }));
  return result;
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

    const pushLog = async (
      step: string,
      message: string,
      status: "running" | "done" | "error",
      details?: string,
    ) => {
      const entry = { step, message, status, timestamp: new Date().toISOString(), details };
      const [row] = await db
        .select({ logs: generationJob.logs })
        .from(generationJob)
        .where(eq(generationJob.id, jobId))
        .limit(1);
      const existing = (row?.logs ?? []) as Array<{ step: string; message: string; status: string; timestamp: string; details?: string }>;
      const updated = [...existing, entry];
      await db
        .update(generationJob)
        .set({ logs: updated })
        .where(eq(generationJob.id, jobId));
    };

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

    let approxTokens = 0;
    const countToken = (token: string) => {
      approxTokens += Math.ceil(token.length / 4);
    };

    try {
      const selectedMode = input.mode;
      const activeSections = input.selectedSections ?? [input.section];
      const isMultiSection = selectedMode === "agentic" && input.questionCount >= 20 && activeSections.length > 1;
      const sectionSplits = computeSectionSplit(activeSections, input.questionCount);

      if (isMultiSection) {
        await updateProgress(5, `Preparing ${sectionSplits.length} sections...`);
        await pushLog("plan", `Multi-section plan: ${sectionSplits.map((s) => `${s.section}(${s.count})`).join(", ")}`, "done");
      } else if (selectedMode === "agentic") {
        await updateProgress(10, "Generating passage...");
        await pushLog("generate_passage", "Starting passage generation...", "running");
      }

      startHeartbeat();

      const tokenCounter = (token: string) => {
        cancelPoll.check();
        countToken(token);
        if (approxTokens % 20 === 0) {
          job.updateProgress(job.progress ?? 5).catch(() => {});
          db
            .update(generationJob)
            .set({ progressMessage: `Generating... (~${approxTokens} tokens)` })
            .where(eq(generationJob.id, jobId))
            .catch(() => {});
        }
      };

      // ── Generation Phase ─────────────────────────────────────
      let allQuestions: Array<{
        section: string;
        format: string;
        passageText: string;
        questionText: string;
        options: any;
        correctAnswer: string;
        explanation: string;
        difficulty: number;
        skillTags: string[];
        aiModel: string;
      }> = [];
      let totalTokens = 0;
      let totalDurationMs = 0;

      for (let secIdx = 0; secIdx < sectionSplits.length; secIdx++) {
        const split = sectionSplits[secIdx]!;
        const subInput: GenerationInput = { ...input, section: split.section as any, questionCount: split.count };
        const progressSlice = isMultiSection ? 90 / sectionSplits.length : 80;
        const progressOffset = isMultiSection ? 5 + secIdx * progressSlice : 10;

        let sectionResult: GenerationResult;
        try {
          if (selectedMode === "agentic") {
            sectionResult = await generateQuestionsAgentic(subInput, async (p) => {
              cancelPoll.check();
              const rawProgress = (p.currentStep / p.steps.length) * progressSlice;
              const mappedProgress = Math.min(
                Math.round(progressOffset + rawProgress),
                isMultiSection ? Math.round(5 + (secIdx + 1) * progressSlice) : 90,
              );
              const step = p.steps[p.currentStep];
              const msg = step?.message ?? step?.step ?? "Processing...";
              const status = step?.status === "error" ? "error" : step?.status === "done" ? "done" : "running";
              const prefix = isMultiSection ? `[${split.section}] ` : "";
              await updateProgress(mappedProgress, `${prefix}${msg}`);
              await pushLog(
                step?.step ?? "unknown",
                `${prefix}${msg}`,
                status,
                step?.output,
              );
            }, tokenCounter);
          } else {
            // Quick mode (single section only)
            sectionResult = await generateQuestionsQuick(subInput, {
              onToken: tokenCounter,
            });
          }
        } catch (quickErr: any) {
          const quickErrorMessage = quickErr?.message ?? String(quickErr);
          const shouldFallbackToAgentic =
            selectedMode === "quick" &&
            (/Failed to parse AI response as JSON/i.test(quickErrorMessage) ||
              /Unterminated string/i.test(quickErrorMessage) ||
              /Missing 'questions' array/i.test(quickErrorMessage));

          if (!shouldFallbackToAgentic) {
            throw quickErr;
          }

          await updateProgress(25, "Quick mode JSON invalid, retrying with agentic mode...");
          sectionResult = await generateQuestionsAgentic(
            { ...subInput, mode: "agentic" },
            async (p) => {
              cancelPoll.check();
              const stepProgress = Math.min(25 + Math.round((p.currentStep / p.steps.length) * 65), 90);
              const msg =
                p.steps[p.currentStep]?.message ?? p.steps[p.currentStep]?.step ?? "Processing...";
              await updateProgress(stepProgress, msg);
            },
            tokenCounter,
          );
        }

        for (const q of sectionResult.questions) {
          allQuestions.push({
            section: split.section,
            format: q.format,
            passageText: q.passageText,
            questionText: q.questionText,
            options: (q as any).options ?? null,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty,
            skillTags: q.skillTags,
            aiModel: input.apiKeyConfig.model,
          });
        }

        totalTokens += sectionResult.meta.tokensUsed ?? 0;
        totalDurationMs += sectionResult.meta.durationMs;
      }

      // ── Saving Phase ─────────────────────────────────────────
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
          const inserted = await db
            .insert(question)
            .values(
              allQuestions.map((q) => ({
                examTypeId: input.examType,
                sectionTypeId: q.section,
                format: q.format,
                passageText: q.passageText,
                questionText: q.questionText,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                difficulty: q.difficulty,
                skillTags: q.skillTags,
                source: "ai" as const,
                aiModel: q.aiModel,
                creatorUserId: userId,
                isPublic: false,
              })) as any,
            )
            .returning({ id: question.id });

          savedQuestionIds = inserted.map((r) => r.id);

          // Auto-create a package from generated questions.
          // Non-fatal: if this fails, generation should still succeed with savedQuestionIds.
          if (savedQuestionIds.length > 0) {
            try {
              const dateStr = new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const sectionLabel = isMultiSection
                ? `${sectionSplits.length} sections`
                : input.section;
              const pkgTitle = `AI Generated - ${input.examType} ${sectionLabel} - ${dateStr}`;

              const [pkg] = await db
                .insert(testPackage)
                .values({
                  title: pkgTitle,
                  description: `Paket latihan AI-generated dengan ${savedQuestionIds.length} soal ${input.examType}.`,
                  examTypeId: input.examType,
                  creatorUserId: userId,
                  isPublic: false,
                  totalQuestions: savedQuestionIds.length,
                  totalSections: sectionSplits.length,
                  estimatedDurationMin: Math.ceil(savedQuestionIds.length * 1.5),
                })
                .returning();

              if (pkg) {
                generatedPackageId = pkg.id;

                for (let i = 0; i < sectionSplits.length; i++) {
                  const split = sectionSplits[i]!;
                  const sectionQuestions = allQuestions
                    .map((q, idx) => ({ ...q, _globalIndex: idx }))
                    .filter((q) => q.section === split.section);

                  const [sec] = await db
                    .insert(packageSection)
                    .values({
                      packageId: pkg.id,
                      sectionTypeId: split.section,
                      title: `${split.section} Section`,
                      orderIndex: i,
                    })
                    .returning();

                  if (sec) {
                    await db.insert(sectionQuestion).values(
                      sectionQuestions
                        .map((q, idx) => ({
                          sectionId: sec.id,
                          questionId: savedQuestionIds[q._globalIndex],
                          orderIndex: idx,
                        }))
                        .filter((q) => q.questionId != null) as any,
                    );
                  }
                }
              }
            } catch (packageErr: any) {
              // eslint-disable-next-line no-console
              console.warn("[GENERATION] Failed to auto-create package, but questions were saved.", {
                error: packageErr?.message ?? String(packageErr),
                jobId,
                examType: input.examType,
                section: input.section,
              });
            }
          }
        }
      }

      await updateProgress(100, "Completed");
      await pushLog("save", `Saved ${savedQuestionIds.length} questions${generatedPackageId ? ` & created package` : ""}`, "done");

      const combinedResult: GenerationResult = {
        questions: allQuestions as any,
        meta: {
          model: input.apiKeyConfig.model,
          tokensUsed: totalTokens || approxTokens,
          durationMs: totalDurationMs || Date.now() - start,
          mode: selectedMode,
        },
      };

      cancelPoll.check();
      await db
        .update(generationJob)
        .set({
          status: "completed",
          resultJson: { ...combinedResult, savedQuestionIds, generatedPackageId, sectionSplits } as any,
          tokensUsed: totalTokens || approxTokens,
          durationMs: Date.now() - start,
          completedAt: new Date(),
        })
        .where(eq(generationJob.id, jobId));
    } catch (err: any) {
      if (err instanceof GenerationJobCancelledError || err?.name === "GenerationJobCancelledError") {
        await pushLog("cancel", "Job dibatalkan pengguna", "error");
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

      await pushLog("error", err.message ?? String(err), "error");

      // Extract token usage even on failure so users aren't left in the dark
      let failedTokens: number | undefined;
      if (err instanceof GenerationError) {
        failedTokens = err.tokensUsed ?? undefined;
      }
      // For quick-mode network/streaming timeouts where approxTokens was accumulated
      if (failedTokens == null && approxTokens > 0) {
        failedTokens = approxTokens;
      }

      await db
        .update(generationJob)
        .set({
          status: "failed",
          errorMessage: err.message ?? String(err),
          tokensUsed: failedTokens,
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
      inputJson: input as any,
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
