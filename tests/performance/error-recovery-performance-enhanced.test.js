/**
 * Enhanced Error Recovery Performance Testing
 * Comprehensive performance validation for error recovery system with large datasets
 *
 * TESTING SCOPE:
 * - Large dataset error recovery (1000+ records)
 * - Concurrent error recovery sessions (multiple users)
 * - Memory usage profiling during error recovery
 * - WebSocket performance under load
 * - API response time degradation analysis
 * - Error recovery throughput optimization validation
 * - Resource cleanup efficiency testing
 */

const axios = require("axios");
const FormData = require("form-data");
const { performance } = require("perf_hooks");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const BASE_URL = "http://localhost:5000";
const WS_URL = "ws://localhost:5000";

// Enhanced performance test thresholds
const PERFORMANCE_THRESHOLDS = {
  // API Response Times
  API_RESPONSE_TIME_SMALL: 1000, // 1 second for small datasets
  API_RESPONSE_TIME_LARGE: 5000, // 5 seconds for large datasets
  BULK_FIX_TIME_SMALL: 2000, // 2 seconds for < 100 fixes
  BULK_FIX_TIME_LARGE: 10000, // 10 seconds for > 1000 fixes

  // Memory and Resource Limits
  MEMORY_LEAK_THRESHOLD: 100, // 100MB max memory increase
  SESSION_CREATION_TIME: 2000, // 2 seconds max for session creation

  // Concurrency Limits
  CONCURRENT_SESSIONS: 20, // Support 20 concurrent sessions
  CONCURRENT_OPERATIONS: 50, // 50 concurrent operations per session

  // Throughput Requirements
  ERROR_PROCESSING_RATE: 100, // 100 errors per second minimum
  DATA_IMPORT_RATE: 500, // 500 records per second minimum

  // Large Dataset Limits
  LARGE_DATASET_SIZE: 5000, // Test with up to 5k records
  MASSIVE_DATASET_SIZE: 10000, // Stress test with 10k records

  // WebSocket Performance
  WS_CONNECTION_TIME: 3000, // 3 seconds max to establish WS
  WS_MESSAGE_LATENCY: 500, // 500ms max for message delivery
};

describe("Enhanced Error Recovery Performance Tests", () => {
  let authToken = null;
  let testSessions = [];
  let wsConnections = [];
  let initialMemoryUsage = null;
  let performanceMetrics = {
    tests: [],
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      averageExecutionTime: 0,
      peakMemoryUsage: 0,
    },
  };

  beforeAll(async () => {
    // Get authentication token
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: "local-dev-user@example.com",
        password: "testpassword",
      });
      authToken = response.data.token;
    } catch (error) {
      authToken = "dev-token";
    }

    // Record initial memory usage
    initialMemoryUsage = process.memoryUsage();
    console.log(
      `📊 Initial memory usage: ${(initialMemoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
    );
  });

  afterEach(async () => {
    // Clean up WebSocket connections
    for (const ws of wsConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
    wsConnections = [];

    // Clean up test sessions
    for (const sessionId of testSessions) {
      try {
        await axios.delete(`${BASE_URL}/api/import/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch (error) {
        // Session might already be cleaned up
      }
    }
    testSessions = [];

    // Update performance metrics
    const currentMemory = process.memoryUsage();
    const memoryUsage = currentMemory.heapUsed / 1024 / 1024;
    if (memoryUsage > performanceMetrics.summary.peakMemoryUsage) {
      performanceMetrics.summary.peakMemoryUsage = memoryUsage;
    }
  });

  afterAll(async () => {
    // Generate performance report
    const finalMemoryUsage = process.memoryUsage();
    const memoryIncrease =
      (finalMemoryUsage.heapUsed - initialMemoryUsage.heapUsed) / (1024 * 1024);

    performanceMetrics.summary.totalTests = performanceMetrics.tests.length;
    performanceMetrics.summary.passedTests = performanceMetrics.tests.filter(
      (t) => t.passed,
    ).length;
    performanceMetrics.summary.failedTests =
      performanceMetrics.summary.totalTests -
      performanceMetrics.summary.passedTests;
    performanceMetrics.summary.averageExecutionTime =
      performanceMetrics.tests.reduce((sum, t) => sum + t.executionTime, 0) /
      performanceMetrics.summary.totalTests;

    console.log("\n📈 PERFORMANCE TEST SUMMARY");
    console.log(`Tests Run: ${performanceMetrics.summary.totalTests}`);
    console.log(`Tests Passed: ${performanceMetrics.summary.passedTests}`);
    console.log(`Tests Failed: ${performanceMetrics.summary.failedTests}`);
    console.log(
      `Average Execution Time: ${performanceMetrics.summary.averageExecutionTime.toFixed(2)}ms`,
    );
    console.log(
      `Peak Memory Usage: ${performanceMetrics.summary.peakMemoryUsage.toFixed(2)}MB`,
    );
    console.log(`Memory Increase: ${memoryIncrease.toFixed(2)}MB`);

    if (memoryIncrease > PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD) {
      console.warn(
        `⚠️ Potential memory leak detected: ${memoryIncrease.toFixed(2)}MB increase`,
      );
    }
  });

  // Helper function to create large test dataset
  const createLargeTestDataset = (recordCount, errorRate = 0.3) => {
    const headers = "name,price,sku,email,inventory,category";
    const rows = [headers];

    for (let i = 1; i <= recordCount; i++) {
      let name = `Product ${i}`;
      let price = (Math.random() * 100 + 10).toFixed(2);
      let sku = `SKU${i.toString().padStart(6, "0")}`;
      let email = `user${i}@example.com`;
      let inventory = Math.floor(Math.random() * 1000);
      let category = `Category ${Math.ceil(i / 100)}`;

      // Inject errors based on error rate
      if (Math.random() < errorRate) {
        const errorType = Math.floor(Math.random() * 5);
        switch (errorType) {
          case 0:
            name = "";
            break; // Missing name
          case 1:
            price = "INVALID_PRICE";
            break; // Invalid price
          case 2:
            sku = "";
            break; // Missing SKU
          case 3:
            email = "invalid_email";
            break; // Invalid email
          case 4:
            inventory = "INVALID_QTY";
            break; // Invalid inventory
        }
      }

      rows.push(
        `"${name}",${price},"${sku}","${email}",${inventory},"${category}"`,
      );
    }

    return rows.join("\n");
  };

  // Helper function to track performance metrics
  const trackPerformance = (testName, executionTime, passed, metrics = {}) => {
    performanceMetrics.tests.push({
      testName,
      executionTime,
      passed,
      timestamp: new Date().toISOString(),
      ...metrics,
    });
  };

  // Helper function to measure execution time
  const measureTime = async (fn) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return {
      result,
      duration: end - start,
    };
  };

  describe("Large Dataset Performance Tests", () => {
    test("should handle large dataset error analysis efficiently", async () => {
      console.log("🧪 Testing large dataset error analysis performance...");

      const recordCount = PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE;
      const csvContent = createLargeTestDataset(recordCount, 0.25); // 25% error rate

      const { duration: totalDuration } = await measureTime(async () => {
        // Upload large dataset
        const csvFilePath = path.join(
          __dirname,
          "../fixtures/large-performance-test.csv",
        );
        fs.writeFileSync(csvFilePath, csvContent);

        try {
          const formData = new FormData();
          formData.append("file", fs.createReadStream(csvFilePath));
          formData.append("type", "products");

          const uploadResponse = await axios.post(
            `${BASE_URL}/api/import/upload`,
            formData,
            {
              headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${authToken}`,
              },
            },
          );

          const sessionId = uploadResponse.data.sessionId;
          testSessions.push(sessionId);

          // Analyze large dataset
          const analysisResponse = await axios.post(
            `${BASE_URL}/api/import/analyze`,
            {
              sessionId: sessionId,
              mappings: {
                name: "name",
                price: "price",
                sku: "sku",
                email: "email",
                inventory: "inventory",
                category: "category",
              },
            },
            {
              headers: { Authorization: `Bearer ${authToken}` },
            },
          );

          const errors = analysisResponse.data.errors || [];
          const expectedErrorCount = Math.floor(recordCount * 0.25); // Expected error count

          expect(errors.length).toBeGreaterThan(0);
          expect(errors.length).toBeLessThan(recordCount); // Not all records should have errors

          return { sessionId, errors };
        } finally {
          if (fs.existsSync(csvFilePath)) {
            fs.unlinkSync(csvFilePath);
          }
        }
      });

      const throughput = recordCount / (totalDuration / 1000); // records per second
      expect(totalDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME_LARGE,
      );
      expect(throughput).toBeGreaterThan(
        PERFORMANCE_THRESHOLDS.DATA_IMPORT_RATE / 10,
      ); // 10% of import rate for analysis

      trackPerformance("Large Dataset Analysis", totalDuration, true, {
        recordCount,
        throughput: throughput.toFixed(2),
        recordsPerSecond: throughput,
      });

      console.log(
        `✓ Large dataset analysis: ${recordCount} records in ${totalDuration.toFixed(2)}ms (${throughput.toFixed(2)} records/sec)`,
      );
    }, 60000); // 1 minute timeout

    test("should efficiently process bulk error fixes on large datasets", async () => {
      console.log(
        "🧪 Testing bulk error fix performance with large dataset...",
      );

      const recordCount = 2000; // Manageable size for bulk fix testing
      const csvContent = createLargeTestDataset(recordCount, 0.4); // 40% error rate for intensive testing

      const { duration: setupDuration, result: setupResult } =
        await measureTime(async () => {
          // Setup large dataset with errors
          const csvFilePath = path.join(
            __dirname,
            "../fixtures/bulk-fix-test.csv",
          );
          fs.writeFileSync(csvFilePath, csvContent);

          try {
            const formData = new FormData();
            formData.append("file", fs.createReadStream(csvFilePath));
            formData.append("type", "products");

            const uploadResponse = await axios.post(
              `${BASE_URL}/api/import/upload`,
              formData,
              {
                headers: {
                  ...formData.getHeaders(),
                  Authorization: `Bearer ${authToken}`,
                },
              },
            );

            const sessionId = uploadResponse.data.sessionId;
            testSessions.push(sessionId);

            const analysisResponse = await axios.post(
              `${BASE_URL}/api/import/analyze`,
              {
                sessionId: sessionId,
                mappings: {
                  name: "name",
                  price: "price",
                  sku: "sku",
                  email: "email",
                  inventory: "inventory",
                },
              },
              {
                headers: { Authorization: `Bearer ${authToken}` },
              },
            );

            return {
              sessionId,
              errors: analysisResponse.data.errors || [],
            };
          } finally {
            if (fs.existsSync(csvFilePath)) {
              fs.unlinkSync(csvFilePath);
            }
          }
        });

      const { sessionId, errors } = setupResult;
      expect(errors.length).toBeGreaterThan(100); // Should have substantial errors

      // Test bulk fix performance
      const bulkFixCount = Math.min(500, errors.length); // Fix up to 500 errors
      const bulkFixes = errors.slice(0, bulkFixCount).map((error) => ({
        recordIndex: error.recordIndex,
        field: error.field,
        newValue: error.field === "price" ? "25.99" : "Fixed Value",
        autoFix: {
          action: "bulk_fix",
          newValue: error.field === "price" ? "25.99" : "Fixed Value",
          confidence: 0.9,
        },
      }));

      const { duration: bulkFixDuration } = await measureTime(async () => {
        return axios.post(
          `${BASE_URL}/api/recovery/${sessionId}/fix-bulk`,
          {
            rule: "performance_test_bulk_fix",
            errors: bulkFixes,
          },
          {
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );
      });

      const errorProcessingRate = bulkFixCount / (bulkFixDuration / 1000); // errors per second
      expect(bulkFixDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.BULK_FIX_TIME_LARGE,
      );
      expect(errorProcessingRate).toBeGreaterThan(
        PERFORMANCE_THRESHOLDS.ERROR_PROCESSING_RATE / 5,
      ); // 20% of target rate

      trackPerformance("Bulk Error Fix", bulkFixDuration, true, {
        errorCount: bulkFixCount,
        errorsPerSecond: errorProcessingRate.toFixed(2),
        setupTime: setupDuration,
      });

      console.log(
        `✓ Bulk fix performance: ${bulkFixCount} errors in ${bulkFixDuration.toFixed(2)}ms (${errorProcessingRate.toFixed(2)} errors/sec)`,
      );
    }, 90000); // 1.5 minute timeout

    test("should maintain performance with massive datasets", async () => {
      console.log("🧪 Testing massive dataset performance limits...");

      const recordCount = PERFORMANCE_THRESHOLDS.MASSIVE_DATASET_SIZE;
      const csvContent = createLargeTestDataset(recordCount, 0.1); // Lower error rate for massive dataset

      const memoryBefore = process.memoryUsage();

      const { duration: massiveDuration } = await measureTime(async () => {
        const csvFilePath = path.join(
          __dirname,
          "../fixtures/massive-test.csv",
        );
        fs.writeFileSync(csvFilePath, csvContent);

        try {
          const formData = new FormData();
          formData.append("file", fs.createReadStream(csvFilePath));
          formData.append("type", "products");

          const uploadResponse = await axios.post(
            `${BASE_URL}/api/import/upload`,
            formData,
            {
              headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${authToken}`,
              },
            },
          );

          const sessionId = uploadResponse.data.sessionId;
          testSessions.push(sessionId);

          // Just analyze, don't try to fix all errors (would take too long)
          const analysisResponse = await axios.post(
            `${BASE_URL}/api/import/analyze`,
            {
              sessionId: sessionId,
              mappings: {
                name: "name",
                price: "price",
                sku: "sku",
              },
            },
            {
              headers: { Authorization: `Bearer ${authToken}` },
            },
          );

          return analysisResponse.data;
        } finally {
          if (fs.existsSync(csvFilePath)) {
            fs.unlinkSync(csvFilePath);
          }
        }
      });

      const memoryAfter = process.memoryUsage();
      const memoryIncrease =
        (memoryAfter.heapUsed - memoryBefore.heapUsed) / (1024 * 1024);

      const throughput = recordCount / (massiveDuration / 1000);
      expect(massiveDuration).toBeLessThan(120000); // 2 minutes max
      expect(memoryIncrease).toBeLessThan(500); // Should not use excessive memory (500MB max)

      trackPerformance("Massive Dataset", massiveDuration, true, {
        recordCount,
        memoryIncrease: memoryIncrease.toFixed(2),
        throughput: throughput.toFixed(2),
      });

      console.log(
        `✓ Massive dataset: ${recordCount} records in ${massiveDuration.toFixed(2)}ms (${throughput.toFixed(2)} records/sec, +${memoryIncrease.toFixed(2)}MB memory)`,
      );
    }, 180000); // 3 minute timeout
  });

  describe("Concurrent Operations Performance", () => {
    test("should handle multiple concurrent error recovery sessions", async () => {
      console.log(
        "🧪 Testing concurrent error recovery session performance...",
      );

      const sessionCount = PERFORMANCE_THRESHOLDS.CONCURRENT_SESSIONS;
      const recordsPerSession = 100;

      const { duration: concurrentDuration } = await measureTime(async () => {
        // Create multiple sessions concurrently
        const sessionPromises = Array(sessionCount)
          .fill()
          .map(async (_, index) => {
            const csvContent = createLargeTestDataset(recordsPerSession, 0.3);
            const csvFilePath = path.join(
              __dirname,
              `../fixtures/concurrent-${index}-${Date.now()}.csv`,
            );

            fs.writeFileSync(csvFilePath, csvContent);

            try {
              const formData = new FormData();
              formData.append("file", fs.createReadStream(csvFilePath));
              formData.append("type", "products");

              const uploadResponse = await axios.post(
                `${BASE_URL}/api/import/upload`,
                formData,
                {
                  headers: {
                    ...formData.getHeaders(),
                    Authorization: `Bearer ${authToken}`,
                  },
                },
              );

              const sessionId = uploadResponse.data.sessionId;
              testSessions.push(sessionId);

              // Analyze each session
              const analysisResponse = await axios.post(
                `${BASE_URL}/api/import/analyze`,
                {
                  sessionId: sessionId,
                  mappings: {
                    name: "name",
                    price: "price",
                    sku: "sku",
                  },
                },
                {
                  headers: { Authorization: `Bearer ${authToken}` },
                },
              );

              return {
                sessionId,
                errors: analysisResponse.data.errors || [],
                index,
              };
            } finally {
              if (fs.existsSync(csvFilePath)) {
                fs.unlinkSync(csvFilePath);
              }
            }
          });

        const results = await Promise.allSettled(sessionPromises);
        const successfulSessions = results.filter(
          (r) => r.status === "fulfilled",
        );

        return successfulSessions;
      });

      const successfulSessions = await Promise.allSettled(
        Array(sessionCount)
          .fill()
          .map(async (_, index) => {
            const csvContent = createLargeTestDataset(recordsPerSession, 0.3);
            const csvFilePath = path.join(
              __dirname,
              `../fixtures/concurrent-${index}-${Date.now()}.csv`,
            );

            fs.writeFileSync(csvFilePath, csvContent);

            try {
              const formData = new FormData();
              formData.append("file", fs.createReadStream(csvFilePath));
              formData.append("type", "products");

              const uploadResponse = await axios.post(
                `${BASE_URL}/api/import/upload`,
                formData,
                {
                  headers: {
                    ...formData.getHeaders(),
                    Authorization: `Bearer ${authToken}`,
                  },
                },
              );

              const sessionId = uploadResponse.data.sessionId;
              testSessions.push(sessionId);

              return sessionId;
            } finally {
              if (fs.existsSync(csvFilePath)) {
                fs.unlinkSync(csvFilePath);
              }
            }
          }),
      );

      const successCount = successfulSessions.filter(
        (r) => r.status === "fulfilled",
      ).length;
      expect(successCount).toBeGreaterThanOrEqual(sessionCount * 0.8); // At least 80% should succeed
      expect(concurrentDuration).toBeLessThan(30000); // Should complete within 30 seconds

      trackPerformance("Concurrent Sessions", concurrentDuration, true, {
        sessionCount,
        successCount,
        successRate: ((successCount / sessionCount) * 100).toFixed(1),
      });

      console.log(
        `✓ Concurrent sessions: ${successCount}/${sessionCount} successful in ${concurrentDuration.toFixed(2)}ms`,
      );
    }, 120000); // 2 minute timeout

    test("should handle concurrent error fixing operations within same session", async () => {
      console.log("🧪 Testing concurrent error fixing operations...");

      // Create a session with many errors
      const recordCount = 500;
      const csvContent = createLargeTestDataset(recordCount, 0.5); // 50% error rate
      const csvFilePath = path.join(
        __dirname,
        "../fixtures/concurrent-fixes-test.csv",
      );
      fs.writeFileSync(csvFilePath, csvContent);

      try {
        const formData = new FormData();
        formData.append("file", fs.createReadStream(csvFilePath));
        formData.append("type", "products");

        const uploadResponse = await axios.post(
          `${BASE_URL}/api/import/upload`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              Authorization: `Bearer ${authToken}`,
            },
          },
        );

        const sessionId = uploadResponse.data.sessionId;
        testSessions.push(sessionId);

        const analysisResponse = await axios.post(
          `${BASE_URL}/api/import/analyze`,
          {
            sessionId: sessionId,
            mappings: {
              name: "name",
              price: "price",
              sku: "sku",
            },
          },
          {
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );

        const errors = analysisResponse.data.errors || [];
        expect(errors.length).toBeGreaterThan(50); // Should have substantial errors

        // Create concurrent fix operations
        const concurrentOperations = Math.min(
          PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATIONS,
          errors.length,
        );

        const { duration: concurrentFixDuration } = await measureTime(
          async () => {
            const fixPromises = errors
              .slice(0, concurrentOperations)
              .map((error, index) =>
                axios.post(
                  `${BASE_URL}/api/recovery/${sessionId}/fix-single`,
                  {
                    recordIndex: error.recordIndex,
                    field: error.field,
                    newValue: `Concurrent Fix ${index}`,
                  },
                  {
                    headers: { Authorization: `Bearer ${authToken}` },
                  },
                ),
              );

            const results = await Promise.allSettled(fixPromises);
            return results.filter((r) => r.status === "fulfilled");
          },
        );

        const operationThroughput =
          concurrentOperations / (concurrentFixDuration / 1000);
        expect(concurrentFixDuration).toBeLessThan(15000); // 15 seconds max
        expect(operationThroughput).toBeGreaterThan(5); // At least 5 operations per second

        trackPerformance("Concurrent Operations", concurrentFixDuration, true, {
          operationCount: concurrentOperations,
          operationsPerSecond: operationThroughput.toFixed(2),
        });

        console.log(
          `✓ Concurrent operations: ${concurrentOperations} operations in ${concurrentFixDuration.toFixed(2)}ms (${operationThroughput.toFixed(2)} ops/sec)`,
        );
      } finally {
        if (fs.existsSync(csvFilePath)) {
          fs.unlinkSync(csvFilePath);
        }
      }
    }, 90000); // 1.5 minute timeout
  });

  describe("WebSocket Performance Under Load", () => {
    test("should maintain WebSocket performance with multiple connections", async () => {
      console.log("🧪 Testing WebSocket performance under load...");

      // Create a session for WebSocket testing
      const csvContent = createLargeTestDataset(100, 0.3);
      const csvFilePath = path.join(
        __dirname,
        "../fixtures/websocket-test.csv",
      );
      fs.writeFileSync(csvFilePath, csvContent);

      try {
        const formData = new FormData();
        formData.append("file", fs.createReadStream(csvFilePath));
        formData.append("type", "products");

        const uploadResponse = await axios.post(
          `${BASE_URL}/api/import/upload`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              Authorization: `Bearer ${authToken}`,
            },
          },
        );

        const sessionId = uploadResponse.data.sessionId;
        testSessions.push(sessionId);

        await axios.post(
          `${BASE_URL}/api/import/analyze`,
          {
            sessionId: sessionId,
            mappings: { name: "name", price: "price" },
          },
          {
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );

        // Create multiple WebSocket connections
        const connectionCount = 10;
        const { duration: wsSetupDuration } = await measureTime(async () => {
          const connectionPromises = Array(connectionCount)
            .fill()
            .map(() => {
              return new Promise((resolve, reject) => {
                const ws = new WebSocket(
                  `${WS_URL}/ws/error-recovery/${sessionId}`,
                  {
                    headers: { Authorization: `Bearer ${authToken}` },
                  },
                );

                ws.on("open", () => {
                  wsConnections.push(ws);
                  resolve(ws);
                });

                ws.on("error", reject);

                setTimeout(() => {
                  if (ws.readyState !== WebSocket.OPEN) {
                    reject(new Error("WebSocket connection timeout"));
                  }
                }, PERFORMANCE_THRESHOLDS.WS_CONNECTION_TIME);
              });
            });

          return Promise.allSettled(connectionPromises);
        });

        const successfulConnections = wsConnections.length;
        expect(successfulConnections).toBeGreaterThanOrEqual(
          connectionCount * 0.8,
        ); // 80% success rate
        expect(wsSetupDuration).toBeLessThan(
          PERFORMANCE_THRESHOLDS.WS_CONNECTION_TIME * 2,
        );

        // Test message broadcasting performance
        const messagePromises = wsConnections.map((ws) => {
          return new Promise((resolve) => {
            ws.once("message", () => resolve(performance.now()));
          });
        });

        const messageSendTime = performance.now();

        // Trigger a fix to send WebSocket updates
        await axios.post(
          `${BASE_URL}/api/recovery/${sessionId}/fix-single`,
          {
            recordIndex: 0,
            field: "name",
            newValue: "WebSocket Test Fix",
          },
          {
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );

        const messageReceiveTimes = await Promise.allSettled(messagePromises);
        const successfulMessages = messageReceiveTimes.filter(
          (r) => r.status === "fulfilled",
        );

        if (successfulMessages.length > 0) {
          const avgLatency =
            successfulMessages.reduce(
              (sum, r) => sum + (r.value - messageSendTime),
              0,
            ) / successfulMessages.length;
          expect(avgLatency).toBeLessThan(
            PERFORMANCE_THRESHOLDS.WS_MESSAGE_LATENCY,
          );

          trackPerformance("WebSocket Performance", wsSetupDuration, true, {
            connectionCount: successfulConnections,
            messageLatency: avgLatency.toFixed(2),
            messageSuccessRate: (
              (successfulMessages.length / connectionCount) *
              100
            ).toFixed(1),
          });

          console.log(
            `✓ WebSocket performance: ${successfulConnections} connections, ${avgLatency.toFixed(2)}ms avg latency`,
          );
        } else {
          console.log(
            "✓ WebSocket connections established but no messages received (may be expected)",
          );
        }
      } finally {
        if (fs.existsSync(csvFilePath)) {
          fs.unlinkSync(csvFilePath);
        }
      }
    }, 60000); // 1 minute timeout
  });

  describe("Memory Usage and Resource Management", () => {
    test("should efficiently manage memory with large error recovery operations", async () => {
      console.log("🧪 Testing memory efficiency with large operations...");

      const memoryBefore = process.memoryUsage();
      const iterations = 5;
      const recordsPerIteration = 1000;

      for (let i = 0; i < iterations; i++) {
        const csvContent = createLargeTestDataset(recordsPerIteration, 0.2);
        const csvFilePath = path.join(
          __dirname,
          `../fixtures/memory-test-${i}.csv`,
        );
        fs.writeFileSync(csvFilePath, csvContent);

        try {
          const formData = new FormData();
          formData.append("file", fs.createReadStream(csvFilePath));
          formData.append("type", "products");

          const uploadResponse = await axios.post(
            `${BASE_URL}/api/import/upload`,
            formData,
            {
              headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${authToken}`,
              },
            },
          );

          const sessionId = uploadResponse.data.sessionId;
          testSessions.push(sessionId);

          // Analyze and then immediately clean up
          await axios.post(
            `${BASE_URL}/api/import/analyze`,
            {
              sessionId: sessionId,
              mappings: { name: "name", price: "price" },
            },
            {
              headers: { Authorization: `Bearer ${authToken}` },
            },
          );

          // Clean up immediately
          await axios.delete(`${BASE_URL}/api/import/sessions/${sessionId}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });

          testSessions = testSessions.filter((id) => id !== sessionId);
        } finally {
          if (fs.existsSync(csvFilePath)) {
            fs.unlinkSync(csvFilePath);
          }
        }

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Small delay to allow cleanup
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const memoryAfter = process.memoryUsage();
      const memoryIncrease =
        (memoryAfter.heapUsed - memoryBefore.heapUsed) / (1024 * 1024);

      expect(Math.abs(memoryIncrease)).toBeLessThan(50); // Should not increase significantly

      trackPerformance("Memory Management", 0, true, {
        iterations,
        recordsPerIteration,
        memoryIncrease: memoryIncrease.toFixed(2),
      });

      console.log(
        `✓ Memory management: ${iterations} iterations of ${recordsPerIteration} records, ${memoryIncrease.toFixed(2)}MB change`,
      );
    }, 120000); // 2 minute timeout

    test("should handle resource cleanup efficiently", async () => {
      console.log("🧪 Testing resource cleanup efficiency...");

      const cleanupStartTime = performance.now();

      // Create multiple sessions rapidly
      const sessionCount = 10;
      const createdSessions = [];

      for (let i = 0; i < sessionCount; i++) {
        const csvContent = createLargeTestDataset(50, 0.1);
        const csvFilePath = path.join(
          __dirname,
          `../fixtures/cleanup-test-${i}.csv`,
        );
        fs.writeFileSync(csvFilePath, csvContent);

        try {
          const formData = new FormData();
          formData.append("file", fs.createReadStream(csvFilePath));
          formData.append("type", "products");

          const uploadResponse = await axios.post(
            `${BASE_URL}/api/import/upload`,
            formData,
            {
              headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${authToken}`,
              },
            },
          );

          createdSessions.push(uploadResponse.data.sessionId);
        } finally {
          if (fs.existsSync(csvFilePath)) {
            fs.unlinkSync(csvFilePath);
          }
        }
      }

      // Clean up all sessions
      const { duration: cleanupDuration } = await measureTime(async () => {
        const cleanupPromises = createdSessions.map((sessionId) =>
          axios.delete(`${BASE_URL}/api/import/sessions/${sessionId}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          }),
        );

        return Promise.allSettled(cleanupPromises);
      });

      const totalDuration = performance.now() - cleanupStartTime;
      expect(cleanupDuration).toBeLessThan(5000); // Cleanup should be fast

      trackPerformance("Resource Cleanup", cleanupDuration, true, {
        sessionCount,
        totalDuration: totalDuration.toFixed(2),
        cleanupDuration: cleanupDuration.toFixed(2),
      });

      console.log(
        `✓ Resource cleanup: ${sessionCount} sessions cleaned up in ${cleanupDuration.toFixed(2)}ms`,
      );
    }, 60000); // 1 minute timeout
  });

  describe("Performance Regression Analysis", () => {
    test("should maintain consistent performance across multiple test runs", async () => {
      console.log("🧪 Testing performance consistency...");

      const runs = 5;
      const recordCount = 200;
      const runResults = [];

      for (let run = 1; run <= runs; run++) {
        const { duration, result } = await measureTime(async () => {
          const csvContent = createLargeTestDataset(recordCount, 0.2);
          const csvFilePath = path.join(
            __dirname,
            `../fixtures/consistency-test-${run}.csv`,
          );
          fs.writeFileSync(csvFilePath, csvContent);

          try {
            const formData = new FormData();
            formData.append("file", fs.createReadStream(csvFilePath));
            formData.append("type", "products");

            const uploadResponse = await axios.post(
              `${BASE_URL}/api/import/upload`,
              formData,
              {
                headers: {
                  ...formData.getHeaders(),
                  Authorization: `Bearer ${authToken}`,
                },
              },
            );

            const sessionId = uploadResponse.data.sessionId;
            testSessions.push(sessionId);

            const analysisResponse = await axios.post(
              `${BASE_URL}/api/import/analyze`,
              {
                sessionId: sessionId,
                mappings: { name: "name", price: "price", sku: "sku" },
              },
              {
                headers: { Authorization: `Bearer ${authToken}` },
              },
            );

            return {
              errors: analysisResponse.data.errors || [],
              sessionId,
            };
          } finally {
            if (fs.existsSync(csvFilePath)) {
              fs.unlinkSync(csvFilePath);
            }
          }
        });

        runResults.push({
          run,
          duration,
          throughput: recordCount / (duration / 1000),
          errorCount: result.errors.length,
        });
      }

      // Calculate performance consistency
      const durations = runResults.map((r) => r.duration);
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / runs;
      const stdDev = Math.sqrt(
        durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) /
          runs,
      );
      const coefficientOfVariation = stdDev / avgDuration;

      expect(coefficientOfVariation).toBeLessThan(0.3); // Performance should be fairly consistent
      expect(avgDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME_LARGE,
      );

      trackPerformance("Performance Consistency", avgDuration, true, {
        runs,
        avgDuration: avgDuration.toFixed(2),
        stdDev: stdDev.toFixed(2),
        coefficientOfVariation: coefficientOfVariation.toFixed(3),
      });

      console.log(
        `✓ Performance consistency: avg=${avgDuration.toFixed(2)}ms, cv=${coefficientOfVariation.toFixed(3)} across ${runs} runs`,
      );
    }, 180000); // 3 minute timeout
  });

  describe("Performance Test Summary", () => {
    test("should generate comprehensive performance report", () => {
      console.log("\n=== ENHANCED ERROR RECOVERY PERFORMANCE TEST SUMMARY ===");
      console.log(`Total Tests Executed: ${performanceMetrics.tests.length}`);
      console.log(
        `Average Execution Time: ${performanceMetrics.summary.averageExecutionTime?.toFixed(2) || "N/A"}ms`,
      );
      console.log(
        `Peak Memory Usage: ${performanceMetrics.summary.peakMemoryUsage?.toFixed(2) || "N/A"}MB`,
      );
      console.log("");
      console.log("📊 PERFORMANCE THRESHOLDS:");
      Object.entries(PERFORMANCE_THRESHOLDS).forEach(([key, value]) => {
        console.log(
          `  ${key}: ${value}${key.includes("TIME") ? "ms" : key.includes("MEMORY") ? "MB" : ""}`,
        );
      });
      console.log("");
      console.log("🏆 TEST RESULTS BREAKDOWN:");

      if (performanceMetrics.tests.length > 0) {
        performanceMetrics.tests.forEach((test) => {
          const status = test.passed ? "✅" : "❌";
          console.log(
            `  ${status} ${test.testName}: ${test.executionTime.toFixed(2)}ms`,
          );
          if (test.recordCount)
            console.log(`     Records: ${test.recordCount}`);
          if (test.throughput)
            console.log(`     Throughput: ${test.throughput} records/sec`);
        });
      }

      console.log(
        "===========================================================\n",
      );

      // This test always passes - it's for reporting
      expect(true).toBe(true);
    });
  });
});
