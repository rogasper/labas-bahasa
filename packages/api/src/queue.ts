import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { env } from "@labas/env/server";
import {
  generateQuestionsQuick,
  generateQuestionsAgentic,
  GenerationError,
  type GenerationInput,
  type GenerationResult,
} from "@labas/ai";
import { db } from "@labas/db";
import {
  generationJob,
  question,
  testPackage,
  packageSection,
  sectionQuestion,
} from "@labas/db";
import { and, eq, notInArray } from "drizzle-orm";
import { encryptApiKey, decryptApiKey } from "./lib/encryption";

const connectionOptions = { maxRetriesPerRequest: null };
const FAST_QUEUE_NAME = "generation-fast";
const QUALITY_QUEUE_NAME = "generation-quality";
const CANCEL_POLL_MS = 500;
const HEARTBEAT_MS = 10_000;
const MAX_QUESTIONS_PER_SHARD = 6;
const FAST_SHARD_CONCURRENCY = 3;
const QUALITY_SECTION_CONCURRENCY = 2;
export const MAX_SHARD_RETRIES = 2;

interface SectionSplit {
  section: string;
  count: number;
}

interface ShardPlan extends SectionSplit {
  sectionIndex: number;
  shardIndex: number;
  shardCount: number;
}

interface PersistableQuestion {
  section: string;
  format: string;
  passageText: string;
  questionText: string;
  options: unknown;
  correctAnswer: string;
  explanation: string;
  difficulty: number;
  skillTags: string[];
  aiModel: string;
}

interface FastJobData {
  input: GenerationInput;
  jobId: string;
}

interface QualityJobData {
  input: GenerationInput;
  jobId: string;
  sectionSplits: SectionSplit[];
  fastQuestions: PersistableQuestion[];
  fastMeta: {
    tokensUsed: number;
    durationMs: number;
    approxTokens: number;
  };
}

/** Thrown when the job was cancelled (DB status or cooperative poll). */
export class GenerationJobCancelledError extends Error {
  constructor() {
    super("JOB_CANCELLED");
    this.name = "GenerationJobCancelledError";
  }
}

export function computeSectionSplit(
  selectedSections: string[],
  count: number,
): SectionSplit[] {
  const sections = selectedSections.length > 0 ? selectedSections : ["READING"];
  if (count < 20 || sections.length <= 1) {
    return [{ section: sections[0]!, count }];
  }
  const base = Math.floor(count / sections.length);
  const remainder = count % sections.length;
  return sections.map((section, i) => ({
    section,
    count: base + (i < remainder ? 1 : 0),
  }));
}

export function splitIntoShards(sectionSplits: SectionSplit[]): ShardPlan[] {
  const shards: ShardPlan[] = [];
  for (let sectionIndex = 0; sectionIndex < sectionSplits.length; sectionIndex++) {
    const split = sectionSplits[sectionIndex]!;
    const shardCount = Math.ceil(split.count / MAX_QUESTIONS_PER_SHARD);
    let remaining = split.count;
    for (let shardIndex = 0; shardIndex < shardCount; shardIndex++) {
      const count = Math.min(MAX_QUESTIONS_PER_SHARD, remaining);
      remaining -= count;
      shards.push({
        section: split.section,
        count,
        sectionIndex,
        shardIndex,
        shardCount,
      });
    }
  }
  return shards;
}

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

export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]!, index);
    }
  });

  await Promise.all(runners);
  return results;
}

export function normalizeQuestions(
  section: string,
  model: string,
  result: GenerationResult,
): PersistableQuestion[] {
  return result.questions.map((q) => ({
    section,
    format: q.format,
    passageText: q.passageText,
    questionText: q.questionText,
    options: (q as any).options ?? null,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    difficulty: q.difficulty,
    skillTags: q.skillTags,
    aiModel: model,
  }));
}

async function saveGeneratedArtifacts(
  jobId: string,
  input: GenerationInput,
  allQuestions: PersistableQuestion[],
  sectionSplits: SectionSplit[],
): Promise<{ savedQuestionIds: string[]; generatedPackageId: string | null }> {
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

  if (alreadySaved) {
    const savedQuestionIds = (existingJob!.resultJson as any).savedQuestionIds as string[];
    return {
      savedQuestionIds,
      generatedPackageId: ((existingJob!.resultJson as any).generatedPackageId ?? null) as string | null,
    };
  }

  const [jobRow] = await db
    .select({ userId: generationJob.userId })
    .from(generationJob)
    .where(eq(generationJob.id, jobId))
    .limit(1);

  const userId = jobRow?.userId;
  if (!userId) return { savedQuestionIds: [], generatedPackageId: null };

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

  const savedQuestionIds = inserted.map((r) => r.id);
  if (!savedQuestionIds.length) {
    return { savedQuestionIds, generatedPackageId: null };
  }

  let generatedPackageId: string | null = null;
  try {
    const dateStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const sectionLabel =
      sectionSplits.length > 1 ? `${sectionSplits.length} sections` : input.section;
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

    if (!pkg) return { savedQuestionIds, generatedPackageId };
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
  } catch (packageErr: any) {
    // eslint-disable-next-line no-console
    console.warn("[GENERATION] Failed to auto-create package, but questions were saved.", {
      error: packageErr?.message ?? String(packageErr),
      jobId,
      examType: input.examType,
      section: input.section,
    });
  }

  return { savedQuestionIds, generatedPackageId };
}

async function completeJobWithResult(params: {
  jobId: string;
  input: GenerationInput;
  statusMessage?: string;
  allQuestions: PersistableQuestion[];
  sectionSplits: SectionSplit[];
  totalTokens: number;
  durationMs: number;
  metrics?: Record<string, unknown>;
}) {
  const [currentJob] = await db
    .select({ status: generationJob.status })
    .from(generationJob)
    .where(eq(generationJob.id, params.jobId))
    .limit(1);
  if (currentJob?.status === "cancelled") return;

  const { savedQuestionIds, generatedPackageId } = await saveGeneratedArtifacts(
    params.jobId,
    params.input,
    params.allQuestions,
    params.sectionSplits,
  );

  const result: GenerationResult = {
    questions: params.allQuestions as any,
    meta: {
      model: params.input.apiKeyConfig.model,
      tokensUsed: params.totalTokens,
      durationMs: params.durationMs,
      mode: params.input.mode,
    },
  };

  await db
    .update(generationJob)
    .set({
      status: "completed",
      progress: 100,
      progressMessage: params.statusMessage ?? "Completed",
      resultJson: {
        ...result,
        savedQuestionIds,
        generatedPackageId,
        sectionSplits: params.sectionSplits,
        qualityPhase: "final",
        metrics: params.metrics,
      } as any,
      tokensUsed: params.totalTokens,
      durationMs: params.durationMs,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(generationJob.id, params.jobId),
        notInArray(generationJob.status, ["cancelled"]),
      ),
    );
}

export type CancelGenerationJobResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "forbidden" | "not_cancellable" };

export const generationQueue = new Queue<FastJobData>(FAST_QUEUE_NAME, {
  connection: new IORedis(env.REDIS_URL, connectionOptions),
});

export const generationQualityQueue = new Queue<QualityJobData>(QUALITY_QUEUE_NAME, {
  connection: new IORedis(env.REDIS_URL, connectionOptions),
});

/**
 * Marks the job cancelled in Postgres, then removes queued jobs.
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

  for (const queue of [generationQueue, generationQualityQueue]) {
    try {
      const bullJob = await queue.getJob(jobId);
      if (bullJob) {
        try {
          await bullJob.remove();
        } catch {
          // Likely active; worker exits cooperatively.
        }
      }
    } catch {
      // Ignore queue hiccups.
    }
  }

  return { ok: true };
}

export const generationWorker = new Worker<FastJobData>(
  FAST_QUEUE_NAME,
  async (job: Job<FastJobData>) => {
    const { input, jobId } = job.data;
    const start = Date.now();

    const [initialRow] = await db
      .select({ status: generationJob.status })
      .from(generationJob)
      .where(eq(generationJob.id, jobId))
      .limit(1);

    if (
      !initialRow ||
      initialRow.status === "cancelled" ||
      initialRow.status === "completed"
    ) {
      return;
    }

    const claimed = await db
      .update(generationJob)
      .set({ status: "running_fast" })
      .where(
        and(
          eq(generationJob.id, jobId),
          notInArray(generationJob.status, ["cancelled", "completed"]),
        ),
      )
      .returning({ id: generationJob.id });

    if (!claimed.length) return;

    const cancelPoll = createCancellationPoller(jobId);
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    const startHeartbeat = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        db
          .update(generationJob)
          .set({ updatedAt: new Date() })
          .where(eq(generationJob.id, jobId))
          .catch(() => {});
      }, HEARTBEAT_MS);
    };
    const stopHeartbeat = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };

    const pushLog = async (
      step: string,
      message: string,
      status: "running" | "done" | "error",
      details?: string,
    ) => {
      const entry = {
        step,
        message,
        status,
        timestamp: new Date().toISOString(),
        details,
      };
      const [row] = await db
        .select({ logs: generationJob.logs })
        .from(generationJob)
        .where(eq(generationJob.id, jobId))
        .limit(1);
      const existing = (row?.logs ?? []) as Array<{
        step: string;
        message: string;
        status: string;
        timestamp: string;
        details?: string;
      }>;
      await db
        .update(generationJob)
        .set({ logs: [...existing, entry] })
        .where(eq(generationJob.id, jobId));
    };

    const updateProgress = async (
      progress: number,
      progressMessage: string,
      status?: string,
      resultJson?: unknown,
    ) => {
      cancelPoll.check();
      await job.updateProgress(progress);
      const [updated] = await db
        .update(generationJob)
        .set({
          progress,
          progressMessage,
          ...(status ? { status } : {}),
          ...(resultJson !== undefined ? { resultJson: resultJson as any } : {}),
        })
        .where(
          and(
            eq(generationJob.id, jobId),
            notInArray(generationJob.status, ["cancelled"]),
          ),
        )
        .returning({ id: generationJob.id });
      if (!updated) throw new GenerationJobCancelledError();
    };

    let approxTokens = 0;
    const tokenCounter = (token: string) => {
      cancelPoll.check();
      approxTokens += Math.ceil(token.length / 4);
    };

    try {
      startHeartbeat();

      const selectedMode = input.mode;
      const activeSections = input.selectedSections ?? [input.section];
      const sectionSplits = computeSectionSplit(activeSections, input.questionCount);
      const shards = splitIntoShards(sectionSplits);
      const minPartialThreshold = Math.min(3, input.questionCount);

      await updateProgress(
        5,
        `Planning ${sectionSplits.length} section(s), ${shards.length} shard(s)...`,
      );
      await pushLog(
        "plan",
        `Section plan: ${sectionSplits
          .map((s) => `${s.section}(${s.count})`)
          .join(", ")} | shards=${shards.length}`,
        "done",
      );

      let totalTokens = 0;
      let totalDurationMs = 0;
      let completedShards = 0;
      let partialPublished = false;
      let timeToFirstValidQuestionMs: number | null = null;
      const shardResults: Array<{
        shard: ShardPlan;
        questions: PersistableQuestion[];
      }> = [];

      const runShard = async (shard: ShardPlan): Promise<void> => {
        cancelPoll.check();
        await pushLog(
          "generate_shard",
          `[${shard.section}] shard ${shard.shardIndex + 1}/${shard.shardCount} generating ${shard.count} question(s)`,
          "running",
        );

        const subInput: GenerationInput = {
          ...input,
          section: shard.section as any,
          questionCount: shard.count,
        };

        let sectionResult: GenerationResult;
        try {
          if (selectedMode === "agentic") {
            sectionResult = await generateQuestionsAgentic(
              subInput,
              undefined,
              tokenCounter,
              { strategy: "lean", maxRegenerateAttempts: 1 },
            );
          } else {
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

          sectionResult = await generateQuestionsAgentic(
            { ...subInput, mode: "agentic" },
            undefined,
            tokenCounter,
            { strategy: "lean", maxRegenerateAttempts: 1 },
          );
        }

        const normalized = normalizeQuestions(
          shard.section,
          input.apiKeyConfig.model,
          sectionResult,
        );
        shardResults.push({ shard, questions: normalized });
        totalTokens += sectionResult.meta.tokensUsed ?? 0;
        totalDurationMs += sectionResult.meta.durationMs;

        completedShards += 1;
        const progress = Math.min(
          15 + Math.round((completedShards / shards.length) * 65),
          80,
        );
        const generatedCount = shardResults.reduce(
          (acc, item) => acc + item.questions.length,
          0,
        );
        if (generatedCount > 0 && timeToFirstValidQuestionMs == null) {
          timeToFirstValidQuestionMs = Date.now() - start;
        }
        await updateProgress(
          progress,
          `Fast generation: ${generatedCount}/${input.questionCount} soal`,
        );
        await pushLog(
          "generate_shard",
          `[${shard.section}] shard ${shard.shardIndex + 1}/${shard.shardCount} completed`,
          "done",
        );

        if (!partialPublished && generatedCount >= minPartialThreshold) {
          partialPublished = true;
          const partialQuestions = shardResults
            .sort((a, b) => {
              if (a.shard.sectionIndex !== b.shard.sectionIndex) {
                return a.shard.sectionIndex - b.shard.sectionIndex;
              }
              return a.shard.shardIndex - b.shard.shardIndex;
            })
            .flatMap((r) => r.questions)
            .slice(0, input.questionCount);
          const partialResult: GenerationResult = {
            questions: partialQuestions as any,
            meta: {
              model: input.apiKeyConfig.model,
              tokensUsed: totalTokens || approxTokens,
              durationMs: Date.now() - start,
              mode: input.mode,
            },
          };
          await updateProgress(
            70,
            `Partial ready: ${partialQuestions.length} soal`,
            "partial_ready",
            {
              ...partialResult,
              sectionSplits,
              qualityPhase: "fast",
              isPartial: true,
              metrics: {
                timeToFirstValidQuestionMs: timeToFirstValidQuestionMs ?? Date.now() - start,
                shardCount: shards.length,
                shardRetryBudget: MAX_SHARD_RETRIES,
              },
            },
          );
        }
      };

      const failedShards: ShardPlan[] = [];
      await runWithConcurrency(shards, FAST_SHARD_CONCURRENCY, async (shard) => {
        try {
          await runShard(shard);
        } catch {
          failedShards.push(shard);
        }
      });

      if (failedShards.length > 0) {
        await pushLog(
          "retry_budget",
          `Retrying ${failedShards.length} failed shard(s), budget=${MAX_SHARD_RETRIES}`,
          "running",
        );
      }

      for (const failedShard of failedShards) {
        let success = false;
        for (let attempt = 1; attempt <= MAX_SHARD_RETRIES; attempt++) {
          try {
            await runShard(failedShard);
            success = true;
            break;
          } catch (retryErr: any) {
            await pushLog(
              "retry_budget",
              `[${failedShard.section}] shard retry ${attempt}/${MAX_SHARD_RETRIES} failed: ${retryErr?.message ?? String(retryErr)}`,
              "error",
            );
          }
        }
        if (!success) {
          await pushLog(
            "retry_budget",
            `[${failedShard.section}] exhausted retry budget`,
            "error",
          );
        }
      }

      const allQuestions = shardResults
        .sort((a, b) => {
          if (a.shard.sectionIndex !== b.shard.sectionIndex) {
            return a.shard.sectionIndex - b.shard.sectionIndex;
          }
          return a.shard.shardIndex - b.shard.shardIndex;
        })
        .flatMap((r) => r.questions)
        .slice(0, input.questionCount);

      if (allQuestions.length === 0) {
        throw new Error("No questions generated in fast phase");
      }

      const fastResult: GenerationResult = {
        questions: allQuestions as any,
        meta: {
          model: input.apiKeyConfig.model,
          tokensUsed: totalTokens || approxTokens,
          durationMs: totalDurationMs || Date.now() - start,
          mode: input.mode,
        },
      };

      if (selectedMode === "agentic") {
        await updateProgress(85, "Fast phase done, enqueuing quality phase...", "running_quality", {
          ...fastResult,
          sectionSplits,
          qualityPhase: "fast",
          isPartial: true,
          metrics: {
            timeToFirstValidQuestionMs: timeToFirstValidQuestionMs ?? Date.now() - start,
            shardCount: shards.length,
            shardRetryBudget: MAX_SHARD_RETRIES,
          },
        });
        await pushLog(
          "quality_queue",
          "Partial result ready, lanjut quality upgrade di background",
          "done",
        );
        await generationQualityQueue.add(
          "quality-upgrade",
          {
            input,
            jobId,
            sectionSplits,
            fastQuestions: allQuestions,
            fastMeta: {
              tokensUsed: totalTokens,
              durationMs: totalDurationMs || Date.now() - start,
              approxTokens,
            },
          },
          {
            jobId,
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 100 },
            attempts: 2,
            backoff: { type: "exponential", delay: 4000 },
          },
        );
        return;
      }

      await pushLog("save", "Saving quick result...", "running");
      await completeJobWithResult({
        jobId,
        input,
        allQuestions,
        sectionSplits,
        totalTokens: totalTokens || approxTokens,
        durationMs: Date.now() - start,
        statusMessage: "Completed",
        metrics: {
          timeToFirstValidQuestionMs: timeToFirstValidQuestionMs ?? Date.now() - start,
          shardCount: shards.length,
          shardRetryBudget: MAX_SHARD_RETRIES,
          shardFailures: failedShards.length,
        },
      });
      await pushLog("save", `Saved ${allQuestions.length} questions`, "done");
    } catch (err: any) {
      if (
        err instanceof GenerationJobCancelledError ||
        err?.name === "GenerationJobCancelledError"
      ) {
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

      let failedTokens: number | undefined;
      if (err instanceof GenerationError) failedTokens = err.tokensUsed ?? undefined;
      if (failedTokens == null && approxTokens > 0) failedTokens = approxTokens;

      await db
        .update(generationJob)
        .set({
          status: "failed",
          errorMessage: err?.message ?? String(err),
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
    concurrency: 5,
  },
);

export const generationQualityWorker = new Worker<QualityJobData>(
  QUALITY_QUEUE_NAME,
  async (job: Job<QualityJobData>) => {
    const { input, jobId, sectionSplits, fastQuestions, fastMeta } = job.data;
    const qualityStart = Date.now();

    const [initialRow] = await db
      .select({ status: generationJob.status })
      .from(generationJob)
      .where(eq(generationJob.id, jobId))
      .limit(1);

    if (
      !initialRow ||
      initialRow.status === "cancelled" ||
      initialRow.status === "completed"
    ) {
      return;
    }

    const cancelPoll = createCancellationPoller(jobId);
    let approxTokens = 0;
    const tokenCounter = (token: string) => {
      cancelPoll.check();
      approxTokens += Math.ceil(token.length / 4);
    };

    const updateProgress = async (progress: number, progressMessage: string) => {
      cancelPoll.check();
      await job.updateProgress(progress);
      const [updated] = await db
        .update(generationJob)
        .set({
          status: "running_quality",
          progress,
          progressMessage,
        })
        .where(
          and(
            eq(generationJob.id, jobId),
            notInArray(generationJob.status, ["cancelled"]),
          ),
        )
        .returning({ id: generationJob.id });
      if (!updated) throw new GenerationJobCancelledError();
    };

    const pushLog = async (
      step: string,
      message: string,
      status: "running" | "done" | "error",
    ) => {
      const entry = { step, message, status, timestamp: new Date().toISOString() };
      const [row] = await db
        .select({ logs: generationJob.logs })
        .from(generationJob)
        .where(eq(generationJob.id, jobId))
        .limit(1);
      const existing = (row?.logs ?? []) as Array<Record<string, unknown>>;
      await db
        .update(generationJob)
        .set({ logs: [...existing, entry] as any })
        .where(eq(generationJob.id, jobId));
    };

    try {
      await updateProgress(86, "Quality phase started...");
      await pushLog("quality_start", "Running deep quality validation...", "running");

      let completedSections = 0;
      const sectionResults = await runWithConcurrency(
        sectionSplits,
        QUALITY_SECTION_CONCURRENCY,
        async (split) => {
          try {
            const sectionInput: GenerationInput = {
              ...input,
              section: split.section as any,
              questionCount: split.count,
              mode: "agentic",
            };
            const result = await generateQuestionsAgentic(
              sectionInput,
              undefined,
              tokenCounter,
              { strategy: "full", maxRegenerateAttempts: 2 },
            );
            return {
              section: split.section,
              questions: normalizeQuestions(
                split.section,
                input.apiKeyConfig.model,
                result,
              ),
              tokensUsed: result.meta.tokensUsed ?? 0,
            };
          } catch {
            const fallbackQuestions = fastQuestions
              .filter((q) => q.section === split.section)
              .slice(0, split.count);
            return {
              section: split.section,
              questions: fallbackQuestions,
              tokensUsed: 0,
              usedFallback: true,
            };
          } finally {
            completedSections += 1;
            const progress = Math.min(
              86 + Math.round((completedSections / sectionSplits.length) * 10),
              96,
            );
            await updateProgress(
              progress,
              `Quality phase ${completedSections}/${sectionSplits.length}`,
            );
          }
        },
      );

      const mergedQuestions = sectionSplits
        .flatMap((split) => {
          const sectionEntry = sectionResults.find((r) => r.section === split.section);
          return (sectionEntry?.questions ?? []).slice(0, split.count);
        })
        .slice(0, input.questionCount);

      if (mergedQuestions.length === 0) {
        throw new Error("Quality phase produced no questions");
      }

      const qualityTokens =
        sectionResults.reduce((acc, cur) => acc + (cur.tokensUsed ?? 0), 0) +
        (approxTokens > 0 ? approxTokens : 0);
      const totalTokens =
        (fastMeta.tokensUsed || fastMeta.approxTokens || 0) + qualityTokens;

      await completeJobWithResult({
        jobId,
        input,
        allQuestions: mergedQuestions,
        sectionSplits,
        totalTokens,
        durationMs: Date.now() - qualityStart + fastMeta.durationMs,
        statusMessage: "Completed (quality upgraded)",
        metrics: {
          qualityUpgraded: true,
          qualitySections: sectionSplits.length,
          qualityApproxTokens: approxTokens,
        },
      });
      await pushLog("quality_done", "Quality upgrade completed", "done");
    } catch (err: any) {
      if (
        err instanceof GenerationJobCancelledError ||
        err?.name === "GenerationJobCancelledError"
      ) {
        await db
          .update(generationJob)
          .set({
            status: "cancelled",
            errorMessage: "Dibatalkan pengguna",
            completedAt: new Date(),
          })
          .where(eq(generationJob.id, jobId));
        return;
      }

      // Fallback safety: complete using fast result if quality pass fails.
      if (fastQuestions.length > 0) {
        await completeJobWithResult({
          jobId,
          input,
          allQuestions: fastQuestions.slice(0, input.questionCount),
          sectionSplits,
          totalTokens: fastMeta.tokensUsed || fastMeta.approxTokens || 0,
          durationMs: fastMeta.durationMs,
          statusMessage: "Completed (fast result, quality fallback)",
          metrics: {
            qualityUpgraded: false,
            qualityFallback: true,
          },
        });
        return;
      }

      await db
        .update(generationJob)
        .set({
          status: "failed",
          errorMessage: err?.message ?? String(err),
          durationMs: Date.now() - qualityStart,
          completedAt: new Date(),
        })
        .where(eq(generationJob.id, jobId));
      throw err;
    } finally {
      cancelPoll.stop();
    }
  },
  {
    connection: new IORedis(env.REDIS_URL, connectionOptions),
    concurrency: 1,
  },
);

export async function enqueueGeneration(
  userId: string,
  input: GenerationInput,
): Promise<string> {
  const encryptedInput = {
    ...input,
    apiKeyConfig: {
      ...input.apiKeyConfig,
      apiKey: encryptApiKey(input.apiKeyConfig.apiKey),
    },
  };

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
      inputJson: encryptedInput as any,
    })
    .returning();

  if (!jobRecord) throw new Error("Failed to create generation job");

  await generationQueue.add(
    "generate-fast",
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

export function decryptInputFromDb(inputJson: unknown): GenerationInput {
  const data = inputJson as Record<string, unknown>;
  const apiKeyConfig = data.apiKeyConfig as Record<string, unknown>;
  if (apiKeyConfig?.apiKey && typeof apiKeyConfig.apiKey === "string") {
    try {
      return {
        ...(data as unknown as GenerationInput),
        apiKeyConfig: {
          ...(apiKeyConfig as unknown as GenerationInput["apiKeyConfig"]),
          apiKey: decryptApiKey(apiKeyConfig.apiKey),
        },
      };
    } catch {
      // If decryption fails, key was likely stored unencrypted (legacy data)
      return data as unknown as GenerationInput;
    }
  }
  return data as unknown as GenerationInput;
}
