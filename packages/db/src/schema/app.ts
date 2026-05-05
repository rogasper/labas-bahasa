import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  jsonb,
  uuid,
  unique,
} from "drizzle-orm/pg-core";

// ── Reference / Lookup Tables ──────────────────────────────

export const examType = pgTable("exam_type", {
  id: text("id").primaryKey(), // e.g. "IELTS", "TOEFL", "JLPT", "HSK", "GOETHE"
  name: text("name").notNull(),
  language: text("language").notNull(), // e.g. "English", "Japanese"
  description: text("description"),
});

export const sectionType = pgTable("section_type", {
  id: text("id").primaryKey(), // e.g. "READING", "WRITING", "LISTENING", "SPEAKING"
  name: text("name").notNull(),
});

// ── Questions ──────────────────────────────────────────────

export const question = pgTable(
  "question",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    examTypeId: text("exam_type_id")
      .notNull()
      .references(() => examType.id, { onDelete: "cascade" }),
    sectionTypeId: text("section_type_id")
      .notNull()
      .references(() => sectionType.id, { onDelete: "cascade" }),
    // question format, e.g. "multiple_choice", "true_false_not_given", "matching", "fill_blank", "synonym", "cloze", "reference", "author_view", "sentence_completion", "summary_completion", "kanji_reading", "particle_choice", "article_case"
    format: text("format").notNull(),
    // the reading passage / context text
    passageText: text("passage_text").notNull(),
    // the actual question prompt
    questionText: text("question_text").notNull(),
    // array of options for multiple choice / matching
    options: jsonb("options"),
    // correct answer — could be an option key, text, or array for multiple correct
    correctAnswer: text("correct_answer").notNull(),
    // explanation shown after submission
    explanation: text("explanation"),
    // difficulty 1-5
    difficulty: integer("difficulty").notNull().default(3),
    // e.g. ["grammar", "vocabulary", "inference", "main_idea", "detail"]
    skillTags: text("skill_tags").array().default([]),
    source: text("source").notNull().default("manual"), // "ai" | "manual"
    aiModel: text("ai_model"),
    aiPromptUsed: text("ai_prompt_used"),
    creatorUserId: text("creator_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isPublic: boolean("is_public").default(false).notNull(),
    usageCount: integer("usage_count").default(0).notNull(),
    avgRating: integer("avg_rating"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("question_examTypeId_idx").on(table.examTypeId),
    index("question_sectionTypeId_idx").on(table.sectionTypeId),
    index("question_creatorUserId_idx").on(table.creatorUserId),
    index("question_isPublic_idx").on(table.isPublic),
    index("question_format_idx").on(table.format),
    index("question_difficulty_idx").on(table.difficulty),
  ],
);

// ── Packages (Test Bundles) ────────────────────────────────

export const testPackage = pgTable(
  "test_package",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    examTypeId: text("exam_type_id")
      .notNull()
      .references(() => examType.id, { onDelete: "cascade" }),
    creatorUserId: text("creator_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isPublic: boolean("is_public").default(false).notNull(),
    totalQuestions: integer("total_questions").default(0).notNull(),
    totalSections: integer("total_sections").default(0).notNull(),
    estimatedDurationMin: integer("estimated_duration_min"),
    usageCount: integer("usage_count").default(0).notNull(),
    avgRating: integer("avg_rating"),
    isFeatured: boolean("is_featured").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("testPackage_examTypeId_idx").on(table.examTypeId),
    index("testPackage_creatorUserId_idx").on(table.creatorUserId),
    index("testPackage_isPublic_idx").on(table.isPublic),
  ],
);

export const packageSection = pgTable(
  "package_section",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => testPackage.id, { onDelete: "cascade" }),
    sectionTypeId: text("section_type_id")
      .notNull()
      .references(() => sectionType.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("packageSection_packageId_idx").on(table.packageId),
    index("packageSection_sectionTypeId_idx").on(table.sectionTypeId),
  ],
);

export const sectionQuestion = pgTable(
  "section_question",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => packageSection.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => question.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (table) => [
    unique("sectionQuestion_unique_idx").on(table.sectionId, table.questionId),
    index("sectionQuestion_sectionId_idx").on(table.sectionId),
  ],
);

// ── Combo Packages ─────────────────────────────────────────

export const comboPackage = pgTable(
  "combo_package",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    creatorUserId: text("creator_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isPublic: boolean("is_public").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("comboPackage_creatorUserId_idx").on(table.creatorUserId),
    index("comboPackage_isPublic_idx").on(table.isPublic),
  ],
);

export const comboSection = pgTable(
  "combo_section",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    comboId: uuid("combo_id")
      .notNull()
      .references(() => comboPackage.id, { onDelete: "cascade" }),
    sourcePackageId: uuid("source_package_id")
      .notNull()
      .references(() => testPackage.id, { onDelete: "cascade" }),
    sourceSectionId: uuid("source_section_id")
      .notNull()
      .references(() => packageSection.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (table) => [
    index("comboSection_comboId_idx").on(table.comboId),
    index("comboSection_sourcePackageId_idx").on(table.sourcePackageId),
  ],
);

// ── Test Attempts & Results ────────────────────────────────

export const testAttempt = pgTable(
  "test_attempt",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // could be either a package or a combo
    packageId: uuid("package_id").references(() => testPackage.id, { onDelete: "set null" }),
    comboId: uuid("combo_id").references(() => comboPackage.id, { onDelete: "set null" }),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
    totalScore: integer("total_score"),
    maxScore: integer("max_score"),
    status: text("status").notNull().default("in_progress"), // "in_progress" | "completed" | "abandoned"
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("testAttempt_userId_idx").on(table.userId),
    index("testAttempt_packageId_idx").on(table.packageId),
    index("testAttempt_status_idx").on(table.status),
  ],
);

export const sectionResult = pgTable(
  "section_result",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => testAttempt.id, { onDelete: "cascade" }),
    sectionTypeId: text("section_type_id")
      .notNull()
      .references(() => sectionType.id, { onDelete: "cascade" }),
    score: integer("score"),
    maxScore: integer("max_score"),
    timeSpentSec: integer("time_spent_sec"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("sectionResult_attemptId_idx").on(table.attemptId),
  ],
);

export const answer = pgTable(
  "answer",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sectionResultId: uuid("section_result_id")
      .notNull()
      .references(() => sectionResult.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => question.id, { onDelete: "cascade" }),
    userAnswer: text("user_answer"),
    isCorrect: boolean("is_correct"),
    timeSpentSec: integer("time_spent_sec"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("answer_unique_idx").on(table.sectionResultId, table.questionId),
    index("answer_questionId_idx").on(table.questionId),
  ],
);

// ── Question Ratings ───────────────────────────────────────

export const questionRating = pgTable(
  "question_rating",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => question.id, { onDelete: "cascade" }),
    score: integer("score").notNull(), // 1-5
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("questionRating_unique_idx").on(table.userId, table.questionId),
    index("questionRating_questionId_idx").on(table.questionId),
  ],
);

// ── Question Feedback (thumbs up/down) ─────────────────────

export const questionFeedback = pgTable(
  "question_feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => question.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "up" | "down"
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("questionFeedback_unique_idx").on(table.userId, table.questionId),
    index("questionFeedback_questionId_idx").on(table.questionId),
  ],
);

// ── Package Ratings ────────────────────────────────────────

export const packageRating = pgTable(
  "package_rating",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    packageId: uuid("package_id")
      .notNull()
      .references(() => testPackage.id, { onDelete: "cascade" }),
    score: integer("score").notNull(), // 1-5
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("packageRating_unique_idx").on(table.userId, table.packageId),
    index("packageRating_packageId_idx").on(table.packageId),
  ],
);

// ── Relations ──────────────────────────────────────────────

// Need user from auth.ts for relations
import { user } from "./auth";

export const questionRelations = relations(question, ({ one, many }) => ({
  examType: one(examType, {
    fields: [question.examTypeId],
    references: [examType.id],
  }),
  sectionType: one(sectionType, {
    fields: [question.sectionTypeId],
    references: [sectionType.id],
  }),
  creator: one(user, {
    fields: [question.creatorUserId],
    references: [user.id],
  }),
  sectionQuestions: many(sectionQuestion),
  ratings: many(questionRating),
  feedbacks: many(questionFeedback),
  answers: many(answer),
}));

export const examTypeRelations = relations(examType, ({ many }) => ({
  questions: many(question),
  packages: many(testPackage),
}));

export const sectionTypeRelations = relations(sectionType, ({ many }) => ({
  questions: many(question),
  packageSections: many(packageSection),
  sectionResults: many(sectionResult),
}));

export const testPackageRelations = relations(testPackage, ({ one, many }) => ({
  examType: one(examType, {
    fields: [testPackage.examTypeId],
    references: [examType.id],
  }),
  creator: one(user, {
    fields: [testPackage.creatorUserId],
    references: [user.id],
  }),
  sections: many(packageSection),
  comboSections: many(comboSection),
  attempts: many(testAttempt),
}));

export const packageSectionRelations = relations(packageSection, ({ one, many }) => ({
  package: one(testPackage, {
    fields: [packageSection.packageId],
    references: [testPackage.id],
  }),
  sectionType: one(sectionType, {
    fields: [packageSection.sectionTypeId],
    references: [sectionType.id],
  }),
  questions: many(sectionQuestion),
  comboSections: many(comboSection),
}));

export const sectionQuestionRelations = relations(sectionQuestion, ({ one }) => ({
  section: one(packageSection, {
    fields: [sectionQuestion.sectionId],
    references: [packageSection.id],
  }),
  question: one(question, {
    fields: [sectionQuestion.questionId],
    references: [question.id],
  }),
}));

export const comboPackageRelations = relations(comboPackage, ({ one, many }) => ({
  creator: one(user, {
    fields: [comboPackage.creatorUserId],
    references: [user.id],
  }),
  sections: many(comboSection),
  attempts: many(testAttempt),
}));

export const comboSectionRelations = relations(comboSection, ({ one }) => ({
  combo: one(comboPackage, {
    fields: [comboSection.comboId],
    references: [comboPackage.id],
  }),
  sourcePackage: one(testPackage, {
    fields: [comboSection.sourcePackageId],
    references: [testPackage.id],
  }),
  sourceSection: one(packageSection, {
    fields: [comboSection.sourceSectionId],
    references: [packageSection.id],
  }),
}));

export const testAttemptRelations = relations(testAttempt, ({ one, many }) => ({
  user: one(user, {
    fields: [testAttempt.userId],
    references: [user.id],
  }),
  package: one(testPackage, {
    fields: [testAttempt.packageId],
    references: [testPackage.id],
  }),
  combo: one(comboPackage, {
    fields: [testAttempt.comboId],
    references: [comboPackage.id],
  }),
  sectionResults: many(sectionResult),
}));

export const sectionResultRelations = relations(sectionResult, ({ one, many }) => ({
  attempt: one(testAttempt, {
    fields: [sectionResult.attemptId],
    references: [testAttempt.id],
  }),
  sectionType: one(sectionType, {
    fields: [sectionResult.sectionTypeId],
    references: [sectionType.id],
  }),
  answers: many(answer),
}));

export const answerRelations = relations(answer, ({ one }) => ({
  sectionResult: one(sectionResult, {
    fields: [answer.sectionResultId],
    references: [sectionResult.id],
  }),
  question: one(question, {
    fields: [answer.questionId],
    references: [question.id],
  }),
}));

export const questionRatingRelations = relations(questionRating, ({ one }) => ({
  user: one(user, {
    fields: [questionRating.userId],
    references: [user.id],
  }),
  question: one(question, {
    fields: [questionRating.questionId],
    references: [question.id],
  }),
}));

export const questionFeedbackRelations = relations(questionFeedback, ({ one }) => ({
  user: one(user, {
    fields: [questionFeedback.userId],
    references: [user.id],
  }),
  question: one(question, {
    fields: [questionFeedback.questionId],
    references: [question.id],
  }),
}));

export const packageRatingRelations = relations(packageRating, ({ one }) => ({
  user: one(user, {
    fields: [packageRating.userId],
    references: [user.id],
  }),
  package: one(testPackage, {
    fields: [packageRating.packageId],
    references: [testPackage.id],
  }),
}));

// ── Generation Jobs (Background AI Jobs) ───────────────────

export const generationJob = pgTable(
  "generation_job",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // "pending" | "running" | "completed" | "failed" | "cancelled"
    mode: text("mode").notNull().default("quick"), // "quick" | "agentic"
    examTypeId: text("exam_type_id").notNull(),
    sectionTypeId: text("section_type_id").notNull(),
    questionCount: integer("question_count").notNull(),
    progress: integer("progress").default(0).notNull(), // 0-100
    progressMessage: text("progress_message"),
    logs: jsonb("logs"), // Array of {step, message, timestamp, status}
    resultJson: jsonb("result_json"), // GenerationResult
    errorMessage: text("error_message"),
    tokensUsed: integer("tokens_used"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("generationJob_userId_idx").on(table.userId),
    index("generationJob_status_idx").on(table.status),
  ],
);

export const generationJobRelations = relations(generationJob, ({ one }) => ({
  user: one(user, {
    fields: [generationJob.userId],
    references: [user.id],
  }),
}));
