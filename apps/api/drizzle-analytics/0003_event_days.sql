CREATE TABLE "event_days" (
	"day" date NOT NULL,
	"name" text NOT NULL,
	"field" text NOT NULL,
	"value" text NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "event_days_day_name_field_value_pk" PRIMARY KEY("day","name","field","value")
);
--> statement-breakpoint
ALTER TABLE "event_days" ENABLE ROW LEVEL SECURITY;