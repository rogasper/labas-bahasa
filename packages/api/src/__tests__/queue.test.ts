import { describe, expect, it, beforeAll } from "bun:test";

let GenerationJobCancelledError: any,
    computeSectionSplit: any,
    splitIntoShards: any,
    normalizeQuestions: any,
    runWithConcurrency: any,
    decryptInputFromDb: any;

beforeAll(async () => {
  process.env.DATABASE_URL = "postgres://localhost:5432/test";
  process.env.BETTER_AUTH_SECRET = "a".repeat(32);
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.API_KEY_ENCRYPTION_KEY = "z".repeat(32);
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.SMTP_HOST = "localhost";
  process.env.SMTP_USER = "test";
  process.env.SMTP_PASS = "test";
  process.env.SMTP_FROM = "test@test.com";

  const mod = await import("../queue");
  GenerationJobCancelledError = mod.GenerationJobCancelledError;
  computeSectionSplit = mod.computeSectionSplit;
  splitIntoShards = mod.splitIntoShards;
  normalizeQuestions = mod.normalizeQuestions;
  runWithConcurrency = mod.runWithConcurrency;
  decryptInputFromDb = mod.decryptInputFromDb;
});

describe("GenerationJobCancelledError", () => {
  it("creates error with correct name", () => {
    const err = new GenerationJobCancelledError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("GenerationJobCancelledError");
    expect(err.message).toBe("JOB_CANCELLED");
  });
});

describe("computeSectionSplit", () => {
  it("returns single section when no sections selected", () => {
    const result = computeSectionSplit([], 10);
    expect(result).toEqual([{ section: "READING", count: 10 }]);
  });

  it("returns single section when count < 20 even with multiple sections", () => {
    const result = computeSectionSplit(["READING", "LISTENING"], 15);
    expect(result).toEqual([{ section: "READING", count: 15 }]);
  });

  it("distributes evenly when count >= 20 and multiple sections", () => {
    const result = computeSectionSplit(["READING", "LISTENING"], 20);
    expect(result).toHaveLength(2);
    expect(result[0]!).toEqual({ section: "READING", count: 10 });
    expect(result[1]!).toEqual({ section: "LISTENING", count: 10 });
  });

  it("distributes remainder (first section gets extra)", () => {
    const result = computeSectionSplit(["READING", "LISTENING", "WRITING"], 22);
    expect(result).toHaveLength(3);
    expect(result[0]!).toEqual({ section: "READING", count: 8 });  // 7 + 1
    expect(result[1]!).toEqual({ section: "LISTENING", count: 7 }); // 7 + 1
    expect(result[2]!).toEqual({ section: "WRITING", count: 7 });   // 7
  });

  it("handles single section with high count", () => {
    const result = computeSectionSplit(["READING"], 40);
    expect(result).toEqual([{ section: "READING", count: 40 }]);
  });
});

describe("splitIntoShards", () => {
  it("creates one shard when count <= max per shard", () => {
    const result = splitIntoShards([{ section: "READING", count: 5 }]);
    expect(result).toHaveLength(1);
    expect(result[0]!).toMatchObject({
      section: "READING", count: 5, sectionIndex: 0, shardIndex: 0, shardCount: 1,
    });
  });

  it("splits into multiple shards when count exceeds max", () => {
    const result = splitIntoShards([{ section: "READING", count: 20 }]);
    expect(result).toHaveLength(4); // ceil(20/6) = 4
    expect(result[0]!.count).toBe(6);
    expect(result[3]!.count).toBe(2); // last shard has remainder
    result.forEach((shard) => {
      expect(shard.section).toBe("READING");
      expect(shard.shardCount).toBe(4);
    });
  });

  it("handles multiple sections with sharding", () => {
    const result = splitIntoShards([
      { section: "READING", count: 10 },
      { section: "LISTENING", count: 10 },
    ]);
    expect(result).toHaveLength(4); // ceil(10/6) + ceil(10/6) = 2 + 2
    expect(result[0]!.section).toBe("READING");
    expect(result[0]!.sectionIndex).toBe(0);
    expect(result[2]!.section).toBe("LISTENING");
    expect(result[2]!.sectionIndex).toBe(1);
  });
});

describe("normalizeQuestions", () => {
  const model = "gpt-4";

  it("transforms GenerationResult questions to PersistableQuestion", () => {
    const result = {
      questions: [{
        format: "multiple_choice",
        passageText: "A".repeat(50),
        questionText: "Question?",
        options: [{ key: "A", text: "Opt" }],
        correctAnswer: "A",
        explanation: "Because",
        difficulty: 3,
        skillTags: ["reading"],
      }],
      meta: { model, tokensUsed: 100, durationMs: 1000, mode: "quick" as const },
    };

    const normalized = normalizeQuestions("READING", model, result as any);
    expect(normalized).toHaveLength(1);
    expect(normalized[0]!).toMatchObject({
      section: "READING",
      format: "multiple_choice",
      correctAnswer: "A",
      difficulty: 3,
      aiModel: model,
    });
  });

  it("sets options to null when not present", () => {
    const result = {
      questions: [{
        format: "fill_blank",
        passageText: "A".repeat(50),
        questionText: "Fill ___",
        correctAnswer: "answer",
        explanation: "explain",
        difficulty: 2,
        skillTags: ["grammar"],
      }],
      meta: { model, tokensUsed: 50, durationMs: 500, mode: "quick" as const },
    };

    const normalized = normalizeQuestions("READING", model, result as any);
    expect(normalized[0]!.options).toBeNull();
  });

  it("turns off isCaseSensitive on correctAnswer when caseSensitive is false", () => {
    const result = {
      questions: [{
        isCaseSensitive: false,
        format: "fill_blank",
        passageText: "A".repeat(50),
        questionText: "Fill ___",
        correctAnswer: "Answer",
        explanation: "explain",
        difficulty: 2,
        skillTags: ["grammar"],
      }],
      meta: { model, tokensUsed: 50, durationMs: 500, mode: "quick" as const },
    };

    const normalized = normalizeQuestions("READING", model, result as any);
    expect(normalized[0]!.correctAnswer).toBe("Answer");
  });
});

describe("runWithConcurrency", () => {
  it("processes all items with concurrency", async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await runWithConcurrency(items, 3, async (item) => item * 2);
    expect(results).toEqual([2, 4, 6, 8, 10]);
  });

  it("maintains order of results", async () => {
    const items = ["a", "b", "c"];
    const results = await runWithConcurrency(items, 2, async (item, idx) => `${item}-${idx}`);
    expect(results).toEqual(["a-0", "b-1", "c-2"]);
  });

  it("handles empty array", async () => {
    const results = await runWithConcurrency([], 3, async (item) => item);
    expect(results).toEqual([]);
  });

  it("propagates errors from worker", async () => {
    const items = [1, 2, 3];
    expect(
      runWithConcurrency(items, 2, async (item) => {
        if (item === 2) throw new Error("Item 2 failed");
        return item;
      }),
    ).rejects.toThrow("Item 2 failed");
  });
});

describe("decryptInputFromDb", () => {
  it("passes through unencrypted apiKey (legacy data)", () => {
    const input = {
      examType: "IELTS",
      section: "READING",
      apiKeyConfig: {
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-legacy-key",
        model: "gpt-4",
      },
    };
    const result = decryptInputFromDb(input as any);
    expect(result.apiKeyConfig.apiKey).toBe("sk-legacy-key");
  });

  it("handles missing apiKey in config", () => {
    const input = {
      examType: "IELTS",
      section: "READING",
      apiKeyConfig: {
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4",
      },
    };
    const result = decryptInputFromDb(input as any);
    expect(result.apiKeyConfig.apiKey).toBeUndefined();
  });
});
