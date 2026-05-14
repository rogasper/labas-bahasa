import { describe, expect, it, beforeAll, afterAll, mock } from "bun:test";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../../db/src/schema";
import { closeTestPGlite, getTestPGlite, createTestUserData } from "./test-setup";

mock.module("@labas/env/server", () => ({
  env: {
    DATABASE_URL: "postgres://localhost:5432/test",
    BETTER_AUTH_SECRET: "a".repeat(32),
    BETTER_AUTH_URL: "http://localhost:3000",
    CORS_ORIGIN: "http://localhost:5173",
    API_KEY_ENCRYPTION_KEY: "z".repeat(32),
    REDIS_URL: "redis://localhost:6379",
    SMTP_HOST: "localhost",
    SMTP_USER: "test",
    SMTP_PASS: "test",
    SMTP_FROM: "test@test.com",
  },
}));

describe("question router", () => {
  let questionRouter: any;
  let user1: any;

  beforeAll(async () => {
    const pg = await getTestPGlite();
    const testDb = drizzle(pg, { schema });

    mock.module("@labas/db", () => ({
      __esModule: true,
      ...schema,
      db: testDb,
    }));

    const data = await createTestUserData();
    user1 = data.user1;

    const mod = await import("../routers/question");
    questionRouter = mod.questionRouter;
  });

  afterAll(async () => {
    await closeTestPGlite();
  });

  let caller: any;
  let protectedCaller: any;

  beforeAll(async () => {
    caller = questionRouter.createCaller({ session: null, auth: null });
    protectedCaller = questionRouter.createCaller({
      session: { user: { id: user1.id }, expiresAt: new Date() },
      auth: null,
    });
  });

  it("list returns public questions", async () => {
    const result = await caller.list();
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]).not.toHaveProperty("correctAnswer");
    expect(result.total).toBe(1);
  });

  it("list filters by examTypeId", async () => {
    const result = await caller.list({ examTypeId: "IELTS" });
    expect(result.questions).toHaveLength(1);
  });

  it("list returns empty when no match", async () => {
    const result = await caller.list({ examTypeId: "TOEFL" });
    expect(result.questions).toHaveLength(0);
  });

  it("getById returns null for non-existent question", async () => {
    const { randomUUID } = await import("node:crypto");
    const result = await caller.getById({ id: randomUUID() });
    expect(result).toBeNull();
  });

  it("create inserts a new question", async () => {
    const result = await protectedCaller.create({
      examTypeId: "IELTS",
      sectionTypeId: "READING",
      format: "fill_blank",
      passageText: "B".repeat(60),
      questionText: "What is the answer?",
      correctAnswer: "test answer",
      difficulty: 2,
      isCaseSensitive: false,
      skillTags: ["vocabulary"],
      isPublic: false,
    });
    expect(result).toHaveProperty("id");
    expect(result.format).toBe("fill_blank");
  });
});
