ALTER TABLE "users" ADD COLUMN "analytics_id" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_sign_in_at" timestamp with time zone;--> statement-breakpoint
-- Edited by hand. The default gave each row an analytics id, and a tombstone keeps none (T-24).
UPDATE "users" SET "analytics_id" = NULL WHERE "status" = 'deleted';--> statement-breakpoint
-- A null means a new account. The sign-ins from before T-24 fire no event.
UPDATE "users" SET "last_sign_in_at" = now() WHERE "status" <> 'deleted';
