/**
 * Test Data Generator Types
 * Type definitions for automated CSV generation and error scenario testing
 */

export interface TestScenario {
  id: string;
  type: EdgeCaseType;
  complexity: "low" | "medium" | "high";
  description: string;

  // Test data specification
  testData: {
    recordCount: number;
    fileName: string;
    format: "csv" | "json" | "xlsx";
    content: string;
    errorPatterns: ErrorPattern[];
  };

  // Expected outcomes
  expectations: {
    shouldSucceed: boolean;
    expectedErrors: ValidationError[];
    performanceTargets: PerformanceTarget[];
    userInteractionRequired: boolean;
  };

  // Execution configuration
  execution: {
    priority: number;
    timeout: number;
    retryAttempts: number;
    requiresApproval: boolean;
    approvalType?: ApprovalType;
  };

  // Metadata
  metadata: {
    generatedBy: "llm" | "manual";
    confidence: number;
    riskLevel: RiskLevel;
    tags: string[];
    businessContext: string[];
  };
}

export enum EdgeCaseType {
  VALIDATION_ERRORS = "validation_errors",
  LARGE_DATASETS = "large_datasets",
  CORRUPTED_FILES = "corrupted_files",
  SPECIAL_CHARACTERS = "special_characters",
  NETWORK_ISSUES = "network_issues",
  PERFORMANCE_LIMITS = "performance_limits",
  SECURITY_EDGE_CASES = "security_edge_cases",
  FIELD_MAPPING_COMPLEXITY = "field_mapping_complexity",
  DUPLICATE_DATA = "duplicate_data",
  MIXED_FORMATS = "mixed_formats",
}

export interface ErrorPattern {
  type: ErrorPatternType;
  severity: "low" | "medium" | "high" | "critical";
  affectedFields: string[];
  injectionRate: number; // 0.0 to 1.0 (percentage of records affected)
  description: string;
  autoFixable: boolean;
  businessImpact: "none" | "low" | "medium" | "high";
  examples?: any[];
}

export enum ErrorPatternType {
  // Validation errors
  MISSING_REQUIRED_FIELDS = "missing_required_fields",
  INVALID_DATA_TYPES = "invalid_data_types",
  CONSTRAINT_VIOLATIONS = "constraint_violations",
  BUSINESS_RULE_VIOLATIONS = "business_rule_violations",

  // Format errors
  ENCODING_ISSUES = "encoding_issues",
  MALFORMED_CSV = "malformed_csv",
  TRUNCATED_DATA = "truncated_data",
  MIXED_LINE_ENDINGS = "mixed_line_endings",

  // Content errors
  SPECIAL_CHARACTERS = "special_characters",
  SQL_INJECTION_PATTERNS = "sql_injection_patterns",
  XSS_PATTERNS = "xss_patterns",
  UNICODE_EDGE_CASES = "unicode_edge_cases",

  // Business logic errors
  DUPLICATE_SKUS = "duplicate_skus",
  INVALID_PRICING = "invalid_pricing",
  INCONSISTENT_INVENTORY = "inconsistent_inventory",
  INVALID_RELATIONSHIPS = "invalid_relationships",

  // Performance patterns
  EXTREMELY_LONG_TEXT = "extremely_long_text",
  HIGH_CARDINALITY_DATA = "high_cardinality_data",
  DEEPLY_NESTED_JSON = "deeply_nested_json",
}

export interface ValidationError {
  recordIndex: number;
  field: string;
  value: any;
  rule: string;
  severity: "error" | "warning";
  message: string;
  suggestion?: string;
  autoFix?: {
    action: string;
    newValue: any;
    confidence: number;
  };
}

export interface PerformanceTarget {
  metric: "execution_time" | "memory_usage" | "cpu_usage" | "response_time";
  target: number;
  unit: string;
  tolerance: number; // percentage
}

export type ApprovalType =
  | "data_integrity_risk"
  | "performance_degradation"
  | "security_concerns"
  | "field_mapping_complexity"
  | "business_rule_exception";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface TestDataGenerationRequest {
  scenario: Partial<TestScenario>;
  dataParams: {
    recordCount: number;
    errorPatterns: ErrorPattern[];
    includeValidData: boolean;
    targetFields: string[];
    businessContext?: string;
  };
  outputFormat: "csv" | "json" | "xlsx";
  options?: {
    includeHeaders: boolean;
    encoding: string;
    delimiter?: string;
    quoteChar?: string;
    escapeChar?: string;
  };
}

export interface GeneratedTestData {
  success: boolean;
  data: {
    content: string;
    fileName: string;
    recordCount: number;
    validRecords: number;
    invalidRecords: number;
    errorCount: number;
  };
  errors: ValidationError[];
  metadata: {
    generationTime: number;
    llmTokensUsed: number;
    llmCost: number;
    errorPatterns: ErrorPattern[];
    fieldMapping: Array<{
      field: string;
      dataType: string;
      errorRate: number;
    }>;
  };
  scenario: TestScenario;
}

export interface TestExecution {
  id: string;
  scenarioId: string;
  status: "pending" | "running" | "completed" | "failed" | "aborted";
  startTime: Date;
  endTime?: Date;
  progress: number; // 0-100
  currentStep: string;
  results?: TestExecutionResult;
  error?: string;
}

export interface TestExecutionResult {
  success: boolean;
  importResult: {
    totalRecords: number;
    successfulRecords: number;
    failedRecords: number;
    processingTime: number;
  };
  validationResult: {
    errors: ValidationError[];
    warnings: ValidationError[];
    autoFixedErrors: number;
  };
  performanceMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    responseTime: number;
    webSocketLatency?: number;
  };
  errorRecoveryTest?: {
    recoveryRate: number;
    userInteractionsRequired: number;
    autoFixSuccessRate: number;
  };
}

export interface TestSession {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "failed" | "aborted";
  config: TestSessionConfig;
  executions: TestExecution[];
  createdAt: Date;
  completedAt?: Date;
  createdBy: string;
}

export interface TestSessionConfig {
  scenarios: TestScenario[];
  executionOrder: "sequential" | "parallel" | "priority";
  maxConcurrentTests: number;
  abortOnFirstFailure: boolean;
  approvalRequired: boolean;
  notifications: {
    onCompletion: boolean;
    onFailure: boolean;
    onApprovalRequired: boolean;
  };
  cleanup: {
    removeTestFiles: boolean;
    preserveResults: boolean;
    maxResultAge: number; // days
  };
}

// Product schema fields for field mapping and data generation
export const PRODUCT_SCHEMA_FIELDS = [
  "name",
  "slug",
  "sku",
  "gtin",
  "shortDescription",
  "longDescription",
  "story",
  "price",
  "compareAtPrice",
  "inventoryQuantity",
  "trackInventory",
  "isActive",
  "tags",
  "metaTitle",
  "metaDescription",
  "weight",
  "weightUnit",
  "hsCode",
  "countryOfOrigin",
  "material",
  "color",
  "size",
  "gender",
  "ageGroup",
  "season",
  "brand",
  "vendor",
  "productType",
  "collection",
] as const;

export type ProductSchemaField = (typeof PRODUCT_SCHEMA_FIELDS)[number];

// Common business contexts for realistic data generation
export const BUSINESS_CONTEXTS = {
  ELECTRONICS: {
    categories: ["smartphones", "laptops", "tablets", "accessories"],
    brands: ["TechFlow", "InnovateX", "DigitalPro"],
    priceRanges: [
      [99, 299],
      [300, 799],
      [800, 1999],
      [2000, 4999],
    ],
    commonAttributes: [
      "warranty",
      "connectivity",
      "battery_life",
      "screen_size",
    ],
  },
  FASHION: {
    categories: ["clothing", "shoes", "accessories", "jewelry"],
    brands: ["StyleCo", "FashionFirst", "TrendSetters"],
    priceRanges: [
      [29, 99],
      [100, 299],
      [300, 799],
      [800, 1999],
    ],
    commonAttributes: ["size", "color", "material", "care_instructions"],
  },
  HOME_GARDEN: {
    categories: ["furniture", "decor", "kitchen", "outdoor"],
    brands: ["HomeStyle", "GardenPro", "ComfortLiving"],
    priceRanges: [
      [19, 99],
      [100, 499],
      [500, 1499],
      [1500, 4999],
    ],
    commonAttributes: [
      "dimensions",
      "material",
      "assembly_required",
      "room_type",
    ],
  },
  COSMETICS: {
    categories: ["skincare", "makeup", "haircare", "fragrance"],
    brands: ["Aurora Cosmetics", "BeautyEssentials", "GlowUp"],
    priceRanges: [
      [9, 49],
      [50, 149],
      [150, 399],
      [400, 999],
    ],
    commonAttributes: [
      "skin_type",
      "ingredients",
      "application_method",
      "size",
    ],
  },
} as const;

export type BusinessContext = keyof typeof BUSINESS_CONTEXTS;
