CREATE TABLE IF NOT EXISTS "package_rating" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"package_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "packageRating_unique_idx" UNIQUE("user_id","package_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "question_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"question_id" uuid NOT NULL,
	"type" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "questionFeedback_unique_idx" UNIQUE("user_id","question_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "package_rating" ADD CONSTRAINT "package_rating_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "package_rating" ADD CONSTRAINT "package_rating_package_id_test_package_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."test_package"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "question_feedback" ADD CONSTRAINT "question_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "question_feedback" ADD CONSTRAINT "question_feedback_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "packageRating_packageId_idx" ON "package_rating" USING btree ("package_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questionFeedback_questionId_idx" ON "question_feedback" USING btree ("question_id");
