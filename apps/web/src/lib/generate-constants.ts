export const EXAM_TYPES = [
  { id: "IELTS", name: "IELTS Academic", code: "gb" },
  { id: "TOEFL", name: "TOEFL iBT", code: "us" },
  { id: "JLPT", name: "JLPT", code: "jp" },
  { id: "HSK", name: "HSK", code: "cn" },
  { id: "GOETHE", name: "Goethe-Zertifikat", code: "de" },
];

export const SECTIONS = [
  { id: "READING", name: "Reading", icon: "menu_book" },
  { id: "WRITING", name: "Writing", icon: "edit_note" },
];

export const FORMATS = [
  { id: "multiple_choice", name: "Multiple Choice", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE"] },
  { id: "true_false_not_given", name: "True / False / Not Given", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE"] },
  { id: "fill_blank", name: "Fill in Blank", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE"] },
  { id: "synonym", name: "Synonym / Vocabulary", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE"] },
  { id: "grammar_in_context", name: "Grammar in Context", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE"] },
  { id: "sentence_completion", name: "Sentence Completion", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE"] },
  { id: "cloze", name: "Cloze Test", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE"] },
  { id: "reference", name: "Reference (Pronoun)", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE"] },
  { id: "author_view", name: "Author's View", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE"] },
  { id: "matching_headings", name: "Matching Headings", allowedExams: ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE"] },
  { id: "kanji_reading", name: "Kanji Reading", allowedExams: ["JLPT"] },
  { id: "particle_choice", name: "Particle Choice", allowedExams: ["JLPT"] },
  { id: "article_case", name: "Article / Case", allowedExams: ["GOETHE"] },
  { id: "character_reading", name: "Character Reading", allowedExams: ["HSK"] },
  { id: "sentence_arrangement", name: "Sentence Arrangement", allowedExams: ["HSK"] },
];

export const TOPICS = ["Science & Tech", "Business", "Sociology", "Arts", "History", "Environment", "Health", "Education"];
export const DIFFICULTIES = ["Beginner", "Intermediate", "Academic", "Expert"];

export const QUESTION_COUNT_PRESETS = [
  { value: 5, label: "5 Soal", desc: "Drill cepat" },
  { value: 10, label: "10 Soal", desc: "Latihan fokus" },
  { value: 20, label: "20 Soal", desc: "Mini test" },
  { value: 40, label: "40 Soal", desc: "Full test" },
];
