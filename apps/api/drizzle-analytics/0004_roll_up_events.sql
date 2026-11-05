-- The product numbers (T-66). One function counts the events of a time range: all the events of each name, and the
-- events of each value of the fields that the page splits. The nightly job keeps its counts of each whole day in IST,
-- and the API counts today and yesterday until the same time with it (database.md).
CREATE FUNCTION jobs.count_events(since timestamptz, until timestamptz) RETURNS TABLE (event text, split text, split_value text, total integer)
LANGUAGE sql STABLE SET search_path = '' AS $$
	SELECT e.name, '', '', count(*)::integer FROM public.events e WHERE e.created_at >= since AND e.created_at < until GROUP BY e.name
	UNION ALL
	SELECT e.name, s.field, e.fields->>s.field, count(*)::integer
	FROM public.events e
	JOIN (VALUES ('signed_in', 'newAccount'), ('goal_closed', 'where'), ('limit_hit', 'limit'), ('report_filed', 'reason'), ('slot_conflict', 'slot')) AS s (name, field)
		ON s.name = e.name
	WHERE e.created_at >= since AND e.created_at < until AND e.fields ? s.field
	GROUP BY e.name, s.field, e.fields->>s.field
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION jobs.count_events(timestamptz, timestamptz) FROM PUBLIC;--> statement-breakpoint
-- Counts each day from first_day to last_day again: a day in IST is from its midnight in IST to the next.
CREATE FUNCTION jobs.roll_up_events(first_day date, last_day date) RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
	d date;
BEGIN
	FOR d IN SELECT generate_series(first_day, last_day, interval '1 day')::date LOOP
		DELETE FROM public.event_days WHERE day = d;
		INSERT INTO public.event_days (day, name, field, value, count)
		SELECT d, c.event, c.split, c.split_value, c.total FROM jobs.count_events(d::timestamp AT TIME ZONE 'Asia/Kolkata', (d + 1)::timestamp AT TIME ZONE 'Asia/Kolkata') c;
	END LOOP;
END $$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION jobs.roll_up_events(date, date) FROM PUBLIC;--> statement-breakpoint
-- Each day that the events have, until yesterday.
SELECT jobs.roll_up_events((SELECT min((created_at AT TIME ZONE 'Asia/Kolkata')::date) FROM public.events), (now() AT TIME ZONE 'Asia/Kolkata')::date - 1);--> statement-breakpoint
-- 00:30 IST: the last three days again, so a missed night mends itself.
-- Local work and the tests have no pg_cron, so they skip the schedule.
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
		CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
		PERFORM cron.schedule('roll-up-events', '0 19 * * *',
			$job$SELECT jobs.roll_up_events((now() AT TIME ZONE 'Asia/Kolkata')::date - 3, (now() AT TIME ZONE 'Asia/Kolkata')::date - 1)$job$);
	END IF;
END $$;
