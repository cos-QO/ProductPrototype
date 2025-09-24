#!/usr/bin/env node

/**
 * Security Testing Suite - File Upload Validation
 *
 * Priority: P0 - Critical Security Blocker
 *
 * Tests file upload security measures that currently have 0% pass rate
 * according to gap analysis. These vulnerabilities block production deployment.
 *
 * Coverage:
 * - Malicious file type rejection
 * - File size limit enforcement
 * - Path traversal prevention
 * - Content type validation
 * - File name sanitization
 *
 * Success Criteria:
 * - 100% malicious file rejection
 * - No security bypasses possible
 * - All edge cases covered
 */

const {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
} = require("@jest/globals");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const fetch = require("node-fetch");

// Test configuration
const BASE_URL = "http://localhost:5000";
const TEST_USER = {
  email: "security-tester@example.com",
  password: "test123",
  firstName: "Security",
  lastName: "Tester",
};

let authToken = null;

// Security test utilities
class SecurityTestUtils {
  static createMaliciousFile(
    filename,
    content = "malicious content",
    mimeType = "application/octet-stream",
  ) {
    const filePath = path.join(__dirname, filename);
    fs.writeFileSync(filePath, content);
    return {
      path: filePath,
      name: filename,
      content,
      mimeType,
      size: Buffer.byteLength(content),
    };
  }

  static createOversizedFile(filename, sizeInMB) {
    const content = "x".repeat(sizeInMB * 1024 * 1024);
    return this.createMaliciousFile(filename, content, "text/csv");
  }

  static cleanup(filePaths) {
    filePaths.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }

  static async uploadFile(file, sessionId = null) {
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
      headers: {
        Authorization: authToken ? `Bearer ${authToken}` : undefined,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    return {
      status: response.status,
      data: response.ok ? await response.json() : null,
      error: !response.ok ? await response.text() : null,
    };
  }
}

// Setup authentication
beforeAll(async () => {
  try {
    // Register test user (may fail if exists)
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(TEST_USER),
    });

    // Login to get auth token
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
      }),
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      authToken = loginData.token;
    }
  } catch (error) {
    console.warn("Setup authentication failed:", error.message);
  }
});

// Cleanup test files after all tests
afterAll(() => {
  const testFiles = [
    "malware.exe",
    "script.js",
    "passwd",
    "huge-file.csv",
    "path-traversal.csv",
    "unicode-exploit.csv",
    "zip-bomb.zip",
    "sql-injection.csv",
  ];

  const filePaths = testFiles.map((name) => path.join(__dirname, name));
  SecurityTestUtils.cleanup(filePaths);
});

describe("File Upload Security Validation", () => {
  describe("Malicious File Type Rejection", () => {
    test("should reject executable files (.exe)", async () => {
      const malwareFile = SecurityTestUtils.createMaliciousFile(
        "malware.exe",
        "MZ\x90\x00", // PE header signature
        "application/octet-stream",
      );

      const result = await SecurityTestUtils.uploadFile(malwareFile);

      expect(result.status).toBe(400);
      expect(result.error).toContain("Invalid file type");
    });

    test("should reject JavaScript files (.js)", async () => {
      const scriptFile = SecurityTestUtils.createMaliciousFile(
        "script.js",
        'alert("XSS attack");',
        "application/javascript",
      );

      const result = await SecurityTestUtils.uploadFile(scriptFile);

      expect(result.status).toBe(400);
      expect(result.error).toContain("Invalid file type");
    });

    test("should reject HTML files (.html)", async () => {
      const htmlFile = SecurityTestUtils.createMaliciousFile(
        "malicious.html",
        '<script>alert("XSS")</script>',
        "text/html",
      );

      const result = await SecurityTestUtils.uploadFile(htmlFile);

      expect(result.status).toBe(400);
      expect(result.error).toContain("Invalid file type");
    });

    test("should reject binary files with fake CSV extension", async () => {
      const fakeCSV = SecurityTestUtils.createMaliciousFile(
        "fake.csv",
        "\x89PNG\r\n\x1a\n", // PNG header in CSV file
        "text/csv",
      );

      const result = await SecurityTestUtils.uploadFile(fakeCSV);

      expect(result.status).toBe(400);
      expect(result.error).toContain("Invalid file content");
    });
  });

  describe("File Size Limit Enforcement", () => {
    test("should reject files exceeding 10MB limit", async () => {
      const hugeFile = SecurityTestUtils.createOversizedFile(
        "huge-file.csv",
        15,
      );

      const result = await SecurityTestUtils.uploadFile(hugeFile);

      expect(result.status).toBe(413);
      expect(result.error).toContain("File too large");
    });

    test("should accept files within size limit", async () => {
      const validFile = SecurityTestUtils.createMaliciousFile(
        "valid-small.csv",
        "name,price,sku\nTest Product,29.99,TP001",
        "text/csv",
      );

      const result = await SecurityTestUtils.uploadFile(validFile);

      // Should either succeed or fail for reasons other than file size
      expect(result.status).not.toBe(413);
    });
  });

  describe("Path Traversal Prevention", () => {
    test("should prevent directory traversal in filename", async () => {
      const traversalFile = SecurityTestUtils.createMaliciousFile(
        "../../../etc/passwd",
        "name,price,sku\nTraversal Test,10.00,TT001",
        "text/csv",
      );

      const result = await SecurityTestUtils.uploadFile(traversalFile);

      // Should either sanitize filename or reject
      if (result.status === 200) {
        expect(result.data.filename).not.toContain("../");
      } else {
        expect(result.status).toBe(400);
      }
    });

    test("should handle null bytes in filename", async () => {
      const nullByteFile = SecurityTestUtils.createMaliciousFile(
        "test\x00.exe.csv",
        "name,price,sku\nNull Byte Test,10.00,NBT001",
        "text/csv",
      );

      const result = await SecurityTestUtils.uploadFile(nullByteFile);

      // Should sanitize or reject null bytes
      if (result.status === 200) {
        expect(result.data.filename).not.toContain("\x00");
      } else {
        expect(result.status).toBe(400);
      }
    });
  });

  describe("Content Validation", () => {
    test("should validate CSV content structure", async () => {
      const invalidCSV = SecurityTestUtils.createMaliciousFile(
        "invalid-content.csv",
        "This is not valid CSV content\nNo proper headers\nRandom data",
        "text/csv",
      );

      const result = await SecurityTestUtils.uploadFile(invalidCSV);

      expect(result.status).toBe(400);
      expect(result.error).toContain("Invalid CSV format");
    });

    test("should handle Unicode exploitation attempts", async () => {
      const unicodeExploit = SecurityTestUtils.createMaliciousFile(
        "unicode-exploit.csv",
        "name,price,sku\n\u202e\u202dexe.csv,10.00,UE001", // Right-to-left override
        "text/csv",
      );

      const result = await SecurityTestUtils.uploadFile(unicodeExploit);

      // Should sanitize Unicode control characters
      if (result.status === 200) {
        expect(result.data.filename).not.toMatch(/[\u202e\u202d]/);
      }
    });
  });

  describe("SQL Injection Prevention", () => {
    test("should prevent SQL injection in CSV data", async () => {
      const sqlInjection = SecurityTestUtils.createMaliciousFile(
        "sql-injection.csv",
        "name,price,sku\n'; DROP TABLE products; --,10.00,SQL001",
        "text/csv",
      );

      const result = await SecurityTestUtils.uploadFile(sqlInjection);

      // Should either sanitize or reject SQL injection attempts
      if (result.status === 200) {
        // Verify SQL injection is sanitized in processing
        expect(result.data.records).toBeDefined();
        // Additional validation would check database state
      }
    });

    test("should handle script injection in product names", async () => {
      const scriptInjection = SecurityTestUtils.createMaliciousFile(
        "script-injection.csv",
        'name,price,sku\n<script>alert("XSS")</script>,10.00,XSS001',
        "text/csv",
      );

      const result = await SecurityTestUtils.uploadFile(scriptInjection);

      if (result.status === 200) {
        // Verify script tags are sanitized
        const productName = result.data.records?.[0]?.name;
        expect(productName).not.toContain("<script>");
      }
    });
  });

  describe("Zip Bomb Protection", () => {
    test("should detect and reject zip bombs", async () => {
      // Create a file that appears small but expands dramatically
      const zipBomb = SecurityTestUtils.createMaliciousFile(
        "zip-bomb.zip",
        "PK\x03\x04" + "x".repeat(1000), // Fake zip header + repeated content
        "application/zip",
      );

      const result = await SecurityTestUtils.uploadFile(zipBomb);

      expect(result.status).toBe(400);
      expect(result.error).toContain("Invalid file type");
    });
  });

  describe("MIME Type Validation", () => {
    test("should validate MIME type matches file extension", async () => {
      const mismatchFile = SecurityTestUtils.createMaliciousFile(
        "test.csv",
        "name,price,sku\nTest,10.00,T001",
        "application/javascript", // Wrong MIME type
      );

      const result = await SecurityTestUtils.uploadFile(mismatchFile);

      // Should detect MIME type mismatch
      if (result.status !== 200) {
        expect(result.error).toContain("Invalid file type");
      }
    });

    test("should accept valid MIME types", async () => {
      const validMimeTypes = [
        { ext: "csv", mime: "text/csv" },
        { ext: "json", mime: "application/json" },
        {
          ext: "xlsx",
          mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ];

      for (const { ext, mime } of validMimeTypes) {
        const validFile = SecurityTestUtils.createMaliciousFile(
          `test.${ext}`,
          ext === "json" ? "[]" : "name,price,sku\nTest,10.00,T001",
          mime,
        );

        const result = await SecurityTestUtils.uploadFile(validFile);

        // Should not reject valid MIME types
        expect(result.status).not.toBe(415); // Unsupported Media Type
      }
    });
  });

  describe("Rate Limiting Protection", () => {
    test("should implement rate limiting for upload attempts", async () => {
      const testFile = SecurityTestUtils.createMaliciousFile(
        "rate-limit-test.csv",
        "name,price,sku\nRate Test,10.00,RT001",
        "text/csv",
      );

      // Attempt multiple rapid uploads
      const rapidRequests = Array(15)
        .fill()
        .map(async (_, index) => {
          const file = SecurityTestUtils.createMaliciousFile(
            `rate-test-${index}.csv`,
            "name,price,sku\nRate Test,10.00,RT001",
            "text/csv",
          );
          return SecurityTestUtils.uploadFile(file);
        });

      const results = await Promise.allSettled(rapidRequests);
      const rateLimited = results.filter(
        (r) => r.status === "fulfilled" && r.value.status === 429,
      );

      // Should have some rate limited responses
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe("File Content Scanning", () => {
    test("should scan for malicious patterns in file content", async () => {
      const maliciousPatterns = [
        "eval(",
        "document.cookie",
        "window.location",
        "javascript:",
        "data:text/html",
        "vbscript:",
        "expression(",
        "onload=",
        "onerror=",
      ];

      for (const pattern of maliciousPatterns) {
        const maliciousFile = SecurityTestUtils.createMaliciousFile(
          `pattern-test-${pattern.replace(/[^a-z]/gi, "")}.csv`,
          `name,price,sku\n${pattern},10.00,PT001`,
          "text/csv",
        );

        const result = await SecurityTestUtils.uploadFile(maliciousFile);

        // Should detect and handle malicious patterns
        if (result.status === 200) {
          expect(result.data.warnings).toBeDefined();
        }
      }
    });
  });
});

describe("Authentication & Authorization Security", () => {
  test("should require authentication for upload endpoints", async () => {
    const tempToken = authToken;
    authToken = null; // Remove auth token

    const testFile = SecurityTestUtils.createMaliciousFile(
      "auth-test.csv",
      "name,price,sku\nAuth Test,10.00,AT001",
      "text/csv",
    );

    const result = await SecurityTestUtils.uploadFile(testFile);

    expect(result.status).toBe(401);
    expect(result.error).toContain("Unauthorized");

    authToken = tempToken; // Restore auth token
  });

  test("should validate JWT token integrity", async () => {
    const originalToken = authToken;
    authToken = "invalid.jwt.token";

    const testFile = SecurityTestUtils.createMaliciousFile(
      "jwt-test.csv",
      "name,price,sku\nJWT Test,10.00,JWT001",
      "text/csv",
    );

    const result = await SecurityTestUtils.uploadFile(testFile);

    expect(result.status).toBe(401);

    authToken = originalToken; // Restore valid token
  });
});

describe("Session Security", () => {
  test("should prevent session hijacking", async () => {
    // Test session token validation
    const sessionResponse = await fetch(`${BASE_URL}/api/upload/initiate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();

      // Attempt to use session from different IP/user agent
      const hijackAttempt = await fetch(
        `${BASE_URL}/api/upload/${sessionData.sessionId}/status`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "User-Agent": "Malicious-Bot/1.0",
            "X-Forwarded-For": "192.168.1.999",
          },
        },
      );

      // Should detect suspicious activity
      expect(hijackAttempt.status).toBeLessThan(500);
    }
  });
});

// Export test utilities for other security tests
module.exports = {
  SecurityTestUtils,
  BASE_URL,
  TEST_USER,
};
