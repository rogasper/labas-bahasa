import { z } from "zod";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../index";
import { generationInputSchema } from "@labas/ai/schemas";
import { cancelGenerationJob, enqueueGeneration } from "../queue";
import { db } from "@labas/db";
import { question, generationJob } from "@labas/db";
import { paginationSchema, paginateDefaults } from "../lib/pagination";
import { throwNotFound, throwForbidden, throwBadRequest } from "../lib/errors";
import { checkDailyBudget } from "../lib/rate-limit";
import { decryptApiKey } from "../lib/encryption";

const DAILY_TOKEN_BUDGET = 500_000;

function sanitizeJobForResponse(row: typeof generationJob.$inferSelect) {
  const { inputJson, ...safe } = row;
  return safe;
}

export const aiRouter = router({
  generate: protectedProcedure
    .input(generationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const withinBudget = await checkDailyBudget(ctx.session.user.id, DAILY_TOKEN_BUDGET);
      if (!withinBudget) {
        throwBadRequest(`Daily token budget (${DAILY_TOKEN_BUDGET.toLocaleString()}) exceeded. Try again tomorrow.`);
      }
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

      const safe = sanitizeJobForResponse(job);

      // Strip correctAnswer & explanation from resultJson to prevent network inspection
      if (rj && Array.isArray(rj.questions)) {
        const sanitizedQuestions = (rj.questions as Array<Record<string, unknown>>).map((q) => {
          const { correctAnswer, explanation, ...rest } = q;
          return rest;
        });
        return {
          ...safe,
          resultJson: { ...rj, questions: sanitizedQuestions },
          qualityPhase,
          resultIsPartial,
        };
      }

      return { ...safe, qualityPhase, resultIsPartial };
    }),

  cancelJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await cancelGenerationJob(ctx.session.user.id, input.jobId);
      if (!result.ok) {
        if (result.reason === "not_found") throwNotFound("Job");
        if (result.reason === "forbidden") throwForbidden();
        throwBadRequest("Job already finished or cannot be cancelled");
      }
      return { ok: true as const };
    }),

  myJobs: protectedProcedure
    .input(
      z.object({
        ...paginationSchema.shape,
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const { limit, offset } = paginateDefaults(input);
      const rows = await db
        .select({
          id: generationJob.id,
          userId: generationJob.userId,
          status: generationJob.status,
          mode: generationJob.mode,
          examTypeId: generationJob.examTypeId,
          sectionTypeId: generationJob.sectionTypeId,
          questionCount: generationJob.questionCount,
          progress: generationJob.progress,
          progressMessage: generationJob.progressMessage,
          logs: generationJob.logs,
          resultJson: generationJob.resultJson,
          errorMessage: generationJob.errorMessage,
          tokensUsed: generationJob.tokensUsed,
          durationMs: generationJob.durationMs,
          createdAt: generationJob.createdAt,
          updatedAt: generationJob.updatedAt,
          completedAt: generationJob.completedAt,
        })
        .from(generationJob)
        .where(eq(generationJob.userId, ctx.session.user.id))
        .orderBy(desc(generationJob.createdAt))
        .limit(limit)
        .offset(offset);
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

  tokenUsageHistory: protectedProcedure
    .input(
      z.object({
        period: z.enum(["daily", "weekly", "monthly"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const now = new Date();

      let startDate: Date;
      let dateFormat: (d: Date) => string;

      switch (input.period) {
        case "daily": {
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 6);
          startDate.setHours(0, 0, 0, 0);
          dateFormat = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          break;
        }
        case "weekly": {
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 27);
          startDate.setHours(0, 0, 0, 0);
          dateFormat = (d: Date) => {
            const weekStart = new Date(d);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            return `${weekStart.getFullYear()}-W${String(Math.ceil(((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)).padStart(2, "0")}`;
          };
          break;
        }
        case "monthly": {
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 5);
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          dateFormat = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          break;
        }
      }

      const rows = await db
        .select({
          date: sql<string>`date_trunc('day', ${generationJob.createdAt})::date`,
          totalTokens: sql<number>`coalesce(sum(${generationJob.tokensUsed}), 0)`,
          jobCount: sql<number>`count(*)`,
        })
        .from(generationJob)
        .where(
          and(
            eq(generationJob.userId, userId),
            gte(generationJob.createdAt, startDate),
          ),
        )
        .groupBy(sql`date_trunc('day', ${generationJob.createdAt})::date`)
        .orderBy(sql`date_trunc('day', ${generationJob.createdAt})::date`);

      const grouped: Record<string, { date: string; totalTokens: number; jobCount: number }> = {};

      for (const row of rows) {
        const d = new Date(row.date as string);
        const key = dateFormat(d);
        if (!grouped[key]) {
          grouped[key] = { date: key, totalTokens: 0, jobCount: 0 };
        }
        grouped[key].totalTokens += Number(row.totalTokens);
        grouped[key].jobCount += Number(row.jobCount);
      }

      const labels: { date: string; label: string }[] = [];
      if (input.period === "daily") {
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          labels.push({ date: dateFormat(d), label: `${d.getDate()}/${d.getMonth() + 1}` });
        }
      } else if (input.period === "weekly") {
        for (let i = 3; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i * 7);
          const weekStart = new Date(d);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          labels.push({ date: dateFormat(weekStart), label: `W${i === 0 ? "Ini" : `${i}`}` });
        }
      } else {
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now);
          d.setMonth(d.getMonth() - i);
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
          labels.push({ date: dateFormat(d), label: `${monthNames[d.getMonth()]} ${d.getFullYear()}` });
        }
      }

      const result = labels.map((l) => ({
        ...l,
        totalTokens: grouped[l.date]?.totalTokens ?? 0,
        jobCount: grouped[l.date]?.jobCount ?? 0,
      }));

      return result;
    }),

  retryJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [job] = await db
        .select()
        .from(generationJob)
        .where(eq(generationJob.id, input.jobId))
        .limit(1);

      if (!job) throwNotFound("Job");
      if (job.userId !== ctx.session.user.id) throwForbidden();
      if (job.status !== "failed" && job.status !== "cancelled") {
        throwBadRequest("Only failed or cancelled jobs can be retried");
      }

      if (!job.inputJson || typeof job.inputJson !== "object") {
        throwBadRequest("Job input data is not available for retry");
      }

      const jobInput = job.inputJson as any;
      // Ensure the parsed input has the apiKeyConfig shape the pipeline expects
      if (!jobInput.apiKeyConfig?.baseUrl || !jobInput.apiKeyConfig?.apiKey || !jobInput.apiKeyConfig?.model) {
        throwBadRequest("Invalid API key configuration for retry");
      }

      // Decrypt the stored apiKey before re-enqueuing
      const decryptedInput = {
        ...jobInput,
        apiKeyConfig: {
          ...jobInput.apiKeyConfig,
          apiKey: decryptApiKey(jobInput.apiKeyConfig.apiKey),
        },
      };

      const newJobId = await enqueueGeneration(ctx.session.user.id, decryptedInput);
      return { jobId: newJobId };
    }),

  saveQuestions: protectedProcedure
    .input(
      z.object({
        examTypeId: z.string(),
        sectionTypeId: z.string(),
        questions: z.array(
          z.object({
            format: z.string(),
            passageText: z.string().min(1),
            questionText: z.string().min(1),
            options: z.any().optional(),
            correctAnswer: z.string(),
            explanation: z.string().optional(),
            difficulty: z.number().min(1).max(5),
            skillTags: z.array(z.string()),
            aiModel: z.string().optional(),
          }),
        ),
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
