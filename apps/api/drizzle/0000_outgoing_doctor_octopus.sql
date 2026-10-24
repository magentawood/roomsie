CREATE TYPE "public"."account_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."bathroom" AS ENUM('attached', 'shared');--> statement-breakpoint
CREATE TYPE "public"."beds_free" AS ENUM('1', '2', '3', '4', '5', '5_plus');--> statement-breakpoint
CREATE TYPE "public"."connection_status" AS ENUM('pending', 'accepted', 'declined', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."curfew" AS ENUM('none', '10pm', '10_30pm', '11pm', 'midnight');--> statement-breakpoint
CREATE TYPE "public"."electricity" AS ENUM('included', 'as_per_meter', 'split_equally');--> statement-breakpoint
CREATE TYPE "public"."furnishing" AS ENUM('fully', 'semi', 'unfurnished');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('open', 'found');--> statement-breakpoint
CREATE TYPE "public"."guests_rule" AS ENUM('none', 'welcome', 'day_visits');--> statement-breakpoint
CREATE TYPE "public"."intent" AS ENUM('room', 'pg', 'whole_flat', 'flatmates', 'unclear');--> statement-breakpoint
CREATE TYPE "public"."listing_kind" AS ENUM('room_in_flat', 'owner_flat', 'pg', 'broker_flat');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'live', 'inactive', 'filled');--> statement-breakpoint
CREATE TYPE "public"."meals" AS ENUM('veg_included', 'veg_non_veg', 'breakfast_only', 'none');--> statement-breakpoint
CREATE TYPE "public"."min_stay" AS ENUM('3_months', '6_months', '12_months', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."must_have_weight" AS ENUM('prefer', 'dealbreaker');--> statement-breakpoint
CREATE TYPE "public"."place_type" AS ENUM('1rk', '1bhk', '2bhk', '3bhk', '4bhk', 'studio', 'independent_house', 'bungalow_villa', 'penthouse');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."room_type" AS ENUM('private', 'shared', 'unclear');--> statement-breakpoint
CREATE TYPE "public"."answer_source" AS ENUM('stated', 'inferred', 'default');--> statement-breakpoint
CREATE TYPE "public"."turn_input" AS ENUM('typed', 'chip');--> statement-breakpoint
CREATE TYPE "public"."turn_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('draft', 'live', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."walk_time" AS ENUM('5_min', '10_min', '15_min', '30_min', 'not_close');--> statement-breakpoint
CREATE TYPE "public"."whos_moving" AS ENUM('student', 'first_job', 'working', 'couple', 'family', 'friends', 'unclear');--> statement-breakpoint
CREATE TABLE "anonymous_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"device_hash" text NOT NULL,
	"turn_count" integer DEFAULT 0 NOT NULL,
	"claimed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "anonymous_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "areas" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"commute_notes" text,
	"is_launch_area" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "areas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"blocker_user_id" uuid NOT NULL,
	"blocked_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chat_turns" (
	"id" uuid PRIMARY KEY NOT NULL,
	"goal_id" uuid NOT NULL,
	"role" "turn_role" NOT NULL,
	"input" "turn_input",
	"text" text NOT NULL,
	"parts" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_turns_input_check" CHECK (("chat_turns"."role" = 'user') = ("chat_turns"."input" is not null))
);
--> statement-breakpoint
ALTER TABLE "chat_turns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "connection_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_profile_id" uuid NOT NULL,
	"to_profile_id" uuid NOT NULL,
	"status" "connection_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "connection_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"anonymous_session_id" uuid,
	"title" text,
	"form" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "goal_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_one_owner_check" CHECK (num_nonnulls("goals"."user_id", "goals"."anonymous_session_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lifestyle_axes" (
	"key" text PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"allowed_values" text[] NOT NULL,
	"sort_order" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lifestyle_axes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "listing_flatmates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"listing_id" uuid NOT NULL,
	"name" text NOT NULL,
	"age" integer,
	"what_they_do" text,
	"food" text,
	"photo_key" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing_flatmates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "listing_rates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"listing_id" uuid NOT NULL,
	"listing_kind" "listing_kind" NOT NULL,
	"sharing" text,
	"rent" integer NOT NULL,
	"deposit" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listing_rates_sharing_unique" UNIQUE NULLS NOT DISTINCT("listing_id","sharing"),
	CONSTRAINT "listing_rates_sharing_check" CHECK (("listing_rates"."listing_kind" = 'pg') = ("listing_rates"."sharing" is not null))
);
--> statement-breakpoint
ALTER TABLE "listing_rates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"kind" "listing_kind" NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"pg_name" text,
	"area_slug" text,
	"address" text,
	"share_address" boolean DEFAULT false NOT NULL,
	"building" text,
	"street" text,
	"landmark" text,
	"pincode" text,
	"nearest_station" text,
	"walk_station" "walk_time",
	"walk_bus" "walk_time",
	"walk_market" "walk_time",
	"walk_gym" "walk_time",
	"walk_mall" "walk_time",
	"place_type" "place_type",
	"furnishing" "furnishing",
	"room_type" "room_type",
	"floor" integer,
	"carpet_area_sqft" integer,
	"sharing" text[] DEFAULT '{}' NOT NULL,
	"beds_free" "beds_free",
	"meals" "meals",
	"curfew" "curfew",
	"bathroom" "bathroom",
	"balcony" boolean,
	"inside_items" text[] DEFAULT '{}' NOT NULL,
	"amenities" text[] DEFAULT '{}' NOT NULL,
	"maintenance" integer,
	"maintenance_included" boolean,
	"electricity" "electricity",
	"rent_negotiable" boolean,
	"brokerage" integer,
	"available_from" date,
	"min_stay" "min_stay",
	"veg_only_kitchen" boolean,
	"smoking_allowed" boolean,
	"alcohol_allowed" boolean,
	"guests" "guests_rule",
	"who_is_welcome" text[] DEFAULT '{}' NOT NULL,
	"flatmates_consent" boolean DEFAULT false NOT NULL,
	"photo_keys" text[] DEFAULT '{}' NOT NULL,
	"description" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_id_kind_unique" UNIQUE("id","kind"),
	CONSTRAINT "listings_photo_limit_check" CHECK (cardinality("listings"."photo_keys") <= 5),
	CONSTRAINT "listings_live_fields_check" CHECK ("listings"."status" = 'draft' or (
    "listings"."area_slug" is not null
    and ("listings"."kind" <> 'pg' or "listings"."pg_name" is not null)
    and ("listings"."kind" <> 'broker_flat' or "listings"."brokerage" is not null)))
);
--> statement-breakpoint
ALTER TABLE "listings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "must_haves" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "must_haves" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profile_lifestyle" (
	"profile_id" uuid NOT NULL,
	"axis_key" text NOT NULL,
	"value" text NOT NULL,
	"source" "answer_source" DEFAULT 'stated' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_lifestyle_profile_id_axis_key_pk" PRIMARY KEY("profile_id","axis_key")
);
--> statement-breakpoint
ALTER TABLE "profile_lifestyle" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profile_must_haves" (
	"profile_id" uuid NOT NULL,
	"must_have_key" text NOT NULL,
	"weight" "must_have_weight" DEFAULT 'prefer' NOT NULL,
	"source" "answer_source" DEFAULT 'stated' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_must_haves_profile_id_must_have_key_pk" PRIMARY KEY("profile_id","must_have_key")
);
--> statement-breakpoint
ALTER TABLE "profile_must_haves" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"age" integer,
	"job_role" text,
	"commute_address" text,
	"bio" text,
	"managed_by_parent" boolean DEFAULT false NOT NULL,
	"intent" "intent" DEFAULT 'unclear' NOT NULL,
	"room_type" "room_type" DEFAULT 'unclear' NOT NULL,
	"whos_moving" "whos_moving" DEFAULT 'unclear' NOT NULL,
	"budget_min" integer,
	"budget_max" integer,
	"areas" text[] DEFAULT '{}' NOT NULL,
	"move_date" date,
	"photo_keys" text[] DEFAULT '{}' NOT NULL,
	"visibility" "visibility" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_adult_check" CHECK ("profiles"."age" >= 18),
	CONSTRAINT "profiles_photo_limit_check" CHECK (cardinality("profiles"."photo_keys") <= 4)
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reporter_user_id" uuid NOT NULL,
	"subject_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"detail" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"auth_provider_id" text NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"tokens_valid_after" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"area" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invited_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "waitlist" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "anonymous_sessions" ADD CONSTRAINT "anonymous_sessions_claimed_by_user_id_users_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_user_id_users_id_fk" FOREIGN KEY ("blocker_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_user_id_users_id_fk" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_turns" ADD CONSTRAINT "chat_turns_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_from_profile_id_profiles_id_fk" FOREIGN KEY ("from_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_to_profile_id_profiles_id_fk" FOREIGN KEY ("to_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_anonymous_session_id_anonymous_sessions_id_fk" FOREIGN KEY ("anonymous_session_id") REFERENCES "public"."anonymous_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_flatmates" ADD CONSTRAINT "listing_flatmates_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_rates" ADD CONSTRAINT "listing_rates_listing_id_listing_kind_listings_id_kind_fk" FOREIGN KEY ("listing_id","listing_kind") REFERENCES "public"."listings"("id","kind") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_area_slug_areas_slug_fk" FOREIGN KEY ("area_slug") REFERENCES "public"."areas"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_lifestyle" ADD CONSTRAINT "profile_lifestyle_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_lifestyle" ADD CONSTRAINT "profile_lifestyle_axis_key_lifestyle_axes_key_fk" FOREIGN KEY ("axis_key") REFERENCES "public"."lifestyle_axes"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_must_haves" ADD CONSTRAINT "profile_must_haves_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_must_haves" ADD CONSTRAINT "profile_must_haves_must_have_key_must_haves_key_fk" FOREIGN KEY ("must_have_key") REFERENCES "public"."must_haves"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anonymous_sessions_device_idx" ON "anonymous_sessions" USING btree ("device_hash");--> statement-breakpoint
CREATE INDEX "anonymous_sessions_claimed_idx" ON "anonymous_sessions" USING btree ("claimed_by_user_id");--> statement-breakpoint
CREATE INDEX "areas_launch_idx" ON "areas" USING btree ("is_launch_area","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "blocks_pair_idx" ON "blocks" USING btree ("blocker_user_id","blocked_user_id");--> statement-breakpoint
CREATE INDEX "blocks_blocked_idx" ON "blocks" USING btree ("blocked_user_id");--> statement-breakpoint
CREATE INDEX "chat_turns_goal_idx" ON "chat_turns" USING btree ("goal_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "connection_requests_pair_idx" ON "connection_requests" USING btree ("from_profile_id","to_profile_id");--> statement-breakpoint
CREATE INDEX "connection_requests_inbox_idx" ON "connection_requests" USING btree ("to_profile_id","status");--> statement-breakpoint
CREATE INDEX "goals_user_idx" ON "goals" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "goals_session_idx" ON "goals" USING btree ("anonymous_session_id");--> statement-breakpoint
CREATE INDEX "listing_flatmates_listing_idx" ON "listing_flatmates" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_rates_rent_idx" ON "listing_rates" USING btree ("rent");--> statement-breakpoint
CREATE INDEX "listings_area_status_idx" ON "listings" USING btree ("area_slug","status","expires_at");--> statement-breakpoint
CREATE INDEX "listings_owner_idx" ON "listings" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "listings_inside_items_idx" ON "listings" USING gin ("inside_items");--> statement-breakpoint
CREATE INDEX "listings_sharing_idx" ON "listings" USING gin ("sharing");--> statement-breakpoint
CREATE INDEX "listings_amenities_idx" ON "listings" USING gin ("amenities");--> statement-breakpoint
CREATE INDEX "listings_who_is_welcome_idx" ON "listings" USING gin ("who_is_welcome");--> statement-breakpoint
CREATE INDEX "profile_lifestyle_axis_value_idx" ON "profile_lifestyle" USING btree ("axis_key","value");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_id_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profiles_live_idx" ON "profiles" USING btree ("visibility","intent");--> statement-breakpoint
CREATE INDEX "reports_queue_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "reports_subject_idx" ON "reports" USING btree ("subject_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_provider_id_idx" ON "users" USING btree ("auth_provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_email_idx" ON "waitlist" USING btree ("email");