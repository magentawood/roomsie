CREATE TYPE "public"."who_can_move_in" AS ENUM('men', 'women', 'any');--> statement-breakpoint
ALTER TABLE "listing_flatmates" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "who_can_move_in" "who_can_move_in";