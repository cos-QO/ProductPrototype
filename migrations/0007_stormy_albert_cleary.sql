ALTER TABLE "products" ADD COLUMN "meta_title" varchar(60);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "meta_description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "canonical_url" varchar(500);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "og_title" varchar(60);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "og_description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "og_image" varchar(500);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "focus_keywords" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "schema_markup" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_score" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_updated_at" timestamp;