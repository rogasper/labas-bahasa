import { describe, expect, it } from "bun:test";
import { TRPCError } from "@trpc/server";
import { assertOwnership } from "../ownership";

describe("assertOwnership", () => {
  const userId = "user-123";

  it("throws NOT_FOUND when row is null", () => {
    try {
      assertOwnership(null, userId);
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("NOT_FOUND");
      expect((err as TRPCError).message).toBe("Resource not found");
    }
  });

  it("throws NOT_FOUND when row is undefined", () => {
    try {
      assertOwnership(undefined, userId);
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("NOT_FOUND");
    }
  });

  it("throws NOT_FOUND with custom resource name", () => {
    try {
      assertOwnership(null, userId, "Question");
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("NOT_FOUND");
      expect((err as TRPCError).message).toBe("Question not found");
    }
  });

  it("throws FORBIDDEN when creatorUserId does not match", () => {
    try {
      assertOwnership({ creatorUserId: "other-user" }, userId);
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("throws FORBIDDEN when creatorUserId is null and userId is provided", () => {
    try {
      assertOwnership({ creatorUserId: null }, userId);
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("does not throw when creatorUserId matches userId", () => {
    expect(() => assertOwnership({ creatorUserId: userId }, userId)).not.toThrow();
  });
});
