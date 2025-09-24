module.exports = {
  // Test environment
  testEnvironment: "node",

  // Display name for the test suite
  displayName: "Error Recovery Test Suite",

  // Test patterns - specifically target error recovery tests
  testMatch: [
    "<rootDir>/tests/integration/error-recovery-*.test.js",
    "<rootDir>/tests/performance/error-recovery-*.test.js",
    "<rootDir>/tests/unit/error-recovery-*.test.js",
  ],

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/tests/setup/global-setup.js"],

  // Coverage configuration for error recovery
  collectCoverage: true,
  coverageDirectory: "<rootDir>/coverage/error-recovery",
  coverageReporters: ["text", "lcov", "html", "json"],

  // Coverage paths - focus on error recovery modules
  collectCoverageFrom: [
    "server/services/error-recovery-service.ts",
    "server/enhanced-import-service.ts",
    "server/import-service.ts",
    "server/file-processor.ts",
    "client/src/components/bulk-upload/**/*.{js,ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/coverage/**",
    "!**/dist/**",
    "!**/build/**",
  ],

  // Coverage thresholds for error recovery components
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // Critical error recovery modules need highest coverage
    "server/services/error-recovery-service.ts": {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    "server/enhanced-import-service.ts": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },

  // Test timeout configuration by test type
  testTimeout: 45000, // 45 seconds for comprehensive error recovery tests

  // Module name mapping
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/client/src/$1",
    "^@shared/(.*)$": "<rootDir>/shared/$1",
  },

  // Transform configuration
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },

  // Module file extensions
  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json"],

  // Project-based configuration for different error recovery test types
  projects: [
    {
      displayName: "Error Recovery - Unit Tests",
      testMatch: ["<rootDir>/tests/unit/error-recovery-*.test.js"],
      testTimeout: 10000,
      coverageThreshold: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
    {
      displayName: "Error Recovery - Integration Tests",
      testMatch: ["<rootDir>/tests/integration/error-recovery-*.test.js"],
      testTimeout: 30000,
      maxWorkers: 2, // Allow some parallelism for integration tests
      coverageThreshold: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
    {
      displayName: "Error Recovery - Performance Tests",
      testMatch: ["<rootDir>/tests/performance/error-recovery-*.test.js"],
      testTimeout: 120000, // 2 minutes for performance tests
      maxWorkers: 1, // Run performance tests sequentially
      coverageThreshold: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
      },
    },
    {
      displayName: "Error Recovery - API Tests",
      testMatch: ["<rootDir>/tests/integration/error-recovery-api*.test.js"],
      testTimeout: 25000,
      setupFilesAfterEnv: [
        "<rootDir>/tests/setup/global-setup.js",
        "<rootDir>/tests/setup/api-setup.js"
      ],
    },
    {
      displayName: "Error Recovery - E2E Tests",
      testMatch: ["<rootDir>/tests/integration/error-recovery-e2e*.test.js"],
      testTimeout: 60000, // 1 minute for E2E tests
      maxWorkers: 1, // E2E tests should run sequentially
    },
    {
      displayName: "Error Recovery - Test Reporter",
      testMatch: ["<rootDir>/tests/integration/error-recovery-test-reporter.test.js"],
      testTimeout: 15000,
    },
  ],

  // Global variables for error recovery tests
  globals: {
    "process.env.NODE_ENV": "test",
    "process.env.DATABASE_URL": "postgresql://postgres:postgres123@localhost:5433/queenone_test",
    "process.env.OPENROUTER_API_KEY": "test-key-fallback",
    "process.env.ERROR_RECOVERY_ENABLED": "true",
    "process.env.TEST_DATA_GENERATOR_ENABLED": "true",
    "process.env.WEBSOCKET_ENABLED": "true",
    "process.env.PERFORMANCE_MONITORING": "true",
  },

  // Verbose output for debugging error recovery
  verbose: true,

  // Detect open handles (important for WebSocket tests)
  detectOpenHandles: true,

  // Force exit after tests (important for cleanup)
  forceExit: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset modules between tests
  resetModules: true,

  // Error on deprecated features
  errorOnDeprecated: true,

  // Test result processor for enhanced reporting
  testResultsProcessor: "<rootDir>/tests/utils/error-recovery-results-processor.cjs",

  // Custom reporters for error recovery testing
  reporters: [
    "default",
    // Additional reporters can be added when packages are installed
  ],

  // Bail configuration - stop on first failure for critical tests
  bail: false, // Continue running all tests to get complete picture

  // Maximum number of concurrent workers
  maxWorkers: "50%", // Use half of available cores

  // Test execution order
  testSequencer: "<rootDir>/tests/utils/error-recovery-test-sequencer.cjs",

  // Cache configuration
  cache: true,
  cacheDirectory: "<rootDir>/node_modules/.cache/jest/error-recovery",
};