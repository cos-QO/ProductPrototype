/**
 * API Setup for Error Recovery Tests
 * Specialized setup for API integration testing
 */

const axios = require("axios");

// Global API test configuration
global.API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
global.API_TIMEOUT = 10000;

// Configure axios defaults for testing
axios.defaults.baseURL = global.API_BASE_URL;
axios.defaults.timeout = global.API_TIMEOUT;
axios.defaults.headers.common["Content-Type"] = "application/json";

// API test utilities
global.apiHelpers = {
  /**
   * Create authenticated request headers
   * @param {string} token - Auth token
   * @returns {Object} Headers object
   */
  createAuthHeaders: (token) => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }),

  /**
   * Wait for API to be ready
   * @param {number} maxAttempts - Maximum retry attempts
   * @param {number} delay - Delay between attempts in ms
   * @returns {Promise<boolean>} True if API is ready
   */
  waitForAPI: async (maxAttempts = 30, delay = 1000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await axios.get("/api/health");
        console.log(`✅ API ready after ${attempt} attempts`);
        return true;
      } catch (error) {
        if (attempt === maxAttempts) {
          console.error(`❌ API not ready after ${maxAttempts} attempts`);
          return false;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return false;
  },

  /**
   * Create test authentication token
   * @returns {Promise<string>} Auth token
   */
  createTestAuth: async () => {
    try {
      const response = await axios.post("/api/auth/login", {
        username: "test-user",
        password: "test-password",
      });
      return response.data.token;
    } catch (error) {
      // Fallback to dev mode token
      return "test-token-dev-mode";
    }
  },

  /**
   * Clean up test data
   * @param {string} token - Auth token
   */
  cleanupTestData: async (token) => {
    try {
      await axios.delete("/api/test/cleanup", {
        headers: apiHelpers.createAuthHeaders(token),
      });
    } catch (error) {
      console.warn("⚠️ Test cleanup failed:", error.message);
    }
  },
};

// Setup before all API tests
beforeAll(async () => {
  console.log("🔧 Setting up API test environment...");

  // Wait for API to be ready
  const isReady = await global.apiHelpers.waitForAPI();
  if (!isReady) {
    throw new Error("API is not ready for testing");
  }

  console.log("✅ API test environment ready");
});

// Cleanup after all API tests
afterAll(async () => {
  console.log("🧹 Cleaning up API test environment...");

  try {
    const token = await global.apiHelpers.createTestAuth();
    await global.apiHelpers.cleanupTestData(token);
  } catch (error) {
    console.warn("⚠️ API cleanup failed:", error.message);
  }

  console.log("✅ API test environment cleaned up");
});
