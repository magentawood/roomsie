ALTER TYPE "public"."connection_status" ADD VALUE 'expired';--> statement-breakpoint
DROP INDEX "connection_requests_pair_idx";--> statement-breakpoint
DROP INDEX "connection_requests_inbox_idx";--> statement-breakpoint
ALTER TABLE "connection_requests" ALTER COLUMN "to_profile_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "connection_requests" ADD COLUMN "from_user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "connection_requests" ADD COLUMN "to_user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "connection_requests" ADD COLUMN "listing_id" uuid;--> statement-breakpoint
ALTER TABLE "connection_requests" ADD COLUMN "note" text NOT NULL;--> statement-breakpoint
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "connection_requests_sender_day_idx" ON "connection_requests" USING btree ("from_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "connection_requests_pair_idx" ON "connection_requests" USING btree (least("from_user_id", "to_user_id"),greatest("from_user_id", "to_user_id")) WHERE "connection_requests"."status" in ('pending', 'accepted');--> statement-breakpoint
CREATE INDEX "connection_requests_inbox_idx" ON "connection_requests" USING btree ("to_user_id","status");--> statement-breakpoint
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_target_check" CHECK (num_nonnulls("connection_requests"."to_profile_id", "connection_requests"."listing_id") = 1);