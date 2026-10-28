ALTER TABLE "users" ADD COLUMN "analytics_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_sign_in_at" timestamp with time zone;--> statement-breakpoint
-- Edited by hand: each account gets its analytics id now. A tombstone keeps none (T-24).
UPDATE "users" SET "analytics_id" = gen_random_uuid() WHERE "status" <> 'deleted';--> statement-breakpoint
-- A null means a new account, so each account gets a first value. The sign-in after it fires "signed in".
UPDATE "users" SET "last_sign_in_at" = "tokens_valid_after" WHERE "status" <> 'deleted';
