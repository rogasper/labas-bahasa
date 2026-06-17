import { z } from "zod";
import { eq, desc, sql, count, sum, ilike, or, and, inArray, gte, lte, type SQL } from "drizzle-orm";
import { adminProcedure, protectedProcedure, router } from "../index";
import * as schema from "@labas/db";
import { db } from "@labas/db";
import { paginationSchema, paginateDefaults } from "../lib/pagination";
import { throwNotFound, throwForbidden, throwBadRequest } from "../lib/errors";
import { getUserCredit, getLastRefillAt, getPoolUsage, getConfig, getConfigRaw, setConfig, autoRefillIfEligible, getPlatformAiConfig, maskApiKey } from "../lib/credit";
import { encryptApiKey } from "../lib/encryption";
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

  listFeatured: adminProcedure.query(async () => {
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

  /** Lightweight featured items for the public dashboard (no admin access required). */
  getDashboardFeatured: protectedProcedure.query(async () => {
    const packages = await db
      .select({
        id: schema.testPackage.id,
        title: schema.testPackage.title,
        description: schema.testPackage.description,
        examTypeId: schema.testPackage.examTypeId,
        creatorUserId: schema.testPackage.creatorUserId,
        creatorName: schema.user.name,
        totalQuestions: schema.testPackage.totalQuestions,
        totalSections: schema.testPackage.totalSections,
        estimatedDurationMin: schema.testPackage.estimatedDurationMin,
        usageCount: schema.testPackage.usageCount,
        avgRating: schema.testPackage.avgRating,
        examTypeName: schema.examType.name,
      })
      .from(schema.testPackage)
      .leftJoin(schema.examType, eq(schema.testPackage.examTypeId, schema.examType.id))
      .leftJoin(schema.user, eq(schema.testPackage.creatorUserId, schema.user.id))
      .where(eq(schema.testPackage.isFeatured, true))
      .orderBy(desc(schema.testPackage.updatedAt));

    const [questionCount] = await db
      .select({ count: count() })
      .from(schema.question)
      .where(eq(schema.question.isFeatured, true));
    const questionsTotal = Number(questionCount?.count ?? 0);

    return { packages, questionsTotal };
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

  // ── Activity Analytics ─────────────────────────────────────

  activeAttempts: adminProcedure.query(async () => {
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const inProgress = await db
      .select({
        attemptId: schema.testAttempt.id,
        userId: schema.testAttempt.userId,
        userName: schema.user.name,
        userEmail: schema.user.email,
        packageId: schema.testAttempt.packageId,
        packageTitle: schema.testPackage.title,
        startedAt: schema.testAttempt.startedAt,
      })
      .from(schema.testAttempt)
      .innerJoin(schema.user, eq(schema.testAttempt.userId, schema.user.id))
      .leftJoin(schema.testPackage, eq(schema.testAttempt.packageId, schema.testPackage.id))
      .where(
        and(
          eq(schema.testAttempt.status, "in_progress"),
          gte(schema.testAttempt.startedAt, sixHoursAgo),
        ),
      )
      .orderBy(desc(schema.testAttempt.startedAt))
      .limit(50);

    return inProgress.map((a) => ({
      attemptId: a.attemptId,
      userId: a.userId,
      userName: a.userName,
      userEmail: a.userEmail,
      packageTitle: a.packageTitle ?? "Unknown",
      startedAt: a.startedAt,
      elapsedMinutes: Math.floor((now.getTime() - new Date(a.startedAt).getTime()) / 60000),
    }));
  }),

  listAttempts: adminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          status: z.enum(["in_progress", "completed", "abandoned"]).optional(),
          from: z.string().optional(),
          to: z.string().optional(),
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
            ilike(schema.testPackage.title, `%${input.search}%`),
          ) as unknown as ReturnType<typeof eq>,
        );
      }
      if (input?.status) {
        conditions.push(eq(schema.testAttempt.status, input.status));
      }
      if (input?.from) {
        conditions.push(gte(schema.testAttempt.startedAt, new Date(input.from)));
      }
      if (input?.to) {
        conditions.push(lte(schema.testAttempt.startedAt, new Date(input.to)));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [total] = await db
        .select({ count: count() })
        .from(schema.testAttempt)
        .leftJoin(schema.user, eq(schema.testAttempt.userId, schema.user.id))
        .leftJoin(schema.testPackage, eq(schema.testAttempt.packageId, schema.testPackage.id))
        .where(where);

      const attempts = await db
        .select({
          id: schema.testAttempt.id,
          userId: schema.testAttempt.userId,
          userName: schema.user.name,
          userEmail: schema.user.email,
          packageId: schema.testAttempt.packageId,
          packageTitle: schema.testPackage.title,
          status: schema.testAttempt.status,
          startedAt: schema.testAttempt.startedAt,
          finishedAt: schema.testAttempt.finishedAt,
          totalScore: schema.testAttempt.totalScore,
          maxScore: schema.testAttempt.maxScore,
          isOvertime: schema.testAttempt.isOvertime,
        })
        .from(schema.testAttempt)
        .leftJoin(schema.user, eq(schema.testAttempt.userId, schema.user.id))
        .leftJoin(schema.testPackage, eq(schema.testAttempt.packageId, schema.testPackage.id))
        .where(where)
        .orderBy(desc(schema.testAttempt.startedAt))
        .limit(limit)
        .offset(offset);

      return { attempts, total: Number(total?.count ?? 0) };
    }),

  dashboardTrends: adminProcedure.query(async () => {
    const now = new Date();

    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const monthlyAttempts = await db
      .select({
        month: sql<string>`to_char(${schema.testAttempt.startedAt}, 'YYYY-MM')`,
        count: count(),
        avgScore: sql<number>`ROUND(AVG(CASE WHEN ${schema.testAttempt.maxScore} > 0 THEN (${schema.testAttempt.totalScore}::float / ${schema.testAttempt.maxScore} * 100) ELSE NULL END))`,
      })
      .from(schema.testAttempt)
      .where(
        and(
          eq(schema.testAttempt.status, "completed"),
          gte(schema.testAttempt.startedAt, twelveMonthsAgo),
        ),
      )
      .groupBy(sql`to_char(${schema.testAttempt.startedAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${schema.testAttempt.startedAt}, 'YYYY-MM')`);

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dailyGenerations = await db
      .select({
        day: sql<string>`to_char(${schema.generationJob.createdAt}, 'YYYY-MM-DD')`,
        count: count(),
        totalTokens: sql<number>`COALESCE(SUM(${schema.generationJob.tokensUsed}), 0)`,
      })
      .from(schema.generationJob)
      .where(gte(schema.generationJob.createdAt, thirtyDaysAgo))
      .groupBy(sql`to_char(${schema.generationJob.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${schema.generationJob.createdAt}, 'YYYY-MM-DD')`);

    const dailySignups = await db
      .select({
        day: sql<string>`to_char(${schema.user.createdAt}, 'YYYY-MM-DD')`,
        count: count(),
      })
      .from(schema.user)
      .where(gte(schema.user.createdAt, thirtyDaysAgo))
      .groupBy(sql`to_char(${schema.user.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${schema.user.createdAt}, 'YYYY-MM-DD')`);

    const activeCounts = {
      today: await db
        .select({ count: count() })
        .from(schema.testAttempt)
        .where(
          gte(schema.testAttempt.startedAt, new Date(now.getFullYear(), now.getMonth(), now.getDate())),
        )
        .then((r) => Number(r[0]?.count ?? 0)),

      week: await db
        .select({ count: count() })
        .from(schema.testAttempt)
        .where(
          gte(schema.testAttempt.startedAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
        )
        .then((r) => Number(r[0]?.count ?? 0)),

      month: await db
        .select({ count: count() })
        .from(schema.testAttempt)
        .where(
          gte(schema.testAttempt.startedAt, new Date(now.getFullYear(), now.getMonth(), 1)),
        )
        .then((r) => Number(r[0]?.count ?? 0)),
    };

    const completionStats = await db
      .select({
        completed: count(),
      })
      .from(schema.testAttempt)
      .where(eq(schema.testAttempt.status, "completed"))
      .then((r) => Number(r[0]?.completed ?? 0));

    const [abandonedStats] = await db
      .select({ abandoned: count() })
      .from(schema.testAttempt)
      .where(eq(schema.testAttempt.status, "abandoned"));

    const completedCount = Number(completionStats);
    const abandonedCount = Number(abandonedStats?.abandoned ?? 0);
    const completionRate =
      completedCount + abandonedCount > 0
        ? Math.round((completedCount / (completedCount + abandonedCount)) * 100)
        : 0;

    function fillMonthlyLabels(
      data: { month: string; count: number; avgScore: number }[],
    ) {
      const map = new Map(data.map((d) => [d.month, { count: d.count, avgScore: d.avgScore }]));
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!map.has(key)) map.set(key, { count: 0, avgScore: 0 });
      }
      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, vals]) => ({
          month,
          label: new Date(month + "-01").toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
          count: vals.count,
          avgScore: vals.avgScore,
        }));
    }

    function fillDailyLabels(data: { day: string; count: number }[], extraKey?: string, extraVal?: number) {
      const map = new Map(data.map((d) => [d.day, d]));
      const result: { day: string; label: string; count: number; [key: string]: unknown }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const existing = map.get(key);
        const entry: { day: string; label: string; count: number; [key: string]: unknown } = {
          day: key,
          label: `${d.getDate()}/${d.getMonth() + 1}`,
          count: existing?.count ?? 0,
        };
        if (extraKey && extraVal !== undefined) {
          entry[extraKey] = existing ? extraVal ?? 0 : 0;
        }
        result.push(entry);
      }
      return result;
    }

    return {
      monthlyAttempts: fillMonthlyLabels(
        monthlyAttempts.map((r) => ({ month: r.month, count: Number(r.count), avgScore: Number(r.avgScore) })),
      ),
      dailyGenerations: fillDailyLabels(
        dailyGenerations.map((r) => ({ day: r.day, count: Number(r.count) })),
      ).map((d) => {
        const genRow = dailyGenerations.find((g) => g.day === d.day);
        return { ...d, totalTokens: genRow?.totalTokens ?? 0 };
      }),
      dailySignups: fillDailyLabels(
        dailySignups.map((r) => ({ day: r.day, count: Number(r.count) })),
      ),
      activeCounts,
      completionRate,
    };
  }),

  mostActiveUsers: adminProcedure
    .input(
      z
        .object({
          days: z.number().min(1).max(365).default(30),
          limit: z.number().min(1).max(50).default(10),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const days = input?.days ?? 30;
      const limit = input?.limit ?? 10;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const rows = await db
        .select({
          userId: schema.testAttempt.userId,
          userName: schema.user.name,
          userEmail: schema.user.email,
          attemptCount: count(),
          avgScore: sql<number>`ROUND(AVG(CASE WHEN ${schema.testAttempt.maxScore} > 0 THEN (${schema.testAttempt.totalScore}::float / ${schema.testAttempt.maxScore} * 100) ELSE NULL END))`,
          lastActive: sql<Date>`MAX(${schema.testAttempt.startedAt})`,
        })
        .from(schema.testAttempt)
        .innerJoin(schema.user, eq(schema.testAttempt.userId, schema.user.id))
        .where(
          and(
            eq(schema.testAttempt.status, "completed"),
            gte(schema.testAttempt.startedAt, since),
          ),
        )
        .groupBy(schema.testAttempt.userId, schema.user.name, schema.user.email)
        .orderBy(desc(count()))
        .limit(limit);

      return rows.map((r) => ({
        userId: r.userId,
        userName: r.userName,
        userEmail: r.userEmail,
        attemptCount: Number(r.attemptCount),
        avgScore: Number(r.avgScore),
        lastActive: r.lastActive,
      }));
    }),

  topPackages: adminProcedure
    .input(
      z
        .object({
          days: z.number().min(1).max(365).default(30),
          limit: z.number().min(1).max(50).default(10),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const days = input?.days ?? 30;
      const limit = input?.limit ?? 10;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const rows = await db
        .select({
          packageId: schema.testAttempt.packageId,
          packageTitle: schema.testPackage.title,
          examTypeId: schema.testPackage.examTypeId,
          attemptCount: count(),
          avgScore: sql<number>`ROUND(AVG(CASE WHEN ${schema.testAttempt.maxScore} > 0 THEN (${schema.testAttempt.totalScore}::float / ${schema.testAttempt.maxScore} * 100) ELSE NULL END))`,
        })
        .from(schema.testAttempt)
        .innerJoin(schema.testPackage, eq(schema.testAttempt.packageId, schema.testPackage.id))
        .where(
          and(
            eq(schema.testAttempt.status, "completed"),
            gte(schema.testAttempt.startedAt, since),
            sql`${schema.testAttempt.packageId} IS NOT NULL`,
          ),
        )
        .groupBy(schema.testAttempt.packageId, schema.testPackage.title, schema.testPackage.examTypeId)
        .orderBy(desc(count()))
        .limit(limit);

      return rows.map((r) => ({
        packageId: r.packageId,
        packageTitle: r.packageTitle,
        examTypeId: r.examTypeId,
        attemptCount: Number(r.attemptCount),
        avgScore: Number(r.avgScore),
      }));
    }),

  abandonStaleAttempts: adminProcedure
    .input(
      z
        .object({
          hours: z.number().min(1).max(8760).default(24),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const hours = input?.hours ?? 24;
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

      const staleAttempts = await db
        .select({ id: schema.testAttempt.id, userId: schema.testAttempt.userId })
        .from(schema.testAttempt)
        .where(
          and(
            eq(schema.testAttempt.status, "in_progress"),
            lte(schema.testAttempt.startedAt, cutoff),
          ),
        );

      if (staleAttempts.length === 0) {
        return { abandoned: 0 };
      }

      const ids = staleAttempts.map((a) => a.id);

      await db
        .update(schema.testAttempt)
        .set({ status: "abandoned" })
        .where(inArray(schema.testAttempt.id, ids));

      for (const a of staleAttempts) {
        await audit(ctx.session.user.id, "abandon_stale_attempt", a.userId, { attemptId: a.id });
      }

      return { abandoned: staleAttempts.length };
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

  // ── Platform AI Configuration ─────────────────────────────────

  getPlatformAiConfig: adminProcedure.query(async () => {
    const config = await getPlatformAiConfig();
    return {
      provider: config.provider,
      baseUrl: config.baseUrl,
      model: config.model,
      apiKeyConfigured: !!config.apiKey,
      apiKeyPreview: config.apiKey ? maskApiKey(config.apiKey) : null,
    };
  }),

  setPlatformAiConfig: adminProcedure
    .input(
      z.object({
        provider: z.string().min(1).optional(),
        baseUrl: z.string().optional(),
        model: z.string().optional(),
        apiKey: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const changedFields: string[] = [];

      if (input.provider !== undefined) {
        await setConfig("platform_ai_provider", input.provider);
        changedFields.push("provider");
      }
      if (input.baseUrl !== undefined) {
        await setConfig("platform_ai_base_url", input.baseUrl);
        changedFields.push("base_url");
      }
      if (input.model !== undefined) {
        await setConfig("platform_ai_model", input.model);
        changedFields.push("model");
      }
      if (input.apiKey !== undefined && input.apiKey.length > 0) {
        const encrypted = encryptApiKey(input.apiKey);
        await setConfig("platform_ai_api_key", encrypted);
        changedFields.push("api_key");
      }

      if (changedFields.length === 0) {
        throwBadRequest("No changes provided");
      }

      await audit(ctx.session.user.id, "platform_ai_config_updated", null, {
        changed_fields: changedFields,
        ...(changedFields.includes("model") && input.model ? { model: input.model } : {}),
        ...(changedFields.includes("provider") && input.provider ? { provider: input.provider } : {}),
        ...(changedFields.includes("api_key") ? { api_key_updated: true } : {}),
      });

      return { ok: true, changedFields };
    }),

  // ── Announcement Management ─────────────────────────────────

  getAnnouncement: adminProcedure.query(async () => {
    const raw = await getConfigRaw("active_announcement");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as {
        message: string;
        severity: "info" | "warning" | "error";
        active: boolean;
        createdAt: string;
        expiresAt: string | null;
      };
    } catch {
      return null;
    }
  }),

  setAnnouncement: adminProcedure
    .input(
      z.object({
        message: z.string().min(1).max(2000),
        severity: z.enum(["info", "warning", "error"]),
        expiresAt: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const value = JSON.stringify({
        message: input.message,
        severity: input.severity,
        active: true,
        createdAt: new Date().toISOString(),
        expiresAt: input.expiresAt,
      });
      await setConfig("active_announcement", value);
      await audit(ctx.session.user.id, "set_announcement", null, {
        severity: input.severity,
        hasExpiry: !!input.expiresAt,
      });
      return { ok: true };
    }),

  deleteAnnouncement: adminProcedure.mutation(async ({ ctx }) => {
    await db.delete(schema.platformConfig).where(eq(schema.platformConfig.key, "active_announcement"));
    await audit(ctx.session.user.id, "delete_announcement", null);
    return { ok: true };
  }),
});
