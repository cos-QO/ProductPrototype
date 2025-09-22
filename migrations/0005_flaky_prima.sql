ALTER TABLE "field_mapping_cache" ADD COLUMN "source_field_pattern" varchar(255);--> statement-breakpoint
ALTER TABLE "field_mapping_cache" ADD COLUMN "success_rate" integer DEFAULT 0;