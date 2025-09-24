/**
 * Error Recovery Test Sequencer
 * Optimizes test execution order for error recovery test suite
 */

const Sequencer = require("@jest/test-sequencer").default;

class ErrorRecoveryTestSequencer extends Sequencer {
  /**
   * Sort tests to optimize execution order for error recovery testing
   * @param {Array} tests - Array of test objects
   * @returns {Array} Sorted array of tests
   */
  sort(tests) {
    // Define test execution priority order
    const testPriority = {
      // Unit tests first - fastest and most fundamental
      unit: 1,
      // Integration tests second - build on unit tests
      integration: 2,
      // API tests third - test external interfaces
      api: 3,
      // E2E tests fourth - comprehensive workflows
      e2e: 4,
      // Performance tests last - most resource intensive
      performance: 5,
      // Test reporter last - analyzes all previous results
      "test-reporter": 6,
    };

    // Special ordering within categories
    const testNamePriority = {
      // Core error recovery tests first
      "error-recovery-integration": 1,
      "error-recovery-api": 2,
      "error-recovery-e2e": 3,
      "error-recovery-performance": 4,
      "error-recovery-test-reporter": 5,

      // Enhanced versions after basic versions
      "error-recovery-api-enhanced": 6,
      "error-recovery-e2e-enhanced": 7,
      "error-recovery-performance-enhanced": 8,
    };

    return tests.sort((testA, testB) => {
      // Extract test category from path
      const getCategoryFromPath = (path) => {
        if (path.includes("/unit/")) return "unit";
        if (path.includes("/integration/") && path.includes("api"))
          return "api";
        if (path.includes("/integration/") && path.includes("e2e"))
          return "e2e";
        if (path.includes("/integration/") && path.includes("test-reporter"))
          return "test-reporter";
        if (path.includes("/integration/")) return "integration";
        if (path.includes("/performance/")) return "performance";
        return "integration"; // default
      };

      // Extract test name from path
      const getTestNameFromPath = (path) => {
        const fileName = path.split("/").pop().replace(".test.js", "");
        return fileName;
      };

      const categoryA = getCategoryFromPath(testA.path);
      const categoryB = getCategoryFromPath(testB.path);

      const priorityA = testPriority[categoryA] || 999;
      const priorityB = testPriority[categoryB] || 999;

      // First sort by category priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Within same category, sort by test name priority
      const nameA = getTestNameFromPath(testA.path);
      const nameB = getTestNameFromPath(testB.path);

      const namePriorityA = testNamePriority[nameA] || 50;
      const namePriorityB = testNamePriority[nameB] || 50;

      if (namePriorityA !== namePriorityB) {
        return namePriorityA - namePriorityB;
      }

      // Finally, sort alphabetically for consistent ordering
      return testA.path.localeCompare(testB.path);
    });
  }

  /**
   * Custom logic for test scheduling
   * @param {Array} tests - Sorted array of tests
   * @returns {Array} Tests with scheduling metadata
   */
  shard(tests) {
    // Add metadata for test execution optimization
    return tests.map((test, index) => ({
      ...test,
      metadata: {
        executionOrder: index + 1,
        category: this.getTestCategory(test.path),
        estimatedDuration: this.estimateTestDuration(test.path),
        dependencies: this.getTestDependencies(test.path),
      },
    }));
  }

  /**
   * Determine test category from path
   * @param {string} path - Test file path
   * @returns {string} Test category
   */
  getTestCategory(path) {
    if (path.includes("/unit/")) return "unit";
    if (path.includes("/performance/")) return "performance";
    if (path.includes("test-reporter")) return "reporting";
    if (path.includes("api")) return "api";
    if (path.includes("e2e")) return "e2e";
    return "integration";
  }

  /**
   * Estimate test duration based on test type
   * @param {string} path - Test file path
   * @returns {number} Estimated duration in seconds
   */
  estimateTestDuration(path) {
    const durations = {
      unit: 5, // 5 seconds
      integration: 15, // 15 seconds
      api: 20, // 20 seconds
      e2e: 45, // 45 seconds
      performance: 90, // 90 seconds
      reporting: 10, // 10 seconds
    };

    const category = this.getTestCategory(path);
    return durations[category] || 30;
  }

  /**
   * Identify test dependencies
   * @param {string} path - Test file path
   * @returns {Array} Array of dependency categories
   */
  getTestDependencies(path) {
    const dependencies = {
      "error-recovery-api-enhanced": ["unit", "integration"],
      "error-recovery-e2e-enhanced": ["unit", "integration", "api"],
      "error-recovery-performance-enhanced": ["unit", "integration"],
      "error-recovery-test-reporter": [
        "unit",
        "integration",
        "api",
        "e2e",
        "performance",
      ],
    };

    const testName = path.split("/").pop().replace(".test.js", "");
    return dependencies[testName] || [];
  }
}

module.exports = ErrorRecoveryTestSequencer;