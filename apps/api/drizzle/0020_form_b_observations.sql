CREATE TYPE "public"."observation_kind" AS ENUM('constraint', 'preference', 'context', 'concern');--> statement-breakpoint
CREATE TABLE "observation_topics" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "observation_topics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "observations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"anonymous_session_id" uuid,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"kind" "observation_kind" NOT NULL,
	"evidence" text NOT NULL,
	"turn_id" uuid NOT NULL,
	"confidence" real NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "observations_one_owner_check" CHECK (num_nonnulls("observations"."user_id", "observations"."anonymous_session_id") = 1),
	CONSTRAINT "observations_confidence_check" CHECK ("observations"."confidence" between 0 and 1)
);
--> statement-breakpoint
ALTER TABLE "observations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_anonymous_session_id_anonymous_sessions_id_fk" FOREIGN KEY ("anonymous_session_id") REFERENCES "public"."anonymous_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_key_observation_topics_key_fk" FOREIGN KEY ("key") REFERENCES "public"."observation_topics"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_turn_id_chat_turns_id_fk" FOREIGN KEY ("turn_id") REFERENCES "public"."chat_turns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "observations_user_key_idx" ON "observations" USING btree ("user_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "observations_session_key_idx" ON "observations" USING btree ("anonymous_session_id","key");--> statement-breakpoint
CREATE INDEX "observations_turn_idx" ON "observations" USING btree ("turn_id");