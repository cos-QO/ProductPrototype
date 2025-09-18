/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testMatch: [
    '**/__tests__/**/*.(js|ts)',
    '**/*.(test|spec).(js|ts)'
  ],
  collectCoverageFrom: [
    'server/**/*.(js|ts)',
    'shared/**/*.(js|ts)',
    '!server/test-*.js',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageDirectory: './.claude/testing/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/.claude/testing/setup/jest.setup.js'],
  testTimeout: 30000,
  verbose: true
};