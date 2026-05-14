import { describe, expect, it } from "bun:test";
import { TRPCError } from "@trpc/server";
import {
  throwUnauthorized,
  throwForbidden,
  throwNotFound,
  throwBadRequest,
  throwInternal,
} from "../errors";

function expectThrowsTRPCError(fn: () => never, code: string, message: string) {
  try {
    fn();
    expect.unreachable("Should have thrown");
  } catch (err) {
    expect(err).toBeInstanceOf(TRPCError);
    const trpcErr = err as TRPCError;
    expect(trpcErr.code).toBe(code);
    expect(trpcErr.message).toBe(message);
  }
}

describe("throwUnauthorized", () => {
  it("throws UNAUTHORIZED with default message", () => {
    expectThrowsTRPCError(throwUnauthorized, "UNAUTHORIZED", "Unauthorized");
  });

  it("throws UNAUTHORIZED with custom message", () => {
    expectThrowsTRPCError(() => throwUnauthorized("Custom message"), "UNAUTHORIZED", "Custom message");
  });
});

describe("throwForbidden", () => {
  it("throws FORBIDDEN with default message", () => {
    expectThrowsTRPCError(throwForbidden, "FORBIDDEN", "Forbidden");
  });

  it("throws FORBIDDEN with custom message", () => {
    expectThrowsTRPCError(() => throwForbidden("Access denied"), "FORBIDDEN", "Access denied");
  });
});

describe("throwNotFound", () => {
  it("throws NOT_FOUND with default resource message", () => {
    expectThrowsTRPCError(throwNotFound, "NOT_FOUND", "Resource not found");
  });

  it("throws NOT_FOUND with custom resource name", () => {
    expectThrowsTRPCError(() => throwNotFound("Question"), "NOT_FOUND", "Question not found");
  });
});

describe("throwBadRequest", () => {
  it("throws BAD_REQUEST with default message", () => {
    expectThrowsTRPCError(throwBadRequest, "BAD_REQUEST", "Bad request");
  });

  it("throws BAD_REQUEST with custom message", () => {
    expectThrowsTRPCError(() => throwBadRequest("Invalid input"), "BAD_REQUEST", "Invalid input");
  });
});

describe("throwInternal", () => {
  it("throws INTERNAL_SERVER_ERROR with default message", () => {
    expectThrowsTRPCError(throwInternal, "INTERNAL_SERVER_ERROR", "Internal server error");
  });

  it("throws INTERNAL_SERVER_ERROR with custom message", () => {
    expectThrowsTRPCError(() => throwInternal("DB connection failed"), "INTERNAL_SERVER_ERROR", "DB connection failed");
  });
});
