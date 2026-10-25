CREATE TYPE "public"."who_can_move_in" AS ENUM('men', 'women', 'any');--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "who_can_move_in" "who_can_move_in";