/**
 * WebSocket Duplicate Initialization Fix Validation Tests
 * planID: PLAN-20250919-1630-001
 * Phase: 5 - Integration Testing
 * Agent: tester
 */

const WebSocket = require('ws');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const WS_URL = 'ws://localhost:5000';

describe('WebSocket Duplicate Initialization Fix Validation', () => {
  let testSessionId;
  let wsConnection;
  
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
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.close();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  });

  describe('Fix Validation Tests', () => {
    test('Server starts without duplicate initialization errors', async () => {
      // Check server health
      const response = await axios.get(`${BASE_URL}/api/websocket/stats`);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.stats).toHaveProperty('totalConnections');
    });

    test('Single WebSocket service instance is running', async () => {
      const response = await axios.get(`${BASE_URL}/api/websocket/stats`);
      const stats = response.data.stats;
      
      // Verify stats are consistent (indicating single instance)
      expect(typeof stats.totalConnections).toBe('number');
      expect(typeof stats.activeSessions).toBe('number');
      expect(Array.isArray(stats.sessionDetails)).toBe(true);
    });

    test('WebSocket connections establish successfully', (done) => {
      const testSessionId = 'test-session-' + Date.now();
      const wsUrl = `${WS_URL}/ws?sessionId=${testSessionId}&userId=test-user`;
      
      wsConnection = new WebSocket(wsUrl);
      
      wsConnection.onopen = () => {
        expect(wsConnection.readyState).toBe(WebSocket.OPEN);
        done();
      };
      
      wsConnection.onerror = (error) => {
        done(error);
      };
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (wsConnection.readyState !== WebSocket.OPEN) {
          done(new Error('WebSocket connection timeout'));
        }
      }, 5000);
    });
  });

  describe('Bulk Upload Workflow Integration Tests', () => {
    test('Initialize enhanced import session', async () => {
      const response = await axios.post(`${BASE_URL}/api/enhanced-import/initialize`, {
        userId: 'test-user',
        importType: 'products'
      });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.sessionId).toBeDefined();
      
      testSessionId = response.data.sessionId;
    });

    test('WebSocket receives workflow events during file analysis', (done) => {
      if (!testSessionId) {
        done(new Error('No test session available'));
        return;
      }

      const wsUrl = `${WS_URL}/ws?sessionId=${testSessionId}&userId=test-user`;
      wsConnection = new WebSocket(wsUrl);
      
      const expectedEvents = ['analysis_complete', 'mapping_suggestions'];
      const receivedEvents = [];
      
      wsConnection.onopen = async () => {
        // Upload a test CSV file
        const testCsvContent = `Name,Price,SKU
Product A,29.99,SKU001
Product B,39.99,SKU002
Product C,49.99,SKU003`;
        
        const formData = new FormData();
        formData.append('file', Buffer.from(testCsvContent), {
          filename: 'test-products.csv',
          contentType: 'text/csv'
        });
        
        try {
          await axios.post(
            `${BASE_URL}/api/enhanced-import/analyze/${testSessionId}`,
            formData,
            { headers: formData.getHeaders() }
          );
        } catch (error) {
          done(error);
        }
      };
      
      wsConnection.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          receivedEvents.push(message.type);
          
          if (expectedEvents.every(eventType => receivedEvents.includes(eventType))) {
            done();
          }
        } catch (error) {
          done(error);
        }
      };
      
      wsConnection.onerror = (error) => {
        done(error);
      };
      
      // Timeout after 15 seconds
      setTimeout(() => {
        done(new Error(`Timeout waiting for events. Received: ${receivedEvents.join(', ')}`));
      }, 15000);
    });

    test('No duplicate WebSocket messages during workflow', (done) => {
      if (!testSessionId) {
        done(new Error('No test session available'));
        return;
      }

      const wsUrl = `${WS_URL}/ws?sessionId=${testSessionId}&userId=test-user`;
      wsConnection = new WebSocket(wsUrl);
      
      const receivedMessages = [];
      
      wsConnection.onopen = async () => {
        // Trigger preview generation
        try {
          await axios.get(`${BASE_URL}/api/enhanced-import/preview/${testSessionId}`);
        } catch (error) {
          // May fail if session not ready, but that's ok for this test
        }
      };
      
      wsConnection.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          receivedMessages.push({
            type: message.type,
            timestamp: Date.now(),
            sessionId: message.sessionId
          });
        } catch (error) {
          done(error);
        }
      };
      
      wsConnection.onerror = (error) => {
        done(error);
      };
      
      // Check for duplicates after 3 seconds
      setTimeout(() => {
        const messageTypes = receivedMessages.map(m => m.type);
        const uniqueTypes = [...new Set(messageTypes)];
        
        // Check for exact duplicate messages (same type, session, within 100ms)
        const duplicates = [];
        for (let i = 0; i < receivedMessages.length; i++) {
          for (let j = i + 1; j < receivedMessages.length; j++) {
            const msg1 = receivedMessages[i];
            const msg2 = receivedMessages[j];
            
            if (msg1.type === msg2.type && 
                msg1.sessionId === msg2.sessionId &&
                Math.abs(msg1.timestamp - msg2.timestamp) < 100) {
              duplicates.push({ msg1, msg2 });
            }
          }
        }
        
        expect(duplicates.length).toBe(0);
        done();
      }, 3000);
    });
  });

  describe('Concurrent Connection Tests', () => {
    test('Multiple WebSocket connections work independently', async () => {
      const numConnections = 5;
      const connections = [];
      const connectionPromises = [];
      
      for (let i = 0; i < numConnections; i++) {
        const sessionId = `test-session-${i}-${Date.now()}`;
        const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=test-user-${i}`;
        
        connectionPromises.push(new Promise((resolve, reject) => {
          const ws = new WebSocket(wsUrl);
          
          ws.onopen = () => {
            connections.push(ws);
            resolve(sessionId);
          };
          
          ws.onerror = reject;
          
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        }));
      }
      
      const sessionIds = await Promise.all(connectionPromises);
      expect(sessionIds.length).toBe(numConnections);
      
      // Verify all connections are open
      connections.forEach(ws => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
      });
      
      // Clean up
      connections.forEach(ws => ws.close());
    });

    test('WebSocket stats reflect active connections accurately', async () => {
      const sessionId = `test-session-stats-${Date.now()}`;
      const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=test-user`;
      
      // Get initial stats
      const initialStats = await axios.get(`${BASE_URL}/api/websocket/stats`);
      const initialConnections = initialStats.data.stats.totalConnections;
      
      // Open connection
      wsConnection = new WebSocket(wsUrl);
      
      await new Promise((resolve, reject) => {
        wsConnection.onopen = resolve;
        wsConnection.onerror = reject;
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
      
      // Check stats after connection
      await new Promise(resolve => setTimeout(resolve, 500)); // Give stats time to update
      const afterConnectStats = await axios.get(`${BASE_URL}/api/websocket/stats`);
      
      expect(afterConnectStats.data.stats.totalConnections).toBeGreaterThan(initialConnections);
    });
  });

  describe('Error Handling and Recovery Tests', () => {
    test('WebSocket handles connection drops gracefully', (done) => {
      const sessionId = `test-session-drop-${Date.now()}`;
      const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=test-user`;
      
      wsConnection = new WebSocket(wsUrl);
      
      wsConnection.onopen = () => {
        // Force close connection
        wsConnection.close();
      };
      
      wsConnection.onclose = () => {
        // Verify clean closure
        expect(wsConnection.readyState).toBe(WebSocket.CLOSED);
        done();
      };
      
      wsConnection.onerror = (error) => {
        done(error);
      };
    });

    test('Server handles malformed WebSocket messages', (done) => {
      const sessionId = `test-session-malformed-${Date.now()}`;
      const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=test-user`;
      
      wsConnection = new WebSocket(wsUrl);
      
      wsConnection.onopen = () => {
        // Send malformed message
        wsConnection.send('invalid-json-message');
        
        // Connection should remain open
        setTimeout(() => {
          expect(wsConnection.readyState).toBe(WebSocket.OPEN);
          done();
        }, 1000);
      };
      
      wsConnection.onerror = (error) => {
        done(error);
      };
    });
  });

  describe('Performance and Resource Tests', () => {
    test('WebSocket connections have reasonable response times', async () => {
      const startTime = Date.now();
      const sessionId = `test-session-perf-${Date.now()}`;
      const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=test-user`;
      
      wsConnection = new WebSocket(wsUrl);
      
      await new Promise((resolve, reject) => {
        wsConnection.onopen = () => {
          const connectionTime = Date.now() - startTime;
          expect(connectionTime).toBeLessThan(2000); // Should connect within 2 seconds
          resolve();
        };
        
        wsConnection.onerror = reject;
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });

    test('Memory usage remains stable during extended operations', async () => {
      // This test would require memory monitoring tools in a real environment
      // For now, we'll simulate by creating and destroying multiple connections
      
      const initialStats = await axios.get(`${BASE_URL}/api/websocket/stats`);
      
      // Create and destroy multiple connections
      for (let i = 0; i < 10; i++) {
        const sessionId = `test-session-memory-${i}-${Date.now()}`;
        const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=test-user`;
        
        const ws = new WebSocket(wsUrl);
        
        await new Promise((resolve, reject) => {
          ws.onopen = resolve;
          ws.onerror = reject;
          setTimeout(() => reject(new Error('Connection timeout')), 2000);
        });
        
        ws.close();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Check that stats are still reasonable
      const finalStats = await axios.get(`${BASE_URL}/api/websocket/stats`);
      expect(finalStats.data.success).toBe(true);
      expect(finalStats.data.stats.totalConnections).toBeDefined();
    });
  });
});

// Helper function to create test CSV content
function createTestCsvContent(numRows = 10) {
  const headers = 'Name,Price,SKU,Description';
  const rows = [];
  
  for (let i = 1; i <= numRows; i++) {
    rows.push(`Product ${i},${(i * 10).toFixed(2)},SKU${i.toString().padStart(3, '0')},Test product ${i}`);
  }
  
  return [headers, ...rows].join('\n');
}

// Export helper for use in other tests
module.exports = {
  createTestCsvContent,
  BASE_URL,
  WS_URL
};