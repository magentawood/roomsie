-- Supabase only: a user joins only the own private channel, user:<our user id> (T-44).
-- The API adds the claim roomsie_user_id: Firebase already uses user_id for its own uid.
-- The local and test databases have neither function, so they skip it.
DO $$
BEGIN
  IF to_regprocedure('realtime.topic()') IS NOT NULL AND to_regprocedure('auth.jwt()') IS NOT NULL THEN
    EXECUTE $policy$
      CREATE POLICY "roomsie user channel" ON realtime.messages FOR SELECT TO authenticated
      USING (realtime.topic() = 'user:' || (auth.jwt() ->> 'roomsie_user_id'))
    $policy$;
  END IF;
END $$;
