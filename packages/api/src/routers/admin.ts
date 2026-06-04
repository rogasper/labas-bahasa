import { z } from "zod";
import { eq, desc, sql, count, ilike, or, and, inArray, type SQL } from "drizzle-orm";
import { adminProcedure, protectedProcedure, router } from "../index";
import * as schema from "@labas/db";
import { db } from "@labas/db";
import { paginationSchema, paginateDefaults } from "../lib/pagination";
import { throwNotFound, throwForbidden, throwBadRequest } from "../lib/errors";
import { getUserCredit, getLastRefillAt, getPoolUsage, getConfig, setConfig, autoRefillIfEligible } from "../lib/credit";
import { env } from "@labas/env/server";

function audit(adminUserId: string, action: string, targetUserId: string | null, details?: Record<string, unknown>) {
  return db.insert(schema.adminAuditLog).values({
    adminUserId,
    action,
    targetUserId,
    details,
  });
}

export const adminRouter = router({
  isAdmin: protectedProcedure.query(async ({ ctx }) => {
    const [u] = await db.select({ role: schema.user.role }).from(schema.user).where(eq(schema.user.id, ctx.session.user.id)).limit(1);
    return { isAdmin: u?.role === "admin" };
  }),

  getMyCredit: protectedProcedure.query(async ({ ctx }) => {
    let credit = await getUserCredit(ctx.session.user.id);

    // Proactively grant first free-credit refill so new users see balance before clicking Generate.
    if (credit.tokenBalance <= 0) {
      const refill = await autoRefillIfEligible(ctx.session.user.id);
      if (refill.refilled && refill.newBalance !== undefined) {
        credit = { ...credit, tokenBalance: refill.newBalance };
      }
    }

    const lastRefill = await getLastRefillAt(ctx.session.user.id);
    const cooldownMs = 7 * 24 * 60 * 60 * 1000;
    const lastRefillTime = lastRefill?.createdAt ? new Date(lastRefill.createdAt).getTime() : 0;
    const cooldownEnd = lastRefillTime + cooldownMs;
    const cooldownRemaining = Math.max(0, Math.ceil((cooldownEnd - Date.now()) / (24 * 60 * 60 * 1000)));

    const enabledVal = await getConfig("free_credits_enabled", () => String(env.FREE_CREDITS_ENABLED));

    return {
      tokenBalance: credit.tokenBalance,
      lifetimeTokensUsed: credit.lifetimeTokensUsed,
      freeCreditsEnabled: enabledVal === "true",
      lastRefillAt: lastRefill?.createdAt ?? null,
      cooldownDays: 7,
      cooldownRemaining,
    };
  }),

  // ── User Management ───────────────────────────────────────

  listUsers: adminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          role: z.enum(["user", "admin"]).optional(),
          suspended: z.boolean().optional(),
          emailVerified: z.boolean().optional(),
          ...paginationSchema.shape,
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const { limit, offset } = paginateDefaults(input);

      const conditions: ReturnType<typeof eq>[] = [];
      if (input?.search) {
        conditions.push(
          or(
            ilike(schema.user.name, `%${input.search}%`),
            ilike(schema.user.email, `%${input.search}%`),
          ) as unknown as ReturnType<typeof eq>,
        );
      }
      if (input?.role) {
        conditions.push(eq(schema.user.role, input.role));
      }
      if (input?.suspended !== undefined) {
        conditions.push(eq(schema.user.suspended, input.suspended));
      }
      if (input?.emailVerified !== undefined) {
        conditions.push(eq(schema.user.emailVerified, input.emailVerified));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [total] = await db
        .select({ count: count() })
        .from(schema.user)
        .where(where);

      const users = await db
        .select({
          id: schema.user.id,
          name: schema.user.name,
          email: schema.user.email,
          role: schema.user.role,
          suspended: schema.user.suspended,
          emailVerified: schema.user.emailVerified,
          createdAt: schema.user.createdAt,
        })
        .from(schema.user)
        .where(where)
        .orderBy(desc(schema.user.createdAt))
        .limit(limit)
        .offset(offset);

      return { users, total: Number(total?.count ?? 0) };
    }),

  getUserDetail: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const [u] = await db.select().from(schema.user).where(eq(schema.user.id, input.userId)).limit(1);
      if (!u) throwNotFound("User");

      const [credit] = await db
        .select()
        .from(schema.userCredit)
        .where(eq(schema.userCredit.userId, input.userId))
        .limit(1);

      return { user: u, credit: credit ?? null };
    }),

  suspendUser: adminProcedure
    .input(z.object({ userId: z.string(), suspended: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) throwForbidden("Cannot suspend yourself");

      const [u] = await db
        .update(schema.user)
        .set({ suspended: input.suspended })
        .where(eq(schema.user.id, input.userId))
        .returning();
      if (!u) throwNotFound("User");

      if (input.suspended) {
        await db
          .delete(schema.session)
          .where(eq(schema.session.userId, input.userId));
      }

      await audit(ctx.session.user.id, input.suspended ? "suspend_user" : "unsuspend_user", input.userId);
      return u;
    }),

  setUserRole: adminProcedure
    .input(z.object({ userId: z.string(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) throwForbidden("Cannot change your own role");

      const [u] = await db
        .update(schema.user)
        .set({ role: input.role })
        .where(eq(schema.user.id, input.userId))
        .returning();
      if (!u) throwNotFound("User");

      await audit(ctx.session.user.id, "change_role", input.userId, { newRole: input.role });
      return u;
    }),

  // ── Credit Management ─────────────────────────────────────

  getCreditBalance: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const [credit] = await db
        .select()
        .from(schema.userCredit)
        .where(eq(schema.userCredit.userId, input.userId))
        .limit(1);
      return credit ?? { userId: input.userId, tokenBalance: 0, lifetimeTokensUsed: 0 };
    }),

  adjustCredit: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        amount: z.number().min(-1000000).max(1000000),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, input.userId)).limit(1);
      if (!user) throwNotFound("User");

      await db
        .insert(schema.userCredit)
        .values({ userId: input.userId, tokenBalance: 0 })
        .onConflictDoNothing();

      const [updated] = await db
        .update(schema.userCredit)
        .set({
          tokenBalance: sql`token_balance + ${input.amount}`,
        })
        .where(eq(schema.userCredit.userId, input.userId))
        .returning();
      if (!updated) throwBadRequest("Failed to adjust credit");

      await db.insert(schema.creditTransaction).values({
        userId: input.userId,
        amount: input.amount,
        type: "admin_adjust",
        description: input.description ?? null,
      });

      await audit(ctx.session.user.id, "adjust_credit", input.userId, {
        amount: input.amount,
        newBalance: updated.tokenBalance,
      });

      return { newBalance: updated.tokenBalance };
    }),

  getCreditHistory: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const transactions = await db
        .select()
        .from(schema.creditTransaction)
        .where(eq(schema.creditTransaction.userId, input.userId))
        .orderBy(desc(schema.creditTransaction.createdAt))
        .limit(50);

      return { transactions };
    }),

  listUsersWithCredits: adminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          sortBy: z.enum(["balance", "usage", "recent"]).optional(),
          sortDir: z.enum(["asc", "desc"]).optional(),
          ...paginationSchema.shape,
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const { limit, offset } = paginateDefaults(input);

      const userWhere = input?.search
        ? or(
            ilike(schema.user.name, `%${input.search}%`),
            ilike(schema.user.email, `%${input.search}%`),
          )
        : undefined;

      const [total] = await db
        .select({ count: count() })
        .from(schema.user)
        .where(userWhere);

      let orderBy: SQL;
      const dir = input?.sortDir === "asc" ? sql`ASC` : sql`DESC`;
      switch (input?.sortBy) {
        case "balance":
          orderBy = sql`COALESCE(${schema.userCredit.tokenBalance}, 0) ${dir}`;
          break;
        case "usage":
          orderBy = sql`COALESCE(${schema.userCredit.lifetimeTokensUsed}, 0) ${dir}`;
          break;
        case "recent":
          orderBy = sql`COALESCE(${schema.userCredit.updatedAt}, ${schema.user.createdAt}) ${dir}`;
          break;
        default:
          orderBy = desc(schema.user.createdAt) as unknown as SQL;
      }

      const users = await db
        .select({
          id: schema.user.id,
          name: schema.user.name,
          email: schema.user.email,
          emailVerified: schema.user.emailVerified,
          role: schema.user.role,
          tokenBalance: sql<number>`COALESCE(${schema.userCredit.tokenBalance}, 0)`,
          lifetimeTokensUsed: sql<number>`COALESCE(${schema.userCredit.lifetimeTokensUsed}, 0)`,
          creditUpdatedAt: schema.userCredit.updatedAt,
          createdAt: schema.user.createdAt,
        })
        .from(schema.user)
        .leftJoin(schema.userCredit, eq(schema.userCredit.userId, schema.user.id))
        .where(userWhere)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

      return { users, total: Number(total?.count ?? 0) };
    }),

  // ── Featured Management ──────────────────────────────────

  toggleFeaturedPackage: adminProcedure
    .input(z.object({ packageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [pkg] = await db
        .select({ id: schema.testPackage.id, isFeatured: schema.testPackage.isFeatured })
        .from(schema.testPackage)
        .where(eq(schema.testPackage.id, input.packageId))
        .limit(1);
      if (!pkg) throwNotFound("Package");

      const newValue = !pkg.isFeatured;
      const [updated] = await db
        .update(schema.testPackage)
        .set({ isFeatured: newValue })
        .where(eq(schema.testPackage.id, input.packageId))
        .returning();

      await audit(ctx.session.user.id, newValue ? "feature_package" : "unfeature_package", null, {
        packageId: input.packageId,
      });
      return updated;
    }),

  toggleFeaturedQuestion: adminProcedure
    .input(z.object({ questionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [q] = await db
        .select({ id: schema.question.id, isFeatured: schema.question.isFeatured })
        .from(schema.question)
        .where(eq(schema.question.id, input.questionId))
        .limit(1);
      if (!q) throwNotFound("Question");

      const newValue = !q.isFeatured;
      const [updated] = await db
        .update(schema.question)
        .set({ isFeatured: newValue })
        .where(eq(schema.question.id, input.questionId))
        .returning();

      await audit(ctx.session.user.id, newValue ? "feature_question" : "unfeature_question", null, {
        questionId: input.questionId,
      });
      return updated;
    }),

  listFeatured: protectedProcedure.query(async () => {
    const packages = await db
      .select({
        id: schema.testPackage.id,
        title: schema.testPackage.title,
        description: schema.testPackage.description,
        examTypeId: schema.testPackage.examTypeId,
        creatorUserId: schema.testPackage.creatorUserId,
        creatorName: schema.user.name,
        isPublic: schema.testPackage.isPublic,
        isFeatured: schema.testPackage.isFeatured,
        totalQuestions: schema.testPackage.totalQuestions,
        totalSections: schema.testPackage.totalSections,
        estimatedDurationMin: schema.testPackage.estimatedDurationMin,
        usageCount: schema.testPackage.usageCount,
        avgRating: schema.testPackage.avgRating,
        createdAt: schema.testPackage.createdAt,
        updatedAt: schema.testPackage.updatedAt,
        examTypeName: schema.examType.name,
      })
      .from(schema.testPackage)
      .leftJoin(schema.examType, eq(schema.testPackage.examTypeId, schema.examType.id))
      .leftJoin(schema.user, eq(schema.testPackage.creatorUserId, schema.user.id))
      .where(eq(schema.testPackage.isFeatured, true))
      .orderBy(desc(schema.testPackage.updatedAt));

    const questions = await db
      .select()
      .from(schema.question)
      .where(eq(schema.question.isFeatured, true))
      .orderBy(desc(schema.question.updatedAt));

    return { packages, questions };
  }),

  searchContent: adminProcedure
    .input(
      z.object({
        search: z.string(),
        type: z.enum(["packages", "questions"]),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ input }) => {
      if (input.type === "packages") {
        const where = or(
          ilike(schema.testPackage.title, `%${input.search}%`),
          ilike(schema.testPackage.description ?? sql`''`, `%${input.search}%`),
        );

        const [total] = await db.select({ count: count() }).from(schema.testPackage).where(where);

        const items = await db
          .select({
            id: schema.testPackage.id,
            title: schema.testPackage.title,
            description: schema.testPackage.description,
            examTypeId: schema.testPackage.examTypeId,
            creatorUserId: schema.testPackage.creatorUserId,
            creatorName: schema.user.name,
            isPublic: schema.testPackage.isPublic,
            isFeatured: schema.testPackage.isFeatured,
            totalQuestions: schema.testPackage.totalQuestions,
            totalSections: schema.testPackage.totalSections,
            estimatedDurationMin: schema.testPackage.estimatedDurationMin,
            usageCount: schema.testPackage.usageCount,
            avgRating: schema.testPackage.avgRating,
            createdAt: schema.testPackage.createdAt,
            updatedAt: schema.testPackage.updatedAt,
          })
          .from(schema.testPackage)
          .leftJoin(schema.user, eq(schema.testPackage.creatorUserId, schema.user.id))
          .where(where)
          .orderBy(desc(schema.testPackage.updatedAt))
          .limit(input.limit)
          .offset(input.offset);

        return { items, total: Number(total?.count ?? 0) };
      }

      const where = or(
        ilike(schema.question.questionText, `%${input.search}%`),
        ilike(schema.question.passageText, `%${input.search}%`),
      );

      const [total] = await db.select({ count: count() }).from(schema.question).where(where);

      const items = await db
        .select()
        .from(schema.question)
        .where(where)
        .orderBy(desc(schema.question.updatedAt))
        .limit(input.limit)
        .offset(input.offset);

      return { items, total: Number(total?.count ?? 0) };
    }),

  // ── Generation Jobs ──────────────────────────────────────

  listAllJobs: adminProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          search: z.string().optional(),
          ...paginationSchema.shape,
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const { limit, offset } = paginateDefaults(input);

      const conditions: ReturnType<typeof eq>[] = [];
      if (input?.status) {
        conditions.push(eq(schema.generationJob.status, input.status));
      }
      if (input?.search) {
        conditions.push(
          or(
            ilike(schema.user.name, `%${input.search}%`),
            ilike(schema.user.email, `%${input.search}%`),
          ) as unknown as ReturnType<typeof eq>,
        );
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const baseQuery = db
        .select({ count: count() })
        .from(schema.generationJob)
        .leftJoin(schema.user, eq(schema.generationJob.userId, schema.user.id))
        .where(where);

      const [total] = await baseQuery;

      const jobs = await db
        .select({
          id: schema.generationJob.id,
          userId: schema.generationJob.userId,
          userName: schema.user.name,
          userEmail: schema.user.email,
          status: schema.generationJob.status,
          mode: schema.generationJob.mode,
          examTypeId: schema.generationJob.examTypeId,
          sectionTypeId: schema.generationJob.sectionTypeId,
          questionCount: schema.generationJob.questionCount,
          progress: schema.generationJob.progress,
          tokensUsed: schema.generationJob.tokensUsed,
          errorMessage: schema.generationJob.errorMessage,
          generationKeySource: schema.generationJob.generationKeySource,
          createdAt: schema.generationJob.createdAt,
          completedAt: schema.generationJob.completedAt,
        })
        .from(schema.generationJob)
        .leftJoin(schema.user, eq(schema.generationJob.userId, schema.user.id))
        .where(where)
        .orderBy(desc(schema.generationJob.createdAt))
        .limit(limit)
        .offset(offset);

      return { jobs, total: Number(total?.count ?? 0) };
    }),

  cancelAnyJob: adminProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [job] = await db
        .select()
        .from(schema.generationJob)
        .where(eq(schema.generationJob.id, input.jobId))
        .limit(1);
      if (!job) throwNotFound("Job");

      if (job.status !== "pending" && job.status !== "running") {
        throwBadRequest("Only pending or running jobs can be cancelled");
      }

      const [updated] = await db
        .update(schema.generationJob)
        .set({ status: "cancelled", completedAt: new Date() })
        .where(eq(schema.generationJob.id, input.jobId))
        .returning();

      await audit(ctx.session.user.id, "cancel_job", job.userId, { jobId: input.jobId });
      return updated;
    }),

  // ── Content Moderation ───────────────────────────────────

  listLatestQuestions: adminProcedure
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
    .query(async ({ input }) => {
      const { limit, offset } = paginateDefaults(input);

      const conditions: ReturnType<typeof eq>[] = [];
      if (input?.search) {
        conditions.push(
          or(
            ilike(schema.question.questionText, `%${input.search}%`),
            ilike(schema.question.passageText, `%${input.search}%`),
          ) as unknown as ReturnType<typeof eq>,
        );
      }
      if (input?.examTypeId) {
        conditions.push(eq(schema.question.examTypeId, input.examTypeId));
      }
      if (input?.isPublic !== undefined) {
        conditions.push(eq(schema.question.isPublic, input.isPublic));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [total] = await db
        .select({ count: count() })
        .from(schema.question)
        .where(where);

      const questions = await db
        .select()
        .from(schema.question)
        .where(where)
        .orderBy(desc(schema.question.createdAt))
        .limit(limit)
        .offset(offset);

      return { questions, total: Number(total?.count ?? 0) };
    }),

  bulkTogglePublic: adminProcedure
    .input(
      z.object({
        questionIds: z.array(z.string().uuid()),
        isPublic: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await db
        .update(schema.question)
        .set({ isPublic: input.isPublic })
        .where(inArray(schema.question.id, input.questionIds))
        .returning();

      for (const q of updated) {
        await audit(
          ctx.session.user.id,
          input.isPublic ? "publish_question" : "unpublish_question",
          q.creatorUserId,
          { questionId: q.id },
        );
      }

      return { updated: updated.length };
    }),

  togglePublicAny: adminProcedure
    .input(z.object({ questionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [q] = await db
        .select({ id: schema.question.id, isPublic: schema.question.isPublic, creatorUserId: schema.question.creatorUserId })
        .from(schema.question)
        .where(eq(schema.question.id, input.questionId))
        .limit(1);
      if (!q) throwNotFound("Question");

      const newValue = !q.isPublic;
      const [updated] = await db
        .update(schema.question)
        .set({ isPublic: newValue })
        .where(eq(schema.question.id, input.questionId))
        .returning();

      await audit(ctx.session.user.id, newValue ? "publish_question" : "unpublish_question", q.creatorUserId, {
        questionId: input.questionId,
      });
      return updated;
    }),

  // ── Package Moderation ─────────────────────────────────────

  listLatestPackages: adminProcedure
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
    .query(async ({ input }) => {
      const { limit, offset } = paginateDefaults(input);

      const conditions: ReturnType<typeof eq>[] = [];
      if (input?.search) {
        conditions.push(
          or(
            ilike(schema.testPackage.title, `%${input.search}%`),
            ilike(schema.testPackage.description ?? sql`''`, `%${input.search}%`),
          ) as unknown as ReturnType<typeof eq>,
        );
      }
      if (input?.examTypeId) {
        conditions.push(eq(schema.testPackage.examTypeId, input.examTypeId));
      }
      if (input?.isPublic !== undefined) {
        conditions.push(eq(schema.testPackage.isPublic, input.isPublic));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [total] = await db
        .select({ count: count() })
        .from(schema.testPackage)
        .where(where);

      const packages = await db
        .select({
          id: schema.testPackage.id,
          title: schema.testPackage.title,
          description: schema.testPackage.description,
          examTypeId: schema.testPackage.examTypeId,
          creatorUserId: schema.testPackage.creatorUserId,
          creatorName: schema.user.name,
          isPublic: schema.testPackage.isPublic,
          totalQuestions: schema.testPackage.totalQuestions,
          totalSections: schema.testPackage.totalSections,
          createdAt: schema.testPackage.createdAt,
        })
        .from(schema.testPackage)
        .leftJoin(schema.user, eq(schema.testPackage.creatorUserId, schema.user.id))
        .where(where)
        .orderBy(desc(schema.testPackage.createdAt))
        .limit(limit)
        .offset(offset);

      return { packages, total: Number(total?.count ?? 0) };
    }),

  togglePublicAnyPackage: adminProcedure
    .input(z.object({ packageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [p] = await db
        .select({ id: schema.testPackage.id, isPublic: schema.testPackage.isPublic, creatorUserId: schema.testPackage.creatorUserId })
        .from(schema.testPackage)
        .where(eq(schema.testPackage.id, input.packageId))
        .limit(1);
      if (!p) throwNotFound("Package");

      const newValue = !p.isPublic;
      const [updated] = await db
        .update(schema.testPackage)
        .set({ isPublic: newValue })
        .where(eq(schema.testPackage.id, input.packageId))
        .returning();

      await audit(ctx.session.user.id, newValue ? "publish_package" : "unpublish_package", p.creatorUserId, {
        packageId: input.packageId,
      });
      return updated;
    }),

  bulkTogglePublicPackages: adminProcedure
    .input(
      z.object({
        packageIds: z.array(z.string().uuid()),
        isPublic: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await db
        .update(schema.testPackage)
        .set({ isPublic: input.isPublic })
        .where(inArray(schema.testPackage.id, input.packageIds))
        .returning();

      for (const pkg of updated) {
        await audit(
          ctx.session.user.id,
          input.isPublic ? "publish_package" : "unpublish_package",
          pkg.creatorUserId,
          { packageId: pkg.id },
        );
      }

      return { updated: updated.length };
    }),

  // ── Dashboard Stats ──────────────────────────────────────

  dashboardStats: adminProcedure.query(async () => {
    const [userCount] = await db.select({ count: count() }).from(schema.user);
    const [questionCount] = await db.select({ count: count() }).from(schema.question);
    const [packageCount] = await db.select({ count: count() }).from(schema.testPackage);
    const [jobCount] = await db.select({ count: count() }).from(schema.generationJob);
    const pool = await getPoolUsage();
    const enabledVal = await getConfig("free_credits_enabled", () => String(env.FREE_CREDITS_ENABLED));

    return {
      totalUsers: Number(userCount?.count ?? 0),
      totalQuestions: Number(questionCount?.count ?? 0),
      totalPackages: Number(packageCount?.count ?? 0),
      totalJobs: Number(jobCount?.count ?? 0),
      poolUsed: pool.totalDistributed,
      poolMax: pool.maxPool,
      poolRemaining: pool.remaining,
      freeCreditsEnabled: enabledVal === "true",
    };
  }),

  getPlatformConfig: adminProcedure.query(async () => {
    const [enabled, maxPool] = await Promise.all([
      getConfig("free_credits_enabled", () => String(env.FREE_CREDITS_ENABLED)),
      getConfig("free_credits_max_pool", () => String(env.FREE_CREDITS_MAX_POOL)),
    ]);
    return {
      freeCreditsEnabled: enabled === "true",
      freeCreditsMaxPool: parseInt(maxPool, 10) || env.FREE_CREDITS_MAX_POOL,
    };
  }),

  setPlatformConfig: adminProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await setConfig(input.key, input.value);
      await audit(ctx.session.user.id, "set_config", null, { key: input.key, value: input.value });
      return { ok: true };
    }),
});
