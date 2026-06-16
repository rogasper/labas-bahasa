import { describe, expect, it } from "bun:test";
import { EXAM_TYPES, SECTIONS, FORMATS, DIFFICULTIES } from "../exam-constants";

describe("EXAM_TYPES", () => {
  it("has 9 exam types", () => {
    expect(EXAM_TYPES).toHaveLength(9);
  });

  it("each entry has id and name", () => {
    for (const exam of EXAM_TYPES) {
      expect(exam).toHaveProperty("id");
      expect(exam).toHaveProperty("name");
      expect(typeof exam.id).toBe("string");
      expect(typeof exam.name).toBe("string");
    }
  });

  it("includes all expected exams", () => {
    const ids = EXAM_TYPES.map((e) => e.id);
    expect(ids).toContain("IELTS");
    expect(ids).toContain("TOEFL");
    expect(ids).toContain("JLPT");
    expect(ids).toContain("HSK");
    expect(ids).toContain("GOETHE");
    expect(ids).toContain("TOPIK");
    expect(ids).toContain("TOAFL");
    expect(ids).toContain("DELE");
    expect(ids).toContain("CPNS");
  });

  it("has no duplicate IDs", () => {
    const ids = EXAM_TYPES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("SECTIONS", () => {
  it("has 5 sections", () => {
    expect(SECTIONS).toHaveLength(5);
  });

  it("includes READING, WRITING, TIU, TWK, TKP", () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(ids).toContain("READING");
    expect(ids).toContain("WRITING");
    expect(ids).toContain("TIU");
    expect(ids).toContain("TWK");
    expect(ids).toContain("TKP");
  });
});

describe("FORMATS", () => {
  it("has 21 question formats", () => {
    expect(FORMATS).toHaveLength(21);
  });

  it("has no duplicates", () => {
    expect(new Set(FORMATS).size).toBe(FORMATS.length);
  });
});

describe("DIFFICULTIES", () => {
  it("has 5 levels", () => {
    expect(DIFFICULTIES).toHaveLength(5);
  });

  it("has values 1-5", () => {
    DIFFICULTIES.forEach((d, i) => {
      expect(d.value).toBe(i + 1);
    });
  });
});
