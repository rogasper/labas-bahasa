import type { GenerationInput } from "./schemas";
import { getQuestionJsonSchemaDescription } from "./schema-to-prompt";

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
- The reading passage must be written in the target language of the exam (${examType === "JLPT" ? "Japanese" : examType === "HSK" ? "Chinese" : examType === "GOETHE" ? "German" : "English"}).
- Passage length should be appropriate for the exam type and difficulty.
- Each question must have:
  * a reading passage (passageText)
   * a clear question prompt (questionText)
   * a correct answer (correctAnswer)
   * an explanation (explanation) — WAJIB ditulis dalam Bahasa Indonesia. DILARANG menggunakan bahasa asing (China, Jepang, Jerman, Inggris) untuk explanation.
  * difficulty level (${difficulty})
  * relevant skill tags (skillTags)
- Questions should test real comprehension, not just surface-level recall.
- For multiple choice: always provide 4 options labeled A, B, C, D.
- Options must be plausible distractors — one clearly correct answer.

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
