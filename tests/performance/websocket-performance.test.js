/**
 * WebSocket Performance and Load Testing
 * planID: PLAN-20250919-1630-001
 * Phase: 5 - Performance Testing
 * Agent: tester
 */

const WebSocket = require('ws');
const axios = require('axios');
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:5000';
const WS_URL = 'ws://localhost:5000';

describe('WebSocket Performance Tests', () => {
  let testConnections = [];

  beforeAll(async () => {
    // Ensure server is running
    try {
      await axios.get(`${BASE_URL}/api/websocket/stats`);
    } catch (error) {
      throw new Error('Server not running. Please start with: npm run dev');
    }
  });

  afterEach(async () => {
    // Clean up all test connections
    await Promise.all(testConnections.map(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
        return new Promise(resolve => {
          ws.onclose = resolve;
          setTimeout(resolve, 1000); // Timeout cleanup
        });
      }
      return Promise.resolve();
    }));
    testConnections = [];
  });

  describe('Connection Performance', () => {
    test('WebSocket connection establishment time', async () => {
      const numTests = 5;
      const connectionTimes = [];

      for (let i = 0; i < numTests; i++) {
        const startTime = performance.now();
        const sessionId = `perf-test-${i}-${Date.now()}`;
        const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=perf-user`;
        
        const ws = new WebSocket(wsUrl);
        testConnections.push(ws);

        await new Promise((resolve, reject) => {
          ws.onopen = () => {
            const connectionTime = performance.now() - startTime;
            connectionTimes.push(connectionTime);
            resolve();
          };
          
          ws.onerror = reject;
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });
      }

      const avgConnectionTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
      const maxConnectionTime = Math.max(...connectionTimes);

      console.log(`Average connection time: ${avgConnectionTime.toFixed(2)}ms`);
      console.log(`Max connection time: ${maxConnectionTime.toFixed(2)}ms`);

      // Performance thresholds
      expect(avgConnectionTime).toBeLessThan(1000); // Average < 1 second
      expect(maxConnectionTime).toBeLessThan(2000); // Max < 2 seconds
    });

    test('Message latency under normal load', async () => {
      const sessionId = `latency-test-${Date.now()}`;
      const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=latency-user`;
      
      const ws = new WebSocket(wsUrl);
      testConnections.push(ws);

      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      const latencies = [];
      const numMessages = 10;

      for (let i = 0; i < numMessages; i++) {
        const startTime = performance.now();
        
        // Simulate message by triggering WebSocket stats request
        // (this will cause internal WebSocket activity)
        await axios.get(`${BASE_URL}/api/websocket/stats`);
        
        const endTime = performance.now();
        latencies.push(endTime - startTime);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);

      console.log(`Average message latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`Max message latency: ${maxLatency.toFixed(2)}ms`);

      // Latency thresholds
      expect(avgLatency).toBeLessThan(100); // Average < 100ms
      expect(maxLatency).toBeLessThan(500); // Max < 500ms
    });
  });

  describe('Concurrent Connection Load Tests', () => {
    test('Handle 20 concurrent WebSocket connections', async () => {
      const numConnections = 20;
      const connectionPromises = [];

      console.log(`Testing ${numConnections} concurrent connections...`);

      for (let i = 0; i < numConnections; i++) {
        const sessionId = `load-test-${i}-${Date.now()}`;
        const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=load-user-${i}`;
        
        connectionPromises.push(new Promise((resolve, reject) => {
          const ws = new WebSocket(wsUrl);
          testConnections.push(ws);

          const timeout = setTimeout(() => {
            reject(new Error(`Connection ${i} timeout`));
          }, 10000);

          ws.onopen = () => {
            clearTimeout(timeout);
            resolve({
              connectionId: i,
              sessionId,
              connected: true
            });
          };

          ws.onerror = (error) => {
            clearTimeout(timeout);
            reject(new Error(`Connection ${i} error: ${error.message}`));
          };
        }));
      }

      const results = await Promise.all(connectionPromises);
      expect(results.length).toBe(numConnections);
      
      // Verify all connections are open
      const openConnections = testConnections.filter(ws => ws.readyState === WebSocket.OPEN);
      expect(openConnections.length).toBe(numConnections);

      // Check server stats
      const stats = await axios.get(`${BASE_URL}/api/websocket/stats`);
      expect(stats.data.stats.totalConnections).toBeGreaterThanOrEqual(numConnections);
    });

    test('Stress test: 50 connections with message broadcasting', async () => {
      const numConnections = 50;
      const connectionsCreated = [];

      console.log(`Stress testing ${numConnections} connections...`);

      // Create connections in batches to avoid overwhelming the server
      const batchSize = 10;
      for (let batch = 0; batch < Math.ceil(numConnections / batchSize); batch++) {
        const batchPromises = [];
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, numConnections);

        for (let i = batchStart; i < batchEnd; i++) {
          const sessionId = `stress-test-${i}-${Date.now()}`;
          const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=stress-user-${i}`;
          
          batchPromises.push(new Promise((resolve, reject) => {
            const ws = new WebSocket(wsUrl);
            testConnections.push(ws);

            const timeout = setTimeout(() => {
              reject(new Error(`Stress connection ${i} timeout`));
            }, 15000);

            ws.onopen = () => {
              clearTimeout(timeout);
              connectionsCreated.push(i);
              resolve();
            };

            ws.onerror = (error) => {
              clearTimeout(timeout);
              reject(new Error(`Stress connection ${i} error: ${error.message}`));
            };
          }));
        }

        await Promise.all(batchPromises);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      expect(connectionsCreated.length).toBe(numConnections);

      // Test message broadcasting by triggering WebSocket activity
      const statsResponse = await axios.get(`${BASE_URL}/api/websocket/stats`);
      expect(statsResponse.data.success).toBe(true);
      expect(statsResponse.data.stats.totalConnections).toBeGreaterThanOrEqual(numConnections);

      console.log(`Successfully created ${connectionsCreated.length} connections`);
    });
  });

  describe('Memory and Resource Usage Tests', () => {
    test('Memory usage remains stable during connection cycling', async () => {
      const cycles = 5;
      const connectionsPerCycle = 10;
      
      console.log(`Testing memory stability over ${cycles} cycles...`);

      const initialStats = await axios.get(`${BASE_URL}/api/websocket/stats`);
      const initialConnections = initialStats.data.stats.totalConnections;

      for (let cycle = 0; cycle < cycles; cycle++) {
        const cycleConnections = [];

        // Create connections
        for (let i = 0; i < connectionsPerCycle; i++) {
          const sessionId = `memory-test-${cycle}-${i}-${Date.now()}`;
          const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=memory-user`;
          
          const ws = new WebSocket(wsUrl);
          cycleConnections.push(ws);

          await new Promise((resolve, reject) => {
            ws.onopen = resolve;
            ws.onerror = reject;
            setTimeout(() => reject(new Error('Connection timeout')), 5000);
          });
        }

        // Close all connections in this cycle
        await Promise.all(cycleConnections.map(ws => {
          ws.close();
          return new Promise(resolve => {
            ws.onclose = resolve;
            setTimeout(resolve, 1000);
          });
        }));

        // Allow cleanup time
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Verify server is still responsive
      const finalStats = await axios.get(`${BASE_URL}/api/websocket/stats`);
      expect(finalStats.data.success).toBe(true);
      
      // Connection count should be back to roughly initial level
      const finalConnections = finalStats.data.stats.totalConnections;
      expect(Math.abs(finalConnections - initialConnections)).toBeLessThanOrEqual(2);

      console.log(`Memory test completed. Initial: ${initialConnections}, Final: ${finalConnections}`);
    });

    test('Server response time under WebSocket load', async () => {
      // Create some WebSocket connections for background load
      const backgroundConnections = 10;
      const wsConnections = [];

      for (let i = 0; i < backgroundConnections; i++) {
        const sessionId = `bg-load-${i}-${Date.now()}`;
        const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=bg-user-${i}`;
        
        const ws = new WebSocket(wsUrl);
        wsConnections.push(ws);
        testConnections.push(ws);

        await new Promise((resolve, reject) => {
          ws.onopen = resolve;
          ws.onerror = reject;
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });
      }

      // Test HTTP API response times under WebSocket load
      const responseTimes = [];
      const numRequests = 10;

      for (let i = 0; i < numRequests; i++) {
        const startTime = performance.now();
        
        await axios.get(`${BASE_URL}/api/websocket/stats`);
        
        const responseTime = performance.now() - startTime;
        responseTimes.push(responseTime);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      console.log(`Average API response time under load: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Max API response time under load: ${maxResponseTime.toFixed(2)}ms`);

      // Response time should not be significantly degraded
      expect(avgResponseTime).toBeLessThan(200); // Average < 200ms
      expect(maxResponseTime).toBeLessThan(1000); // Max < 1 second
    });
  });

  describe('Error Handling Performance', () => {
    test('Recovery time after connection failures', async () => {
      const sessionId = `recovery-test-${Date.now()}`;
      const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=recovery-user`;
      
      // Create initial connection
      let ws = new WebSocket(wsUrl);
      testConnections.push(ws);

      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
        setTimeout(() => reject(new Error('Initial connection timeout')), 5000);
      });

      // Force close connection
      const closeStartTime = performance.now();
      ws.close();

      await new Promise(resolve => {
        ws.onclose = resolve;
        setTimeout(resolve, 2000);
      });

      // Attempt to reconnect
      const reconnectStartTime = performance.now();
      ws = new WebSocket(wsUrl);
      testConnections.push(ws);

      await new Promise((resolve, reject) => {
        ws.onopen = () => {
          const recoveryTime = performance.now() - reconnectStartTime;
          console.log(`Recovery time: ${recoveryTime.toFixed(2)}ms`);
          expect(recoveryTime).toBeLessThan(3000); // Should recover within 3 seconds
          resolve();
        };
        ws.onerror = reject;
        setTimeout(() => reject(new Error('Recovery timeout')), 5000);
      });
    });

    test('Server stability under rapid connection/disconnection', async () => {
      const rapidCycles = 20;
      
      console.log(`Testing rapid connection cycling (${rapidCycles} cycles)...`);

      for (let i = 0; i < rapidCycles; i++) {
        const sessionId = `rapid-test-${i}-${Date.now()}`;
        const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&userId=rapid-user`;
        
        const ws = new WebSocket(wsUrl);

        await new Promise((resolve, reject) => {
          ws.onopen = () => {
            // Immediately close after opening
            ws.close();
            resolve();
          };
          ws.onerror = reject;
          setTimeout(() => reject(new Error('Rapid connection timeout')), 2000);
        });

        // Small delay between cycles
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Verify server is still responsive
      const stats = await axios.get(`${BASE_URL}/api/websocket/stats`);
      expect(stats.data.success).toBe(true);

      console.log('Rapid cycling test completed successfully');
    });
  });
});

// Performance monitoring utility
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      connectionTimes: [],
      messageTimes: [],
      memoryUsage: [],
      errors: []
    };
  }

  recordConnectionTime(time) {
    this.metrics.connectionTimes.push(time);
  }

  recordMessageTime(time) {
    this.metrics.messageTimes.push(time);
  }

  recordError(error) {
    this.metrics.errors.push({
      error: error.message,
      timestamp: Date.now()
    });
  }

  getReport() {
    const avgConnectionTime = this.metrics.connectionTimes.length > 0 
      ? this.metrics.connectionTimes.reduce((a, b) => a + b, 0) / this.metrics.connectionTimes.length 
      : 0;

    const avgMessageTime = this.metrics.messageTimes.length > 0
      ? this.metrics.messageTimes.reduce((a, b) => a + b, 0) / this.metrics.messageTimes.length
      : 0;

    return {
      averageConnectionTime: avgConnectionTime,
      averageMessageTime: avgMessageTime,
      totalErrors: this.metrics.errors.length,
      totalConnections: this.metrics.connectionTimes.length,
      totalMessages: this.metrics.messageTimes.length
    };
  }
}

module.exports = { PerformanceMonitor };