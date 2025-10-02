CREATE TABLE "sku_dial_allocations" (
	"id" varchar PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"performance_points" integer DEFAULT 0,
	"inventory_points" integer DEFAULT 0,
	"profitability_points" integer DEFAULT 0,
	"demand_points" integer DEFAULT 0,
	"competitive_points" integer DEFAULT 0,
	"trend_points" integer DEFAULT 0,
	"efficiency_rating" varchar(5) DEFAULT 'C',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_product_allocation" UNIQUE("product_id"),
	CONSTRAINT "performance_points_limit" CHECK ("sku_dial_allocations"."performance_points" <= 200),
	CONSTRAINT "inventory_points_limit" CHECK ("sku_dial_allocations"."inventory_points" <= 150),
	CONSTRAINT "profitability_points_limit" CHECK ("sku_dial_allocations"."profitability_points" <= 200),
	CONSTRAINT "demand_points_limit" CHECK ("sku_dial_allocations"."demand_points" <= 138),
	CONSTRAINT "competitive_points_limit" CHECK ("sku_dial_allocations"."competitive_points" <= 100),
	CONSTRAINT "trend_points_limit" CHECK ("sku_dial_allocations"."trend_points" <= 100),
	CONSTRAINT "total_points_limit" CHECK (("sku_dial_allocations"."performance_points" + "sku_dial_allocations"."inventory_points" + "sku_dial_allocations"."profitability_points" + "sku_dial_allocations"."demand_points" + "sku_dial_allocations"."competitive_points" + "sku_dial_allocations"."trend_points") <= 888)
);
--> statement-breakpoint
ALTER TABLE "product_analytics" ADD COLUMN "bounce_rate" numeric(5, 4) DEFAULT 0;--> statement-breakpoint
ALTER TABLE "product_analytics" ADD COLUMN "avg_session_duration" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "product_analytics" ADD COLUMN "page_views" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "product_analytics" ADD COLUMN "traffic_sessions" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cost_price" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "sku_dial_allocations" ADD CONSTRAINT "sku_dial_allocations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sku_dial_allocations_product_id" ON "sku_dial_allocations" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_sku_dial_allocations_efficiency" ON "sku_dial_allocations" USING btree ("efficiency_rating");--> statement-breakpoint
CREATE INDEX "idx_sku_dial_allocations_points" ON "sku_dial_allocations" USING btree ("performance_points","inventory_points","profitability_points");