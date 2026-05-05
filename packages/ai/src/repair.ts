import { z } from "zod";
import {
  questionFormatSchema,
  multipleChoiceOptionSchema,
  questionSchema,
  type Question,
} from "./schemas";

// ── Generic Question Schema (for AI prompt) ─────────────────
// Simplified schema that AI can understand easily.
// We repair & map to discriminated union afterwards.

export const genericQuestionSchema = z.object({
  format: questionFormatSchema,
  passageText: z.string(),
  questionText: z.string().min(1),
  options: z.array(multipleChoiceOptionSchema).optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  skillTags: z.array(z.string()).min(1),
});

export type GenericQuestion = z.infer<typeof genericQuestionSchema>;

const FORMATS_WITH_OPTIONS = new Set([
  "multiple_choice",
  "matching_headings",
  "matching_information",
  "synonym",
  "grammar_in_context",
  "sentence_completion",
  "summary_completion",
  "cloze",
  "reference",
  "kanji_reading",
  "particle_choice",
  "article_case",
  "character_reading",
  "sentence_arrangement",
]);

function normalizeOptionKey(key: string): string {
  return key.trim().toUpperCase();
}

function normalizeOptionText(text: string): string {
  return text.trim();
}

function ensureOptions(
  q: GenericQuestion,
): Array<{ key: string; text: string }> | undefined {
  if (!FORMATS_WITH_OPTIONS.has(q.format)) return undefined;

  let opts = q.options;
  if (!Array.isArray(opts) || opts.length === 0) {
    // AI forgot options — inject plausible placeholders so parsing can succeed
    // We'll mark them for later regeneration if needed
    if (q.format === "multiple_choice" || q.format === "synonym" || q.format === "grammar_in_context" ||
        q.format === "sentence_completion" || q.format === "reference" || q.format === "kanji_reading" ||
        q.format === "particle_choice" || q.format === "article_case" || q.format === "character_reading" ||
        q.format === "sentence_arrangement") {
      return [
        { key: "A", text: "Option A" },
        { key: "B", text: "Option B" },
        { key: "C", text: "Option C" },
        { key: "D", text: "Option D" },
      ];
    }
    if (q.format === "matching_headings" || q.format === "matching_information" ||
        q.format === "summary_completion" || q.format === "cloze") {
      return [{ key: "1", text: "Placeholder option" }];
    }
  }

  opts = opts!.map((o) => ({
    key: normalizeOptionKey(o.key),
    text: normalizeOptionText(o.text),
  }));

  // Deduplicate by key
  const seen = new Set<string>();
  const deduped = [];
  for (const o of opts) {
    if (!seen.has(o.key)) {
      seen.add(o.key);
      deduped.push(o);
    }
  }

  return deduped;
}

function coerceCorrectAnswer(q: GenericQuestion): string {
  const ans = String(q.correctAnswer).trim();

  if (q.format === "true_false_not_given") {
    const upper = ans.toUpperCase();
    if (upper === "T" || upper === "TRUE") return "TRUE";
    if (upper === "F" || upper === "FALSE") return "FALSE";
    if (upper === "NG" || upper === "NOT GIVEN" || upper === "NOT_GIVEN") return "NOT_GIVEN";
    // Fallback — pick the closest
    if (ans.toLowerCase().includes("true")) return "TRUE";
    if (ans.toLowerCase().includes("false")) return "FALSE";
    return "NOT_GIVEN";
  }

  if (q.format === "author_view") {
    const upper = ans.toUpperCase();
    if (upper === "Y" || upper === "YES") return "YES";
    if (upper === "N" || upper === "NO") return "NO";
    if (upper === "NG" || upper === "NOT GIVEN" || upper === "NOT_GIVEN") return "NOT_GIVEN";
    if (ans.toLowerCase().includes("yes")) return "YES";
    if (ans.toLowerCase().includes("no")) return "NO";
    return "NOT_GIVEN";
  }

  // For multiple choice / synonym / reference etc: ensure the key exists in options
  if (q.options && q.options.length > 0) {
    const keys = new Set(q.options.map((o) => normalizeOptionKey(o.key)));
    const normalizedAns = normalizeOptionKey(ans);
    if (!keys.has(normalizedAns)) {
      // Answer key doesn't match any option — fallback to first option key
      return q.options[0]!.key;
    }
    return normalizedAns;
  }

  return ans;
}

function ensurePassageText(q: GenericQuestion, fullPassage: string): string {
  if (!q.passageText || q.passageText.trim().length < 50) {
    return fullPassage;
  }
  return q.passageText.trim();
}

function ensureSkillTags(q: GenericQuestion): string[] {
  if (Array.isArray(q.skillTags) && q.skillTags.length > 0) {
    return q.skillTags.map((s) => String(s).trim()).filter(Boolean);
  }
  return ["comprehension"];
}

function ensureExplanation(q: GenericQuestion): string {
  if (q.explanation && q.explanation.trim().length > 0) {
    return q.explanation.trim();
  }
  return "Penjelasan tidak tersedia.";
}

function ensureQuestionText(q: GenericQuestion): string {
  const text = q.questionText?.trim();
  if (text && text.length >= 10) return text;
  return text || "Soal latihan membaca.";
}

function ensureDifficulty(q: GenericQuestion): number {
  const d = Number(q.difficulty);
  if (Number.isFinite(d) && d >= 1 && d <= 5) return Math.round(d);
  return 3;
}

/**
 * Repair a single raw question to maximize chance of passing Zod validation.
 */
export function repairQuestion(
  raw: unknown,
  fullPassage: string,
): { question: GenericQuestion; wasRepaired: boolean; repairNotes: string[] } {
  const notes: string[] = [];
  let wasRepaired = false;

  if (!raw || typeof raw !== "object") {
    throw new Error("Question is not an object");
  }

  const r = raw as Record<string, unknown>;

  // Build generic question with defaults
  const q: GenericQuestion = {
    format: String(r.format || "multiple_choice").trim().toLowerCase() as any,
    passageText: ensurePassageText(r as GenericQuestion, fullPassage),
    questionText: ensureQuestionText(r as GenericQuestion),
    options: Array.isArray(r.options)
      ? r.options
          .filter((o: any) => o && typeof o === "object")
          .map((o: any) => ({ key: String(o.key ?? ""), text: String(o.text ?? "") }))
      : undefined,
    correctAnswer: String(r.correctAnswer ?? "").trim(),
    explanation: ensureExplanation(r as GenericQuestion),
    difficulty: ensureDifficulty(r as GenericQuestion),
    skillTags: ensureSkillTags(r as GenericQuestion),
  };

  // Track repairs
  if (!r.passageText || String(r.passageText).trim().length < 50) {
    notes.push("passageText replaced with full passage");
    wasRepaired = true;
  }
  if (!r.questionText || String(r.questionText).trim().length < 10) {
    notes.push("questionText too short, used fallback");
    wasRepaired = true;
  }
  if (!r.explanation || String(r.explanation).trim().length === 0) {
    notes.push("explanation missing, used fallback");
    wasRepaired = true;
  }
  if (!Array.isArray(r.skillTags) || r.skillTags.length === 0) {
    notes.push("skillTags missing, used fallback");
    wasRepaired = true;
  }

  // Coerce correctAnswer
  const originalAns = q.correctAnswer;
  q.correctAnswer = coerceCorrectAnswer(q);
  if (q.correctAnswer !== originalAns) {
    notes.push(`correctAnswer coerced from "${originalAns}" to "${q.correctAnswer}"`);
    wasRepaired = true;
  }

  // Ensure options
  const repairedOptions = ensureOptions(q);
  if (repairedOptions !== undefined) {
    if (!q.options || q.options.length === 0) {
      notes.push("options missing, injected placeholders");
      wasRepaired = true;
    }
    q.options = repairedOptions;
  }

  return { question: q, wasRepaired, repairNotes: notes };
}

/**
 * Try to parse a generic question into the discriminated union schema.
 * Returns null if it still fails.
 */
export function tryParseQuestion(generic: GenericQuestion): Question | null {
  try {
    return questionSchema.parse(generic as any);
  } catch (err) {
    return null;
  }
}

/**
 * Repair all questions, parse with Zod, separate valid/invalid.
 */
export function repairAndParseQuestions(
  rawQuestions: unknown[],
  fullPassage: string,
): {
  valid: Question[];
  invalid: { index: number; raw: unknown; errors: string[] }[];
  repairLog: string[];
} {
  const valid: Question[] = [];
  const invalid: { index: number; raw: unknown; errors: string[] }[] = [];
  const repairLog: string[] = [];

  for (let i = 0; i < rawQuestions.length; i++) {
    const raw = rawQuestions[i];
    try {
      const { question: repaired, wasRepaired, repairNotes } = repairQuestion(raw, fullPassage);
      if (wasRepaired) {
        repairLog.push(`Q${i + 1}: ${repairNotes.join("; ")}`);
      }
      const parsed = tryParseQuestion(repaired);
      if (parsed) {
        valid.push(parsed);
      } else {
        // Try to get Zod errors for diagnostics
        const parseResult = questionSchema.safeParse(repaired as any);
        const errors = parseResult.success
          ? ["Unknown parse failure after repair"]
          : parseResult.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`);
        invalid.push({ index: i, raw, errors });
        repairLog.push(`Q${i + 1}: still invalid after repair — ${errors.join(", ")}`);
      }
    } catch (err: any) {
      invalid.push({ index: i, raw, errors: [err.message ?? "Repair failed"] });
      repairLog.push(`Q${i + 1}: repair threw — ${err.message ?? String(err)}`);
    }
  }

  return { valid, invalid, repairLog };
}

/**
 * Build a generic JSON schema description for the AI prompt.
 * Much simpler than the discriminated union — reduces AI confusion.
 */
export function getGenericQuestionJsonSchemaDescription(): string {
  return JSON.stringify(
    {
      type: "object",
      properties: {
        questions: {
          type: "array",
          description: "Array of question objects",
          items: {
            type: "object",
            properties: {
              format: {
                type: "string",
                enum: [
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
                ],
              },
              passageText: { type: "string", description: "Relevant excerpt from the passage (or full passage)" },
              questionText: { type: "string", description: "The question text" },
              options: {
                type: "array",
                description: "Required for multiple_choice, synonym, matching_*, reference, kanji_reading, particle_choice, article_case, character_reading, sentence_arrangement, summary_completion, cloze. Optional for others.",
                items: {
                  type: "object",
                  properties: {
                    key: { type: "string", description: "Option identifier (e.g. A, B, C, D)" },
                    text: { type: "string", description: "Option text" },
                  },
                  required: ["key", "text"],
                },
              },
              correctAnswer: {
                type: "string",
                description: "For true_false_not_given use TRUE/FALSE/NOT_GIVEN. For author_view use YES/NO/NOT_GIVEN. For multiple choice use the option key (e.g. A).",
              },
              explanation: { type: "string", description: "Explanation in Indonesian" },
              difficulty: { type: "integer", minimum: 1, maximum: 5 },
              skillTags: { type: "array", items: { type: "string" } },
            },
            required: ["format", "passageText", "questionText", "correctAnswer", "explanation", "difficulty", "skillTags"],
          },
        },
      },
      required: ["questions"],
    },
    null,
    2,
  );
}
