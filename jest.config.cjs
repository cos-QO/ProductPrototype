module.exports = {
  // Test environment
  testEnvironment: "node",

  // Test patterns
  testMatch: [
    "<rootDir>/tests/**/*.test.js",
    "<rootDir>/tests/**/*.test.ts",
    "<rootDir>/.claude/tests/**/*.test.js",
  ],

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/tests/setup/global-setup.js"],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "lcov", "html", "json"],

  // Coverage paths
  collectCoverageFrom: [
    "server/**/*.{js,ts}",
    "client/src/**/*.{js,ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/coverage/**",
    "!**/dist/**",
    "!**/build/**",
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Critical modules need higher coverage
    "server/import-service.ts": {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "server/enhanced-import-service.ts": {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Test timeout (important for performance tests)
  testTimeout: 30000, // 30 seconds

  // Module name mapping
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/client/src/$1",
    "^@shared/(.*)$": "<rootDir>/shared/$1",
  },

  // Transform configuration
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },

  // Module file extensions
  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json"],

  // Test suites configuration
  projects: [
    {
      displayName: "Security Tests",
      testMatch: ["<rootDir>/tests/security/**/*.test.js"],
      testTimeout: 10000,
    },
    {
      displayName: "Integration Tests",
      testMatch: ["<rootDir>/tests/integration/**/*.test.js"],
      testTimeout: 15000,
    },
    {
      displayName: "Performance Tests",
      testMatch: ["<rootDir>/tests/performance/**/*.test.js"],
      testTimeout: 60000, // Performance tests need more time
      maxWorkers: 1, // Run performance tests sequentially
    },
    {
      displayName: "Unit Tests",
      testMatch: ["<rootDir>/tests/unit/**/*.test.js"],
      testTimeout: 5000,
    },
    {
      displayName: "E2E Tests",
      testMatch: ["<rootDir>/tests/e2e/**/*.test.js"],
      testTimeout: 30000,
    },
    {
      displayName: "Existing Tests",
      testMatch: ["<rootDir>/.claude/tests/**/*.test.js"],
      testTimeout: 30000,
    },
  ],

  // Global variables for tests
  globals: {
    "process.env.NODE_ENV": "test",
    "process.env.DATABASE_URL":
      "postgresql://postgres:postgres123@localhost:5432/queenone_test",
  },

  // Verbose output for debugging
  verbose: true,

  // Detect open handles
  detectOpenHandles: true,

  // Force exit after tests
  forceExit: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset modules between tests
  resetModules: true,

  // Error on deprecated features
  errorOnDeprecated: true,
};
