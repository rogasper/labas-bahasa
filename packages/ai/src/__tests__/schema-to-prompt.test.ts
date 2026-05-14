import { describe, expect, it } from "bun:test";
import {
  getQuestionJsonSchemaDescription,
  getPassageJsonSchemaDescription,
  getValidationJsonSchemaDescription,
  getQuestionsArrayJsonSchemaDescription,
  getSelfValidationJsonSchemaDescription,
} from "../schema-to-prompt";

describe("getQuestionJsonSchemaDescription", () => {
  it("returns valid JSON string", () => {
    const result = getQuestionJsonSchemaDescription();
    expect(typeof result).toBe("string");
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("contains oneOf with all question format variants", () => {
    const result = JSON.parse(getQuestionJsonSchemaDescription());
    expect(Array.isArray(result.oneOf)).toBe(true);
    expect(result.oneOf.length).toBeGreaterThanOrEqual(20);
  });

  it("first variant has question properties", () => {
    const result = JSON.parse(getQuestionJsonSchemaDescription());
    const firstProps = result.oneOf[0].properties;
    expect(firstProps.format).toBeDefined();
    expect(firstProps.passageText).toBeDefined();
    expect(firstProps.questionText).toBeDefined();
    expect(firstProps.correctAnswer).toBeDefined();
    expect(firstProps.explanation).toBeDefined();
  });
});

describe("getPassageJsonSchemaDescription", () => {
  it("returns valid JSON with passage schema", () => {
    const result = JSON.parse(getPassageJsonSchemaDescription());
    expect(result.required).toEqual(["title", "passage"]);
    expect(result.properties.title).toBeDefined();
    expect(result.properties.passage).toBeDefined();
  });
});

describe("getValidationJsonSchemaDescription", () => {
  it("returns valid JSON with validation schema", () => {
    const result = JSON.parse(getValidationJsonSchemaDescription());
    expect(result.required).toEqual(["isValid", "feedback", "score"]);
    expect(result.properties.score.minimum).toBe(1);
    expect(result.properties.score.maximum).toBe(10);
  });
});

describe("getQuestionsArrayJsonSchemaDescription", () => {
  it("returns valid JSON with questions array", () => {
    const result = JSON.parse(getQuestionsArrayJsonSchemaDescription());
    expect(result.required).toEqual(["questions"]);
    expect(result.properties.questions.type).toBe("array");
  });
});

describe("getSelfValidationJsonSchemaDescription", () => {
  it("returns valid JSON with self-validation schema", () => {
    const result = JSON.parse(getSelfValidationJsonSchemaDescription());
    expect(result.required).toEqual(["overallConfidence", "issues", "needsRevision"]);
    expect(result.properties.overallConfidence.minimum).toBe(0);
    expect(result.properties.overallConfidence.maximum).toBe(100);
  });
});
