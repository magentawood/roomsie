-- PD20, T-64.
-- Its own schema, because the Supabase API serves each function of "public".
CREATE SCHEMA IF NOT EXISTS jobs;--> statement-breakpoint
-- 30 days: traceDays of the contract. The lock waits for each save of a trace, which takes it shared.
CREATE FUNCTION jobs.delete_old_traces() RETURNS void LANGUAGE sql SET search_path = '' AS $$
	SELECT pg_advisory_xact_lock(hashtext('traces'));
	DELETE FROM public.traces WHERE started_at < now() - interval '30 days';
	DELETE FROM public.trace_prompts p WHERE NOT EXISTS (SELECT 1 FROM public.traces t WHERE t.prompt_hash = p.hash);
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION jobs.delete_old_traces() FROM PUBLIC;--> statement-breakpoint
-- 04:15 IST, after the backups and the job of the events.
-- Local work and the tests have no pg_cron, so they skip the schedule.
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
		CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
		PERFORM cron.schedule('delete-old-traces', '45 22 * * *', 'SELECT jobs.delete_old_traces()');
	END IF;
END $$;
