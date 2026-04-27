import { z } from "zod";
import { eq, and, desc, sql, inArray, or } from "drizzle-orm";
import { router, protectedProcedure, publicProcedure } from "../index";
import { db } from "@labas/db";
import {
  comboPackage,
  comboSection,
  testPackage,
  packageSection,
  sectionQuestion,
  question,
  examType,
  sectionType,
  user,
} from "@labas/db";

export const comboRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
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

      if (input?.isPublic !== undefined) {
        conditions.push(eq(comboPackage.isPublic, input.isPublic));
      } else if (!userId) {
        conditions.push(eq(comboPackage.isPublic, true));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          id: comboPackage.id,
          title: comboPackage.title,
          description: comboPackage.description,
          creatorUserId: comboPackage.creatorUserId,
          isPublic: comboPackage.isPublic,
          createdAt: comboPackage.createdAt,
          updatedAt: comboPackage.updatedAt,
          creatorName: user.name,
        })
        .from(comboPackage)
        .leftJoin(user, eq(comboPackage.creatorUserId, user.id))
        .where(where)
        .orderBy(desc(comboPackage.createdAt))
        .limit(input?.limit ?? 20)
        .offset(input?.offset ?? 0);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(comboPackage)
        .where(where);

      return { combos: rows, total: Number(countResult?.count ?? 0) };
    }),

  myCombos: protectedProcedure
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
      const conditions = [eq(comboPackage.creatorUserId, userId)];
      const where = and(...conditions);

      const rows = await db
        .select({
          id: comboPackage.id,
          title: comboPackage.title,
          description: comboPackage.description,
          isPublic: comboPackage.isPublic,
          createdAt: comboPackage.createdAt,
          updatedAt: comboPackage.updatedAt,
        })
        .from(comboPackage)
        .where(where)
        .orderBy(desc(comboPackage.createdAt))
        .limit(input?.limit ?? 20)
        .offset(input?.offset ?? 0);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(comboPackage)
        .where(where);

      return { combos: rows, total: Number(countResult?.count ?? 0) };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user.id;

      const [combo] = await db
        .select({
          id: comboPackage.id,
          title: comboPackage.title,
          description: comboPackage.description,
          creatorUserId: comboPackage.creatorUserId,
          isPublic: comboPackage.isPublic,
          createdAt: comboPackage.createdAt,
          updatedAt: comboPackage.updatedAt,
          creatorName: user.name,
        })
        .from(comboPackage)
        .leftJoin(user, eq(comboPackage.creatorUserId, user.id))
        .where(eq(comboPackage.id, input.id))
        .limit(1);

      if (!combo) return null;
      if (!combo.isPublic && combo.creatorUserId !== userId) return null;

      // Fetch combo sections with source data
      const sections = await db
        .select({
          id: comboSection.id,
          comboId: comboSection.comboId,
          sourcePackageId: comboSection.sourcePackageId,
          sourceSectionId: comboSection.sourceSectionId,
          orderIndex: comboSection.orderIndex,
          packageTitle: testPackage.title,
          sectionTitle: packageSection.title,
          sectionTypeName: sectionType.name,
          examTypeName: examType.name,
        })
        .from(comboSection)
        .leftJoin(testPackage, eq(comboSection.sourcePackageId, testPackage.id))
        .leftJoin(packageSection, eq(comboSection.sourceSectionId, packageSection.id))
        .leftJoin(sectionType, eq(packageSection.sectionTypeId, sectionType.id))
        .leftJoin(examType, eq(testPackage.examTypeId, examType.id))
        .where(eq(comboSection.comboId, input.id))
        .orderBy(comboSection.orderIndex);

      // Fetch questions for each section
      const sectionIds = sections.map((s) => s.sourceSectionId);
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
          .filter((sq) => sq.sectionId === section.sourceSectionId)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((sq) => sq.question),
      }));

      return { ...combo, sections: sectionsWithQuestions };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        isPublic: z.boolean().default(false),
        sections: z.array(
          z.object({
            sourcePackageId: z.string().uuid(),
            sourceSectionId: z.string().uuid(),
            orderIndex: z.number().default(0),
          }),
        ).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { sections, ...pkgData } = input;

      const [combo] = await db
        .insert(comboPackage)
        .values({
          ...pkgData,
          creatorUserId: ctx.session.user.id,
        })
        .returning();

      if (!combo) {
        throw new Error("Failed to create combo package");
      }

      await db.insert(comboSection).values(
        sections.map((s) => ({
          comboId: combo.id,
          ...s,
        })),
      );

      return combo;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        isPublic: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [combo] = await db
        .update(comboPackage)
        .set(data)
        .where(
          and(eq(comboPackage.id, id), eq(comboPackage.creatorUserId, ctx.session.user.id)),
        )
        .returning();
      return combo ?? null;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(comboPackage)
        .where(
          and(eq(comboPackage.id, input.id), eq(comboPackage.creatorUserId, ctx.session.user.id)),
        );
      return { success: true };
    }),

  // Get available sections from packages for combiner
  availableSections: protectedProcedure
    .input(
      z.object({
        examTypeId: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get packages the user can access (public or owned)
      const pkgConditions = [
        and(
          eq(testPackage.isPublic, true),
          eq(testPackage.creatorUserId, userId),
        ),
      ];

      if (input?.examTypeId) {
        pkgConditions.push(eq(testPackage.examTypeId, input.examTypeId));
      }

      const packages = await db
        .select({
          id: testPackage.id,
          title: testPackage.title,
          examTypeId: testPackage.examTypeId,
          creatorUserId: testPackage.creatorUserId,
          isPublic: testPackage.isPublic,
          examTypeName: examType.name,
        })
        .from(testPackage)
        .leftJoin(examType, eq(testPackage.examTypeId, examType.id))
        .where(
          or(
            eq(testPackage.isPublic, true),
            eq(testPackage.creatorUserId, userId),
          ),
        )
        .limit(input?.limit ?? 20)
        .offset(input?.offset ?? 0);

      const packageIds = packages.map((p) => p.id);

      const sections = await db
        .select({
          id: packageSection.id,
          packageId: packageSection.packageId,
          sectionTypeId: packageSection.sectionTypeId,
          title: packageSection.title,
          orderIndex: packageSection.orderIndex,
          packageTitle: testPackage.title,
          examTypeName: examType.name,
          sectionTypeName: sectionType.name,
        })
        .from(packageSection)
        .leftJoin(testPackage, eq(packageSection.packageId, testPackage.id))
        .leftJoin(examType, eq(testPackage.examTypeId, examType.id))
        .leftJoin(sectionType, eq(packageSection.sectionTypeId, sectionType.id))
        .where(inArray(packageSection.packageId, packageIds))
        .orderBy(testPackage.title, packageSection.orderIndex);

      return { packages, sections };
    }),
});

