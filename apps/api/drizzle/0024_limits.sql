CREATE TABLE "model_spend" (
	"day" date PRIMARY KEY NOT NULL,
	"rupees" numeric(14, 6) DEFAULT '0' NOT NULL,
	"alerted" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "model_spend" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "anonymous_sessions" ADD COLUMN "ip_hash" text;--> statement-breakpoint
ALTER TABLE "anonymous_sessions" ADD COLUMN "ip_range_hash" text;--> statement-breakpoint
CREATE INDEX "anonymous_sessions_ip_idx" ON "anonymous_sessions" USING btree ("ip_hash");--> statement-breakpoint
CREATE INDEX "anonymous_sessions_ip_range_idx" ON "anonymous_sessions" USING btree ("ip_range_hash");