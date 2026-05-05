import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { router, protectedProcedure, publicProcedure } from "../index";
import { db } from "@labas/db";
import { questionFeedback } from "@labas/db";

export const feedbackRouter = router({
  getQuestionFeedback: publicProcedure
    .input(z.object({ questionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user.id;

      const [counts] = await db
        .select({
          up: sql<number>`count(case when ${questionFeedback.type} = 'up' then 1 end)::int`,
          down: sql<number>`count(case when ${questionFeedback.type} = 'down' then 1 end)::int`,
        })
        .from(questionFeedback)
        .where(eq(questionFeedback.questionId, input.questionId));

      let myFeedback: "up" | "down" | null = null;
      if (userId) {
        const [row] = await db
          .select({ type: questionFeedback.type })
          .from(questionFeedback)
          .where(
            and(
              eq(questionFeedback.questionId, input.questionId),
              eq(questionFeedback.userId, userId),
            ),
          )
          .limit(1);
        myFeedback = (row?.type as "up" | "down") ?? null;
      }

      return { up: counts?.up ?? 0, down: counts?.down ?? 0, myFeedback };
    }),

  voteQuestion: protectedProcedure
    .input(
      z.object({
        questionId: z.string().uuid(),
        type: z.enum(["up", "down"]),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db
        .select()
        .from(questionFeedback)
        .where(
          and(
            eq(questionFeedback.questionId, input.questionId),
            eq(questionFeedback.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      const existingFeedback = existing[0];
      if (existingFeedback) {
        if (existingFeedback.type === input.type) {
          // Toggle off if same type clicked again
          await db
            .delete(questionFeedback)
            .where(eq(questionFeedback.id, existingFeedback.id));
        } else {
          await db
            .update(questionFeedback)
            .set({ type: input.type, note: input.note ?? null })
            .where(eq(questionFeedback.id, existingFeedback.id));
        }
      } else {
        await db.insert(questionFeedback).values({
          userId: ctx.session.user.id,
          questionId: input.questionId,
          type: input.type,
          note: input.note ?? null,
        });
      }

      const [counts] = await db
        .select({
          up: sql<number>`count(case when ${questionFeedback.type} = 'up' then 1 end)::int`,
          down: sql<number>`count(case when ${questionFeedback.type} = 'down' then 1 end)::int`,
        })
        .from(questionFeedback)
        .where(eq(questionFeedback.questionId, input.questionId));

      return { up: counts?.up ?? 0, down: counts?.down ?? 0 };
    }),
});
