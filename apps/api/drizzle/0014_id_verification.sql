CREATE TYPE "public"."document_type" AS ENUM('passport', 'driving_licence', 'voter_id', 'pan_card');--> statement-breakpoint
CREATE TYPE "public"."reject_reason" AS ENUM('id_not_clear', 'selfie_not_clear', 'no_match', 'not_accepted', 'id_expired');--> statement-breakpoint
CREATE TYPE "public"."verification_audit_action" AS ENUM('view', 'approve', 'reject');--> statement-breakpoint
CREATE TYPE "public"."verification_method" AS ENUM('id_selfie');--> statement-breakpoint
CREATE TYPE "public"."verification_state" AS ENUM('in_review', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "verification_audit" (
	"id" uuid PRIMARY KEY NOT NULL,
	"verification_id" uuid NOT NULL,
	"reviewer_user_id" uuid,
	"action" "verification_audit_action" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verification_audit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"state" "verification_state" DEFAULT 'in_review' NOT NULL,
	"method" "verification_method" DEFAULT 'id_selfie' NOT NULL,
	"document_type" "document_type" NOT NULL,
	"id_photo_key" text,
	"selfie_key" text,
	"face_match" real,
	"reason" "reject_reason",
	"note" text,
	"reviewer_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verifications_reason_check" CHECK (("verifications"."state" = 'rejected') = ("verifications"."reason" is not null))
);
--> statement-breakpoint
ALTER TABLE "verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verification_audit" ADD CONSTRAINT "verification_audit_verification_id_verifications_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."verifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_audit" ADD CONSTRAINT "verification_audit_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verification_audit_verification_idx" ON "verification_audit" USING btree ("verification_id","created_at");--> statement-breakpoint
CREATE INDEX "verifications_user_idx" ON "verifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "verifications_queue_idx" ON "verifications" USING btree ("state","created_at");