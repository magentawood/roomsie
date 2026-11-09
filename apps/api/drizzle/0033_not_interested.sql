CREATE TABLE "not_interested" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"other_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "not_interested" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "not_interested" ADD CONSTRAINT "not_interested_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "not_interested" ADD CONSTRAINT "not_interested_other_user_id_users_id_fk" FOREIGN KEY ("other_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "not_interested_pair_idx" ON "not_interested" USING btree ("user_id","other_user_id");--> statement-breakpoint
CREATE INDEX "not_interested_other_idx" ON "not_interested" USING btree ("other_user_id");--> statement-breakpoint
-- PD17. Supabase gives a new table of "public" no grants, so the migration grants it. Only the API reads it: no grant to
-- anon or authenticated. The local and test databases have no service_role, so they skip it.
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
		GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.not_interested TO service_role;
	END IF;
END $$;
