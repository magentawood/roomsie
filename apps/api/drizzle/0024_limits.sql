CREATE TABLE "model_spend" (
	"id" uuid PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"rupees" numeric(14, 6) DEFAULT '0' NOT NULL,
	"alerted_percent" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "model_spend" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "anonymous_sessions" ADD COLUMN "ip_hash" text;--> statement-breakpoint
ALTER TABLE "anonymous_sessions" ADD COLUMN "ip_range_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX "model_spend_day_idx" ON "model_spend" USING btree ("day");--> statement-breakpoint
CREATE INDEX "anonymous_sessions_ip_idx" ON "anonymous_sessions" USING btree ("ip_hash");--> statement-breakpoint
CREATE INDEX "anonymous_sessions_ip_range_idx" ON "anonymous_sessions" USING btree ("ip_range_hash");