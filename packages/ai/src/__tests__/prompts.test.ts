import { describe, expect, it } from "bun:test";
import { buildQuickModePrompt } from "../prompts";
import type { GenerationInput } from "../schemas";

const baseInput = {
  examType: "IELTS" as const,
  section: "READING" as const,
  formats: ["multiple_choice", "true_false_not_given"],
  difficulty: 3,
  topics: ["education", "technology"],
  questionCount: 10,
  mode: "quick" as const,
  apiKeyConfig: {
    baseUrl: "https://api.openai.com/v1",
    apiKey: "sk-test",
    model: "gpt-4",
    maxTokens: 16384,
  },
} satisfies GenerationInput;

describe("buildQuickModePrompt", () => {
  it("returns a string", () => {
    const prompt = buildQuickModePrompt(baseInput);
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("contains exam type, section, difficulty, topics, formats", () => {
    const prompt = buildQuickModePrompt(baseInput);
    expect(prompt).toContain("IELTS");
    expect(prompt).toContain("READING");
    expect(prompt).toContain("3/5");
    expect(prompt).toContain("education, technology");
    expect(prompt).toContain("multiple_choice, true_false_not_given");
  });

  it("includes question count", () => {
    const prompt = buildQuickModePrompt(baseInput);
    expect(prompt).toContain("Generate 10");
  });

  it("sets language to English for IELTS", () => {
    const prompt = buildQuickModePrompt(baseInput);
    expect(prompt).toContain("English");
  });

  it("sets language to Japanese for JLPT", () => {
    const prompt = buildQuickModePrompt({
      ...baseInput,
      examType: "JLPT",
    });
    expect(prompt).toContain("Japanese");
  });

  it("sets language to Chinese for HSK", () => {
    const prompt = buildQuickModePrompt({
      ...baseInput,
      examType: "HSK",
    });
    expect(prompt).toContain("Chinese");
  });

  it("sets language to German for GOETHE", () => {
    const prompt = buildQuickModePrompt({
      ...baseInput,
      examType: "GOETHE",
    });
    expect(prompt).toContain("German");
  });

  it("sets language to Korean for TOPIK", () => {
    const prompt = buildQuickModePrompt({
      ...baseInput,
      examType: "TOPIK",
    });
    expect(prompt).toContain("Korean");
  });

  it("sets language to Arabic for TOAFL", () => {
    const prompt = buildQuickModePrompt({
      ...baseInput,
      examType: "TOAFL",
    });
    expect(prompt).toContain("Arabic");
  });

  it("sets language to Spanish for DELE", () => {
    const prompt = buildQuickModePrompt({
      ...baseInput,
      examType: "DELE",
    });
    expect(prompt).toContain("Spanish");
  });

  it("includes instruction about explanation language (Bahasa Indonesia)", () => {
    const prompt = buildQuickModePrompt(baseInput);
    expect(prompt).toContain("Bahasa Indonesia");
  });

  it("includes JSON schema in output", () => {
    const prompt = buildQuickModePrompt(baseInput);
    expect(prompt).toContain("JSON");
    expect(prompt).toContain("questions");
  });

  it("includes TOPIK-specific instructions for Korean", () => {
    const prompt = buildQuickModePrompt({ ...baseInput, examType: "TOPIK" });
    expect(prompt).toContain("particles");
    expect(prompt).toContain("honorifics");
  });

  it("includes TOAFL-specific instructions for Arabic", () => {
    const prompt = buildQuickModePrompt({ ...baseInput, examType: "TOAFL" });
    expect(prompt).toContain("I'rab");
    expect(prompt).toContain("RTL");
  });

  it("includes DELE-specific instructions for Spanish", () => {
    const prompt = buildQuickModePrompt({ ...baseInput, examType: "DELE" });
    expect(prompt).toContain("verb conjugation");
  });
});
