import { describe, expect, it } from "bun:test";
import { SQL } from "drizzle-orm";
import { buildVisibilityCondition } from "../visibility";

const mockTable = {
  isPublic: { name: "isPublic" } as any,
  creatorUserId: { name: "creatorUserId" } as any,
};

describe("buildVisibilityCondition", () => {
  it("returns SQL condition when no userId (public only)", () => {
    const result = buildVisibilityCondition(mockTable);
    expect(result).toBeInstanceOf(SQL);
  });

  it("returns SQL condition when userId provided (public or own)", () => {
    const result = buildVisibilityCondition(mockTable, "user-123");
    expect(result).toBeInstanceOf(SQL);
  });
});
