import type { GenerationInput } from "./schemas";

export function buildQuickModePrompt(input: GenerationInput): string {
  const { examType, section, formats, difficulty, topics, questionCount } = input;

  const formatDescriptions: Record<string, string> = {
    multiple_choice: `{
      "format": "multiple_choice",
      "passageText": "...",
      "questionText": "...",
      "options": [{"key": "A", "text": "..."}, {"key": "B", "text": "..."}, ...],
      "correctAnswer": "A",
      "explanation": "...",
      "difficulty": ${difficulty},
      "skillTags": ["..."]
    }`,
    true_false_not_given: `{
      "format": "true_false_not_given",
      "passageText": "...",
      "questionText": "...",
      "correctAnswer": "TRUE" | "FALSE" | "NOT_GIVEN",
      "explanation": "...",
      "difficulty": ${difficulty},
      "skillTags": ["..."]
    }`,
    fill_blank: `{
      "format": "fill_blank",
      "passageText": "...",
      "questionText": "Fill in the blank: ...",
      "correctAnswer": "exact text",
      "explanation": "...",
      "difficulty": ${difficulty},
      "skillTags": ["..."]
    }`,
    synonym: `{
      "format": "synonym",
      "passageText": "...",
      "questionText": "The word '___' in the passage is closest in meaning to:",
      "options": [{"key": "A", "text": "..."}, ...],
      "correctAnswer": "A",
      "explanation": "...",
      "difficulty": ${difficulty},
      "skillTags": ["vocabulary", "synonym"]
    }`,
    grammar_in_context: `{
      "format": "grammar_in_context",
      "passageText": "...",
      "questionText": "...",
      "options": [{"key": "A", "text": "..."}, ...],
      "correctAnswer": "A",
      "explanation": "...",
      "difficulty": ${difficulty},
      "skillTags": ["grammar"]
    }`,
    sentence_completion: `{
      "format": "sentence_completion",
      "passageText": "...",
      "questionText": "...",
      "options": [{"key": "A", "text": "..."}, ...],
      "correctAnswer": "A",
      "explanation": "...",
      "difficulty": ${difficulty},
      "skillTags": ["..."]
    }`,
    cloze: `{
      "format": "cloze",
      "passageText": "...",
      "questionText": "Fill each blank with the correct option:",
      "options": [{"key": "A", "text": "..."}, ...],
      "correctAnswer": "serialized mapping of blank index to option key",
      "explanation": "...",
      "difficulty": ${difficulty},
      "skillTags": ["grammar", "vocabulary"]
    }`,
    reference: `{
      "format": "reference",
      "passageText": "...",
      "questionText": "The word 'it' in paragraph X refers to:",
      "options": [{"key": "A", "text": "..."}, ...],
      "correctAnswer": "A",
      "explanation": "...",
      "difficulty": ${difficulty},
      "skillTags": ["reference", "inference"]
    }`,
    author_view: `{
      "format": "author_view",
      "passageText": "...",
      "questionText": "...",
      "correctAnswer": "YES" | "NO" | "NOT_GIVEN",
      "explanation": "...",
      "difficulty": ${difficulty},
      "skillTags": ["inference", "author_view"]
    }`,
    matching_headings: `{
      "format": "matching_headings",
      "passageText": "...",
      "questionText": "Match each paragraph to a heading:",
      "options": [{"key": "i", "text": "..."}, ...],
      "correctAnswer": "serialized mapping of paragraph to heading key",
      "explanation": "...",
      "difficulty": ${difficulty},
      "skillTags": ["main_idea", "matching"]
    }`,
    kanji_reading: `{
      "format": "kanji_reading",
      "passageText": "...",
      "questionText": "How is the kanji '...' read in this context?",
      "options": [{"key": "A", "text": "..."}, ...],
      "correctAnswer": "A",
      "explanation": "...",
      "difficulty": ${difficulty},
      "skillTags": ["kanji", "reading"]
    }`,
    particle_choice: `{
      "format": "particle_choice",
      "passageText": "...",
      "questionText": "Which particle fits the blank?",
      "options": [{"key": "A", "text": "..."}, ...],
      "correctAnswer": "A",
      "explanation": "...",
      "difficulty": ${difficulty},
      "skillTags": ["grammar", "particle"]
    }`,
    article_case: `{
      "format": "article_case",
      "passageText": "...",
      "questionText": "Which article/case fits the blank?",
      "options": [{"key": "A", "text": "..."}, ...],
      "correctAnswer": "A",
      "explanation": "...",
      "difficulty": ${difficulty},
      "skillTags": ["grammar", "article", "case"]
    }`,
  };

  const formatExamples = formats
    .map((f) => formatDescriptions[f] || formatDescriptions["multiple_choice"])
    .join("\n\n---\n\n");

  return `You are an expert exam question writer for ${examType} ${section.toLowerCase()} section.

Generate ${questionCount} authentic, high-quality reading comprehension questions.

EXAM: ${examType}
SECTION: ${section}
DIFFICULTY: ${difficulty}/5
TOPICS: ${topics.join(", ")}

INSTRUCTIONS:
- The reading passage must be written in the target language of the exam (${examType === "JLPT" ? "Japanese" : examType === "HSK" ? "Chinese" : examType === "GOETHE" ? "German" : "English"}).
- Passage length should be appropriate for the exam type and difficulty.
- Each question must have:
  * a reading passage (passageText)
  * a clear question prompt (questionText)
  * a correct answer (correctAnswer) - dijelaskan dengan bahasa Indonesia
  * an explanation (explanation) - dijelaskan dengan bahasa Indonesia
  * difficulty level (${difficulty})
  * relevant skill tags (skillTags)
- Questions should test real comprehension, not just surface-level recall.
- For multiple choice: always provide 4 options labeled A, B, C, D.
- Options must be plausible distractors — one clearly correct answer.

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure (no markdown code blocks, no extra text):

{
  "questions": [
${formatExamples}
  ]
}

You may reuse the same passage for multiple questions, or generate a new passage per question — whichever is more natural for the exam type.
`;
}
