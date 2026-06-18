/** Question formats that render as multiple-choice options (MCQ). */
export const MCQ_FORMATS = [
  "multiple_choice",
  "synonym",
  "grammar_in_context",
  "sentence_completion",
  "reference",
  "kanji_reading",
  "particle_choice",
  "article_case",
  "summary_completion",
  "cloze",
  "error_recognition",
  "text_insertion",
  "matching_pairs",
] as const;

/** Matching formats that require multi-answer input (one per sub-item). */
export const MATCHING_FORMATS = [
  "matching_headings",
  "matching_information",
] as const;

export type McqFormat = (typeof MCQ_FORMATS)[number];
