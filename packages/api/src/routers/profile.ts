import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { router, protectedProcedure, publicProcedure } from "../index";
import { db } from "@labas/db";
import { testPackage, question, examType, user } from "@labas/db";
import { throwBadRequest } from "../lib/errors";

export const profileRouter = router({
  getById: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const [u] = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(eq(user.id, input.userId))
        .limit(1);

      if (!u) return null;

      // Creator stats
      const [pkgStats] = await db
        .select({
          totalPackages: sql<number>`count(*)`,
          totalUsage: sql<number>`coalesce(sum(${testPackage.usageCount}), 0)`,
          avgRating: sql<number>`round(avg(${testPackage.avgRating})::numeric, 1)`,
        })
        .from(testPackage)
        .where(eq(testPackage.creatorUserId, input.userId));

      const [questionStats] = await db
        .select({
          totalQuestions: sql<number>`count(*)`,
          totalUsage: sql<number>`coalesce(sum(${question.usageCount}), 0)`,
          avgRating: sql<number>`round(avg(${question.avgRating})::numeric, 1)`,
        })
        .from(question)
        .where(eq(question.creatorUserId, input.userId));

      // Recent public packages
      const recentPackages = await db
        .select({
          id: testPackage.id,
          title: testPackage.title,
          examTypeId: testPackage.examTypeId,
          totalQuestions: testPackage.totalQuestions,
          usageCount: testPackage.usageCount,
          avgRating: testPackage.avgRating,
          isPublic: testPackage.isPublic,
          createdAt: testPackage.createdAt,
          examTypeName: examType.name,
        })
        .from(testPackage)
        .leftJoin(examType, eq(testPackage.examTypeId, examType.id))
        .where(
          and(
            eq(testPackage.creatorUserId, input.userId),
            eq(testPackage.isPublic, true),
          ),
        )
        .orderBy(desc(testPackage.createdAt))
        .limit(6);

      return {
        user: {
          id: u.id,
          name: u.name,
          image: u.image,
          createdAt: u.createdAt,
        },
        stats: {
          totalPackages: Number(pkgStats?.totalPackages ?? 0),
          totalPackageUsage: Number(pkgStats?.totalUsage ?? 0),
          avgPackageRating: Number(pkgStats?.avgRating ?? 0),
          totalQuestions: Number(questionStats?.totalQuestions ?? 0),
          totalQuestionUsage: Number(questionStats?.totalUsage ?? 0),
          avgQuestionRating: Number(questionStats?.avgRating ?? 0),
        },
        recentPackages,
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        image: z.string().url().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [updated] = await db
        .update(user)
        .set({
          ...(input.name ? { name: input.name } : {}),
          ...(input.image !== undefined ? { image: input.image } : {}),
        })
        .where(eq(user.id, userId))
        .returning({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        });

      if (!updated) throwBadRequest("Failed to update profile");
      return updated;
    }),
});
