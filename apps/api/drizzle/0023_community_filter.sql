CREATE TYPE "public"."community" AS ENUM('gujarati', 'marathi', 'marwari', 'kutchi', 'sindhi', 'punjabi', 'bengali', 'bihari', 'uttar_pradesh', 'odia', 'tamil', 'telugu', 'kannadiga', 'malayali', 'konkani', 'north_east', 'other');--> statement-breakpoint
CREATE TYPE "public"."religion" AS ENUM('hindu', 'muslim', 'christian', 'sikh', 'jain', 'buddhist', 'parsi', 'jewish', 'none', 'other');--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "own_religion" "religion";--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "own_religion_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "own_community" "community";--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "own_community_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "religion" "religion";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "community" "community";