// Phase 3.5: Product Variants System - Schema Addition
// Add these tables to shared/schema.ts after brandRetailers and before syndicationChannels

import { serial, varchar, text, integer, boolean, timestamp, pgTable, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { products } from "./schema"; // Import existing tables

// Variant Options Table (Size, Color, Material, etc.)
export const variantOptions = pgTable("variant_options", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  optionType: varchar("option_type", { length: 50 }).notNull().default("text"), // text, color, size, image, number
  isGlobal: boolean("is_global").default(true), // Global options vs product-specific
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_variant_options_slug").on(table.slug),
  index("idx_variant_options_type").on(table.optionType),
]);

// Variant Option Values (Small, Medium, Large for Size option)
export const variantOptionValues = pgTable("variant_option_values", {
  id: serial("id").primaryKey(),
  optionId: integer("option_id").references(() => variantOptions.id).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  displayValue: varchar("display_value", { length: 255 }).notNull(),
  hexColor: varchar("hex_color", { length: 7 }), // For color options (#FF0000)
  imageUrl: varchar("image_url", { length: 500 }), // For image-based options
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_variant_option_values_option_id").on(table.optionId),
]);

// Product Variant Options (Which options apply to which products)
export const productVariantOptions = pgTable("product_variant_options", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  optionId: integer("option_id").references(() => variantOptions.id).notNull(),
  isRequired: boolean("is_required").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_product_variant_options_product_id").on(table.productId),
  index("idx_product_variant_options_unique").on(table.productId, table.optionId),
]);

// Product Variants (The actual variant products)
export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  parentProductId: integer("parent_product_id").references(() => products.id).notNull(),
  variantProductId: integer("variant_product_id").references(() => products.id).notNull(),
  variantSku: varchar("variant_sku", { length: 100 }),
  variantName: varchar("variant_name", { length: 255 }),
  priceAdjustment: integer("price_adjustment").default(0), // Price difference from parent in cents
  weightAdjustment: integer("weight_adjustment").default(0), // Weight difference in grams
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_product_variants_parent").on(table.parentProductId),
  index("idx_product_variants_variant").on(table.variantProductId),
  index("idx_product_variants_unique").on(table.parentProductId, table.variantProductId),
]);

// Variant Option Combinations (Size=Large + Color=Red)
export const variantCombinations = pgTable("variant_combinations", {
  id: serial("id").primaryKey(),
  variantId: integer("variant_id").references(() => productVariants.id).notNull(),
  optionId: integer("option_id").references(() => variantOptions.id).notNull(),
  optionValueId: integer("option_value_id").references(() => variantOptionValues.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_variant_combinations_variant_id").on(table.variantId),
  index("idx_variant_combinations_unique").on(table.variantId, table.optionId),
]);

// Relations
export const variantOptionsRelations = relations(variantOptions, ({ many }) => ({
  values: many(variantOptionValues),
  productOptions: many(productVariantOptions),
  combinations: many(variantCombinations),
}));

export const variantOptionValuesRelations = relations(variantOptionValues, ({ one, many }) => ({
  option: one(variantOptions, {
    fields: [variantOptionValues.optionId],
    references: [variantOptions.id],
  }),
  combinations: many(variantCombinations),
}));

export const productVariantOptionsRelations = relations(productVariantOptions, ({ one }) => ({
  product: one(products, {
    fields: [productVariantOptions.productId],
    references: [products.id],
  }),
  option: one(variantOptions, {
    fields: [productVariantOptions.optionId],
    references: [variantOptions.id],
  }),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  parentProduct: one(products, {
    fields: [productVariants.parentProductId],
    references: [products.id],
    relationName: "parentProduct",
  }),
  variantProduct: one(products, {
    fields: [productVariants.variantProductId],
    references: [products.id],
    relationName: "variantProduct",
  }),
  combinations: many(variantCombinations),
}));

export const variantCombinationsRelations = relations(variantCombinations, ({ one }) => ({
  variant: one(productVariants, {
    fields: [variantCombinations.variantId],
    references: [productVariants.id],
  }),
  option: one(variantOptions, {
    fields: [variantCombinations.optionId],
    references: [variantOptions.id],
  }),
  optionValue: one(variantOptionValues, {
    fields: [variantCombinations.optionValueId],
    references: [variantOptionValues.id],
  }),
}));

// Insert schemas
export const insertVariantOptionSchema = createInsertSchema(variantOptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVariantOptionValueSchema = createInsertSchema(variantOptionValues).omit({
  id: true,
  createdAt: true,
});

export const insertProductVariantOptionSchema = createInsertSchema(productVariantOptions).omit({
  id: true,
  createdAt: true,
});

export const insertProductVariantSchema = createInsertSchema(productVariants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVariantCombinationSchema = createInsertSchema(variantCombinations).omit({
  id: true,
  createdAt: true,
});

// Types
export type VariantOption = typeof variantOptions.$inferSelect;
export type InsertVariantOption = z.infer<typeof insertVariantOptionSchema>;
export type VariantOptionValue = typeof variantOptionValues.$inferSelect;
export type InsertVariantOptionValue = z.infer<typeof insertVariantOptionValueSchema>;
export type ProductVariantOption = typeof productVariantOptions.$inferSelect;
export type InsertProductVariantOption = z.infer<typeof insertProductVariantOptionSchema>;
export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type VariantCombination = typeof variantCombinations.$inferSelect;
export type InsertVariantCombination = z.infer<typeof insertVariantCombinationSchema>;

// Variant-related interfaces for the UI
export interface VariantOptionWithValues extends VariantOption {
  values: VariantOptionValue[];
}

export interface ProductVariantWithCombinations extends ProductVariant {
  combinations: (VariantCombination & {
    option: VariantOption;
    optionValue: VariantOptionValue;
  })[];
  variantProduct: any; // Product details
}

export interface VariantFormData {
  options: {
    optionId: number;
    selectedValues: number[];
  }[];
  pricing: {
    useParentPricing: boolean;
    priceAdjustments: { [key: string]: number };
  };
  inventory: {
    trackInventory: boolean;
    stockLevels: { [key: string]: number };
  };
  skuGeneration: {
    pattern: string;
    autoGenerate: boolean;
  };
}