import { z } from "zod";
import { eq, and, desc, sql, inArray, ilike } from "drizzle-orm";
import { router, protectedProcedure } from "../index";
import { db } from "@labas/db";
import {
  testAttempt,
  sectionResult,
  answer,
  testPackage,
  packageSection,
  sectionQuestion,
  question,
  examType,
} from "@labas/db";
import { paginationSchema, paginateDefaults } from "../lib/pagination";
import { assertOwnership } from "../lib/ownership";
import { throwNotFound, throwForbidden, throwBadRequest } from "../lib/errors";

function normalizeAnswer(format: string, userAnswer: string, correctAnswer: string, isCaseSensitive = false): boolean {
  const ua = userAnswer.trim();
  const ca = correctAnswer.trim();

  if (isCaseSensitive) {
    return ua === ca;
  }

  switch (format) {
    case "true_false_not_given":
    case "author_view":
      return ua.toUpperCase() === ca.toUpperCase();
    case "fill_blank":
      return ua.toLowerCase() === ca.toLowerCase();
    case "multiple_choice":
    case "synonym":
    case "grammar_in_context":
    case "sentence_completion":
    case "summary_completion":
    case "cloze":
    case "reference":
    case "kanji_reading":
    case "particle_choice":
    case "article_case":
    case "character_reading":
    case "sentence_arrangement":
    case "matching_headings":
    case "matching_information":
    case "matching_pairs":
    case "error_recognition":
    case "text_insertion":
      return ua.toUpperCase() === ca.toUpperCase();
    default:
      return ua === ca;
  }
}

// ── Partial Credit Engine ──
// For ordering/matching formats, compute a score 0-100 based on per-element correctness.
function calculatePartialCredit(format: string, userAnswer: string, correctAnswer: string): number | null {
  if (format !== "sentence_arrangement" && format !== "matching_pairs" && format !== "cloze") {
    return null; // not a partial-credit format
  }

  try {
    const ua = userAnswer.trim();
    const ca = correctAnswer.trim();
    if (!ua || !ca) return null;

    if (format === "sentence_arrangement") {
      // Both are comma-separated option keys: e.g. "D,A,C,B"
      const userParts = ua.split(",").map((s) => s.trim());
      const correctParts = ca.split(",").map((s) => s.trim());
      if (userParts.length !== correctParts.length) return 0;
      const correctCount = userParts.filter((p, i) => p === correctParts[i]).length;
      return Math.round((correctCount / correctParts.length) * 100);
    }

    if (format === "matching_pairs") {
      // Serialized mapping: e.g. "A:1,B:2,C:3" or "A-hat,B-shoes,C-scarf"
      const parseMapping = (s: string): Map<string, string> => {
        const map = new Map();
        s.split(",").forEach((pair) => {
          const [k, v] = pair.split(":").map((x) => x.trim());
          if (k && v) map.set(k, v);
        });
        return map;
      };
      const userMap = parseMapping(ua);
      const correctMap = parseMapping(ca);
      let correctCount = 0;
      for (const [key, value] of correctMap) {
        if (userMap.get(key) === value) correctCount++;
      }
      return correctMap.size > 0 ? Math.round((correctCount / correctMap.size) * 100) : null;
    }

    if (format === "cloze") {
      // Serialized answers per blank: e.g. "A,C,B"
      return calculatePartialCredit("sentence_arrangement", ua, ca);
    }
  } catch {
    return null;
  }
  return null;
}

// ── Word Count Validator ──
function validateWordCount(answer: string, minWords = 1, maxWords = 500): { isValid: boolean; wordCount: number } {
  const trimmed = answer.trim();
  if (!trimmed) return { isValid: false, wordCount: 0 };
  const words = trimmed.split(/\s+/).filter(Boolean);
  return { isValid: words.length >= minWords && words.length <= maxWords, wordCount: words.length };
}

// ── Simple in-memory rate limiter ──
const rateLimitMap = new Map<string, number>();
let rateLimitCleanup: ReturnType<typeof setInterval> | null = null;

function startRateLimitCleanup() {
  if (rateLimitCleanup) return;
  rateLimitCleanup = setInterval(() => {
    const cutoff = Date.now() - 60_000;
    for (const [key, time] of rateLimitMap) {
      if (time < cutoff) rateLimitMap.delete(key);
    }
  }, 60_000);
}

function checkRateLimit(key: string, windowMs: number) {
  startRateLimitCleanup();
  const now = Date.now();
  const last = rateLimitMap.get(key) ?? 0;
  if (now - last < windowMs) {
    throwBadRequest("Terlalu banyak permintaan. Coba lagi nanti.");
  }
  rateLimitMap.set(key, now);
}

export const attemptRouter = router({
  start: protectedProcedure
    .input(z.object({ packageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      checkRateLimit(`start:${userId}`, 3000);

      // Check for existing in-progress attempt
      const [activeAttempt] = await db
        .select({ id: testAttempt.id })
        .from(testAttempt)
        .where(
          and(
            eq(testAttempt.userId, userId),
            eq(testAttempt.packageId, input.packageId),
            eq(testAttempt.status, "in_progress"),
          ),
        )
        .limit(1);
      if (activeAttempt) {
        throwBadRequest("Kamu masih punya latihan yang sedang berjalan untuk paket ini");
      }

      // Check cooldown (10 detik setelah selesai)
      const [recentAttempt] = await db
        .select({ finishedAt: testAttempt.finishedAt })
        .from(testAttempt)
        .where(
          and(
            eq(testAttempt.userId, userId),
            eq(testAttempt.packageId, input.packageId),
            eq(testAttempt.status, "completed"),
          ),
        )
        .orderBy(desc(testAttempt.finishedAt))
        .limit(1);
      if (recentAttempt?.finishedAt) {
        const elapsed = Date.now() - new Date(recentAttempt.finishedAt).getTime();
        if (elapsed < 10_000) {
          throwBadRequest("Tunggu 10 detik sebelum memulai latihan ulang");
        }
      }

      const [pkg] = await db
        .select()
        .from(testPackage)
        .where(eq(testPackage.id, input.packageId))
        .limit(1);

      if (!pkg?.isPublic) {
        assertOwnership(pkg, userId, "Package");
      }

      const sections = await db
        .select({
          id: packageSection.id,
          sectionTypeId: packageSection.sectionTypeId,
        })
        .from(packageSection)
        .where(eq(packageSection.packageId, input.packageId))
        .orderBy(packageSection.orderIndex);

      const [attempt] = await db
        .insert(testAttempt)
        .values({
          userId,
          packageId: input.packageId,
          status: "in_progress",
        })
        .returning();

      if (!attempt) throwBadRequest("Failed to create attempt");

      for (const section of sections) {
        await db.insert(sectionResult).values({
          attemptId: attempt.id,
          sectionTypeId: section.sectionTypeId,
        });
      }

      await db
        .update(testPackage)
        .set({ usageCount: sql`${testPackage.usageCount} + 1` })
        .where(eq(testPackage.id, input.packageId));

      return { attemptId: attempt.id };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [attempt] = await db
        .select()
        .from(testAttempt)
        .where(eq(testAttempt.id, input.id))
        .limit(1);

      if (!attempt) return null;
      if (attempt.userId !== userId) throwForbidden();

      const isInProgress = attempt.status === "in_progress";

      const dbSections = await db
        .select()
        .from(sectionResult)
        .where(eq(sectionResult.attemptId, input.id))
        .orderBy(sectionResult.createdAt);

      const sectionResultIds = dbSections.map((s) => s.id);

      let answers: any[] = [];
      if (sectionResultIds.length > 0) {
        answers = await db
          .select({
            id: answer.id,
            sectionResultId: answer.sectionResultId,
            questionId: answer.questionId,
            userAnswer: answer.userAnswer,
            isCorrect: answer.isCorrect,
            partialScore: answer.partialScore,
            timeSpentSec: answer.timeSpentSec,
            createdAt: answer.createdAt,
            question: {
              id: question.id,
              format: question.format,
              passageText: question.passageText,
              questionText: question.questionText,
              options: question.options,
              correctAnswer: question.correctAnswer,
              explanation: question.explanation,
              difficulty: question.difficulty,
              skillTags: question.skillTags,
            },
          })
          .from(answer)
          .innerJoin(question, eq(answer.questionId, question.id))
          .where(inArray(answer.sectionResultId, sectionResultIds));
      }

      const pkgSections = await db
        .select({
          id: packageSection.id,
          sectionTypeId: packageSection.sectionTypeId,
          title: packageSection.title,
          orderIndex: packageSection.orderIndex,
        })
        .from(packageSection)
        .where(eq(packageSection.packageId, attempt.packageId!))
        .orderBy(packageSection.orderIndex);

      const psIds = pkgSections.map((s) => s.id);
      let sectionQuestions: any[] = [];
      if (psIds.length > 0) {
        const sqs = await db
          .select({
            sectionId: sectionQuestion.sectionId,
            questionId: sectionQuestion.questionId,
            orderIndex: sectionQuestion.orderIndex,
          })
          .from(sectionQuestion)
          .where(inArray(sectionQuestion.sectionId, psIds));

        if (sqs.length > 0) {
          const qIds = sqs.map((sq) => sq.questionId);
          const qs = await db
            .select()
            .from(question)
            .where(inArray(question.id, qIds));

          const qMap = new Map(qs.map((q) => [q.id, q]));
          sectionQuestions = sqs.map((sq) => ({
            ...sq,
            question: qMap.get(sq.questionId),
          }));
        }
      }

      // Strip sensitive fields during active attempt (anti-cheat)
      if (isInProgress) {
        const sanitizeQuestion = (q: any) => {
          if (!q) return q;
          const { correctAnswer, explanation, ...rest } = q;
          return rest;
        };

        const sanitizeAnswer = (a: any) => {
          if (!a) return a;
          const { isCorrect, partialScore, ...rest } = a;
          return rest;
        };

        answers = answers.map((a) => ({
          ...sanitizeAnswer(a),
          question: sanitizeQuestion(a.question),
        }));

        sectionQuestions = sectionQuestions.map((sq) => ({
          ...sq,
          question: sanitizeQuestion(sq.question),
        }));
      }

      // Zip packageSections with dbSections by creation order (both ordered)
      const sectionsWithData = pkgSections.map((pkgSec, idx) => {
        const secResult = dbSections[idx];
        const secAnswers = answers.filter((a) => a.sectionResultId === secResult?.id);
        const secQuestions = sectionQuestions
          .filter((sq) => sq.sectionId === pkgSec.id)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((sq) => sq.question);

        return {
          ...pkgSec,
          sectionResultId: secResult?.id,
          score: secResult?.score,
          maxScore: secResult?.maxScore,
          timeSpentSec: secResult?.timeSpentSec,
          answers: secAnswers,
          questions: secQuestions,
        };
      });

      return {
        ...attempt,
        sections: sectionsWithData,
      };
    }),

  submitAnswer: protectedProcedure
    .input(
      z.object({
        attemptId: z.string().uuid(),
        sectionResultId: z.string().uuid(),
        questionId: z.string().uuid(),
        userAnswer: z.string(),
        timeSpentSec: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      checkRateLimit(`submit:${userId}`, 500);

      const [attempt] = await db
        .select()
        .from(testAttempt)
        .where(eq(testAttempt.id, input.attemptId))
        .limit(1);

      if (!attempt) throwNotFound("Attempt");
      if (attempt.userId !== userId) throwForbidden();
      if (attempt.status !== "in_progress") throwBadRequest("Attempt already finished");

      const [q] = await db
        .select()
        .from(question)
        .where(eq(question.id, input.questionId))
        .limit(1);

      if (!q) throwNotFound("Question");

      const [existing] = await db
        .select()
        .from(answer)
        .where(
          and(
            eq(answer.sectionResultId, input.sectionResultId),
            eq(answer.questionId, input.questionId),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(answer)
          .set({
            userAnswer: input.userAnswer,
            // isCorrect & partialScore NOT stored here — recomputed in finish() to prevent cheating
            timeSpentSec: input.timeSpentSec,
          })
          .where(eq(answer.id, existing.id));
      } else {
        await db.insert(answer).values({
          sectionResultId: input.sectionResultId,
          questionId: input.questionId,
          userAnswer: input.userAnswer,
          // isCorrect & partialScore NOT stored here — recomputed in finish()
          timeSpentSec: input.timeSpentSec,
        });
      }

      return { success: true };
    }),

  finish: protectedProcedure
    .input(z.object({ attemptId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      checkRateLimit(`finish:${userId}`, 3000);

      const [attempt] = await db
        .select()
        .from(testAttempt)
        .where(eq(testAttempt.id, input.attemptId))
        .limit(1);

      if (!attempt) throwNotFound("Attempt");
      if (attempt.userId !== userId) throwForbidden();
      if (attempt.status !== "in_progress") throwBadRequest("Attempt already finished");

      // Timer validation: must have spent at least 5 seconds
      if (attempt.startedAt) {
        const elapsedSec = Math.round((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
        if (elapsedSec < 5) {
          throwBadRequest("Latihan terlalu cepat. Harap kerjakan soal dengan benar.");
        }
      }

      const dbSections = await db
        .select()
        .from(sectionResult)
        .where(eq(sectionResult.attemptId, input.attemptId))
        .orderBy(sectionResult.createdAt);

      const pkgSections = await db
        .select({ id: packageSection.id })
        .from(packageSection)
        .where(eq(packageSection.packageId, attempt.packageId!))
        .orderBy(packageSection.orderIndex);

      // Count questions per packageSection
      const psIds = pkgSections.map((s) => s.id);
      let questionCounts = new Map<string, number>();
      if (psIds.length > 0) {
        const counts = await db
          .select({
            sectionId: sectionQuestion.sectionId,
            count: sql<number>`count(*)`,
          })
          .from(sectionQuestion)
          .where(inArray(sectionQuestion.sectionId, psIds))
          .groupBy(sectionQuestion.sectionId);

        for (const c of counts) {
          questionCounts.set(c.sectionId, c.count);
        }
      }

      let totalScore = 0;
      const allQuestionIds = new Set<string>();

      for (let i = 0; i < dbSections.length; i++) {
        const secResult = dbSections[i];
        const pkgSec = pkgSections[i];
        if (!secResult || !pkgSec) continue;

        const secAnswers = await db
          .select({
            answerId: answer.id,
            questionId: answer.questionId,
            userAnswer: answer.userAnswer,
            partialScore: answer.partialScore,
            timeSpentSec: answer.timeSpentSec,
            questionFormat: question.format,
            questionCorrectAnswer: question.correctAnswer,
            questionIsCaseSensitive: question.isCaseSensitive,
          })
          .from(answer)
          .innerJoin(question, eq(answer.questionId, question.id))
          .where(eq(answer.sectionResultId, secResult.id));

        for (const a of secAnswers) {
          allQuestionIds.add(a.questionId);
        }

        // Recompute scores from raw answers (anti-cheat: ignore stored isCorrect/partialScore)
        let sectionScore = 0;
        for (const a of secAnswers) {
          if (!a.userAnswer) continue;
          const isCaseSensitive = a.questionIsCaseSensitive ?? false;
          const isCorrect = normalizeAnswer(a.questionFormat, a.userAnswer, a.questionCorrectAnswer, isCaseSensitive);
          const partialScore = calculatePartialCredit(a.questionFormat, a.userAnswer, a.questionCorrectAnswer);
          const effectiveScore = isCorrect ? 1 : (partialScore != null ? partialScore / 100 : 0);
          sectionScore += effectiveScore;

          // Persist computed values for review page display
          await db
            .update(answer)
            .set({ isCorrect, partialScore })
            .where(eq(answer.id, a.answerId));
        }

        const sectionMax = questionCounts.get(pkgSec.id) ?? secAnswers.length;
        const sectionTimeSpent = secAnswers.reduce((sum, a) => sum + (a.timeSpentSec ?? 0), 0);

        await db
          .update(sectionResult)
          .set({
            score: Math.round(sectionScore),
            maxScore: sectionMax,
            timeSpentSec: sectionTimeSpent,
          })
          .where(eq(sectionResult.id, secResult.id));

        totalScore += sectionScore;
      }

      // Increment usageCount for all questions in this attempt
      if (allQuestionIds.size > 0) {
        await db
          .update(question)
          .set({ usageCount: sql`${question.usageCount} + 1` })
          .where(inArray(question.id, Array.from(allQuestionIds)));
      }

      // Total questions in package
      let totalQuestions = 0;
      for (const count of questionCounts.values()) {
        totalQuestions += count;
      }

      await db
        .update(testAttempt)
        .set({
          status: "completed",
          finishedAt: new Date(),
          totalScore,
          maxScore: totalQuestions,
        })
        .where(eq(testAttempt.id, input.attemptId));

      return {
        totalScore,
        maxScore: totalQuestions,
        percentage: totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0,
      };
    }),

  getActiveAttempt: protectedProcedure
    .input(z.object({ packageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [attempt] = await db
        .select({
          id: testAttempt.id,
          status: testAttempt.status,
          startedAt: testAttempt.startedAt,
        })
        .from(testAttempt)
        .where(
          and(
            eq(testAttempt.userId, userId),
            eq(testAttempt.packageId, input.packageId),
            eq(testAttempt.status, "in_progress"),
          ),
        )
        .orderBy(desc(testAttempt.createdAt))
        .limit(1);

      return attempt ?? null;
    }),

  abandon: protectedProcedure
    .input(z.object({ attemptId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [attempt] = await db
        .select()
        .from(testAttempt)
        .where(eq(testAttempt.id, input.attemptId))
        .limit(1);

      if (!attempt) throwNotFound("Attempt");
      if (attempt.userId !== userId) throwForbidden();
      if (attempt.status !== "in_progress") throwBadRequest("Attempt not in progress");

      await db
        .update(testAttempt)
        .set({ status: "abandoned" })
        .where(eq(testAttempt.id, input.attemptId));

      return { success: true };
    }),

  myAttempts: protectedProcedure
    .input(
      z
        .object({
          packageId: z.string().uuid().optional(),
          examTypeId: z.string().optional(),
          search: z.string().optional(),
          ...paginationSchema.shape,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { limit, offset } = paginateDefaults(input);
      const conditions = [eq(testAttempt.userId, userId)];

      if (input?.packageId) {
        conditions.push(eq(testAttempt.packageId, input.packageId));
      }
      if (input?.examTypeId) {
        conditions.push(eq(testPackage.examTypeId, input.examTypeId));
      }
      if (input?.search) {
        conditions.push(ilike(testPackage.title, `%${input.search}%`));
      }

      const where = and(...conditions);

      const rows = await db
        .select({
          id: testAttempt.id,
          packageId: testAttempt.packageId,
          comboId: testAttempt.comboId,
          startedAt: testAttempt.startedAt,
          finishedAt: testAttempt.finishedAt,
          totalScore: testAttempt.totalScore,
          maxScore: testAttempt.maxScore,
          status: testAttempt.status,
          createdAt: testAttempt.createdAt,
          packageTitle: testPackage.title,
          packageExamTypeId: testPackage.examTypeId,
          examTypeName: examType.name,
        })
        .from(testAttempt)
        .leftJoin(testPackage, eq(testAttempt.packageId, testPackage.id))
        .leftJoin(examType, eq(testPackage.examTypeId, examType.id))
        .where(where)
        .orderBy(desc(testAttempt.createdAt))
        .limit(limit)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(testAttempt)
        .leftJoin(testPackage, eq(testAttempt.packageId, testPackage.id))
        .where(where);
      const totalCount = Number(countResult?.count ?? 0);

      return { attempts: rows, total: totalCount };
    }),
});
