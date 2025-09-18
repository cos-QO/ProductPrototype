#!/usr/bin/env node

/**
 * Integration test for Enhanced Import System
 * Tests all major components and API endpoints
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'test123',
  firstName: 'Test',
  lastName: 'User'
};

let authToken = null;
let sessionId = null;

// Test data
const testProductsCSV = `name,price,sku,description,brand
Test Product 1,29.99,TP001,A great test product,Test Brand
Test Product 2,49.99,TP002,Another test product,Test Brand
Test Product 3,19.99,TP003,The best test product,Test Brand`;

const testProductsJSON = [
  {
    name: 'JSON Product 1',
    price: 39.99,
    sku: 'JP001',
    description: 'A JSON test product',
    brand: 'JSON Brand'
  },
  {
    name: 'JSON Product 2',
    price: 59.99,
    sku: 'JP002',
    description: 'Another JSON test product',
    brand: 'JSON Brand'
  }
];

// Utility functions
async function makeRequest(method, endpoint, data = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${result.message || 'Request failed'}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Request failed: ${method} ${endpoint}`, error.message);
    throw error;
  }
}

async function makeFormRequest(endpoint, formData, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authToken ? `Bearer ${authToken}` : undefined,
        ...headers
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${result.message || 'Request failed'}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Form request failed: ${endpoint}`, error.message);
    throw error;
  }
}

function createCSVFile() {
  const filePath = path.join(__dirname, 'test-products.csv');
  fs.writeFileSync(filePath, testProductsCSV);
  return filePath;
}

function createJSONFile() {
  const filePath = path.join(__dirname, 'test-products.json');
  fs.writeFileSync(filePath, JSON.stringify(testProductsJSON, null, 2));
  return filePath;
}

function cleanup() {
  const files = [
    path.join(__dirname, 'test-products.csv'),
    path.join(__dirname, 'test-products.json')
  ];
  
  files.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
}

// Test functions
async function testAuthentication() {
  console.log('🔐 Testing Authentication...');
  
  try {
    // Try to register a test user (might fail if already exists)
    try {
      await makeRequest('POST', '/api/auth/register', TEST_USER);
      console.log('✅ User registered successfully');
    } catch (error) {
      console.log('ℹ️ User already exists, proceeding with login');
    }
    
    // Login
    const loginResult = await makeRequest('POST', '/api/auth/login', {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

async function testUploadSession() {
  console.log('📁 Testing Upload Session...');
  
  try {
    const result = await makeRequest('POST', '/api/upload/initiate');
    sessionId = result.sessionId;
    console.log('✅ Upload session created:', sessionId);
    return true;
  } catch (error) {
    console.error('❌ Upload session creation failed:', error.message);
    return false;
  }
}

async function testFileAnalysis() {
  console.log('📊 Testing File Analysis...');
  
  try {
    const csvPath = createCSVFile();
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(csvPath);
    const blob = new Blob([fileBuffer], { type: 'text/csv' });
    formData.append('file', blob, 'test-products.csv');
    
    const result = await makeFormRequest(`/api/upload/${sessionId}/analyze`, formData);
    
    console.log('✅ File analysis completed');
    console.log(`   - File: ${result.fileInfo.name}`);
    console.log(`   - Records: ${result.fileInfo.totalRecords}`);
    console.log(`   - Fields: ${result.sourceFields.length}`);
    console.log(`   - Suggested mappings: ${result.suggestedMappings.length}`);
    
    return true;
  } catch (error) {
    console.error('❌ File analysis failed:', error.message);
    return false;
  }
}

async function testFieldMapping() {
  console.log('🗺️ Testing Field Mapping...');
  
  try {
    const sourceFields = [
      {
        name: 'name',
        dataType: 'string',
        sampleValues: ['Test Product 1', 'Test Product 2'],
        nullPercentage: 0,
        uniquePercentage: 100,
        isRequired: true
      },
      {
        name: 'price',
        dataType: 'number',
        sampleValues: ['29.99', '49.99'],
        nullPercentage: 0,
        uniquePercentage: 100,
        isRequired: false
      }
    ];
    
    const result = await makeRequest('POST', '/api/mapping/analyze', { sourceFields });
    
    console.log('✅ Field mapping analysis completed');
    console.log(`   - Mappings generated: ${result.mappings.length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Field mapping failed:', error.message);
    return false;
  }
}

async function testDataPreview() {
  console.log('👁️ Testing Data Preview...');
  
  try {
    const result = await makeRequest('GET', `/api/preview/${sessionId}?limit=5`);
    
    console.log('✅ Data preview generated');
    console.log(`   - Total records: ${result.totalRecords}`);
    console.log(`   - Valid records: ${result.validRecords}`);
    console.log(`   - Invalid records: ${result.invalidRecords}`);
    
    return true;
  } catch (error) {
    console.error('❌ Data preview failed:', error.message);
    return false;
  }
}

async function testImportExecution() {
  console.log('🚀 Testing Import Execution...');
  
  try {
    const result = await makeRequest('POST', `/api/import/${sessionId}/execute`, {
      importConfig: { entityType: 'product' }
    });
    
    console.log('✅ Import execution started');
    console.log(`   - Status: ${result.status}`);
    
    // Wait a bit and check progress
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const progress = await makeRequest('GET', `/api/import/${sessionId}/progress`);
    console.log(`   - Progress: ${progress.processedRecords}/${progress.totalRecords}`);
    
    return true;
  } catch (error) {
    console.error('❌ Import execution failed:', error.message);
    return false;
  }
}

async function testErrorRecovery() {
  console.log('🔧 Testing Error Recovery...');
  
  try {
    const errors = [
      {
        recordIndex: 0,
        field: 'price',
        value: 'invalid_price',
        rule: 'Invalid number format',
        severity: 'error'
      }
    ];
    
    const result = await makeRequest('POST', `/api/recovery/${sessionId}/analyze`, { errors });
    
    console.log('✅ Error analysis completed');
    console.log(`   - Total errors: ${result.analysis.totalErrors}`);
    console.log(`   - Auto-fixable: ${result.analysis.autoFixable}`);
    console.log(`   - Manual required: ${result.analysis.manualRequired}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error recovery failed:', error.message);
    return false;
  }
}

async function testFileProcessor() {
  console.log('📁 Testing File Processor...');
  
  try {
    const csvPath = createCSVFile();
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(csvPath);
    const blob = new Blob([fileBuffer], { type: 'text/csv' });
    formData.append('file', blob, 'test-products.csv');
    
    const result = await makeFormRequest('/api/files/preview?sampleSize=5', formData);
    
    console.log('✅ File processor test completed');
    console.log(`   - Fields detected: ${result.preview.fields.length}`);
    console.log(`   - Sample records: ${result.preview.sampleData.length}`);
    console.log(`   - Estimated records: ${result.preview.estimatedRecords}`);
    
    return true;
  } catch (error) {
    console.error('❌ File processor test failed:', error.message);
    return false;
  }
}

async function testWebSocketStats() {
  console.log('📊 Testing WebSocket Stats...');
  
  try {
    const result = await makeRequest('GET', '/api/websocket/stats');
    
    console.log('✅ WebSocket stats retrieved');
    console.log(`   - Total connections: ${result.stats.totalConnections}`);
    console.log(`   - Active sessions: ${result.stats.activeSessions}`);
    
    return true;
  } catch (error) {
    console.error('❌ WebSocket stats test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Enhanced Import System Integration Tests');
  console.log('='.repeat(50));
  
  const tests = [
    { name: 'Authentication', fn: testAuthentication },
    { name: 'Upload Session', fn: testUploadSession },
    { name: 'File Analysis', fn: testFileAnalysis },
    { name: 'Field Mapping', fn: testFieldMapping },
    { name: 'Data Preview', fn: testDataPreview },
    { name: 'Import Execution', fn: testImportExecution },
    { name: 'Error Recovery', fn: testErrorRecovery },
    { name: 'File Processor', fn: testFileProcessor },
    { name: 'WebSocket Stats', fn: testWebSocketStats }
  ];
  
  const results = {
    passed: 0,
    failed: 0,
    total: tests.length
  };
  
  for (const test of tests) {
    try {
      const success = await test.fn();
      if (success) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      console.error(`❌ Test "${test.name}" failed with error:`, error.message);
      results.failed++;
    }
    
    console.log(''); // Add spacing between tests
  }
  
  // Cleanup
  cleanup();
  
  console.log('📋 Test Results');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  console.log(`📊 Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
  
  if (results.failed === 0) {
    console.log('🎉 All tests passed! Enhanced Import System is ready.');
  } else {
    console.log('⚠️ Some tests failed. Check the logs above for details.');
  }
  
  process.exit(results.failed === 0 ? 0 : 1);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };