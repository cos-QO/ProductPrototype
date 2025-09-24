/**
 * End-to-End Error Recovery Workflow Testing
 * Tests the complete error recovery system from upload to resolution
 * 
 * TESTING SCOPE:
 * - Complete error recovery user journey
 * - Integration between ErrorRecoveryDialog and backend APIs
 * - Error resolution workflow validation
 * - State management during error recovery
 */

const WebSocket = require('ws');
const axios = require('axios');
const FormData = require('form-data');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const WS_URL = 'ws://localhost:5000';

describe('Error Recovery End-to-End Workflow Tests', () => {
  let testSessions = [];
  let wsConnections = [];
  let authToken = null;

  beforeAll(async () => {
    // Ensure server is running
    try {
      await axios.get(`${BASE_URL}/api/websocket/stats`);
    } catch (error) {
      throw new Error('Server not running. Please start with: npm run dev');
    }

    // Create test user and get auth token
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'local-dev-user@example.com',
        password: 'testpassword'
      });
      authToken = response.data.token;
    } catch (error) {
      console.log('Using dev mode authentication');
      authToken = 'dev-token';
    }
  });

  afterEach(async () => {
    // Clean up WebSocket connections
    await Promise.all(wsConnections.map(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
        return new Promise(resolve => {
          ws.onclose = resolve;
          setTimeout(resolve, 1000);
        });
      }
      return Promise.resolve();
    }));
    wsConnections = [];

    // Clean up test sessions
    for (const sessionId of testSessions) {
      try {
        await axios.delete(`${BASE_URL}/api/import/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      } catch (error) {
        // Session might already be cleaned up
      }
    }
    testSessions = [];
  });

  describe('Complete Error Recovery Workflow', () => {
    test('Upload with errors → Error Recovery Dialog → Fix errors → Continue import', async () => {
      console.log('🧪 Testing complete error recovery workflow...');

      // Step 1: Create CSV file with validation errors
      const csvContent = `name,price,sku,description,inventory
Product A,invalid_price,SKU001,Description A,10
Product B,29.99,INVALID SKU WITH SPACES,Description B,invalid_inventory
Product C,39.99,SKU003,,15
,49.99,SKU004,Description D,20
Product E,59.99,SKU005,Description E,`;

      const csvFilePath = path.join(__dirname, '../fixtures/test-errors.csv');
      fs.writeFileSync(csvFilePath, csvContent);

      let sessionId;
      let uploadResponse;

      try {
        // Step 2: Initialize upload session
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvFilePath));
        formData.append('type', 'products');

        uploadResponse = await axios.post(`${BASE_URL}/api/import/upload`, formData, {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${authToken}`
          }
        });

        expect(uploadResponse.status).toBe(200);
        expect(uploadResponse.data.success).toBe(true);
        sessionId = uploadResponse.data.sessionId;
        testSessions.push(sessionId);

        console.log(`✓ Upload session created: ${sessionId}`);

        // Step 3: Analyze data (should detect errors)
        const analysisResponse = await axios.post(`${BASE_URL}/api/import/analyze`, {
          sessionId: sessionId,
          mappings: {
            name: 'name',
            price: 'price',
            sku: 'sku',
            description: 'description',
            inventory: 'inventory'
          }
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        expect(analysisResponse.status).toBe(200);
        expect(analysisResponse.data.errors).toBeDefined();
        expect(analysisResponse.data.errors.length).toBeGreaterThan(0);

        console.log(`✓ Analysis complete - Found ${analysisResponse.data.errors.length} errors`);

        // Step 4: Get error recovery status
        const statusResponse = await axios.get(`${BASE_URL}/api/recovery/${sessionId}/status`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        expect(statusResponse.status).toBe(200);
        console.log(`✓ Error recovery status retrieved`);

        // Step 5: Fix single error - invalid price
        const priceError = analysisResponse.data.errors.find(e => 
          e.field === 'price' && e.value === 'invalid_price'
        );
        
        if (priceError) {
          const fixSingleResponse = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, {
            recordIndex: priceError.recordIndex,
            field: 'price',
            newValue: '19.99'
          }, {
            headers: { Authorization: `Bearer ${authToken}` }
          });

          expect(fixSingleResponse.status).toBe(200);
          expect(fixSingleResponse.data.success).toBe(true);
          console.log(`✓ Fixed single error - price corrected to 19.99`);
        }

        // Step 6: Fix bulk errors - fix all invalid inventory values
        const inventoryErrors = analysisResponse.data.errors.filter(e => 
          e.field === 'inventory' && e.rule === 'type'
        );

        if (inventoryErrors.length > 0) {
          const bulkFixes = inventoryErrors.map(error => ({
            recordIndex: error.recordIndex,
            field: 'inventory',
            newValue: '0' // Set invalid inventory to 0
          }));

          const fixBulkResponse = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-bulk`, {
            fixes: bulkFixes
          }, {
            headers: { Authorization: `Bearer ${authToken}` }
          });

          expect(fixBulkResponse.status).toBe(200);
          expect(fixBulkResponse.data.success).toBe(true);
          console.log(`✓ Fixed ${bulkFixes.length} inventory errors in bulk`);
        }

        // Step 7: Re-analyze to verify errors are fixed
        const reAnalysisResponse = await axios.post(`${BASE_URL}/api/import/analyze`, {
          sessionId: sessionId,
          mappings: {
            name: 'name',
            price: 'price',
            sku: 'sku',
            description: 'description',
            inventory: 'inventory'
          }
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        expect(reAnalysisResponse.status).toBe(200);
        
        // Should have fewer errors now
        const originalErrorCount = analysisResponse.data.errors.length;
        const newErrorCount = reAnalysisResponse.data.errors.length;
        expect(newErrorCount).toBeLessThan(originalErrorCount);
        console.log(`✓ Error count reduced from ${originalErrorCount} to ${newErrorCount}`);

        // Step 8: Execute import with remaining valid data
        const executeResponse = await axios.post(`${BASE_URL}/api/import/execute`, {
          sessionId: sessionId
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        expect(executeResponse.status).toBe(200);
        console.log(`✓ Import executed successfully with corrected data`);

      } finally {
        // Clean up test file
        if (fs.existsSync(csvFilePath)) {
          fs.unlinkSync(csvFilePath);
        }
      }
    }, 60000); // 60 second timeout

    test('Auto-fix suggestions and application', async () => {
      console.log('🧪 Testing auto-fix suggestions...');

      // Create CSV with fixable errors
      const csvContent = `name,email,price,sku
"John Doe",john@EXAMPLE.COM,25.99,sku001
"Jane Smith"," jane@test.com ",39.99,sku002
"Bob Johnson",bob@test.com,invalid,sku003`;

      const csvFilePath = path.join(__dirname, '../fixtures/test-autofix.csv');
      fs.writeFileSync(csvFilePath, csvContent);

      let sessionId;

      try {
        // Upload and analyze
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvFilePath));
        formData.append('type', 'customers');

        const uploadResponse = await axios.post(`${BASE_URL}/api/import/upload`, formData, {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${authToken}`
          }
        });

        sessionId = uploadResponse.data.sessionId;
        testSessions.push(sessionId);

        // Get auto-fix suggestions
        const suggestionsResponse = await axios.get(`${BASE_URL}/api/recovery/${sessionId}/suggestions`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        expect(suggestionsResponse.status).toBe(200);
        expect(suggestionsResponse.data.suggestions).toBeDefined();
        console.log(`✓ Auto-fix suggestions generated`);

        // Apply auto-fixes
        const autoFixResponse = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/auto-fix`, {
          fixes: [
            { type: 'trim_whitespace', field: 'email' },
            { type: 'normalize_case', field: 'email', case: 'lower' }
          ]
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        expect(autoFixResponse.status).toBe(200);
        expect(autoFixResponse.data.success).toBe(true);
        console.log(`✓ Auto-fixes applied successfully`);

      } finally {
        if (fs.existsSync(csvFilePath)) {
          fs.unlinkSync(csvFilePath);
        }
      }
    }, 30000);
  });

  describe('Error Recovery API Integration', () => {
    test('Error recovery session lifecycle', async () => {
      console.log('🧪 Testing error recovery session lifecycle...');

      // Create test data with errors
      const csvContent = `name,price
Product A,invalid
Product B,29.99`;

      const csvFilePath = path.join(__dirname, '../fixtures/test-lifecycle.csv');
      fs.writeFileSync(csvFilePath, csvContent);

      let sessionId;

      try {
        // Upload and analyze to create errors
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvFilePath));
        formData.append('type', 'products');

        const uploadResponse = await axios.post(`${BASE_URL}/api/import/upload`, formData, {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${authToken}`
          }
        });

        sessionId = uploadResponse.data.sessionId;
        testSessions.push(sessionId);

        const analysisResponse = await axios.post(`${BASE_URL}/api/import/analyze`, {
          sessionId: sessionId,
          mappings: { name: 'name', price: 'price' }
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        const errors = analysisResponse.data.errors;

        // Test 1: Create recovery session
        const createResponse = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/create`, {
          errors: errors,
          options: { trackHistory: true }
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        expect(createResponse.status).toBe(200);
        expect(createResponse.data.recoverySessionId).toBeDefined();
        const recoverySessionId = createResponse.data.recoverySessionId;

        console.log(`✓ Recovery session created: ${recoverySessionId}`);

        // Test 2: Get recovery session details
        const sessionResponse = await axios.get(`${BASE_URL}/api/recovery/session/${recoverySessionId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        expect(sessionResponse.status).toBe(200);
        expect(sessionResponse.data.session.sessionId).toBe(sessionId);
        console.log(`✓ Recovery session details retrieved`);

        // Test 3: Execute recovery plan
        const executeResponse = await axios.post(`${BASE_URL}/api/recovery/session/${recoverySessionId}/execute`, {
          selectedFixes: [
            { recordIndex: 0, field: 'price', newValue: '19.99' }
          ]
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        expect(executeResponse.status).toBe(200);
        expect(executeResponse.data.success).toBe(true);
        console.log(`✓ Recovery plan executed successfully`);

      } finally {
        if (fs.existsSync(csvFilePath)) {
          fs.unlinkSync(csvFilePath);
        }
      }
    }, 30000);
  });

  describe('Error Recovery Performance', () => {
    test('Performance with large dataset error recovery', async () => {
      console.log('🧪 Testing error recovery performance with large dataset...');

      // Generate large CSV with errors scattered throughout
      const rows = [];
      rows.push('name,price,sku,inventory');
      
      for (let i = 1; i <= 1000; i++) {
        const hasError = i % 100 === 0; // Every 100th record has an error
        const price = hasError ? 'invalid_price' : `${(i * 0.99).toFixed(2)}`;
        rows.push(`Product ${i},${price},SKU${i.toString().padStart(4, '0')},${i}`);
      }

      const csvContent = rows.join('\n');
      const csvFilePath = path.join(__dirname, '../fixtures/test-performance.csv');
      fs.writeFileSync(csvFilePath, csvContent);

      let sessionId;
      const startTime = performance.now();

      try {
        // Upload large file
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvFilePath));
        formData.append('type', 'products');

        const uploadResponse = await axios.post(`${BASE_URL}/api/import/upload`, formData, {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${authToken}`
          }
        });

        sessionId = uploadResponse.data.sessionId;
        testSessions.push(sessionId);

        // Analyze (should find ~10 errors)
        const analysisResponse = await axios.post(`${BASE_URL}/api/import/analyze`, {
          sessionId: sessionId,
          mappings: {
            name: 'name',
            price: 'price',
            sku: 'sku',
            inventory: 'inventory'
          }
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        const errors = analysisResponse.data.errors;
        console.log(`✓ Analysis found ${errors.length} errors in 1000 records`);

        // Bulk fix all price errors
        const bulkFixStart = performance.now();
        const priceErrors = errors.filter(e => e.field === 'price');
        const bulkFixes = priceErrors.map(error => ({
          recordIndex: error.recordIndex,
          field: 'price',
          newValue: '99.99'
        }));

        const bulkFixResponse = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-bulk`, {
          fixes: bulkFixes
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        const bulkFixTime = performance.now() - bulkFixStart;

        expect(bulkFixResponse.status).toBe(200);
        expect(bulkFixResponse.data.success).toBe(true);

        const totalTime = performance.now() - startTime;

        // Performance assertions
        expect(bulkFixTime).toBeLessThan(5000); // Bulk fix should take < 5 seconds
        expect(totalTime).toBeLessThan(30000);  // Total process should take < 30 seconds

        console.log(`✓ Performance test completed:`);
        console.log(`  - Bulk fix time: ${bulkFixTime.toFixed(2)}ms`);
        console.log(`  - Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`  - Records processed: 1000`);
        console.log(`  - Errors fixed: ${bulkFixes.length}`);

      } finally {
        if (fs.existsSync(csvFilePath)) {
          fs.unlinkSync(csvFilePath);
        }
      }
    }, 120000); // 2 minute timeout for performance test
  });

  describe('Error Recovery Edge Cases', () => {
    test('Invalid session ID handling', async () => {
      const invalidSessionId = 'invalid-session-123';

      const response = await axios.get(`${BASE_URL}/api/recovery/${invalidSessionId}/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => err.response);

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });

    test('Malformed fix request handling', async () => {
      // Create a real session first
      const csvContent = 'name,price\nTest,invalid';
      const csvFilePath = path.join(__dirname, '../fixtures/test-malformed.csv');
      fs.writeFileSync(csvFilePath, csvContent);

      let sessionId;

      try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvFilePath));
        formData.append('type', 'products');

        const uploadResponse = await axios.post(`${BASE_URL}/api/import/upload`, formData, {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${authToken}`
          }
        });

        sessionId = uploadResponse.data.sessionId;
        testSessions.push(sessionId);

        // Test malformed fix request
        const malformedResponse = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, {
          recordIndex: 'invalid',
          field: '',
          newValue: null
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        }).catch(err => err.response);

        expect(malformedResponse.status).toBe(400);
        expect(malformedResponse.data.success).toBe(false);

      } finally {
        if (fs.existsSync(csvFilePath)) {
          fs.unlinkSync(csvFilePath);
        }
      }
    });

    test('Concurrent error recovery operations', async () => {
      console.log('🧪 Testing concurrent error recovery operations...');

      // Create test data
      const csvContent = `name,price,inventory
Product A,invalid1,10
Product B,invalid2,20
Product C,invalid3,30`;

      const csvFilePath = path.join(__dirname, '../fixtures/test-concurrent.csv');
      fs.writeFileSync(csvFilePath, csvContent);

      let sessionId;

      try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvFilePath));
        formData.append('type', 'products');

        const uploadResponse = await axios.post(`${BASE_URL}/api/import/upload`, formData, {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${authToken}`
          }
        });

        sessionId = uploadResponse.data.sessionId;
        testSessions.push(sessionId);

        await axios.post(`${BASE_URL}/api/import/analyze`, {
          sessionId: sessionId,
          mappings: { name: 'name', price: 'price', inventory: 'inventory' }
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        // Execute concurrent fix operations
        const concurrentFixes = [
          axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, {
            recordIndex: 0, field: 'price', newValue: '19.99'
          }, { headers: { Authorization: `Bearer ${authToken}` } }),
          
          axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, {
            recordIndex: 1, field: 'price', newValue: '29.99'
          }, { headers: { Authorization: `Bearer ${authToken}` } }),
          
          axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, {
            recordIndex: 2, field: 'price', newValue: '39.99'
          }, { headers: { Authorization: `Bearer ${authToken}` } })
        ];

        const results = await Promise.all(concurrentFixes);

        // All concurrent operations should succeed
        results.forEach((response, index) => {
          expect(response.status).toBe(200);
          expect(response.data.success).toBe(true);
          console.log(`✓ Concurrent fix ${index + 1} completed successfully`);
        });

      } finally {
        if (fs.existsSync(csvFilePath)) {
          fs.unlinkSync(csvFilePath);
        }
      }
    }, 30000);
  });
});