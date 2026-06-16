import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { env } from "@labas/env/server";

async function log(level: "debug" | "warn", message: string, meta?: Record<string, unknown>) {
  const mod = await import("@labas/api/logger");
  (mod.logger as any)[level](message, meta);
}
import {
  generateQuestionsQuick,
  generateQuestionsAgentic,
  generatePassageForInput,
  generateQuestionsAgenticFromPassage,
  GenerationError,
  type AgenticProgress,
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
  user,
} from "@labas/db";
import { and, eq, notInArray } from "drizzle-orm";
import { encryptApiKey, decryptApiKey } from "./lib/encryption";
import {
  collectShardFailureCause,
  isNonRetryableProviderError,
  resolveGenerationJobOutcome,
  sectionsWithNoQuestions,
} from "./lib/generation-outcome";

const connectionOptions = { maxRetriesPerRequest: null };
const FAST_QUEUE_NAME = "generation-fast";
const QUALITY_QUEUE_NAME = "generation-quality";
const CANCEL_POLL_MS = 500;
const HEARTBEAT_MS = 10_000;
const MAX_QUESTIONS_PER_SHARD = 8;
const FAST_SHARD_CONCURRENCY = 3;
const QUALITY_SECTION_CONCURRENCY = 2;
const QUICK_PARSE_FALLBACK_TO_AGENTIC = false;
export const MAX_SHARD_RETRIES = 1;

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

const AGENTIC_STEP_FRACTIONS = [0.12, 0.28, 0.62, 0.92] as const;

const AGENTIC_STEP_LABELS: Record<string, string> = {
  generate_passage: "Menulis bacaan...",
  validate_passage: "Memvalidasi bacaan...",
  generate_questions: "Membuat soal...",
  self_validate: "Validasi kualitas...",
};

function mapAgenticProgressInShard(
  agentic: AgenticProgress,
  completedShards: number,
  totalShards: number,
): { progress: number; message: string } {
  const shardSpan = 65 / Math.max(totalShards, 1);
  const shardBase = 15 + completedShards * shardSpan;
  const stepFrac = AGENTIC_STEP_FRACTIONS[agentic.currentStep] ?? 0.5;
  const progress = Math.min(Math.round(shardBase + shardSpan * stepFrac), 84);
  const step = agentic.steps[agentic.currentStep];
  const message =
    step?.message ??
    AGENTIC_STEP_LABELS[step?.step ?? ""] ??
    "Agentic generation...";
  return { progress, message };
}

function mapAgenticProgressInQuality(agentic: AgenticProgress): { progress: number; message: string } {
  const stepFrac = AGENTIC_STEP_FRACTIONS[agentic.currentStep] ?? 0.5;
  const progress = Math.min(86 + Math.round(stepFrac * 10), 96);
  const step = agentic.steps[agentic.currentStep];
  const message =
    step?.message ??
    AGENTIC_STEP_LABELS[step?.step ?? ""] ??
    "Quality validation...";
  return { progress, message };
}

function createAgenticProgressHandler(
  updateProgress: (progress: number, progressMessage: string) => Promise<void>,
  pushLog: (
    step: string,
    message: string,
    status: "running" | "done" | "error",
    details?: string,
  ) => Promise<void>,
  mapProgress: (agentic: AgenticProgress) => { progress: number; message: string },
) {
  const seenSteps = new Set<string>();

  return (agentic: AgenticProgress) => {
    const { progress, message } = mapProgress(agentic);
    void updateProgress(progress, message).catch(() => {});

    for (const step of agentic.steps) {
      if (!step || step.status === "pending") continue;
      const key = `${step.step}:${step.status}`;
      if (seenSteps.has(key)) continue;
      seenSteps.add(key);
      void pushLog(
        step.step,
        step.message ?? AGENTIC_STEP_LABELS[step.step] ?? step.step,
        step.status as "running" | "done" | "error",
        step.output,
      ).catch(() => {});
    }
  };
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
        generationKeySource: (input as any)._isPlatformGeneration ? "free_credit" : "byok",
        creatorUserId: userId,
        isPublic: input.examType === "CPNS",
      })) as any,
    )
    .returning({ id: question.id });

  const savedQuestionIds = inserted.map((r) => r.id);
  if (!savedQuestionIds.length) {
    return { savedQuestionIds, generatedPackageId: null };
  }

  // Retry: append to existing package instead of creating new
  const retryPkgId = (input as any)._retryPackageId;
  const retrySectionTypeId = (input as any)._retrySectionTypeId;

  if (retryPkgId) {
    generatedPackageId = retryPkgId;
    try {
      const [nextOrder] = await db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${packageSection.orderIndex}), -1) + 1` })
        .from(packageSection)
        .where(eq(packageSection.packageId, retryPkgId));

      const orderIdx = Number(nextOrder?.maxOrder ?? 0);

      for (let i = 0; i < sectionSplits.length; i++) {
        const split = sectionSplits[i]!;
        const sectionQuestions = allQuestions
          .map((q, idx) => ({ ...q, _globalIndex: idx }))
          .filter((q) => q.section === split.section);

        const [sec] = await db
          .insert(packageSection)
          .values({
            packageId: retryPkgId,
            sectionTypeId: retrySectionTypeId || split.section,
            title: `${retrySectionTypeId || split.section} Section (lanjutan)`,
            orderIndex: orderIdx + i,
          })
          .returning();

        if (sec) {
          const sectionQuestionRows = sectionQuestions
            .map((q, idx) => ({
              sectionId: sec.id,
              questionId: savedQuestionIds[q._globalIndex],
              orderIndex: idx,
            }))
            .filter((q) => q.questionId != null);

          if (sectionQuestionRows.length > 0) {
            await db.insert(sectionQuestion).values(sectionQuestionRows as any);
          }
        }
      }
    } catch (retryErr: any) {
      console.warn("[GENERATION] Failed to append retry sections, but questions were saved.", {
        error: retryErr?.message ?? String(retryErr),
        jobId,
        retryPkgId,
      });
    }

    await db
      .update(testPackage)
      .set({
        totalQuestions: sql`${testPackage.totalQuestions} + ${savedQuestionIds.length}`,
        totalSections: sql`${testPackage.totalSections} + ${sectionSplits.length}`,
      })
      .where(eq(testPackage.id, retryPkgId));

    return { savedQuestionIds, generatedPackageId };
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
    const [creator] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    const creatorName = creator?.name ?? "Unknown";
    const pkgTitle = `[${creatorName}] - ${input.examType} ${sectionLabel} - ${dateStr}`;

    const [pkg] = await db
      .insert(testPackage)
      .values({
        title: pkgTitle,
        description: `Paket latihan AI-generated dengan ${savedQuestionIds.length} soal ${input.examType}.`,
        examTypeId: input.examType,
        creatorUserId: userId,
        isPublic: input.examType === "CPNS",
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
        const sectionQuestionRows = sectionQuestions
          .map((q, idx) => ({
            sectionId: sec.id,
            questionId: savedQuestionIds[q._globalIndex],
            orderIndex: idx,
          }))
          .filter((q) => q.questionId != null);

        if (sectionQuestionRows.length > 0) {
          await db.insert(sectionQuestion).values(sectionQuestionRows as any);
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

  return { savedQuestionIds, generatedPackageId };
}

function shardKey(shard: ShardPlan): string {
  return `${shard.sectionIndex}:${shard.shardIndex}`;
}

async function failGenerationJob(params: {
  jobId: string;
  errorMessage: string;
  tokensUsed?: number;
  durationMs: number;
}) {
  await db
    .update(generationJob)
    .set({
      status: "failed",
      progress: 100,
      progressMessage: "Generation failed",
      errorMessage: params.errorMessage,
      tokensUsed: params.tokensUsed,
      durationMs: params.durationMs,
      completedAt: new Date(),
    })
    .where(eq(generationJob.id, params.jobId));
}

async function completeJobWithResult(params: {
  jobId: string;
  input: GenerationInput;
  status?: "completed" | "completed_partial";
  statusMessage?: string;
  errorMessage?: string | null;
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
      status: params.status ?? "completed",
      progress: 100,
      progressMessage: params.statusMessage ?? "Completed",
      errorMessage: params.errorMessage ?? null,
      resultJson: {
        ...result,
        savedQuestionIds,
        generatedPackageId,
        sectionSplits: params.sectionSplits,
        qualityPhase: "final",
        metrics: params.metrics,
        isPartial: params.status === "completed_partial",
        requestedQuestionCount: params.input.questionCount,
      } as any,
      tokensUsed: params.totalTokens,
      generationKeySource: (params.input as any)._isPlatformGeneration ? "free_credit" : "byok",
      durationMs: params.durationMs,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(generationJob.id, params.jobId),
        notInArray(generationJob.status, ["cancelled"]),
      ),
    );

  // Deduct from user credit if using platform generation
  const inputAny = params.input as any;
  if (inputAny._isPlatformGeneration && params.totalTokens > 0) {
    const [jobRow] = await db
      .select({ userId: generationJob.userId })
      .from(generationJob)
      .where(eq(generationJob.id, params.jobId))
      .limit(1);
    if (jobRow) {
      const { deductCredit } = await import("@labas/api/lib/credit");
      await deductCredit(jobRow.userId, params.totalTokens).catch(() => {});
    }
  }
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
  if (row.status === "completed" || row.status === "completed_partial" || row.status === "failed" || row.status === "cancelled") {
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
          log("debug", "[QUEUE] Could not remove active job.", { jobId });
        }
      }
    } catch {
      log("warn", "[QUEUE] Failed to access queue during cancellation.", { jobId });
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
      initialRow.status === "completed" ||
      initialRow.status === "completed_partial"
    ) {
      return;
    }

    const claimed = await db
      .update(generationJob)
      .set({ status: "running_fast" })
      .where(
        and(
          eq(generationJob.id, jobId),
          notInArray(generationJob.status, ["cancelled", "completed", "completed_partial"]),
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

    let maxProgress = 0;
    const updateProgress = async (
      progress: number,
      progressMessage: string,
      status?: string,
      resultJson?: unknown,
    ) => {
      cancelPoll.check();
      const next = Math.max(maxProgress, progress);
      maxProgress = next;
      await job.updateProgress(next);
      const [updated] = await db
        .update(generationJob)
        .set({
          progress: next,
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
      const sectionPassages = new Map<string, string>();

      if (selectedMode === "agentic") {
        for (const split of sectionSplits) {
          if (sectionPassages.has(split.section)) continue;
          await updateProgress(8, `Menulis bacaan ${split.section}...`);
          const passageInput: GenerationInput = {
            ...input,
            section: split.section as GenerationInput["section"],
            questionCount: split.count,
          };
          const passageResult = await generatePassageForInput(passageInput, tokenCounter);
          totalTokens += passageResult.tokensUsed ?? 0;
          sectionPassages.set(split.section, passageResult.passage);
          await pushLog(
            "generate_passage",
            `Bacaan siap: ${passageResult.title}`,
            "done",
            passageResult.passage.slice(0, 400),
          );
        }
      }

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
        const onAgenticProgress = createAgenticProgressHandler(
          (progress, progressMessage) => updateProgress(progress, progressMessage),
          pushLog,
          (agentic) => mapAgenticProgressInShard(agentic, completedShards, shards.length),
        );
        try {
          if (selectedMode === "agentic") {
            const sharedPassage = sectionPassages.get(shard.section);
            if (sharedPassage) {
              sectionResult = await generateQuestionsAgenticFromPassage(
                subInput,
                sharedPassage,
                onAgenticProgress,
                tokenCounter,
                { strategy: "lean", maxRegenerateAttempts: 1 },
              );
            } else {
              sectionResult = await generateQuestionsAgentic(
                subInput,
                onAgenticProgress,
                tokenCounter,
                { strategy: "lean", maxRegenerateAttempts: 1 },
              );
            }
          } else {
            sectionResult = await generateQuestionsQuick(subInput, {
              onToken: tokenCounter,
            });
          }
        } catch (quickErr: any) {
          const quickErrorMessage = quickErr?.message ?? String(quickErr);
          const shouldFallbackToAgentic =
            QUICK_PARSE_FALLBACK_TO_AGENTIC &&
            selectedMode === "quick" &&
            (/Failed to parse AI response as JSON/i.test(quickErrorMessage) ||
              /Unterminated string/i.test(quickErrorMessage) ||
              /Missing 'questions' array/i.test(quickErrorMessage));

          if (!shouldFallbackToAgentic) {
            throw quickErr;
          }

          sectionResult = await generateQuestionsAgentic(
            { ...subInput, mode: "agentic" },
            onAgenticProgress,
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
      const shardFailureInfo = new Map<string, { error: string; nonRetryable: boolean }>();
      await runWithConcurrency(shards, FAST_SHARD_CONCURRENCY, async (shard) => {
        try {
          await runShard(shard);
        } catch (err: any) {
          const message = err?.message ?? String(err);
          shardFailureInfo.set(shardKey(shard), {
            error: message,
            nonRetryable: isNonRetryableProviderError(err),
          });
          log("warn", "[GENERATION] Fast shard failed.", {
            jobId,
            section: shard.section,
            nonRetryable: isNonRetryableProviderError(err),
          });
          failedShards.push(shard);
        }
      });

      if (failedShards.length > 0) {
        const retryableCount = failedShards.filter(
          (shard) => !shardFailureInfo.get(shardKey(shard))?.nonRetryable,
        ).length;
        if (retryableCount > 0) {
          await pushLog(
            "retry_budget",
            `Retrying ${retryableCount} failed shard(s), budget=${MAX_SHARD_RETRIES}`,
            "running",
          );
        }
      }

      for (const failedShard of failedShards) {
        const failure = shardFailureInfo.get(shardKey(failedShard));
        if (failure?.nonRetryable) {
          await pushLog(
            "retry_budget",
            `[${failedShard.section}] provider error — skipping retries`,
            "error",
            failure.error.slice(0, 300),
          );
          continue;
        }

        let success = false;
        for (let attempt = 1; attempt <= MAX_SHARD_RETRIES; attempt++) {
          try {
            await runShard(failedShard);
            success = true;
            break;
          } catch (retryErr: any) {
            const retryMessage = retryErr?.message ?? String(retryErr);
            if (isNonRetryableProviderError(retryErr)) {
              await pushLog(
                "retry_budget",
                `[${failedShard.section}] provider error — stopping retries`,
                "error",
                retryMessage.slice(0, 300),
              );
              break;
            }
            await pushLog(
              "retry_budget",
              `[${failedShard.section}] shard retry ${attempt}/${MAX_SHARD_RETRIES} failed: ${retryMessage}`,
              "error",
            );
          }
        }
        if (!success && !failure?.nonRetryable) {
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

      const outcome = resolveGenerationJobOutcome({
        requestedCount: input.questionCount,
        generatedCount: allQuestions.length,
        failedSections: sectionsWithNoQuestions(sectionSplits, allQuestions),
        cause: collectShardFailureCause(
          failedShards.map((shard) => shardFailureInfo.get(shardKey(shard))),
        ),
      });

      if (outcome.status === "failed") {
        await pushLog("save", outcome.errorMessage ?? "Generation failed", "error");
        await failGenerationJob({
          jobId,
          errorMessage: outcome.errorMessage ?? "Generation failed",
          tokensUsed: totalTokens || approxTokens || undefined,
          durationMs: Date.now() - start,
        });
        return;
      }

      const finalizeParams = {
        jobId,
        input,
        allQuestions,
        sectionSplits,
        totalTokens: totalTokens || approxTokens,
        durationMs: Date.now() - start,
        status: outcome.status,
        statusMessage: outcome.progressMessage,
        errorMessage: outcome.errorMessage,
        metrics: {
          timeToFirstValidQuestionMs: timeToFirstValidQuestionMs ?? Date.now() - start,
          shardCount: shards.length,
          shardRetryBudget: MAX_SHARD_RETRIES,
          shardFailures: failedShards.length,
          requestedQuestionCount: input.questionCount,
          generatedQuestionCount: allQuestions.length,
          ...(selectedMode === "agentic" ? { singlePassAgentic: true } : {}),
        },
      };

      if (selectedMode === "agentic") {
        await pushLog("save", "Saving agentic result...", "running");
        await completeJobWithResult(finalizeParams);
        await pushLog(
          "save",
          outcome.status === "completed_partial"
            ? `Saved ${allQuestions.length}/${input.questionCount} questions (partial)`
            : `Saved ${allQuestions.length} questions`,
          outcome.status === "completed_partial" ? "error" : "done",
        );
        return;
      }

      await pushLog("save", "Saving quick result...", "running");
      await completeJobWithResult(finalizeParams);
      await pushLog(
        "save",
        outcome.status === "completed_partial"
          ? `Saved ${allQuestions.length}/${input.questionCount} questions (partial)`
          : `Saved ${allQuestions.length} questions`,
        outcome.status === "completed_partial" ? "error" : "done",
      );
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
      return;
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
      initialRow.status === "completed" ||
      initialRow.status === "completed_partial"
    ) {
      return;
    }

    const cancelPoll = createCancellationPoller(jobId);
    let approxTokens = 0;
    let maxProgress = 0;
    const tokenCounter = (token: string) => {
      cancelPoll.check();
      approxTokens += Math.ceil(token.length / 4);
    };

    const updateProgress = async (progress: number, progressMessage: string) => {
      cancelPoll.check();
      const next = Math.max(maxProgress, progress);
      maxProgress = next;
      await job.updateProgress(next);
      const [updated] = await db
        .update(generationJob)
        .set({
          status: "running_quality",
          progress: next,
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
            const onQualityProgress = createAgenticProgressHandler(
              updateProgress,
              pushLog,
              mapAgenticProgressInQuality,
            );
            const result = await generateQuestionsAgentic(
              sectionInput,
              onQualityProgress,
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
            log("warn", "[GENERATION] Quality phase failed, using fast questions.", { jobId, section: split.section });
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
      return;
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
      attempts: 1,
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
      log("debug", "[QUEUE] API key decryption failed (legacy data).");
      return data as unknown as GenerationInput;
    }
  }
  return data as unknown as GenerationInput;
}
