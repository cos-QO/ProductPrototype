#!/usr/bin/env node

/**
 * Bulk Upload Performance Testing Suite
 *
 * Priority: P1 - Performance Requirements
 *
 * Tests processing speed targets identified in improvement plan:
 * - Processing speed: <10ms per record
 * - Memory usage: <500MB for large datasets
 * - Concurrent users: Support 50 simultaneous uploads
 * - API response time: <2s
 *
 * Coverage:
 * - Record processing benchmarks
 * - Memory usage monitoring
 * - Concurrent upload handling
 * - Large file processing
 * - WebSocket performance
 * - Database query optimization
 *
 * Success Criteria:
 * - <10ms per record processing
 * - <500MB memory usage for 10,000 records
 * - Support 50 concurrent users
 * - API responses <2s
 */

const {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} = require("@jest/globals");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { Worker } = require("worker_threads");
const fetch = require("node-fetch");
const FormData = require("form-data");

// Test configuration
const BASE_URL = "http://localhost:5000";
const PERFORMANCE_TARGETS = {
  processingSpeed: 10, // ms per record
  memoryLimit: 500 * 1024 * 1024, // 500MB
  apiResponseTime: 2000, // 2 seconds
  concurrentUsers: 50,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  websocketLatency: 50, // ms
};

// Performance testing utilities
class PerformanceTestUtils {
  static createTestData(recordCount, scenario = "basic") {
    const scenarios = {
      basic: {
        fields: ["name", "price", "sku"],
        generator: (index) => ({
          name: `Product ${index}`,
          price: (Math.random() * 100 + 10).toFixed(2),
          sku: `SKU${String(index).padStart(6, "0")}`,
        }),
      },

      complex: {
        fields: [
          "name",
          "price",
          "sku",
          "description",
          "brand",
          "category",
          "tags",
          "weight",
          "dimensions",
        ],
        generator: (index) => ({
          name: `Complex Product ${index} with Long Name and Detailed Description`,
          price: (Math.random() * 1000 + 50).toFixed(2),
          sku: `COMPLEX-SKU-${String(index).padStart(8, "0")}`,
          description: `This is a detailed product description for item ${index}. It contains multiple sentences and provides comprehensive information about the product features, benefits, and specifications.`,
          brand: `Brand ${Math.floor(index / 100)}`,
          category: `Category ${Math.floor(index / 50)}`,
          tags: `tag1,tag2,tag3,featured,product-${index}`,
          weight: Math.floor(Math.random() * 5000 + 100),
          dimensions: `${Math.floor(Math.random() * 50)}x${Math.floor(Math.random() * 50)}x${Math.floor(Math.random() * 50)}`,
        }),
      },

      unicode: {
        fields: ["name", "price", "sku", "description"],
        generator: (index) => ({
          name: `测试产品 ${index} テスト製品 Продукт тест`,
          price: (Math.random() * 100 + 10).toFixed(2),
          sku: `UNI-${String(index).padStart(6, "0")}`,
          description: `Ürün açıklaması ${index} 🚀 Émoji tëst français Ñañoño español 中文测试`,
        }),
      },
    };

    const config = scenarios[scenario];
    const records = [];

    for (let i = 1; i <= recordCount; i++) {
      records.push(config.generator(i));
    }

    return {
      headers: config.fields,
      records,
      csv: this.convertToCSV(records, config.fields),
      json: JSON.stringify(records),
    };
  }

  static convertToCSV(records, headers) {
    const csvLines = [headers.join(",")];

    records.forEach((record) => {
      const values = headers.map((header) => {
        const value = record[header] || "";
        // Escape values containing commas or quotes
        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvLines.push(values.join(","));
    });

    return csvLines.join("\n");
  }

  static createTestFile(content, filename, mimeType = "text/csv") {
    const filePath = path.join(__dirname, filename);
    fs.writeFileSync(filePath, content);

    return {
      path: filePath,
      name: filename,
      size: Buffer.byteLength(content),
      mimeType,
    };
  }

  static measureMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      usedMB: Math.round(usage.heapUsed / 1024 / 1024),
      totalMB: Math.round(usage.heapTotal / 1024 / 1024),
    };
  }

  static async uploadAndMeasure(file, sessionId = null) {
    const startTime = Date.now();
    const initialMemory = this.measureMemoryUsage();

    try {
      const formData = new FormData();
      const fileStream = fs.createReadStream(file.path);
      formData.append("file", fileStream, {
        filename: file.name,
        contentType: file.mimeType,
      });

      const endpoint = sessionId
        ? `/api/upload/${sessionId}/analyze`
        : "/api/import/csv";

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        body: formData,
      });

      const endTime = Date.now();
      const finalMemory = this.measureMemoryUsage();

      const result = response.ok ? await response.json() : null;
      const error = !response.ok ? await response.text() : null;

      return {
        success: response.ok,
        status: response.status,
        data: result,
        error,
        metrics: {
          responseTime: endTime - startTime,
          memoryBefore: initialMemory,
          memoryAfter: finalMemory,
          memoryIncrease: finalMemory.heapUsed - initialMemory.heapUsed,
          fileSize: file.size,
          processingRate: result?.recordCount
            ? (endTime - startTime) / result.recordCount
            : null,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        metrics: {
          responseTime: Date.now() - startTime,
          memoryBefore: initialMemory,
          memoryAfter: this.measureMemoryUsage(),
        },
      };
    }
  }

  static async measureConcurrentUploads(concurrency, recordCount = 100) {
    const results = [];
    const startTime = Date.now();

    // Create test files for concurrent uploads
    const testFiles = Array(concurrency)
      .fill()
      .map((_, index) => {
        const testData = this.createTestData(recordCount, "basic");
        return this.createTestFile(
          testData.csv,
          `concurrent-test-${index}.csv`,
        );
      });

    try {
      // Execute concurrent uploads
      const uploadPromises = testFiles.map(async (file, index) => {
        const uploadStart = Date.now();
        const result = await this.uploadAndMeasure(file);
        const uploadEnd = Date.now();

        return {
          index,
          duration: uploadEnd - uploadStart,
          success: result.success,
          fileSize: file.size,
          error: result.error,
          metrics: result.metrics,
        };
      });

      const uploadResults = await Promise.allSettled(uploadPromises);
      const totalTime = Date.now() - startTime;

      // Process results
      uploadResults.forEach((promiseResult, index) => {
        if (promiseResult.status === "fulfilled") {
          results.push(promiseResult.value);
        } else {
          results.push({
            index,
            success: false,
            error: promiseResult.reason.message,
            duration: totalTime,
          });
        }
      });

      return {
        concurrency,
        totalTime,
        results,
        successCount: results.filter((r) => r.success).length,
        failureCount: results.filter((r) => !r.success).length,
        avgResponseTime:
          results.reduce((sum, r) => sum + r.duration, 0) / results.length,
        maxResponseTime: Math.max(...results.map((r) => r.duration)),
        minResponseTime: Math.min(...results.map((r) => r.duration)),
      };
    } finally {
      // Cleanup test files
      testFiles.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
  }

  static cleanup(filePaths) {
    filePaths.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }
}

// Test cleanup
const testFiles = [];

afterAll(() => {
  PerformanceTestUtils.cleanup(testFiles);
});

describe("Record Processing Speed Benchmarks", () => {
  test("should process small datasets within target time (<10ms/record)", async () => {
    const recordCounts = [50, 100, 500];

    for (const recordCount of recordCounts) {
      const testData = PerformanceTestUtils.createTestData(
        recordCount,
        "basic",
      );
      const testFile = PerformanceTestUtils.createTestFile(
        testData.csv,
        `speed-test-${recordCount}.csv`,
      );
      testFiles.push(testFile.path);

      const result = await PerformanceTestUtils.uploadAndMeasure(testFile);

      expect(result.success).toBe(true);

      if (result.metrics.processingRate) {
        console.log(
          `${recordCount} records: ${result.metrics.processingRate.toFixed(2)}ms per record`,
        );
        expect(result.metrics.processingRate).toBeLessThan(
          PERFORMANCE_TARGETS.processingSpeed,
        );
      }

      expect(result.metrics.responseTime).toBeLessThan(
        PERFORMANCE_TARGETS.apiResponseTime,
      );
    }
  });

  test("should handle complex records efficiently", async () => {
    const recordCount = 1000;
    const testData = PerformanceTestUtils.createTestData(
      recordCount,
      "complex",
    );
    const testFile = PerformanceTestUtils.createTestFile(
      testData.csv,
      "complex-performance-test.csv",
    );
    testFiles.push(testFile.path);

    const result = await PerformanceTestUtils.uploadAndMeasure(testFile);

    expect(result.success).toBe(true);

    if (result.metrics.processingRate) {
      console.log(
        `Complex records: ${result.metrics.processingRate.toFixed(2)}ms per record`,
      );
      // Allow slightly higher processing time for complex records
      expect(result.metrics.processingRate).toBeLessThan(
        PERFORMANCE_TARGETS.processingSpeed * 2,
      );
    }
  });

  test("should process Unicode content without performance degradation", async () => {
    const recordCount = 500;
    const testData = PerformanceTestUtils.createTestData(
      recordCount,
      "unicode",
    );
    const testFile = PerformanceTestUtils.createTestFile(
      testData.csv,
      "unicode-performance-test.csv",
    );
    testFiles.push(testFile.path);

    const result = await PerformanceTestUtils.uploadAndMeasure(testFile);

    expect(result.success).toBe(true);

    if (result.metrics.processingRate) {
      console.log(
        `Unicode records: ${result.metrics.processingRate.toFixed(2)}ms per record`,
      );
      expect(result.metrics.processingRate).toBeLessThan(
        PERFORMANCE_TARGETS.processingSpeed * 1.5,
      );
    }
  });
});

describe("Memory Usage Monitoring", () => {
  test("should stay within memory limits for large datasets", async () => {
    const recordCounts = [1000, 5000, 10000];

    for (const recordCount of recordCounts) {
      // Force garbage collection if available
      if (global.gc) global.gc();

      const testData = PerformanceTestUtils.createTestData(
        recordCount,
        "basic",
      );
      const testFile = PerformanceTestUtils.createTestFile(
        testData.csv,
        `memory-test-${recordCount}.csv`,
      );
      testFiles.push(testFile.path);

      const result = await PerformanceTestUtils.uploadAndMeasure(testFile);

      expect(result.success).toBe(true);

      const memoryIncrease = result.metrics.memoryIncrease;
      const memoryAfter = result.metrics.memoryAfter.heapUsed;

      console.log(
        `${recordCount} records: +${Math.round(memoryIncrease / 1024 / 1024)}MB, total: ${Math.round(memoryAfter / 1024 / 1024)}MB`,
      );

      // Memory should not exceed limit
      expect(memoryAfter).toBeLessThan(PERFORMANCE_TARGETS.memoryLimit);

      // Memory per record should be reasonable
      const memoryPerRecord = memoryIncrease / recordCount;
      expect(memoryPerRecord).toBeLessThan(10000); // 10KB per record max
    }
  });

  test("should release memory after processing", async () => {
    // Force garbage collection if available
    if (global.gc) global.gc();

    const initialMemory = PerformanceTestUtils.measureMemoryUsage();

    // Process a large file
    const testData = PerformanceTestUtils.createTestData(5000, "complex");
    const testFile = PerformanceTestUtils.createTestFile(
      testData.csv,
      "memory-release-test.csv",
    );
    testFiles.push(testFile.path);

    const result = await PerformanceTestUtils.uploadAndMeasure(testFile);
    expect(result.success).toBe(true);

    // Wait for potential cleanup
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Force garbage collection if available
    if (global.gc) global.gc();

    const finalMemory = PerformanceTestUtils.measureMemoryUsage();
    const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

    console.log(
      `Memory growth after processing: ${Math.round(memoryGrowth / 1024 / 1024)}MB`,
    );

    // Memory growth should be minimal after processing
    expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // 100MB max growth
  });
});

describe("Concurrent User Support", () => {
  test("should handle 10 concurrent uploads", async () => {
    const concurrency = 10;
    const result = await PerformanceTestUtils.measureConcurrentUploads(
      concurrency,
      100,
    );

    console.log(
      `${concurrency} concurrent uploads: ${result.successCount}/${result.results.length} succeeded`,
    );
    console.log(`Avg response time: ${Math.round(result.avgResponseTime)}ms`);

    expect(result.successCount).toBeGreaterThan(concurrency * 0.8); // 80% success rate
    expect(result.avgResponseTime).toBeLessThan(
      PERFORMANCE_TARGETS.apiResponseTime * 2,
    );
  });

  test("should handle 25 concurrent uploads", async () => {
    const concurrency = 25;
    const result = await PerformanceTestUtils.measureConcurrentUploads(
      concurrency,
      50,
    );

    console.log(
      `${concurrency} concurrent uploads: ${result.successCount}/${result.results.length} succeeded`,
    );
    console.log(`Avg response time: ${Math.round(result.avgResponseTime)}ms`);

    expect(result.successCount).toBeGreaterThan(concurrency * 0.7); // 70% success rate
    expect(result.avgResponseTime).toBeLessThan(
      PERFORMANCE_TARGETS.apiResponseTime * 3,
    );
  });

  test("should approach target of 50 concurrent uploads", async () => {
    const concurrency = 50;
    const result = await PerformanceTestUtils.measureConcurrentUploads(
      concurrency,
      25,
    );

    console.log(
      `${concurrency} concurrent uploads: ${result.successCount}/${result.results.length} succeeded`,
    );
    console.log(
      `Success rate: ${Math.round((result.successCount / result.results.length) * 100)}%`,
    );
    console.log(`Avg response time: ${Math.round(result.avgResponseTime)}ms`);

    // Lower expectations for stress test, but should still handle some concurrent load
    expect(result.successCount).toBeGreaterThan(concurrency * 0.6); // 60% success rate
    expect(result.avgResponseTime).toBeLessThan(
      PERFORMANCE_TARGETS.apiResponseTime * 5,
    );
  });
});

describe("Large File Processing", () => {
  test("should handle maximum file size (10MB)", async () => {
    // Create a file close to the 10MB limit
    const recordCount = 50000; // Approximate 10MB with basic data
    const testData = PerformanceTestUtils.createTestData(recordCount, "basic");
    const testFile = PerformanceTestUtils.createTestFile(
      testData.csv,
      "large-file-test.csv",
    );
    testFiles.push(testFile.path);

    console.log(
      `Large file size: ${Math.round(testFile.size / 1024 / 1024)}MB`,
    );

    const result = await PerformanceTestUtils.uploadAndMeasure(testFile);

    if (testFile.size <= PERFORMANCE_TARGETS.maxFileSize) {
      expect(result.success).toBe(true);

      if (result.metrics.processingRate) {
        console.log(
          `Large file processing: ${result.metrics.processingRate.toFixed(2)}ms per record`,
        );
        // Allow more time for large files
        expect(result.metrics.processingRate).toBeLessThan(
          PERFORMANCE_TARGETS.processingSpeed * 3,
        );
      }
    } else {
      // File exceeds size limit, should be rejected
      expect(result.success).toBe(false);
      expect(result.status).toBe(413); // Payload Too Large
    }
  });

  test("should reject oversized files", async () => {
    // Create a file larger than 10MB
    const oversizedContent = "x".repeat(15 * 1024 * 1024); // 15MB
    const testFile = PerformanceTestUtils.createTestFile(
      oversizedContent,
      "oversized-test.csv",
    );
    testFiles.push(testFile.path);

    const result = await PerformanceTestUtils.uploadAndMeasure(testFile);

    expect(result.success).toBe(false);
    expect(result.status).toBe(413); // Payload Too Large
  });
});

describe("API Response Time Benchmarks", () => {
  test("should meet response time targets for various scenarios", async () => {
    const testScenarios = [
      { name: "Small file", recordCount: 100, scenario: "basic" },
      { name: "Medium file", recordCount: 1000, scenario: "basic" },
      { name: "Complex data", recordCount: 500, scenario: "complex" },
      { name: "Unicode data", recordCount: 300, scenario: "unicode" },
    ];

    for (const test of testScenarios) {
      const testData = PerformanceTestUtils.createTestData(
        test.recordCount,
        test.scenario,
      );
      const testFile = PerformanceTestUtils.createTestFile(
        testData.csv,
        `response-time-${test.name.replace(/\s+/g, "-")}.csv`,
      );
      testFiles.push(testFile.path);

      const result = await PerformanceTestUtils.uploadAndMeasure(testFile);

      expect(result.success).toBe(true);
      console.log(`${test.name}: ${result.metrics.responseTime}ms`);

      // Different targets based on complexity
      const targetMultiplier = test.scenario === "complex" ? 2 : 1;
      expect(result.metrics.responseTime).toBeLessThan(
        PERFORMANCE_TARGETS.apiResponseTime * targetMultiplier,
      );
    }
  });
});

describe("Performance Regression Detection", () => {
  test("should establish baseline performance metrics", async () => {
    const baselineTests = [
      { recordCount: 100, scenario: "basic" },
      { recordCount: 1000, scenario: "basic" },
      { recordCount: 500, scenario: "complex" },
    ];

    const baselines = {};

    for (const test of baselineTests) {
      const testData = PerformanceTestUtils.createTestData(
        test.recordCount,
        test.scenario,
      );
      const testFile = PerformanceTestUtils.createTestFile(
        testData.csv,
        `baseline-${test.recordCount}-${test.scenario}.csv`,
      );
      testFiles.push(testFile.path);

      const result = await PerformanceTestUtils.uploadAndMeasure(testFile);

      expect(result.success).toBe(true);

      const key = `${test.recordCount}-${test.scenario}`;
      baselines[key] = {
        responseTime: result.metrics.responseTime,
        processingRate: result.metrics.processingRate,
        memoryIncrease: result.metrics.memoryIncrease,
      };
    }

    // Save baselines for future regression testing
    const baselinePath = path.join(__dirname, "performance-baselines.json");
    fs.writeFileSync(baselinePath, JSON.stringify(baselines, null, 2));

    console.log("Performance baselines established:", baselines);

    // Basic validation that baselines are reasonable
    Object.values(baselines).forEach((baseline) => {
      expect(baseline.responseTime).toBeLessThan(
        PERFORMANCE_TARGETS.apiResponseTime,
      );
      if (baseline.processingRate) {
        expect(baseline.processingRate).toBeLessThan(
          PERFORMANCE_TARGETS.processingSpeed,
        );
      }
    });
  });
});

// Export utilities for other performance tests
module.exports = {
  PerformanceTestUtils,
  PERFORMANCE_TARGETS,
};
