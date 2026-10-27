CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"request_id" uuid NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "connection_requests" DROP CONSTRAINT "connection_requests_target_check";--> statement-breakpoint
ALTER TABLE "connection_requests" DROP CONSTRAINT "connection_requests_from_profile_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "connection_requests" DROP CONSTRAINT "connection_requests_to_profile_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "connection_requests" DROP CONSTRAINT "connection_requests_listing_id_listings_id_fk";
--> statement-breakpoint
ALTER TABLE "connection_requests" ALTER COLUMN "from_profile_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "connection_requests" ADD COLUMN "from_read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "connection_requests" ADD COLUMN "to_read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_request_id_connection_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."connection_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_thread_idx" ON "messages" USING btree ("request_id","created_at");--> statement-breakpoint
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_from_profile_id_profiles_id_fk" FOREIGN KEY ("from_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_to_profile_id_profiles_id_fk" FOREIGN KEY ("to_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_target_check" CHECK (num_nonnulls("connection_requests"."to_profile_id", "connection_requests"."listing_id") <= 1);
