import { z } from "zod";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { router, protectedProcedure, publicProcedure } from "../index";
import { db } from "@labas/db";
import {
  testPackage,
  packageSection,
  sectionQuestion,
  question,
  examType,
  sectionType,
  user,
} from "@labas/db";
import { paginationSchema, paginateDefaults } from "../lib/pagination";
import { assertOwnership } from "../lib/ownership";
import { buildVisibilityCondition } from "../lib/visibility";
import { throwNotFound, throwBadRequest } from "../lib/errors";

export const packageRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          examTypeId: z.string().optional(),
          isPublic: z.boolean().optional(),
          search: z.string().optional(),
          ...paginationSchema.shape,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user.id;
      const { limit, offset } = paginateDefaults(input);
      const conditions = [];

      if (input?.examTypeId) conditions.push(eq(testPackage.examTypeId, input.examTypeId));

      if (input?.isPublic !== undefined) {
        conditions.push(eq(testPackage.isPublic, input.isPublic));
      } else {
        const vis = buildVisibilityCondition(testPackage, userId);
        if (vis) conditions.push(vis);
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          id: testPackage.id,
          title: testPackage.title,
          description: testPackage.description,
          examTypeId: testPackage.examTypeId,
          creatorUserId: testPackage.creatorUserId,
          isPublic: testPackage.isPublic,
          totalQuestions: testPackage.totalQuestions,
          totalSections: testPackage.totalSections,
          estimatedDurationMin: testPackage.estimatedDurationMin,
          usageCount: testPackage.usageCount,
          avgRating: testPackage.avgRating,
          createdAt: testPackage.createdAt,
          updatedAt: testPackage.updatedAt,
          creatorName: user.name,
          examTypeName: examType.name,
        })
        .from(testPackage)
        .leftJoin(user, eq(testPackage.creatorUserId, user.id))
        .leftJoin(examType, eq(testPackage.examTypeId, examType.id))
        .where(where)
        .orderBy(desc(testPackage.createdAt))
        .limit(limit)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(testPackage)
        .where(where);
      const totalCount = Number(countResult?.count ?? 0);

      return { packages: rows, total: totalCount };
    }),

  myPackages: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          examTypeId: z.string().optional(),
          isPublic: z.boolean().optional(),
          ...paginationSchema.shape,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { limit, offset } = paginateDefaults(input);
      const conditions = [eq(testPackage.creatorUserId, userId)];

      if (input?.search) {
        conditions.push(
          sql`LOWER(${testPackage.title}) LIKE LOWER(${"%" + input.search + "%"})`,
        );
      }
      if (input?.examTypeId) {
        conditions.push(eq(testPackage.examTypeId, input.examTypeId));
      }
      if (input?.isPublic !== undefined) {
        conditions.push(eq(testPackage.isPublic, input.isPublic));
      }

      const where = and(...conditions);

      const rows = await db
        .select({
          id: testPackage.id,
          title: testPackage.title,
          description: testPackage.description,
          examTypeId: testPackage.examTypeId,
          creatorUserId: testPackage.creatorUserId,
          isPublic: testPackage.isPublic,
          totalQuestions: testPackage.totalQuestions,
          totalSections: testPackage.totalSections,
          estimatedDurationMin: testPackage.estimatedDurationMin,
          usageCount: testPackage.usageCount,
          avgRating: testPackage.avgRating,
          createdAt: testPackage.createdAt,
          updatedAt: testPackage.updatedAt,
          examTypeName: examType.name,
        })
        .from(testPackage)
        .leftJoin(examType, eq(testPackage.examTypeId, examType.id))
        .where(where)
        .orderBy(desc(testPackage.createdAt))
        .limit(limit)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(testPackage)
        .where(where);
      const totalCount = Number(countResult?.count ?? 0);

      return { packages: rows, total: totalCount };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user.id;

      const [pkg] = await db
        .select({
          id: testPackage.id,
          title: testPackage.title,
          description: testPackage.description,
          examTypeId: testPackage.examTypeId,
          creatorUserId: testPackage.creatorUserId,
          isPublic: testPackage.isPublic,
          totalQuestions: testPackage.totalQuestions,
          totalSections: testPackage.totalSections,
          estimatedDurationMin: testPackage.estimatedDurationMin,
          usageCount: testPackage.usageCount,
          avgRating: testPackage.avgRating,
          createdAt: testPackage.createdAt,
          updatedAt: testPackage.updatedAt,
          creatorName: user.name,
          examTypeName: examType.name,
        })
        .from(testPackage)
        .leftJoin(user, eq(testPackage.creatorUserId, user.id))
        .leftJoin(examType, eq(testPackage.examTypeId, examType.id))
        .where(eq(testPackage.id, input.id))
        .limit(1);

      if (!pkg) return null;
      if (!pkg.isPublic && pkg.creatorUserId !== userId) return null;

      // Fetch sections with questions
      const sections = await db
        .select({
          id: packageSection.id,
          packageId: packageSection.packageId,
          sectionTypeId: packageSection.sectionTypeId,
          title: packageSection.title,
          orderIndex: packageSection.orderIndex,
          sectionTypeName: sectionType.name,
        })
        .from(packageSection)
        .leftJoin(sectionType, eq(packageSection.sectionTypeId, sectionType.id))
        .where(eq(packageSection.packageId, input.id))
        .orderBy(packageSection.orderIndex);

      const sectionIds = sections.map((s) => s.id);

      let sectionQuestions: Array<{
        sectionId: string;
        questionId: string;
        orderIndex: number;
        question: any;
      }> = [];

      if (sectionIds.length > 0) {
        const sqs = await db
          .select({
            sectionId: sectionQuestion.sectionId,
            questionId: sectionQuestion.questionId,
            orderIndex: sectionQuestion.orderIndex,
          })
          .from(sectionQuestion)
          .where(inArray(sectionQuestion.sectionId, sectionIds));

        if (sqs.length > 0) {
          const questionIds = sqs.map((sq) => sq.questionId);
          const qs = await db
            .select()
            .from(question)
            .where(inArray(question.id, questionIds));

          const questionMap = new Map(qs.map((q) => [q.id, q]));
          sectionQuestions = sqs.map((sq) => ({
            ...sq,
            question: questionMap.get(sq.questionId),
          }));
        }
      }

      const isOwner = pkg.creatorUserId === userId;

      const sectionsWithQuestions = sections.map((section) => ({
        ...section,
        questions: sectionQuestions
          .filter((sq) => sq.sectionId === section.id && sq.question != null)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((sq) => {
            if (isOwner) return sq.question;
            const { correctAnswer, explanation, ...rest } = sq.question;
            return rest;
          }),
      }));

      return { ...pkg, sections: sectionsWithQuestions };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        examTypeId: z.string(),
        isPublic: z.boolean().default(false),
        estimatedDurationMin: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [pkg] = await db
        .insert(testPackage)
        .values({
          ...input,
          creatorUserId: ctx.session.user.id,
          totalQuestions: 0,
          totalSections: 0,
        })
        .returning();
      return pkg;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        examTypeId: z.string().optional(),
        isPublic: z.boolean().optional(),
        estimatedDurationMin: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [pkg] = await db
        .select()
        .from(testPackage)
        .where(eq(testPackage.id, id))
        .limit(1);

      assertOwnership(pkg, ctx.session.user.id, "Package");

      const [updated] = await db
        .update(testPackage)
        .set(data)
        .where(eq(testPackage.id, id))
        .returning();
      return updated ?? null;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [pkg] = await db
        .select()
        .from(testPackage)
        .where(eq(testPackage.id, input.id))
        .limit(1);

      assertOwnership(pkg, ctx.session.user.id, "Package");

      await db.delete(testPackage).where(eq(testPackage.id, input.id));
      return { success: true };
    }),

  bulkPublish: protectedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const rows = await db
        .select({ id: testPackage.id, creatorUserId: testPackage.creatorUserId, isPublic: testPackage.isPublic })
        .from(testPackage)
        .where(inArray(testPackage.id, input.ids));

      const ownRows = rows.filter((r) => r.creatorUserId === ctx.session.user.id);
      const skipped = rows.length - ownRows.length;

      if (ownRows.length === 0) {
        throwNotFound("Package");
      }

      const ownIds = ownRows.map((r) => r.id);
      await db
        .update(testPackage)
        .set({ isPublic: true })
        .where(inArray(testPackage.id, ownIds));

      return { success: true, updated: ownRows.length, skipped };
    }),

  // ── Section Management ───────────────────────────────────

  addSection: protectedProcedure
    .input(
      z.object({
        packageId: z.string().uuid(),
        sectionTypeId: z.string(),
        title: z.string().min(1),
        orderIndex: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { packageId, ...sectionData } = input;

      // Verify ownership
      const [pkg] = await db
        .select()
        .from(testPackage)
        .where(eq(testPackage.id, packageId))
        .limit(1);

      assertOwnership(pkg, ctx.session.user.id, "Package");

      const [section] = await db
        .insert(packageSection)
        .values({
          packageId,
          ...sectionData,
        })
        .returning();

      // Update totalSections
      await db
        .update(testPackage)
        .set({
          totalSections: sql`${testPackage.totalSections} + 1`,
        })
        .where(eq(testPackage.id, packageId));

      return section;
    }),

  removeSection: protectedProcedure
    .input(z.object({ sectionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [section] = await db
        .select({ packageId: packageSection.packageId })
        .from(packageSection)
        .where(eq(packageSection.id, input.sectionId))
        .limit(1);

      if (!section) throwNotFound("Section");

      const [pkg] = await db
        .select()
        .from(testPackage)
        .where(eq(testPackage.id, section.packageId))
        .limit(1);

      assertOwnership(pkg, ctx.session.user.id, "Package");

      // Count questions in this section
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(sectionQuestion)
        .where(eq(sectionQuestion.sectionId, input.sectionId));
      const questionCount = Number(countResult?.count ?? 0);

      await db.delete(packageSection).where(eq(packageSection.id, input.sectionId));

      await db
        .update(testPackage)
        .set({
          totalSections: sql`${testPackage.totalSections} - 1`,
          totalQuestions: sql`${testPackage.totalQuestions} - ${questionCount}`,
        })
        .where(eq(testPackage.id, section.packageId));

      return { success: true };
    }),

  // ── Question Management ──────────────────────────────────

  addQuestion: protectedProcedure
    .input(
      z.object({
        sectionId: z.string().uuid(),
        questionId: z.string().uuid(),
        orderIndex: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [section] = await db
        .select({ packageId: packageSection.packageId })
        .from(packageSection)
        .where(eq(packageSection.id, input.sectionId))
        .limit(1);

      if (!section) throwNotFound("Section");

      const [pkg] = await db
        .select()
        .from(testPackage)
        .where(eq(testPackage.id, section.packageId))
        .limit(1);

      assertOwnership(pkg, ctx.session.user.id, "Package");

      const [sq] = await db
        .insert(sectionQuestion)
        .values({
          sectionId: input.sectionId,
          questionId: input.questionId,
          orderIndex: input.orderIndex,
        })
        .returning();

      await db
        .update(testPackage)
        .set({
          totalQuestions: sql`${testPackage.totalQuestions} + 1`,
        })
        .where(eq(testPackage.id, section.packageId));

      return sq;
    }),

  removeQuestion: protectedProcedure
    .input(z.object({ sectionQuestionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [sq] = await db
        .select({
          sectionId: sectionQuestion.sectionId,
        })
        .from(sectionQuestion)
        .where(eq(sectionQuestion.id, input.sectionQuestionId))
        .limit(1);

      if (!sq) throwNotFound("Section question");

      const [section] = await db
        .select({ packageId: packageSection.packageId })
        .from(packageSection)
        .where(eq(packageSection.id, sq.sectionId))
        .limit(1);

      if (!section) throwNotFound("Section");

      const [pkg] = await db
        .select()
        .from(testPackage)
        .where(eq(testPackage.id, section.packageId))
        .limit(1);

      assertOwnership(pkg, ctx.session.user.id, "Package");

      await db
        .delete(sectionQuestion)
        .where(eq(sectionQuestion.id, input.sectionQuestionId));

      await db
        .update(testPackage)
        .set({
          totalQuestions: sql`${testPackage.totalQuestions} - 1`,
        })
        .where(eq(testPackage.id, section.packageId));

      return { success: true };
    }),

  featured: publicProcedure
    .query(async () => {
      const rows = await db
        .select({
          id: testPackage.id,
          title: testPackage.title,
          description: testPackage.description,
          examTypeId: testPackage.examTypeId,
          isPublic: testPackage.isPublic,
          totalQuestions: testPackage.totalQuestions,
          totalSections: testPackage.totalSections,
          estimatedDurationMin: testPackage.estimatedDurationMin,
          usageCount: testPackage.usageCount,
          avgRating: testPackage.avgRating,
          createdAt: testPackage.createdAt,
          examTypeName: examType.name,
        })
        .from(testPackage)
        .leftJoin(examType, eq(testPackage.examTypeId, examType.id))
        .where(
          and(eq(testPackage.isFeatured, true), eq(testPackage.isPublic, true)),
        )
        .orderBy(desc(testPackage.createdAt))
        .limit(6);

      return rows;
    }),

  trending: publicProcedure
    .query(async () => {
      const rows = await db
        .select({
          id: testPackage.id,
          title: testPackage.title,
          description: testPackage.description,
          examTypeId: testPackage.examTypeId,
          isPublic: testPackage.isPublic,
          totalQuestions: testPackage.totalQuestions,
          totalSections: testPackage.totalSections,
          estimatedDurationMin: testPackage.estimatedDurationMin,
          usageCount: testPackage.usageCount,
          avgRating: testPackage.avgRating,
          createdAt: testPackage.createdAt,
          examTypeName: examType.name,
        })
        .from(testPackage)
        .leftJoin(examType, eq(testPackage.examTypeId, examType.id))
        .where(eq(testPackage.isPublic, true))
        .orderBy(desc(testPackage.usageCount))
        .limit(6);

      return rows;
    }),
});
