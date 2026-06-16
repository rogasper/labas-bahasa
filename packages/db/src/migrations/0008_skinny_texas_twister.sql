ALTER TABLE "question" ADD COLUMN "option_weights" jsonb;--> statement-breakpoint
ALTER TABLE "test_attempt" ADD COLUMN "is_overtime" boolean DEFAULT false NOT NULL;