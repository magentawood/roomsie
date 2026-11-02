DROP INDEX "waitlist_email_idx";--> statement-breakpoint
ALTER TABLE "waitlist" ALTER COLUMN "area" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "outside_places" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "goal_id" uuid;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_email_area_idx" ON "waitlist" USING btree ("email","area");--> statement-breakpoint
CREATE INDEX "waitlist_goal_idx" ON "waitlist" USING btree ("goal_id");