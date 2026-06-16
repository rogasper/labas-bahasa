import { z } from "zod";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { router, protectedProcedure, publicProcedure } from "../index";
import { db } from "@labas/db";
import { testAttempt, testPackage, user } from "@labas/db";
import { paginationSchema, paginateDefaults } from "../lib/pagination";

const periodSchema = z.enum(["today", "week", "month", "all"]);

function getPeriodStart(period: z.infer<typeof periodSchema>): Date | null {
  const now = new Date();
  switch (period) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "week": {
      const d = new Date(now);
      const day = d.getDay();
      const diff = day === 0 ? 6 : day - 1;
      d.setDate(d.getDate() - diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month": {
      const d = new Date(now);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "all":
      return null;
  }
}

interface RankedEntry {
  userId: string;
  name: string;
  image: string | null;
  totalScore: number;
  avgScorePct: number;
  attemptsCount: number;
}

async function fetchAllRankings(
  period: string,
  examTypeId?: string,
): Promise<RankedEntry[]> {
  const periodStart = getPeriodStart(period as any);
  const conditions = [eq(testAttempt.status, "completed")];
  if (periodStart) {
    conditions.push(gte(testAttempt.finishedAt, periodStart));
  }

  const q = db
    .select({
      userId: user.id,
      name: user.name,
      image: user.image,
      totalScore: sql`coalesce(sum(${testAttempt.totalScore}), 0)`,
      avgScorePct: sql`round(coalesce(avg(case when ${testAttempt.maxScore} > 0 then (${testAttempt.totalScore}::float / ${testAttempt.maxScore}) * 100 end), 0)::numeric, 1)`,
      attemptsCount: sql`count(*)`,
    })
    .from(testAttempt)
    .innerJoin(user, eq(testAttempt.userId, user.id))
    .innerJoin(testPackage, eq(testAttempt.packageId, testPackage.id));

  if (examTypeId) {
    conditions.push(eq(testPackage.examTypeId, examTypeId));
  }

  const rows: any[] = await q
    .where(and(...conditions))
    .groupBy(user.id, user.name, user.image)
    .orderBy(desc(sql`sum(${testAttempt.totalScore})`));

  return rows.map((r: any) => ({
    userId: r.userId as string,
    name: r.name as string,
    image: r.image as string | null,
    totalScore: Number(r.totalScore),
    avgScorePct: Number(r.avgScorePct),
    attemptsCount: Number(r.attemptsCount),
  }));
}

export const leaderboardRouter = router({
  getRankings: publicProcedure
    .input(
      z.object({
        period: periodSchema.default("week"),
        examTypeId: z.string().optional(),
        nearUserId: z.string().optional(),
        ...paginationSchema.shape,
      }),
    )
    .query(async ({ input }) => {
      const { limit, offset } = paginateDefaults(input);

      // Contextual mode
      if (input.nearUserId) {
        const all = await fetchAllRankings(input.period, input.examTypeId);
        const total = all.length;
        const userIdx = all.findIndex((r) => r.userId === input.nearUserId);
        const userRank = userIdx !== -1 ? userIdx + 1 : null;

        const rankings = all.slice(0, 5);
        let nearRankings: typeof rankings = [];
        if (userRank && userRank > 5) {
          const start = Math.max(5, userRank - 3);
          const end = Math.min(total, userRank + 2);
          nearRankings = all.slice(start, end);
        }

        return { rankings, nearRankings, total, userRank };
      }

      // Standard pagination mode — use server-side pagination for performance
      const all = await fetchAllRankings(input.period, input.examTypeId);
      const total = all.length;
      const rankings = all.slice(offset, offset + limit);

      return { rankings, total };
    }),

  getMyRank: protectedProcedure
    .input(
      z.object({
        period: periodSchema.default("week"),
        examTypeId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const all = await fetchAllRankings(input.period, input.examTypeId);
      const totalParticipants = all.length;
      const myIndex = all.findIndex((r) => r.userId === userId);

      if (myIndex === -1) {
        return {
          rank: null,
          totalParticipants,
          totalScore: 0,
          avgScorePct: 0,
          attemptsCount: 0,
        };
      }

      const myData = all[myIndex]!;
      return {
        rank: myIndex + 1,
        totalParticipants,
        totalScore: myData.totalScore,
        avgScorePct: myData.avgScorePct,
        attemptsCount: myData.attemptsCount,
      };
    }),
});
