import { describe, expect, it } from "bun:test";
import { SQL } from "drizzle-orm";
import { paginationSchema, paginateDefaults, countSql } from "../pagination";

describe("paginationSchema", () => {
  it("parses valid input with defaults", () => {
    const result = paginationSchema.parse({});
    expect(result).toEqual({ limit: 20, offset: 0 });
  });

  it("parses with custom limit and offset", () => {
    const result = paginationSchema.parse({ limit: 10, offset: 5 });
    expect(result).toEqual({ limit: 10, offset: 5 });
  });

  it("rejects limit below minimum", () => {
    expect(() => paginationSchema.parse({ limit: 0 })).toThrow();
  });

  it("rejects limit above maximum", () => {
    expect(() => paginationSchema.parse({ limit: 100 })).toThrow();
  });

  it("rejects negative offset", () => {
    expect(() => paginationSchema.parse({ offset: -1 })).toThrow();
  });
});

describe("paginateDefaults", () => {
  it("returns defaults when input is undefined", () => {
    expect(paginateDefaults()).toEqual({ limit: 20, offset: 0 });
  });

  it("returns defaults when input is empty", () => {
    expect(paginateDefaults({})).toEqual({ limit: 20, offset: 0 });
  });

  it("uses provided limit", () => {
    expect(paginateDefaults({ limit: 5 })).toEqual({ limit: 5, offset: 0 });
  });

  it("uses provided offset", () => {
    expect(paginateDefaults({ offset: 10 })).toEqual({ limit: 20, offset: 10 });
  });
});

describe("countSql", () => {
  it("returns a SQL instance", () => {
    const result = countSql("*");
    expect(result).toBeInstanceOf(SQL);
  });
});
