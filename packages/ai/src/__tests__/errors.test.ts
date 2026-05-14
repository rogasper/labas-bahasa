import { describe, expect, it } from "bun:test";
import { GenerationError } from "../errors";

describe("GenerationError", () => {
  it("creates error with just a message", () => {
    const err = new GenerationError("Something went wrong");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("GenerationError");
    expect(err.message).toBe("Something went wrong");
    expect(err.tokensUsed).toBeUndefined();
    expect(err.partialResult).toBeUndefined();
  });

  it("creates error with tokensUsed", () => {
    const err = new GenerationError("Failed", { tokensUsed: 150 });
    expect(err.tokensUsed).toBe(150);
  });

  it("creates error with partialResult", () => {
    const partial = { questions: [{ format: "multiple_choice" }] };
    const err = new GenerationError("Partial", { partialResult: partial });
    expect(err.partialResult).toEqual(partial);
  });
});
