import { z } from "zod";
import { eq, and, avg } from "drizzle-orm";
import { router, protectedProcedure, publicProcedure } from "../index";
import { db } from "@labas/db";
import { questionRating, question, packageRating, testPackage } from "@labas/db";
import { checkRateLimit } from "../lib/rate-limit";

export const ratingRouter = router({
  getQuestionRating: publicProcedure
    .input(z.object({ questionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user.id;

      const [avgResult] = await db
        .select({ avgScore: avg(questionRating.score) })
        .from(questionRating)
        .where(eq(questionRating.questionId, input.questionId));

      const avgRating = avgResult?.avgScore ? Math.round(Number(avgResult.avgScore)) : null;

      let myRating: number | null = null;
      if (userId) {
        const [row] = await db
          .select({ score: questionRating.score })
          .from(questionRating)
          .where(
            and(
              eq(questionRating.questionId, input.questionId),
              eq(questionRating.userId, userId),
            ),
          )
          .limit(1);
        myRating = row?.score ?? null;
      }

      return { avgRating, myRating };
    }),

  rateQuestion: protectedProcedure
    .input(
      z.object({
        questionId: z.string().uuid(),
        score: z.number().min(1).max(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit({ key: `rate:${ctx.session.user.id}`, limit: 10, windowMs: 10_000 });

      const existing = await db
        .select()
        .from(questionRating)
        .where(
          and(
            eq(questionRating.questionId, input.questionId),
            eq(questionRating.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      const existingRating = existing[0];
      if (existingRating) {
        await db
          .update(questionRating)
          .set({ score: input.score })
          .where(eq(questionRating.id, existingRating.id));
      } else {
        await db.insert(questionRating).values({
          userId: ctx.session.user.id,
          questionId: input.questionId,
          score: input.score,
        });
      }

      const [avgResult] = await db
        .select({ avgScore: avg(questionRating.score) })
        .from(questionRating)
        .where(eq(questionRating.questionId, input.questionId));

      await db
        .update(question)
        .set({ avgRating: avgResult?.avgScore ? Math.round(Number(avgResult.avgScore)) : null })
        .where(eq(question.id, input.questionId));

      return { success: true };
    }),

  getPackageRating: publicProcedure
    .input(z.object({ packageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user.id;

      const [avgResult] = await db
        .select({ avgScore: avg(packageRating.score) })
        .from(packageRating)
        .where(eq(packageRating.packageId, input.packageId));

      const avgRating = avgResult?.avgScore ? Math.round(Number(avgResult.avgScore)) : null;

      let myRating: number | null = null;
      if (userId) {
        const [row] = await db
          .select({ score: packageRating.score })
          .from(packageRating)
          .where(
            and(
              eq(packageRating.packageId, input.packageId),
              eq(packageRating.userId, userId),
            ),
          )
          .limit(1);
        myRating = row?.score ?? null;
      }

      return { avgRating, myRating };
    }),

  ratePackage: protectedProcedure
    .input(
      z.object({
        packageId: z.string().uuid(),
        score: z.number().min(1).max(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit({ key: `rate:${ctx.session.user.id}`, limit: 10, windowMs: 10_000 });

      const existing = await db
        .select()
        .from(packageRating)
        .where(
          and(
            eq(packageRating.packageId, input.packageId),
            eq(packageRating.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      const existingRating = existing[0];
      if (existingRating) {
        await db
          .update(packageRating)
          .set({ score: input.score })
          .where(eq(packageRating.id, existingRating.id));
      } else {
        await db.insert(packageRating).values({
          userId: ctx.session.user.id,
          packageId: input.packageId,
          score: input.score,
        });
      }

      const [avgResult] = await db
        .select({ avgScore: avg(packageRating.score) })
        .from(packageRating)
        .where(eq(packageRating.packageId, input.packageId));

      await db
        .update(testPackage)
        .set({ avgRating: avgResult?.avgScore ? Math.round(Number(avgResult.avgScore)) : null })
        .where(eq(testPackage.id, input.packageId));

      return { success: true };
    }),
});
