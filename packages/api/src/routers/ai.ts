import { z } from "zod";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../index";
import { generationInputSchema } from "@labas/ai/schemas";
import { cancelGenerationJob, enqueueGeneration } from "../queue";
import { db } from "@labas/db";
import { question, generationJob } from "@labas/db";

export const aiRouter = router({
  generate: protectedProcedure
    .input(generationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const jobId = await enqueueGeneration(ctx.session.user.id, input);
      return { jobId };
    }),

  getJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [job] = await db
        .select()
        .from(generationJob)
        .where(eq(generationJob.id, input.jobId))
        .limit(1);

      if (!job) return null;
      if (job.userId !== ctx.session.user.id) return null;

      const rj =
        job.resultJson && typeof job.resultJson === "object"
          ? (job.resultJson as Record<string, unknown>)
          : null;
      const qualityPhase =
        rj && typeof rj.qualityPhase === "string" ? rj.qualityPhase : null;
      const resultIsPartial = rj?.isPartial === true;

      return { ...job, qualityPhase, resultIsPartial };
    }),

  cancelJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await cancelGenerationJob(ctx.session.user.id, input.jobId);
      if (!result.ok) {
        const msg =
          result.reason === "not_found"
            ? "Job tidak ditemukan"
            : result.reason === "forbidden"
              ? "Tidak diizinkan"
              : "Job sudah selesai atau tidak bisa dibatalkan";
        throw new Error(msg);
      }
      return { ok: true as const };
    }),

  myJobs: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select()
        .from(generationJob)
        .where(eq(generationJob.userId, ctx.session.user.id))
        .orderBy(desc(generationJob.createdAt))
        .limit(input?.limit ?? 20)
        .offset(input?.offset ?? 0);
      return rows;
    }),

  tokenUsageToday: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [agg] = await db
      .select({
        totalTokens: sql<number>`coalesce(sum(${generationJob.tokensUsed}), 0)`,
      })
      .from(generationJob)
      .where(
        and(
          eq(generationJob.userId, userId),
          gte(generationJob.createdAt, startOfDay),
        ),
      );

    const jobs = await db
      .select({
        id: generationJob.id,
        createdAt: generationJob.createdAt,
        mode: generationJob.mode,
        examTypeId: generationJob.examTypeId,
        sectionTypeId: generationJob.sectionTypeId,
        questionCount: generationJob.questionCount,
        tokensUsed: generationJob.tokensUsed,
        status: generationJob.status,
      })
      .from(generationJob)
      .where(
        and(
          eq(generationJob.userId, userId),
          gte(generationJob.createdAt, startOfDay),
        ),
      )
      .orderBy(desc(generationJob.createdAt));

    return {
      totalTokens: Number(agg?.totalTokens ?? 0),
      jobs: jobs.map((j) => ({
        ...j,
        tokensUsed: j.tokensUsed ?? undefined,
      })),
    };
  }),

  retryJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [job] = await db
        .select()
        .from(generationJob)
        .where(eq(generationJob.id, input.jobId))
        .limit(1);

      if (!job) throw new Error("Job tidak ditemukan");
      if (job.userId !== ctx.session.user.id) throw new Error("Tidak diizinkan");
      if (job.status !== "failed" && job.status !== "cancelled") {
        throw new Error("Hanya job yang gagal atau dibatalkan yang bisa di-retry");
      }

      if (!job.inputJson || typeof job.inputJson !== "object") {
        throw new Error("Data input job tidak tersedia untuk retry");
      }

      const jobInput = job.inputJson as any;
      // Ensure the parsed input has the apiKeyConfig shape the pipeline expects
      if (!jobInput.apiKeyConfig?.baseUrl || !jobInput.apiKeyConfig?.apiKey || !jobInput.apiKeyConfig?.model) {
        throw new Error("Konfigurasi API key tidak valid untuk retry");
      }

      const newJobId = await enqueueGeneration(ctx.session.user.id, jobInput);
      return { jobId: newJobId };
    }),

  saveQuestions: protectedProcedure
    .input(
      z.object({
        examTypeId: z.string(),
        sectionTypeId: z.string(),
        questions: z.array(z.any()),
        isPublic: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const created = await db
        .insert(question)
        .values(
          input.questions.map((q: any) => ({
            examTypeId: input.examTypeId,
            sectionTypeId: input.sectionTypeId,
            format: q.format,
            passageText: q.passageText,
            questionText: q.questionText,
            options: q.options ?? null,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty,
            skillTags: q.skillTags,
            source: "ai" as const,
            aiModel: q.aiModel ?? null,
            creatorUserId: ctx.session.user.id,
            isPublic: input.isPublic,
          })),
        )
        .returning();

      return created;
    }),
});
