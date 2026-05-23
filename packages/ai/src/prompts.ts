import type { GenerationInput } from "./schemas";
import { getQuestionJsonSchemaDescription } from "./schema-to-prompt";
import { buildContentLanguageRules, buildExplanationLanguageRule } from "./language-rules";

export const OPTION_QUALITY_RULES = `- Each option "text" must be meaningful content derived from the passage or question — NEVER use generic labels like "Option A", "Option B", "Pilihan A", "Choice B", or "Placeholder".
- For multiple choice: always provide at least 4 real answer choices labeled A, B, C, D with plausible distractors.`;

export function buildQuickModePrompt(input: GenerationInput): string {
  const { examType, section, formats, difficulty, topics, questionCount } = input;

  const questionSchemaJson = getQuestionJsonSchemaDescription();

  return `You are an expert exam question writer for ${examType} ${section.toLowerCase()} section.

Generate ${questionCount} authentic, high-quality reading comprehension questions.

EXAM: ${examType}
SECTION: ${section}
DIFFICULTY: ${difficulty}/5
TOPICS: ${topics.join(", ")}
FORMATS TO GENERATE: ${formats.join(", ")}

INSTRUCTIONS:
${buildContentLanguageRules(examType)}
${buildExplanationLanguageRule(examType)}
- For Korean (TOPIK): Focus on particles, honorifics (speech levels), and functional grammar.
- For Arabic (TOAFL): Support RTL text. Focus on I'rab (case endings/vowel changes) and grammar.
- For Spanish (DELE): Focus on verb conjugation by subject and agreement.
- Passage length should be appropriate for the exam type and difficulty.
- Each question must have:
  * a reading passage (passageText)
   * a clear question prompt (questionText) — in exam language, NOT Bahasa Indonesia
   * a correct answer (correctAnswer)
   * an explanation (explanation) — Bahasa Indonesia, boleh sisipkan istilah/kanji/kata ujian bila perlu
  * difficulty level (${difficulty})
  * relevant skill tags (skillTags)
- For JLPT/TOPIK kanji/hanja: Include reading annotations in format: 漢字(かんじ) for words that have readings.
- Questions should test real comprehension, not just surface-level recall.
- For multiple choice: always provide 4 options labeled A, B, C, D.
- Options must be plausible distractors — one clearly correct answer.
${OPTION_QUALITY_RULES}
- For matching_pairs: Provide options as an array of {key, text} where key is the left item identifier and text is the left item. correctAnswer should be a serialized mapping like "A:1,B:2,C:3" matching each left key to its right pair.
- For error_recognition: options are error segments (A, B, C, D) and correctAnswer is the key of the segment containing an error.
- For text_insertion: options are position markers (A, B, C, D) within the passage where a sentence could be inserted. correctAnswer is the best position key.
- For sentence_arrangement: Provide options as shuffled fragments in random order. correctAnswer is the correct order as comma-separated keys (e.g. "D,A,C,B").
- For matching_information: options are information items with key and text. correctAnswer is the correct match as serialized mapping.

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure (no markdown code blocks, no extra text):

{
  "questions": [
    // array of question objects. Schema:
${questionSchemaJson.split("\n").map((l) => "    " + l).join("\n")}
  ]
}

You may reuse the same passage for multiple questions, or generate a new passage per question — whichever is more natural for the exam type.
`;
}
