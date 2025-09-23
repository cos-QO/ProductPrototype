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
  decimal,
  interval,
  date,
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

// Test execution tracking for automated edge case testing
export const testExecutions = pgTable("test_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  scenario: jsonb("scenario").notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  results: jsonb("results"),
  performanceMetrics: jsonb("performance_metrics"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Core approval request tracking
export const approvalRequests = pgTable("approval_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(),
  riskLevel: varchar("risk_level", { length: 20 }).notNull(),
  priority: varchar("priority", { length: 20 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  context: jsonb("context").notNull(),
  riskAssessment: jsonb("risk_assessment").notNull(),
  
  // Assignment and routing
  assignedTo: varchar("assigned_to", { length: 100 }).array().notNull(),
  currentApprover: varchar("current_approver", { length: 100 }),
  escalationPath: varchar("escalation_path", { length: 100 }).array(),
  
  // Status and timing
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  deadline: timestamp("deadline").notNull(),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by", { length: 100 }),
  
  // Decision tracking
  decision: jsonb("decision"),
  decisionReasoning: text("decision_reasoning"),
  
  // Integration references
  testExecutionId: varchar("test_execution_id").references(() => testExecutions.id),
  importSessionId: varchar("import_session_id").references(() => importSessions.sessionId),
  
  // Metadata
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
}, (table) => [
  index("idx_approval_requests_status").on(table.status),
  index("idx_approval_requests_assigned_to").on(table.assignedTo),
  index("idx_approval_requests_created_at").on(table.createdAt),
  index("idx_approval_requests_deadline").on(table.deadline),
  index("idx_approval_requests_risk_level").on(table.riskLevel),
  index("idx_approval_requests_type").on(table.type),
]);

// Approval decision audit trail
export const approvalDecisions = pgTable("approval_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  approvalRequestId: varchar("approval_request_id").notNull().references(() => approvalRequests.id),
  decision: varchar("decision", { length: 20 }).notNull(),
  approver: varchar("approver", { length: 100 }).notNull(),
  reasoning: text("reasoning"),
  conditions: jsonb("conditions"),
  timestamp: timestamp("timestamp").defaultNow(),
  
  // Decision context
  contextAtDecision: jsonb("context_at_decision").notNull(),
  systemRecommendation: varchar("system_recommendation", { length: 20 }),
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }),
  
  // Metadata
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
}, (table) => [
  index("idx_approval_decisions_approval_request_id").on(table.approvalRequestId),
  index("idx_approval_decisions_approver").on(table.approver),
  index("idx_approval_decisions_timestamp").on(table.timestamp),
]);

// User approval preferences and learning
export const approvalPreferences = pgTable("approval_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 100 }).notNull(),
  
  // Automation preferences
  autoApproveLowRisk: boolean("auto_approve_low_risk").default(false),
  autoApproveConfidenceThreshold: decimal("auto_approve_confidence_threshold", { precision: 3, scale: 2 }).default(sql`0.85`),
  preferredNotificationMethod: varchar("preferred_notification_method", { length: 20 }).default("in_app"),
  
  // Delegation settings
  delegateTo: varchar("delegate_to", { length: 100 }),
  delegationRules: jsonb("delegation_rules").default(sql`'{}'::jsonb`),
  
  // Learning data
  decisionPatterns: jsonb("decision_patterns").default(sql`'{}'::jsonb`),
  performanceMetrics: jsonb("performance_metrics").default(sql`'{}'::jsonb`),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_approval_preferences_user_id").on(table.userId),
]);

// Approval performance metrics
export const approvalMetrics = pgTable("approval_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: date("date").notNull(),
  approver: varchar("approver", { length: 100 }),
  
  // Metrics
  totalApprovals: integer("total_approvals").default(0),
  automatedApprovals: integer("automated_approvals").default(0),
  manualApprovals: integer("manual_approvals").default(0),
  averageDecisionTime: interval("average_decision_time"),
  
  // Accuracy metrics
  correctDecisions: integer("correct_decisions").default(0),
  incorrectDecisions: integer("incorrect_decisions").default(0),
  accuracyRate: decimal("accuracy_rate", { precision: 5, scale: 4 }),
  
  // Performance breakdown
  approvalsByType: jsonb("approvals_by_type").default(sql`'{}'::jsonb`),
  approvalsByRisk: jsonb("approvals_by_risk").default(sql`'{}'::jsonb`),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_approval_metrics_date").on(table.date),
  index("idx_approval_metrics_approver").on(table.approver),
]);

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

export const testExecutionsRelations = relations(testExecutions, ({ many }) => ({
  approvalRequests: many(approvalRequests),
}));

export const approvalRequestsRelations = relations(approvalRequests, ({ one, many }) => ({
  testExecution: one(testExecutions, {
    fields: [approvalRequests.testExecutionId],
    references: [testExecutions.id],
  }),
  importSession: one(importSessions, {
    fields: [approvalRequests.importSessionId],
    references: [importSessions.sessionId],
  }),
  decisions: many(approvalDecisions),
}));

export const approvalDecisionsRelations = relations(approvalDecisions, ({ one }) => ({
  approvalRequest: one(approvalRequests, {
    fields: [approvalDecisions.approvalRequestId],
    references: [approvalRequests.id],
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

export const insertTestExecutionSchema = createInsertSchema(testExecutions).omit({
  id: true,
  createdAt: true,
});

export const insertApprovalRequestSchema = createInsertSchema(approvalRequests).omit({
  id: true,
  createdAt: true,
});

export const insertApprovalDecisionSchema = createInsertSchema(approvalDecisions).omit({
  id: true,
  timestamp: true,
});

export const insertApprovalPreferencesSchema = createInsertSchema(approvalPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApprovalMetricsSchema = createInsertSchema(approvalMetrics).omit({
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
export type TestExecution = typeof testExecutions.$inferSelect;
export type InsertTestExecution = z.infer<typeof insertTestExecutionSchema>;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;
export type ApprovalDecision = typeof approvalDecisions.$inferSelect;
export type InsertApprovalDecision = z.infer<typeof insertApprovalDecisionSchema>;
export type ApprovalPreferences = typeof approvalPreferences.$inferSelect;
export type InsertApprovalPreferences = z.infer<typeof insertApprovalPreferencesSchema>;
export type ApprovalMetrics = typeof approvalMetrics.$inferSelect;
export type InsertApprovalMetrics = z.infer<typeof insertApprovalMetricsSchema>;

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

// Approval system types
export type ApprovalType = 'data_integrity' | 'performance_impact' | 'security_risk' | 'business_logic' | 'large_dataset';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'timeout';
export type DecisionType = 'approve' | 'reject' | 'escalate' | 'delegate';

export interface ApprovalContext {
  scenario?: any;
  currentResults?: any;
  riskAssessment: {
    level: RiskLevel;
    factors: string[];
    score: number;
    mitigationOptions: string[];
  };
  recommendations: {
    action: string;
    reasoning: string;
    confidence: number;
  }[];
  historicalOutcomes?: any[];
  businessImpact?: string;
  technicalImpact?: string;
}

export interface ApprovalWorkflow {
  id: string;
  request: ApprovalRequest;
  currentStep: string;
  nextSteps: string[];
  timeoutBehavior: 'escalate' | 'auto_approve' | 'auto_reject' | 'hold';
  escalationTriggers: string[];
}

export interface RiskAssessment {
  level: RiskLevel;
  score: number; // 0-100
  factors: string[];
  impactAreas: string[];
  mitigationStrategies: string[];
  confidenceLevel: number;
}

export interface RoutingDecision {
  route: 'automated' | 'approval_required' | 'escalation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedApprovers: string[];
  timeoutDuration: number; // minutes
  escalationPath: string[];
  reasoning: string;
  confidence: number;
}
