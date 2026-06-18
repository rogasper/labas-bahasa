import { describe, expect, it } from "bun:test";
import {
  EXAM_TYPES,
  SECTIONS,
  FORMATS,
  TOPICS,
  DIFFICULTIES,
  QUESTION_COUNT_PRESETS,
} from "../generate-constants";

describe("EXAM_TYPES", () => {
  it("has 9 exam types", () => {
    expect(EXAM_TYPES).toHaveLength(9);
  });

  it("each entry has id, name, and code", () => {
    for (const exam of EXAM_TYPES) {
      expect(exam).toHaveProperty("id");
      expect(exam).toHaveProperty("name");
      expect(exam).toHaveProperty("code");
    }
  });

  it("has no duplicate IDs", () => {
    const ids = EXAM_TYPES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("SECTIONS", () => {
  it("has 5 sections with id, name, icon, and allowedExams", () => {
    expect(SECTIONS).toHaveLength(5);
    for (const s of SECTIONS) {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("icon");
      expect(s).toHaveProperty("allowedExams");
      expect(Array.isArray(s.allowedExams)).toBe(true);
    }
  });

  it("READING and WRITING are allowed for all language exams", () => {
    const langExams = ["IELTS", "TOEFL", "JLPT", "HSK", "GOETHE", "TOPIK", "TOAFL", "DELE"];
    for (const s of SECTIONS) {
      if (s.id === "READING" || s.id === "WRITING") {
        expect(s.allowedExams).toEqual(langExams);
      }
    }
  });

  it("TIU, TWK, TKP are allowed only for CPNS", () => {
    for (const s of SECTIONS) {
      if (s.id === "TIU" || s.id === "TWK" || s.id === "TKP") {
        expect(s.allowedExams).toEqual(["CPNS"]);
      }
    }
  });
});

describe("FORMATS", () => {
  it("has 21 question formats", () => {
    expect(FORMATS).toHaveLength(21);
  });

  it("each format has id, name, and allowedExams", () => {
    for (const f of FORMATS) {
      expect(f).toHaveProperty("id");
      expect(f).toHaveProperty("name");
      expect(f).toHaveProperty("allowedExams");
      expect(Array.isArray(f.allowedExams)).toBe(true);
    }
  });

  it("no duplicate format IDs", () => {
    const ids = FORMATS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("TOPICS", () => {
  it("has at least one topic", () => {
    expect(TOPICS.length).toBeGreaterThanOrEqual(1);
  });

  it("all topics are strings", () => {
    for (const t of TOPICS) {
      expect(typeof t).toBe("string");
    }
  });
});

describe("DIFFICULTIES", () => {
  it("has 5 difficulty strings", () => {
    expect(DIFFICULTIES).toHaveLength(5);
  });
});

describe("QUESTION_COUNT_PRESETS", () => {
  it("has 4 presets", () => {
    expect(QUESTION_COUNT_PRESETS).toHaveLength(4);
  });

  it("each preset has value, label, and desc", () => {
    for (const p of QUESTION_COUNT_PRESETS) {
      expect(p).toHaveProperty("value");
      expect(p).toHaveProperty("label");
      expect(p).toHaveProperty("desc");
    }
  });
});
