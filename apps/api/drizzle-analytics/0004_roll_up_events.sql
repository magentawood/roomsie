-- The product numbers (T-66): the API counts today with count_events, and the nightly job keeps the counts of each whole day in IST.
CREATE FUNCTION jobs.count_events(since timestamptz, until timestamptz) RETURNS TABLE (name text, field text, value text, count integer)
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
-- A day in IST is from its midnight in IST to the next.
CREATE FUNCTION jobs.roll_up_events(first_day date, last_day date) RETURNS void LANGUAGE sql SET search_path = '' AS $$
	DELETE FROM public.event_days WHERE day BETWEEN first_day AND last_day;
	INSERT INTO public.event_days (day, name, field, value, count)
	SELECT d::date, c.name, c.field, c.value, c.count
	FROM generate_series(first_day, last_day, interval '1 day') d,
		jobs.count_events(d::date::timestamp AT TIME ZONE 'Asia/Kolkata', (d::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata') c;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION jobs.roll_up_events(date, date) FROM PUBLIC;--> statement-breakpoint
SELECT jobs.roll_up_events((SELECT min((created_at AT TIME ZONE 'Asia/Kolkata')::date) FROM public.events), (now() AT TIME ZONE 'Asia/Kolkata')::date - 1);--> statement-breakpoint
-- 00:30 IST: the last three days again, so a missed night mends itself.
-- Local work and the tests have no pg_cron, so they skip the schedule. Migration 0002 made the extension.
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
		PERFORM cron.schedule('roll-up-events', '0 19 * * *',
			$job$SELECT jobs.roll_up_events((now() AT TIME ZONE 'Asia/Kolkata')::date - 3, (now() AT TIME ZONE 'Asia/Kolkata')::date - 1)$job$);
	END IF;
END $$;
