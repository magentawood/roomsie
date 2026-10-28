CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"name" text NOT NULL,
	"added_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quotes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "site_details" (
	"id" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"instagram" text,
	"whatsapp" text,
	"facebook" text,
	"linkedin" text,
	"contact_email" text,
	"org_number" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_details_one_row_check" CHECK ("site_details"."id")
);
--> statement-breakpoint
ALTER TABLE "site_details" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_details" ADD CONSTRAINT "site_details_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_created_at_idx" ON "feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "feedback_user_idx" ON "feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quotes_created_at_idx" ON "quotes" USING btree ("created_at");