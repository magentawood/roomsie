CREATE TYPE "public"."feedback_rating" AS ENUM('satisfied', 'good', 'neutral', 'bad', 'unsatisfied');--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "status" SET DEFAULT 'open'::text;--> statement-breakpoint
DROP TYPE "public"."goal_status";--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('open', 'closed');--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "status" SET DEFAULT 'open'::"public"."goal_status";--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "status" SET DATA TYPE "public"."goal_status" USING "status"::"public"."goal_status";--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "text" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "goal_id" uuid;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "rating" "feedback_rating";--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_goal_idx" ON "feedback" USING btree ("goal_id");--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_one_owner_check" CHECK (num_nonnulls("feedback"."user_id", "feedback"."goal_id") = 1);