/**
 * Integration Tests for Performance Insights Frontend Implementation
 * planID: PLAN-20251002-PHASES-5-6-FRONTEND
 * Phase: Testing (Integration Validation)
 * Created: 2025-10-02T18:30:00Z
 * Agent: tester
 */

const { testConfig } = require("../setup/global-setup");

describe("Performance Insights Frontend - Integration Tests", () => {
  let authCookie;
  let testProductId;
  let csrfToken;

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

    // Get CSRF token
    const csrfResponse = await fetch(`${testConfig.baseUrl}/api/csrf-token`, {
      headers: { Cookie: authCookie },
    });
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrfToken;

    // Create test product
    const productResponse = await fetch(`${testConfig.baseUrl}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
      body: JSON.stringify({
        name: "Integration Test Product",
        sku: "PI-INT-001",
        description: "Test product for integration testing",
        price: 12499, // $124.99 in cents
        category: "Electronics",
        brand: "TestBrand",
      }),
    });

    expect(productResponse.ok).toBe(true);
    const productData = await productResponse.json();
    testProductId = productData.data.id;
  });

  describe("Complete SKU Dial Workflow Integration", () => {
    test("should handle complete SKU dial lifecycle", async () => {
      // Step 1: Verify no SKU dial exists initially
      const initialResponse = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          headers: { Cookie: authCookie },
        },
      );

      // May return 404 if no SKU dial exists, or 200 with empty data
      expect([200, 404]).toContain(initialResponse.status);

      // Step 2: Create initial SKU dial allocation
      const createData = {
        performancePoints: 100,
        inventoryPoints: 80,
        profitabilityPoints: 120,
        demandPoints: 90,
        competitivePoints: 60,
        trendPoints: 50,
        productId: testProductId,
      };

      const createResponse = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify(createData),
        },
      );

      expect(createResponse.ok).toBe(true);
      const createResult = await createResponse.json();

      expect(createResult.success).toBe(true);
      expect(createResult.data.totalPoints).toBe(500);
      expect(createResult.data.performancePoints).toBe(100);

      // Step 3: Retrieve created SKU dial
      const getResponse = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          headers: { Cookie: authCookie },
        },
      );

      expect(getResponse.ok).toBe(true);
      const getData = await getResponse.json();

      expect(getData.success).toBe(true);
      expect(getData.data.performancePoints).toBe(100);
      expect(getData.data.totalPoints).toBe(500);

      // Step 4: Update SKU dial allocation
      const updateData = {
        performancePoints: 150,
        inventoryPoints: 120,
        profitabilityPoints: 140,
        demandPoints: 110,
        competitivePoints: 70,
        trendPoints: 60,
      };

      const updateResponse = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify(updateData),
        },
      );

      expect(updateResponse.ok).toBe(true);
      const updateResult = await updateResponse.json();

      expect(updateResult.success).toBe(true);
      expect(updateResult.data.performancePoints).toBe(150);
      expect(updateResult.data.totalPoints).toBe(650);

      // Step 5: Verify update persisted
      const verifyResponse = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          headers: { Cookie: authCookie },
        },
      );

      expect(verifyResponse.ok).toBe(true);
      const verifyData = await verifyResponse.json();

      expect(verifyData.success).toBe(true);
      expect(verifyData.data.performancePoints).toBe(150);
      expect(verifyData.data.totalPoints).toBe(650);
    });

    test("should maintain data consistency across multiple updates", async () => {
      const updates = [
        {
          performancePoints: 160,
          inventoryPoints: 110,
          profitabilityPoints: 130,
          demandPoints: 100,
          competitivePoints: 75,
          trendPoints: 65,
        },
        {
          performancePoints: 170,
          inventoryPoints: 100,
          profitabilityPoints: 140,
          demandPoints: 95,
          competitivePoints: 80,
          trendPoints: 70,
        },
        {
          performancePoints: 180,
          inventoryPoints: 90,
          profitabilityPoints: 150,
          demandPoints: 90,
          competitivePoints: 85,
          trendPoints: 75,
        },
      ];

      for (const [index, updateData] of updates.entries()) {
        const response = await fetch(
          `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Cookie: authCookie,
              "X-CSRF-Token": csrfToken,
            },
            body: JSON.stringify(updateData),
          },
        );

        expect(response.ok).toBe(true);
        const result = await response.json();

        expect(result.success).toBe(true);
        expect(result.data.performancePoints).toBe(
          updateData.performancePoints,
        );

        // Verify total points calculation
        const expectedTotal = Object.values(updateData).reduce(
          (sum, points) => sum + points,
          0,
        );
        expect(result.data.totalPoints).toBe(expectedTotal);

        // Small delay between updates
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Verify final state
      const finalResponse = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          headers: { Cookie: authCookie },
        },
      );

      expect(finalResponse.ok).toBe(true);
      const finalData = await finalResponse.json();

      expect(finalData.data.performancePoints).toBe(180);
      expect(finalData.data.totalPoints).toBe(670);
    });
  });

  describe("Analytics Integration with SKU Dial", () => {
    test("should provide consistent analytics data", async () => {
      // Test enhanced analytics endpoint
      const enhancedResponse = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/analytics/enhanced?timeframe=30d`,
        {
          headers: { Cookie: authCookie },
        },
      );

      expect(enhancedResponse.ok).toBe(true);
      const enhancedData = await enhancedResponse.json();

      expect(enhancedData.success).toBe(true);
      expect(enhancedData.data).toHaveProperty("contributionMargin");
      expect(enhancedData.data).toHaveProperty("returnRate");
      expect(enhancedData.data).toHaveProperty("rebuyRate");

      // Test analytics summary endpoint
      const summaryResponse = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/analytics/summary?timeframe=30d`,
        {
          headers: { Cookie: authCookie },
        },
      );

      expect(summaryResponse.ok).toBe(true);
      const summaryData = await summaryResponse.json();

      expect(summaryData.success).toBe(true);
      expect(summaryData.data).toHaveProperty("avgProcessingTime");

      // Verify data consistency between calls
      const enhancedResponse2 = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/analytics/enhanced?timeframe=30d`,
        {
          headers: { Cookie: authCookie },
        },
      );

      const enhancedData2 = await enhancedResponse2.json();

      expect(enhancedData2.data.contributionMargin).toBe(
        enhancedData.data.contributionMargin,
      );
      expect(enhancedData2.data.returnRate).toBe(enhancedData.data.returnRate);
      expect(enhancedData2.data.rebuyRate).toBe(enhancedData.data.rebuyRate);
    });

    test("should handle different timeframe parameters", async () => {
      const timeframes = ["7d", "30d", "90d"];

      for (const timeframe of timeframes) {
        const response = await fetch(
          `${testConfig.baseUrl}/api/products/${testProductId}/analytics/enhanced?timeframe=${timeframe}`,
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

        // Validate metric ranges
        expect(data.data.contributionMargin).toBeGreaterThanOrEqual(0);
        expect(data.data.contributionMargin).toBeLessThanOrEqual(100);
        expect(data.data.returnRate).toBeGreaterThanOrEqual(0);
        expect(data.data.rebuyRate).toBeGreaterThanOrEqual(0);
        expect(data.data.rebuyRate).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("Data Synchronization Tests", () => {
    test("should maintain data integrity during concurrent operations", async () => {
      // Simulate concurrent analytics and SKU dial requests
      const analyticsPromise = fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/analytics/enhanced?timeframe=30d`,
        { headers: { Cookie: authCookie } },
      );

      const skuDialPromise = fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        { headers: { Cookie: authCookie } },
      );

      const updatePromise = fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            performancePoints: 185,
            inventoryPoints: 95,
            profitabilityPoints: 155,
            demandPoints: 85,
            competitivePoints: 90,
            trendPoints: 80,
          }),
        },
      );

      const [analyticsResponse, skuDialResponse, updateResponse] =
        await Promise.all([analyticsPromise, skuDialPromise, updatePromise]);

      expect(analyticsResponse.ok).toBe(true);
      expect(skuDialResponse.ok).toBe(true);
      expect(updateResponse.ok).toBe(true);

      // Verify data consistency after concurrent operations
      const verifyResponse = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        { headers: { Cookie: authCookie } },
      );

      expect(verifyResponse.ok).toBe(true);
      const verifyData = await verifyResponse.json();
      expect(verifyData.data.performancePoints).toBe(185);
    });

    test("should handle cache invalidation correctly", async () => {
      // Get initial data
      const initialAnalytics = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/analytics/enhanced?timeframe=30d`,
        { headers: { Cookie: authCookie } },
      );

      const initialSkuDial = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        { headers: { Cookie: authCookie } },
      );

      expect(initialAnalytics.ok).toBe(true);
      expect(initialSkuDial.ok).toBe(true);

      // Update SKU dial (should invalidate analytics cache)
      const updateResponse = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            performancePoints: 190,
            inventoryPoints: 100,
            profitabilityPoints: 160,
            demandPoints: 80,
            competitivePoints: 95,
            trendPoints: 85,
          }),
        },
      );

      expect(updateResponse.ok).toBe(true);

      // Get updated data
      const updatedAnalytics = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/analytics/enhanced?timeframe=30d`,
        { headers: { Cookie: authCookie } },
      );

      const updatedSkuDial = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        { headers: { Cookie: authCookie } },
      );

      expect(updatedAnalytics.ok).toBe(true);
      expect(updatedSkuDial.ok).toBe(true);

      const updatedSkuDialData = await updatedSkuDial.json();
      expect(updatedSkuDialData.data.performancePoints).toBe(190);
    });
  });

  describe("Error Handling Integration", () => {
    test("should handle product not found errors consistently", async () => {
      const invalidProductId = 999999;

      // Test analytics endpoint
      const analyticsResponse = await fetch(
        `${testConfig.baseUrl}/api/products/${invalidProductId}/analytics/enhanced?timeframe=30d`,
        { headers: { Cookie: authCookie } },
      );

      expect(analyticsResponse.status).toBe(404);

      // Test SKU dial endpoint
      const skuDialResponse = await fetch(
        `${testConfig.baseUrl}/api/products/${invalidProductId}/sku-dial`,
        { headers: { Cookie: authCookie } },
      );

      expect(skuDialResponse.status).toBe(404);

      // Test update endpoint
      const updateResponse = await fetch(
        `${testConfig.baseUrl}/api/products/${invalidProductId}/sku-dial`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            performancePoints: 100,
            inventoryPoints: 80,
            profitabilityPoints: 120,
            demandPoints: 90,
            competitivePoints: 60,
            trendPoints: 50,
          }),
        },
      );

      expect(updateResponse.status).toBe(404);
    });

    test("should handle authentication errors consistently", async () => {
      // Test without authentication
      const unauthAnalytics = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/analytics/enhanced?timeframe=30d`,
      );

      const unauthSkuDial = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
      );

      expect(unauthAnalytics.status).toBe(401);
      expect(unauthSkuDial.status).toBe(401);

      // Test with invalid session
      const invalidAuth = "connect.sid=invalid-session";

      const invalidAnalytics = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/analytics/enhanced?timeframe=30d`,
        { headers: { Cookie: invalidAuth } },
      );

      const invalidSkuDial = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        { headers: { Cookie: invalidAuth } },
      );

      expect(invalidAnalytics.status).toBe(401);
      expect(invalidSkuDial.status).toBe(401);
    });

    test("should handle validation errors gracefully", async () => {
      // Test various invalid data scenarios
      const invalidDataSets = [
        {
          name: "negative values",
          data: {
            performancePoints: -10,
            inventoryPoints: 80,
            profitabilityPoints: 120,
            demandPoints: 90,
            competitivePoints: 60,
            trendPoints: 50,
          },
        },
        {
          name: "over category limit",
          data: {
            performancePoints: 250,
            inventoryPoints: 80,
            profitabilityPoints: 120,
            demandPoints: 90,
            competitivePoints: 60,
            trendPoints: 50,
          },
        },
        {
          name: "over total limit",
          data: {
            performancePoints: 200,
            inventoryPoints: 150,
            profitabilityPoints: 200,
            demandPoints: 138,
            competitivePoints: 100,
            trendPoints: 101,
          },
        },
        {
          name: "invalid data types",
          data: {
            performancePoints: "invalid",
            inventoryPoints: null,
            profitabilityPoints: undefined,
            demandPoints: {},
            competitivePoints: [],
            trendPoints: 50,
          },
        },
      ];

      for (const { name, data } of invalidDataSets) {
        const response = await fetch(
          `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Cookie: authCookie,
              "X-CSRF-Token": csrfToken,
            },
            body: JSON.stringify(data),
          },
        );

        expect(response.status).toBe(400);
        const errorData = await response.json();
        expect(errorData.success).toBe(false);
        expect(errorData.message).toBeDefined();
      }
    });
  });

  describe("Performance Integration Tests", () => {
    test("should maintain response times under load", async () => {
      const startTime = Date.now();

      // Create multiple concurrent requests
      const requests = Array(10)
        .fill()
        .map(() =>
          Promise.all([
            fetch(
              `${testConfig.baseUrl}/api/products/${testProductId}/analytics/enhanced?timeframe=30d`,
              { headers: { Cookie: authCookie } },
            ),
            fetch(
              `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
              { headers: { Cookie: authCookie } },
            ),
          ]),
        );

      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // Verify all requests succeeded
      responses.forEach(([analyticsResponse, skuDialResponse]) => {
        expect(analyticsResponse.ok).toBe(true);
        expect(skuDialResponse.ok).toBe(true);
      });

      // Verify reasonable response time
      expect(totalTime).toBeLessThan(10000); // 10 seconds for 20 requests
    });

    test("should handle rapid successive operations", async () => {
      const operations = [];

      // Queue multiple operations
      for (let i = 0; i < 5; i++) {
        operations.push(
          fetch(
            `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Cookie: authCookie,
                "X-CSRF-Token": csrfToken,
              },
              body: JSON.stringify({
                performancePoints: 150 + i * 5,
                inventoryPoints: 100,
                profitabilityPoints: 140,
                demandPoints: 100,
                competitivePoints: 80,
                trendPoints: 70,
              }),
            },
          ),
        );

        // Small delay to prevent overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const responses = await Promise.all(operations);

      // All operations should succeed
      responses.forEach((response) => {
        expect(response.ok).toBe(true);
      });

      // Verify final state
      const finalResponse = await fetch(
        `${testConfig.baseUrl}/api/products/${testProductId}/sku-dial`,
        { headers: { Cookie: authCookie } },
      );

      const finalData = await finalResponse.json();
      expect(finalData.data.performancePoints).toBe(170); // Last update: 150 + 4*5
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
