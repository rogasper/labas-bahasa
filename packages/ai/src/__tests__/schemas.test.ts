import { describe, expect, it } from "bun:test";
import {
  examTypeSchema,
  sectionTypeSchema,
  questionFormatSchema,
  difficultySchema,
  questionSchema,
  generationInputSchema,
  generationResultSchema,
  multipleChoiceQuestionSchema,
  trueFalseQuestionSchema,
} from "../schemas";

const base = {
  passageText: "A".repeat(50),
  questionText: "B".repeat(10),
  correctAnswer: "A",
  explanation: "Explanation text",
  difficulty: 3,
  skillTags: ["reading"],
};

describe("examTypeSchema", () => {
  it("accepts valid exam types", () => {
    expect(examTypeSchema.parse("IELTS")).toBe("IELTS");
    expect(examTypeSchema.parse("TOEFL")).toBe("TOEFL");
    expect(examTypeSchema.parse("JLPT")).toBe("JLPT");
  });

  it("rejects invalid exam type", () => {
    expect(() => examTypeSchema.parse("GRE")).toThrow();
  });
});

describe("sectionTypeSchema", () => {
  it("accepts valid sections", () => {
    expect(sectionTypeSchema.parse("READING")).toBe("READING");
    expect(sectionTypeSchema.parse("LISTENING")).toBe("LISTENING");
  });

  it("rejects invalid section", () => {
    expect(() => sectionTypeSchema.parse("MATH")).toThrow();
  });
});

describe("questionFormatSchema", () => {
  it("accepts all 20 format variants", () => {
    const formats = [
      "multiple_choice", "true_false_not_given", "matching_headings",
      "matching_information", "matching_pairs", "fill_blank",
      "synonym", "grammar_in_context", "sentence_completion",
      "summary_completion", "cloze", "reference", "author_view",
      "error_recognition", "text_insertion", "kanji_reading",
      "particle_choice", "article_case", "character_reading",
      "sentence_arrangement",
    ];
    for (const f of formats) {
      expect(questionFormatSchema.parse(f)).toBe(f);
    }
  });
});

describe("difficultySchema", () => {
  it("accepts values 1-5", () => {
    for (let i = 1; i <= 5; i++) {
      expect(difficultySchema.parse(i)).toBe(i);
    }
  });

  it("rejects values outside 1-5", () => {
    expect(() => difficultySchema.parse(0)).toThrow();
    expect(() => difficultySchema.parse(6)).toThrow();
  });

  it("rejects non-integer", () => {
    expect(() => difficultySchema.parse(2.5)).toThrow();
  });
});

describe("multipleChoiceQuestionSchema", () => {
  it("accepts valid multiple choice", () => {
    const data = {
      ...base,
      format: "multiple_choice",
      options: [
        { key: "A", text: "Option A" },
        { key: "B", text: "Option B" },
      ],
    };
    const parsed = multipleChoiceQuestionSchema.parse(data);
    expect(parsed.format).toBe("multiple_choice");
    expect(parsed.options).toHaveLength(2);
  });

  it("rejects fewer than 2 options", () => {
    expect(() =>
      multipleChoiceQuestionSchema.parse({
        ...base,
        format: "multiple_choice",
        options: [{ key: "A", text: "Only option" }],
      })
    ).toThrow();
  });

  it("rejects more than 6 options", () => {
    expect(() =>
      multipleChoiceQuestionSchema.parse({
        ...base,
        format: "multiple_choice",
        options: "ABCDEFG".split("").map((k) => ({ key: k, text: `Option ${k}` })),
      })
    ).toThrow();
  });
});

describe("trueFalseQuestionSchema", () => {
  it("accepts TRUE answer", () => {
    const data = { ...base, format: "true_false_not_given", correctAnswer: "TRUE" };
    expect(trueFalseQuestionSchema.parse(data).correctAnswer).toBe("TRUE");
  });

  it("accepts FALSE answer", () => {
    const data = { ...base, format: "true_false_not_given", correctAnswer: "FALSE" };
    expect(trueFalseQuestionSchema.parse(data).correctAnswer).toBe("FALSE");
  });

  it("accepts NOT_GIVEN answer", () => {
    const data = { ...base, format: "true_false_not_given", correctAnswer: "NOT_GIVEN" };
    expect(trueFalseQuestionSchema.parse(data).correctAnswer).toBe("NOT_GIVEN");
  });

  it("rejects invalid answer", () => {
    expect(() =>
      trueFalseQuestionSchema.parse({ ...base, format: "true_false_not_given", correctAnswer: "MAYBE" })
    ).toThrow();
  });
});

describe("questionSchema (discriminated union)", () => {
  it("parses a valid multiple_choice question", () => {
    const data = {
      ...base,
      format: "multiple_choice",
      options: [
        { key: "A", text: "Option A" },
        { key: "B", text: "Option B" },
        { key: "C", text: "Option C" },
        { key: "D", text: "Option D" },
      ],
    };
    expect(() => questionSchema.parse(data)).not.toThrow();
  });

  it("parses a valid true_false_not_given question", () => {
    const data = { ...base, format: "true_false_not_given", correctAnswer: "TRUE" };
    expect(() => questionSchema.parse(data)).not.toThrow();
  });

  it("parses a valid fill_blank question (no options needed)", () => {
    const data = { ...base, format: "fill_blank", correctAnswer: "the answer" };
    expect(() => questionSchema.parse(data)).not.toThrow();
  });

  it("rejects mismatched format — correctAnswer 'TRUE' on non-TFNG format", () => {
    // A fill_blank with answer "TRUE" should still parse (it's just a string)
    const data = { ...base, format: "fill_blank", correctAnswer: "TRUE" };
    expect(() => questionSchema.parse(data)).not.toThrow();
  });

  it("rejects missing required options for multiple_choice", () => {
    expect(() =>
      questionSchema.parse({ ...base, format: "multiple_choice" })
    ).toThrow();
  });

  it("rejects unknown format", () => {
    expect(() =>
      questionSchema.parse({ ...base, format: "unknown_format" as any })
    ).toThrow();
  });

  it("rejects passageText shorter than 50 chars", () => {
    expect(() =>
      questionSchema.parse({
        ...base,
        format: "fill_blank",
        passageText: "too short",
        correctAnswer: "ans",
      })
    ).toThrow();
  });

  it("rejects skillTags with empty array", () => {
    expect(() =>
      questionSchema.parse({
        ...base,
        format: "fill_blank",
        skillTags: [],
        correctAnswer: "ans",
      })
    ).toThrow();
  });
});

describe("generationInputSchema", () => {
  it("accepts valid generation input", () => {
    const data = {
      examType: "IELTS",
      section: "READING",
      formats: ["multiple_choice", "true_false_not_given"],
      difficulty: 3,
      topics: ["education", "technology"],
      questionCount: 10,
      mode: "quick",
      apiKeyConfig: {
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-test",
        model: "gpt-4",
      },
    };
    expect(() => generationInputSchema.parse(data)).not.toThrow();
  });

  it("rejects questionCount over 40", () => {
    expect(() =>
      generationInputSchema.parse({
        examType: "IELTS",
        section: "READING",
        formats: ["multiple_choice"],
        difficulty: 3,
        topics: ["education"],
        questionCount: 100,
        apiKeyConfig: {
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-test",
          model: "gpt-4",
        },
      })
    ).toThrow();
  });
});

describe("generationResultSchema", () => {
  it("accepts valid generation result", () => {
    const data = {
      questions: [
        {
          ...base,
          format: "multiple_choice",
          options: [
            { key: "A", text: "Op A" },
            { key: "B", text: "Op B" },
          ],
        },
      ],
      meta: {
        model: "gpt-4",
        tokensUsed: 500,
        durationMs: 1234,
        mode: "quick",
      },
    };
    expect(() => generationResultSchema.parse(data)).not.toThrow();
  });
});
