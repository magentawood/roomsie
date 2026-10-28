CREATE TABLE "invite_gate" (
	"id" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"invite_only" boolean DEFAULT true NOT NULL,
	"opens_at" timestamp with time zone,
	CONSTRAINT "invite_gate_one_row_check" CHECK ("invite_gate"."id")
);
--> statement-breakpoint
ALTER TABLE "invite_gate" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invites" (
	"email" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invites_email_lower_case_check" CHECK ("invites"."email" = lower("invites"."email"))
);
--> statement-breakpoint
ALTER TABLE "invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- The gate starts closed, with no opening time (T-33). A moderator then adds the invites and sets the time.
INSERT INTO "invite_gate" ("id") VALUES (true);
