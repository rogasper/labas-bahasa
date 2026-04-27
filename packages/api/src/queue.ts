import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { env } from "@labas/env/server";
import { generateQuestionsQuick, generateQuestionsAgentic, type GenerationInput } from "@labas/ai";
import { db } from "@labas/db";
import { generationJob, question, testPackage, packageSection, sectionQuestion } from "@labas/db";
import { eq } from "drizzle-orm";

const redisConnection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const generationQueue = new Queue("generation", {
  connection: redisConnection,
});

export const generationWorker = new Worker(
  "generation",
  async (job: Job<{ input: GenerationInput; jobId: string }>) => {
    const { input, jobId } = job.data;
    const start = Date.now();

    const updateProgress = async (progress: number, message: string) => {
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
      await db
        .update(generationJob)
        .set({ status: "running" })
        .where(eq(generationJob.id, jobId));

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
              const stepProgress = Math.min(
                10 + Math.round((p.currentStep / p.steps.length) * 80),
                90,
              );
              const msg = p.steps[p.currentStep]?.message ?? p.steps[p.currentStep]?.step ?? "Processing...";
              await updateProgress(stepProgress, msg);
            })
          : await generateQuestionsQuick(input, {
              onToken: (token) => {
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

      stopHeartbeat();
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
      stopHeartbeat();
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
    }
  },
  {
    connection: redisConnection,
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
