export const EXAM_TYPES = [
  { id: "IELTS", name: "IELTS Academic", code: "gb" },
  { id: "TOEFL", name: "TOEFL iBT", code: "us" },
  { id: "JLPT", name: "JLPT", code: "jp" },
  { id: "HSK", name: "HSK", code: "cn" },
  { id: "GOETHE", name: "Goethe-Zertifikat", code: "de" },
  { id: "TOPIK", name: "TOPIK", code: "kr" },
  { id: "TOAFL", name: "TOAFL", code: "sa" },
  { id: "DELE", name: "DELE", code: "es" },
  { id: "CPNS", name: "CPNS SKD", code: "id" },
];

export const SECTIONS = [
  { id: "READING", name: "Reading", icon: "menu_book" },
  { id: "WRITING", name: "Writing", icon: "edit_note" },
  { id: "TIU", name: "TIU", icon: "psychology" },
  { id: "TWK", name: "TWK", icon: "gavel" },
  { id: "TKP", name: "TKP", icon: "diversity_3" },
];

const ALL_EXAMS = ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE", "TOPIK", "TOAFL", "DELE"];

export const FORMATS = [
  { id: "multiple_choice", name: "Multiple Choice", allowedExams: [...ALL_EXAMS, "CPNS"] },
  { id: "true_false_not_given", name: "True / False / Not Given", allowedExams: [...ALL_EXAMS, "CPNS"] },
  { id: "fill_blank", name: "Fill in Blank", allowedExams: [...ALL_EXAMS] },
  { id: "synonym", name: "Synonym / Vocabulary", allowedExams: [...ALL_EXAMS] },
  { id: "grammar_in_context", name: "Grammar in Context", allowedExams: [...ALL_EXAMS] },
  { id: "sentence_completion", name: "Sentence Completion", allowedExams: [...ALL_EXAMS] },
  { id: "cloze", name: "Cloze Test", allowedExams: [...ALL_EXAMS] },
  { id: "reference", name: "Reference (Pronoun)", allowedExams: [...ALL_EXAMS] },
  { id: "author_view", name: "Author's View", allowedExams: [...ALL_EXAMS] },
  { id: "matching_headings", name: "Matching Headings", allowedExams: [...ALL_EXAMS] },
  { id: "matching_information", name: "Matching Information", allowedExams: [...ALL_EXAMS] },
  { id: "summary_completion", name: "Summary Completion", allowedExams: [...ALL_EXAMS] },
  { id: "matching_pairs", name: "Matching Pairs", allowedExams: ["IELTS", "TOEFL", "GOETHE", "DELE", "TOPIK"] },
  { id: "error_recognition", name: "Error Recognition", allowedExams: ["TOEFL", "HSK", "TOPIK", "TOAFL"] },
  { id: "text_insertion", name: "Text Insertion", allowedExams: ["TOEFL", "IELTS"] },
  { id: "kanji_reading", name: "Kanji Reading", allowedExams: ["JLPT"] },
  { id: "particle_choice", name: "Particle / Conjunction Choice", allowedExams: ["JLPT", "TOPIK"] },
  { id: "article_case", name: "Article / Gender / Agreement", allowedExams: ["GOETHE", "TOAFL", "DELE"] },
  { id: "character_reading", name: "Character Reading", allowedExams: ["HSK", "TOPIK"] },
  { id: "sentence_arrangement", name: "Sentence Arrangement", allowedExams: ["HSK", "TOPIK", "DELE", "TOAFL"] },
  { id: "situational_judgment", name: "Situational Judgment (TKP)", allowedExams: ["CPNS"] },
];

export const TOPICS = [
  "Science & Tech", "Business", "Sociology", "Arts", "History", "Environment", "Health", "Education",
  "Daily Interaction", "Social Etiquette", "Workplace",
];

export const CPNS_TOPICS = {
  TIU: ["Sinonim & Antonim", "Analogi", "Deret Angka", "Aritmatika", "Perbandingan", "Silogisme", "Logika Posisi", "Diagram Venn"],
  TWK: ["Pancasila", "UUD 1945", "NKRI", "Bhinneka Tunggal Ika", "Sejarah Indonesia", "Sistem Pemerintahan", "HAM"],
  TKP: ["Pelayanan Publik", "Jejaring Kerja", "Sosial Budaya", "Profesionalisme", "Anti-Radikalisme", "Teknologi Informasi"],
};

export const DIFFICULTIES = ["Beginner", "Elementary", "Intermediate", "Advanced", "Expert"];

export const QUESTION_COUNT_PRESETS = [
  { value: 5, label: "5 Soal", desc: "Drill cepat" },
  { value: 10, label: "10 Soal", desc: "Latihan fokus" },
  { value: 20, label: "20 Soal", desc: "Mini test" },
  { value: 40, label: "40 Soal", desc: "Full test" },
];
