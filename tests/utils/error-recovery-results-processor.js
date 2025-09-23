/**
 * Error Recovery Test Results Processor
 * Processes and enhances test results for error recovery test suite
 */

const fs = require("fs");
const path = require("path");

class ErrorRecoveryResultsProcessor {
  /**
   * Process test results and generate enhanced reporting
   * @param {Object} results - Jest test results object
   * @returns {Object} Processed results
   */
  process(results) {
    try {
      const processedResults = {
        ...results,
        errorRecoveryMetrics: this.calculateErrorRecoveryMetrics(results),
        performanceMetrics: this.calculatePerformanceMetrics(results),
        coverageAnalysis: this.analyzeCoverage(results),
        testCategoryBreakdown: this.categorizeTests(results),
        recommendations: this.generateRecommendations(results),
        timestamp: new Date().toISOString(),
      };

      // Save enhanced results to file
      this.saveResults(processedResults);

      // Generate summary report
      this.generateSummaryReport(processedResults);

      return processedResults;
    } catch (error) {
      console.error("Error processing test results:", error);
      return results; // Return original results if processing fails
    }
  }

  /**
   * Calculate error recovery specific metrics
   * @param {Object} results - Jest test results
   * @returns {Object} Error recovery metrics
   */
  calculateErrorRecoveryMetrics(results) {
    const metrics = {
      totalErrorRecoveryTests: 0,
      passedErrorRecoveryTests: 0,
      failedErrorRecoveryTests: 0,
      errorRecoveryPassRate: 0,
      averageErrorRecoveryTime: 0,
      errorRecoveryCoverage: {
        validation: 0,
        processing: 0,
        communication: 0,
        persistence: 0,
      },
    };

    let totalTime = 0;
    let testCount = 0;

    results.testResults.forEach((testResult) => {
      if (testResult.testFilePath.includes("error-recovery")) {
        metrics.totalErrorRecoveryTests++;

        if (testResult.numFailingTests === 0) {
          metrics.passedErrorRecoveryTests++;
        } else {
          metrics.failedErrorRecoveryTests++;
        }

        // Calculate average test time
        if (testResult.perfStats && testResult.perfStats.runtime) {
          totalTime += testResult.perfStats.runtime;
          testCount++;
        }

        // Categorize coverage by error recovery area
        this.categorizeCoverageByArea(
          testResult,
          metrics.errorRecoveryCoverage,
        );
      }
    });

    metrics.errorRecoveryPassRate =
      metrics.totalErrorRecoveryTests > 0
        ? (metrics.passedErrorRecoveryTests / metrics.totalErrorRecoveryTests) *
          100
        : 0;

    metrics.averageErrorRecoveryTime =
      testCount > 0 ? totalTime / testCount : 0;

    return metrics;
  }

  /**
   * Calculate performance metrics for error recovery tests
   * @param {Object} results - Jest test results
   * @returns {Object} Performance metrics
   */
  calculatePerformanceMetrics(results) {
    const performanceTests = results.testResults.filter(
      (test) =>
        test.testFilePath.includes("performance") &&
        test.testFilePath.includes("error-recovery"),
    );

    const metrics = {
      totalPerformanceTests: performanceTests.length,
      performanceTestResults: [],
      performanceBenchmarks: {
        throughput: { target: 100, actual: 0, status: "unknown" },
        latency: { target: 500, actual: 0, status: "unknown" },
        memoryUsage: { target: 512, actual: 0, status: "unknown" },
        errorRate: { target: 1, actual: 0, status: "unknown" },
      },
    };

    performanceTests.forEach((test) => {
      // Extract performance data from test output
      const performanceData = this.extractPerformanceData(test);
      metrics.performanceTestResults.push(performanceData);

      // Update benchmarks with actual results
      this.updatePerformanceBenchmarks(
        performanceData,
        metrics.performanceBenchmarks,
      );
    });

    return metrics;
  }

  /**
   * Analyze test coverage for error recovery components
   * @param {Object} results - Jest test results
   * @returns {Object} Coverage analysis
   */
  analyzeCoverage(results) {
    const coverage = {
      overall: {
        lines: 0,
        branches: 0,
        functions: 0,
        statements: 0,
      },
      byComponent: {},
      criticalPaths: [],
      gaps: [],
    };

    if (results.coverageMap) {
      // Analyze overall coverage
      const coverageData = results.coverageMap.getCoverageSummary();
      coverage.overall = {
        lines: coverageData.lines.pct,
        branches: coverageData.branches.pct,
        functions: coverageData.functions.pct,
        statements: coverageData.statements.pct,
      };

      // Analyze coverage by component
      const files = results.coverageMap.files();
      files.forEach((file) => {
        if (this.isErrorRecoveryFile(file)) {
          const fileCoverage = results.coverageMap.fileCoverageFor(file);
          coverage.byComponent[this.getComponentName(file)] = {
            lines: fileCoverage.getLineCoverage(),
            branches: fileCoverage.getBranchCoverage(),
            functions: fileCoverage.getFunctionCoverage(),
          };
        }
      });

      // Identify critical paths and gaps
      coverage.criticalPaths = this.identifyCriticalPaths(results.coverageMap);
      coverage.gaps = this.identifyCoverageGaps(results.coverageMap);
    }

    return coverage;
  }

  /**
   * Categorize tests by type and functionality
   * @param {Object} results - Jest test results
   * @returns {Object} Test category breakdown
   */
  categorizeTests(results) {
    const categories = {
      unit: { total: 0, passed: 0, failed: 0, duration: 0 },
      integration: { total: 0, passed: 0, failed: 0, duration: 0 },
      api: { total: 0, passed: 0, failed: 0, duration: 0 },
      e2e: { total: 0, passed: 0, failed: 0, duration: 0 },
      performance: { total: 0, passed: 0, failed: 0, duration: 0 },
      reporting: { total: 0, passed: 0, failed: 0, duration: 0 },
    };

    results.testResults.forEach((test) => {
      if (test.testFilePath.includes("error-recovery")) {
        const category = this.getTestCategory(test.testFilePath);
        if (categories[category]) {
          categories[category].total++;
          categories[category].duration += test.perfStats?.runtime || 0;

          if (test.numFailingTests === 0) {
            categories[category].passed++;
          } else {
            categories[category].failed++;
          }
        }
      }
    });

    return categories;
  }

  /**
   * Generate recommendations based on test results
   * @param {Object} processedResults - Processed test results
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(processedResults) {
    const recommendations = [];

    // Coverage recommendations
    if (processedResults.coverageAnalysis.overall.lines < 85) {
      recommendations.push({
        type: "coverage",
        priority: "high",
        message: `Line coverage is ${processedResults.coverageAnalysis.overall.lines}%. Target is 85%+.`,
        action: "Add more unit tests for uncovered code paths",
      });
    }

    // Performance recommendations
    const perfMetrics =
      processedResults.performanceMetrics.performanceBenchmarks;
    if (perfMetrics.latency.actual > perfMetrics.latency.target) {
      recommendations.push({
        type: "performance",
        priority: "medium",
        message: `Average latency ${perfMetrics.latency.actual}ms exceeds target ${perfMetrics.latency.target}ms`,
        action: "Optimize error recovery processing algorithms",
      });
    }

    // Error recovery specific recommendations
    const errorMetrics = processedResults.errorRecoveryMetrics;
    if (errorMetrics.errorRecoveryPassRate < 95) {
      recommendations.push({
        type: "reliability",
        priority: "high",
        message: `Error recovery pass rate is ${errorMetrics.errorRecoveryPassRate}%. Target is 95%+.`,
        action: "Investigate and fix failing error recovery scenarios",
      });
    }

    // Test category recommendations
    const categories = processedResults.testCategoryBreakdown;
    Object.entries(categories).forEach(([category, stats]) => {
      if (stats.total === 0) {
        recommendations.push({
          type: "testing",
          priority: "medium",
          message: `No ${category} tests found for error recovery`,
          action: `Add ${category} tests to improve coverage`,
        });
      }
    });

    return recommendations;
  }

  /**
   * Save processed results to file
   * @param {Object} results - Processed results
   */
  saveResults(results) {
    try {
      const outputDir = path.join(process.cwd(), "coverage", "error-recovery");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputFile = path.join(outputDir, "error-recovery-results.json");
      fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

      console.log(`✅ Error recovery test results saved to: ${outputFile}`);
    } catch (error) {
      console.error("❌ Failed to save test results:", error.message);
    }
  }

  /**
   * Generate human-readable summary report
   * @param {Object} results - Processed results
   */
  generateSummaryReport(results) {
    try {
      const summary = this.createSummaryReport(results);

      const outputDir = path.join(process.cwd(), "coverage", "error-recovery");
      const summaryFile = path.join(outputDir, "error-recovery-summary.md");

      fs.writeFileSync(summaryFile, summary);
      console.log(`📊 Error recovery summary report generated: ${summaryFile}`);
    } catch (error) {
      console.error("❌ Failed to generate summary report:", error.message);
    }
  }

  /**
   * Create markdown summary report
   * @param {Object} results - Processed results
   * @returns {string} Markdown report
   */
  createSummaryReport(results) {
    const {
      errorRecoveryMetrics,
      performanceMetrics,
      coverageAnalysis,
      testCategoryBreakdown,
      recommendations,
    } = results;

    return `# Error Recovery Test Suite Summary

**Generated**: ${results.timestamp}
**Total Tests**: ${results.numTotalTests}
**Passed Tests**: ${results.numPassedTests}
**Failed Tests**: ${results.numFailedTests}
**Overall Pass Rate**: ${((results.numPassedTests / results.numTotalTests) * 100).toFixed(2)}%

## Error Recovery Metrics

- **Total Error Recovery Tests**: ${errorRecoveryMetrics.totalErrorRecoveryTests}
- **Pass Rate**: ${errorRecoveryMetrics.errorRecoveryPassRate.toFixed(2)}%
- **Average Test Time**: ${errorRecoveryMetrics.averageErrorRecoveryTime.toFixed(2)}ms

## Performance Metrics

${Object.entries(performanceMetrics.performanceBenchmarks)
  .map(
    ([metric, data]) =>
      `- **${metric}**: ${data.actual} (Target: ${data.target}) - ${data.status}`,
  )
  .join("\n")}

## Coverage Analysis

- **Lines**: ${coverageAnalysis.overall.lines.toFixed(2)}%
- **Branches**: ${coverageAnalysis.overall.branches.toFixed(2)}%
- **Functions**: ${coverageAnalysis.overall.functions.toFixed(2)}%
- **Statements**: ${coverageAnalysis.overall.statements.toFixed(2)}%

## Test Category Breakdown

${Object.entries(testCategoryBreakdown)
  .map(
    ([category, stats]) =>
      `### ${category.toUpperCase()}
- Total: ${stats.total}
- Passed: ${stats.passed}
- Failed: ${stats.failed}
- Duration: ${stats.duration}ms`,
  )
  .join("\n\n")}

## Recommendations

${recommendations
  .map(
    (rec, index) =>
      `### ${index + 1}. ${rec.type.toUpperCase()} (${rec.priority} priority)
**Issue**: ${rec.message}
**Action**: ${rec.action}`,
  )
  .join("\n\n")}

---
*Generated by Error Recovery Test Results Processor*`;
  }

  // Helper methods
  getTestCategory(filePath) {
    if (filePath.includes("/unit/")) return "unit";
    if (filePath.includes("/performance/")) return "performance";
    if (filePath.includes("test-reporter")) return "reporting";
    if (filePath.includes("api")) return "api";
    if (filePath.includes("e2e")) return "e2e";
    return "integration";
  }

  isErrorRecoveryFile(filePath) {
    return (
      filePath.includes("error-recovery") ||
      filePath.includes("import-service") ||
      filePath.includes("file-processor")
    );
  }

  getComponentName(filePath) {
    return path.basename(filePath, path.extname(filePath));
  }

  categorizeCoverageByArea(testResult, coverageAreas) {
    // This would analyze test output to categorize coverage
    // Implementation depends on specific test structure
  }

  extractPerformanceData(test) {
    // Extract performance data from test console output
    // This would parse performance metrics from test results
    return {
      testName: path.basename(test.testFilePath),
      runtime: test.perfStats?.runtime || 0,
      throughput: 0, // Would be extracted from test output
      latency: 0, // Would be extracted from test output
      memoryUsage: 0, // Would be extracted from test output
      errorRate: 0, // Would be extracted from test output
    };
  }

  updatePerformanceBenchmarks(performanceData, benchmarks) {
    // Update benchmarks with actual performance data
    // Implementation would compare actual vs target values
  }

  identifyCriticalPaths(coverageMap) {
    // Identify critical code paths that need coverage
    return [];
  }

  identifyCoverageGaps(coverageMap) {
    // Identify gaps in test coverage
    return [];
  }
}

// Export as a function that Jest can use
module.exports = (results) => {
  const processor = new ErrorRecoveryResultsProcessor();
  return processor.process(results);
};
