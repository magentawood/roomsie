-- Edited by hand: Drizzle cannot declare a partitioned table (ADR-0012).
CREATE TABLE "events" (
	"id" uuid NOT NULL,
	"name" text NOT NULL,
	"event_version" integer NOT NULL,
	"actor" uuid,
	"fields" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_id_occurred_at_pk" PRIMARY KEY("id","occurred_at")
) PARTITION BY RANGE ("occurred_at");
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "events_occurred_at_idx" ON "events" USING brin ("occurred_at");--> statement-breakpoint
-- One partition for each month in UTC, from this month to 12 months ahead. T-39 makes the next ones.
-- A partition is also a table that the Supabase API can reach, so each one has row level security too.
DO $$
DECLARE
	first date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
	month date;
	part text;
BEGIN
	FOR i IN 0..12 LOOP
		month := first + make_interval(months => i);
		part := 'events_' || to_char(month, 'YYYY_MM');
		EXECUTE format('CREATE TABLE %I PARTITION OF "events" FOR VALUES FROM (%L) TO (%L)', part, month::timestamp AT TIME ZONE 'UTC', (month + interval '1 month') AT TIME ZONE 'UTC');
		EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', part);
	END LOOP;
END $$;
