import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("retailer"), // brand_owner, retailer, content_team
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Brands table
export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  description: text("description"),
  story: text("story"),
  category: varchar("category", { length: 100 }),
  logoUrl: varchar("logo_url"),
  ownerId: varchar("owner_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products table
export const products: any = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  shortDescription: text("short_description"),
  longDescription: text("long_description"),
  story: text("story"),
  brandId: integer("brand_id").references(() => brands.id),
  parentId: integer("parent_id").references(() => products.id), // for variants
  sku: varchar("sku", { length: 100 }).unique(),
  status: varchar("status").default("draft"), // draft, review, live, archived
  isVariant: boolean("is_variant").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product attributes table for flexible metadata
export const productAttributes = pgTable("product_attributes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  attributeName: varchar("attribute_name", { length: 100 }).notNull(),
  attributeValue: text("attribute_value"),
  attributeType: varchar("attribute_type", { length: 50 }).default("text"), // text, number, boolean, json
  createdAt: timestamp("created_at").defaultNow(),
});

// Media assets table
export const mediaAssets = pgTable("media_assets", {
  id: serial("id").primaryKey(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"),
  url: varchar("url", { length: 500 }).notNull(),
  assetType: varchar("asset_type", { length: 50 }).notNull(), // hero, product, lifestyle, brand, video, document
  productId: integer("product_id").references(() => products.id),
  brandId: integer("brand_id").references(() => brands.id),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product families/bundles table
export const productFamilies = pgTable("product_families", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  familyType: varchar("family_type", { length: 50 }).notNull(), // bundle, kit, collection, room
  brandId: integer("brand_id").references(() => brands.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Junction table for product families
export const productFamilyItems = pgTable("product_family_items", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").references(() => productFamilies.id),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").default(1),
  sortOrder: integer("sort_order").default(0),
});

// Product associations table (upsells, cross-sells, accessories, supersessions)
export const productAssociations = pgTable("product_associations", {
  id: serial("id").primaryKey(),
  sourceProductId: integer("source_product_id").references(() => products.id),
  targetProductId: integer("target_product_id").references(() => products.id),
  associationType: varchar("association_type", { length: 50 }).notNull(), // upsell, cross_sell, accessory, supersession
  createdAt: timestamp("created_at").defaultNow(),
});

// Brand-retailer permissions table
export const brandRetailers = pgTable("brand_retailers", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").references(() => brands.id),
  retailerId: varchar("retailer_id").references(() => users.id),
  permissions: jsonb("permissions"), // JSON object with permission flags
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// API syndication logs
export const syndicationLogs = pgTable("syndication_logs", {
  id: serial("id").primaryKey(),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  status: integer("status"),
  productId: integer("product_id").references(() => products.id),
  responseTime: integer("response_time"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedBrands: many(brands),
  uploadedAssets: many(mediaAssets),
  retailerPermissions: many(brandRetailers),
}));

export const brandsRelations = relations(brands, ({ one, many }) => ({
  owner: one(users, {
    fields: [brands.ownerId],
    references: [users.id],
  }),
  products: many(products),
  mediaAssets: many(mediaAssets),
  productFamilies: many(productFamilies),
  retailers: many(brandRetailers),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  parent: one(products, {
    fields: [products.parentId],
    references: [products.id],
  }),
  variants: many(products),
  attributes: many(productAttributes),
  mediaAssets: many(mediaAssets),
  familyItems: many(productFamilyItems),
  sourceAssociations: many(productAssociations, {
    relationName: "sourceProduct",
  }),
  targetAssociations: many(productAssociations, {
    relationName: "targetProduct",
  }),
  syndicationLogs: many(syndicationLogs),
}));

export const productAttributesRelations = relations(productAttributes, ({ one }) => ({
  product: one(products, {
    fields: [productAttributes.productId],
    references: [products.id],
  }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  product: one(products, {
    fields: [mediaAssets.productId],
    references: [products.id],
  }),
  brand: one(brands, {
    fields: [mediaAssets.brandId],
    references: [brands.id],
  }),
  uploader: one(users, {
    fields: [mediaAssets.uploadedBy],
    references: [users.id],
  }),
}));

export const productFamiliesRelations = relations(productFamilies, ({ one, many }) => ({
  brand: one(brands, {
    fields: [productFamilies.brandId],
    references: [brands.id],
  }),
  items: many(productFamilyItems),
}));

export const productFamilyItemsRelations = relations(productFamilyItems, ({ one }) => ({
  family: one(productFamilies, {
    fields: [productFamilyItems.familyId],
    references: [productFamilies.id],
  }),
  product: one(products, {
    fields: [productFamilyItems.productId],
    references: [products.id],
  }),
}));

export const productAssociationsRelations = relations(productAssociations, ({ one }) => ({
  sourceProduct: one(products, {
    fields: [productAssociations.sourceProductId],
    references: [products.id],
    relationName: "sourceProduct",
  }),
  targetProduct: one(products, {
    fields: [productAssociations.targetProductId],
    references: [products.id],
    relationName: "targetProduct",
  }),
}));

export const brandRetailersRelations = relations(brandRetailers, ({ one }) => ({
  brand: one(brands, {
    fields: [brandRetailers.brandId],
    references: [brands.id],
  }),
  retailer: one(users, {
    fields: [brandRetailers.retailerId],
    references: [users.id],
  }),
}));

export const syndicationLogsRelations = relations(syndicationLogs, ({ one }) => ({
  product: one(products, {
    fields: [syndicationLogs.productId],
    references: [products.id],
  }),
}));

// Insert schemas
export const insertBrandSchema = createInsertSchema(brands).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMediaAssetSchema = createInsertSchema(mediaAssets).omit({
  id: true,
  createdAt: true,
});

export const insertProductFamilySchema = createInsertSchema(productFamilies).omit({
  id: true,
  createdAt: true,
});

export const insertProductAttributeSchema = createInsertSchema(productAttributes).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type InsertMediaAsset = z.infer<typeof insertMediaAssetSchema>;
export type ProductFamily = typeof productFamilies.$inferSelect;
export type InsertProductFamily = z.infer<typeof insertProductFamilySchema>;
export type ProductAttribute = typeof productAttributes.$inferSelect;
export type InsertProductAttribute = z.infer<typeof insertProductAttributeSchema>;
export type ProductAssociation = typeof productAssociations.$inferSelect;
export type BrandRetailer = typeof brandRetailers.$inferSelect;
export type SyndicationLog = typeof syndicationLogs.$inferSelect;
