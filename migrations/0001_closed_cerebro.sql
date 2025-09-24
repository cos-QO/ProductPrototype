ALTER TABLE "products" ADD COLUMN "gtin" varchar(20);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "compare_at_price" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "low_stock_threshold" integer;