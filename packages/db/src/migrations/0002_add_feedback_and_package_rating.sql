CREATE TABLE "generation_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"mode" text DEFAULT 'quick' NOT NULL,
	"exam_type_id" text NOT NULL,
	"section_type_id" text NOT NULL,
	"question_count" integer NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"progress_message" text,
	"logs" jsonb,
	"result_json" jsonb,
	"error_message" text,
	"tokens_used" integer,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "package_rating" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"package_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "packageRating_unique_idx" UNIQUE("user_id","package_id")
);
--> statement-breakpoint
CREATE TABLE "question_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"question_id" uuid NOT NULL,
	"type" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "questionFeedback_unique_idx" UNIQUE("user_id","question_id")
);
--> statement-breakpoint
DROP TABLE "user_api_key" CASCADE;--> statement-breakpoint
ALTER TABLE "test_package" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_job" ADD CONSTRAINT "generation_job_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_rating" ADD CONSTRAINT "package_rating_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_rating" ADD CONSTRAINT "package_rating_package_id_test_package_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."test_package"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_feedback" ADD CONSTRAINT "question_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_feedback" ADD CONSTRAINT "question_feedback_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generationJob_userId_idx" ON "generation_job" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generationJob_status_idx" ON "generation_job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "packageRating_packageId_idx" ON "package_rating" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "questionFeedback_questionId_idx" ON "question_feedback" USING btree ("question_id");