/**
 * Large Dataset Performance Testing Suite
 * Tests bulk upload system performance with 100-10000+ records
 * Monitors memory, CPU, database, and WebSocket performance
 */

const request = require("supertest");
const WebSocket = require("ws");
const { performance, PerformanceObserver } = require("perf_hooks");
const fs = require("fs").promises;
const path = require("path");

// Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      memoryUsage: [],
      processingTimes: [],
      dbQueries: [],
      wsMessages: [],
      errors: [],
    };
    this.startTime = 0;
    this.observers = [];
  }

  start() {
    this.startTime = performance.now();
    this.startMemoryMonitoring();
    this.startPerformanceObserver();
  }

  startMemoryMonitoring() {
    this.memoryInterval = setInterval(() => {
      const usage = process.memoryUsage();
      this.metrics.memoryUsage.push({
        timestamp: performance.now() - this.startTime,
        rss: usage.rss / 1024 / 1024, // MB
        heapUsed: usage.heapUsed / 1024 / 1024, // MB
        heapTotal: usage.heapTotal / 1024 / 1024, // MB
        external: usage.external / 1024 / 1024, // MB
      });
    }, 100); // Sample every 100ms
  }

  startPerformanceObserver() {
    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes("bulk-upload")) {
          this.metrics.processingTimes.push({
            name: entry.name,
            duration: entry.duration,
            timestamp: entry.startTime,
          });
        }
      }
    });
    obs.observe({ entryTypes: ["measure"] });
    this.observers.push(obs);
  }

  stop() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
    this.observers.forEach((obs) => obs.disconnect());
  }

  getReport() {
    const totalTime = performance.now() - this.startTime;
    const peakMemory = Math.max(
      ...this.metrics.memoryUsage.map((m) => m.heapUsed),
    );
    const avgProcessingTime =
      this.metrics.processingTimes.length > 0
        ? this.metrics.processingTimes.reduce((sum, p) => sum + p.duration, 0) /
          this.metrics.processingTimes.length
        : 0;

    return {
      totalExecutionTime: totalTime,
      peakMemoryUsage: peakMemory,
      averageProcessingTime: avgProcessingTime,
      memoryLeakDetected: this.detectMemoryLeak(),
      performanceScore: this.calculatePerformanceScore(),
      recommendations: this.generateRecommendations(),
      rawMetrics: this.metrics,
    };
  }

  detectMemoryLeak() {
    if (this.metrics.memoryUsage.length < 10) return false;

    const first10 = this.metrics.memoryUsage.slice(0, 10);
    const last10 = this.metrics.memoryUsage.slice(-10);

    const avgFirst =
      first10.reduce((sum, m) => sum + m.heapUsed, 0) / first10.length;
    const avgLast =
      last10.reduce((sum, m) => sum + m.heapUsed, 0) / last10.length;

    return (avgLast - avgFirst) / avgFirst > 0.5; // 50% increase indicates potential leak
  }

  calculatePerformanceScore() {
    let score = 100;

    // Memory usage penalty
    const peakMemory = Math.max(
      ...this.metrics.memoryUsage.map((m) => m.heapUsed),
    );
    if (peakMemory > 1000) score -= 20; // Over 1GB penalty
    if (peakMemory > 500) score -= 10; // Over 500MB penalty

    // Processing time penalty
    const avgTime =
      this.metrics.processingTimes.length > 0
        ? this.metrics.processingTimes.reduce((sum, p) => sum + p.duration, 0) /
          this.metrics.processingTimes.length
        : 0;
    if (avgTime > 5000) score -= 20; // Over 5s penalty
    if (avgTime > 2000) score -= 10; // Over 2s penalty

    // Memory leak penalty
    if (this.detectMemoryLeak()) score -= 30;

    return Math.max(0, score);
  }

  generateRecommendations() {
    const recommendations = [];
    const peakMemory = Math.max(
      ...this.metrics.memoryUsage.map((m) => m.heapUsed),
    );

    if (peakMemory > 1000) {
      recommendations.push(
        "Consider implementing streaming processing for large datasets",
      );
    }
    if (this.detectMemoryLeak()) {
      recommendations.push(
        "Memory leak detected - review object cleanup and event listener removal",
      );
    }
    if (this.metrics.processingTimes.some((p) => p.duration > 10000)) {
      recommendations.push(
        "Some operations exceed 10s - consider implementing background processing",
      );
    }

    return recommendations;
  }
}

// Test data generator for large datasets
class LargeDatasetGenerator {
  static async generateCSV(recordCount, errorRate = 0.1) {
    const headers = "name,sku,price,brand,category,description,inventory\n";
    let csv = headers;

    const brands = ["TechFlow", "StyleCo", "HomeStyle", "Aurora Cosmetics"];
    const categories = ["Electronics", "Fashion", "Home & Garden", "Beauty"];

    for (let i = 0; i < recordCount; i++) {
      const hasError = Math.random() < errorRate;
      const record = {
        name: hasError && Math.random() < 0.3 ? "" : `Product ${i + 1}`,
        sku:
          hasError && Math.random() < 0.3
            ? ""
            : `SKU-${String(i + 1).padStart(6, "0")}`,
        price:
          hasError && Math.random() < 0.3
            ? "invalid"
            : (Math.random() * 1000).toFixed(2),
        brand: brands[Math.floor(Math.random() * brands.length)],
        category: categories[Math.floor(Math.random() * categories.length)],
        description: `High-quality product ${i + 1} with excellent features`,
        inventory: Math.floor(Math.random() * 1000),
      };

      csv += `"${record.name}","${record.sku}","${record.price}","${record.brand}","${record.category}","${record.description}",${record.inventory}\n`;
    }

    return csv;
  }

  static async saveTestFile(csv, filename) {
    const testDir = path.join(__dirname, "../fixtures/performance");
    await fs.mkdir(testDir, { recursive: true });
    const filepath = path.join(testDir, filename);
    await fs.writeFile(filepath, csv);
    return filepath;
  }
}

// WebSocket performance testing
class WebSocketPerformanceTester {
  constructor(url) {
    this.url = url;
    this.messages = [];
    this.connectionTime = 0;
    this.messageLatencies = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      this.ws = new WebSocket(this.url);

      this.ws.on("open", () => {
        this.connectionTime = performance.now() - startTime;
        resolve();
      });

      this.ws.on("error", reject);

      this.ws.on("message", (data) => {
        const timestamp = performance.now();
        const message = JSON.parse(data);
        this.messages.push({ ...message, receivedAt: timestamp });

        // Calculate latency if message has timestamp
        if (message.timestamp) {
          this.messageLatencies.push(timestamp - message.timestamp);
        }
      });
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  getPerformanceMetrics() {
    return {
      connectionTime: this.connectionTime,
      messageCount: this.messages.length,
      averageLatency:
        this.messageLatencies.length > 0
          ? this.messageLatencies.reduce((sum, l) => sum + l, 0) /
            this.messageLatencies.length
          : 0,
      maxLatency: Math.max(...this.messageLatencies),
      messagesPerSecond:
        this.messages.length > 0
          ? this.messages.length /
            ((this.messages[this.messages.length - 1].receivedAt -
              this.messages[0].receivedAt) /
              1000)
          : 0,
    };
  }
}

// Main test suite
describe("Large Dataset Performance Tests", () => {
  let app;
  let monitor;
  let testDataFiles = [];

  beforeAll(async () => {
    // Initialize test environment
    app = require("../../server/index.js");
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Allow server startup
  });

  afterAll(async () => {
    // Cleanup test files
    for (const file of testDataFiles) {
      try {
        await fs.unlink(file);
      } catch (err) {
        console.warn(`Failed to cleanup ${file}:`, err.message);
      }
    }
  });

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    monitor.start();
  });

  afterEach(() => {
    monitor.stop();
  });

  // Test dataset sizes: 100, 500, 1000, 5000, 10000
  const testSizes = [100, 500, 1000, 5000];

  testSizes.forEach((size) => {
    describe(`Dataset Size: ${size} records`, () => {
      let testFile;
      let uploadResponse;

      beforeAll(async () => {
        // Generate test data
        const csv = await LargeDatasetGenerator.generateCSV(size, 0.1);
        testFile = await LargeDatasetGenerator.saveTestFile(
          csv,
          `test-${size}-records.csv`,
        );
        testDataFiles.push(testFile);
      });

      test(`should process ${size} records within performance thresholds`, async () => {
        performance.mark("bulk-upload-start");

        const response = await request(app)
          .post("/api/import/products")
          .attach("file", testFile)
          .field("brand", "TestBrand")
          .expect(200);

        performance.mark("bulk-upload-end");
        performance.measure(
          "bulk-upload-total",
          "bulk-upload-start",
          "bulk-upload-end",
        );

        uploadResponse = response.body;

        // Performance assertions
        const report = monitor.getReport();

        // Memory usage should not exceed 1GB for datasets under 5000 records
        if (size < 5000) {
          expect(report.peakMemoryUsage).toBeLessThan(1000);
        }

        // Processing should complete within reasonable time
        const timeThreshold = size * 10; // 10ms per record max
        expect(report.totalExecutionTime).toBeLessThan(timeThreshold);

        // No memory leaks
        expect(report.memoryLeakDetected).toBe(false);

        // Performance score should be acceptable
        expect(report.performanceScore).toBeGreaterThan(60);

        console.log(`Performance Report for ${size} records:`, {
          executionTime: `${Math.round(report.totalExecutionTime)}ms`,
          peakMemory: `${Math.round(report.peakMemoryUsage)}MB`,
          performanceScore: report.performanceScore,
          recommendations: report.recommendations,
        });
      });

      test(`should handle WebSocket updates efficiently for ${size} records`, async () => {
        const wsUrl = "ws://localhost:5000";
        const wsTester = new WebSocketPerformanceTester(wsUrl);

        try {
          await wsTester.connect();

          // Wait for upload completion and collect WebSocket messages
          await new Promise((resolve) => setTimeout(resolve, 5000));

          const wsMetrics = wsTester.getPerformanceMetrics();

          // WebSocket performance assertions
          expect(wsMetrics.connectionTime).toBeLessThan(1000); // 1s connection
          expect(wsMetrics.averageLatency).toBeLessThan(100); // 100ms avg latency
          expect(wsMetrics.messagesPerSecond).toBeGreaterThan(10); // 10 msg/s min

          console.log(`WebSocket Performance for ${size} records:`, wsMetrics);
        } finally {
          wsTester.disconnect();
        }
      });

      test(`should handle error recovery efficiently for ${size} records`, async () => {
        if (
          uploadResponse &&
          uploadResponse.sessionId &&
          uploadResponse.errors?.length > 0
        ) {
          performance.mark("error-recovery-start");

          // Test bulk error fix performance
          const errorFixResponse = await request(app)
            .post(`/api/recovery/${uploadResponse.sessionId}/fix-bulk`)
            .send({
              fixes: uploadResponse.errors
                .slice(0, Math.min(10, uploadResponse.errors.length))
                .map((error) => ({
                  errorId: error.id,
                  field: error.field,
                  newValue: `fixed-${error.field}-value`,
                })),
            })
            .expect(200);

          performance.mark("error-recovery-end");
          performance.measure(
            "error-recovery-total",
            "error-recovery-start",
            "error-recovery-end",
          );

          const report = monitor.getReport();
          const errorRecoveryTime = report.processingTimes.find(
            (p) => p.name === "error-recovery-total",
          );

          // Error recovery should be fast
          if (errorRecoveryTime) {
            expect(errorRecoveryTime.duration).toBeLessThan(5000); // 5s max
          }

          console.log(`Error Recovery Performance for ${size} records:`, {
            errorsFixed: errorFixResponse.body.fixedCount,
            processingTime: errorRecoveryTime?.duration || "N/A",
          });
        }
      });
    });
  });

  describe("Concurrent Load Testing", () => {
    test("should handle multiple simultaneous uploads", async () => {
      const concurrentUploads = 3;
      const recordsPerUpload = 100;

      // Generate test files
      const uploadPromises = [];
      for (let i = 0; i < concurrentUploads; i++) {
        const csv = await LargeDatasetGenerator.generateCSV(recordsPerUpload);
        const testFile = await LargeDatasetGenerator.saveTestFile(
          csv,
          `concurrent-${i}.csv`,
        );
        testDataFiles.push(testFile);

        uploadPromises.push(
          request(app)
            .post("/api/import/products")
            .attach("file", testFile)
            .field("brand", `ConcurrentBrand${i}`),
        );
      }

      performance.mark("concurrent-uploads-start");
      const responses = await Promise.all(uploadPromises);
      performance.mark("concurrent-uploads-end");
      performance.measure(
        "concurrent-uploads-total",
        "concurrent-uploads-start",
        "concurrent-uploads-end",
      );

      // All uploads should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      const report = monitor.getReport();
      console.log(`Concurrent Upload Performance:`, {
        totalTime: `${Math.round(report.totalExecutionTime)}ms`,
        peakMemory: `${Math.round(report.peakMemoryUsage)}MB`,
        uploadsProcessed: concurrentUploads,
        totalRecords: concurrentUploads * recordsPerUpload,
      });

      // System should remain stable under concurrent load
      expect(report.performanceScore).toBeGreaterThan(40);
    });
  });

  describe("Resource Usage Optimization", () => {
    test("should show linear memory scaling", async () => {
      const measurements = [];

      for (const size of [100, 500, 1000]) {
        const csv = await LargeDatasetGenerator.generateCSV(size);
        const testFile = await LargeDatasetGenerator.saveTestFile(
          csv,
          `scaling-${size}.csv`,
        );
        testDataFiles.push(testFile);

        const localMonitor = new PerformanceMonitor();
        localMonitor.start();

        await request(app)
          .post("/api/import/products")
          .attach("file", testFile)
          .field("brand", "ScalingTest")
          .expect(200);

        localMonitor.stop();
        const report = localMonitor.getReport();

        measurements.push({
          size,
          peakMemory: report.peakMemoryUsage,
          processingTime: report.totalExecutionTime,
        });
      }

      // Check for linear scaling
      const memoryPerRecord = measurements.map((m) => m.peakMemory / m.size);
      const timePerRecord = measurements.map((m) => m.processingTime / m.size);

      console.log("Scaling Analysis:", {
        memoryPerRecord: memoryPerRecord.map((m) => `${m.toFixed(3)}MB/record`),
        timePerRecord: timePerRecord.map((t) => `${t.toFixed(2)}ms/record`),
        measurements,
      });

      // Memory per record should be consistent (within 50% variance)
      const avgMemoryPerRecord =
        memoryPerRecord.reduce((sum, m) => sum + m, 0) / memoryPerRecord.length;
      memoryPerRecord.forEach((m) => {
        expect(
          Math.abs(m - avgMemoryPerRecord) / avgMemoryPerRecord,
        ).toBeLessThan(0.5);
      });
    });
  });
});

module.exports = {
  PerformanceMonitor,
  LargeDatasetGenerator,
  WebSocketPerformanceTester,
};
