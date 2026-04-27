import { z } from "zod";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
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
} from "@labas/db";

function normalizeAnswer(format: string, userAnswer: string, correctAnswer: string): boolean {
  const ua = userAnswer.trim();
  const ca = correctAnswer.trim();

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
    case "matching_headings":
    case "matching_information":
      return ua.toUpperCase() === ca.toUpperCase();
    default:
      return ua === ca;
  }
}

export const attemptRouter = router({
  start: protectedProcedure
    .input(z.object({ packageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [pkg] = await db
        .select()
        .from(testPackage)
        .where(eq(testPackage.id, input.packageId))
        .limit(1);

      if (!pkg) throw new Error("Package not found");
      if (!pkg.isPublic && pkg.creatorUserId !== userId) {
        throw new Error("Not authorized to access this package");
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

      if (!attempt) throw new Error("Failed to create attempt");

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
      if (attempt.userId !== userId) throw new Error("Not authorized");

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

      const [attempt] = await db
        .select()
        .from(testAttempt)
        .where(eq(testAttempt.id, input.attemptId))
        .limit(1);

      if (!attempt) throw new Error("Attempt not found");
      if (attempt.userId !== userId) throw new Error("Not authorized");
      if (attempt.status !== "in_progress") throw new Error("Attempt already finished");

      const [q] = await db
        .select()
        .from(question)
        .where(eq(question.id, input.questionId))
        .limit(1);

      if (!q) throw new Error("Question not found");

      const isCorrect = normalizeAnswer(q.format, input.userAnswer, q.correctAnswer);

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
            isCorrect,
            timeSpentSec: input.timeSpentSec,
          })
          .where(eq(answer.id, existing.id));
      } else {
        await db.insert(answer).values({
          sectionResultId: input.sectionResultId,
          questionId: input.questionId,
          userAnswer: input.userAnswer,
          isCorrect,
          timeSpentSec: input.timeSpentSec,
        });
      }

      return { isCorrect };
    }),

  finish: protectedProcedure
    .input(z.object({ attemptId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [attempt] = await db
        .select()
        .from(testAttempt)
        .where(eq(testAttempt.id, input.attemptId))
        .limit(1);

      if (!attempt) throw new Error("Attempt not found");
      if (attempt.userId !== userId) throw new Error("Not authorized");
      if (attempt.status !== "in_progress") throw new Error("Attempt already finished");

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

      for (let i = 0; i < dbSections.length; i++) {
        const secResult = dbSections[i];
        const pkgSec = pkgSections[i];
        if (!secResult || !pkgSec) continue;

        const secAnswers = await db
          .select()
          .from(answer)
          .where(eq(answer.sectionResultId, secResult.id));

        const sectionScore = secAnswers.filter((a) => a.isCorrect).length;
        const sectionMax = questionCounts.get(pkgSec.id) ?? secAnswers.length;

        await db
          .update(sectionResult)
          .set({
            score: sectionScore,
            maxScore: sectionMax,
          })
          .where(eq(sectionResult.id, secResult.id));

        totalScore += sectionScore;
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

  myAttempts: protectedProcedure
    .input(
      z
        .object({
          packageId: z.string().uuid().optional(),
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const conditions = [eq(testAttempt.userId, userId)];

      if (input?.packageId) {
        conditions.push(eq(testAttempt.packageId, input.packageId));
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
        })
        .from(testAttempt)
        .where(where)
        .orderBy(desc(testAttempt.createdAt))
        .limit(input?.limit ?? 20)
        .offset(input?.offset ?? 0);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(testAttempt)
        .where(where);
      const totalCount = Number(countResult?.count ?? 0);

      return { attempts: rows, total: totalCount };
    }),
});
