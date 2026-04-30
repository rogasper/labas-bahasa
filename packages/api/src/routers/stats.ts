import { z } from "zod";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { router, protectedProcedure } from "../index";
import { db } from "@labas/db";
import {
  testAttempt,
  sectionResult,
  answer,
  testPackage,
  question,
  examType,
  sectionType,
} from "@labas/db";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export const statsRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [attemptAgg] = await db
      .select({
        totalAttempts: sql<number>`count(*)`,
        completedAttempts: sql<number>`sum(case when ${testAttempt.status} = 'completed' then 1 else 0 end)`,
        abandonedAttempts: sql<number>`sum(case when ${testAttempt.status} = 'abandoned' then 1 else 0 end)`,
        avgScorePct:
          sql<number>`round(avg(case when ${testAttempt.status} = 'completed' and ${testAttempt.maxScore} > 0 then (${testAttempt.totalScore}::float / ${testAttempt.maxScore}) * 100 end)::numeric, 1)`,
      })
      .from(testAttempt)
      .where(eq(testAttempt.userId, userId));

    const [timeAgg] = await db
      .select({
        totalTimeSpentSec: sql<number>`coalesce(sum(${sectionResult.timeSpentSec}), 0)`,
      })
      .from(sectionResult)
      .innerJoin(testAttempt, eq(sectionResult.attemptId, testAttempt.id))
      .where(eq(testAttempt.userId, userId));

    const [answerAgg] = await db
      .select({
        totalQuestionsAnswered: sql<number>`count(*)`,
        totalCorrectAnswers: sql<number>`sum(case when ${answer.isCorrect} = true then 1 else 0 end)`,
      })
      .from(answer)
      .innerJoin(sectionResult, eq(answer.sectionResultId, sectionResult.id))
      .innerJoin(testAttempt, eq(sectionResult.attemptId, testAttempt.id))
      .where(eq(testAttempt.userId, userId));

    const totalAttempts = Number(attemptAgg?.totalAttempts ?? 0);
    const completedAttempts = Number(attemptAgg?.completedAttempts ?? 0);
    const totalQuestionsAnswered = Number(answerAgg?.totalQuestionsAnswered ?? 0);
    const totalCorrectAnswers = Number(answerAgg?.totalCorrectAnswers ?? 0);

    return {
      totalAttempts,
      completedAttempts,
      abandonedAttempts: Number(attemptAgg?.abandonedAttempts ?? 0),
      avgScorePct: Number(attemptAgg?.avgScorePct ?? 0),
      totalTimeSpentSec: Number(timeAgg?.totalTimeSpentSec ?? 0),
      totalQuestionsAnswered,
      totalCorrectAnswers,
      overallAccuracyPct:
        totalQuestionsAnswered > 0
          ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100)
          : 0,
    };
  }),

  byExamType: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const rows = await db
      .select({
        examTypeId: testPackage.examTypeId,
        examTypeName: examType.name,
        attempts: sql<number>`count(distinct ${testAttempt.id})`,
        avgScorePct:
          sql<number>`round(avg(case when ${testAttempt.status} = 'completed' and ${testAttempt.maxScore} > 0 then (${testAttempt.totalScore}::float / ${testAttempt.maxScore}) * 100 end)::numeric, 1)`,
        avgTimeSpentSec: sql<number>`round(avg(${sectionResult.timeSpentSec})::numeric, 0)`,
        totalQuestions: sql<number>`count(${answer.id})`,
        correctQuestions: sql<number>`sum(case when ${answer.isCorrect} = true then 1 else 0 end)`,
      })
      .from(testAttempt)
      .innerJoin(testPackage, eq(testAttempt.packageId, testPackage.id))
      .innerJoin(examType, eq(testPackage.examTypeId, examType.id))
      .leftJoin(sectionResult, eq(sectionResult.attemptId, testAttempt.id))
      .leftJoin(answer, eq(answer.sectionResultId, sectionResult.id))
      .where(eq(testAttempt.userId, userId))
      .groupBy(testPackage.examTypeId, examType.name);

    return rows.map((r) => ({
      ...r,
      attempts: Number(r.attempts),
      avgScorePct: Number(r.avgScorePct ?? 0),
      avgTimeSpentSec: Number(r.avgTimeSpentSec ?? 0),
      totalQuestions: Number(r.totalQuestions),
      correctQuestions: Number(r.correctQuestions),
      accuracyPct:
        Number(r.totalQuestions) > 0
          ? Math.round((Number(r.correctQuestions) / Number(r.totalQuestions)) * 100)
          : 0,
    }));
  }),

  bySectionType: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const rows = await db
      .select({
        sectionTypeId: sectionType.id,
        sectionTypeName: sectionType.name,
        attempts: sql<number>`count(distinct ${testAttempt.id})`,
        avgScorePct:
          sql<number>`round(avg(case when ${testAttempt.status} = 'completed' and ${sectionResult.maxScore} > 0 then (${sectionResult.score}::float / ${sectionResult.maxScore}) * 100 end)::numeric, 1)`,
        avgTimeSpentSec: sql<number>`round(avg(${sectionResult.timeSpentSec})::numeric, 0)`,
        totalQuestions: sql<number>`count(${answer.id})`,
        correctQuestions: sql<number>`sum(case when ${answer.isCorrect} = true then 1 else 0 end)`,
      })
      .from(testAttempt)
      .innerJoin(sectionResult, eq(sectionResult.attemptId, testAttempt.id))
      .innerJoin(sectionType, eq(sectionResult.sectionTypeId, sectionType.id))
      .leftJoin(answer, eq(answer.sectionResultId, sectionResult.id))
      .where(eq(testAttempt.userId, userId))
      .groupBy(sectionType.id, sectionType.name);

    return rows.map((r) => ({
      ...r,
      attempts: Number(r.attempts),
      avgScorePct: Number(r.avgScorePct ?? 0),
      avgTimeSpentSec: Number(r.avgTimeSpentSec ?? 0),
      totalQuestions: Number(r.totalQuestions),
      correctQuestions: Number(r.correctQuestions),
      accuracyPct:
        Number(r.totalQuestions) > 0
          ? Math.round((Number(r.correctQuestions) / Number(r.totalQuestions)) * 100)
          : 0,
    }));
  }),

  byFormat: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const rows = await db
      .select({
        format: question.format,
        totalQuestions: sql<number>`count(${answer.id})`,
        correctQuestions: sql<number>`sum(case when ${answer.isCorrect} = true then 1 else 0 end)`,
        avgTimeSpentSec: sql<number>`round(avg(${answer.timeSpentSec})::numeric, 0)`,
      })
      .from(answer)
      .innerJoin(sectionResult, eq(answer.sectionResultId, sectionResult.id))
      .innerJoin(testAttempt, eq(sectionResult.attemptId, testAttempt.id))
      .innerJoin(question, eq(answer.questionId, question.id))
      .where(eq(testAttempt.userId, userId))
      .groupBy(question.format);

    return rows
      .map((r) => ({
        format: r.format,
        totalQuestions: Number(r.totalQuestions),
        correctQuestions: Number(r.correctQuestions),
        avgTimeSpentSec: Number(r.avgTimeSpentSec ?? 0),
        accuracyPct:
          Number(r.totalQuestions) > 0
            ? Math.round((Number(r.correctQuestions) / Number(r.totalQuestions)) * 100)
            : 0,
      }))
      .sort((a, b) => b.totalQuestions - a.totalQuestions);
  }),

  bySkillTag: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const rows = await db
      .select({
        skillTags: question.skillTags,
        isCorrect: answer.isCorrect,
        timeSpentSec: answer.timeSpentSec,
      })
      .from(answer)
      .innerJoin(sectionResult, eq(answer.sectionResultId, sectionResult.id))
      .innerJoin(testAttempt, eq(sectionResult.attemptId, testAttempt.id))
      .innerJoin(question, eq(answer.questionId, question.id))
      .where(eq(testAttempt.userId, userId));

    const tagMap = new Map<
      string,
      { total: number; correct: number; timeSpentSec: number }
    >();

    for (const row of rows) {
      const tags = row.skillTags ?? [];
      for (const tag of tags) {
        const existing = tagMap.get(tag) ?? { total: 0, correct: 0, timeSpentSec: 0 };
        existing.total += 1;
        if (row.isCorrect) existing.correct += 1;
        if (row.timeSpentSec) existing.timeSpentSec += row.timeSpentSec;
        tagMap.set(tag, existing);
      }
    }

    return Array.from(tagMap.entries())
      .map(([tag, data]) => ({
        tag,
        totalQuestions: data.total,
        correctQuestions: data.correct,
        accuracyPct: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        avgTimeSpentSec: data.total > 0 ? Math.round(data.timeSpentSec / data.total) : 0,
      }))
      .sort((a, b) => b.totalQuestions - a.totalQuestions);
  }),

  trend: protectedProcedure
    .input(
      z
        .object({
          days: z.number().min(7).max(90).default(30),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const days = input?.days ?? 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const rows = await db
        .select({
          date: sql<string>`date(${testAttempt.finishedAt})`,
          attempts: sql<number>`count(*)`,
          avgScorePct:
            sql<number>`round(avg(case when ${testAttempt.maxScore} > 0 then (${testAttempt.totalScore}::float / ${testAttempt.maxScore}) * 100 end)::numeric, 1)`,
        })
        .from(testAttempt)
        .where(
          and(
            eq(testAttempt.userId, userId),
            eq(testAttempt.status, "completed"),
            gte(testAttempt.finishedAt, since),
          ),
        )
        .groupBy(sql`date(${testAttempt.finishedAt})`)
        .orderBy(sql`date(${testAttempt.finishedAt})`);

      // Fill in missing dates
      const resultMap = new Map<string, { date: string; attempts: number; avgScorePct: number }>();
      for (const row of rows) {
        resultMap.set(row.date, {
          date: row.date,
          attempts: Number(row.attempts),
          avgScorePct: Number(row.avgScorePct ?? 0),
        });
      }

      const filled: { date: string; attempts: number; avgScorePct: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split("T")[0];
        filled.push(resultMap.get(key) ?? { date: key, attempts: 0, avgScorePct: 0 });
      }

      return filled;
    }),

  weaknesses: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const MIN_QUESTIONS = 5;

    // Format weaknesses
    const formatRows = await db
      .select({
        format: question.format,
        totalQuestions: sql<number>`count(${answer.id})`,
        correctQuestions: sql<number>`sum(case when ${answer.isCorrect} = true then 1 else 0 end)`,
      })
      .from(answer)
      .innerJoin(sectionResult, eq(answer.sectionResultId, sectionResult.id))
      .innerJoin(testAttempt, eq(sectionResult.attemptId, testAttempt.id))
      .innerJoin(question, eq(answer.questionId, question.id))
      .where(eq(testAttempt.userId, userId))
      .groupBy(question.format);

    const formatWeaknesses = formatRows
      .map((r) => ({
        type: "format" as const,
        name: r.format,
        totalQuestions: Number(r.totalQuestions),
        accuracyPct:
          Number(r.totalQuestions) > 0
            ? Math.round((Number(r.correctQuestions) / Number(r.totalQuestions)) * 100)
            : 0,
      }))
      .filter((w) => w.totalQuestions >= MIN_QUESTIONS)
      .sort((a, b) => a.accuracyPct - b.accuracyPct)
      .slice(0, 3);

    // Section type weaknesses
    const sectionRows = await db
      .select({
        sectionTypeId: sectionType.id,
        sectionTypeName: sectionType.name,
        totalQuestions: sql<number>`count(${answer.id})`,
        correctQuestions: sql<number>`sum(case when ${answer.isCorrect} = true then 1 else 0 end)`,
      })
      .from(answer)
      .innerJoin(sectionResult, eq(answer.sectionResultId, sectionResult.id))
      .innerJoin(testAttempt, eq(sectionResult.attemptId, testAttempt.id))
      .innerJoin(sectionType, eq(sectionResult.sectionTypeId, sectionType.id))
      .where(eq(testAttempt.userId, userId))
      .groupBy(sectionType.id, sectionType.name);

    const sectionWeaknesses = sectionRows
      .map((r) => ({
        type: "section" as const,
        name: r.sectionTypeName,
        totalQuestions: Number(r.totalQuestions),
        accuracyPct:
          Number(r.totalQuestions) > 0
            ? Math.round((Number(r.correctQuestions) / Number(r.totalQuestions)) * 100)
            : 0,
      }))
      .filter((w) => w.totalQuestions >= MIN_QUESTIONS)
      .sort((a, b) => a.accuracyPct - b.accuracyPct)
      .slice(0, 3);

    // Skill tag weaknesses
    const tagRows = await db
      .select({
        skillTags: question.skillTags,
        isCorrect: answer.isCorrect,
      })
      .from(answer)
      .innerJoin(sectionResult, eq(answer.sectionResultId, sectionResult.id))
      .innerJoin(testAttempt, eq(sectionResult.attemptId, testAttempt.id))
      .innerJoin(question, eq(answer.questionId, question.id))
      .where(eq(testAttempt.userId, userId));

    const tagMap = new Map<string, { total: number; correct: number }>();
    for (const row of tagRows) {
      const tags = row.skillTags ?? [];
      for (const tag of tags) {
        const existing = tagMap.get(tag) ?? { total: 0, correct: 0 };
        existing.total += 1;
        if (row.isCorrect) existing.correct += 1;
        tagMap.set(tag, existing);
      }
    }

    const tagWeaknesses = Array.from(tagMap.entries())
      .map(([name, data]) => ({
        type: "skill" as const,
        name,
        totalQuestions: data.total,
        accuracyPct: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      }))
      .filter((w) => w.totalQuestions >= MIN_QUESTIONS)
      .sort((a, b) => a.accuracyPct - b.accuracyPct)
      .slice(0, 3);

    // Combine and get top overall weaknesses
    const allWeaknesses = [...formatWeaknesses, ...sectionWeaknesses, ...tagWeaknesses]
      .sort((a, b) => a.accuracyPct - b.accuracyPct)
      .slice(0, 5);

    // Generate recommendations
    const recommendations: string[] = [];
    for (const w of allWeaknesses) {
      if (w.accuracyPct < 40) {
        recommendations.push(
          `Fokus pada ${w.name}: akurasi hanya ${w.accuracyPct}%. Cobalah latihan intensif untuk tipe ini.`,
        );
      } else if (w.accuracyPct < 60) {
        recommendations.push(
          `Perbanyak latihan ${w.name}: akurasi ${w.accuracyPct}%. Analisis jawaban salah Anda untuk memahami pola kesalahan.`,
        );
      } else {
        recommendations.push(
          `Tingkatkan konsistensi ${w.name}: akurasi ${w.accuracyPct}%. Latihan rutin akan membantu mencapai 80%+.`,
        );
      }
    }

    if (allWeaknesses.length === 0) {
      recommendations.push(
        "Belum cukup data untuk mengidentifikasi kelemahan. Selesaikan lebih banyak latihan!",
      );
    }

    return { weaknesses: allWeaknesses, recommendations };
  }),

  timeAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Time by section type
    const sectionTime = await db
      .select({
        sectionTypeName: sectionType.name,
        avgTimeSpentSec: sql<number>`round(avg(${sectionResult.timeSpentSec})::numeric, 0)`,
        totalTimeSpentSec: sql<number>`sum(${sectionResult.timeSpentSec})`,
      })
      .from(testAttempt)
      .innerJoin(sectionResult, eq(sectionResult.attemptId, testAttempt.id))
      .innerJoin(sectionType, eq(sectionResult.sectionTypeId, sectionType.id))
      .where(eq(testAttempt.userId, userId))
      .groupBy(sectionType.name);

    // Time by format
    const formatTime = await db
      .select({
        format: question.format,
        avgTimeSpentSec: sql<number>`round(avg(${answer.timeSpentSec})::numeric, 0)`,
        totalTimeSpentSec: sql<number>`sum(${answer.timeSpentSec})`,
      })
      .from(answer)
      .innerJoin(sectionResult, eq(answer.sectionResultId, sectionResult.id))
      .innerJoin(testAttempt, eq(sectionResult.attemptId, testAttempt.id))
      .innerJoin(question, eq(answer.questionId, question.id))
      .where(eq(testAttempt.userId, userId))
      .groupBy(question.format);

    // Time trend (avg time per completed attempt)
    const timeTrend = await db
      .select({
        date: sql<string>`date(${testAttempt.finishedAt})`,
        avgTimeSpentSec: sql<number>`round(avg(${sectionResult.timeSpentSec})::numeric, 0)`,
      })
      .from(testAttempt)
      .innerJoin(sectionResult, eq(sectionResult.attemptId, testAttempt.id))
      .where(and(eq(testAttempt.userId, userId), eq(testAttempt.status, "completed")))
      .groupBy(sql`date(${testAttempt.finishedAt})`)
      .orderBy(sql`date(${testAttempt.finishedAt})`);

    return {
      sectionTime: sectionTime.map((r) => ({
        sectionTypeName: r.sectionTypeName,
        avgTimeSpentSec: Number(r.avgTimeSpentSec ?? 0),
        totalTimeSpentSec: Number(r.totalTimeSpentSec ?? 0),
      })),
      formatTime: formatTime
        .map((r) => ({
          format: r.format,
          avgTimeSpentSec: Number(r.avgTimeSpentSec ?? 0),
          totalTimeSpentSec: Number(r.totalTimeSpentSec ?? 0),
        }))
        .sort((a, b) => b.totalTimeSpentSec - a.totalTimeSpentSec),
      timeTrend: timeTrend.map((r) => ({
        date: r.date,
        avgTimeSpentSec: Number(r.avgTimeSpentSec ?? 0),
      })),
    };
  }),
});
