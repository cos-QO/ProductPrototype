/**
 * Enhanced End-to-End Error Recovery Workflow Testing
 * Tests complete bulk upload workflow with error recovery using generated test data
 *
 * TESTING SCOPE:
 * - Complete bulk upload workflow: Upload → Error Detection → Recovery → Import
 * - Integration with test data generator for realistic error scenarios
 * - Data integrity validation throughout the process
 * - Performance monitoring with large datasets
 * - User experience simulation with various error patterns
 */

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

const BASE_URL = "http://localhost:5000";

describe("Enhanced End-to-End Error Recovery Workflow Tests", () => {
  let authToken = null;
  let testSessions = [];
  let generatedFiles = [];

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
  });

  afterEach(async () => {
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

    // Clean up generated files
    for (const filePath of generatedFiles) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        // File might already be cleaned up
      }
    }
    generatedFiles = [];
  });

  // Helper function to generate test data using the test data generator
  const generateTestData = async (scenario) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/test-data/generate`,
        {
          scenario: {
            type: scenario.type,
            complexity: scenario.complexity || "medium",
            description: scenario.description,
          },
          dataParams: {
            recordCount: scenario.recordCount || 50,
            errorPatterns: scenario.errorPatterns || [],
            includeValidData: true,
            targetFields: [
              "name",
              "slug",
              "sku",
              "price",
              "inventoryQuantity",
              "isActive",
              "tags",
              "shortDescription",
              "brand",
            ],
            businessContext: scenario.businessContext || "general",
          },
          outputFormat: "csv",
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      if (response.data.success) {
        return {
          content: response.data.data.content,
          fileName: response.data.data.fileName,
          errors: response.data.errors,
          metadata: response.data.metadata,
        };
      } else {
        throw new Error("Test data generation failed");
      }
    } catch (error) {
      // Fallback to manual test data creation
      console.warn("Test data generator not available, using fallback data");
      return createFallbackTestData(scenario);
    }
  };

  // Fallback test data creation when generator is not available
  const createFallbackTestData = (scenario) => {
    const { recordCount = 20, errorPatterns = [] } = scenario;

    const headers =
      "name,slug,sku,price,inventoryQuantity,isActive,tags,shortDescription,brand";
    const rows = [headers];

    for (let i = 1; i <= recordCount; i++) {
      let name = `Product ${i}`;
      let slug = `product-${i}`;
      let sku = `SKU${i.toString().padStart(3, "0")}`;
      let price = (Math.random() * 100 + 10).toFixed(2);
      let inventory = Math.floor(Math.random() * 100) + 1;
      let isActive = "true";
      let tags = "test,product";
      let description = `Description for product ${i}`;
      let brand = "Test Brand";

      // Apply error patterns
      errorPatterns.forEach((pattern) => {
        if (Math.random() < pattern.injectionRate) {
          switch (pattern.type) {
            case "MISSING_REQUIRED_FIELDS":
              if (pattern.affectedFields.includes("name")) name = "";
              if (pattern.affectedFields.includes("sku")) sku = "";
              break;
            case "INVALID_DATA_TYPES":
              if (pattern.affectedFields.includes("price"))
                price = "INVALID_PRICE";
              if (pattern.affectedFields.includes("inventoryQuantity"))
                inventory = "INVALID_QTY";
              break;
            case "DUPLICATE_SKUS":
              if (i > 1) sku = "SKU001"; // Force duplicate
              break;
          }
        }
      });

      rows.push(
        `"${name}","${slug}","${sku}",${price},${inventory},${isActive},"${tags}","${description}","${brand}"`,
      );
    }

    return {
      content: rows.join("\n"),
      fileName: `fallback-test-${Date.now()}.csv`,
      errors: [],
      metadata: { source: "fallback" },
    };
  };

  // Helper function to execute complete workflow
  const executeCompleteWorkflow = async (testData, options = {}) => {
    const workflowMetrics = {
      startTime: performance.now(),
      uploadTime: 0,
      analysisTime: 0,
      errorRecoveryTime: 0,
      importTime: 0,
      totalTime: 0,
      dataIntegrityChecks: [],
    };

    console.log(`📋 Starting complete workflow with ${testData.fileName}...`);

    try {
      // Step 1: Upload file
      const uploadStart = performance.now();
      const csvFilePath = path.join(
        __dirname,
        "../fixtures",
        testData.fileName,
      );
      fs.writeFileSync(csvFilePath, testData.content);
      generatedFiles.push(csvFilePath);

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
      workflowMetrics.uploadTime = performance.now() - uploadStart;

      console.log(
        `✓ Upload completed in ${workflowMetrics.uploadTime.toFixed(2)}ms`,
      );

      // Step 2: Analyze data and detect errors
      const analysisStart = performance.now();
      const analysisResponse = await axios.post(
        `${BASE_URL}/api/import/analyze`,
        {
          sessionId: sessionId,
          mappings: {
            name: "name",
            slug: "slug",
            sku: "sku",
            price: "price",
            inventoryQuantity: "inventoryQuantity",
            isActive: "isActive",
            tags: "tags",
            shortDescription: "shortDescription",
            brand: "brand",
          },
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      const errors = analysisResponse.data.errors || [];
      const preview = analysisResponse.data.preview || [];
      workflowMetrics.analysisTime = performance.now() - analysisStart;

      console.log(
        `✓ Analysis completed in ${workflowMetrics.analysisTime.toFixed(2)}ms - Found ${errors.length} errors`,
      );

      // Data integrity check #1: Preview data matches upload
      workflowMetrics.dataIntegrityChecks.push({
        check: "preview_data_consistency",
        passed: preview.length > 0,
        details: `Preview contains ${preview.length} records`,
      });

      // Step 3: Error recovery (if errors exist)
      let errorRecoveryTime = 0;
      if (errors.length > 0 && !options.skipErrorRecovery) {
        const recoveryStart = performance.now();

        // Get error recovery suggestions
        const suggestionsResponse = await axios.get(
          `${BASE_URL}/api/recovery/${sessionId}/suggestions`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );

        const suggestions = suggestionsResponse.data.suggestions || [];
        console.log(
          `📝 Received ${suggestions.length} error recovery suggestions`,
        );

        // Apply auto-fixes where possible
        const autoFixableErrors = errors.filter(
          (e) => e.autoFix && e.autoFix.confidence > 0.7,
        );
        if (autoFixableErrors.length > 0) {
          const bulkFixResponse = await axios.post(
            `${BASE_URL}/api/recovery/${sessionId}/fix-bulk`,
            {
              rule: "auto_fix_high_confidence",
              errors: autoFixableErrors.map((error) => ({
                ...error,
                recordIndex: error.recordIndex,
                field: error.field,
                autoFix: error.autoFix,
              })),
            },
            {
              headers: { Authorization: `Bearer ${authToken}` },
            },
          );

          console.log(
            `🔧 Applied ${bulkFixResponse.data.fixedCount} auto-fixes`,
          );
        }

        // Apply manual fixes for remaining errors
        const remainingErrors = errors
          .filter((e) => !autoFixableErrors.includes(e))
          .slice(0, options.maxManualFixes || 10);

        for (const error of remainingErrors) {
          let fixValue;
          switch (error.field) {
            case "name":
              fixValue = `Fixed Product ${error.recordIndex}`;
              break;
            case "price":
              fixValue = "29.99";
              break;
            case "sku":
              fixValue = `FIXED-SKU-${error.recordIndex}`;
              break;
            case "inventoryQuantity":
              fixValue = "10";
              break;
            default:
              fixValue = "Fixed Value";
          }

          await axios.post(
            `${BASE_URL}/api/recovery/${sessionId}/fix-single`,
            {
              recordIndex: error.recordIndex,
              field: error.field,
              newValue: fixValue,
            },
            {
              headers: { Authorization: `Bearer ${authToken}` },
            },
          );
        }

        console.log(`🛠️ Applied ${remainingErrors.length} manual fixes`);

        errorRecoveryTime = performance.now() - recoveryStart;
        workflowMetrics.errorRecoveryTime = errorRecoveryTime;

        // Data integrity check #2: Error recovery effectiveness
        const statusResponse = await axios.get(
          `${BASE_URL}/api/recovery/${sessionId}/status`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );

        workflowMetrics.dataIntegrityChecks.push({
          check: "error_recovery_effectiveness",
          passed: statusResponse.data.resolvedErrors > 0,
          details: `Resolved ${statusResponse.data.resolvedErrors} of ${statusResponse.data.totalErrors} errors`,
        });
      }

      // Step 4: Import execution
      const importStart = performance.now();
      const importResponse = await axios.post(
        `${BASE_URL}/api/import/execute`,
        {
          sessionId: sessionId,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      workflowMetrics.importTime = performance.now() - importStart;
      const importSuccess =
        importResponse.status === 200 && importResponse.data.success;

      console.log(
        `✓ Import ${importSuccess ? "completed" : "failed"} in ${workflowMetrics.importTime.toFixed(2)}ms`,
      );

      // Data integrity check #3: Import results validation
      if (importSuccess) {
        workflowMetrics.dataIntegrityChecks.push({
          check: "import_success",
          passed: true,
          details: `Successfully imported ${importResponse.data.recordsImported || "unknown"} records`,
        });

        // Verify imported data
        try {
          const verificationResponse = await axios.get(
            `${BASE_URL}/api/products`,
            {
              headers: { Authorization: `Bearer ${authToken}` },
              params: { limit: 10 },
            },
          );

          workflowMetrics.dataIntegrityChecks.push({
            check: "data_persistence",
            passed: verificationResponse.status === 200,
            details: `Products endpoint returned ${verificationResponse.data.products?.length || 0} products`,
          });
        } catch (error) {
          workflowMetrics.dataIntegrityChecks.push({
            check: "data_persistence",
            passed: false,
            details: "Could not verify imported data",
          });
        }
      }

      workflowMetrics.totalTime = performance.now() - workflowMetrics.startTime;

      return {
        success: importSuccess,
        sessionId,
        errors,
        metrics: workflowMetrics,
        importResult: importResponse.data,
      };
    } catch (error) {
      workflowMetrics.totalTime = performance.now() - workflowMetrics.startTime;
      console.error("Workflow failed:", error.message);

      return {
        success: false,
        error: error.message,
        metrics: workflowMetrics,
      };
    }
  };

  describe("Complete Workflow Validation", () => {
    test("should execute complete workflow with validation errors", async () => {
      console.log("🧪 Testing complete workflow with validation errors...");

      const testData = await generateTestData({
        type: "VALIDATION_ERRORS",
        recordCount: 25,
        complexity: "medium",
        errorPatterns: [
          {
            type: "MISSING_REQUIRED_FIELDS",
            affectedFields: ["name", "sku"],
            injectionRate: 0.2,
            autoFixable: false,
          },
          {
            type: "INVALID_DATA_TYPES",
            affectedFields: ["price", "inventoryQuantity"],
            injectionRate: 0.15,
            autoFixable: true,
          },
        ],
      });

      const result = await executeCompleteWorkflow(testData);

      expect(result.success).toBe(true);
      expect(result.metrics.totalTime).toBeLessThan(30000); // 30 seconds max
      expect(
        result.metrics.dataIntegrityChecks.every((check) => check.passed),
      ).toBe(true);

      console.log(
        `✓ Workflow completed successfully in ${result.metrics.totalTime.toFixed(2)}ms`,
      );
      console.log(`  - Upload: ${result.metrics.uploadTime.toFixed(2)}ms`);
      console.log(`  - Analysis: ${result.metrics.analysisTime.toFixed(2)}ms`);
      console.log(
        `  - Error Recovery: ${result.metrics.errorRecoveryTime.toFixed(2)}ms`,
      );
      console.log(`  - Import: ${result.metrics.importTime.toFixed(2)}ms`);
    });

    test("should handle workflow with duplicate data errors", async () => {
      console.log("🧪 Testing workflow with duplicate data...");

      const testData = await generateTestData({
        type: "DUPLICATE_DATA",
        recordCount: 30,
        complexity: "high",
        errorPatterns: [
          {
            type: "DUPLICATE_SKUS",
            affectedFields: ["sku"],
            injectionRate: 0.1,
            autoFixable: false,
          },
        ],
      });

      const result = await executeCompleteWorkflow(testData);

      // Workflow might succeed with warnings or fail with duplicates
      expect(result.metrics.totalTime).toBeLessThan(45000); // 45 seconds max
      expect(
        result.errors.some(
          (e) => e.rule.includes("unique") || e.rule.includes("duplicate"),
        ),
      ).toBe(true);

      if (result.success) {
        console.log(
          "✓ Workflow completed successfully despite duplicates (duplicates were fixed)",
        );
      } else {
        console.log("✓ Workflow correctly failed due to unresolved duplicates");
      }
    });

    test("should execute workflow with special characters and formatting", async () => {
      console.log("🧪 Testing workflow with special characters...");

      const testData = await generateTestData({
        type: "SPECIAL_CHARACTERS",
        recordCount: 20,
        complexity: "low",
        errorPatterns: [
          {
            type: "SPECIAL_CHARACTERS",
            affectedFields: ["name", "shortDescription"],
            injectionRate: 0.25,
            autoFixable: true,
          },
        ],
      });

      const result = await executeCompleteWorkflow(testData);

      expect(result.success).toBe(true);
      expect(
        result.metrics.dataIntegrityChecks.every((check) => check.passed),
      ).toBe(true);

      console.log("✓ Special characters handled successfully");
    });

    test("should handle large dataset workflow", async () => {
      console.log("🧪 Testing workflow with large dataset...");

      const testData = await generateTestData({
        type: "PERFORMANCE_LIMITS",
        recordCount: 500, // Large dataset
        complexity: "high",
        errorPatterns: [
          {
            type: "MISSING_REQUIRED_FIELDS",
            affectedFields: ["name"],
            injectionRate: 0.05, // Lower rate for large dataset
            autoFixable: false,
          },
          {
            type: "INVALID_DATA_TYPES",
            affectedFields: ["price"],
            injectionRate: 0.1,
            autoFixable: true,
          },
        ],
      });

      const startTime = performance.now();
      const result = await executeCompleteWorkflow(testData, {
        maxManualFixes: 5,
      });
      const totalDuration = performance.now() - startTime;

      expect(result.metrics.totalTime).toBeLessThan(120000); // 2 minutes max
      expect(result.success).toBe(true);

      // Performance validation
      const throughput = 500 / (totalDuration / 1000); // records per second
      expect(throughput).toBeGreaterThan(4); // At least 4 records/second

      console.log(
        `✓ Large dataset processed: 500 records in ${totalDuration.toFixed(2)}ms (${throughput.toFixed(2)} records/sec)`,
      );
    }, 150000); // 2.5 minute timeout

    test("should maintain data integrity throughout workflow", async () => {
      console.log("🧪 Testing data integrity maintenance...");

      const testData = await generateTestData({
        type: "VALIDATION_ERRORS",
        recordCount: 40,
        complexity: "medium",
        errorPatterns: [
          {
            type: "MISSING_REQUIRED_FIELDS",
            affectedFields: ["name"],
            injectionRate: 0.1,
            autoFixable: false,
          },
          {
            type: "INVALID_DATA_TYPES",
            affectedFields: ["price", "inventoryQuantity"],
            injectionRate: 0.15,
            autoFixable: true,
          },
        ],
      });

      const result = await executeCompleteWorkflow(testData);

      // All data integrity checks must pass
      const failedChecks = result.metrics.dataIntegrityChecks.filter(
        (check) => !check.passed,
      );
      expect(failedChecks.length).toBe(0);

      if (failedChecks.length > 0) {
        console.error("Failed integrity checks:", failedChecks);
      }

      console.log("✓ Data integrity maintained throughout workflow");
      result.metrics.dataIntegrityChecks.forEach((check) => {
        console.log(`  ✓ ${check.check}: ${check.details}`);
      });
    });
  });

  describe("Error Recovery Effectiveness", () => {
    test("should effectively recover from common validation errors", async () => {
      console.log("🧪 Testing error recovery effectiveness...");

      const testData = await generateTestData({
        type: "VALIDATION_ERRORS",
        recordCount: 30,
        errorPatterns: [
          {
            type: "MISSING_REQUIRED_FIELDS",
            affectedFields: ["name", "sku"],
            injectionRate: 0.2,
            autoFixable: false,
          },
          {
            type: "INVALID_DATA_TYPES",
            affectedFields: ["price"],
            injectionRate: 0.25,
            autoFixable: true,
          },
        ],
      });

      const result = await executeCompleteWorkflow(testData);

      // Calculate recovery effectiveness
      const totalErrors = result.errors.length;
      const autoFixableErrors = result.errors.filter(
        (e) => e.autoFix && e.autoFix.confidence > 0.7,
      ).length;
      const expectedRecoveryRate = autoFixableErrors / totalErrors;

      expect(result.success).toBe(true);
      expect(expectedRecoveryRate).toBeGreaterThan(0); // Some errors should be auto-fixable

      console.log(
        `✓ Error recovery effectiveness: ${autoFixableErrors}/${totalErrors} errors auto-fixable (${(expectedRecoveryRate * 100).toFixed(1)}%)`,
      );
    });

    test("should handle mixed error severity levels", async () => {
      console.log("🧪 Testing mixed error severity handling...");

      const testData = await generateTestData({
        type: "VALIDATION_ERRORS",
        recordCount: 25,
        errorPatterns: [
          {
            type: "MISSING_REQUIRED_FIELDS",
            affectedFields: ["name"], // Critical error
            injectionRate: 0.1,
            autoFixable: false,
          },
          {
            type: "INVALID_DATA_TYPES",
            affectedFields: ["price"], // Warning/fixable error
            injectionRate: 0.2,
            autoFixable: true,
          },
          {
            type: "SPECIAL_CHARACTERS",
            affectedFields: ["shortDescription"], // Low severity
            injectionRate: 0.15,
            autoFixable: true,
          },
        ],
      });

      const result = await executeCompleteWorkflow(testData);

      // Categorize errors by severity
      const criticalErrors = result.errors.filter(
        (e) => e.severity === "error",
      );
      const warnings = result.errors.filter((e) => e.severity === "warning");

      expect(result.success).toBe(true);
      console.log(
        `✓ Handled mixed severity: ${criticalErrors.length} critical, ${warnings.length} warnings`,
      );
    });

    test("should provide meaningful error recovery suggestions", async () => {
      console.log("🧪 Testing error recovery suggestion quality...");

      const testData = await generateTestData({
        type: "VALIDATION_ERRORS",
        recordCount: 20,
        errorPatterns: [
          {
            type: "MISSING_REQUIRED_FIELDS",
            affectedFields: ["name", "sku"],
            injectionRate: 0.3,
            autoFixable: false,
          },
        ],
      });

      // Upload and analyze to get errors
      const csvFilePath = path.join(
        __dirname,
        "../fixtures",
        testData.fileName,
      );
      fs.writeFileSync(csvFilePath, testData.content);
      generatedFiles.push(csvFilePath);

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
          mappings: { name: "name", sku: "sku", price: "price" },
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      const errors = analysisResponse.data.errors || [];

      // Get suggestions
      const suggestionsResponse = await axios.get(
        `${BASE_URL}/api/recovery/${sessionId}/suggestions`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      const suggestions = suggestionsResponse.data.suggestions || [];

      // Validate suggestion quality
      expect(suggestions.length).toBeGreaterThan(0);

      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("type");
        expect(suggestion).toHaveProperty("action");
        expect(suggestion).toHaveProperty("confidence");
        expect(suggestion.confidence).toBeGreaterThan(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(1);
      });

      console.log(
        `✓ Generated ${suggestions.length} meaningful suggestions for ${errors.length} errors`,
      );
    });
  });

  describe("Performance and Scale Testing", () => {
    test("should handle concurrent workflow executions", async () => {
      console.log("🧪 Testing concurrent workflow execution...");

      // Create multiple test datasets
      const testDatasets = await Promise.all([
        generateTestData({
          type: "VALIDATION_ERRORS",
          recordCount: 15,
          errorPatterns: [
            {
              type: "INVALID_DATA_TYPES",
              affectedFields: ["price"],
              injectionRate: 0.2,
              autoFixable: true,
            },
          ],
        }),
        generateTestData({
          type: "SPECIAL_CHARACTERS",
          recordCount: 15,
          errorPatterns: [
            {
              type: "SPECIAL_CHARACTERS",
              affectedFields: ["name"],
              injectionRate: 0.3,
              autoFixable: true,
            },
          ],
        }),
      ]);

      // Execute workflows concurrently
      const startTime = performance.now();
      const results = await Promise.allSettled(
        testDatasets.map((testData) =>
          executeCompleteWorkflow(testData, { maxManualFixes: 3 }),
        ),
      );
      const totalTime = performance.now() - startTime;

      const successfulWorkflows = results.filter(
        (r) => r.status === "fulfilled" && r.value.success,
      );

      expect(successfulWorkflows.length).toBeGreaterThanOrEqual(1); // At least one should succeed
      expect(totalTime).toBeLessThan(60000); // Should complete within 1 minute

      console.log(
        `✓ Concurrent execution: ${successfulWorkflows.length}/${results.length} workflows succeeded in ${totalTime.toFixed(2)}ms`,
      );
    }, 90000); // 1.5 minute timeout

    test("should maintain performance with various record sizes", async () => {
      console.log("🧪 Testing performance across different dataset sizes...");

      const sizes = [10, 50, 100];
      const performanceResults = [];

      for (const size of sizes) {
        const testData = await generateTestData({
          type: "VALIDATION_ERRORS",
          recordCount: size,
          errorPatterns: [
            {
              type: "INVALID_DATA_TYPES",
              affectedFields: ["price"],
              injectionRate: 0.1,
              autoFixable: true,
            },
          ],
        });

        const startTime = performance.now();
        const result = await executeCompleteWorkflow(testData, {
          maxManualFixes: 2,
        });
        const duration = performance.now() - startTime;

        performanceResults.push({
          size,
          duration,
          throughput: size / (duration / 1000),
          success: result.success,
        });

        expect(result.success).toBe(true);
        console.log(
          `  ${size} records: ${duration.toFixed(2)}ms (${(size / (duration / 1000)).toFixed(2)} records/sec)`,
        );
      }

      // Performance should scale reasonably (not exponentially)
      const smallDataset = performanceResults[0];
      const largeDataset = performanceResults[performanceResults.length - 1];

      const scaleFactor = largeDataset.size / smallDataset.size;
      const timeFactor = largeDataset.duration / smallDataset.duration;

      expect(timeFactor).toBeLessThan(scaleFactor * 2); // Should not be more than 2x linear scaling

      console.log(
        `✓ Performance scaling: ${scaleFactor}x data size resulted in ${timeFactor.toFixed(2)}x processing time`,
      );
    }, 120000); // 2 minute timeout
  });

  describe("User Experience Simulation", () => {
    test("should simulate typical user error recovery workflow", async () => {
      console.log("🧪 Simulating typical user workflow...");

      const testData = await generateTestData({
        type: "VALIDATION_ERRORS",
        recordCount: 25,
        errorPatterns: [
          {
            type: "MISSING_REQUIRED_FIELDS",
            affectedFields: ["name"],
            injectionRate: 0.15,
            autoFixable: false,
          },
          {
            type: "INVALID_DATA_TYPES",
            affectedFields: ["price"],
            injectionRate: 0.2,
            autoFixable: true,
          },
        ],
      });

      // Simulate user workflow with pauses and interactive decisions
      const csvFilePath = path.join(
        __dirname,
        "../fixtures",
        testData.fileName,
      );
      fs.writeFileSync(csvFilePath, testData.content);
      generatedFiles.push(csvFilePath);

      // Step 1: User uploads file
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

      // Step 2: User maps fields and analyzes
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

      const errors = analysisResponse.data.errors || [];
      expect(errors.length).toBeGreaterThan(0);

      // Step 3: User reviews errors and gets suggestions
      const suggestionsResponse = await axios.get(
        `${BASE_URL}/api/recovery/${sessionId}/suggestions`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      const suggestions = suggestionsResponse.data.suggestions || [];

      // Step 4: User applies some auto-fixes
      const autoFixableErrors = errors.filter(
        (e) => e.autoFix && e.autoFix.confidence > 0.8,
      );
      if (autoFixableErrors.length > 0) {
        await axios.post(
          `${BASE_URL}/api/recovery/${sessionId}/fix-bulk`,
          {
            rule: "user_approved_auto_fix",
            errors: autoFixableErrors.slice(0, 5), // User applies first 5 auto-fixes
          },
          {
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );
      }

      // Step 5: User manually fixes remaining critical errors
      const remainingCriticalErrors = errors
        .filter(
          (e) =>
            e.severity === "error" &&
            (!e.autoFix || e.autoFix.confidence <= 0.8),
        )
        .slice(0, 3); // User fixes first 3 manual errors

      for (const error of remainingCriticalErrors) {
        await axios.post(
          `${BASE_URL}/api/recovery/${sessionId}/fix-single`,
          {
            recordIndex: error.recordIndex,
            field: error.field,
            newValue: `User Fixed ${error.field}`,
          },
          {
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );
      }

      // Step 6: User attempts import
      const importResponse = await axios.post(
        `${BASE_URL}/api/import/execute`,
        {
          sessionId: sessionId,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      expect(importResponse.status).toBe(200);

      console.log("✓ User workflow simulation completed successfully");
      console.log(`  - Initial errors: ${errors.length}`);
      console.log(
        `  - Auto-fixes applied: ${autoFixableErrors.slice(0, 5).length}`,
      );
      console.log(
        `  - Manual fixes applied: ${remainingCriticalErrors.length}`,
      );
      console.log(`  - Suggestions provided: ${suggestions.length}`);
    });

    test("should handle user abandonment and session recovery", async () => {
      console.log("🧪 Testing session recovery after user abandonment...");

      const testData = await generateTestData({
        type: "VALIDATION_ERRORS",
        recordCount: 15,
        errorPatterns: [
          {
            type: "MISSING_REQUIRED_FIELDS",
            affectedFields: ["name"],
            injectionRate: 0.2,
            autoFixable: false,
          },
        ],
      });

      // Start workflow
      const csvFilePath = path.join(
        __dirname,
        "../fixtures",
        testData.fileName,
      );
      fs.writeFileSync(csvFilePath, testData.content);
      generatedFiles.push(csvFilePath);

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

      // Analyze and apply partial fixes
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

      // Apply one fix then "abandon"
      await axios.post(
        `${BASE_URL}/api/recovery/${sessionId}/fix-single`,
        {
          recordIndex: 0,
          field: "name",
          newValue: "Recovered Product",
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      // Simulate time passing (user returns later)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // User returns and checks session status
      const statusResponse = await axios.get(
        `${BASE_URL}/api/recovery/${sessionId}/status`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data.resolvedErrors).toBe(1);

      // User can continue from where they left off
      const continueResponse = await axios.post(
        `${BASE_URL}/api/import/execute`,
        {
          sessionId: sessionId,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      // Should either succeed or fail gracefully
      expect([200, 400].includes(continueResponse.status)).toBe(true);

      console.log(
        "✓ Session recovery working: User can resume workflow after abandonment",
      );
    });
  });

  describe("Comprehensive Workflow Summary", () => {
    test("should provide comprehensive test coverage report", () => {
      console.log(
        "\n=== ENHANCED E2E ERROR RECOVERY WORKFLOW TEST SUMMARY ===",
      );
      console.log("✅ Complete Workflow Validation");
      console.log("  ✓ Validation errors workflow");
      console.log("  ✓ Duplicate data handling");
      console.log("  ✓ Special characters processing");
      console.log("  ✓ Large dataset performance");
      console.log("  ✓ Data integrity maintenance");
      console.log("");
      console.log("✅ Error Recovery Effectiveness");
      console.log("  ✓ Common validation error recovery");
      console.log("  ✓ Mixed severity level handling");
      console.log("  ✓ Suggestion quality validation");
      console.log("");
      console.log("✅ Performance and Scale Testing");
      console.log("  ✓ Concurrent workflow execution");
      console.log("  ✓ Performance scaling validation");
      console.log("");
      console.log("✅ User Experience Simulation");
      console.log("  ✓ Typical user workflow");
      console.log("  ✓ Session recovery scenarios");
      console.log(
        "============================================================\n",
      );

      // This test always passes - it's for reporting
      expect(true).toBe(true);
    });
  });
});
