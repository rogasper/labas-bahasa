import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../../db/src/schema";

let _pg: PGlite | null = null;

export async function getTestPGlite() {
  if (!_pg) {
    _pg = new PGlite();
    await initSchema(_pg);
  }
  return _pg;
}

export async function closeTestPGlite() {
  if (_pg) {
    await _pg.close();
    _pg = null;
  }
}

async function initSchema(pg: PGlite) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS "user" (id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE, email_verified boolean DEFAULT false NOT NULL, image text, created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "session" (id text PRIMARY KEY, expires_at timestamp NOT NULL, token text NOT NULL UNIQUE, created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL, ip_address text, user_agent text, user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "account" (id text PRIMARY KEY, account_id text NOT NULL, provider_id text NOT NULL, user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, access_token text, refresh_token text, id_token text, access_token_expires_at timestamp, refresh_token_expires_at timestamp, scope text, password text, created_at timestamp DEFAULT now() NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "verification" (id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, expires_at timestamp NOT NULL, created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "exam_type" (id text PRIMARY KEY, name text NOT NULL, language text NOT NULL, description text)`,
    `CREATE TABLE IF NOT EXISTS "section_type" (id text PRIMARY KEY, name text NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "question" (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, exam_type_id text NOT NULL REFERENCES exam_type(id) ON DELETE CASCADE, section_type_id text NOT NULL REFERENCES section_type(id) ON DELETE CASCADE, format text NOT NULL, passage_text text NOT NULL, question_text text NOT NULL, options jsonb, correct_answer text NOT NULL, explanation text, difficulty integer DEFAULT 3 NOT NULL, skill_tags text[] DEFAULT '{}', is_case_sensitive boolean DEFAULT false NOT NULL, source text DEFAULT 'manual' NOT NULL, ai_model text, ai_prompt_used text, creator_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, is_public boolean DEFAULT false NOT NULL, usage_count integer DEFAULT 0 NOT NULL, avg_rating integer, created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "test_package" (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, title text NOT NULL, description text, exam_type_id text NOT NULL REFERENCES exam_type(id) ON DELETE CASCADE, creator_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, is_public boolean DEFAULT false NOT NULL, total_questions integer DEFAULT 0 NOT NULL, total_sections integer DEFAULT 0 NOT NULL, estimated_duration_min integer, usage_count integer DEFAULT 0 NOT NULL, avg_rating integer, is_featured boolean DEFAULT false NOT NULL, created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "package_section" (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, package_id uuid NOT NULL REFERENCES test_package(id) ON DELETE CASCADE, section_type_id text NOT NULL REFERENCES section_type(id) ON DELETE CASCADE, title text NOT NULL, order_index integer DEFAULT 0 NOT NULL, created_at timestamp DEFAULT now() NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "section_question" (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, section_id uuid NOT NULL REFERENCES package_section(id) ON DELETE CASCADE, question_id uuid NOT NULL REFERENCES question(id) ON DELETE CASCADE, order_index integer DEFAULT 0 NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "test_attempt" (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, package_id uuid REFERENCES test_package(id) ON DELETE SET NULL, combo_id uuid, started_at timestamp DEFAULT now() NOT NULL, finished_at timestamp, total_score integer, max_score integer, status text DEFAULT 'in_progress' NOT NULL, created_at timestamp DEFAULT now() NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "section_result" (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, attempt_id uuid NOT NULL REFERENCES test_attempt(id) ON DELETE CASCADE, section_type_id text NOT NULL REFERENCES section_type(id) ON DELETE CASCADE, score integer, max_score integer, time_spent_sec integer, created_at timestamp DEFAULT now() NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "answer" (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, section_result_id uuid NOT NULL REFERENCES section_result(id) ON DELETE CASCADE, question_id uuid NOT NULL REFERENCES question(id) ON DELETE CASCADE, user_answer text, is_correct boolean, partial_score integer, time_spent_sec integer, created_at timestamp DEFAULT now() NOT NULL)`,
  ];

  for (const sql of tables) {
    await pg.exec(sql);
  }
}

export async function createTestUserData() {
  const pg = await getTestPGlite();
  const db = drizzle(pg, { schema });

  const [user1] = await db.insert(schema.user).values({
    id: "user-1", name: "Test User", email: "test@test.com",
  }).returning();

  const [user2] = await db.insert(schema.user).values({
    id: "user-2", name: "Other User", email: "other@test.com",
  }).returning();

  await db.insert(schema.examType).values([
    { id: "IELTS", name: "IELTS", language: "English" },
    { id: "TOEFL", name: "TOEFL", language: "English" },
  ]);

  await db.insert(schema.sectionType).values([
    { id: "READING", name: "Reading" },
    { id: "WRITING", name: "Writing" },
    { id: "LISTENING", name: "Listening" },
  ]);

  await db.insert(schema.question).values([
    {
      examTypeId: "IELTS", sectionTypeId: "READING", format: "multiple_choice",
      passageText: "A".repeat(100), questionText: "What is X?",
      options: [{ key: "A", text: "Opt A" }, { key: "B", text: "Opt B" }],
      correctAnswer: "A", explanation: "Test", difficulty: 3,
      skillTags: ["comprehension"], creatorUserId: user1.id, isPublic: true,
    },
  ]);

  await db.insert(schema.testPackage).values({
    id: "00000000-0000-0000-0000-000000000001",
    title: "Test Package", examTypeId: "IELTS",
    creatorUserId: user1.id, isPublic: true,
  });

  return { user1, user2 };
}
