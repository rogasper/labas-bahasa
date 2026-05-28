import { z } from "zod";
import { eq, and, inArray, desc } from "drizzle-orm";
import { router, protectedProcedure } from "../index";
import { db } from "@labas/db";
import { question, packageSection, sectionQuestion, generationJob } from "@labas/db";
import { throwNotFound } from "../lib/errors";
import path from "path";
import fs from "fs";

const AUDIO_DIR = path.join(process.cwd(), "audio-cache");

export const audioRouter = router({
  generateForPackage: protectedProcedure
    .input(
      z.object({
        packageId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rows = await db
        .select({
          id: question.id,
          audioConfig: question.audioConfig,
          examTypeId: question.examTypeId,
        })
        .from(sectionQuestion)
        .innerJoin(packageSection, eq(sectionQuestion.sectionId, packageSection.id))
        .innerJoin(question, eq(sectionQuestion.questionId, question.id))
        .where(
          and(
            eq(packageSection.packageId, input.packageId),
            eq(question.format, "listening_multiple_choice"),
            eq(question.creatorUserId, ctx.session.user.id),
          ),
        );

      if (rows.length === 0) {
        throwNotFound("Tidak ada soal listening di paket ini");
      }

      // Only process questions without audio yet (or with invalid audio files)
      const toGenerate = rows.filter((r) => {
        const url = (r.audioConfig as any)?.passageAudioUrl;
        if (!url) return true;
        const filename = url.replace("/api/audio/", "");
        if (!filename || filename.includes("..") || filename.includes("/")) return true;
        const filePath = path.join(AUDIO_DIR, filename);
        if (!fs.existsSync(filePath)) return true;
        if (fs.statSync(filePath).size === 0) return true;
        return false;
      });

      const skipped = rows.length - toGenerate.length;

      if (toGenerate.length === 0) {
        return { generated: 0, skipped, generationJobId: null, alreadyRunning: false };
      }

      // Check if user already has an active audio generation job — prevent duplicates
      const [runningJob] = await db
        .select({ id: generationJob.id })
        .from(generationJob)
        .where(
          and(
            eq(generationJob.userId, ctx.session.user.id),
            eq(generationJob.jobType, "audio"),
            eq(generationJob.status, "running"),
          ),
        )
        .limit(1);

      if (runningJob) {
        return {
          generated: 0,
          skipped: rows.length,
          generationJobId: runningJob.id,
          alreadyRunning: true,
        };
      }

      // Determine langCode from exam type of the package's questions
      const examTypeId = rows[0]?.examTypeId ?? "";
      const langCode =
        examTypeId === "JLPT" ? "ja" :
        examTypeId === "HSK" ? "zh" :
        examTypeId === "DELE" ? "es" :
        "en";

      // Enqueue audio generation batch (shows up in GlobalGenerationProgress)
      const { enqueueAudioGeneration } = await import("../queue");
      const generationJobId = await enqueueAudioGeneration(
        toGenerate.map((r) => r.id),
        ctx.session.user.id,
        { langCode },
      );

      return {
        generated: toGenerate.length,
        skipped,
        generationJobId,
        alreadyRunning: false,
      };
    }),

  generateForQuestions: protectedProcedure
    .input(
      z.object({
        questionIds: z.array(z.string().uuid()).min(1).max(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { enqueueAudioGeneration } = await import("../queue");
      const generationJobId = await enqueueAudioGeneration(
        input.questionIds,
        ctx.session.user.id,
      );
      return { generationJobId };
    }),

  getAudioStatus: protectedProcedure
    .input(
      z.object({
        questionIds: z.array(z.string().uuid()).min(1).max(50),
      }),
    )
    .query(async ({ input }) => {
      const rows = await db
        .select({
          id: question.id,
          format: question.format,
          audioConfig: question.audioConfig,
        })
        .from(question)
        .where(inArray(question.id, input.questionIds));

      return rows.map((r) => ({
        id: r.id,
        format: r.format,
        hasAudio: !!(r.audioConfig as any)?.passageAudioUrl,
        audioConfig: r.audioConfig as any,
      }));
    }),
});
