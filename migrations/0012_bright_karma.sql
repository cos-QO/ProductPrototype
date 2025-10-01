CREATE TABLE "product_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"buy_rate" numeric(5, 4) DEFAULT 0,
	"expected_buy_rate" numeric(5, 4) DEFAULT 0,
	"revenue" integer DEFAULT 0,
	"margin" numeric(5, 4) DEFAULT 0,
	"volume" integer DEFAULT 0,
	"total_views" integer DEFAULT 0,
	"unique_visitors" integer DEFAULT 0,
	"traffic_ads" integer DEFAULT 0,
	"traffic_emails" integer DEFAULT 0,
	"traffic_text" integer DEFAULT 0,
	"traffic_store" integer DEFAULT 0,
	"traffic_organic" integer DEFAULT 0,
	"traffic_social" integer DEFAULT 0,
	"traffic_direct" integer DEFAULT 0,
	"traffic_referral" integer DEFAULT 0,
	"return_rate" numeric(5, 4) DEFAULT 0,
	"reorder_rate" numeric(5, 4) DEFAULT 0,
	"review_rate" numeric(5, 4) DEFAULT 0,
	"rebuy_rate" numeric(5, 4) DEFAULT 0,
	"conversion_rate" numeric(5, 4) DEFAULT 0,
	"average_order_value" integer DEFAULT 0,
	"cart_abandonment_rate" numeric(5, 4) DEFAULT 0,
	"performance_score" integer DEFAULT 0,
	"trend_score" integer DEFAULT 0,
	"competitive_score" integer DEFAULT 0,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"reporting_period" varchar(20) DEFAULT 'monthly',
	"data_quality" numeric(3, 2) DEFAULT 1.00,
	"confidence_level" numeric(3, 2) DEFAULT 0.95,
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "product_analytics" ADD CONSTRAINT "product_analytics_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_product_analytics_product_id" ON "product_analytics" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_analytics_period" ON "product_analytics" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "idx_product_analytics_reporting_period" ON "product_analytics" USING btree ("reporting_period");--> statement-breakpoint
CREATE INDEX "idx_product_analytics_calculated_at" ON "product_analytics" USING btree ("calculated_at");--> statement-breakpoint
CREATE INDEX "idx_product_analytics_performance_score" ON "product_analytics" USING btree ("performance_score");--> statement-breakpoint
CREATE INDEX "idx_product_analytics_product_period" ON "product_analytics" USING btree ("product_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX "idx_product_analytics_scores" ON "product_analytics" USING btree ("performance_score","trend_score","competitive_score");