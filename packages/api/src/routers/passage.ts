import { z } from "zod";
import { eq, desc, like, and, sql } from "drizzle-orm";
import { router, protectedProcedure, publicProcedure } from "../index";
import { db } from "@labas/db";
import { passage, question, examType, sectionType, user } from "@labas/db";
import { paginationSchema, paginateDefaults } from "../lib/pagination";

export const passageRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select({
          id: passage.id,
          text: passage.text,
          title: passage.title,
          examTypeId: passage.examTypeId,
          sectionTypeId: passage.sectionTypeId,
          creatorUserId: passage.creatorUserId,
          createdAt: passage.createdAt,
          updatedAt: passage.updatedAt,
          examTypeName: examType.name,
          sectionTypeName: sectionType.name,
          creatorName: user.name,
        })
        .from(passage)
        .leftJoin(examType, eq(passage.examTypeId, examType.id))
        .leftJoin(sectionType, eq(passage.sectionTypeId, sectionType.id))
        .leftJoin(user, eq(passage.creatorUserId, user.id))
        .where(eq(passage.id, input.id))
        .limit(1);

      return row ?? null;
    }),

  list: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          examTypeId: z.string().optional(),
          ...paginationSchema?.shape,
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const { limit, offset } = paginateDefaults(input);
      const conditions = [];

      if (input?.search) {
        const pattern = `%${input.search}%`;
        conditions.push(like(passage.text, pattern));
      }
      if (input?.examTypeId) {
        conditions.push(eq(passage.examTypeId, input.examTypeId));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          id: passage.id,
          text: passage.text,
          title: passage.title,
          examTypeId: passage.examTypeId,
          sectionTypeId: passage.sectionTypeId,
          creatorUserId: passage.creatorUserId,
          createdAt: passage.createdAt,
          examTypeName: examType.name,
          sectionTypeName: sectionType.name,
          creatorName: user.name,
          questionCount: sql<number>`COUNT(${question.id})`,
        })
        .from(passage)
        .leftJoin(examType, eq(passage.examTypeId, examType.id))
        .leftJoin(sectionType, eq(passage.sectionTypeId, sectionType.id))
        .leftJoin(user, eq(passage.creatorUserId, user.id))
        .leftJoin(question, eq(passage.id, question.passageId))
        .where(where)
        .groupBy(
          passage.id,
          examType.name,
          sectionType.name,
          user.name,
        )
        .orderBy(desc(passage.createdAt))
        .limit(limit)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(passage)
        .where(where ?? undefined);

      return { passages: rows, total: Number(countResult?.count ?? 0) };
    }),

  create: protectedProcedure
    .input(
      z.object({
        text: z.string().min(50),
        title: z.string().optional(),
        examTypeId: z.string(),
        sectionTypeId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .insert(passage)
        .values({
          text: input.text,
          title: input.title ?? null,
          examTypeId: input.examTypeId,
          sectionTypeId: input.sectionTypeId,
          creatorUserId: ctx.session.user.id,
        })
        .returning();

      return row;
    }),
});
