CREATE TABLE "saves" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"listing_id" uuid,
	"profile_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saves_one_target_check" CHECK (num_nonnulls("saves"."listing_id", "saves"."profile_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "saves" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "saves" ADD CONSTRAINT "saves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saves" ADD CONSTRAINT "saves_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saves" ADD CONSTRAINT "saves_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saves_user_listing_idx" ON "saves" USING btree ("user_id","listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saves_user_profile_idx" ON "saves" USING btree ("user_id","profile_id");--> statement-breakpoint
CREATE INDEX "saves_listing_idx" ON "saves" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "saves_profile_idx" ON "saves" USING btree ("profile_id");