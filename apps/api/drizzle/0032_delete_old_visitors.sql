-- PD19, T-67. A visit sets expires_at 30 days ahead, so expires_at < now() is 30 days after the last visit.
-- The lock lets a claim or a visit that runs finish first. Then the next statements read its row.
CREATE FUNCTION jobs.delete_old_visitors() RETURNS void LANGUAGE sql SET search_path = '' AS $$
	SELECT 1 FROM public.anonymous_sessions WHERE claimed_by_user_id IS NULL AND expires_at < now() FOR UPDATE;
	UPDATE public.waitlist w SET goal_id = NULL
	FROM public.goals g JOIN public.anonymous_sessions s ON s.id = g.anonymous_session_id
	WHERE w.goal_id = g.id AND s.claimed_by_user_id IS NULL AND s.expires_at < now();
	DELETE FROM public.anonymous_sessions WHERE claimed_by_user_id IS NULL AND expires_at < now();
	DELETE FROM public.waitlist WHERE goal_id IS NULL AND invited_at IS NOT NULL;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION jobs.delete_old_visitors() FROM PUBLIC;--> statement-breakpoint
-- 04:30 IST, after the job of the traces. Migration 0030 made pg_cron.
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
		PERFORM cron.schedule('delete-old-visitors', '0 23 * * *', 'SELECT jobs.delete_old_visitors()');
	END IF;
END $$;
