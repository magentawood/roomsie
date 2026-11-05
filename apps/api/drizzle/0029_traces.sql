CREATE TABLE "trace_prompts" (
	"hash" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trace_prompts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trace_views" (
	"id" uuid PRIMARY KEY NOT NULL,
	"moderator_user_id" uuid,
	"turn_key" uuid NOT NULL,
	"session_code" text NOT NULL,
	"turn_number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trace_views" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "traces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"turn_key" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"session_code" text NOT NULL,
	"turn_number" integer NOT NULL,
	"role" text NOT NULL,
	"attempt" integer NOT NULL,
	"model" text NOT NULL,
	"fallback" boolean NOT NULL,
	"outcome" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ms" integer NOT NULL,
	"tokens_in" integer NOT NULL,
	"cached_tokens_in" integer NOT NULL,
	"tokens_out" integer NOT NULL,
	"prompt_hash" text NOT NULL,
	"messages" jsonb NOT NULL,
	"answer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "traces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trace_views" ADD CONSTRAINT "trace_views_moderator_user_id_users_id_fk" FOREIGN KEY ("moderator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traces" ADD CONSTRAINT "traces_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traces" ADD CONSTRAINT "traces_prompt_hash_trace_prompts_hash_fk" FOREIGN KEY ("prompt_hash") REFERENCES "public"."trace_prompts"("hash") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trace_views_turn_idx" ON "trace_views" USING btree ("turn_key","created_at");--> statement-breakpoint
CREATE INDEX "trace_views_created_idx" ON "trace_views" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "traces_turn_idx" ON "traces" USING btree ("turn_key");--> statement-breakpoint
CREATE INDEX "traces_started_idx" ON "traces" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "traces_session_idx" ON "traces" USING btree ("session_code");--> statement-breakpoint
CREATE INDEX "traces_goal_idx" ON "traces" USING btree ("goal_id");