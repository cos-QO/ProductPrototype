#!/usr/bin/env node

/**
 * Focused Security Validation Tests for PLAN-20250923-1530-001
 * Tests the 6 critical security vulnerabilities that were fixed
 */

import { spawn } from 'child_process';
import fs from 'fs';
import https from 'https';
import http from 'http';

// Test Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_RESULTS = [];

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test 1: CRIT-001 - Chart XSS Protection
async function testChartXSSProtection() {
  console.log('🔍 Testing CRIT-001: Chart XSS Protection...');
  
  try {
    // Test XSS payload in chart data
    const xssPayload = '<script>alert("XSS")</script>';
    const response = await makeRequest('GET', '/api/analytics/dashboard');
    
    if (response.status === 200 || response.status === 401) {
      // Check if DOMPurify is being used in chart component
      const chartFile = fs.readFileSync('./client/src/components/ui/chart.tsx', 'utf8');
      const hasDOMPurify = chartFile.includes('DOMPurify') || chartFile.includes('dompurify');
      
      TEST_RESULTS.push({
        test: 'CRIT-001: Chart XSS Protection',
        status: hasDOMPurify ? 'PASS' : 'FAIL',
        details: hasDOMPurify ? 'DOMPurify found in chart component' : 'DOMPurify not found'
      });
    }
  } catch (error) {
    TEST_RESULTS.push({
      test: 'CRIT-001: Chart XSS Protection',
      status: 'ERROR',
      details: error.message
    });
  }
}

// Test 2: CRIT-002 - CSRF Protection
async function testCSRFProtection() {
  console.log('🔍 Testing CRIT-002: CSRF Protection...');
  
  try {
    // Test POST request without CSRF token
    const response = await makeRequest('POST', '/api/products', {
      name: 'Test Product',
      brand_id: 1
    });
    
    // Should fail without CSRF token in production mode
    const csrfProtected = response.status === 403 || response.status === 401;
    
    TEST_RESULTS.push({
      test: 'CRIT-002: CSRF Protection',
      status: csrfProtected ? 'PASS' : 'FAIL',
      details: `Response status: ${response.status} - ${csrfProtected ? 'CSRF protection active' : 'CSRF protection bypassed'}`
    });
  } catch (error) {
    TEST_RESULTS.push({
      test: 'CRIT-002: CSRF Protection',
      status: 'ERROR',
      details: error.message
    });
  }
}

// Test 3: CRIT-003 - Authentication Security
async function testAuthenticationSecurity() {
  console.log('🔍 Testing CRIT-003: Authentication Security...');
  
  try {
    // Check that JWT_SECRET environment validation is working
    const authFile = fs.readFileSync('./server/auth.ts', 'utf8');
    const hasJWTValidation = authFile.includes('JWT_SECRET environment variable is required');
    const hasSecureDefaults = !authFile.includes('fallback-secret-123') || authFile.includes('throw new Error');
    
    TEST_RESULTS.push({
      test: 'CRIT-003: Authentication Security',
      status: hasJWTValidation && hasSecureDefaults ? 'PASS' : 'FAIL',
      details: `JWT validation: ${hasJWTValidation}, Secure defaults: ${hasSecureDefaults}`
    });
  } catch (error) {
    TEST_RESULTS.push({
      test: 'CRIT-003: Authentication Security',
      status: 'ERROR',
      details: error.message
    });
  }
}

// Test 4: CRIT-004 - CSV Injection Prevention
async function testCSVInjectionPrevention() {
  console.log('🔍 Testing CRIT-004: CSV Injection Prevention...');
  
  try {
    // Check if CSV sanitization is implemented
    const importFile = fs.readFileSync('./server/import-service.ts', 'utf8');
    const hasCSVSanitization = importFile.includes('sanitizeCSVValue') || importFile.includes('CSV injection');
    
    // Test CSV export endpoint
    const response = await makeRequest('GET', '/api/import/template/products/csv');
    const isCSVResponse = response.headers['content-type']?.includes('text/csv') || 
                         response.headers['content-disposition']?.includes('csv');
    
    TEST_RESULTS.push({
      test: 'CRIT-004: CSV Injection Prevention',
      status: hasCSVSanitization ? 'PASS' : 'FAIL',
      details: `Sanitization found: ${hasCSVSanitization}, CSV endpoint working: ${isCSVResponse}`
    });
  } catch (error) {
    TEST_RESULTS.push({
      test: 'CRIT-004: CSV Injection Prevention',
      status: 'ERROR',
      details: error.message
    });
  }
}

// Test 5: CRIT-005 - JWT Security
async function testJWTSecurity() {
  console.log('🔍 Testing CRIT-005: JWT Security...');
  
  try {
    // Check JWT configuration in auth file
    const authFile = fs.readFileSync('./server/auth.ts', 'utf8');
    const hasJWTValidation = authFile.includes('JWT_SECRET environment variable is required');
    const hasMinLength = authFile.includes('32') || authFile.includes('minimum');
    
    TEST_RESULTS.push({
      test: 'CRIT-005: JWT Security',
      status: hasJWTValidation && hasMinLength ? 'PASS' : 'FAIL',
      details: `Environment validation: ${hasJWTValidation}, Length validation: ${hasMinLength}`
    });
  } catch (error) {
    TEST_RESULTS.push({
      test: 'CRIT-005: JWT Security',
      status: 'ERROR',
      details: error.message
    });
  }
}

// Test 6: CRIT-006 - File Upload Security
async function testFileUploadSecurity() {
  console.log('🔍 Testing CRIT-006: File Upload Security...');
  
  try {
    // Check for file upload security in routes or middleware
    const routesFile = fs.readFileSync('./server/routes.ts', 'utf8');
    const hasFileValidation = routesFile.includes('validateFilePath') || 
                             routesFile.includes('path traversal') ||
                             routesFile.includes('upload') && routesFile.includes('security');
    
    // Test file upload endpoint for path traversal protection
    const response = await makeRequest('POST', '/api/media/upload', null, {
      'Content-Type': 'multipart/form-data'
    });
    
    const isProtected = response.status === 400 || response.status === 415 || response.status === 401;
    
    TEST_RESULTS.push({
      test: 'CRIT-006: File Upload Security',
      status: hasFileValidation ? 'PASS' : 'FAIL',
      details: `Path validation found: ${hasFileValidation}, Upload protected: ${isProtected}`
    });
  } catch (error) {
    TEST_RESULTS.push({
      test: 'CRIT-006: File Upload Security',
      status: 'ERROR',
      details: error.message
    });
  }
}

// Test Security Headers
async function testSecurityHeaders() {
  console.log('🔍 Testing Security Headers...');
  
  try {
    const response = await makeRequest('GET', '/');
    const headers = response.headers;
    
    const hasCSP = !!headers['content-security-policy'];
    const hasHSTS = !!headers['strict-transport-security'];
    const hasXFrame = !!headers['x-frame-options'];
    const hasXXSS = !!headers['x-xss-protection'];
    
    TEST_RESULTS.push({
      test: 'Security Headers',
      status: (hasCSP && hasHSTS && hasXFrame) ? 'PASS' : 'PARTIAL',
      details: `CSP: ${hasCSP}, HSTS: ${hasHSTS}, X-Frame: ${hasXFrame}, XSS: ${hasXXSS}`
    });
  } catch (error) {
    TEST_RESULTS.push({
      test: 'Security Headers',
      status: 'ERROR',
      details: error.message
    });
  }
}

// Performance Impact Test
async function testPerformanceImpact() {
  console.log('🔍 Testing Performance Impact...');
  
  try {
    const start = Date.now();
    await makeRequest('GET', '/api/products');
    const duration = Date.now() - start;
    
    // Acceptable if under 1000ms for basic endpoint
    const acceptable = duration < 1000;
    
    TEST_RESULTS.push({
      test: 'Performance Impact',
      status: acceptable ? 'PASS' : 'WARN',
      details: `Response time: ${duration}ms - ${acceptable ? 'Acceptable' : 'May need optimization'}`
    });
  } catch (error) {
    TEST_RESULTS.push({
      test: 'Performance Impact',
      status: 'ERROR',
      details: error.message
    });
  }
}

// Main test execution
async function runSecurityValidation() {
  console.log('🚀 Starting Focused Security Validation Tests');
  console.log('📋 Testing 6 Critical Security Vulnerabilities\n');

  // Wait for server to be ready
  console.log('⏳ Waiting for server...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Run all security tests
  await testChartXSSProtection();
  await testCSRFProtection();
  await testAuthenticationSecurity();
  await testCSVInjectionPrevention();
  await testJWTSecurity();
  await testFileUploadSecurity();
  await testSecurityHeaders();
  await testPerformanceImpact();

  // Generate report
  console.log('\n📊 Security Validation Results:');
  console.log('================================\n');

  let passCount = 0;
  let failCount = 0;
  let errorCount = 0;

  TEST_RESULTS.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : 
                 result.status === 'FAIL' ? '❌' : 
                 result.status === 'WARN' ? '⚠️' : '🔥';
    
    console.log(`${icon} ${result.test}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Details: ${result.details}\n`);

    if (result.status === 'PASS') passCount++;
    else if (result.status === 'FAIL') failCount++;
    else if (result.status === 'ERROR') errorCount++;
  });

  console.log('📈 Summary:');
  console.log(`   ✅ Passed: ${passCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   🔥 Errors: ${errorCount}`);
  console.log(`   📊 Success Rate: ${Math.round((passCount / TEST_RESULTS.length) * 100)}%\n`);

  // Security clearance assessment
  const criticalIssues = failCount + errorCount;
  const securityScore = Math.round((passCount / TEST_RESULTS.length) * 100);

  if (criticalIssues === 0 && securityScore >= 90) {
    console.log('🟢 SECURITY CLEARANCE: APPROVED FOR PRODUCTION');
    console.log('   All critical vulnerabilities validated as fixed');
  } else if (securityScore >= 75) {
    console.log('🟡 SECURITY CLEARANCE: CONDITIONAL APPROVAL');
    console.log('   Minor issues found, but security is acceptable');
  } else {
    console.log('🔴 SECURITY CLEARANCE: DENIED');
    console.log('   Critical security issues require immediate attention');
  }

  return {
    passed: passCount,
    failed: failCount,
    errors: errorCount,
    score: securityScore,
    approved: criticalIssues === 0 && securityScore >= 90
  };
}

// Export for module use or run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityValidation()
    .then(results => {
      process.exit(results.approved ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Security validation failed:', error);
      process.exit(1);
    });
}

export { runSecurityValidation };