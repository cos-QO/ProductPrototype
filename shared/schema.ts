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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  scenario: jsonb("scenario").notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  results: jsonb("results"),
  performanceMetrics: jsonb("performance_metrics"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Core approval request tracking
export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
    testExecutionId: varchar("test_execution_id").references(
      () => testExecutions.id,
    ),
    importSessionId: varchar("import_session_id").references(
      () => importSessions.sessionId,
    ),

    // Metadata
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  },
  (table) => [
    index("idx_approval_requests_status").on(table.status),
    index("idx_approval_requests_assigned_to").on(table.assignedTo),
    index("idx_approval_requests_created_at").on(table.createdAt),
    index("idx_approval_requests_deadline").on(table.deadline),
    index("idx_approval_requests_risk_level").on(table.riskLevel),
    index("idx_approval_requests_type").on(table.type),
  ],
);

// Approval decision audit trail
export const approvalDecisions = pgTable(
  "approval_decisions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    approvalRequestId: varchar("approval_request_id")
      .notNull()
      .references(() => approvalRequests.id),
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
  },
  (table) => [
    index("idx_approval_decisions_approval_request_id").on(
      table.approvalRequestId,
    ),
    index("idx_approval_decisions_approver").on(table.approver),
    index("idx_approval_decisions_timestamp").on(table.timestamp),
  ],
);

// User approval preferences and learning
export const approvalPreferences = pgTable(
  "approval_preferences",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 100 }).notNull(),

    // Automation preferences
    autoApproveLowRisk: boolean("auto_approve_low_risk").default(false),
    autoApproveConfidenceThreshold: decimal(
      "auto_approve_confidence_threshold",
      { precision: 3, scale: 2 },
    ).default(sql`0.85`),
    preferredNotificationMethod: varchar("preferred_notification_method", {
      length: 20,
    }).default("in_app"),

    // Delegation settings
    delegateTo: varchar("delegate_to", { length: 100 }),
    delegationRules: jsonb("delegation_rules").default(sql`'{}'::jsonb`),

    // Learning data
    decisionPatterns: jsonb("decision_patterns").default(sql`'{}'::jsonb`),
    performanceMetrics: jsonb("performance_metrics").default(sql`'{}'::jsonb`),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_approval_preferences_user_id").on(table.userId)],
);

// Approval performance metrics
export const approvalMetrics = pgTable(
  "approval_metrics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
  },
  (table) => [
    index("idx_approval_metrics_date").on(table.date),
    index("idx_approval_metrics_approver").on(table.approver),
  ],
);

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

export const testExecutionsRelations = relations(
  testExecutions,
  ({ many }) => ({
    approvalRequests: many(approvalRequests),
  }),
);

export const approvalRequestsRelations = relations(
  approvalRequests,
  ({ one, many }) => ({
    testExecution: one(testExecutions, {
      fields: [approvalRequests.testExecutionId],
      references: [testExecutions.id],
    }),
    importSession: one(importSessions, {
      fields: [approvalRequests.importSessionId],
      references: [importSessions.sessionId],
    }),
    decisions: many(approvalDecisions),
  }),
);

export const approvalDecisionsRelations = relations(
  approvalDecisions,
  ({ one }) => ({
    approvalRequest: one(approvalRequests, {
      fields: [approvalDecisions.approvalRequestId],
      references: [approvalRequests.id],
    }),
  }),
);

// LLM Edge Case Detection Tables

// Edge case detection results
export const edgeCaseDetections = pgTable(
  "edge_case_detections",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id").notNull(),
    userId: varchar("user_id").notNull(),
    pattern: varchar("pattern", { length: 500 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    confidence: integer("confidence").notNull(), // 0-100
    severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high, critical
    description: text("description").notNull(),

    // Detection context
    errorCount: integer("error_count").notNull(),
    dataContext: jsonb("data_context").notNull(),
    riskAssessment: jsonb("risk_assessment").notNull(),
    suggestedActions: jsonb("suggested_actions").notNull(),

    // Automation recommendations
    automationRecommendation: jsonb("automation_recommendation"),
    testRecommendation: jsonb("test_recommendation"),

    // Status and processing
    status: varchar("status", { length: 50 }).default("detected"), // detected, processed, resolved, escalated
    processingTime: integer("processing_time"), // milliseconds
    llmCost: decimal("llm_cost", { precision: 8, scale: 6 }), // USD cost

    // References
    approvalRequestId: varchar("approval_request_id").references(
      () => approvalRequests.id,
    ),
    importSessionId: varchar("import_session_id").references(
      () => importSessions.sessionId,
    ),

    // Metadata
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_edge_case_detections_session_id").on(table.sessionId),
    index("idx_edge_case_detections_user_id").on(table.userId),
    index("idx_edge_case_detections_pattern").on(table.pattern),
    index("idx_edge_case_detections_category").on(table.category),
    index("idx_edge_case_detections_severity").on(table.severity),
    index("idx_edge_case_detections_created_at").on(table.createdAt),
  ],
);

// Error pattern analysis and storage
export const errorPatterns = pgTable(
  "error_patterns",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    signature: varchar("signature", { length: 500 }).unique().notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    description: text("description").notNull(),

    // Pattern characteristics
    riskLevel: varchar("risk_level", { length: 20 }).notNull(),
    confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
    frequency: integer("frequency").default(1),
    totalOccurrences: integer("total_occurrences").default(1),

    // Performance metrics
    successRate: decimal("success_rate", { precision: 5, scale: 4 }).default(
      sql`0`,
    ),
    averageResolutionTime: integer("average_resolution_time").default(0), // minutes

    // Temporal tracking
    firstSeen: timestamp("first_seen").defaultNow(),
    lastSeen: timestamp("last_seen").defaultNow(),
    trendDirection: varchar("trend_direction", { length: 20 }), // increasing, decreasing, stable, spike

    // Resolution strategies
    resolutionStrategies: jsonb("resolution_strategies"),
    automationEligible: boolean("automation_eligible").default(false),

    // Metadata
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_error_patterns_signature").on(table.signature),
    index("idx_error_patterns_category").on(table.category),
    index("idx_error_patterns_risk_level").on(table.riskLevel),
    index("idx_error_patterns_frequency").on(table.frequency),
    index("idx_error_patterns_last_seen").on(table.lastSeen),
  ],
);

// Error analytics and real-time tracking
export const errorAnalytics = pgTable(
  "error_analytics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    patternId: varchar("pattern_id")
      .notNull()
      .references(() => errorPatterns.id),
    sessionId: varchar("session_id").notNull(),
    patternSignature: varchar("pattern_signature", { length: 500 }).notNull(),

    // Analytics data
    errorCount: integer("error_count").notNull(),
    confidence: integer("confidence").notNull(), // 0-100
    riskLevel: varchar("risk_level", { length: 20 }).notNull(),

    // Context
    userContext: jsonb("user_context"),
    dataContext: jsonb("data_context"),

    // Metadata
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    timestamp: timestamp("timestamp").defaultNow(),
  },
  (table) => [
    index("idx_error_analytics_pattern_id").on(table.patternId),
    index("idx_error_analytics_session_id").on(table.sessionId),
    index("idx_error_analytics_timestamp").on(table.timestamp),
  ],
);

// Generated test cases from dynamic test generator
export const generatedTestCases = pgTable(
  "generated_test_cases",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    suiteId: varchar("suite_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull(),

    // Test configuration
    type: varchar("type", { length: 50 }).notNull(), // unit, integration, e2e, performance
    priority: varchar("priority", { length: 20 }).notNull(), // low, medium, high, critical
    estimatedDuration: integer("estimated_duration"), // seconds

    // Test data
    testData: jsonb("test_data").notNull(),
    expectedResults: jsonb("expected_results").notNull(),
    validationRules: jsonb("validation_rules").notNull(),

    // Generation context
    edgeCasePattern: varchar("edge_case_pattern", { length: 500 }),
    generatedBy: varchar("generated_by", { length: 50 }).notNull(), // llm, template, manual
    generationConfidence: integer("generation_confidence"), // 0-100

    // Execution tracking
    executionCount: integer("execution_count").default(0),
    successCount: integer("success_count").default(0),
    lastExecutedAt: timestamp("last_executed_at"),

    // Metadata
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_generated_test_cases_suite_id").on(table.suiteId),
    index("idx_generated_test_cases_type").on(table.type),
    index("idx_generated_test_cases_priority").on(table.priority),
    index("idx_generated_test_cases_pattern").on(table.edgeCasePattern),
  ],
);

// Edge case specific test cases
export const edgeCaseTestCases = pgTable(
  "edge_case_test_cases",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    detectionId: varchar("detection_id")
      .notNull()
      .references(() => edgeCaseDetections.id),
    testCaseId: varchar("test_case_id")
      .notNull()
      .references(() => generatedTestCases.id),

    // Association metadata
    relevanceScore: integer("relevance_score"), // 0-100
    expectedOutcome: varchar("expected_outcome", { length: 100 }),

    // Execution results
    lastExecutionStatus: varchar("last_execution_status", { length: 50 }),
    lastExecutionResults: jsonb("last_execution_results"),

    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_edge_case_test_cases_detection_id").on(table.detectionId),
    index("idx_edge_case_test_cases_test_case_id").on(table.testCaseId),
  ],
);

// ML feedback and learning sessions
export const mlFeedbackSessions = pgTable(
  "ml_feedback_sessions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    sessionType: varchar("session_type", { length: 50 }).notNull(), // decision_feedback, pattern_learning, performance_update

    // Feedback data
    feedbackData: jsonb("feedback_data").notNull(),
    learningOutcomes: jsonb("learning_outcomes"),

    // Performance metrics
    accuracyImprovement: decimal("accuracy_improvement", {
      precision: 5,
      scale: 4,
    }),
    confidenceChange: decimal("confidence_change", { precision: 5, scale: 4 }),
    processingTime: integer("processing_time"), // milliseconds

    // References
    approvalRequestId: varchar("approval_request_id").references(
      () => approvalRequests.id,
    ),
    detectionId: varchar("detection_id").references(
      () => edgeCaseDetections.id,
    ),

    // Metadata
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_ml_feedback_sessions_user_id").on(table.userId),
    index("idx_ml_feedback_sessions_type").on(table.sessionType),
    index("idx_ml_feedback_sessions_created_at").on(table.createdAt),
  ],
);

// ML learning patterns storage
export const mlLearningPatterns = pgTable(
  "ml_learning_patterns",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    patternType: varchar("pattern_type", { length: 50 }).notNull(),
    patternData: jsonb("pattern_data").notNull(),

    // Pattern characteristics
    confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
    applicability: decimal("applicability", {
      precision: 5,
      scale: 4,
    }).notNull(),
    effectiveness: decimal("effectiveness", {
      precision: 5,
      scale: 4,
    }).notNull(),

    // Usage tracking
    usageCount: integer("usage_count").default(0),
    successRate: decimal("success_rate", { precision: 5, scale: 4 }).default(
      sql`0`,
    ),

    // Context
    userContext: jsonb("user_context"),
    domainContext: varchar("domain_context", { length: 100 }),

    // Temporal tracking
    lastUsedAt: timestamp("last_used_at"),
    lastUpdatedAt: timestamp("last_updated_at").defaultNow(),

    // Metadata
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_ml_learning_patterns_type").on(table.patternType),
    index("idx_ml_learning_patterns_confidence").on(table.confidence),
    index("idx_ml_learning_patterns_effectiveness").on(table.effectiveness),
    index("idx_ml_learning_patterns_last_used").on(table.lastUsedAt),
  ],
);

// User behavior profiles for ML learning
export const userBehaviorProfiles = pgTable(
  "user_behavior_profiles",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").unique().notNull(),

    // Experience and preferences
    experienceLevel: varchar("experience_level", { length: 20 }).default(
      "intermediate",
    ), // novice, intermediate, expert
    riskTolerance: varchar("risk_tolerance", { length: 20 }).default(
      "balanced",
    ), // conservative, balanced, aggressive
    automationPreference: decimal("automation_preference", {
      precision: 3,
      scale: 2,
    }).default(sql`0.6`), // 0-1

    // Decision patterns
    decisionPatterns: jsonb("decision_patterns").default(sql`'{}'::jsonb`),
    performanceHistory: jsonb("performance_history").default(sql`'{}'::jsonb`),

    // Learning metrics
    learningVelocity: decimal("learning_velocity", {
      precision: 5,
      scale: 4,
    }).default(sql`0.5`),
    adaptabilityScore: decimal("adaptability_score", {
      precision: 5,
      scale: 4,
    }).default(sql`0.5`),

    // Interaction preferences
    preferredNotificationMethod: varchar("preferred_notification_method", {
      length: 20,
    }).default("in_app"),
    explanationDepth: varchar("explanation_depth", { length: 20 }).default(
      "standard",
    ), // minimal, standard, detailed

    // Metadata
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_user_behavior_profiles_user_id").on(table.userId),
    index("idx_user_behavior_profiles_experience").on(table.experienceLevel),
    index("idx_user_behavior_profiles_learning_velocity").on(
      table.learningVelocity,
    ),
  ],
);

// Automation confidence tracking
export const automationConfidence = pgTable(
  "automation_confidence",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    category: varchar("category", { length: 100 }).notNull(),
    context: varchar("context", { length: 200 }),

    // Confidence metrics
    currentConfidence: decimal("current_confidence", {
      precision: 5,
      scale: 4,
    }).notNull(),
    previousConfidence: decimal("previous_confidence", {
      precision: 5,
      scale: 4,
    }),
    confidenceChange: decimal("confidence_change", { precision: 5, scale: 4 }),

    // Evidence and validation
    evidenceCount: integer("evidence_count").default(0),
    validationCount: integer("validation_count").default(0),
    successCount: integer("success_count").default(0),

    // Temporal tracking
    lastValidatedAt: timestamp("last_validated_at"),
    confidenceDecay: decimal("confidence_decay", {
      precision: 5,
      scale: 4,
    }).default(sql`0.01`), // Daily decay rate

    // Metadata
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_automation_confidence_category").on(table.category),
    index("idx_automation_confidence_current").on(table.currentConfidence),
    index("idx_automation_confidence_updated").on(table.updatedAt),
  ],
);

// Edge case integration workflow sessions
export const edgeCaseIntegrationSessions = pgTable(
  "edge_case_integration_sessions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workflowId: varchar("workflow_id").unique().notNull(),
    sessionId: varchar("session_id").notNull(),
    userId: varchar("user_id").notNull(),

    // Workflow status
    status: varchar("status", { length: 50 }).default("initializing"), // initializing, analyzing, detecting, generating, routing, completed, failed
    progress: integer("progress").default(0), // 0-100
    currentStep: varchar("current_step", { length: 100 }),

    // Configuration
    options: jsonb("options").notNull(),
    costLimit: decimal("cost_limit", { precision: 8, scale: 6 }),
    timeLimit: integer("time_limit"), // seconds

    // Results
    detectionResults: jsonb("detection_results"),
    testResults: jsonb("test_results"),
    approvalResults: jsonb("approval_results"),

    // Performance metrics
    processingTime: integer("processing_time"), // milliseconds
    totalCost: decimal("total_cost", { precision: 8, scale: 6 }),
    resourceUsage: jsonb("resource_usage"),

    // Timestamps
    startTime: timestamp("start_time").defaultNow(),
    endTime: timestamp("end_time"),

    // Metadata
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_edge_case_integration_workflow_id").on(table.workflowId),
    index("idx_edge_case_integration_session_id").on(table.sessionId),
    index("idx_edge_case_integration_user_id").on(table.userId),
    index("idx_edge_case_integration_status").on(table.status),
    index("idx_edge_case_integration_created_at").on(table.createdAt),
  ],
);

// Comprehensive Automation Analytics Tables

// Automation execution metrics
export const automationMetrics = pgTable(
  "automation_metrics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    date: date("date").notNull(),
    hourly: boolean("hourly").default(false), // Track hourly granularity
    userId: varchar("user_id"),

    // Core automation metrics
    totalTests: integer("total_tests").default(0),
    automatedTests: integer("automated_tests").default(0),
    manualInterventions: integer("manual_interventions").default(0),
    automationRate: decimal("automation_rate", { precision: 5, scale: 4 }).default(sql`0`), // 80/20 target

    // Performance metrics
    averageExecutionTime: integer("average_execution_time").default(0), // milliseconds
    totalProcessingTime: integer("total_processing_time").default(0), // milliseconds
    passRate: decimal("pass_rate", { precision: 5, scale: 4 }).default(sql`0`), // Test pass rate
    errorRate: decimal("error_rate", { precision: 5, scale: 4 }).default(sql`0`), // Error rate

    // Edge case detection effectiveness
    edgeCasesDetected: integer("edge_cases_detected").default(0),
    truePositives: integer("true_positives").default(0),
    falsePositives: integer("false_positives").default(0),
    falseNegatives: integer("false_negatives").default(0),
    detectionAccuracy: decimal("detection_accuracy", { precision: 5, scale: 4 }).default(sql`0`),

    // Cost and resource optimization
    llmCosts: decimal("llm_costs", { precision: 10, scale: 6 }).default(sql`0`), // USD
    tokensUsed: integer("tokens_used").default(0),
    costPerTest: decimal("cost_per_test", { precision: 8, scale: 6 }).default(sql`0`),
    resourceUtilization: decimal("resource_utilization", { precision: 5, scale: 4 }).default(sql`0`),

    // User decision patterns
    approvalRequests: integer("approval_requests").default(0),
    approvalRate: decimal("approval_rate", { precision: 5, scale: 4 }).default(sql`0`),
    averageApprovalTime: integer("average_approval_time").default(0), // minutes
    escalations: integer("escalations").default(0),

    // Performance regression detection
    performanceRegressions: integer("performance_regressions").default(0),
    regressionSeverity: varchar("regression_severity", { length: 20 }),
    alertsTriggered: integer("alerts_triggered").default(0),

    // ROI metrics
    timeSaved: integer("time_saved").default(0), // minutes
    manualEffortReduction: decimal("manual_effort_reduction", { precision: 5, scale: 4 }).default(sql`0`),
    costSavings: decimal("cost_savings", { precision: 10, scale: 2 }).default(sql`0`),

    // Metadata and tracking
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_automation_metrics_date").on(table.date),
    index("idx_automation_metrics_user_id").on(table.userId),
    index("idx_automation_metrics_hourly").on(table.hourly),
    index("idx_automation_metrics_automation_rate").on(table.automationRate),
    index("idx_automation_metrics_created_at").on(table.createdAt),
  ],
);

// Real-time system performance tracking
export const systemPerformanceMetrics = pgTable(
  "system_performance_metrics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    timestamp: timestamp("timestamp").defaultNow(),
    metricType: varchar("metric_type", { length: 50 }).notNull(), // cpu, memory, database, api_response

    // Performance data
    value: decimal("value", { precision: 10, scale: 4 }).notNull(),
    unit: varchar("unit", { length: 20 }).notNull(), // percent, milliseconds, bytes, requests_per_sec
    threshold: decimal("threshold", { precision: 10, scale: 4 }),
    isAlert: boolean("is_alert").default(false),

    // Context
    component: varchar("component", { length: 100 }), // test_generator, llm_detector, approval_service
    operationId: varchar("operation_id"), // Reference to specific operation
    sessionId: varchar("session_id"), // Reference to session

    // Performance breakdown
    details: jsonb("details").default(sql`'{}'::jsonb`),

    // Metadata
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  },
  (table) => [
    index("idx_system_performance_timestamp").on(table.timestamp),
    index("idx_system_performance_type").on(table.metricType),
    index("idx_system_performance_component").on(table.component),
    index("idx_system_performance_alert").on(table.isAlert),
    index("idx_system_performance_session").on(table.sessionId),
  ],
);

// Test execution analytics with detailed tracking
export const testExecutionAnalytics = pgTable(
  "test_execution_analytics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    testExecutionId: varchar("test_execution_id")
      .notNull()
      .references(() => testExecutions.id),
    
    // Execution details
    testType: varchar("test_type", { length: 50 }).notNull(),
    status: varchar("status", { length: 50 }).notNull(),
    executionTime: integer("execution_time").notNull(), // milliseconds
    setupTime: integer("setup_time").default(0),
    teardownTime: integer("teardown_time").default(0),

    // Resource utilization
    cpuUsage: decimal("cpu_usage", { precision: 5, scale: 2 }),
    memoryUsage: integer("memory_usage"), // bytes
    networkLatency: integer("network_latency"), // milliseconds
    databaseQueries: integer("database_queries").default(0),

    // Quality metrics
    codeCoverage: decimal("code_coverage", { precision: 5, scale: 2 }),
    assertionsPassed: integer("assertions_passed").default(0),
    assertionsFailed: integer("assertions_failed").default(0),
    warningsGenerated: integer("warnings_generated").default(0),

    // Edge case specific metrics
    edgeCasesTriggered: integer("edge_cases_triggered").default(0),
    edgeCasesSolved: integer("edge_cases_solved").default(0),
    llmInteractions: integer("llm_interactions").default(0),
    llmCost: decimal("llm_cost", { precision: 8, scale: 6 }).default(sql`0`),

    // Error analysis
    errorDetails: jsonb("error_details"),
    errorCategory: varchar("error_category", { length: 100 }),
    errorResolution: varchar("error_resolution", { length: 50 }), // automated, manual, escalated

    // Context and metadata
    environment: varchar("environment", { length: 50 }), // dev, staging, production
    browserInfo: jsonb("browser_info"),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_test_execution_analytics_test_id").on(table.testExecutionId),
    index("idx_test_execution_analytics_type").on(table.testType),
    index("idx_test_execution_analytics_status").on(table.status),
    index("idx_test_execution_analytics_execution_time").on(table.executionTime),
    index("idx_test_execution_analytics_created_at").on(table.createdAt),
  ],
);

// Cost optimization and LLM usage tracking
export const costOptimizationMetrics = pgTable(
  "cost_optimization_metrics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    date: date("date").notNull(),
    service: varchar("service", { length: 50 }).notNull(), // openai, anthropic, local_llm
    operation: varchar("operation", { length: 100 }).notNull(), // edge_detection, test_generation, analysis

    // Usage metrics
    requestCount: integer("request_count").default(0),
    tokenCount: integer("token_count").default(0),
    inputTokens: integer("input_tokens").default(0),
    outputTokens: integer("output_tokens").default(0),

    // Cost tracking
    totalCost: decimal("total_cost", { precision: 10, scale: 6 }).default(sql`0`),
    costPerRequest: decimal("cost_per_request", { precision: 8, scale: 6 }).default(sql`0`),
    costPerToken: decimal("cost_per_token", { precision: 10, scale: 8 }).default(sql`0`),

    // Performance tracking
    averageLatency: integer("average_latency").default(0), // milliseconds
    successRate: decimal("success_rate", { precision: 5, scale: 4 }).default(sql`0`),
    errorRate: decimal("error_rate", { precision: 5, scale: 4 }).default(sql`0`),

    // Optimization insights
    cacheHitRate: decimal("cache_hit_rate", { precision: 5, scale: 4 }).default(sql`0`),
    redundantRequests: integer("redundant_requests").default(0),
    optimizationOpportunities: jsonb("optimization_opportunities"),

    // Budget tracking
    budgetUsed: decimal("budget_used", { precision: 5, scale: 4 }).default(sql`0`), // percentage
    budgetRemaining: decimal("budget_remaining", { precision: 10, scale: 2 }),
    projectedSpend: decimal("projected_spend", { precision: 10, scale: 2 }),

    // Metadata
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_cost_optimization_date").on(table.date),
    index("idx_cost_optimization_service").on(table.service),
    index("idx_cost_optimization_operation").on(table.operation),
    index("idx_cost_optimization_total_cost").on(table.totalCost),
    index("idx_cost_optimization_created_at").on(table.createdAt),
  ],
);

// Trend analysis and historical performance
export const performanceTrends = pgTable(
  "performance_trends",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    metric: varchar("metric", { length: 100 }).notNull(),
    timeframe: varchar("timeframe", { length: 20 }).notNull(), // hourly, daily, weekly, monthly
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),

    // Trend calculations
    currentValue: decimal("current_value", { precision: 10, scale: 4 }).notNull(),
    previousValue: decimal("previous_value", { precision: 10, scale: 4 }),
    trendDirection: varchar("trend_direction", { length: 20 }), // increasing, decreasing, stable, volatile
    changePercentage: decimal("change_percentage", { precision: 6, scale: 3 }),
    
    // Statistical analysis
    average: decimal("average", { precision: 10, scale: 4 }),
    median: decimal("median", { precision: 10, scale: 4 }),
    standardDeviation: decimal("standard_deviation", { precision: 10, scale: 4 }),
    min: decimal("min", { precision: 10, scale: 4 }),
    max: decimal("max", { precision: 10, scale: 4 }),

    // Prediction and forecasting
    predictedValue: decimal("predicted_value", { precision: 10, scale: 4 }),
    confidenceInterval: decimal("confidence_interval", { precision: 5, scale: 4 }),
    seasonalityFactor: decimal("seasonality_factor", { precision: 5, scale: 4 }),

    // Anomaly detection
    isAnomaly: boolean("is_anomaly").default(false),
    anomalyScore: decimal("anomaly_score", { precision: 5, scale: 4 }),
    anomalyThreshold: decimal("anomaly_threshold", { precision: 5, scale: 4 }),

    // Data quality
    dataPoints: integer("data_points").notNull(),
    dataQuality: decimal("data_quality", { precision: 3, scale: 2 }), // 0-1 quality score
    missingDataPercentage: decimal("missing_data_percentage", { precision: 5, scale: 2 }),

    // Metadata
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    calculatedAt: timestamp("calculated_at").defaultNow(),
  },
  (table) => [
    index("idx_performance_trends_metric").on(table.metric),
    index("idx_performance_trends_timeframe").on(table.timeframe),
    index("idx_performance_trends_start_date").on(table.startDate),
    index("idx_performance_trends_trend_direction").on(table.trendDirection),
    index("idx_performance_trends_anomaly").on(table.isAnomaly),
  ],
);

// Alert and notification system
export const automationAlerts = pgTable(
  "automation_alerts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    alertType: varchar("alert_type", { length: 50 }).notNull(), // performance, cost, error, anomaly
    severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high, critical
    status: varchar("status", { length: 20 }).default("active"), // active, acknowledged, resolved, ignored

    // Alert details
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    metric: varchar("metric", { length: 100 }).notNull(),
    currentValue: decimal("current_value", { precision: 10, scale: 4 }).notNull(),
    threshold: decimal("threshold", { precision: 10, scale: 4 }).notNull(),
    deviationPercentage: decimal("deviation_percentage", { precision: 6, scale: 3 }),

    // Context and references
    component: varchar("component", { length: 100 }),
    sessionId: varchar("session_id"),
    testExecutionId: varchar("test_execution_id").references(() => testExecutions.id),
    userId: varchar("user_id"),

    // Resolution tracking
    acknowledgedBy: varchar("acknowledged_by"),
    acknowledgedAt: timestamp("acknowledged_at"),
    resolvedBy: varchar("resolved_by"),
    resolvedAt: timestamp("resolved_at"),
    resolution: text("resolution"),

    // Escalation
    escalationLevel: integer("escalation_level").default(0),
    escalatedAt: timestamp("escalated_at"),
    escalatedTo: varchar("escalated_to"),

    // Notification tracking
    notificationsSent: integer("notifications_sent").default(0),
    lastNotificationAt: timestamp("last_notification_at"),
    notificationChannels: varchar("notification_channels").array(),

    // Metadata
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_automation_alerts_type").on(table.alertType),
    index("idx_automation_alerts_severity").on(table.severity),
    index("idx_automation_alerts_status").on(table.status),
    index("idx_automation_alerts_metric").on(table.metric),
    index("idx_automation_alerts_created_at").on(table.createdAt),
    index("idx_automation_alerts_user_id").on(table.userId),
  ],
);

// ROI calculation and business impact tracking
export const roiMetrics = pgTable(
  "roi_metrics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    period: varchar("period", { length: 20 }).notNull(), // daily, weekly, monthly, quarterly
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),

    // Investment costs
    automationInvestment: decimal("automation_investment", { precision: 12, scale: 2 }).default(sql`0`),
    developmentCosts: decimal("development_costs", { precision: 12, scale: 2 }).default(sql`0`),
    maintenanceCosts: decimal("maintenance_costs", { precision: 12, scale: 2 }).default(sql`0`),
    llmCosts: decimal("llm_costs", { precision: 12, scale: 2 }).default(sql`0`),
    infrastructureCosts: decimal("infrastructure_costs", { precision: 12, scale: 2 }).default(sql`0`),
    totalInvestment: decimal("total_investment", { precision: 12, scale: 2 }).default(sql`0`),

    // Return/savings
    manualTestingCostSaved: decimal("manual_testing_cost_saved", { precision: 12, scale: 2 }).default(sql`0`),
    timeSaved: integer("time_saved").default(0), // hours
    defectsPrevented: integer("defects_prevented").default(0),
    defectCostSaved: decimal("defect_cost_saved", { precision: 12, scale: 2 }).default(sql`0`),
    qualityImprovement: decimal("quality_improvement", { precision: 5, scale: 2 }), // percentage
    totalSavings: decimal("total_savings", { precision: 12, scale: 2 }).default(sql`0`),

    // ROI calculations
    roi: decimal("roi", { precision: 6, scale: 3 }), // Return on Investment percentage
    paybackPeriod: integer("payback_period"), // months
    netPresentValue: decimal("net_present_value", { precision: 12, scale: 2 }),
    breakEvenPoint: date("break_even_point"),

    // Business impact metrics
    testCoverageImprovement: decimal("test_coverage_improvement", { precision: 5, scale: 2 }),
    releaseVelocityImprovement: decimal("release_velocity_improvement", { precision: 5, scale: 2 }),
    customerSatisfactionImpact: decimal("customer_satisfaction_impact", { precision: 5, scale: 2 }),
    teamProductivityGain: decimal("team_productivity_gain", { precision: 5, scale: 2 }),

    // Risk reduction
    securityRiskReduction: decimal("security_risk_reduction", { precision: 5, scale: 2 }),
    complianceRiskReduction: decimal("compliance_risk_reduction", { precision: 5, scale: 2 }),
    operationalRiskReduction: decimal("operational_risk_reduction", { precision: 5, scale: 2 }),

    // Metadata
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    calculatedAt: timestamp("calculated_at").defaultNow(),
  },
  (table) => [
    index("idx_roi_metrics_period").on(table.period),
    index("idx_roi_metrics_start_date").on(table.startDate),
    index("idx_roi_metrics_roi").on(table.roi),
    index("idx_roi_metrics_calculated_at").on(table.calculatedAt),
  ],
);

// User behavior and decision analysis
export const userDecisionAnalytics = pgTable(
  "user_decision_analytics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    sessionId: varchar("session_id"),
    
    // Decision context
    decisionType: varchar("decision_type", { length: 50 }).notNull(), // approval, configuration, override
    decisionCategory: varchar("decision_category", { length: 100 }),
    riskLevel: varchar("risk_level", { length: 20 }),
    
    // Decision details
    decision: varchar("decision", { length: 50 }).notNull(), // approve, reject, escalate, delegate
    decisionTime: integer("decision_time").notNull(), // milliseconds from presentation to decision
    confidenceLevel: decimal("confidence_level", { precision: 3, scale: 2 }),
    
    // Context factors
    systemRecommendation: varchar("system_recommendation", { length: 50 }),
    agreedWithSystem: boolean("agreed_with_system"),
    reasoningProvided: boolean("reasoning_provided"),
    
    // Outcome tracking
    outcomeCorrect: boolean("outcome_correct"),
    businessImpact: varchar("business_impact", { length: 50 }), // positive, negative, neutral
    learningPoints: jsonb("learning_points"),
    
    // Performance patterns
    timeOfDay: integer("time_of_day"), // hour 0-23
    dayOfWeek: integer("day_of_week"), // 0-6
    workload: varchar("workload", { length: 20 }), // low, medium, high
    
    // Metadata
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_user_decision_analytics_user_id").on(table.userId),
    index("idx_user_decision_analytics_decision_type").on(table.decisionType),
    index("idx_user_decision_analytics_decision_time").on(table.decisionTime),
    index("idx_user_decision_analytics_agreed_with_system").on(table.agreedWithSystem),
    index("idx_user_decision_analytics_created_at").on(table.createdAt),
  ],
);

// Report generation and export tracking
export const reportGenerations = pgTable(
  "report_generations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    reportType: varchar("report_type", { length: 50 }).notNull(), // automation_summary, cost_analysis, trend_report
    format: varchar("format", { length: 20 }).notNull(), // pdf, excel, json, csv
    status: varchar("status", { length: 20 }).default("generating"), // generating, completed, failed
    
    // Report parameters
    dateRange: jsonb("date_range").notNull(),
    filters: jsonb("filters"),
    includeCharts: boolean("include_charts").default(true),
    includeDetails: boolean("include_details").default(true),
    
    // Generation details
    requestedBy: varchar("requested_by").notNull(),
    generationTime: integer("generation_time"), // milliseconds
    fileSize: integer("file_size"), // bytes
    filePath: varchar("file_path", { length: 500 }),
    downloadCount: integer("download_count").default(0),
    
    // Content summary
    recordCount: integer("record_count"),
    chartCount: integer("chart_count"),
    pageCount: integer("page_count"),
    
    // Error handling
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0),
    
    // Expiration
    expiresAt: timestamp("expires_at"),
    lastAccessedAt: timestamp("last_accessed_at"),
    
    // Metadata
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("idx_report_generations_type").on(table.reportType),
    index("idx_report_generations_status").on(table.status),
    index("idx_report_generations_requested_by").on(table.requestedBy),
    index("idx_report_generations_created_at").on(table.createdAt),
    index("idx_report_generations_expires_at").on(table.expiresAt),
  ],
);

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

export const insertTestExecutionSchema = createInsertSchema(
  testExecutions,
).omit({
  id: true,
  createdAt: true,
});

export const insertApprovalRequestSchema = createInsertSchema(
  approvalRequests,
).omit({
  id: true,
  createdAt: true,
});

export const insertApprovalDecisionSchema = createInsertSchema(
  approvalDecisions,
).omit({
  id: true,
  timestamp: true,
});

export const insertApprovalPreferencesSchema = createInsertSchema(
  approvalPreferences,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApprovalMetricsSchema = createInsertSchema(
  approvalMetrics,
).omit({
  id: true,
  createdAt: true,
});

// Edge case detection insert schemas
export const insertEdgeCaseDetectionSchema = createInsertSchema(
  edgeCaseDetections,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertErrorPatternSchema = createInsertSchema(errorPatterns).omit({
  id: true,
  firstSeen: true,
  lastSeen: true,
  createdAt: true,
  updatedAt: true,
});

export const insertErrorAnalyticsSchema = createInsertSchema(
  errorAnalytics,
).omit({
  id: true,
  timestamp: true,
});

export const insertGeneratedTestCaseSchema = createInsertSchema(
  generatedTestCases,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEdgeCaseTestCaseSchema = createInsertSchema(
  edgeCaseTestCases,
).omit({
  id: true,
  createdAt: true,
});

export const insertMLFeedbackSessionSchema = createInsertSchema(
  mlFeedbackSessions,
).omit({
  id: true,
  createdAt: true,
});

export const insertMLLearningPatternSchema = createInsertSchema(
  mlLearningPatterns,
).omit({
  id: true,
  lastUpdatedAt: true,
  createdAt: true,
});

export const insertUserBehaviorProfileSchema = createInsertSchema(
  userBehaviorProfiles,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAutomationConfidenceSchema = createInsertSchema(
  automationConfidence,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEdgeCaseIntegrationSessionSchema = createInsertSchema(
  edgeCaseIntegrationSessions,
).omit({
  id: true,
  startTime: true,
  createdAt: true,
  updatedAt: true,
});

// Analytics insert schemas
export const insertAutomationMetricsSchema = createInsertSchema(
  automationMetrics,
).omit({
  id: true,
  createdAt: true,
});

export const insertSystemPerformanceMetricsSchema = createInsertSchema(
  systemPerformanceMetrics,
).omit({
  id: true,
  timestamp: true,
});

export const insertTestExecutionAnalyticsSchema = createInsertSchema(
  testExecutionAnalytics,
).omit({
  id: true,
  createdAt: true,
});

export const insertCostOptimizationMetricsSchema = createInsertSchema(
  costOptimizationMetrics,
).omit({
  id: true,
  createdAt: true,
});

export const insertPerformanceTrendsSchema = createInsertSchema(
  performanceTrends,
).omit({
  id: true,
  calculatedAt: true,
});

export const insertAutomationAlertsSchema = createInsertSchema(
  automationAlerts,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoiMetricsSchema = createInsertSchema(
  roiMetrics,
).omit({
  id: true,
  calculatedAt: true,
});

export const insertUserDecisionAnalyticsSchema = createInsertSchema(
  userDecisionAnalytics,
).omit({
  id: true,
  createdAt: true,
});

export const insertReportGenerationsSchema = createInsertSchema(
  reportGenerations,
).omit({
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
export type InsertApprovalDecision = z.infer<
  typeof insertApprovalDecisionSchema
>;
export type ApprovalPreferences = typeof approvalPreferences.$inferSelect;
export type InsertApprovalPreferences = z.infer<
  typeof insertApprovalPreferencesSchema
>;
export type ApprovalMetrics = typeof approvalMetrics.$inferSelect;
export type InsertApprovalMetrics = z.infer<typeof insertApprovalMetricsSchema>;

// Edge case detection types
export type EdgeCaseDetection = typeof edgeCaseDetections.$inferSelect;
export type InsertEdgeCaseDetection = z.infer<
  typeof insertEdgeCaseDetectionSchema
>;
export type ErrorPattern = typeof errorPatterns.$inferSelect;
export type InsertErrorPattern = z.infer<typeof insertErrorPatternSchema>;
export type ErrorAnalytics = typeof errorAnalytics.$inferSelect;
export type InsertErrorAnalytics = z.infer<typeof insertErrorAnalyticsSchema>;
export type GeneratedTestCase = typeof generatedTestCases.$inferSelect;
export type InsertGeneratedTestCase = z.infer<
  typeof insertGeneratedTestCaseSchema
>;
export type EdgeCaseTestCase = typeof edgeCaseTestCases.$inferSelect;
export type InsertEdgeCaseTestCase = z.infer<
  typeof insertEdgeCaseTestCaseSchema
>;
export type MLFeedbackSession = typeof mlFeedbackSessions.$inferSelect;
export type InsertMLFeedbackSession = z.infer<
  typeof insertMLFeedbackSessionSchema
>;
export type MLLearningPattern = typeof mlLearningPatterns.$inferSelect;
export type InsertMLLearningPattern = z.infer<
  typeof insertMLLearningPatternSchema
>;
export type UserBehaviorProfile = typeof userBehaviorProfiles.$inferSelect;
export type InsertUserBehaviorProfile = z.infer<
  typeof insertUserBehaviorProfileSchema
>;
export type AutomationConfidence = typeof automationConfidence.$inferSelect;
export type InsertAutomationConfidence = z.infer<
  typeof insertAutomationConfidenceSchema
>;
export type EdgeCaseIntegrationSession =
  typeof edgeCaseIntegrationSessions.$inferSelect;
export type InsertEdgeCaseIntegrationSession = z.infer<
  typeof insertEdgeCaseIntegrationSessionSchema
>;

// Analytics types
export type AutomationMetrics = typeof automationMetrics.$inferSelect;
export type InsertAutomationMetrics = z.infer<typeof insertAutomationMetricsSchema>;
export type SystemPerformanceMetrics = typeof systemPerformanceMetrics.$inferSelect;
export type InsertSystemPerformanceMetrics = z.infer<typeof insertSystemPerformanceMetricsSchema>;
export type TestExecutionAnalytics = typeof testExecutionAnalytics.$inferSelect;
export type InsertTestExecutionAnalytics = z.infer<typeof insertTestExecutionAnalyticsSchema>;
export type CostOptimizationMetrics = typeof costOptimizationMetrics.$inferSelect;
export type InsertCostOptimizationMetrics = z.infer<typeof insertCostOptimizationMetricsSchema>;
export type PerformanceTrends = typeof performanceTrends.$inferSelect;
export type InsertPerformanceTrends = z.infer<typeof insertPerformanceTrendsSchema>;
export type AutomationAlerts = typeof automationAlerts.$inferSelect;
export type InsertAutomationAlerts = z.infer<typeof insertAutomationAlertsSchema>;
export type RoiMetrics = typeof roiMetrics.$inferSelect;
export type InsertRoiMetrics = z.infer<typeof insertRoiMetricsSchema>;
export type UserDecisionAnalytics = typeof userDecisionAnalytics.$inferSelect;
export type InsertUserDecisionAnalytics = z.infer<typeof insertUserDecisionAnalyticsSchema>;
export type ReportGenerations = typeof reportGenerations.$inferSelect;
export type InsertReportGenerations = z.infer<typeof insertReportGenerationsSchema>;

// Additional types for LLM edge case detection
export type TestStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";
export type TestType =
  | "unit"
  | "integration"
  | "e2e"
  | "performance"
  | "stress"
  | "edge_case";

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
export type ApprovalType =
  | "data_integrity"
  | "performance_impact"
  | "security_risk"
  | "business_logic"
  | "large_dataset";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "escalated"
  | "timeout";
export type DecisionType = "approve" | "reject" | "escalate" | "delegate";

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
  timeoutBehavior: "escalate" | "auto_approve" | "auto_reject" | "hold";
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
  route: "automated" | "approval_required" | "escalation";
  priority: "low" | "medium" | "high" | "critical";
  assignedApprovers: string[];
  timeoutDuration: number; // minutes
  escalationPath: string[];
  reasoning: string;
  confidence: number;
}
