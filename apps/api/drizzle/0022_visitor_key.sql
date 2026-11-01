-- No code made a visitor session before T-12. A session without a key opens nothing, so the column can be NOT NULL.
DELETE FROM "anonymous_sessions";--> statement-breakpoint
ALTER TABLE "anonymous_sessions" ADD COLUMN "key_hash" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "anonymous_sessions_key_idx" ON "anonymous_sessions" USING btree ("key_hash");
