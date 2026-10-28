CREATE TABLE "article_passages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"article_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"heading" text,
	"html" text NOT NULL,
	"text" text NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce("article_passages"."heading", '')), 'A') || setweight(to_tsvector('english', "article_passages"."text"), 'B')) STORED NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_passages_position_unique" UNIQUE("article_id","position")
);
--> statement-breakpoint
ALTER TABLE "article_passages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"author_line" text NOT NULL,
	"author_photo" text,
	"seo_title" text NOT NULL,
	"seo_description" text NOT NULL,
	"date_checked" date NOT NULL,
	"cover_image" text,
	"cover_alt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "article_passages" ADD CONSTRAINT "article_passages_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_passages_search_idx" ON "article_passages" USING gin ("search");