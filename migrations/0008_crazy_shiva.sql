CREATE TABLE "product_variant_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"option_id" integer NOT NULL,
	"is_required" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_product_id" integer NOT NULL,
	"variant_product_id" integer NOT NULL,
	"variant_sku" varchar(100),
	"variant_name" varchar(255),
	"price_adjustment" integer DEFAULT 0,
	"weight_adjustment" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "variant_combinations" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant_id" integer NOT NULL,
	"option_id" integer NOT NULL,
	"option_value_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "variant_option_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"option_id" integer NOT NULL,
	"value" varchar(255) NOT NULL,
	"display_value" varchar(255) NOT NULL,
	"hex_color" varchar(7),
	"image_url" varchar(500),
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "variant_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"option_type" varchar(50) DEFAULT 'text' NOT NULL,
	"is_global" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "variant_options_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "product_variant_options" ADD CONSTRAINT "product_variant_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant_options" ADD CONSTRAINT "product_variant_options_option_id_variant_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."variant_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_parent_product_id_products_id_fk" FOREIGN KEY ("parent_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_variant_product_id_products_id_fk" FOREIGN KEY ("variant_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_combinations" ADD CONSTRAINT "variant_combinations_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_combinations" ADD CONSTRAINT "variant_combinations_option_id_variant_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."variant_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_combinations" ADD CONSTRAINT "variant_combinations_option_value_id_variant_option_values_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "public"."variant_option_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_option_values" ADD CONSTRAINT "variant_option_values_option_id_variant_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."variant_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_product_variant_options_product_id" ON "product_variant_options" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_variant_options_unique" ON "product_variant_options" USING btree ("product_id","option_id");--> statement-breakpoint
CREATE INDEX "idx_product_variants_parent" ON "product_variants" USING btree ("parent_product_id");--> statement-breakpoint
CREATE INDEX "idx_product_variants_variant" ON "product_variants" USING btree ("variant_product_id");--> statement-breakpoint
CREATE INDEX "idx_product_variants_unique" ON "product_variants" USING btree ("parent_product_id","variant_product_id");--> statement-breakpoint
CREATE INDEX "idx_variant_combinations_variant_id" ON "variant_combinations" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_variant_combinations_unique" ON "variant_combinations" USING btree ("variant_id","option_id");--> statement-breakpoint
CREATE INDEX "idx_variant_option_values_option_id" ON "variant_option_values" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "idx_variant_options_slug" ON "variant_options" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_variant_options_type" ON "variant_options" USING btree ("option_type");