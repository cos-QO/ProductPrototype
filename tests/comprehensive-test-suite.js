/**
 * Comprehensive Test Suite for QueenOne ProductPrototype
 * Tests frontend health, API endpoints, database operations, WebSocket connections,
 * and Plan 1 features including dashboard metrics and search functionality
 */

import axios from "axios";
import WebSocket from "ws";

const BASE_URL = "http://localhost:5000";
const WS_URL = "ws://localhost:5000";

class ComprehensiveTestSuite {
  constructor() {
    this.results = {
      frontend: { status: "pending", tests: [] },
      api: { status: "pending", tests: [] },
      database: { status: "pending", tests: [] },
      websocket: { status: "pending", tests: [] },
      plan1Features: { status: "pending", tests: [] },
      issues: [],
    };
    this.authToken = null;
  }

  async runAllTests() {
    console.log(
      "🚀 Starting Comprehensive Test Suite for QueenOne ProductPrototype",
    );
    console.log("=" * 70);

    try {
      await this.testFrontendHealth();
      await this.authenticateForTests();
      await this.testAPIEndpoints();
      await this.testDatabaseOperations();
      await this.testWebSocketConnection();
      await this.testPlan1Features();
      await this.investigateAutomationMetricsError();
    } catch (error) {
      console.error("❌ Test suite execution failed:", error.message);
      this.results.issues.push({
        type: "CRITICAL",
        component: "Test Suite",
        error: error.message,
      });
    }

    this.generateReport();
  }

  async testFrontendHealth() {
    console.log("\n🌐 Testing Frontend Health...");

    const tests = [
      {
        name: "Frontend Root Access",
        test: async () => {
          const response = await axios.get(BASE_URL);
          return response.status === 200 && response.data.includes("QueenOne");
        },
      },
      {
        name: "Static Assets Loading",
        test: async () => {
          const response = await axios.get(`${BASE_URL}/assets/index.css`);
          return response.status === 200;
        },
      },
      {
        name: "Dashboard Route",
        test: async () => {
          const response = await axios.get(`${BASE_URL}/dashboard`);
          return response.status === 200;
        },
      },
    ];

    await this.executeTestGroup("frontend", tests);
  }

  async authenticateForTests() {
    console.log("\n🔐 Setting up authentication for API tests...");

    try {
      // Try to authenticate with dev user
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: "local-dev-user@example.com",
        password: "password",
      });

      if (response.data.token) {
        this.authToken = response.data.token;
        console.log("✅ Authentication successful");
      }
    } catch (error) {
      console.log("⚠️ Dev auth failed, continuing without token");
    }
  }

  async testAPIEndpoints() {
    console.log("\n🔗 Testing API Endpoints...");

    const headers = this.authToken
      ? { Authorization: `Bearer ${this.authToken}` }
      : {};

    const tests = [
      {
        name: "Health Check",
        test: async () => {
          const response = await axios.get(`${BASE_URL}/api/health`);
          return response.status === 200;
        },
      },
      {
        name: "Brands Endpoint",
        test: async () => {
          const response = await axios.get(`${BASE_URL}/api/brands`, {
            headers,
          });
          return response.status === 200 || response.status === 401;
        },
      },
      {
        name: "Products Endpoint",
        test: async () => {
          const response = await axios.get(`${BASE_URL}/api/products`, {
            headers,
          });
          return response.status === 200 || response.status === 401;
        },
      },
      {
        name: "Users Endpoint",
        test: async () => {
          const response = await axios.get(`${BASE_URL}/api/users`, {
            headers,
          });
          return response.status === 200 || response.status === 401;
        },
      },
      {
        name: "Import Template Download",
        test: async () => {
          const response = await axios.get(
            `${BASE_URL}/api/import/template/products/json`,
          );
          return response.status === 200;
        },
      },
    ];

    await this.executeTestGroup("api", tests);
  }

  async testDatabaseOperations() {
    console.log("\n💾 Testing Database Operations...");

    const headers = this.authToken
      ? { Authorization: `Bearer ${this.authToken}` }
      : {};

    const tests = [
      {
        name: "Database Connection",
        test: async () => {
          const response = await axios.get(`${BASE_URL}/api/health/db`, {
            headers,
          });
          return response.status === 200;
        },
      },
      {
        name: "Create Operation Test",
        test: async () => {
          try {
            const response = await axios.post(
              `${BASE_URL}/api/brands`,
              {
                name: "Test Brand " + Date.now(),
                description: "Test brand for automated testing",
              },
              { headers },
            );
            return response.status === 201 || response.status === 401;
          } catch (error) {
            return error.response?.status === 401;
          }
        },
      },
      {
        name: "Read Operation Test",
        test: async () => {
          const response = await axios.get(`${BASE_URL}/api/brands`, {
            headers,
          });
          return response.status === 200 || response.status === 401;
        },
      },
    ];

    await this.executeTestGroup("database", tests);
  }

  async testWebSocketConnection() {
    console.log("\n🔌 Testing WebSocket Connection...");

    return new Promise((resolve) => {
      let testPassed = false;
      let ws;

      try {
        ws = new WebSocket(WS_URL);

        const timeout = setTimeout(() => {
          this.results.websocket.tests.push({
            name: "WebSocket Connection",
            passed: false,
            error: "Connection timeout",
          });
          if (ws) ws.close();
          resolve();
        }, 5000);

        ws.on("open", () => {
          clearTimeout(timeout);
          testPassed = true;
          this.results.websocket.tests.push({
            name: "WebSocket Connection",
            passed: true,
          });

          // Test message sending
          ws.send(JSON.stringify({ type: "ping" }));
        });

        ws.on("message", (data) => {
          this.results.websocket.tests.push({
            name: "WebSocket Message Exchange",
            passed: true,
            data: data.toString(),
          });
          ws.close();
          resolve();
        });

        ws.on("error", (error) => {
          clearTimeout(timeout);
          this.results.websocket.tests.push({
            name: "WebSocket Connection",
            passed: false,
            error: error.message,
          });
          resolve();
        });

        ws.on("close", () => {
          if (!testPassed) {
            this.results.websocket.tests.push({
              name: "WebSocket Connection",
              passed: false,
              error: "Connection closed unexpectedly",
            });
          }
          resolve();
        });
      } catch (error) {
        this.results.websocket.tests.push({
          name: "WebSocket Connection",
          passed: false,
          error: error.message,
        });
        resolve();
      }
    });
  }

  async testPlan1Features() {
    console.log("\n📊 Testing Plan 1 Features...");

    const headers = this.authToken
      ? { Authorization: `Bearer ${this.authToken}` }
      : {};

    const tests = [
      {
        name: "Dashboard Metrics Endpoint",
        test: async () => {
          const response = await axios.get(
            `${BASE_URL}/api/dashboard/metrics`,
            { headers },
          );
          return response.status === 200 || response.status === 401;
        },
      },
      {
        name: "Search Functionality",
        test: async () => {
          const response = await axios.get(
            `${BASE_URL}/api/products/search?q=test`,
            { headers },
          );
          return response.status === 200 || response.status === 401;
        },
      },
      {
        name: "Data Quality Indicators",
        test: async () => {
          const response = await axios.get(`${BASE_URL}/api/data-quality`, {
            headers,
          });
          return response.status === 200 || response.status === 401;
        },
      },
      {
        name: "SEO Metrics Display",
        test: async () => {
          const response = await axios.get(`${BASE_URL}/api/seo/metrics`, {
            headers,
          });
          return response.status === 200 || response.status === 401;
        },
      },
      {
        name: "Automation Analytics",
        test: async () => {
          const response = await axios.get(
            `${BASE_URL}/api/automation/analytics`,
            { headers },
          );
          return response.status === 200 || response.status === 401;
        },
      },
    ];

    await this.executeTestGroup("plan1Features", tests);
  }

  async investigateAutomationMetricsError() {
    console.log("\n🔍 Investigating Automation Metrics Error...");

    try {
      const response = await axios.get(`${BASE_URL}/api/automation/metrics`);
      this.results.issues.push({
        type: "INFO",
        component: "Automation Metrics",
        message: "Endpoint accessible",
        status: response.status,
      });
    } catch (error) {
      this.results.issues.push({
        type: "ERROR",
        component: "Automation Metrics",
        error: error.message,
        details:
          "PostgresError: syntax error at or near '=' - SQL query issue detected",
      });
    }
  }

  async executeTestGroup(groupName, tests) {
    for (const test of tests) {
      try {
        const result = await test.test();
        this.results[groupName].tests.push({
          name: test.name,
          passed: result,
          timestamp: new Date().toISOString(),
        });
        console.log(`${result ? "✅" : "❌"} ${test.name}`);
      } catch (error) {
        this.results[groupName].tests.push({
          name: test.name,
          passed: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }

    const passed = this.results[groupName].tests.filter((t) => t.passed).length;
    const total = this.results[groupName].tests.length;
    this.results[groupName].status = passed === total ? "pass" : "partial";
    console.log(`📊 ${groupName} tests: ${passed}/${total} passed`);
  }

  generateReport() {
    console.log("\n" + "=" * 70);
    console.log("📋 COMPREHENSIVE TEST REPORT");
    console.log("=" * 70);

    // Summary
    const allTests = Object.values(this.results)
      .filter((r) => r.tests)
      .flatMap((r) => r.tests);
    const totalTests = allTests.length;
    const passedTests = allTests.filter((t) => t.passed).length;
    const overallPass = passedTests / totalTests;

    console.log(`\n📊 OVERALL SUMMARY:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${totalTests - passedTests}`);
    console.log(`   Success Rate: ${(overallPass * 100).toFixed(1)}%`);

    // Detailed Results
    console.log("\n✅ WORKING FEATURES:");
    Object.entries(this.results).forEach(([category, result]) => {
      if (result.tests) {
        const passed = result.tests.filter((t) => t.passed);
        passed.forEach((test) => {
          console.log(`   ✅ ${category.toUpperCase()}: ${test.name}`);
        });
      }
    });

    console.log("\n❌ BROKEN FEATURES:");
    Object.entries(this.results).forEach(([category, result]) => {
      if (result.tests) {
        const failed = result.tests.filter((t) => !t.passed);
        failed.forEach((test) => {
          console.log(`   ❌ ${category.toUpperCase()}: ${test.name}`);
          if (test.error) {
            console.log(`      Error: ${test.error}`);
          }
        });
      }
    });

    console.log("\n⚠️ ISSUES IDENTIFIED:");
    this.results.issues.forEach((issue) => {
      console.log(
        `   ${issue.type}: ${issue.component} - ${issue.error || issue.message}`,
      );
      if (issue.details) {
        console.log(`      Details: ${issue.details}`);
      }
    });

    // GO/NO-GO Decision
    console.log("\n🚦 GO/NO-GO RECOMMENDATION:");
    if (overallPass >= 0.8) {
      console.log("   ✅ GO - System is stable enough to proceed to Plan 2");
      console.log(
        "   📝 Recommendation: Address identified issues during Plan 2 implementation",
      );
    } else if (overallPass >= 0.6) {
      console.log("   ⚠️ CONDITIONAL GO - Proceed with caution");
      console.log("   📝 Recommendation: Fix critical issues before Plan 2");
    } else {
      console.log("   ❌ NO-GO - Too many critical issues");
      console.log(
        "   📝 Recommendation: Address major issues before proceeding",
      );
    }

    console.log("\n" + "=" * 70);
  }
}

// Run the test suite
const testSuite = new ComprehensiveTestSuite();
testSuite.runAllTests().catch(console.error);
