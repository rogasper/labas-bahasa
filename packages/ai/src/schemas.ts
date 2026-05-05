import { z } from "zod";

// ── Shared Schemas ─────────────────────────────────────────

export const examTypeSchema = z.enum(["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE"]);
export const sectionTypeSchema = z.enum(["READING", "WRITING", "LISTENING", "SPEAKING"]);

export const questionFormatSchema = z.enum([
  "multiple_choice",
  "true_false_not_given",
  "matching_headings",
  "matching_information",
  "fill_blank",
  "synonym",
  "grammar_in_context",
  "sentence_completion",
  "summary_completion",
  "cloze",
  "reference",
  "author_view",
  "kanji_reading",
  "particle_choice",
  "article_case",
  "character_reading",
  "sentence_arrangement",
]);

export const difficultySchema = z.number().int().min(1).max(5);

export const aiKeyConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  maxTokens: z.number().int().min(1).max(1_000_000).default(16384),
});

// ── Question Option Schemas ────────────────────────────────

export const multipleChoiceOptionSchema = z.object({
  key: z.string(),
  text: z.string(),
});

export const matchingPairSchema = z.object({
  left: z.string(),
  right: z.string(),
});

// ── Base Question Schema ───────────────────────────────────

export const baseQuestionSchema = z.object({
  format: questionFormatSchema,
  passageText: z.string().min(50),
  questionText: z.string().min(10),
  correctAnswer: z.string(),
  explanation: z.string(),
  difficulty: difficultySchema,
  skillTags: z.array(z.string()).min(1),
});

// ── Format-Specific Question Schemas ───────────────────────

export const multipleChoiceQuestionSchema = baseQuestionSchema.extend({
  format: z.literal("multiple_choice"),
  options: z.array(multipleChoiceOptionSchema).min(2).max(6),
  correctAnswer: z.string(), // key of the correct option
});

export const trueFalseQuestionSchema = baseQuestionSchema.extend({
  format: z.literal("true_false_not_given"),
  correctAnswer: z.enum(["TRUE", "FALSE", "NOT_GIVEN"]),
});

export const matchingHeadingsQuestionSchema = baseQuestionSchema.extend({
  format: z.literal("matching_headings"),
  options: z.array(multipleChoiceOptionSchema), // headings to match
  correctAnswer: z.string(), // serialized mapping
});

export const matchingInformationQuestionSchema = baseQuestionSchema.extend({
  format: z.literal("matching_information"),
  options: z.array(multipleChoiceOptionSchema),
  correctAnswer: z.string(),
});

export const fillBlankQuestionSchema = baseQuestionSchema.extend({
  format: z.literal("fill_blank"),
  correctAnswer: z.string(), // exact text to fill
});

export const synonymQuestionSchema = baseQuestionSchema.extend({
  format: z.literal("synonym"),
  options: z.array(multipleChoiceOptionSchema).min(2).max(6),
  correctAnswer: z.string(), // key of synonym option
});

export const grammarInContextQuestionSchema = baseQuestionSchema.extend({
  format: z.literal("grammar_in_context"),
  options: z.array(multipleChoiceOptionSchema).min(2).max(6),
  correctAnswer: z.string(),
});

export const sentenceCompletionQuestionSchema = baseQuestionSchema.extend({
  format: z.literal("sentence_completion"),
  options: z.array(multipleChoiceOptionSchema).min(2).max(6),
  correctAnswer: z.string(),
});

export const summaryCompletionQuestionSchema = baseQuestionSchema.extend({
  format: z.literal("summary_completion"),
  options: z.array(multipleChoiceOptionSchema).min(2),
  correctAnswer: z.string(), // serialized answers
});

export const clozeQuestionSchema = baseQuestionSchema.extend({
  format: z.literal("cloze"),
  options: z.array(multipleChoiceOptionSchema).min(2),
  correctAnswer: z.string(), // serialized answers for each blank
});

export const referenceQuestionSchema = baseQuestionSchema.extend({
  format: z.literal("reference"),
  options: z.array(multipleChoiceOptionSchema).min(2).max(6),
  correctAnswer: z.string(), // key of correct reference
});

export const authorViewQuestionSchema = baseQuestionSchema.extend({
  format: z.literal("author_view"),
  correctAnswer: z.enum(["YES", "NO", "NOT_GIVEN"]),
});

export const kanjiReadingQuestionSchema = baseQuestionSchema.extend({
  format: z.literal("kanji_reading"),
  options: z.array(multipleChoiceOptionSchema).min(2).max(6),
  correctAnswer: z.string(),
});

export const particleChoiceQuestionSchema = baseQuestionSchema.extend({
  format: z.literal("particle_choice"),
  options: z.array(multipleChoiceOptionSchema).min(2).max(6),
  correctAnswer: z.string(),
});

export const articleCaseQuestionSchema = baseQuestionSchema.extend({
  format: z.literal("article_case"),
  options: z.array(multipleChoiceOptionSchema).min(2).max(6),
  correctAnswer: z.string(),
});

export const characterReadingQuestionSchema = baseQuestionSchema.extend({
  format: z.literal("character_reading"),
  options: z.array(multipleChoiceOptionSchema).min(2).max(6),
  correctAnswer: z.string(),
});

export const sentenceArrangementQuestionSchema = baseQuestionSchema.extend({
  format: z.literal("sentence_arrangement"),
  options: z.array(multipleChoiceOptionSchema).min(2).max(6),
  correctAnswer: z.string(),
});

// ── Unified Question Schema ────────────────────────────────

export const questionSchema = z.discriminatedUnion("format", [
  multipleChoiceQuestionSchema,
  trueFalseQuestionSchema,
  matchingHeadingsQuestionSchema,
  matchingInformationQuestionSchema,
  fillBlankQuestionSchema,
  synonymQuestionSchema,
  grammarInContextQuestionSchema,
  sentenceCompletionQuestionSchema,
  summaryCompletionQuestionSchema,
  clozeQuestionSchema,
  referenceQuestionSchema,
  authorViewQuestionSchema,
  kanjiReadingQuestionSchema,
  particleChoiceQuestionSchema,
  articleCaseQuestionSchema,
  characterReadingQuestionSchema,
  sentenceArrangementQuestionSchema,
]);

export type Question = z.infer<typeof questionSchema>;

// ── Generation Input / Output ──────────────────────────────

export const generationInputSchema = z.object({
  examType: examTypeSchema,
  section: sectionTypeSchema,
  formats: z.array(questionFormatSchema).min(1),
  difficulty: difficultySchema,
  topics: z.array(z.string()).min(1),
  questionCount: z.number().int().min(1).max(40),
  mode: z.enum(["quick", "agentic"]).default("quick"),
  apiKeyConfig: aiKeyConfigSchema,
});

export type GenerationInput = z.infer<typeof generationInputSchema>;

export const generationResultSchema = z.object({
  questions: z.array(questionSchema),
  meta: z.object({
    model: z.string(),
    tokensUsed: z.number().optional(),
    durationMs: z.number(),
    mode: z.enum(["quick", "agentic"]),
  }),
});

export type GenerationResult = z.infer<typeof generationResultSchema>;
