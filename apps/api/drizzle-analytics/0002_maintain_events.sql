-- The job of T-39 (ADR-0012, PD19). It is in its own schema, because the Supabase API serves each function of "public".
CREATE SCHEMA IF NOT EXISTS jobs;--> statement-breakpoint
CREATE FUNCTION jobs.maintain_events(retention_months integer) RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
	first date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
	cutoff timestamptz := now() - make_interval(months => retention_months);
	month date;
	part text;
BEGIN
	FOR i IN 0..12 LOOP
		month := first + make_interval(months => i);
		part := 'events_' || to_char(month, 'YYYY_MM');
		IF to_regclass(format('public.%I', part)) IS NULL THEN
			EXECUTE format('CREATE TABLE public.%I PARTITION OF public.events FOR VALUES FROM (%L) TO (%L)', part, month::timestamp AT TIME ZONE 'UTC', (month + interval '1 month') AT TIME ZONE 'UTC');
			EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', part);
		END IF;
	END LOOP;
	FOR part IN
		SELECT c.relname FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid
		WHERE i.inhparent = 'public.events'::regclass AND c.relname ~ '^events_\d{4}_\d{2}$'
	LOOP
		IF (to_date(substr(part, 8), 'YYYY_MM') + interval '1 month')::timestamp AT TIME ZONE 'UTC' <= cutoff THEN
			EXECUTE format('DROP TABLE public.%I', part);
		END IF;
	END LOOP;
END $$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION jobs.maintain_events(integer) FROM PUBLIC;--> statement-breakpoint
SELECT jobs.maintain_events(12);--> statement-breakpoint
-- 04:00 IST, after the backups. The period is the argument, so a change of it is a change of the job, not of the code.
-- Local work and the tests have no pg_cron, so they skip the schedule.
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
		CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
		PERFORM cron.schedule('maintain-events', '30 22 * * *', 'SELECT jobs.maintain_events(12)');
	END IF;
END $$;
