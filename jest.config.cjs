// Jest Configuration for Enhanced Upload System Testing (CommonJS)
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.{js,ts}',
    '**/?(*.)+(spec|test).{js,ts}',
    '**/tests/**/*.test.{js,ts}'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/.claude/memory/'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
  
  // Coverage configuration
  collectCoverage: false, // Disable for now to focus on functionality
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'server/**/*.{js,ts}',
    '!server/**/*.test.{js,ts}',
    '!server/**/*.spec.{js,ts}',
    '!server/node_modules/**',
    '!server/dist/**',
    '!server/test-*.js'
  ],
  
  // Performance settings
  maxWorkers: 2,
  testTimeout: 30000,
  
  // Module resolution
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  
  // Environment variables
  setupFiles: ['<rootDir>/test-env-setup.js'],
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // TypeScript configuration
  globals: {
    'ts-jest': {
      tsconfig: {
        module: 'commonjs',
        target: 'es2020',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true
      }
    }
  },
  
  // Verbose output for detailed reporting
  verbose: true,
  
  // Don't fail fast for comprehensive testing
  bail: false,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: false // Disable for now to avoid noise
};