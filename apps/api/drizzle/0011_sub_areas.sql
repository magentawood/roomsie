ALTER TABLE "areas" ADD COLUMN "parent_slug" text;--> statement-breakpoint
ALTER TABLE "areas" ADD COLUMN "aliases" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_parent_slug_areas_slug_fk" FOREIGN KEY ("parent_slug") REFERENCES "public"."areas"("slug") ON DELETE no action ON UPDATE no action;