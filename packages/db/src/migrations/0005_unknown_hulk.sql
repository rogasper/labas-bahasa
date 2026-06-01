CREATE TABLE "email_bounce_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"reason" text,
	"bounced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "emailBounceLog_email_idx" ON "email_bounce_log" USING btree ("email");--> statement-breakpoint
CREATE INDEX "emailBounceLog_bouncedAt_idx" ON "email_bounce_log" USING btree ("bounced_at");