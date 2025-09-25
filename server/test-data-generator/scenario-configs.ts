/**
 * Test Scenario Configuration
 * Predefined configurations for different test scenarios and error patterns
 */

import { 
  TestScenario, 
  ErrorPattern, 
  ErrorPatternType, 
  EdgeCaseType, 
  BusinessContext,
  BUSINESS_CONTEXTS 
} from "./types";

export interface ScenarioConfig {
  name: string;
  description: string;
  edgeCaseType: EdgeCaseType;
  complexity: 'low' | 'medium' | 'high';
  recordCounts: number[];
  errorPatterns: ErrorPattern[];
  businessContexts: BusinessContext[];
  tags: string[];
  estimatedDuration: number; // minutes
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Predefined scenario configurations for common edge cases
 */
export const SCENARIO_CONFIGS: Record<string, ScenarioConfig> = {
  // Validation Error Scenarios
  MISSING_REQUIRED_FIELDS: {
    name: "Missing Required Fields",
    description: "Test handling of missing required fields (name, sku)",
    edgeCaseType: EdgeCaseType.VALIDATION_ERRORS,
    complexity: 'medium',
    recordCounts: [100, 500, 1000],
    errorPatterns: [
      {
        type: ErrorPatternType.MISSING_REQUIRED_FIELDS,
        severity: 'high',
        affectedFields: ['name', 'sku'],
        injectionRate: 0.15,
        description: 'Remove required fields from random records',
        autoFixable: false,
        businessImpact: 'high'
      }
    ],
    businessContexts: ['ELECTRONICS', 'FASHION'],
    tags: ['validation', 'required_fields', 'error_recovery'],
    estimatedDuration: 5,
    riskLevel: 'medium'
  },

  INVALID_DATA_TYPES: {
    name: "Invalid Data Types",
    description: "Test handling of wrong data types in numeric/boolean fields",
    edgeCaseType: EdgeCaseType.VALIDATION_ERRORS,
    complexity: 'low',
    recordCounts: [100, 500],
    errorPatterns: [
      {
        type: ErrorPatternType.INVALID_DATA_TYPES,
        severity: 'medium',
        affectedFields: ['price', 'compareAtPrice', 'inventoryQuantity', 'trackInventory'],
        injectionRate: 0.2,
        description: 'Insert text values in numeric/boolean fields',
        autoFixable: true,
        businessImpact: 'medium'
      }
    ],
    businessContexts: ['ELECTRONICS', 'COSMETICS'],
    tags: ['validation', 'data_types', 'auto_fix'],
    estimatedDuration: 3,
    riskLevel: 'low'
  },

  DUPLICATE_SKUS: {
    name: "Duplicate SKUs",
    description: "Test handling of duplicate SKU values across records",
    edgeCaseType: EdgeCaseType.DUPLICATE_DATA,
    complexity: 'high',
    recordCounts: [500, 1000, 2500],
    errorPatterns: [
      {
        type: ErrorPatternType.DUPLICATE_SKUS,
        severity: 'critical',
        affectedFields: ['sku'],
        injectionRate: 0.1,
        description: 'Create duplicate SKU values',
        autoFixable: false,
        businessImpact: 'high'
      }
    ],
    businessContexts: ['ELECTRONICS', 'FASHION', 'HOME_GARDEN'],
    tags: ['duplicates', 'sku', 'database_constraints'],
    estimatedDuration: 8,
    riskLevel: 'high'
  },

  // Special Characters Scenarios
  UNICODE_SPECIAL_CHARS: {
    name: "Unicode and Special Characters",
    description: "Test handling of unicode, emoji, and special characters",
    edgeCaseType: EdgeCaseType.SPECIAL_CHARACTERS,
    complexity: 'medium',
    recordCounts: [100, 500],
    errorPatterns: [
      {
        type: ErrorPatternType.SPECIAL_CHARACTERS,
        severity: 'low',
        affectedFields: ['name', 'shortDescription', 'longDescription', 'tags'],
        injectionRate: 0.3,
        description: 'Add unicode, emoji, and special characters',
        autoFixable: true,
        businessImpact: 'low'
      }
    ],
    businessContexts: ['FASHION', 'COSMETICS'],
    tags: ['unicode', 'special_characters', 'encoding'],
    estimatedDuration: 4,
    riskLevel: 'low'
  },

  SQL_INJECTION_PATTERNS: {
    name: "SQL Injection Patterns",
    description: "Test security handling of potential SQL injection patterns",
    edgeCaseType: EdgeCaseType.SECURITY_EDGE_CASES,
    complexity: 'high',
    recordCounts: [100],
    errorPatterns: [
      {
        type: ErrorPatternType.SQL_INJECTION_PATTERNS,
        severity: 'critical',
        affectedFields: ['name', 'shortDescription', 'tags'],
        injectionRate: 0.1,
        description: 'Include SQL injection patterns in text fields',
        autoFixable: true,
        businessImpact: 'none'
      }
    ],
    businessContexts: ['ELECTRONICS'],
    tags: ['security', 'sql_injection', 'sanitization'],
    estimatedDuration: 6,
    riskLevel: 'critical'
  },

  // Performance Scenarios
  LARGE_DATASET_1K: {
    name: "Large Dataset (1K Records)",
    description: "Test performance with 1000 record dataset",
    edgeCaseType: EdgeCaseType.LARGE_DATASETS,
    complexity: 'medium',
    recordCounts: [1000],
    errorPatterns: [
      {
        type: ErrorPatternType.MISSING_REQUIRED_FIELDS,
        severity: 'medium',
        affectedFields: ['name'],
        injectionRate: 0.05,
        description: 'Small percentage of validation errors',
        autoFixable: false,
        businessImpact: 'low'
      }
    ],
    businessContexts: ['ELECTRONICS', 'FASHION'],
    tags: ['performance', 'large_dataset', '1k_records'],
    estimatedDuration: 10,
    riskLevel: 'medium'
  },

  LARGE_DATASET_5K: {
    name: "Large Dataset (5K Records)",
    description: "Test performance with 5000 record dataset (stress test)",
    edgeCaseType: EdgeCaseType.LARGE_DATASETS,
    complexity: 'high',
    recordCounts: [5000],
    errorPatterns: [
      {
        type: ErrorPatternType.INVALID_DATA_TYPES,
        severity: 'low',
        affectedFields: ['price'],
        injectionRate: 0.02,
        description: 'Minimal errors for performance focus',
        autoFixable: true,
        businessImpact: 'low'
      }
    ],
    businessContexts: ['ELECTRONICS'],
    tags: ['performance', 'stress_test', '5k_records'],
    estimatedDuration: 25,
    riskLevel: 'high'
  },

  EXTREMELY_LONG_TEXT: {
    name: "Extremely Long Text Fields",
    description: "Test handling of very long text content",
    edgeCaseType: EdgeCaseType.PERFORMANCE_LIMITS,
    complexity: 'medium',
    recordCounts: [100, 500],
    errorPatterns: [
      {
        type: ErrorPatternType.EXTREMELY_LONG_TEXT,
        severity: 'medium',
        affectedFields: ['longDescription', 'story', 'metaDescription'],
        injectionRate: 0.2,
        description: 'Generate extremely long text fields (5000+ characters)',
        autoFixable: true,
        businessImpact: 'low'
      }
    ],
    businessContexts: ['HOME_GARDEN', 'COSMETICS'],
    tags: ['performance', 'long_text', 'memory_usage'],
    estimatedDuration: 7,
    riskLevel: 'medium'
  },

  // Complex Mixed Scenarios
  MIXED_VALIDATION_ERRORS: {
    name: "Mixed Validation Errors",
    description: "Combination of different validation error types",
    edgeCaseType: EdgeCaseType.VALIDATION_ERRORS,
    complexity: 'high',
    recordCounts: [500, 1000],
    errorPatterns: [
      {
        type: ErrorPatternType.MISSING_REQUIRED_FIELDS,
        severity: 'high',
        affectedFields: ['name'],
        injectionRate: 0.1,
        description: 'Missing required fields',
        autoFixable: false,
        businessImpact: 'high'
      },
      {
        type: ErrorPatternType.INVALID_DATA_TYPES,
        severity: 'medium',
        affectedFields: ['price', 'inventoryQuantity'],
        injectionRate: 0.15,
        description: 'Invalid data types',
        autoFixable: true,
        businessImpact: 'medium'
      },
      {
        type: ErrorPatternType.SPECIAL_CHARACTERS,
        severity: 'low',
        affectedFields: ['shortDescription'],
        injectionRate: 0.2,
        description: 'Special characters',
        autoFixable: true,
        businessImpact: 'low'
      }
    ],
    businessContexts: ['ELECTRONICS', 'FASHION', 'COSMETICS'],
    tags: ['validation', 'mixed_errors', 'comprehensive'],
    estimatedDuration: 12,
    riskLevel: 'high'
  },

  FIELD_MAPPING_COMPLEXITY: {
    name: "Complex Field Mapping",
    description: "Test LLM field mapping with unusual column names",
    edgeCaseType: EdgeCaseType.FIELD_MAPPING_COMPLEXITY,
    complexity: 'high',
    recordCounts: [100, 500],
    errorPatterns: [
      {
        type: ErrorPatternType.INVALID_DATA_TYPES,
        severity: 'low',
        affectedFields: ['price'],
        injectionRate: 0.05,
        description: 'Minimal errors to focus on mapping',
        autoFixable: true,
        businessImpact: 'low'
      }
    ],
    businessContexts: ['ELECTRONICS'],
    tags: ['field_mapping', 'llm', 'complex_headers'],
    estimatedDuration: 8,
    riskLevel: 'medium'
  },

  // Edge Case Combinations
  CORRUPTED_FILE_SIMULATION: {
    name: "Corrupted File Simulation",
    description: "Simulate various file corruption scenarios",
    edgeCaseType: EdgeCaseType.CORRUPTED_FILES,
    complexity: 'high',
    recordCounts: [100],
    errorPatterns: [
      {
        type: ErrorPatternType.TRUNCATED_DATA,
        severity: 'critical',
        affectedFields: ['*'],
        injectionRate: 0.1,
        description: 'Simulate truncated/corrupted data',
        autoFixable: false,
        businessImpact: 'high'
      },
      {
        type: ErrorPatternType.ENCODING_ISSUES,
        severity: 'medium',
        affectedFields: ['name', 'description'],
        injectionRate: 0.2,
        description: 'Encoding corruption',
        autoFixable: true,
        businessImpact: 'medium'
      }
    ],
    businessContexts: ['ELECTRONICS'],
    tags: ['corruption', 'file_integrity', 'error_recovery'],
    estimatedDuration: 15,
    riskLevel: 'critical'
  }
};

/**
 * Scenario test suites - collections of related scenarios
 */
export const TEST_SUITES: Record<string, string[]> = {
  BASIC_VALIDATION: [
    'MISSING_REQUIRED_FIELDS',
    'INVALID_DATA_TYPES',
    'UNICODE_SPECIAL_CHARS'
  ],
  
  PERFORMANCE_SUITE: [
    'LARGE_DATASET_1K',
    'LARGE_DATASET_5K',
    'EXTREMELY_LONG_TEXT'
  ],
  
  SECURITY_SUITE: [
    'SQL_INJECTION_PATTERNS',
    'UNICODE_SPECIAL_CHARS'
  ],
  
  COMPREHENSIVE_SUITE: [
    'MISSING_REQUIRED_FIELDS',
    'INVALID_DATA_TYPES',
    'DUPLICATE_SKUS',
    'UNICODE_SPECIAL_CHARS',
    'LARGE_DATASET_1K',
    'MIXED_VALIDATION_ERRORS'
  ],
  
  STRESS_TEST_SUITE: [
    'LARGE_DATASET_5K',
    'EXTREMELY_LONG_TEXT',
    'CORRUPTED_FILE_SIMULATION',
    'MIXED_VALIDATION_ERRORS'
  ],
  
  DAILY_AUTOMATION: [
    'MISSING_REQUIRED_FIELDS',
    'INVALID_DATA_TYPES',
    'DUPLICATE_SKUS',
    'LARGE_DATASET_1K'
  ]
};

/**
 * Configuration for automated test execution schedules
 */
export interface AutomationSchedule {
  name: string;
  suite: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'on_demand';
  time?: string; // HH:mm format
  enabled: boolean;
  maxDuration: number; // minutes
  approvalRequired: boolean;
  notificationChannels: string[];
}

export const AUTOMATION_SCHEDULES: AutomationSchedule[] = [
  {
    name: 'Daily Validation Tests',
    suite: 'DAILY_AUTOMATION',
    frequency: 'daily',
    time: '02:00',
    enabled: true,
    maxDuration: 30,
    approvalRequired: false,
    notificationChannels: ['email', 'slack']
  },
  {
    name: 'Weekly Performance Tests',
    suite: 'PERFORMANCE_SUITE',
    frequency: 'weekly',
    time: '03:00',
    enabled: true,
    maxDuration: 60,
    approvalRequired: true,
    notificationChannels: ['email', 'slack']
  },
  {
    name: 'Monthly Comprehensive Tests',
    suite: 'COMPREHENSIVE_SUITE',
    frequency: 'monthly',
    time: '01:00',
    enabled: true,
    maxDuration: 120,
    approvalRequired: true,
    notificationChannels: ['email', 'slack', 'teams']
  }
];

/**
 * Get scenario configuration by name
 */
export function getScenarioConfig(name: string): ScenarioConfig | null {
  return SCENARIO_CONFIGS[name] || null;
}

/**
 * Get all scenarios in a test suite
 */
export function getTestSuite(suiteName: string): ScenarioConfig[] {
  const scenarioNames = TEST_SUITES[suiteName] || [];
  return scenarioNames
    .map(name => SCENARIO_CONFIGS[name])
    .filter(config => config !== undefined);
}

/**
 * Get scenarios by complexity level
 */
export function getScenariosByComplexity(complexity: 'low' | 'medium' | 'high'): ScenarioConfig[] {
  return Object.values(SCENARIO_CONFIGS)
    .filter(config => config.complexity === complexity);
}

/**
 * Get scenarios by edge case type
 */
export function getScenariosByType(edgeCaseType: EdgeCaseType): ScenarioConfig[] {
  return Object.values(SCENARIO_CONFIGS)
    .filter(config => config.edgeCaseType === edgeCaseType);
}

/**
 * Get scenarios by risk level
 */
export function getScenariosByRisk(riskLevel: 'low' | 'medium' | 'high' | 'critical'): ScenarioConfig[] {
  return Object.values(SCENARIO_CONFIGS)
    .filter(config => config.riskLevel === riskLevel);
}

/**
 * Get estimated duration for a test suite
 */
export function getEstimatedSuiteDuration(suiteName: string): number {
  const scenarios = getTestSuite(suiteName);
  return scenarios.reduce((total, scenario) => total + scenario.estimatedDuration, 0);
}

/**
 * Validate scenario configuration
 */
export function validateScenarioConfig(config: ScenarioConfig): string[] {
  const errors: string[] = [];

  if (!config.name || config.name.trim().length === 0) {
    errors.push('Scenario name is required');
  }

  if (!config.description || config.description.trim().length === 0) {
    errors.push('Scenario description is required');
  }

  if (config.recordCounts.length === 0) {
    errors.push('At least one record count must be specified');
  }

  if (config.recordCounts.some(count => count <= 0 || count > 10000)) {
    errors.push('Record counts must be between 1 and 10,000');
  }

  if (config.errorPatterns.length === 0) {
    errors.push('At least one error pattern must be specified');
  }

  if (config.estimatedDuration <= 0) {
    errors.push('Estimated duration must be positive');
  }

  // Validate error patterns
  config.errorPatterns.forEach((pattern, index) => {
    if (pattern.injectionRate < 0 || pattern.injectionRate > 1) {
      errors.push(`Error pattern ${index}: injection rate must be between 0 and 1`);
    }

    if (pattern.affectedFields.length === 0) {
      errors.push(`Error pattern ${index}: at least one affected field must be specified`);
    }
  });

  return errors;
}

/**
 * Create a custom scenario configuration
 */
export function createCustomScenario(params: {
  name: string;
  description: string;
  edgeCaseType: EdgeCaseType;
  complexity: 'low' | 'medium' | 'high';
  recordCount: number;
  errorPatterns: ErrorPattern[];
  businessContext?: BusinessContext;
  tags?: string[];
}): ScenarioConfig {
  return {
    name: params.name,
    description: params.description,
    edgeCaseType: params.edgeCaseType,
    complexity: params.complexity,
    recordCounts: [params.recordCount],
    errorPatterns: params.errorPatterns,
    businessContexts: params.businessContext ? [params.businessContext] : ['ELECTRONICS'],
    tags: params.tags || [],
    estimatedDuration: Math.max(1, Math.ceil(params.recordCount / 200)), // Rough estimate
    riskLevel: params.errorPatterns.some(p => p.severity === 'critical') ? 'critical' :
              params.errorPatterns.some(p => p.severity === 'high') ? 'high' :
              params.complexity === 'high' ? 'medium' : 'low'
  };
}