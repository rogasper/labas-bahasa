export const CPNS_DEFAULT_EXAM = "CPNS";

export const CPNS_SECTIONS = ["TIU", "TWK", "TKP"] as const;
export type CpnsSection = (typeof CPNS_SECTIONS)[number];

export const CPNS_SECTION_NAMES: Record<string, string> = {
  TIU: "Tes Intelegensi Umum",
  TWK: "Tes Wawasan Kebangsaan",
  TKP: "Tes Karakteristik Pribadi",
};

export const CPNS_SECTION_DESCRIPTIONS: Record<string, string> = {
  TIU: "Verbal, numerik, dan logika",
  TWK: "Wawasan kebangsaan dan Pancasila",
  TKP: "Karakteristik dan perilaku pribadi",
};

export const CPNS_SECTION_ICONS: Record<string, string> = {
  TIU: "psychology",
  TWK: "gavel",
  TKP: "diversity_3",
};

export const CPNS_SECTION_CONFIG: Record<string, { questionCount: number; durationMin: number; maxScore: number; targetScore: number; format: string }> = {
  TIU: { questionCount: 35, durationMin: 50, maxScore: 175, targetScore: 150, format: "multiple_choice" },
  TWK: { questionCount: 30, durationMin: 25, maxScore: 150, targetScore: 85, format: "multiple_choice" },
  TKP: { questionCount: 45, durationMin: 25, maxScore: 225, targetScore: 200, format: "situational_judgment" },
};

export const CPNS_FULL_TEST = {
  totalQuestions: 110,
  totalDurationMin: 100,
  totalMaxScore: 550,
  totalTargetScore: 435,
};

export const CPNS_DURATION_MIN = 100;

export const CPNS_DRILL_PRESETS = [
  { value: 5, label: "5 Soal", desc: "Drill cepat" },
  { value: 15, label: "15 Soal", desc: "Latihan fokus" },
];

export const CPNS_FULL_PRESETS: Record<string, { value: number; label: string; desc: string }[]> = {
  TIU: [
    { value: 5, label: "5 Soal", desc: "Drill cepat" },
    { value: 15, label: "15 Soal", desc: "Latihan fokus" },
    { value: 35, label: "35 Soal", desc: "Full TIU" },
  ],
  TWK: [
    { value: 5, label: "5 Soal", desc: "Drill cepat" },
    { value: 15, label: "15 Soal", desc: "Latihan fokus" },
    { value: 30, label: "30 Soal", desc: "Full TWK" },
  ],
  TKP: [
    { value: 5, label: "5 Soal", desc: "Drill cepat" },
    { value: 15, label: "15 Soal", desc: "Latihan fokus" },
    { value: 45, label: "45 Soal", desc: "Full TKP" },
  ],
};

export const CPNS_DIFFICULTY_LABELS = ["Sangat Mudah", "Mudah", "Sedang", "Sulit", "Sangat Sulit"];

export const CPNS_SECTION_FORMATS: Record<string, string[]> = {
  TIU: ["multiple_choice"],
  TWK: ["multiple_choice", "true_false_not_given"],
  TKP: ["situational_judgment"],
};

export const CPNS_SECTION_TOPICS: Record<string, string[]> = {
  TIU: ["Sinonim & Antonim", "Analogi", "Deret Angka", "Aritmatika", "Perbandingan", "Silogisme", "Logika Posisi", "Diagram Venn"],
  TWK: ["Pancasila", "UUD 1945", "NKRI", "Bhinneka Tunggal Ika", "Sejarah Indonesia", "Sistem Pemerintahan", "HAM"],
  TKP: ["Pelayanan Publik", "Jejaring Kerja", "Sosial Budaya", "Profesionalisme", "Anti-Radikalisme", "Teknologi Informasi"],
};

export const CPNS_SECTION_COLORS: Record<string, { bg: string; text: string; bgOnly: string }> = {
  TIU: { bg: "bg-[var(--matcha-300)]", text: "text-[var(--matcha-800)]", bgOnly: "bg-[var(--matcha-300)]" },
  TWK: { bg: "bg-[var(--slushie-500)]/30", text: "text-[var(--slushie-800)]", bgOnly: "bg-[var(--slushie-500)]/30" },
  TKP: { bg: "bg-[var(--lemon-400)]/50", text: "text-[var(--lemon-800)]", bgOnly: "bg-[var(--lemon-400)]/50" },
};
