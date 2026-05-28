export const EXAM_TYPES = [
  { id: "IELTS", name: "IELTS Academic", code: "gb" },
  { id: "TOEFL", name: "TOEFL iBT", code: "us" },
  { id: "JLPT", name: "JLPT", code: "jp" },
  { id: "HSK", name: "HSK", code: "cn" },
  { id: "GOETHE", name: "Goethe-Zertifikat", code: "de" },
  { id: "TOPIK", name: "TOPIK", code: "kr" },
  { id: "TOAFL", name: "TOAFL", code: "sa" },
  { id: "DELE", name: "DELE", code: "es" },
];

export const SECTIONS = [
  { id: "READING", name: "Reading", icon: "menu_book" },
  { id: "WRITING", name: "Writing", icon: "edit_note" },
  { id: "LISTENING", name: "Listening", icon: "headphones" },
];

export const EXAM_LANG_MAP: Record<string, string> = {
  IELTS: "en",
  TOEFL: "en",
  JLPT: "ja",
  HSK: "zh",
  DELE: "es",
  GOETHE: "de",
  TOPIK: "ko",
  TOAFL: "ar",
};

export const KOKORO_SUPPORTED_LANGS = new Set(["en", "es", "fr", "hi", "it", "pt", "ja", "zh"]);

export function isListeningSupported(examTypeId: string): boolean {
  const lang = EXAM_LANG_MAP[examTypeId];
  return lang ? KOKORO_SUPPORTED_LANGS.has(lang) : false;
}

export function getSectionsForExam(examTypeId: string): typeof SECTIONS {
  if (isListeningSupported(examTypeId)) return SECTIONS;
  return SECTIONS.filter((s) => s.id !== "LISTENING");
}

export const FORMATS = [
  { id: "multiple_choice", name: "Multiple Choice", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE", "TOPIK", "TOAFL", "DELE"] },
  { id: "true_false_not_given", name: "True / False / Not Given", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE", "TOPIK", "TOAFL", "DELE"] },
  { id: "fill_blank", name: "Fill in Blank", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE", "TOPIK", "TOAFL", "DELE"] },
  { id: "synonym", name: "Synonym / Vocabulary", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE", "TOPIK", "TOAFL", "DELE"] },
  { id: "grammar_in_context", name: "Grammar in Context", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE", "TOPIK", "TOAFL", "DELE"] },
  { id: "sentence_completion", name: "Sentence Completion", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE", "TOPIK", "TOAFL", "DELE"] },
  { id: "cloze", name: "Cloze Test", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE", "TOPIK", "TOAFL", "DELE"] },
  { id: "reference", name: "Reference (Pronoun)", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE", "TOPIK", "TOAFL", "DELE"] },
  { id: "author_view", name: "Author's View", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE", "TOPIK", "TOAFL", "DELE"] },
  { id: "matching_headings", name: "Matching Headings", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE", "TOPIK", "TOAFL", "DELE"] },
  { id: "matching_information", name: "Matching Information", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE", "TOPIK", "TOAFL", "DELE"] },
  { id: "summary_completion", name: "Summary Completion", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE", "TOPIK", "TOAFL", "DELE"] },
  { id: "matching_pairs", name: "Matching Pairs", allowedExams: ["IELTS", "TOEFL", "GOETHE", "DELE", "TOPIK"] },
  { id: "error_recognition", name: "Error Recognition", allowedExams: ["TOEFL", "HSK", "TOPIK", "TOAFL"] },
  { id: "text_insertion", name: "Text Insertion", allowedExams: ["TOEFL", "IELTS"] },
  { id: "kanji_reading", name: "Kanji Reading", allowedExams: ["JLPT"] },
  { id: "particle_choice", name: "Particle / Conjunction Choice", allowedExams: ["JLPT", "TOPIK"] },
  { id: "article_case", name: "Article / Gender / Agreement", allowedExams: ["GOETHE", "TOAFL", "DELE"] },
  { id: "character_reading", name: "Character Reading", allowedExams: ["HSK", "TOPIK"] },
  { id: "sentence_arrangement", name: "Sentence Arrangement", allowedExams: ["HSK", "TOPIK", "DELE", "TOAFL"] },
  { id: "listening_multiple_choice", name: "Listening Multiple Choice", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "DELE"] },
];

export const TOPICS = [
  "Science & Tech", "Business", "Sociology", "Arts", "History", "Environment", "Health", "Education",
  "Daily Interaction", "Social Etiquette", "Workplace",
];
export const DIFFICULTIES = ["Beginner", "Elementary", "Intermediate", "Advanced", "Expert"];

export const QUESTION_COUNT_PRESETS = [
  { value: 5, label: "5 Soal", desc: "Drill cepat" },
  { value: 10, label: "10 Soal", desc: "Latihan fokus" },
  { value: 20, label: "20 Soal", desc: "Mini test" },
  { value: 40, label: "40 Soal", desc: "Full test" },
];
