-- PD19, T-67. A visit sets expires_at to 30 days ahead, and a claim sets it to the time of the claim, so an old visitor
-- session is one that nobody claimed with expires_at in the past. Its goals, chat turns, notes, traces and feedback go with it.
-- Each waitlist entry of its goals stays with no chat, until the team sets its invite time.
CREATE FUNCTION jobs.delete_old_visitors() RETURNS void LANGUAGE sql SET search_path = '' AS $$
	UPDATE public.waitlist w SET goal_id = NULL
	FROM public.goals g JOIN public.anonymous_sessions s ON s.id = g.anonymous_session_id
	WHERE w.goal_id = g.id AND s.claimed_by_user_id IS NULL AND s.expires_at < now();
	DELETE FROM public.anonymous_sessions WHERE claimed_by_user_id IS NULL AND expires_at < now();
	DELETE FROM public.waitlist WHERE goal_id IS NULL AND invited_at IS NOT NULL;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION jobs.delete_old_visitors() FROM PUBLIC;--> statement-breakpoint
-- 04:30 IST, after the job of the traces. Local work and the tests have no pg_cron, so they skip the schedule.
-- Migration 0030 made the extension.
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
		PERFORM cron.schedule('delete-old-visitors', '0 23 * * *', 'SELECT jobs.delete_old_visitors()');
	END IF;
END $$;
