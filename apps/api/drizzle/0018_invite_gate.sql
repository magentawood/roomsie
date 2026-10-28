CREATE TABLE "invite_gate" (
	"id" uuid PRIMARY KEY NOT NULL,
	"invite_only" boolean NOT NULL,
	"opens_at" timestamp with time zone,
	"saved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invite_gate" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invites_email_lower_case_check" CHECK ("invites"."email" = lower("invites"."email"))
);
--> statement-breakpoint
ALTER TABLE "invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invite_gate" ADD CONSTRAINT "invite_gate_saved_by_users_id_fk" FOREIGN KEY ("saved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invites_email_idx" ON "invites" USING btree ("email");