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

export const packageRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          examTypeId: z.string().optional(),
          isPublic: z.boolean().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user.id;
      const conditions = [];

      if (input?.examTypeId) conditions.push(eq(testPackage.examTypeId, input.examTypeId));

      if (input?.isPublic !== undefined) {
        conditions.push(eq(testPackage.isPublic, input.isPublic));
      } else if (!userId) {
        conditions.push(eq(testPackage.isPublic, true));
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
        .limit(input?.limit ?? 20)
        .offset(input?.offset ?? 0);

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
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const conditions = [eq(testPackage.creatorUserId, userId)];

      const where = and(...conditions);

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
          updatedAt: testPackage.updatedAt,
          examTypeName: examType.name,
        })
        .from(testPackage)
        .leftJoin(examType, eq(testPackage.examTypeId, examType.id))
        .where(where)
        .orderBy(desc(testPackage.createdAt))
        .limit(input?.limit ?? 20)
        .offset(input?.offset ?? 0);

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

      const sectionsWithQuestions = sections.map((section) => ({
        ...section,
        questions: sectionQuestions
          .filter((sq) => sq.sectionId === section.id && sq.question != null)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((sq) => sq.question),
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
        .update(testPackage)
        .set(data)
        .where(
          and(eq(testPackage.id, id), eq(testPackage.creatorUserId, ctx.session.user.id)),
        )
        .returning();
      return pkg ?? null;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(testPackage)
        .where(
          and(eq(testPackage.id, input.id), eq(testPackage.creatorUserId, ctx.session.user.id)),
        );
      return { success: true };
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
        .select({ creatorUserId: testPackage.creatorUserId })
        .from(testPackage)
        .where(eq(testPackage.id, packageId))
        .limit(1);

      if (!pkg || pkg.creatorUserId !== ctx.session.user.id) {
        throw new Error("Package not found or not authorized");
      }

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

      if (!section) throw new Error("Section not found");

      const [pkg] = await db
        .select({ creatorUserId: testPackage.creatorUserId })
        .from(testPackage)
        .where(eq(testPackage.id, section.packageId))
        .limit(1);

      if (!pkg || pkg.creatorUserId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

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

      if (!section) throw new Error("Section not found");

      const [pkg] = await db
        .select({ creatorUserId: testPackage.creatorUserId })
        .from(testPackage)
        .where(eq(testPackage.id, section.packageId))
        .limit(1);

      if (!pkg || pkg.creatorUserId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

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

      if (!sq) throw new Error("Section question not found");

      const [section] = await db
        .select({ packageId: packageSection.packageId })
        .from(packageSection)
        .where(eq(packageSection.id, sq.sectionId))
        .limit(1);

      if (!section) throw new Error("Section not found");

      const [pkg] = await db
        .select({ creatorUserId: testPackage.creatorUserId })
        .from(testPackage)
        .where(eq(testPackage.id, section.packageId))
        .limit(1);

      if (!pkg || pkg.creatorUserId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

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
});
