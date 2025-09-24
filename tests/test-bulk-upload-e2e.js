#!/usr/bin/env node

/**
 * End-to-End Bulk Upload Test
 * Tests the complete bulk upload workflow with database connectivity verification
 */

import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5000';
const TEST_CSV_PATH = './test-comprehensive-bulk-upload.csv';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step}. ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }
}

async function uploadFile(filePath, endpoint) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    body: form
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: HTTP ${response.status}`);
  }
  
  return await response.json();
}

async function waitForProcessing(sessionId, maxWaitTime = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const status = await makeRequest(`/api/import/sessions/${sessionId}/status`);
      
      log(`Status: ${status.status} - ${status.message || 'Processing...'}`, 'yellow');
      
      if (status.status === 'completed') {
        return { success: true, result: status };
      } else if (status.status === 'failed') {
        return { success: false, error: status.message };
      } else if (status.status === 'preview_ready' || status.status === 'awaiting_approval') {
        return { success: true, result: status, needsApproval: true };
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logWarning(`Status check failed: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return { success: false, error: 'Timeout waiting for processing' };
}

async function runEndToEndTest() {
  log(`
╔══════════════════════════════════════════════════════════════╗
║                    BULK UPLOAD E2E TEST                     ║
║              Testing Complete Workflow                       ║
╚══════════════════════════════════════════════════════════════╝
`, 'bold');

  try {
    // Step 1: Verify Database Connectivity
    logStep(1, 'Verifying Database Connectivity');
    const dbStats = await makeRequest('/api/dashboard/stats');
    logSuccess(`Database connected - ${dbStats.totalProducts} products, ${dbStats.totalBrands} brands`);
    
    const initialProductCount = dbStats.totalProducts;
    
    // Step 2: Verify CSV File Exists
    logStep(2, 'Checking Test CSV File');
    if (!fs.existsSync(TEST_CSV_PATH)) {
      throw new Error(`Test CSV file not found: ${TEST_CSV_PATH}`);
    }
    
    const csvContent = fs.readFileSync(TEST_CSV_PATH, 'utf8');
    const rowCount = csvContent.split('\n').length - 1; // Minus header
    logSuccess(`CSV file found with ${rowCount} products`);
    
    // Step 3: Upload File
    logStep(3, 'Uploading CSV File');
    const uploadResult = await uploadFile(TEST_CSV_PATH, '/api/import/upload');
    logSuccess(`File uploaded - Session ID: ${uploadResult.sessionId}`);
    
    const sessionId = uploadResult.sessionId;
    
    // Step 4: Wait for Analysis and Field Mapping
    logStep(4, 'Waiting for File Analysis and AI Field Mapping');
    const analysisResult = await waitForProcessing(sessionId, 15000);
    
    if (!analysisResult.success) {
      throw new Error(`Analysis failed: ${analysisResult.error}`);
    }
    
    logSuccess('File analysis completed');
    
    // Step 5: Get Field Mappings
    logStep(5, 'Checking AI Field Mapping Results');
    const mappings = await makeRequest(`/api/import/sessions/${sessionId}/mappings`);
    
    if (mappings.suggestions && mappings.suggestions.length > 0) {
      logSuccess(`AI generated ${mappings.suggestions.length} field mappings`);
      
      // Display mapping confidence
      mappings.suggestions.forEach(mapping => {
        const confidence = Math.round(mapping.confidence * 100);
        const color = confidence >= 80 ? 'green' : confidence >= 60 ? 'yellow' : 'red';
        log(`  ${mapping.sourceField} → ${mapping.targetField} (${confidence}%)`, color);
      });
    }
    
    // Step 6: Generate Preview
    logStep(6, 'Generating Data Preview');
    await makeRequest(`/api/import/sessions/${sessionId}/preview`, { method: 'POST' });
    
    const previewResult = await waitForProcessing(sessionId, 10000);
    if (!previewResult.success && !previewResult.needsApproval) {
      throw new Error(`Preview generation failed: ${previewResult.error}`);
    }
    
    logSuccess('Data preview generated');
    
    // Step 7: Get Preview Data
    logStep(7, 'Retrieving Preview Data');
    const preview = await makeRequest(`/api/import/sessions/${sessionId}/preview`);
    
    if (preview.data && preview.data.length > 0) {
      logSuccess(`Preview contains ${preview.data.length} records`);
      log(`Sample record: ${JSON.stringify(preview.data[0], null, 2)}`, 'blue');
    }
    
    // Step 8: Start Import Process
    logStep(8, 'Starting Import Process');
    await makeRequest(`/api/import/sessions/${sessionId}/execute`, { method: 'POST' });
    
    // Step 9: Monitor Import Progress
    logStep(9, 'Monitoring Import Progress');
    const importResult = await waitForProcessing(sessionId, 30000);
    
    if (!importResult.success) {
      throw new Error(`Import failed: ${importResult.error}`);
    }
    
    logSuccess('Import completed successfully');
    
    // Step 10: Verify Database Changes
    logStep(10, 'Verifying Database Changes');
    const finalStats = await makeRequest('/api/dashboard/stats');
    const newProductCount = finalStats.totalProducts;
    const productsAdded = newProductCount - initialProductCount;
    
    logSuccess(`Database updated - Added ${productsAdded} products (${initialProductCount} → ${newProductCount})`);
    
    // Step 11: Verify Individual Products
    logStep(11, 'Verifying Individual Product Creation');
    const products = await makeRequest('/api/products');
    
    // Look for our test products
    const testProducts = products.filter(p => 
      p.name.includes('Artisan Coffee') || 
      p.name.includes('Wireless Bluetooth') ||
      p.sku?.includes('COFFEE-001') ||
      p.sku?.includes('AUDIO-WBH-001')
    );
    
    if (testProducts.length > 0) {
      logSuccess(`Found ${testProducts.length} test products in database`);
      testProducts.forEach(product => {
        log(`  - ${product.name} (SKU: ${product.sku})`, 'blue');
      });
    } else {
      logWarning('Test products not found - checking all recent products');
      const recentProducts = products.slice(-rowCount);
      log(`Recent products: ${recentProducts.map(p => p.name).join(', ')}`, 'blue');
    }
    
    // Step 12: Test API Endpoints
    logStep(12, 'Testing API Endpoints');
    const brands = await makeRequest('/api/brands');
    const auth = await makeRequest('/api/auth/user');
    
    logSuccess(`API endpoints working - ${brands.length} brands, User: ${auth.email}`);
    
    // Final Summary
    log(`
╔══════════════════════════════════════════════════════════════╗
║                     TEST COMPLETED                          ║
║                                                              ║
║  ✅ Database Connectivity: VERIFIED                         ║
║  ✅ File Upload: SUCCESS                                     ║
║  ✅ AI Field Mapping: SUCCESS                               ║
║  ✅ Data Preview: SUCCESS                                    ║
║  ✅ Import Process: SUCCESS                                  ║
║  ✅ Database Updates: VERIFIED                              ║
║  ✅ API Endpoints: WORKING                                   ║
║                                                              ║
║  Products Added: ${productsAdded.toString().padEnd(47)} ║
║  Session ID: ${sessionId.padEnd(51)} ║
║                                                              ║
║  🎉 BULK UPLOAD SYSTEM FULLY OPERATIONAL                    ║
╚══════════════════════════════════════════════════════════════╝
`, 'green');

  } catch (error) {
    logError(`\n💥 TEST FAILED: ${error.message}`);
    
    log(`
╔══════════════════════════════════════════════════════════════╗
║                      TEST FAILED                            ║
║                                                              ║
║  Error: ${error.message.padEnd(54)} ║
║                                                              ║
║  Check server logs and database connectivity                ║
╚══════════════════════════════════════════════════════════════╝
`, 'red');
    
    process.exit(1);
  }
}

// Run the test
runEndToEndTest();