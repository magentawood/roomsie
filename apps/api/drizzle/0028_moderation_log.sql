CREATE TYPE "public"."moderation_action" AS ENUM('hide', 'unhide', 'suspend', 'remove');--> statement-breakpoint
CREATE TABLE "moderation_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"action" "moderation_action" NOT NULL,
	"moderator_user_id" uuid,
	"subject_user_id" uuid NOT NULL,
	"listing_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "moderation_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "moderation_log" ADD CONSTRAINT "moderation_log_moderator_user_id_users_id_fk" FOREIGN KEY ("moderator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_log" ADD CONSTRAINT "moderation_log_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_log_subject_idx" ON "moderation_log" USING btree ("subject_user_id","created_at");--> statement-breakpoint
CREATE INDEX "moderation_log_listing_idx" ON "moderation_log" USING btree ("listing_id","created_at");