import { describe, expect, it } from "bun:test";
import { isSignUpDuplicateError } from "../signup-errors";

describe("isSignUpDuplicateError", () => {
  it("detects already-exists style messages", () => {
    expect(isSignUpDuplicateError({ error: { message: "User already exists" } })).toBe(true);
    expect(isSignUpDuplicateError({ error: { message: "Email already registered" } })).toBe(true);
  });

  it("detects conflict status codes", () => {
    expect(isSignUpDuplicateError({ error: { status: 409 } })).toBe(true);
    expect(isSignUpDuplicateError({ error: { status: 422 } })).toBe(true);
  });

  it("does not flag unrelated errors", () => {
    expect(isSignUpDuplicateError({ error: { message: "Invalid password" } })).toBe(false);
    expect(isSignUpDuplicateError({ error: { status: 500 } })).toBe(false);
  });
});
