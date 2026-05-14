import { describe, expect, it } from "bun:test";
import { DIFFICULTY_LABELS, getDifficultyLabel } from "../difficulty-mapping";

describe("DIFFICULTY_LABELS", () => {
  it("has entries for all 8 exam types", () => {
    const expected = ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE", "TOPIK", "TOAFL", "DELE"];
    expect(Object.keys(DIFFICULTY_LABELS)).toEqual(expected);
  });

  it("each exam has exactly 5 difficulty levels", () => {
    for (const [exam, labels] of Object.entries(DIFFICULTY_LABELS)) {
      expect(labels).toHaveLength(5);
    }
  });
});

describe("getDifficultyLabel", () => {
  it("returns correct label for IELTS level 1", () => {
    expect(getDifficultyLabel("IELTS", 1)).toBe("Band 4.0");
  });

  it("returns correct label for IELTS level 5", () => {
    expect(getDifficultyLabel("IELTS", 5)).toBe("Band 8.0+");
  });

  it("returns correct label for JLPT level 3", () => {
    expect(getDifficultyLabel("JLPT", 3)).toBe("N3");
  });

  it("clamps level below 1", () => {
    expect(getDifficultyLabel("IELTS", 0)).toBe("Band 4.0");
  });

  it("clamps level above 5", () => {
    expect(getDifficultyLabel("IELTS", 99)).toBe("Band 8.0+");
  });

  it("returns fallback for unknown exam types", () => {
    expect(getDifficultyLabel("UNKNOWN", 3)).toBe("Level 3");
    expect(getDifficultyLabel("GRE", 1)).toBe("Level 1");
  });
});
