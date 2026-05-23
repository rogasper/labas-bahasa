import { describe, expect, it } from "bun:test";
import {
  getQuestionLanguageErrors,
  isLikelyIndonesianContent,
  getTargetLanguage,
  getExplanationLanguageErrors,
} from "../language-rules";

describe("language-rules", () => {
  it("detects Indonesian question text for JLPT", () => {
    const errors = getQuestionLanguageErrors(
      {
        questionText: "Menurut paragraf tersebut, apakah pernyataan berikut benar?",
        options: [
          { key: "A", text: "はい、正しいです" },
          { key: "B", text: "いいえ、違います" },
        ],
      },
      "JLPT",
    );
    expect(errors.some((e) => e.includes("questionText"))).toBe(true);
  });

  it("accepts Japanese question text for JLPT", () => {
    const errors = getQuestionLanguageErrors(
      {
        questionText: "この文章によると、筆者の主張として正しいものはどれか。",
        options: [
          { key: "A", text: "環境問題は深刻化している" },
          { key: "B", text: "経済成長だけが重要だ" },
        ],
      },
      "JLPT",
    );
    expect(errors).toHaveLength(0);
  });

  it("flags Indonesian options", () => {
    expect(isLikelyIndonesianContent("Pilihan yang benar menurut teks")).toBe(true);
  });

  it("returns Japanese for JLPT", () => {
    expect(getTargetLanguage("JLPT")).toBe("Japanese");
  });

  it("accepts mixed Indonesian + Japanese in explanation", () => {
    const errors = getExplanationLanguageErrors(
      "Jawaban A benar karena kata 環境(かんきょう) di paragraf kedua merujuk pada lingkungan hidup.",
    );
    expect(errors).toHaveLength(0);
  });

  it("rejects explanation with only Japanese and no Indonesian prose", () => {
    const errors = getExplanationLanguageErrors(
      "この文章によると、正しい答えはAです。",
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects English-only explanation", () => {
    const errors = getExplanationLanguageErrors(
      "The correct answer is A because the passage clearly states the main idea.",
    );
    expect(errors.some((e) => e.includes("Bahasa Indonesia"))).toBe(true);
  });
});
