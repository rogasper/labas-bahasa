import { describe, expect, it, beforeAll, afterAll, mock } from "bun:test";
import { eq } from "drizzle-orm";
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

describe("package router", () => {
  let packageRouter: any;
  let caller: any;
  let protectedCaller: any;
  let testDb: any;
  let ownerId: string;
  let pkgId: string;
  let sectionId: string;
  let questionId: string;

  beforeAll(async () => {
    const pg = await getTestPGlite();
    testDb = drizzle(pg, { schema });

    mock.module("@labas/db", () => ({
      __esModule: true,
      ...schema,
      db: testDb,
    }));

    await testDb.insert(schema.examType).values([
      { id: "IELTS", name: "IELTS", language: "English" },
    ]);
    await testDb.insert(schema.sectionType).values([
      { id: "READING", name: "Reading" },
      { id: "WRITING", name: "Writing" },
    ]);

    ownerId = "pkg-owner";
    await testDb.insert(schema.user).values({ id: ownerId, name: "Owner", email: "owner@test.com" });

    const mod = await import("../routers/package");
    packageRouter = mod.packageRouter;

    caller = packageRouter.createCaller({ session: null, auth: null });
    protectedCaller = packageRouter.createCaller({
      session: { user: { id: ownerId }, expiresAt: new Date() },
      auth: null,
    });
  });

  afterAll(async () => {
    await closeTestPGlite();
  });

  it("create makes a new package", async () => {
    const result = await protectedCaller.create({
      title: "My IELTS Pack",
      examTypeId: "IELTS",
      isPublic: false,
    });
    expect(result).toHaveProperty("id");
    expect(result.title).toBe("My IELTS Pack");
    pkgId = result.id;
  });

  it("getById returns package with sections", async () => {
    const result = await protectedCaller.getById({ id: pkgId });
    expect(result).not.toBeNull();
    expect(result.title).toBe("My IELTS Pack");
    expect(result.sections).toEqual([]);
  });

  it("getById returns null for non-existent", async () => {
    const { randomUUID } = await import("node:crypto");
    const result = await caller.getById({ id: randomUUID() });
    expect(result).toBeNull();
  });

  it("list returns public packages", async () => {
    // Make it public first
    await testDb.update(schema.testPackage).set({ isPublic: true }).where(eq(schema.testPackage.id, pkgId));

    const result = await caller.list();
    expect(result.packages.length).toBeGreaterThan(0);
    expect(result.packages[0].id).toBe(pkgId);

    // Set back to private for upcoming tests
    await testDb.update(schema.testPackage).set({ isPublic: false }).where(eq(schema.testPackage.id, pkgId));
  });

  it("list hides private packages from anonymous users", async () => {
    const result = await caller.list();
    const ids = result.packages.map((p: any) => p.id);
    expect(ids).not.toContain(pkgId);
  });

  it("list shows private packages to owner via auth", async () => {
    const result = await protectedCaller.list();
    const ids = result.packages.map((p: any) => p.id);
    expect(ids).toContain(pkgId);
  });

  it("list filters by examTypeId", async () => {
    await testDb.update(schema.testPackage).set({ isPublic: true }).where(eq(schema.testPackage.id, pkgId));
    const result = await caller.list({ examTypeId: "TOEFL" });
    expect(result.packages).toHaveLength(0);
  });

  it("update changes package fields", async () => {
    const result = await protectedCaller.update({
      id: pkgId,
      title: "Updated Pack",
    });
    expect(result.title).toBe("Updated Pack");
  });

  it("update rejects non-owner", async () => {
    const otherCaller = packageRouter.createCaller({
      session: { user: { id: "other-user" }, expiresAt: new Date() },
      auth: null,
    });
    expect(otherCaller.update({ id: pkgId, title: "Hacked" })).rejects.toThrow("Forbidden");
  });

  it("addSection creates a section", async () => {
    const result = await protectedCaller.addSection({
      packageId: pkgId,
      sectionTypeId: "READING",
      title: "Reading Section",
      orderIndex: 0,
    });
    expect(result).toHaveProperty("id");
    sectionId = result.id;
  });

  it("addSection rejects non-owner", async () => {
    const otherCaller = packageRouter.createCaller({
      session: { user: { id: "other-user" }, expiresAt: new Date() },
      auth: null,
    });
    expect(otherCaller.addSection({ packageId: pkgId, sectionTypeId: "READING", title: "X" })).rejects.toThrow("Forbidden");
  });

  it("getById includes sections after adding", async () => {
    const result = await caller.getById({ id: pkgId });
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].sectionTypeId).toBe("READING");
  });

  it("addQuestion adds question to section", async () => {
    const [q] = await testDb.insert(schema.question).values({
      examTypeId: "IELTS", sectionTypeId: "READING", format: "multiple_choice",
      passageText: "Q".repeat(60), questionText: "Test?",
      options: [{ key: "A", text: "A" }, { key: "B", text: "B" }],
      correctAnswer: "A", explanation: "Exp", difficulty: 1,
      skillTags: ["test"], creatorUserId: ownerId, isPublic: true,
    }).returning();
    questionId = q.id;

    const result = await protectedCaller.addQuestion({
      sectionId,
      questionId: q.id,
      orderIndex: 0,
    });
    expect(result).toHaveProperty("id");
  });

  it("getById shows questions for owner, strips answers for guests", async () => {
    const ownerResult = await protectedCaller.getById({ id: pkgId });
    const section = ownerResult.sections.find((s: any) => s.id === sectionId);
    expect(section.questions).toHaveLength(1);
    expect(section.questions[0].correctAnswer).toBe("A");

    const guestResult = await caller.getById({ id: pkgId });
    const guestSection = guestResult.sections.find((s: any) => s.id === sectionId);
    expect(guestSection.questions[0].correctAnswer).toBeUndefined();
  });

  it("myPackages returns owned packages", async () => {
    const result = await protectedCaller.myPackages();
    expect(result.packages.length).toBeGreaterThan(0);
    const ids = result.packages.map((p: any) => p.id);
    expect(ids).toContain(pkgId);
  });

  it("featured returns empty when no featured packages", async () => {
    const result = await caller.featured();
    expect(result).toEqual([]);
  });

  it("trending returns public packages sorted by usage", async () => {
    await testDb.update(schema.testPackage).set({ isPublic: true }).where(eq(schema.testPackage.id, pkgId));
    const result = await caller.trending();
    expect(result.length).toBeGreaterThan(0);
  });

  it("removeQuestion removes question from section", async () => {
    const sq = await protectedCaller.addQuestion({
      sectionId, questionId, orderIndex: 0,
    });
    const result = await protectedCaller.removeQuestion({ sectionQuestionId: sq.id });
    expect(result.success).toBe(true);
  });

  it("removeSection removes section", async () => {
    const result = await protectedCaller.removeSection({ sectionId });
    expect(result.success).toBe(true);
  });

  it("delete removes package", async () => {
    const result = await protectedCaller.delete({ id: pkgId });
    expect(result.success).toBe(true);

    const fetched = await caller.getById({ id: pkgId });
    expect(fetched).toBeNull();
  });
});
