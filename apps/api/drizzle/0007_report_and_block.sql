ALTER TABLE "profiles" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reports_profile_reporter_idx" ON "reports" USING btree ("profile_id","reporter_user_id");--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_check" CHECK (num_nonnulls("reports"."listing_id", "reports"."profile_id") <= 1);