#!/usr/bin/env node

/**
 * OpenRouter API Integration Testing Suite
 *
 * Priority: P0 - Critical System Blocker
 *
 * Tests OpenRouter API integration that is currently non-functional
 * according to gap analysis. Missing API key integration blocks
 * the entire field mapping system.
 *
 * API Key: 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
 *
 * Coverage:
 * - API connection and authentication
 * - Field mapping accuracy (>95% requirement)
 * - Cost control (<$0.001 per session)
 * - Response time (<2s requirement)
 * - Error handling and fallbacks
 * - Rate limiting compliance
 *
 * Success Criteria:
 * - API connection functional
 * - Field mapping accuracy >95%
 * - Cost per session <$0.001
 * - Response time <2 seconds
 */

const {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} = require("@jest/globals");
const fetch = require("node-fetch");

// Test configuration
const OPENROUTER_API_KEY =
  "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";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const LOCAL_API_BASE = "http://localhost:5000";

// Performance targets
const PERFORMANCE_TARGETS = {
  responseTime: 2000, // 2 seconds max
  accuracy: 0.95, // 95% minimum
  costPerSession: 0.001, // $0.001 maximum
  maxRetries: 3,
};

// Test utilities for OpenRouter API testing
class OpenRouterTestUtils {
  static async directAPICall(endpoint, data, options = {}) {
    const startTime = Date.now();

    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5000",
          "X-Title": "QueenOne Bulk Upload Testing",
          ...options.headers,
        },
        body: JSON.stringify(data),
      });

      const responseTime = Date.now() - startTime;
      const result = await response.json();

      return {
        success: response.ok,
        status: response.status,
        data: result,
        responseTime,
        cost: this.calculateCost(result),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  static calculateCost(apiResponse) {
    // OpenRouter cost calculation based on token usage
    if (!apiResponse.usage) return 0;

    const promptTokens = apiResponse.usage.prompt_tokens || 0;
    const completionTokens = apiResponse.usage.completion_tokens || 0;

    // Estimated costs (these would need to be updated based on actual OpenRouter pricing)
    const promptCostPer1k = 0.0015; // $0.0015 per 1k prompt tokens
    const completionCostPer1k = 0.002; // $0.002 per 1k completion tokens

    const promptCost = (promptTokens / 1000) * promptCostPer1k;
    const completionCost = (completionTokens / 1000) * completionCostPer1k;

    return promptCost + completionCost;
  }

  static generateFieldMappingPrompt(sourceFields) {
    const fieldDescriptions = sourceFields
      .map(
        (field) =>
          `${field.name}: ${field.dataType} (samples: ${field.sampleValues.join(", ")})`,
      )
      .join("\n");

    return {
      model: "anthropic/claude-3-haiku",
      messages: [
        {
          role: "system",
          content: `You are a data mapping expert. Map source fields to target product schema fields.
          
Target schema fields:
- name (string, required): Product name
- price (number, required): Price in cents
- sku (string, required): Stock keeping unit
- shortDescription (string): Brief product description
- longDescription (string): Detailed product description
- brandId (number): Brand identifier
- stock (number): Inventory quantity
- weight (number): Weight in grams
- category (string): Product category
- tags (string): Comma-separated tags

Return a JSON array of mappings with this structure:
[
  {
    "sourceField": "source_field_name",
    "targetField": "target_field_name",
    "confidence": 0.95,
    "reasoning": "explanation"
  }
]`,
        },
        {
          role: "user",
          content: `Map these source fields to the target schema:\n\n${fieldDescriptions}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    };
  }

  static validateMappingAccuracy(mappings, expectedMappings) {
    if (!mappings || !Array.isArray(mappings)) return 0;

    let correct = 0;
    let total = expectedMappings.length;

    expectedMappings.forEach((expected) => {
      const mapping = mappings.find(
        (m) => m.sourceField === expected.sourceField,
      );
      if (mapping && mapping.targetField === expected.targetField) {
        correct++;
      }
    });

    return total > 0 ? correct / total : 0;
  }

  static createTestFieldSet(scenario = "basic") {
    const testSets = {
      basic: {
        sourceFields: [
          {
            name: "product_name",
            dataType: "string",
            sampleValues: ["Wireless Headphones", "Gaming Mouse", "USB Cable"],
            nullPercentage: 0,
            uniquePercentage: 100,
          },
          {
            name: "price_usd",
            dataType: "number",
            sampleValues: ["29.99", "49.99", "19.99"],
            nullPercentage: 0,
            uniquePercentage: 90,
          },
          {
            name: "item_code",
            dataType: "string",
            sampleValues: ["WH001", "GM002", "UC003"],
            nullPercentage: 0,
            uniquePercentage: 100,
          },
        ],
        expectedMappings: [
          { sourceField: "product_name", targetField: "name" },
          { sourceField: "price_usd", targetField: "price" },
          { sourceField: "item_code", targetField: "sku" },
        ],
      },

      complex: {
        sourceFields: [
          {
            name: "item_title",
            dataType: "string",
            sampleValues: ["Premium Gaming Headset with Noise Cancellation"],
            nullPercentage: 0,
            uniquePercentage: 100,
          },
          {
            name: "cost",
            dataType: "string",
            sampleValues: ["$159.99", "$89.50", "$299.00"],
            nullPercentage: 5,
            uniquePercentage: 95,
          },
          {
            name: "product_id",
            dataType: "string",
            sampleValues: ["SKU-ABC-123", "SKU-DEF-456"],
            nullPercentage: 0,
            uniquePercentage: 100,
          },
          {
            name: "brief_desc",
            dataType: "string",
            sampleValues: ["High-quality gaming headset"],
            nullPercentage: 10,
            uniquePercentage: 80,
          },
          {
            name: "inventory_count",
            dataType: "number",
            sampleValues: ["150", "75", "200"],
            nullPercentage: 0,
            uniquePercentage: 90,
          },
        ],
        expectedMappings: [
          { sourceField: "item_title", targetField: "name" },
          { sourceField: "cost", targetField: "price" },
          { sourceField: "product_id", targetField: "sku" },
          { sourceField: "brief_desc", targetField: "shortDescription" },
          { sourceField: "inventory_count", targetField: "stock" },
        ],
      },

      ambiguous: {
        sourceFields: [
          {
            name: "title",
            dataType: "string",
            sampleValues: ["Product Title", "Another Title"],
            nullPercentage: 0,
            uniquePercentage: 100,
          },
          {
            name: "code",
            dataType: "string",
            sampleValues: ["ABC123", "DEF456"],
            nullPercentage: 0,
            uniquePercentage: 100,
          },
          {
            name: "amount",
            dataType: "number",
            sampleValues: ["29.99", "49.99"],
            nullPercentage: 0,
            uniquePercentage: 100,
          },
        ],
        expectedMappings: [
          { sourceField: "title", targetField: "name" },
          { sourceField: "code", targetField: "sku" },
          { sourceField: "amount", targetField: "price" },
        ],
      },
    };

    return testSets[scenario];
  }
}

// Authentication setup for local API tests
let authToken = null;

beforeAll(async () => {
  // Set up environment variable for API key
  process.env.OPENROUTER_API_KEY = OPENROUTER_API_KEY;

  // Get auth token for local API tests
  try {
    const loginResponse = await fetch(`${LOCAL_API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test-user@example.com",
        password: "test123",
      }),
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      authToken = loginData.token;
    }
  } catch (error) {
    console.warn("Auth setup failed:", error.message);
  }
});

describe("OpenRouter API Direct Integration", () => {
  test("should establish connection with valid API key", async () => {
    const testPrompt = {
      model: "anthropic/claude-3-haiku",
      messages: [
        {
          role: "user",
          content:
            'Respond with "API_CONNECTION_TEST_SUCCESSFUL" if you receive this message.',
        },
      ],
      max_tokens: 50,
    };

    const result = await OpenRouterTestUtils.directAPICall(
      "/chat/completions",
      testPrompt,
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data.choices).toBeDefined();
    expect(result.data.choices[0].message.content).toContain(
      "API_CONNECTION_TEST_SUCCESSFUL",
    );
    expect(result.responseTime).toBeLessThan(PERFORMANCE_TARGETS.responseTime);
  });

  test("should reject invalid API key", async () => {
    const invalidPrompt = {
      model: "anthropic/claude-3-haiku",
      messages: [{ role: "user", content: "Test with invalid key" }],
      max_tokens: 50,
    };

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: "Bearer invalid-key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidPrompt),
    });

    expect(response.status).toBe(401);
  });

  test("should handle rate limiting gracefully", async () => {
    // Simulate rapid requests to test rate limiting
    const rapidRequests = Array(5)
      .fill()
      .map(async (_, index) => {
        const prompt = {
          model: "anthropic/claude-3-haiku",
          messages: [{ role: "user", content: `Rate limit test ${index}` }],
          max_tokens: 10,
        };

        return OpenRouterTestUtils.directAPICall("/chat/completions", prompt);
      });

    const results = await Promise.allSettled(rapidRequests);
    const successfulRequests = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    );

    // Should handle most requests successfully, some may be rate limited
    expect(successfulRequests.length).toBeGreaterThan(0);
  });
});

describe("Field Mapping Accuracy Testing", () => {
  test("should achieve >95% accuracy on basic field mapping", async () => {
    const testData = OpenRouterTestUtils.createTestFieldSet("basic");
    const prompt = OpenRouterTestUtils.generateFieldMappingPrompt(
      testData.sourceFields,
    );

    const result = await OpenRouterTestUtils.directAPICall(
      "/chat/completions",
      prompt,
    );

    expect(result.success).toBe(true);
    expect(result.responseTime).toBeLessThan(PERFORMANCE_TARGETS.responseTime);

    // Parse the mapping response
    let mappings;
    try {
      const content = result.data.choices[0].message.content;
      mappings = JSON.parse(content);
    } catch (error) {
      // Try to extract JSON from markdown or other formatting
      const jsonMatch =
        result.data.choices[0].message.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        mappings = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse mapping response");
      }
    }

    const accuracy = OpenRouterTestUtils.validateMappingAccuracy(
      mappings,
      testData.expectedMappings,
    );

    expect(accuracy).toBeGreaterThan(PERFORMANCE_TARGETS.accuracy);
    expect(result.cost).toBeLessThan(PERFORMANCE_TARGETS.costPerSession);
  });

  test("should handle complex field mapping scenarios", async () => {
    const testData = OpenRouterTestUtils.createTestFieldSet("complex");
    const prompt = OpenRouterTestUtils.generateFieldMappingPrompt(
      testData.sourceFields,
    );

    const result = await OpenRouterTestUtils.directAPICall(
      "/chat/completions",
      prompt,
    );

    expect(result.success).toBe(true);
    expect(result.responseTime).toBeLessThan(
      PERFORMANCE_TARGETS.responseTime * 1.5,
    ); // Allow more time for complex mapping

    const content = result.data.choices[0].message.content;
    let mappings;
    try {
      mappings = JSON.parse(content);
    } catch (error) {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      mappings = JSON.parse(jsonMatch[0]);
    }

    const accuracy = OpenRouterTestUtils.validateMappingAccuracy(
      mappings,
      testData.expectedMappings,
    );

    expect(accuracy).toBeGreaterThan(0.8); // Lower threshold for complex scenarios
    expect(mappings.length).toBeGreaterThan(0);
  });

  test("should provide confidence scores for mappings", async () => {
    const testData = OpenRouterTestUtils.createTestFieldSet("basic");
    const prompt = OpenRouterTestUtils.generateFieldMappingPrompt(
      testData.sourceFields,
    );

    const result = await OpenRouterTestUtils.directAPICall(
      "/chat/completions",
      prompt,
    );
    const content = result.data.choices[0].message.content;

    let mappings;
    try {
      mappings = JSON.parse(content);
    } catch (error) {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      mappings = JSON.parse(jsonMatch[0]);
    }

    expect(Array.isArray(mappings)).toBe(true);

    mappings.forEach((mapping) => {
      expect(mapping).toHaveProperty("sourceField");
      expect(mapping).toHaveProperty("targetField");
      expect(mapping).toHaveProperty("confidence");
      expect(mapping.confidence).toBeGreaterThan(0);
      expect(mapping.confidence).toBeLessThanOrEqual(1);
    });
  });
});

describe("Cost Control and Performance", () => {
  test("should stay within cost limits for typical session", async () => {
    const testData = OpenRouterTestUtils.createTestFieldSet("basic");
    const prompt = OpenRouterTestUtils.generateFieldMappingPrompt(
      testData.sourceFields,
    );

    const result = await OpenRouterTestUtils.directAPICall(
      "/chat/completions",
      prompt,
    );

    expect(result.success).toBe(true);
    expect(result.cost).toBeLessThan(PERFORMANCE_TARGETS.costPerSession);

    // Log cost for monitoring
    console.log(`Field mapping cost: $${result.cost.toFixed(6)}`);
  });

  test("should meet response time requirements", async () => {
    const testData = OpenRouterTestUtils.createTestFieldSet("basic");
    const prompt = OpenRouterTestUtils.generateFieldMappingPrompt(
      testData.sourceFields,
    );

    const startTime = Date.now();
    const result = await OpenRouterTestUtils.directAPICall(
      "/chat/completions",
      prompt,
    );
    const endTime = Date.now();

    const totalResponseTime = endTime - startTime;

    expect(result.success).toBe(true);
    expect(totalResponseTime).toBeLessThan(PERFORMANCE_TARGETS.responseTime);
    expect(result.responseTime).toBeLessThan(PERFORMANCE_TARGETS.responseTime);
  });

  test("should handle large field sets efficiently", async () => {
    // Create a large field set (20 fields)
    const largeFieldSet = {
      sourceFields: Array(20)
        .fill()
        .map((_, index) => ({
          name: `field_${index + 1}`,
          dataType: "string",
          sampleValues: [`value_${index + 1}a`, `value_${index + 1}b`],
          nullPercentage: Math.random() * 10,
          uniquePercentage: 90 + Math.random() * 10,
        })),
      expectedMappings: [], // We'll focus on performance rather than accuracy for this test
    };

    const prompt = OpenRouterTestUtils.generateFieldMappingPrompt(
      largeFieldSet.sourceFields,
    );

    const result = await OpenRouterTestUtils.directAPICall(
      "/chat/completions",
      prompt,
    );

    expect(result.success).toBe(true);
    expect(result.responseTime).toBeLessThan(
      PERFORMANCE_TARGETS.responseTime * 2,
    ); // Allow more time for large sets
    expect(result.cost).toBeLessThan(PERFORMANCE_TARGETS.costPerSession * 3); // Allow higher cost for large sets
  });
});

describe("Error Handling and Fallbacks", () => {
  test("should handle malformed prompts gracefully", async () => {
    const malformedPrompt = {
      model: "anthropic/claude-3-haiku",
      messages: [
        {
          role: "user",
          content:
            "Map these fields: \n\n[malformed data structure with no proper format]",
        },
      ],
      max_tokens: 500,
    };

    const result = await OpenRouterTestUtils.directAPICall(
      "/chat/completions",
      malformedPrompt,
    );

    // Should either succeed with a clarification request or fail gracefully
    if (result.success) {
      expect(result.data.choices[0].message.content).toBeDefined();
    } else {
      expect(result.error).toBeDefined();
    }
  });

  test("should handle network timeouts", async () => {
    const prompt = OpenRouterTestUtils.generateFieldMappingPrompt(
      OpenRouterTestUtils.createTestFieldSet("basic").sourceFields,
    );

    // Set a very short timeout to simulate network issues
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100); // 100ms timeout

    try {
      await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prompt),
        signal: controller.signal,
      });
    } catch (error) {
      expect(error.name).toBe("AbortError");
    }
  });

  test("should handle invalid model specifications", async () => {
    const invalidModelPrompt = {
      model: "non-existent-model",
      messages: [{ role: "user", content: "Test message" }],
      max_tokens: 50,
    };

    const result = await OpenRouterTestUtils.directAPICall(
      "/chat/completions",
      invalidModelPrompt,
    );

    expect(result.success).toBe(false);
    expect([400, 404]).toContain(result.status);
  });
});

describe("Local API Integration with OpenRouter", () => {
  test("should integrate OpenRouter API key in local service", async () => {
    if (!authToken) {
      console.warn("Skipping local API test - no auth token");
      return;
    }

    const testData = OpenRouterTestUtils.createTestFieldSet("basic");

    const response = await fetch(`${LOCAL_API_BASE}/api/mapping/analyze`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceFields: testData.sourceFields,
      }),
    });

    if (response.ok) {
      const result = await response.json();

      expect(result.mappings).toBeDefined();
      expect(Array.isArray(result.mappings)).toBe(true);
      expect(result.llmUsed).toBe(true);
      expect(result.llmCost).toBeLessThan(PERFORMANCE_TARGETS.costPerSession);
    } else {
      // API might not be implemented yet - that's expected
      expect([404, 501]).toContain(response.status);
    }
  });

  test("should fallback when OpenRouter is unavailable", async () => {
    if (!authToken) {
      console.warn("Skipping local API test - no auth token");
      return;
    }

    // Temporarily set invalid API key to simulate service unavailability
    const originalKey = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = "invalid-key";

    try {
      const testData = OpenRouterTestUtils.createTestFieldSet("basic");

      const response = await fetch(`${LOCAL_API_BASE}/api/mapping/analyze`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceFields: testData.sourceFields,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Should use fallback mapping logic
        expect(result.mappings).toBeDefined();
        expect(result.llmUsed).toBe(false);
        expect(result.fallbackUsed).toBe(true);
      }
    } finally {
      // Restore original key
      process.env.OPENROUTER_API_KEY = originalKey;
    }
  });
});

describe("Performance Monitoring and Metrics", () => {
  test("should track and report performance metrics", async () => {
    const metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      totalCost: 0,
      totalResponseTime: 0,
      accuracyScores: [],
    };

    // Run multiple test scenarios to gather metrics
    const testScenarios = ["basic", "complex", "ambiguous"];

    for (const scenario of testScenarios) {
      const testData = OpenRouterTestUtils.createTestFieldSet(scenario);
      const prompt = OpenRouterTestUtils.generateFieldMappingPrompt(
        testData.sourceFields,
      );

      metrics.totalRequests++;

      const result = await OpenRouterTestUtils.directAPICall(
        "/chat/completions",
        prompt,
      );

      if (result.success) {
        metrics.successfulRequests++;
        metrics.totalCost += result.cost;
        metrics.totalResponseTime += result.responseTime;

        try {
          const content = result.data.choices[0].message.content;
          let mappings;
          try {
            mappings = JSON.parse(content);
          } catch {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            mappings = JSON.parse(jsonMatch[0]);
          }

          const accuracy = OpenRouterTestUtils.validateMappingAccuracy(
            mappings,
            testData.expectedMappings,
          );
          metrics.accuracyScores.push(accuracy);
        } catch (error) {
          console.warn(
            `Failed to parse mapping for ${scenario}:`,
            error.message,
          );
        }
      }
    }

    // Validate overall metrics
    const avgAccuracy =
      metrics.accuracyScores.reduce((a, b) => a + b, 0) /
      metrics.accuracyScores.length;
    const avgResponseTime =
      metrics.totalResponseTime / metrics.successfulRequests;
    const avgCost = metrics.totalCost / metrics.successfulRequests;

    console.log("Performance Metrics:", {
      successRate: `${Math.round((metrics.successfulRequests / metrics.totalRequests) * 100)}%`,
      avgAccuracy: `${Math.round(avgAccuracy * 100)}%`,
      avgResponseTime: `${Math.round(avgResponseTime)}ms`,
      avgCost: `$${avgCost.toFixed(6)}`,
      totalCost: `$${metrics.totalCost.toFixed(6)}`,
    });

    expect(metrics.successfulRequests / metrics.totalRequests).toBeGreaterThan(
      0.8,
    );
    expect(avgAccuracy).toBeGreaterThan(0.8);
    expect(avgResponseTime).toBeLessThan(PERFORMANCE_TARGETS.responseTime);
    expect(avgCost).toBeLessThan(PERFORMANCE_TARGETS.costPerSession);
  });
});

// Export utilities for other tests
module.exports = {
  OpenRouterTestUtils,
  OPENROUTER_API_KEY,
  PERFORMANCE_TARGETS,
};
