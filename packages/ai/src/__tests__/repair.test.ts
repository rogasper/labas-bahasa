import { describe, expect, it } from "bun:test";
import {
  repairQuestion,
  repairAndParseQuestions,
  tryParseQuestion,
} from "../repair";

const fullPassage = "A".repeat(200);

const baseRaw = {
  format: "multiple_choice",
  passageText: fullPassage,
  questionText: "What is the main idea of the passage?",
  options: [
    { key: "A", text: "First option" },
    { key: "B", text: "Second option" },
    { key: "C", text: "Third option" },
    { key: "D", text: "Fourth option" },
  ],
  correctAnswer: "A",
  explanation: "This is the correct answer because...",
  difficulty: 3,
  skillTags: ["comprehension"],
};

describe("repairQuestion", () => {
  it("passes through a valid question unchanged", () => {
    const { question, wasRepaired } = repairQuestion(baseRaw, fullPassage);
    expect(question.format).toBe("multiple_choice");
    expect(question.correctAnswer).toBe("A");
    expect(wasRepaired).toBe(false);
  });

  it("replaces missing passageText with fullPassage", () => {
    const raw = { ...baseRaw, passageText: "" };
    const { question, wasRepaired, repairNotes } = repairQuestion(raw, fullPassage);
    expect(question.passageText).toBe(fullPassage);
    expect(wasRepaired).toBe(true);
    expect(repairNotes).toContainEqual(expect.stringContaining("passageText"));
  });

  it("replaces too-short questionText with fallback", () => {
    const raw = { ...baseRaw, questionText: "" };
    const { question, wasRepaired } = repairQuestion(raw, fullPassage);
    expect(question.questionText).toBeTruthy();
    expect(wasRepaired).toBe(true);
  });

  it("adds fallback explanation when missing", () => {
    const raw = { ...baseRaw, explanation: "" };
    const { question, wasRepaired } = repairQuestion(raw, fullPassage);
    expect(question.explanation).toBe("Penjelasan tidak tersedia.");
    expect(wasRepaired).toBe(true);
  });

  it("adds fallback skillTags when missing", () => {
    const raw = { ...baseRaw, skillTags: [] };
    const { question, wasRepaired } = repairQuestion(raw, fullPassage);
    expect(question.skillTags).toEqual(["comprehension"]);
    expect(wasRepaired).toBe(true);
  });

  it("clamps invalid difficulty to 3", () => {
    const raw = { ...baseRaw, difficulty: 99 };
    const { question } = repairQuestion(raw, fullPassage);
    expect(question.difficulty).toBe(3);
  });

  it("throws when raw is not an object", () => {
    expect(() => repairQuestion(null, fullPassage)).toThrow("Question is not an object");
    expect(() => repairQuestion("string", fullPassage)).toThrow("Question is not an object");
    expect(() => repairQuestion(42, fullPassage)).toThrow("Question is not an object");
  });
});

describe("coerceCorrectAnswer — true_false_not_given", () => {
  it("coerces T to TRUE", () => {
    const raw = { ...baseRaw, format: "true_false_not_given", correctAnswer: "T" };
    const { question } = repairQuestion(raw, fullPassage);
    expect(question.correctAnswer).toBe("TRUE");
  });

  it("coerces F to FALSE", () => {
    const raw = { ...baseRaw, format: "true_false_not_given", correctAnswer: "F" };
    const { question } = repairQuestion(raw, fullPassage);
    expect(question.correctAnswer).toBe("FALSE");
  });

  it("coerces NG to NOT_GIVEN", () => {
    const raw = { ...baseRaw, format: "true_false_not_given", correctAnswer: "NG" };
    const { question } = repairQuestion(raw, fullPassage);
    expect(question.correctAnswer).toBe("NOT_GIVEN");
  });

  it("coerces lowercase true to TRUE", () => {
    const raw = { ...baseRaw, format: "true_false_not_given", correctAnswer: "true" };
    const { question } = repairQuestion(raw, fullPassage);
    expect(question.correctAnswer).toBe("TRUE");
  });
});

describe("coerceCorrectAnswer — author_view", () => {
  it("coerces Y to YES", () => {
    const raw = { ...baseRaw, format: "author_view", correctAnswer: "Y" };
    const { question } = repairQuestion(raw, fullPassage);
    expect(question.correctAnswer).toBe("YES");
  });

  it("coerces N to NO", () => {
    const raw = { ...baseRaw, format: "author_view", correctAnswer: "N" };
    const { question } = repairQuestion(raw, fullPassage);
    expect(question.correctAnswer).toBe("NO");
  });
});

describe("coerceCorrectAnswer — multiple_choice with invalid key", () => {
  it("falls back to first option key when answer key does not match", () => {
    const raw = {
      ...baseRaw,
      format: "multiple_choice",
      correctAnswer: "Z",
      options: [
        { key: "A", text: "First" },
        { key: "B", text: "Second" },
      ],
    };
    const { question } = repairQuestion(raw, fullPassage);
    expect(question.correctAnswer).toBe("A");
  });

  it("normalizes answer key case", () => {
    const raw = {
      ...baseRaw,
      format: "multiple_choice",
      correctAnswer: "a",
      options: [
        { key: "A", text: "First" },
        { key: "B", text: "Second" },
      ],
    };
    const { question } = repairQuestion(raw, fullPassage);
    expect(question.correctAnswer).toBe("A");
  });
});

describe("ensureOptions", () => {
  it("injects placeholder options when missing for multiple_choice", () => {
    const raw = {
      ...baseRaw,
      format: "multiple_choice",
      options: [],
    };
    const { question, wasRepaired } = repairQuestion(raw, fullPassage);
    expect(question.options).toHaveLength(4);
    expect(wasRepaired).toBe(true);
  });

  it("deduplicates options by key", () => {
    const raw = {
      ...baseRaw,
      format: "multiple_choice",
      options: [
        { key: "A", text: "First" },
        { key: "A", text: "Duplicate A" },
        { key: "B", text: "Second" },
      ],
    };
    const { question } = repairQuestion(raw, fullPassage);
    expect(question.options).toHaveLength(2);
  });
});

describe("repairAndParseQuestions", () => {
  it("returns valid questions from well-formed input", () => {
    const result = repairAndParseQuestions([baseRaw], fullPassage);
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(0);
  });

  it("repairs and processes mixed valid/invalid questions", () => {
    const raw = [
      baseRaw,
      { format: "multiple_choice", passageText: "", questionText: "", correctAnswer: "", explanation: "", difficulty: 99, skillTags: [] },
    ];
    const result = repairAndParseQuestions(raw, fullPassage);
    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(0);
    expect(result.repairLog.length).toBeGreaterThan(0);
  });

  it("captures invalid questions that remain unparseable after repair", () => {
    const raw = [
      { format: "unknown_format", passageText: "", questionText: "" },  // Will fail repair entirely
    ];
    // First entry will fail during repairQuestion because format might cause issues
    // Actually it won't crash but unknown format won't match discriminated union
    const result = repairAndParseQuestions(raw, fullPassage);
    expect(result.invalid).toHaveLength(1);
    expect(result.valid).toHaveLength(0);
  });
});

describe("tryParseQuestion", () => {
  it("parses a valid generic question", () => {
    const generic = {
      ...baseRaw,
      passageText: fullPassage,
    };
    const result = tryParseQuestion(generic as any);
    expect(result).not.toBeNull();
    expect(result!.format).toBe("multiple_choice");
  });

  it("returns null for invalid question", () => {
    const result = tryParseQuestion({ format: "unknown_format" } as any);
    expect(result).toBeNull();
  });
});
