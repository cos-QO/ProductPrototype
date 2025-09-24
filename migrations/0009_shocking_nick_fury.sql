ALTER TABLE "media_assets" ADD COLUMN "alt_text" varchar(500);--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "metadata" jsonb;