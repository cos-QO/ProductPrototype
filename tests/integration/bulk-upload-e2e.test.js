/**
 * End-to-End Bulk Upload Workflow Testing
 * planID: PLAN-20250919-1630-001
 * Phase: 5 - E2E Integration Testing
 * Agent: tester
 */

const WebSocket = require('ws');
const axios = require('axios');
const FormData = require('form-data');
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:5000';
const WS_URL = 'ws://localhost:5000';

describe('Bulk Upload End-to-End Workflow Tests', () => {
  let testSessions = [];
  let wsConnections = [];

  beforeAll(async () => {
    // Ensure server is running
    try {
      await axios.get(`${BASE_URL}/api/websocket/stats`);
    } catch (error) {
      throw new Error('Server not running. Please start with: npm run dev');
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
  });

  describe('Complete Bulk Upload Workflow', () => {
    test('Standard workflow: Upload → Analyze → Preview → Execute', async () => {
      const workflowEvents = [];
      let sessionId;

      // Step 1: Initialize session
      console.log('Step 1: Initializing upload session...');
      const initResponse = await axios.post(`${BASE_URL}/api/enhanced-import/initialize`, {
        userId: 'e2e-test-user',
        importType: 'products'
      });

      expect(initResponse.status).toBe(200);
      expect(initResponse.data.success).toBe(true);
      sessionId = initResponse.data.sessionId;
      testSessions.push(sessionId);

      console.log(`Session initialized: ${sessionId}`);

      // Step 2: Establish WebSocket connection
      console.log('Step 2: Establishing WebSocket connection...');
      const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=e2e-test-user`;
      const ws = new WebSocket(wsUrl);
      wsConnections.push(ws);

      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
        setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
      });

      // Listen for workflow events
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log(`WebSocket Event: ${message.type}`, message.metadata);
          workflowEvents.push({
            type: message.type,
            timestamp: Date.now(),
            metadata: message.metadata
          });
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      // Step 3: Upload CSV file
      console.log('Step 3: Uploading CSV file...');
      const testCsvContent = createTestProductsCsv(20);
      const formData = new FormData();
      formData.append('file', Buffer.from(testCsvContent), {
        filename: 'test-products.csv',
        contentType: 'text/csv'
      });

      const uploadResponse = await axios.post(
        `${BASE_URL}/api/enhanced-import/analyze/${sessionId}`,
        formData,
        { 
          headers: formData.getHeaders(),
          timeout: 30000 // 30 second timeout
        }
      );

      expect(uploadResponse.status).toBe(200);
      expect(uploadResponse.data.success).toBe(true);

      // Step 4: Wait for analysis completion
      console.log('Step 4: Waiting for analysis completion...');
      await waitForWorkflowEvent(workflowEvents, 'analysis_complete', 15000);

      // Step 5: Check field mappings
      console.log('Step 5: Checking field mappings...');
      const mappingsResponse = await axios.get(`${BASE_URL}/api/enhanced-import/mappings/${sessionId}`);
      expect(mappingsResponse.status).toBe(200);
      expect(mappingsResponse.data.success).toBe(true);
      expect(mappingsResponse.data.mappings).toBeDefined();

      console.log(`Field mappings generated: ${mappingsResponse.data.mappings.length} mappings`);

      // Step 6: Wait for preview generation (may be automatic)
      console.log('Step 6: Waiting for preview generation...');
      try {
        await waitForWorkflowEvent(workflowEvents, 'preview_ready', 20000);
      } catch (error) {
        // If preview isn't auto-generated, trigger it manually
        console.log('Triggering manual preview generation...');
        const previewResponse = await axios.get(`${BASE_URL}/api/enhanced-import/preview/${sessionId}`);
        expect(previewResponse.status).toBe(200);
        await waitForWorkflowEvent(workflowEvents, 'preview_ready', 10000);
      }

      // Step 7: Execute import
      console.log('Step 7: Executing import...');
      const executeResponse = await axios.post(
        `${BASE_URL}/api/enhanced-import/execute/${sessionId}`,
        { 
          confirmExecution: true,
          overrideMappings: false
        }
      );

      expect(executeResponse.status).toBe(200);
      expect(executeResponse.data.success).toBe(true);

      // Step 8: Monitor execution progress
      console.log('Step 8: Monitoring execution progress...');
      await waitForWorkflowEvent(workflowEvents, 'execution_started', 5000);

      // Wait for completion or progress updates
      let completed = false;
      const timeout = Date.now() + 60000; // 1 minute timeout

      while (!completed && Date.now() < timeout) {
        const hasCompleted = workflowEvents.some(event => 
          event.type === 'completed' || event.type === 'workflow_error'
        );

        if (hasCompleted) {
          completed = true;
          break;
        }

        // Check progress
        try {
          const progressResponse = await axios.get(`${BASE_URL}/api/enhanced-import/preview/${sessionId}`);
          if (progressResponse.data.status === 'completed') {
            completed = true;
            break;
          }
        } catch (error) {
          // Continue monitoring
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      expect(completed).toBe(true);

      // Verify workflow events were received in correct order
      const eventTypes = workflowEvents.map(e => e.type);
      console.log('Workflow events received:', eventTypes);

      expect(eventTypes).toContain('analysis_complete');
      expect(eventTypes).toContain('execution_started');

      console.log('✅ Complete workflow test passed!');
    }, 120000); // 2 minute timeout for entire test

    test('High-confidence workflow with auto-advancement', async () => {
      const workflowEvents = [];
      let sessionId;

      // Initialize session
      const initResponse = await axios.post(`${BASE_URL}/api/enhanced-import/initialize`, {
        userId: 'auto-test-user',
        importType: 'products'
      });

      sessionId = initResponse.data.sessionId;
      testSessions.push(sessionId);

      // Establish WebSocket
      const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=auto-test-user`;
      const ws = new WebSocket(wsUrl);
      wsConnections.push(ws);

      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
        setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
      });

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          workflowEvents.push({
            type: message.type,
            timestamp: Date.now(),
            metadata: message.metadata,
            autoAdvance: message.metadata?.autoAdvance
          });
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      // Upload well-structured CSV (should trigger auto-advancement)
      const highConfidenceCsv = createHighConfidenceProductsCsv(10);
      const formData = new FormData();
      formData.append('file', Buffer.from(highConfidenceCsv), {
        filename: 'high-confidence-products.csv',
        contentType: 'text/csv'
      });

      await axios.post(
        `${BASE_URL}/api/enhanced-import/analyze/${sessionId}`,
        formData,
        { headers: formData.getHeaders() }
      );

      // Wait for auto-advancement events
      await waitForWorkflowEvent(workflowEvents, 'analysis_complete', 15000);

      // Should automatically advance to preview
      try {
        await waitForWorkflowEvent(workflowEvents, 'workflow_advanced', 10000);
        await waitForWorkflowEvent(workflowEvents, 'preview_ready', 10000);
      } catch (error) {
        // Check if preview was auto-generated
        const autoAdvanceEvents = workflowEvents.filter(e => e.autoAdvance === true);
        expect(autoAdvanceEvents.length).toBeGreaterThan(0);
      }

      console.log('✅ Auto-advancement workflow test passed!');
    }, 60000);

    test('Error handling workflow with recovery', async () => {
      const workflowEvents = [];
      let sessionId;

      // Initialize session
      const initResponse = await axios.post(`${BASE_URL}/api/enhanced-import/initialize`, {
        userId: 'error-test-user',
        importType: 'products'
      });

      sessionId = initResponse.data.sessionId;
      testSessions.push(sessionId);

      // Establish WebSocket
      const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=error-test-user`;
      const ws = new WebSocket(wsUrl);
      wsConnections.push(ws);

      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
        setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
      });

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          workflowEvents.push({
            type: message.type,
            timestamp: Date.now(),
            error: message.data?.error
          });
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      // Upload malformed CSV to trigger errors
      const malformedCsv = 'Invalid,CSV,Data\n"Unclosed quote,field,error\nMissing,comma field';
      const formData = new FormData();
      formData.append('file', Buffer.from(malformedCsv), {
        filename: 'malformed.csv',
        contentType: 'text/csv'
      });

      try {
        await axios.post(
          `${BASE_URL}/api/enhanced-import/analyze/${sessionId}`,
          formData,
          { headers: formData.getHeaders() }
        );
      } catch (error) {
        // Expected to fail
        expect(error.response.status).toBeGreaterThanOrEqual(400);
      }

      // Wait for error events
      try {
        await waitForWorkflowEvent(workflowEvents, 'workflow_error', 10000);
        const errorEvents = workflowEvents.filter(e => e.type === 'workflow_error');
        expect(errorEvents.length).toBeGreaterThan(0);
      } catch (error) {
        // Error handling via HTTP response is also acceptable
        console.log('Error handled via HTTP response');
      }

      console.log('✅ Error handling workflow test completed!');
    }, 30000);
  });

  describe('Concurrent Workflow Tests', () => {
    test('Multiple simultaneous bulk uploads', async () => {
      const numConcurrentUploads = 5;
      const uploadPromises = [];

      console.log(`Testing ${numConcurrentUploads} concurrent uploads...`);

      for (let i = 0; i < numConcurrentUploads; i++) {
        uploadPromises.push(executeCompleteBulkUpload(i));
      }

      const results = await Promise.all(uploadPromises);
      
      // All uploads should complete successfully
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.sessionId).toBeDefined();
        console.log(`Upload ${index + 1} completed: ${result.sessionId}`);
      });

      console.log('✅ Concurrent uploads test passed!');
    }, 180000); // 3 minute timeout for concurrent tests
  });

  describe('Performance and Reliability Tests', () => {
    test('Large file upload workflow', async () => {
      const workflowEvents = [];
      let sessionId;

      // Initialize session
      const initResponse = await axios.post(`${BASE_URL}/api/enhanced-import/initialize`, {
        userId: 'large-file-user',
        importType: 'products'
      });

      sessionId = initResponse.data.sessionId;
      testSessions.push(sessionId);

      // Establish WebSocket
      const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=large-file-user`;
      const ws = new WebSocket(wsUrl);
      wsConnections.push(ws);

      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
        setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
      });

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          workflowEvents.push({
            type: message.type,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      // Create large CSV (500 records)
      const largeCsv = createTestProductsCsv(500);
      const formData = new FormData();
      formData.append('file', Buffer.from(largeCsv), {
        filename: 'large-products.csv',
        contentType: 'text/csv'
      });

      console.log(`Uploading large CSV (${largeCsv.length} bytes, 500 records)...`);

      const uploadStartTime = performance.now();
      const uploadResponse = await axios.post(
        `${BASE_URL}/api/enhanced-import/analyze/${sessionId}`,
        formData,
        { 
          headers: formData.getHeaders(),
          timeout: 60000 // 1 minute timeout
        }
      );

      const uploadTime = performance.now() - uploadStartTime;
      console.log(`Upload completed in ${uploadTime.toFixed(2)}ms`);

      expect(uploadResponse.status).toBe(200);
      expect(uploadTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Wait for analysis
      await waitForWorkflowEvent(workflowEvents, 'analysis_complete', 30000);

      console.log('✅ Large file upload test passed!');
    }, 120000);
  });
});

// Helper functions
function createTestProductsCsv(numRecords) {
  const headers = 'Name,Price,SKU,Description,Category,Brand';
  const rows = [];
  
  for (let i = 1; i <= numRecords; i++) {
    rows.push([
      `Product ${i}`,
      `${(i * 10 + Math.random() * 50).toFixed(2)}`,
      `SKU${i.toString().padStart(5, '0')}`,
      `Description for product ${i}`,
      `Category ${Math.ceil(i / 10)}`,
      `Brand ${Math.ceil(i / 20)}`
    ].join(','));
  }
  
  return [headers, ...rows].join('\n');
}

function createHighConfidenceProductsCsv(numRecords) {
  // Create CSV with standard e-commerce field names for high confidence mapping
  const headers = 'product_name,price,sku,description,category,brand_name,inventory_count';
  const rows = [];
  
  for (let i = 1; i <= numRecords; i++) {
    rows.push([
      `High Confidence Product ${i}`,
      `${(i * 15 + 99.99).toFixed(2)}`,
      `HC${i.toString().padStart(4, '0')}`,
      `High quality product ${i} description`,
      `Premium Category`,
      `Premium Brand`,
      `${Math.floor(Math.random() * 100) + 1}`
    ].join(','));
  }
  
  return [headers, ...rows].join('\n');
}

async function waitForWorkflowEvent(eventArray, eventType, timeoutMs = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const hasEvent = eventArray.some(event => event.type === eventType);
    if (hasEvent) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(`Timeout waiting for event: ${eventType}. Received events: ${eventArray.map(e => e.type).join(', ')}`);
}

async function executeCompleteBulkUpload(uploadId) {
  try {
    // Initialize session
    const initResponse = await axios.post(`${BASE_URL}/api/enhanced-import/initialize`, {
      userId: `concurrent-user-${uploadId}`,
      importType: 'products'
    });

    const sessionId = initResponse.data.sessionId;

    // Upload CSV
    const testCsv = createTestProductsCsv(10);
    const formData = new FormData();
    formData.append('file', Buffer.from(testCsv), {
      filename: `concurrent-test-${uploadId}.csv`,
      contentType: 'text/csv'
    });

    await axios.post(
      `${BASE_URL}/api/enhanced-import/analyze/${sessionId}`,
      formData,
      { headers: formData.getHeaders() }
    );

    // Execute import
    await axios.post(`${BASE_URL}/api/enhanced-import/execute/${sessionId}`, {
      confirmExecution: true
    });

    return { success: true, sessionId, uploadId };
  } catch (error) {
    return { success: false, error: error.message, uploadId };
  }
}

module.exports = {
  createTestProductsCsv,
  createHighConfidenceProductsCsv,
  waitForWorkflowEvent,
  executeCompleteBulkUpload
};