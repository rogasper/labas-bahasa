export const DIFFICULTY_LABELS: Record<string, string[]> = {
  IELTS:  ["Band 4.0", "Band 5.0", "Band 5.5", "Band 6.5", "Band 8.0+"],
  TOEFL:  ["30-45", "46-55", "56-65", "66-80", "81-120"],
  JLPT:   ["N5", "N4", "N3", "N2", "N1"],
  HSK:    ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5-6"],
  GOETHE: ["A1", "A2", "B1", "B2", "C1-C2"],
  TOPIK:  ["TOPIK I (Lv 1)", "TOPIK I (Lv 2)", "TOPIK II (Lv 3)", "TOPIK II (Lv 4)", "TOPIK II (Lv 5-6)"],
  TOAFL:  ["A1", "A2", "B1", "B2", "C1-C2"],
  DELE:   ["A1", "A2", "B1", "B2", "C1-C2"],
  CPNS:   ["Sangat Mudah", "Mudah", "Sedang", "Sulit", "Sangat Sulit"],
};

export function getDifficultyLabel(examType: string, level: number): string {
  const labels = DIFFICULTY_LABELS[examType];
  if (!labels) return `Level ${level}`;
  const idx = Math.max(0, Math.min(level - 1, labels.length - 1));
  return labels[idx];
}
