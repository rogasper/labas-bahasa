import { describe, expect, it, beforeAll, afterAll, mock } from "bun:test";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../../db/src/schema";
import { closeTestPGlite, getTestPGlite } from "./test-setup";

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

describe("attempt router", () => {
  let attemptRouter: any;
  let packageId: string;
  let questionIds: string[];
  let testDb: any;

  function makeCaller(userId: string) {
    return attemptRouter.createCaller({
      session: { user: { id: userId }, expiresAt: new Date() },
      auth: null,
    });
  }

  async function createUserAndCaller(label: string) {
    const id = `user-${label}-${Date.now()}`;
    await testDb.insert(schema.user).values({ id, name: `User ${label}`, email: `${label}@test.com` });
    return { id, caller: makeCaller(id) };
  }

  beforeAll(async () => {
    const pg = await getTestPGlite();
    testDb = drizzle(pg, { schema });

    mock.module("@labas/db", () => ({
      __esModule: true,
      ...schema,
      db: testDb,
    }));

    const mod = await import("../routers/attempt");
    attemptRouter = mod.attemptRouter;

    await testDb.insert(schema.examType).values([
      { id: "IELTS", name: "IELTS", language: "English" },
    ]);

    await testDb.insert(schema.sectionType).values([
      { id: "READING", name: "Reading" },
    ]);

    const ownerId = "owner-id";
    await testDb.insert(schema.user).values({ id: ownerId, name: "Owner", email: "owner@test.com" });
    const [pkg] = await testDb.insert(schema.testPackage).values({
      title: "IELTS Reading Test",
      examTypeId: "IELTS",
      creatorUserId: ownerId,
      isPublic: true,
    }).returning();
    packageId = pkg.id;

    const [sec] = await testDb.insert(schema.packageSection).values({
      packageId: pkg.id,
      sectionTypeId: "READING",
      title: "Reading Section",
      orderIndex: 0,
    }).returning();

    const qs = await testDb.insert(schema.question).values([
      {
        examTypeId: "IELTS", sectionTypeId: "READING", format: "multiple_choice",
        passageText: "P".repeat(60), questionText: "What is the main idea?",
        options: [{ key: "A", text: "Option A" }, { key: "B", text: "Option B" }, { key: "C", text: "Option C" }, { key: "D", text: "Option D" }],
        correctAnswer: "A", explanation: "Because A is correct", difficulty: 2,
        skillTags: ["main_idea"], creatorUserId: ownerId, isPublic: true,
      },
      {
        examTypeId: "IELTS", sectionTypeId: "READING", format: "true_false_not_given",
        passageText: "P".repeat(60), questionText: "The author states that...",
        correctAnswer: "TRUE", explanation: "It says so", difficulty: 2,
        skillTags: ["detail"], creatorUserId: ownerId, isPublic: true,
      },
      {
        examTypeId: "IELTS", sectionTypeId: "READING", format: "fill_blank",
        passageText: "P".repeat(60), questionText: "The answer is ___",
        correctAnswer: "paradigm", explanation: "Context clue", difficulty: 3,
        skillTags: ["vocabulary"], creatorUserId: ownerId, isPublic: true,
      },
    ]).returning();
    questionIds = qs.map((q: any) => q.id);

    await testDb.insert(schema.sectionQuestion).values([
      { sectionId: sec.id, questionId: qs[0]!.id, orderIndex: 0 },
      { sectionId: sec.id, questionId: qs[1]!.id, orderIndex: 1 },
      { sectionId: sec.id, questionId: qs[2]!.id, orderIndex: 2 },
    ]);
  });

  afterAll(async () => {
    await closeTestPGlite();
  });

  it("start creates a new attempt", async () => {
    const { caller } = await createUserAndCaller("start");
    const result = await caller.start({ packageId });
    expect(result).toHaveProperty("attemptId");
  });

  it("start rejects duplicate in-progress attempt", { timeout: 15000 }, async () => {
    const { caller } = await createUserAndCaller("dup");
    await caller.start({ packageId });
    await Bun.sleep(3100); // wait for rate limit window (3000ms)
    expect(caller.start({ packageId })).rejects.toThrow("sedang berjalan");
  });

  it("getById returns attempt with sections and questions", async () => {
    const { caller } = await createUserAndCaller("getid");
    const { attemptId } = await caller.start({ packageId });
    const result = await caller.getById({ id: attemptId });
    expect(result.status).toBe("in_progress");
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].questions).toHaveLength(3);
  });

  it("getById strips correctAnswer during in_progress", async () => {
    const { caller } = await createUserAndCaller("strip");
    const { attemptId } = await caller.start({ packageId });
    const result = await caller.getById({ id: attemptId });
    for (const s of result.sections) {
      for (const q of s.questions) {
        expect(q.correctAnswer).toBeUndefined();
        expect(q.explanation).toBeUndefined();
      }
    }
  });

  it("submitAnswer stores user answer", async () => {
    const { caller } = await createUserAndCaller("submit");
    const { attemptId } = await caller.start({ packageId });
    const attempt = await caller.getById({ id: attemptId });
    const sectionResultId = attempt.sections[0].sectionResultId;

    const result = await caller.submitAnswer({
      attemptId, sectionResultId,
      questionId: questionIds[0]!, userAnswer: "A",
    });
    expect(result.success).toBe(true);
  });

  it("finish scores correct answers", { timeout: 30000 }, async () => {
    const { caller } = await createUserAndCaller("score");
    const { attemptId } = await caller.start({ packageId });
    await Bun.sleep(4500);
    const attempt = await caller.getById({ id: attemptId });
    const sectionResultId = attempt.sections[0].sectionResultId;

    await caller.submitAnswer({ attemptId, sectionResultId, questionId: questionIds[0]!, userAnswer: "A" });
    await Bun.sleep(600);
    await caller.submitAnswer({ attemptId, sectionResultId, questionId: questionIds[1]!, userAnswer: "FALSE" });
    await Bun.sleep(600);
    await caller.submitAnswer({ attemptId, sectionResultId, questionId: questionIds[2]!, userAnswer: "wrong" });

    const result = await caller.finish({ attemptId });
    expect(result.totalScore).toBe(1);
    expect(result.maxScore).toBe(3);
    expect(result.percentage).toBe(33);
  });

  it("finish rejects attempts under 5 seconds", async () => {
    const { caller } = await createUserAndCaller("fastfinish");
    const { attemptId } = await caller.start({ packageId });
    expect(caller.finish({ attemptId })).rejects.toThrow("terlalu cepat");
  });

  it("getActiveAttempt returns in-progress attempt", async () => {
    const { caller } = await createUserAndCaller("active");
    const { attemptId } = await caller.start({ packageId });
    const result = await caller.getActiveAttempt({ packageId });
    expect(result).not.toBeNull();
    expect(result.id).toBe(attemptId);
    expect(result.status).toBe("in_progress");
  });

  it("abandon marks attempt as abandoned", async () => {
    const { caller } = await createUserAndCaller("abandon");
    const { attemptId } = await caller.start({ packageId });
    const result = await caller.abandon({ attemptId });
    expect(result.success).toBe(true);
  });

  it("myAttempts returns paginated list", async () => {
    const { caller } = await createUserAndCaller("mylist");
    await caller.start({ packageId });
    const result = await caller.myAttempts();
    expect(result.attempts.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });
});
