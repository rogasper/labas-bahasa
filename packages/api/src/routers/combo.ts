import { z } from "zod";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
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
import { paginationSchema, paginateDefaults } from "../lib/pagination";
import { assertOwnership } from "../lib/ownership";
import { buildVisibilityCondition } from "../lib/visibility";
import { throwBadRequest } from "../lib/errors";

export const comboRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
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

      if (input?.isPublic !== undefined) {
        conditions.push(eq(comboPackage.isPublic, input.isPublic));
      } else {
        const vis = buildVisibilityCondition(comboPackage, userId);
        if (vis) conditions.push(vis);
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
        .limit(limit)
        .offset(offset);

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
          ...paginationSchema.shape,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { limit, offset } = paginateDefaults(input);
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
        .limit(limit)
        .offset(offset);

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

      const isOwner = combo.creatorUserId === userId;

      const sectionsWithQuestions = sections.map((section) => ({
        ...section,
        questions: sectionQuestions
          .filter((sq) => sq.sectionId === section.sourceSectionId)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((sq) => {
            if (isOwner) return sq.question;
            const { correctAnswer, explanation, ...rest } = sq.question;
            return rest;
          }),
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

      // 1. Create combo record
      const [combo] = await db
        .insert(comboPackage)
        .values({
          ...pkgData,
          creatorUserId: ctx.session.user.id,
        })
        .returning();

      if (!combo) {
        throwBadRequest("Failed to create combo package");
      }

      await db.insert(comboSection).values(
        sections.map((s) => ({
          comboId: combo.id,
          ...s,
        })),
      );

      // 2. Derive examTypeId from the first source package
      const firstSourcePkgId = sections[0]?.sourcePackageId;
      let examTypeId = "";
      if (firstSourcePkgId) {
        const [srcPkg] = await db
          .select({ examTypeId: testPackage.examTypeId })
          .from(testPackage)
          .where(eq(testPackage.id, firstSourcePkgId))
          .limit(1);
        examTypeId = srcPkg?.examTypeId ?? "";
      }

      // 3. Also create a testPackage so the combo appears in /packages
      const [pkg] = await db
        .insert(testPackage)
        .values({
          title: pkgData.title,
          description: pkgData.description,
          examTypeId,
          creatorUserId: ctx.session.user.id,
          isPublic: pkgData.isPublic,
          totalQuestions: 0,
          totalSections: 0,
          estimatedDurationMin: sections.length * 20, // rough estimate
        })
        .returning();

      if (pkg) {
        // 4. Duplicate each source section into the new package
        const sourceSectionIds = sections.map((s) => s.sourceSectionId);
        const sourceSections = sourceSectionIds.length > 0
          ? await db
              .select()
              .from(packageSection)
              .where(inArray(packageSection.id, sourceSectionIds))
          : [];

        const sourceSectionMap = new Map(sourceSections.map((s) => [s.id, s]));

        let totalQuestions = 0;

        for (const secInput of sections) {
          const srcSec = sourceSectionMap.get(secInput.sourceSectionId);
          if (!srcSec) continue;

          const [newSec] = await db
            .insert(packageSection)
            .values({
              packageId: pkg.id,
              sectionTypeId: srcSec.sectionTypeId,
              title: srcSec.title,
              orderIndex: secInput.orderIndex,
            })
            .returning();

          // Copy questions from source section
          const srcQuestions = await db
            .select()
            .from(sectionQuestion)
            .where(eq(sectionQuestion.sectionId, secInput.sourceSectionId))
            .orderBy(sectionQuestion.orderIndex);

          if (newSec && srcQuestions.length > 0) {
            await db.insert(sectionQuestion).values(
              srcQuestions.map((sq, idx) => ({
                sectionId: newSec.id,
                questionId: sq.questionId,
                orderIndex: idx,
              })),
            );
            totalQuestions += srcQuestions.length;
          }
        }

        // Update totals
        await db
          .update(testPackage)
          .set({
            totalSections: sections.length,
            totalQuestions,
          })
          .where(eq(testPackage.id, pkg.id));
      }

      return { ...combo, packageId: pkg?.id };
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
        .select()
        .from(comboPackage)
        .where(eq(comboPackage.id, id))
        .limit(1);

      assertOwnership(combo, ctx.session.user.id, "Combo");

      const [updated] = await db
        .update(comboPackage)
        .set(data)
        .where(eq(comboPackage.id, id))
        .returning();
      return updated ?? null;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [combo] = await db
        .select()
        .from(comboPackage)
        .where(eq(comboPackage.id, input.id))
        .limit(1);

      assertOwnership(combo, ctx.session.user.id, "Combo");

      await db.delete(comboPackage).where(eq(comboPackage.id, input.id));
      return { success: true };
    }),

  // Get available sections from packages for combiner
  availableSections: protectedProcedure
    .input(
      z.object({
        examTypeId: z.string().optional(),
        search: z.string().optional(),
        ...paginationSchema.shape,
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { limit, offset } = paginateDefaults(input);

      const pkgConditions = [];
      const vis = buildVisibilityCondition(testPackage, userId);
      if (vis) pkgConditions.push(vis);

      if (input?.examTypeId) {
        pkgConditions.push(eq(testPackage.examTypeId, input.examTypeId));
      }

      const pkgWhere = pkgConditions.length > 0 ? and(...pkgConditions) : undefined;

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
        .where(pkgWhere)
        .limit(limit)
        .offset(offset);

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

