CREATE TABLE "model_switch" (
	"id" uuid PRIMARY KEY NOT NULL,
	"gemini_only" boolean NOT NULL,
	"saved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "model_switch" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "model_switch" ADD CONSTRAINT "model_switch_saved_by_users_id_fk" FOREIGN KEY ("saved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;