import { describe, expect, it } from "bun:test";
import { formatLabel } from "../format";

describe("formatLabel", () => {
  it("converts snake_case to Title Case", () => {
    expect(formatLabel("multiple_choice")).toBe("Multiple Choice");
    expect(formatLabel("true_false_not_given")).toBe("True False Not Given");
  });

  it("handles single word", () => {
    expect(formatLabel("cloze")).toBe("Cloze");
  });

  it("handles empty string", () => {
    expect(formatLabel("")).toBe("");
  });

  it("handles already spaced string", () => {
    expect(formatLabel("multiple choice")).toBe("Multiple Choice");
  });
});
