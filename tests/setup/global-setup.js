#!/usr/bin/env node

/**
 * Global Test Setup
 *
 * Configures the testing environment for all test suites.
 * Handles database setup, authentication, and environment configuration.
 */

const fetch = require("node-fetch");

// Global test configuration
global.testConfig = {
  baseUrl: "http://localhost:5000",
  testUser: {
    email: "test-user@example.com",
    password: "test123",
    firstName: "Test",
    lastName: "User",
  },
  performance: {
    targets: {
      processingSpeed: 10, // ms per record
      memoryLimit: 500 * 1024 * 1024, // 500MB
      apiResponseTime: 2000, // 2 seconds
      concurrentUsers: 50,
    },
  },
  openRouter: {
    apiKey:
      "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",
  },
};

// Set environment variables for testing
process.env.NODE_ENV = "test";
process.env.OPENROUTER_API_KEY = global.testConfig.openRouter.apiKey;

// Extend Jest timeout for performance tests
jest.setTimeout(60000);

// Global setup function
beforeAll(async () => {
  console.log("🧪 Setting up global test environment...");

  // Wait for server to be ready
  await waitForServer();

  // Setup test user if needed
  await setupTestUser();

  console.log("✅ Global test setup complete");
});

// Global cleanup function
afterAll(async () => {
  console.log("🧹 Cleaning up global test environment...");

  // Clean up any global resources
  await cleanupGlobalResources();

  console.log("✅ Global test cleanup complete");
});

// Utility functions
async function waitForServer(maxRetries = 30, retryInterval = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${global.testConfig.baseUrl}/api/health`);
      if (response.ok) {
        console.log("✅ Server is ready");
        return;
      }
    } catch (error) {
      console.log(`⏳ Waiting for server... (${i + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }
  }
  throw new Error("Server failed to start within timeout period");
}

async function setupTestUser() {
  try {
    // Try to register test user (may fail if already exists)
    await fetch(`${global.testConfig.baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(global.testConfig.testUser),
    });
  } catch (error) {
    // Ignore registration errors - user might already exist
  }

  try {
    // Verify test user can login
    const loginResponse = await fetch(
      `${global.testConfig.baseUrl}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: global.testConfig.testUser.email,
          password: global.testConfig.testUser.password,
        }),
      },
    );

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      global.testConfig.authToken = loginData.token;
      console.log("✅ Test user authentication verified");
    }
  } catch (error) {
    console.warn("⚠️ Test user setup failed:", error.message);
  }
}

async function cleanupGlobalResources() {
  // Clean up any persistent test data
  // This might include clearing test files, database cleanup, etc.

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
}

// Export configuration for use in tests
module.exports = {
  testConfig: global.testConfig,
  waitForServer,
  setupTestUser,
  cleanupGlobalResources,
};
