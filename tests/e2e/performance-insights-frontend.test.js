/**
 * End-to-End Tests for Performance Insights Frontend Implementation
 * planID: PLAN-20251002-PHASES-5-6-FRONTEND
 * Phase: Testing (E2E Validation)
 * Created: 2025-10-02T18:00:00Z
 * Agent: tester
 */

const { testConfig } = require("../setup/global-setup");

describe("Performance Insights Frontend - End-to-End Tests", () => {
  let authCookie;
  let testProductId;

  beforeAll(async () => {
    // Setup authentication
    const loginResponse = await fetch(`${testConfig.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testConfig.testUser.email,
        password: testConfig.testUser.password,
      }),
    });

    expect(loginResponse.ok).toBe(true);
    const loginData = await loginResponse.json();
    authCookie = loginData.sessionCookie;

    // Create test product for performance insights
    const productResponse = await fetch(`${testConfig.baseUrl}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
      body: JSON.stringify({
        name: "Test Product for Performance Insights",
        sku: "PI-TEST-001",
        description: "Test product for performance insights E2E testing",
        price: 9999, // $99.99 in cents
        category: "Electronics",
        brand: "TestBrand",
      }),
    });

    expect(productResponse.ok).toBe(true);
    const productData = await productResponse.json();
    testProductId = productData.data.id;
  });

  describe("Performance Insights Component Tests", () => {
    test("should load performance insights metrics correctly", async () => {
      const response = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/analytics/enhanced?timeframe=30d`,
        {
          headers: { Cookie: authCookie },
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("contributionMargin");
      expect(data.data).toHaveProperty("returnRate");
      expect(data.data).toHaveProperty("rebuyRate");

      // Validate metric value ranges
      expect(data.data.contributionMargin).toBeGreaterThanOrEqual(0);
      expect(data.data.contributionMargin).toBeLessThanOrEqual(100);
      expect(data.data.returnRate).toBeGreaterThanOrEqual(0);
      expect(data.data.rebuyRate).toBeGreaterThanOrEqual(0);
      expect(data.data.rebuyRate).toBeLessThanOrEqual(100);
    });

    test("should handle analytics summary endpoint correctly", async () => {
      const response = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/analytics/summary?timeframe=30d`,
        {
          headers: { Cookie: authCookie },
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("avgProcessingTime");
      expect(data.data.avgProcessingTime).toBeGreaterThan(0);
    });

    test("should handle error states gracefully", async () => {
      // Test with invalid product ID
      const response = await fetch(
        `${testConfig.baseUrl}/api/products/999999/analytics/enhanced?timeframe=30d`,
        {
          headers: { Cookie: authCookie },
        },
      );

      expect(response.status).toBe(404);
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
      expect(errorData.message).toContain("Product not found");
    });

    test("should validate timeframe parameter", async () => {
      const response = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/analytics/enhanced?timeframe=invalid`,
        {
          headers: { Cookie: authCookie },
        },
      );

      // Should use default timeframe or reject invalid value
      expect([200, 400]).toContain(response.status);
    });
  });

  describe("SKU Dial System Tests", () => {
    test("should retrieve SKU dial allocation data", async () => {
      const response = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          headers: { Cookie: authCookie },
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      if (data.success) {
        // If SKU dial exists, validate structure
        expect(data.data).toHaveProperty("performancePoints");
        expect(data.data).toHaveProperty("inventoryPoints");
        expect(data.data).toHaveProperty("profitabilityPoints");
        expect(data.data).toHaveProperty("demandPoints");
        expect(data.data).toHaveProperty("competitivePoints");
        expect(data.data).toHaveProperty("trendPoints");
        expect(data.data).toHaveProperty("totalPoints");
        expect(data.data).toHaveProperty("efficiencyRating");
      } else {
        // If no SKU dial exists, should return appropriate message
        expect(data.message).toContain("not found");
      }
    });

    test("should create new SKU dial allocation", async () => {
      // Get CSRF token
      const csrfResponse = await fetch(`${testConfig.baseUrl}/api/csrf-token`, {
        headers: { Cookie: authCookie },
      });
      const csrfData = await csrfResponse.json();

      const skuDialData = {
        performancePoints: 100,
        inventoryPoints: 80,
        profitabilityPoints: 120,
        demandPoints: 90,
        competitivePoints: 60,
        trendPoints: 50,
        productId: testProductId,
      };

      const response = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
            "X-CSRF-Token": csrfData.csrfToken,
          },
          body: JSON.stringify(skuDialData),
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.performancePoints).toBe(100);
      expect(data.data.totalPoints).toBe(500); // Sum of all points
      expect(data.data.totalPoints).toBeLessThanOrEqual(888);
    });

    test("should update existing SKU dial allocation", async () => {
      // Get CSRF token
      const csrfResponse = await fetch(`${testConfig.baseUrl}/api/csrf-token`, {
        headers: { Cookie: authCookie },
      });
      const csrfData = await csrfResponse.json();

      const updateData = {
        performancePoints: 150,
        inventoryPoints: 100,
        profitabilityPoints: 150,
        demandPoints: 120,
        competitivePoints: 80,
        trendPoints: 70,
      };

      const response = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
            "X-CSRF-Token": csrfData.csrfToken,
          },
          body: JSON.stringify(updateData),
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.performancePoints).toBe(150);
      expect(data.data.totalPoints).toBe(670); // Sum of updated points
    });

    test("should enforce 888-point limit constraint", async () => {
      // Get CSRF token
      const csrfResponse = await fetch(`${testConfig.baseUrl}/api/csrf-token`, {
        headers: { Cookie: authCookie },
      });
      const csrfData = await csrfResponse.json();

      const overLimitData = {
        performancePoints: 200,
        inventoryPoints: 150,
        profitabilityPoints: 200,
        demandPoints: 138,
        competitivePoints: 100,
        trendPoints: 100,
        // Total: 888 points - at limit
      };

      const response = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
            "X-CSRF-Token": csrfData.csrfToken,
          },
          body: JSON.stringify(overLimitData),
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.data.totalPoints).toBe(888);

      // Test over limit scenario
      const overLimitData2 = {
        performancePoints: 200,
        inventoryPoints: 150,
        profitabilityPoints: 200,
        demandPoints: 138,
        competitivePoints: 100,
        trendPoints: 101, // This would exceed 888
      };

      const overLimitResponse = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
            "X-CSRF-Token": csrfData.csrfToken,
          },
          body: JSON.stringify(overLimitData2),
        },
      );

      expect(overLimitResponse.status).toBe(400);
      const errorData = await overLimitResponse.json();
      expect(errorData.success).toBe(false);
      expect(errorData.message).toContain("888");
    });

    test("should enforce individual category limits", async () => {
      // Get CSRF token
      const csrfResponse = await fetch(`${testConfig.baseUrl}/api/csrf-token`, {
        headers: { Cookie: authCookie },
      });
      const csrfData = await csrfResponse.json();

      // Test performance points over limit (max 200)
      const invalidData = {
        performancePoints: 201,
        inventoryPoints: 50,
        profitabilityPoints: 50,
        demandPoints: 50,
        competitivePoints: 50,
        trendPoints: 50,
      };

      const response = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
            "X-CSRF-Token": csrfData.csrfToken,
          },
          body: JSON.stringify(invalidData),
        },
      );

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
      expect(errorData.message).toContain("200");
    });

    test("should calculate efficiency rating correctly", async () => {
      const response = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          headers: { Cookie: authCookie },
        },
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      if (data.success) {
        expect(data.data.efficiencyRating).toBeGreaterThanOrEqual(0);
        expect(data.data.efficiencyRating).toBeLessThanOrEqual(100);

        // Efficiency should correlate with point utilization
        const utilizationRate = data.data.totalPoints / 888;
        expect(data.data.efficiencyRating).toBeGreaterThanOrEqual(
          utilizationRate * 50,
        );
      }
    });
  });

  describe("Frontend Component Integration Tests", () => {
    test("should handle loading states correctly", async () => {
      // Test that API endpoints respond within reasonable time for loading states
      const startTime = Date.now();

      const analyticsPromise = fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/analytics/enhanced?timeframe=30d`,
        { headers: { Cookie: authCookie } },
      );

      const skuDialPromise = fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        { headers: { Cookie: authCookie } },
      );

      const [analyticsResponse, skuDialResponse] = await Promise.all([
        analyticsPromise,
        skuDialPromise,
      ]);

      const responseTime = Date.now() - startTime;

      expect(analyticsResponse.ok).toBe(true);
      expect(skuDialResponse.ok).toBe(true);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test("should handle concurrent requests correctly", async () => {
      // Test multiple simultaneous requests to ensure no race conditions
      const requests = Array(5)
        .fill()
        .map(() =>
          fetch(
            `${testConfig.baseUrl}/api/products/${testProductId}/analytics/enhanced?timeframe=30d`,
            { headers: { Cookie: authCookie } },
          ),
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.ok).toBe(true);
      });

      // All responses should be consistent
      const responseData = await Promise.all(responses.map((r) => r.json()));

      const firstResponse = responseData[0];
      responseData.forEach((data) => {
        expect(data.data.contributionMargin).toBe(
          firstResponse.data.contributionMargin,
        );
        expect(data.data.returnRate).toBe(firstResponse.data.returnRate);
        expect(data.data.rebuyRate).toBe(firstResponse.data.rebuyRate);
      });
    });

    test("should handle authentication properly", async () => {
      // Test without authentication
      const unauthResponse = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/analytics/enhanced?timeframe=30d`,
      );

      expect(unauthResponse.status).toBe(401);

      // Test with invalid session
      const invalidAuthResponse = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/analytics/enhanced?timeframe=30d`,
        {
          headers: { Cookie: "connect.sid=invalid-session-id" },
        },
      );

      expect(invalidAuthResponse.status).toBe(401);
    });
  });

  describe("Data Validation and Error Handling", () => {
    test("should validate input data types", async () => {
      const csrfResponse = await fetch(`${testConfig.baseUrl}/api/csrf-token`, {
        headers: { Cookie: authCookie },
      });
      const csrfData = await csrfResponse.json();

      // Test with string values instead of numbers
      const invalidTypeData = {
        performancePoints: "invalid",
        inventoryPoints: "100",
        profitabilityPoints: null,
        demandPoints: undefined,
        competitivePoints: [],
        trendPoints: {},
      };

      const response = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
            "X-CSRF-Token": csrfData.csrfToken,
          },
          body: JSON.stringify(invalidTypeData),
        },
      );

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
    });

    test("should handle negative values correctly", async () => {
      const csrfResponse = await fetch(`${testConfig.baseUrl}/api/csrf-token`, {
        headers: { Cookie: authCookie },
      });
      const csrfData = await csrfResponse.json();

      const negativeData = {
        performancePoints: -10,
        inventoryPoints: 50,
        profitabilityPoints: 50,
        demandPoints: 50,
        competitivePoints: 50,
        trendPoints: 50,
      };

      const response = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
            "X-CSRF-Token": csrfData.csrfToken,
          },
          body: JSON.stringify(negativeData),
        },
      );

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
    });

    test("should handle missing CSRF token", async () => {
      const missingCsrfData = {
        performancePoints: 100,
        inventoryPoints: 50,
        profitabilityPoints: 50,
        demandPoints: 50,
        competitivePoints: 50,
        trendPoints: 50,
      };

      const response = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
            // Missing X-CSRF-Token header
          },
          body: JSON.stringify(missingCsrfData),
        },
      );

      expect(response.status).toBe(403);
    });
  });

  describe("Performance and Scalability Tests", () => {
    test("should handle multiple products efficiently", async () => {
      const startTime = Date.now();

      // Create multiple test products
      const productPromises = Array(3)
        .fill()
        .map((_, index) =>
          fetch(`${testConfig.baseUrl}/api/products`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: authCookie,
            },
            body: JSON.stringify({
              name: `Test Product ${index + 1}`,
              sku: `PI-TEST-${index + 1}`,
              description: `Test product ${index + 1} for performance testing`,
              price: 9999,
              category: "Electronics",
              brand: "TestBrand",
            }),
          }),
        );

      const productResponses = await Promise.all(productPromises);
      const products = await Promise.all(productResponses.map((r) => r.json()));

      // Test analytics for all products simultaneously
      const analyticsPromises = products.map((product) =>
        fetch(
          `${testConfig.baseUrl}/api/products/${product.data.id}/analytics/enhanced?timeframe=30d`,
          { headers: { Cookie: authCookie } },
        ),
      );

      const analyticsResponses = await Promise.all(analyticsPromises);
      const totalTime = Date.now() - startTime;

      analyticsResponses.forEach((response) => {
        expect(response.ok).toBe(true);
      });

      // Should complete within reasonable time even with multiple products
      expect(totalTime).toBeLessThan(10000); // 10 seconds max
    });

    test("should handle rapid successive updates", async () => {
      const csrfResponse = await fetch(`${testConfig.baseUrl}/api/csrf-token`, {
        headers: { Cookie: authCookie },
      });
      const csrfData = await csrfResponse.json();

      // Perform rapid successive updates
      const updates = Array(3)
        .fill()
        .map((_, index) => ({
          performancePoints: 100 + index * 10,
          inventoryPoints: 80,
          profitabilityPoints: 120,
          demandPoints: 90,
          competitivePoints: 60,
          trendPoints: 50,
        }));

      const startTime = Date.now();

      for (const updateData of updates) {
        const response = await fetch(
          `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Cookie: authCookie,
              "X-CSRF-Token": csrfData.csrfToken,
            },
            body: JSON.stringify(updateData),
          },
        );

        expect(response.ok).toBe(true);
        await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay between updates
      }

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(5000); // Should handle rapid updates efficiently
    });
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await fetch(`${testConfig.baseUrl}/api/products/${testProductId}`, {
        method: "DELETE",
        headers: { Cookie: authCookie },
      });
    } catch (error) {
      console.warn("Cleanup failed:", error.message);
    }
  });
});
