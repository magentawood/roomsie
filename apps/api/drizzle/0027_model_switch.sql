CREATE TABLE "model_switch" (
	"id" uuid PRIMARY KEY NOT NULL,
	"gemini_only" boolean NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "model_switch" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "model_switch" ADD CONSTRAINT "model_switch_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "model_switch_created_at_idx" ON "model_switch" USING btree ("created_at");