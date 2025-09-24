/**
 * Error Recovery Performance Testing
 * Tests performance characteristics of the error recovery system
 * 
 * TESTING SCOPE:
 * - Response times for error recovery operations
 * - Memory usage during error processing
 * - Concurrent error recovery sessions
 * - Large dataset error handling
 * - System resource utilization
 */

const axios = require('axios');
const FormData = require('form-data');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

// Performance test thresholds
const PERFORMANCE_THRESHOLDS = {
  API_RESPONSE_TIME: 2000,      // 2 seconds max for API responses
  BULK_FIX_TIME: 5000,          // 5 seconds max for bulk fixes
  SESSION_CREATION_TIME: 1000,   // 1 second max for session creation
  MEMORY_LEAK_THRESHOLD: 50,     // 50MB max memory increase
  CONCURRENT_SESSIONS: 10,       // Support 10 concurrent sessions
  LARGE_DATASET_SIZE: 10000      // Test with up to 10k records
};

describe('Error Recovery Performance Tests', () => {
  let authToken = null;
  let testSessions = [];
  let initialMemoryUsage = null;

  beforeAll(async () => {
    // Get authentication token
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'local-dev-user@example.com',
        password: 'testpassword'
      });
      authToken = response.data.token;
    } catch (error) {
      authToken = 'dev-token';
    }

    // Record initial memory usage
    initialMemoryUsage = process.memoryUsage();
  });

  afterEach(async () => {
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

  afterAll(async () => {
    // Check for memory leaks
    const finalMemoryUsage = process.memoryUsage();
    const memoryIncrease = finalMemoryUsage.heapUsed - initialMemoryUsage.heapUsed;
    const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

    if (memoryIncreaseMB > PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD) {
      console.warn(`Potential memory leak detected: ${memoryIncreaseMB.toFixed(2)}MB increase`);
    }
  });

  // Helper function to create test session with errors
  const createTestSessionWithErrors = async (errorCount = 100) => {
    const rows = ['name,price,email,sku'];
    
    for (let i = 1; i <= errorCount; i++) {
      // Create predictable errors
      const name = i % 5 === 0 ? '' : `Product ${i}`;
      const price = i % 3 === 0 ? 'invalid_price' : `${(i * 9.99).toFixed(2)}`;
      const email = i % 4 === 0 ? 'invalid_email' : ` user${i}@example.com `;
      const sku = i % 7 === 0 ? 'INVALID SKU' : `SKU${i.toString().padStart(4, '0')}`;
      
      rows.push(`${name},${price},${email},${sku}`);
    }

    const csvContent = rows.join('\n');
    const csvFilePath = path.join(__dirname, '../fixtures/performance-test.csv');
    fs.writeFileSync(csvFilePath, csvContent);

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

      const sessionId = uploadResponse.data.sessionId;
      testSessions.push(sessionId);

      const analysisResponse = await axios.post(`${BASE_URL}/api/import/analyze`, {
        sessionId: sessionId,
        mappings: {
          name: 'name',
          price: 'price',
          email: 'email',
          sku: 'sku'
        }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      return {
        sessionId,
        errors: analysisResponse.data.errors || []
      };
    } finally {
      if (fs.existsSync(csvFilePath)) {
        fs.unlinkSync(csvFilePath);
      }
    }
  };

  // Helper function to measure execution time
  const measureTime = async (fn) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return {
      result,
      duration: end - start
    };
  };

  describe('API Response Time Performance', () => {
    test('should return status within performance threshold', async () => {
      const { sessionId } = await createTestSessionWithErrors(50);

      const { duration } = await measureTime(async () => {
        return axios.get(`${BASE_URL}/api/recovery/${sessionId}/status`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME);
      console.log(`Status API response time: ${duration.toFixed(2)}ms`);
    });

    test('should fix single error within performance threshold', async () => {
      const { sessionId, errors } = await createTestSessionWithErrors(50);
      const error = errors[0];

      const { duration } = await measureTime(async () => {
        return axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, {
          recordIndex: error.recordIndex,
          field: error.field,
          newValue: 'fixed_value'
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME);
      console.log(`Single fix response time: ${duration.toFixed(2)}ms`);
    });

    test('should generate suggestions within performance threshold', async () => {
      const { sessionId } = await createTestSessionWithErrors(100);

      const { duration } = await measureTime(async () => {
        return axios.get(`${BASE_URL}/api/recovery/${sessionId}/suggestions`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME);
      console.log(`Suggestions response time: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Bulk Operation Performance', () => {
    test('should handle bulk fix of 100 errors within threshold', async () => {
      const { sessionId, errors } = await createTestSessionWithErrors(200);
      
      // Select first 100 errors for bulk fix
      const bulkFixes = errors.slice(0, 100).map(error => ({
        recordIndex: error.recordIndex,
        field: error.field,
        newValue: error.field === 'price' ? '19.99' : `fixed_${error.field}`
      }));

      const { duration } = await measureTime(async () => {
        return axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-bulk`, {
          fixes: bulkFixes
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_FIX_TIME);
      console.log(`Bulk fix (100 errors) time: ${duration.toFixed(2)}ms`);
    });

    test('should handle bulk fix scaling with error count', async () => {
      const errorCounts = [10, 50, 100, 250];
      const results = [];

      for (const errorCount of errorCounts) {
        const { sessionId, errors } = await createTestSessionWithErrors(errorCount * 2);
        
        const bulkFixes = errors.slice(0, errorCount).map(error => ({
          recordIndex: error.recordIndex,
          field: error.field,
          newValue: 'fixed_value'
        }));

        const { duration } = await measureTime(async () => {
          return axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-bulk`, {
            fixes: bulkFixes
          }, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
        });

        results.push({ errorCount, duration });
        console.log(`Bulk fix (${errorCount} errors): ${duration.toFixed(2)}ms`);
      }

      // Check that performance scales reasonably (should be roughly linear)
      for (let i = 1; i < results.length; i++) {
        const current = results[i];
        const previous = results[i - 1];
        const scalingFactor = current.duration / previous.duration;
        const errorRatio = current.errorCount / previous.errorCount;
        
        // Performance shouldn't degrade more than 2x the error ratio
        expect(scalingFactor).toBeLessThan(errorRatio * 2);
      }
    });

    test('should handle auto-fix application performance', async () => {
      const { sessionId, errors } = await createTestSessionWithErrors(150);

      const autoFixableErrors = errors.filter(e => e.autoFix);
      console.log(`Auto-fixable errors: ${autoFixableErrors.length}`);

      if (autoFixableErrors.length > 0) {
        const { duration } = await measureTime(async () => {
          return axios.post(`${BASE_URL}/api/recovery/${sessionId}/auto-fix`, {
            fixes: [
              { type: 'trim_whitespace', field: 'email' },
              { type: 'default_value', field: 'name', defaultValue: 'Product' },
              { type: 'format_sku', field: 'sku' }
            ]
          }, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
        });

        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_FIX_TIME);
        console.log(`Auto-fix application time: ${duration.toFixed(2)}ms`);
      }
    });
  });

  describe('Large Dataset Performance', () => {
    test('should handle large dataset error analysis', async () => {
      const { sessionId, errors } = await createTestSessionWithErrors(PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE);

      console.log(`Large dataset errors detected: ${errors.length}`);
      expect(errors.length).toBeGreaterThan(1000); // Should detect many errors

      // Test status retrieval performance with large error set
      const { duration } = await measureTime(async () => {
        return axios.get(`${BASE_URL}/api/recovery/${sessionId}/status`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME);
      console.log(`Large dataset status time: ${duration.toFixed(2)}ms`);
    });

    test('should handle memory usage efficiently with large datasets', async () => {
      const memoryBefore = process.memoryUsage();
      
      // Create multiple large sessions
      const sessions = [];
      for (let i = 0; i < 3; i++) {
        const { sessionId } = await createTestSessionWithErrors(1000);
        sessions.push(sessionId);
      }

      const memoryAfter = process.memoryUsage();
      const memoryIncrease = (memoryAfter.heapUsed - memoryBefore.heapUsed) / (1024 * 1024);

      console.log(`Memory increase for 3 large sessions: ${memoryIncrease.toFixed(2)}MB`);
      expect(memoryIncrease).toBeLessThan(100); // Should not use excessive memory

      // Clean up
      testSessions.push(...sessions);
    }, 120000); // 2 minute timeout

    test('should handle pagination of large error sets', async () => {
      const { sessionId, errors } = await createTestSessionWithErrors(2000);

      console.log(`Total errors for pagination test: ${errors.length}`);

      // Test if the system can handle large error sets without timeouts
      const { duration } = await measureTime(async () => {
        return axios.get(`${BASE_URL}/api/recovery/${sessionId}/suggestions`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME * 2); // Allow 2x threshold for large datasets
      console.log(`Large dataset suggestions time: ${duration.toFixed(2)}ms`);
    }, 60000); // 1 minute timeout
  });

  describe('Concurrent Operations Performance', () => {
    test('should handle concurrent error recovery sessions', async () => {
      const sessions = [];
      const promises = [];

      // Create concurrent sessions
      for (let i = 0; i < PERFORMANCE_THRESHOLDS.CONCURRENT_SESSIONS; i++) {
        promises.push(createTestSessionWithErrors(50));
      }

      const { duration, result } = await measureTime(async () => {
        return Promise.all(promises);
      });

      sessions.push(...result.map(r => r.sessionId));
      testSessions.push(...sessions);

      console.log(`${PERFORMANCE_THRESHOLDS.CONCURRENT_SESSIONS} concurrent sessions created in: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SESSION_CREATION_TIME * PERFORMANCE_THRESHOLDS.CONCURRENT_SESSIONS);

      // Test concurrent operations on all sessions
      const statusPromises = sessions.map(sessionId => 
        axios.get(`${BASE_URL}/api/recovery/${sessionId}/status`, {
          headers: { Authorization: `Bearer ${authToken}` }
        })
      );

      const { duration: statusDuration } = await measureTime(async () => {
        return Promise.all(statusPromises);
      });

      console.log(`Concurrent status requests time: ${statusDuration.toFixed(2)}ms`);
      expect(statusDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME);
    }, 60000); // 1 minute timeout

    test('should handle concurrent fixes on same session', async () => {
      const { sessionId, errors } = await createTestSessionWithErrors(100);

      // Create concurrent fix requests for different errors
      const fixPromises = errors.slice(0, 10).map((error, index) =>
        axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, {
          recordIndex: error.recordIndex,
          field: error.field,
          newValue: `fixed_value_${index}`
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        })
      );

      const { duration, result } = await measureTime(async () => {
        return Promise.allSettled(fixPromises);
      });

      // Most fixes should succeed (some might conflict)
      const successes = result.filter(r => r.status === 'fulfilled');
      expect(successes.length).toBeGreaterThan(5); // At least half should succeed

      console.log(`Concurrent fixes (10 requests): ${duration.toFixed(2)}ms, ${successes.length} succeeded`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME * 2);
    });
  });

  describe('Resource Utilization Performance', () => {
    test('should clean up resources after session completion', async () => {
      const memoryBefore = process.memoryUsage();

      // Create and complete several sessions
      for (let i = 0; i < 5; i++) {
        const { sessionId, errors } = await createTestSessionWithErrors(200);
        
        // Fix all errors
        const bulkFixes = errors.map(error => ({
          recordIndex: error.recordIndex,
          field: error.field,
          newValue: 'fixed_value'
        }));

        await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-bulk`, {
          fixes: bulkFixes
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        // Complete the session
        testSessions.push(sessionId);
      }

      // Clean up all sessions
      for (const sessionId of testSessions) {
        await axios.delete(`${BASE_URL}/api/import/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      }
      testSessions = [];

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      const memoryAfter = process.memoryUsage();
      const memoryIncrease = (memoryAfter.heapUsed - memoryBefore.heapUsed) / (1024 * 1024);

      console.log(`Memory increase after session cleanup: ${memoryIncrease.toFixed(2)}MB`);
      
      // Memory should not increase significantly
      expect(Math.abs(memoryIncrease)).toBeLessThan(20);
    }, 90000); // 90 second timeout

    test('should handle rapid session creation and deletion', async () => {
      const cycles = 10;
      const timings = [];

      for (let i = 0; i < cycles; i++) {
        const { duration } = await measureTime(async () => {
          const { sessionId } = await createTestSessionWithErrors(50);
          
          // Immediately clean up
          await axios.delete(`${BASE_URL}/api/import/sessions/${sessionId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
        });

        timings.push(duration);
        console.log(`Cycle ${i + 1} time: ${duration.toFixed(2)}ms`);
      }

      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTime = Math.max(...timings);

      console.log(`Average cycle time: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
      
      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SESSION_CREATION_TIME);
      expect(maxTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SESSION_CREATION_TIME * 2);
    }, 120000); // 2 minute timeout
  });

  describe('Performance Regression Testing', () => {
    test('should maintain consistent performance across multiple runs', async () => {
      const runs = 5;
      const timings = [];

      for (let i = 0; i < runs; i++) {
        const { sessionId, errors } = await createTestSessionWithErrors(100);
        
        const { duration } = await measureTime(async () => {
          const bulkFixes = errors.slice(0, 50).map(error => ({
            recordIndex: error.recordIndex,
            field: error.field,
            newValue: 'fixed_value'
          }));

          return axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-bulk`, {
            fixes: bulkFixes
          }, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
        });

        timings.push(duration);
        testSessions.push(sessionId);
      }

      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const stdDev = Math.sqrt(timings.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / timings.length);
      const coefficientOfVariation = stdDev / avgTime;

      console.log(`Performance consistency: avg=${avgTime.toFixed(2)}ms, stddev=${stdDev.toFixed(2)}ms, cv=${coefficientOfVariation.toFixed(3)}`);

      // Performance should be consistent (coefficient of variation < 0.5)
      expect(coefficientOfVariation).toBeLessThan(0.5);
      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_FIX_TIME);
    });

    test('should report performance metrics summary', () => {
      // This test summarizes all performance findings
      console.log('\n=== PERFORMANCE TEST SUMMARY ===');
      console.log(`API Response Time Threshold: ${PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME}ms`);
      console.log(`Bulk Fix Time Threshold: ${PERFORMANCE_THRESHOLDS.BULK_FIX_TIME}ms`);
      console.log(`Session Creation Time Threshold: ${PERFORMANCE_THRESHOLDS.SESSION_CREATION_TIME}ms`);
      console.log(`Memory Leak Threshold: ${PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD}MB`);
      console.log(`Concurrent Sessions Supported: ${PERFORMANCE_THRESHOLDS.CONCURRENT_SESSIONS}`);
      console.log(`Large Dataset Size Tested: ${PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE} records`);
      console.log('===================================\n');

      // This test always passes - it's just for reporting
      expect(true).toBe(true);
    });
  });
});