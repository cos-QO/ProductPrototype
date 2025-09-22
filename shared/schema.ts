import { sql } from "drizzle-orm";
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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("retailer"), // brand_owner, retailer, content_team
  passwordHash: varchar("password_hash", { length: 255 }),
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
  gtin: varchar("gtin", { length: 20 }),
  status: varchar("status").default("draft"), // draft, review, live, archived
  isVariant: boolean("is_variant").default(false),
  price: integer("price"), // Store as cents to avoid float issues
  compareAtPrice: integer("compare_at_price"),
  stock: integer("stock"),
  lowStockThreshold: integer("low_stock_threshold"),
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

// Syndication channels table
export const syndicationChannels = pgTable("syndication_channels", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  type: varchar("type", { length: 50 }).notNull(), // ecommerce, marketplace, social, api
  endpoint: varchar("endpoint", { length: 500 }),
  apiKey: varchar("api_key", { length: 255 }),
  webhookUrl: varchar("webhook_url", { length: 500 }),
  settings: jsonb("settings"), // Channel-specific configuration
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product syndication status per channel
export const productSyndications = pgTable("product_syndications", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  channelId: integer("channel_id").references(() => syndicationChannels.id),
  status: varchar("status", { length: 50 }).default("pending"), // pending, syncing, live, error, paused
  externalId: varchar("external_id", { length: 255 }), // ID in external system
  externalUrl: varchar("external_url", { length: 500 }), // URL in external system
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: varchar("last_sync_status", { length: 50 }),
  errorMessage: text("error_message"),
  syncRetries: integer("sync_retries").default(0),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// API syndication logs
export const syndicationLogs = pgTable("syndication_logs", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => syndicationChannels.id),
  productId: integer("product_id").references(() => products.id),
  action: varchar("action", { length: 50 }).notNull(), // create, update, delete, sync
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  status: integer("status"),
  responseTime: integer("response_time"),
  requestPayload: jsonb("request_payload"),
  responsePayload: jsonb("response_payload"),
  errorMessage: text("error_message"),
  triggeredBy: varchar("triggered_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Import session tracking for enhanced bulk upload
export const importSessions = pgTable("import_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).unique().notNull(),
  userId: varchar("user_id").references(() => users.id),
  fileName: varchar("file_name", { length: 500 }),
  filePath: varchar("file_path", { length: 1000 }), // Path to uploaded file for persistence
  fileSize: integer("file_size"),
  fileType: varchar("file_type", { length: 50 }),
  totalRecords: integer("total_records"),
  processedRecords: integer("processed_records").default(0),
  successfulRecords: integer("successful_records").default(0),
  failedRecords: integer("failed_records").default(0),
  status: varchar("status", { length: 50 }).default("initiated"), // initiated, analyzing, mapping, mapping_complete, generating_preview, preview_ready, awaiting_approval, previewing, processing, completed, failed, cancelled
  workflowState: varchar("workflow_state", { length: 50 }), // Workflow automation state tracking
  errorLog: jsonb("error_log"),
  fieldMappings: jsonb("field_mappings"),
  importConfig: jsonb("import_config"),
  processingRate: integer("processing_rate"), // records per second
  estimatedTimeRemaining: integer("estimated_time_remaining"), // seconds
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Field mapping cache for intelligent learning
export const fieldMappingCache = pgTable("field_mapping_cache", {
  id: serial("id").primaryKey(),
  sourceField: varchar("source_field", { length: 255 }).notNull(),
  sourceFieldPattern: varchar("source_field_pattern", { length: 255 }),
  targetField: varchar("target_field", { length: 255 }).notNull(),
  confidence: integer("confidence"), // 0-100 for percentage
  successRate: integer("success_rate").default(0), // 0-100 for percentage success
  strategy: varchar("strategy", { length: 50 }).notNull(), // exact, fuzzy, llm, historical, statistical
  dataType: varchar("data_type", { length: 50 }).notNull(), // string, number, boolean, date, json
  sampleValues: jsonb("sample_values"),
  metadata: jsonb("metadata"), // Additional context about the mapping
  usageCount: integer("usage_count").default(1),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Import history and audit trail
export const importHistory = pgTable("import_history", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id").references(() => importSessions.sessionId),
  recordIndex: integer("record_index").notNull(),
  recordData: jsonb("record_data").notNull(),
  validationErrors: jsonb("validation_errors"),
  importStatus: varchar("import_status", { length: 50 }).notNull(), // success, failed, skipped, fixed
  entityType: varchar("entity_type", { length: 50 }).notNull(), // product, brand, attribute
  entityId: integer("entity_id"), // ID of created/updated entity
  processingTime: integer("processing_time"), // milliseconds
  retryCount: integer("retry_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Import batch processing tracking
export const importBatches = pgTable("import_batches", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id").references(() => importSessions.sessionId),
  batchNumber: integer("batch_number").notNull(),
  startIndex: integer("start_index").notNull(),
  endIndex: integer("end_index").notNull(),
  recordCount: integer("record_count").notNull(),
  status: varchar("status", { length: 50 }).default("pending"), // pending, processing, completed, failed
  processingTime: integer("processing_time"), // milliseconds
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  workerThread: varchar("worker_thread", { length: 100 }),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedBrands: many(brands),
  uploadedAssets: many(mediaAssets),
  retailerPermissions: many(brandRetailers),
  importSessions: many(importSessions),
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
  syndications: many(productSyndications),
  syndicationLogs: many(syndicationLogs),
}));

export const productAttributesRelations = relations(
  productAttributes,
  ({ one }) => ({
    product: one(products, {
      fields: [productAttributes.productId],
      references: [products.id],
    }),
  }),
);

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

export const productFamiliesRelations = relations(
  productFamilies,
  ({ one, many }) => ({
    brand: one(brands, {
      fields: [productFamilies.brandId],
      references: [brands.id],
    }),
    items: many(productFamilyItems),
  }),
);

export const productFamilyItemsRelations = relations(
  productFamilyItems,
  ({ one }) => ({
    family: one(productFamilies, {
      fields: [productFamilyItems.familyId],
      references: [productFamilies.id],
    }),
    product: one(products, {
      fields: [productFamilyItems.productId],
      references: [products.id],
    }),
  }),
);

export const productAssociationsRelations = relations(
  productAssociations,
  ({ one }) => ({
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
  }),
);

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

export const syndicationChannelsRelations = relations(
  syndicationChannels,
  ({ many }) => ({
    productSyndications: many(productSyndications),
    syndicationLogs: many(syndicationLogs),
  }),
);

export const productSyndicationsRelations = relations(
  productSyndications,
  ({ one }) => ({
    product: one(products, {
      fields: [productSyndications.productId],
      references: [products.id],
    }),
    channel: one(syndicationChannels, {
      fields: [productSyndications.channelId],
      references: [syndicationChannels.id],
    }),
  }),
);

export const syndicationLogsRelations = relations(
  syndicationLogs,
  ({ one }) => ({
    product: one(products, {
      fields: [syndicationLogs.productId],
      references: [products.id],
    }),
    channel: one(syndicationChannels, {
      fields: [syndicationLogs.channelId],
      references: [syndicationChannels.id],
    }),
    user: one(users, {
      fields: [syndicationLogs.triggeredBy],
      references: [users.id],
    }),
  }),
);

export const importSessionsRelations = relations(
  importSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [importSessions.userId],
      references: [users.id],
    }),
    history: many(importHistory),
    batches: many(importBatches),
  }),
);

export const importHistoryRelations = relations(importHistory, ({ one }) => ({
  session: one(importSessions, {
    fields: [importHistory.sessionId],
    references: [importSessions.sessionId],
  }),
}));

export const importBatchesRelations = relations(importBatches, ({ one }) => ({
  session: one(importSessions, {
    fields: [importBatches.sessionId],
    references: [importSessions.sessionId],
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

export const insertProductFamilySchema = createInsertSchema(
  productFamilies,
).omit({
  id: true,
  createdAt: true,
});

export const insertProductAttributeSchema = createInsertSchema(
  productAttributes,
).omit({
  id: true,
  createdAt: true,
});

export const insertSyndicationChannelSchema = createInsertSchema(
  syndicationChannels,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSyndicationSchema = createInsertSchema(
  productSyndications,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSyndicationLogSchema = createInsertSchema(
  syndicationLogs,
).omit({
  id: true,
  createdAt: true,
});

export const insertImportSessionSchema = createInsertSchema(
  importSessions,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFieldMappingCacheSchema = createInsertSchema(
  fieldMappingCache,
).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export const insertImportHistorySchema = createInsertSchema(importHistory).omit(
  {
    id: true,
    createdAt: true,
  },
);

export const insertImportBatchSchema = createInsertSchema(importBatches).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert & { password?: string };
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
export type InsertProductAttribute = z.infer<
  typeof insertProductAttributeSchema
>;
export type ProductAssociation = typeof productAssociations.$inferSelect;
export type BrandRetailer = typeof brandRetailers.$inferSelect;
export type SyndicationChannel = typeof syndicationChannels.$inferSelect;
export type InsertSyndicationChannel = z.infer<
  typeof insertSyndicationChannelSchema
>;
export type ProductSyndication = typeof productSyndications.$inferSelect;
export type InsertProductSyndication = z.infer<
  typeof insertProductSyndicationSchema
>;
export type SyndicationLog = typeof syndicationLogs.$inferSelect;
export type InsertSyndicationLog = z.infer<typeof insertSyndicationLogSchema>;
export type ImportSession = typeof importSessions.$inferSelect;
export type InsertImportSession = z.infer<typeof insertImportSessionSchema>;
export type FieldMappingCache = typeof fieldMappingCache.$inferSelect;
export type InsertFieldMappingCache = z.infer<
  typeof insertFieldMappingCacheSchema
>;
export type ImportHistory = typeof importHistory.$inferSelect;
export type InsertImportHistory = z.infer<typeof insertImportHistorySchema>;
export type ImportBatch = typeof importBatches.$inferSelect;
export type InsertImportBatch = z.infer<typeof insertImportBatchSchema>;

// Workflow automation types
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number; // 0-100
  strategy: "exact" | "fuzzy" | "llm" | "historical" | "statistical";
  metadata?: any;
}

export interface ValidationResult {
  success: boolean;
  sessionId: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: ValidationError[];
  previewData: any[];
  error?: string;
}

export interface ValidationError {
  recordIndex: number;
  field: string;
  value: any;
  rule: string;
  severity: "error" | "warning";
  suggestion?: string;
  autoFix?: {
    action: string;
    newValue: any;
  };
}
