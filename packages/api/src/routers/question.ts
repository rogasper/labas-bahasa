import { z } from "zod";
import { eq, and, desc, sql, like, or, inArray } from "drizzle-orm";
import { router, protectedProcedure, publicProcedure } from "../index";
import { db } from "@labas/db";
import { question, examType, sectionType, user } from "@labas/db";
import { paginationSchema, paginateDefaults } from "../lib/pagination";
import { buildVisibilityCondition } from "../lib/visibility";
import { assertOwnership } from "../lib/ownership";
import { throwNotFound } from "../lib/errors";

const questionListSelect = {
  id: question.id,
  examTypeId: question.examTypeId,
  sectionTypeId: question.sectionTypeId,
  format: question.format,
  passageText: question.passageText,
  questionText: question.questionText,
  options: question.options,
  correctAnswer: question.correctAnswer,
  explanation: question.explanation,
  difficulty: question.difficulty,
  skillTags: question.skillTags,
  source: question.source,
  aiModel: question.aiModel,
  creatorUserId: question.creatorUserId,
  isPublic: question.isPublic,
  usageCount: question.usageCount,
  avgRating: question.avgRating,
  createdAt: question.createdAt,
  updatedAt: question.updatedAt,
  creatorName: user.name,
  examTypeName: examType.name,
  sectionTypeName: sectionType.name,
};

const questionDetailSelect = {
  ...questionListSelect,
};

function buildSearchCondition(term: string) {
  const pattern = `%${term}%`;
  return or(
    like(question.passageText, pattern),
    like(question.questionText, pattern),
    like(question.explanation, pattern),
  );
}

function stripAnswer<T extends { correctAnswer?: string; explanation?: string | null }>(row: T) {
  const { correctAnswer, explanation, ...rest } = row;
  return rest as Omit<T, "correctAnswer" | "explanation">;
}

export const questionRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          examTypeId: z.string().optional(),
          sectionTypeId: z.string().optional(),
          format: z.string().optional(),
          difficulty: z.number().optional(),
          isPublic: z.boolean().optional(),
          creatorUserId: z.string().optional(),
          search: z.string().optional(),
          skillTags: z.array(z.string()).optional(),
          ...paginationSchema?.shape,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user.id;
      const conditions = [];

      if (input?.examTypeId) conditions.push(eq(question.examTypeId, input.examTypeId));
      if (input?.sectionTypeId) conditions.push(eq(question.sectionTypeId, input.sectionTypeId));
      if (input?.format) conditions.push(eq(question.format, input.format));
      if (input?.difficulty) conditions.push(eq(question.difficulty, input.difficulty));
      if (input?.skillTags?.length) {
        conditions.push(sql`${question.skillTags} && ${input.skillTags}`);
      }

      if (input?.creatorUserId) {
        conditions.push(eq(question.creatorUserId, input.creatorUserId));
      }

      if (input?.isPublic !== undefined) {
        conditions.push(eq(question.isPublic, input.isPublic));
      } else if (!input?.creatorUserId) {
        const vis = buildVisibilityCondition(question, userId);
        if (vis) conditions.push(vis);
      }

      if (input?.search) {
        const searchCond = buildSearchCondition(input.search);
        if (searchCond) conditions.push(searchCond);
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const { limit, offset } = paginateDefaults(input);

      const rows = await db
        .select(questionListSelect)
        .from(question)
        .leftJoin(user, eq(question.creatorUserId, user.id))
        .leftJoin(examType, eq(question.examTypeId, examType.id))
        .leftJoin(sectionType, eq(question.sectionTypeId, sectionType.id))
        .where(where)
        .orderBy(desc(question.createdAt))
        .limit(limit)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(question)
        .where(where);

      return { questions: rows.map(stripAnswer), total: Number(countResult?.count ?? 0) };
    }),

  myQuestions: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          ...paginationSchema?.shape,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const conditions = [eq(question.creatorUserId, userId)];

      if (input?.search) {
        const searchCond = buildSearchCondition(input.search);
        if (searchCond) conditions.push(searchCond);
      }

      const where = and(...conditions);
      const { limit, offset } = paginateDefaults(input);

      const rows = await db
        .select({
          id: question.id,
          examTypeId: question.examTypeId,
          sectionTypeId: question.sectionTypeId,
          format: question.format,
          passageText: question.passageText,
          questionText: question.questionText,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          difficulty: question.difficulty,
          skillTags: question.skillTags,
          source: question.source,
          isPublic: question.isPublic,
          usageCount: question.usageCount,
          avgRating: question.avgRating,
          createdAt: question.createdAt,
          updatedAt: question.updatedAt,
          examTypeName: examType.name,
          sectionTypeName: sectionType.name,
        })
        .from(question)
        .leftJoin(examType, eq(question.examTypeId, examType.id))
        .leftJoin(sectionType, eq(question.sectionTypeId, sectionType.id))
        .where(where)
        .orderBy(desc(question.createdAt))
        .limit(limit)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(question)
        .where(where);

      return { questions: rows, total: Number(countResult?.count ?? 0) };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user.id;
      const [row] = await db
        .select(questionDetailSelect)
        .from(question)
        .leftJoin(user, eq(question.creatorUserId, user.id))
        .leftJoin(examType, eq(question.examTypeId, examType.id))
        .leftJoin(sectionType, eq(question.sectionTypeId, sectionType.id))
        .where(eq(question.id, input.id))
        .limit(1);

      if (!row) return null;
      if (!row.isPublic && row.creatorUserId !== userId) return null;

      if (row.creatorUserId === userId) return row;
      return stripAnswer(row);
    }),

  create: protectedProcedure
    .input(
      z.object({
        examTypeId: z.string(),
        sectionTypeId: z.string(),
        format: z.string(),
        passageText: z.string().min(1),
        questionText: z.string().min(1),
        options: z.any().optional(),
        correctAnswer: z.string(),
        explanation: z.string().optional(),
        difficulty: z.number().min(1).max(5).default(3),
        isCaseSensitive: z.boolean().default(false),
        skillTags: z.array(z.string()).default([]),
        isPublic: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .insert(question)
        .values({
          ...input,
          source: "manual",
          creatorUserId: ctx.session.user.id,
        })
        .returning();
      return row;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        examTypeId: z.string().optional(),
        sectionTypeId: z.string().optional(),
        format: z.string().optional(),
        passageText: z.string().min(1).optional(),
        questionText: z.string().min(1).optional(),
        options: z.any().optional(),
        correctAnswer: z.string().optional(),
        explanation: z.string().optional(),
        difficulty: z.number().min(1).max(5).optional(),
        skillTags: z.array(z.string()).optional(),
        isPublic: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [row] = await db
        .update(question)
        .set(data)
        .where(and(eq(question.id, id), eq(question.creatorUserId, ctx.session.user.id)))
        .returning();
      return row ?? null;
    }),

  togglePublic: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({ id: question.id, isPublic: question.isPublic, creatorUserId: question.creatorUserId })
        .from(question)
        .where(eq(question.id, input.id))
        .limit(1);

      if (!existing) {
        throwNotFound("Question");
      }
      assertOwnership(existing, ctx.session.user.id, "Question");

      const [row] = await db
        .update(question)
        .set({ isPublic: !existing.isPublic })
        .where(eq(question.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({ id: question.id, creatorUserId: question.creatorUserId })
        .from(question)
        .where(eq(question.id, input.id))
        .limit(1);

      assertOwnership(existing, ctx.session.user.id, "Question");

      await db.delete(question).where(eq(question.id, input.id));
      return { success: true };
    }),

  bulkPublish: protectedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      const rows = await db
        .select({ id: question.id, creatorUserId: question.creatorUserId, isPublic: question.isPublic })
        .from(question)
        .where(inArray(question.id, input.ids));

      const ownRows = rows.filter((r) => r.creatorUserId === ctx.session.user.id);
      const skipped = rows.length - ownRows.length;

      if (ownRows.length === 0) {
        throwNotFound("Question");
      }

      const ownIds = ownRows.map((r) => r.id);
      await db
        .update(question)
        .set({ isPublic: true })
        .where(inArray(question.id, ownIds));

      return { success: true, updated: ownRows.length, skipped };
    }),
});
