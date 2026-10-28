-- The Supabase dashboards show time in IST (Asia/Kolkata). A stored timestamptz does not change, and the code names its zone in each date function.
-- A database setting applies to each new session. The name of the database differs in the tests, so the statement reads it.
DO $$ BEGIN EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'Asia/Kolkata'); END $$;
