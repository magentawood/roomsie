CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'non_binary');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "gender" "gender";