import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { router, protectedProcedure } from "../index";
import { generationInputSchema } from "@labas/ai/schemas";
import { enqueueGeneration } from "../queue";
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

      return job;
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
