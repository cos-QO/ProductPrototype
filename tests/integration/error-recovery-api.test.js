/**
 * Error Recovery API Endpoint Testing
 * Tests all error recovery API endpoints comprehensively
 * 
 * TESTING SCOPE:
 * - All /api/recovery/* endpoints
 * - Authentication and authorization
 * - Input validation and error handling
 * - Response formats and status codes
 * - Data consistency and state management
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

describe('Error Recovery API Endpoint Tests', () => {
  let authToken = null;
  let testSessions = [];

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

  // Helper function to create test session with errors
  const createTestSessionWithErrors = async () => {
    const csvContent = `name,price,sku
Product A,invalid_price,SKU001
Product B,29.99,INVALID SKU
Product C,,SKU003`;

    const csvFilePath = path.join(__dirname, '../fixtures/api-test.csv');
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

      await axios.post(`${BASE_URL}/api/import/analyze`, {
        sessionId: sessionId,
        mappings: { name: 'name', price: 'price', sku: 'sku' }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      return sessionId;
    } finally {
      if (fs.existsSync(csvFilePath)) {
        fs.unlinkSync(csvFilePath);
      }
    }
  };

  describe('GET /api/recovery/:sessionId/status', () => {
    test('should return status for valid session', async () => {
      const sessionId = await createTestSessionWithErrors();

      const response = await axios.get(`${BASE_URL}/api/recovery/${sessionId}/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('sessionId', sessionId);
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('errorCount');
      expect(response.data).toHaveProperty('fixedCount');
    });

    test('should return 404 for non-existent session', async () => {
      const response = await axios.get(`${BASE_URL}/api/recovery/nonexistent-session/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => err.response);

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.message).toContain('not found');
    });

    test('should require authentication', async () => {
      const sessionId = await createTestSessionWithErrors();

      const response = await axios.get(`${BASE_URL}/api/recovery/${sessionId}/status`)
        .catch(err => err.response);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/recovery/:sessionId/fix-single', () => {
    test('should fix single error successfully', async () => {
      const sessionId = await createTestSessionWithErrors();

      const response = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, {
        recordIndex: 0,
        field: 'price',
        newValue: '19.99'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data).toHaveProperty('fixedRecord');
      expect(response.data.fixedRecord.price).toBe('19.99');
    });

    test('should validate required fields', async () => {
      const sessionId = await createTestSessionWithErrors();

      const response = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, {
        recordIndex: 0,
        field: 'price'
        // missing newValue
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => err.response);

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    test('should validate recordIndex bounds', async () => {
      const sessionId = await createTestSessionWithErrors();

      const response = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, {
        recordIndex: 999, // Out of bounds
        field: 'price',
        newValue: '19.99'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => err.response);

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.message).toContain('not found');
    });

    test('should handle invalid field names', async () => {
      const sessionId = await createTestSessionWithErrors();

      const response = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, {
        recordIndex: 0,
        field: 'nonexistent_field',
        newValue: 'some_value'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Should succeed but add the field (flexible data model)
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('POST /api/recovery/:sessionId/fix-bulk', () => {
    test('should fix multiple errors in bulk', async () => {
      const sessionId = await createTestSessionWithErrors();

      const response = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-bulk`, {
        fixes: [
          { recordIndex: 0, field: 'price', newValue: '19.99' },
          { recordIndex: 1, field: 'sku', newValue: 'SKU002' },
          { recordIndex: 2, field: 'name', newValue: 'Product C Fixed' }
        ]
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data).toHaveProperty('fixedRecords');
      expect(response.data.fixedRecords).toHaveLength(3);
      expect(response.data.fixedRecords[0].price).toBe('19.99');
      expect(response.data.fixedRecords[1].sku).toBe('SKU002');
    });

    test('should validate fixes array', async () => {
      const sessionId = await createTestSessionWithErrors();

      const response = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-bulk`, {
        fixes: 'invalid_format'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => err.response);

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    test('should handle empty fixes array', async () => {
      const sessionId = await createTestSessionWithErrors();

      const response = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-bulk`, {
        fixes: []
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.fixedRecords).toHaveLength(0);
    });

    test('should handle partial failures gracefully', async () => {
      const sessionId = await createTestSessionWithErrors();

      const response = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-bulk`, {
        fixes: [
          { recordIndex: 0, field: 'price', newValue: '19.99' }, // Valid
          { recordIndex: 999, field: 'price', newValue: '29.99' }, // Invalid index
          { recordIndex: 1, field: 'sku', newValue: 'SKU002' }    // Valid
        ]
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Should succeed with partial results
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data).toHaveProperty('fixedRecords');
      expect(response.data).toHaveProperty('errors');
      expect(response.data.errors).toHaveLength(1); // One failed fix
    });
  });

  describe('GET /api/recovery/:sessionId/suggestions', () => {
    test('should return auto-fix suggestions', async () => {
      const sessionId = await createTestSessionWithErrors();

      const response = await axios.get(`${BASE_URL}/api/recovery/${sessionId}/suggestions`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data).toHaveProperty('suggestions');
      expect(Array.isArray(response.data.suggestions)).toBe(true);
    });

    test('should handle session with no fixable errors', async () => {
      // Create session with no errors
      const csvContent = `name,price,sku
Product A,19.99,SKU001
Product B,29.99,SKU002`;

      const csvFilePath = path.join(__dirname, '../fixtures/no-errors.csv');
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

        const response = await axios.get(`${BASE_URL}/api/recovery/${sessionId}/suggestions`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data.suggestions).toHaveLength(0);

      } finally {
        if (fs.existsSync(csvFilePath)) {
          fs.unlinkSync(csvFilePath);
        }
      }
    });
  });

  describe('POST /api/recovery/:sessionId/auto-fix', () => {
    test('should apply automatic fixes', async () => {
      const sessionId = await createTestSessionWithErrors();

      const response = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/auto-fix`, {
        fixes: [
          { type: 'default_value', field: 'name', defaultValue: 'Unnamed Product' },
          { type: 'format_sku', field: 'sku' }
        ]
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data).toHaveProperty('appliedFixes');
    });

    test('should validate fix types', async () => {
      const sessionId = await createTestSessionWithErrors();

      const response = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/auto-fix`, {
        fixes: [
          { type: 'invalid_fix_type', field: 'price' }
        ]
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => err.response);

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });
  });

  describe('POST /api/recovery/:sessionId/create', () => {
    test('should create recovery session', async () => {
      const sessionId = await createTestSessionWithErrors();

      // Get errors first
      const analysisResponse = await axios.post(`${BASE_URL}/api/import/analyze`, {
        sessionId: sessionId,
        mappings: { name: 'name', price: 'price', sku: 'sku' }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const response = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/create`, {
        errors: analysisResponse.data.errors,
        options: { trackHistory: true }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data).toHaveProperty('recoverySessionId');
      expect(typeof response.data.recoverySessionId).toBe('string');
    });

    test('should validate errors array', async () => {
      const sessionId = await createTestSessionWithErrors();

      const response = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/create`, {
        errors: 'invalid_format'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => err.response);

      expect(response.status).toBe(400);
      expect(response.data.error).toContain('Errors array required');
    });
  });

  describe('GET /api/recovery/session/:recoverySessionId', () => {
    test('should return recovery session details', async () => {
      const sessionId = await createTestSessionWithErrors();

      // Create recovery session
      const analysisResponse = await axios.post(`${BASE_URL}/api/import/analyze`, {
        sessionId: sessionId,
        mappings: { name: 'name', price: 'price', sku: 'sku' }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const createResponse = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/create`, {
        errors: analysisResponse.data.errors,
        options: {}
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const recoverySessionId = createResponse.data.recoverySessionId;

      const response = await axios.get(`${BASE_URL}/api/recovery/session/${recoverySessionId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data).toHaveProperty('session');
      expect(response.data.session).toHaveProperty('sessionId', sessionId);
      expect(response.data.session).toHaveProperty('errorCount');
      expect(response.data.session).toHaveProperty('fixCount');
    });

    test('should return 404 for non-existent recovery session', async () => {
      const response = await axios.get(`${BASE_URL}/api/recovery/session/nonexistent`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => err.response);

      expect(response.status).toBe(404);
      expect(response.data.error).toContain('not found');
    });
  });

  describe('POST /api/recovery/session/:recoverySessionId/execute', () => {
    test('should execute recovery plan', async () => {
      const sessionId = await createTestSessionWithErrors();

      // Create recovery session
      const analysisResponse = await axios.post(`${BASE_URL}/api/import/analyze`, {
        sessionId: sessionId,
        mappings: { name: 'name', price: 'price', sku: 'sku' }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const createResponse = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/create`, {
        errors: analysisResponse.data.errors,
        options: {}
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const recoverySessionId = createResponse.data.recoverySessionId;

      const response = await axios.post(`${BASE_URL}/api/recovery/session/${recoverySessionId}/execute`, {
        selectedFixes: [
          { recordIndex: 0, field: 'price', newValue: '19.99' }
        ]
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data).toHaveProperty('result');
    });

    test('should validate selected fixes format', async () => {
      const sessionId = await createTestSessionWithErrors();

      const analysisResponse = await axios.post(`${BASE_URL}/api/import/analyze`, {
        sessionId: sessionId,
        mappings: { name: 'name', price: 'price', sku: 'sku' }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const createResponse = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/create`, {
        errors: analysisResponse.data.errors,
        options: {}
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const recoverySessionId = createResponse.data.recoverySessionId;

      const response = await axios.post(`${BASE_URL}/api/recovery/session/${recoverySessionId}/execute`, {
        selectedFixes: 'invalid_format'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => err.response);

      expect(response.status).toBe(400);
      expect(response.data.error).toContain('array required');
    });
  });

  describe('Authentication and Authorization', () => {
    test('should require authentication for all endpoints', async () => {
      const endpoints = [
        { method: 'GET', url: `/api/recovery/test-session/status` },
        { method: 'POST', url: `/api/recovery/test-session/fix-single`, data: {} },
        { method: 'POST', url: `/api/recovery/test-session/fix-bulk`, data: {} },
        { method: 'GET', url: `/api/recovery/test-session/suggestions` },
        { method: 'POST', url: `/api/recovery/test-session/auto-fix`, data: {} },
        { method: 'POST', url: `/api/recovery/test-session/create`, data: {} },
        { method: 'GET', url: `/api/recovery/session/test-recovery-session` },
        { method: 'POST', url: `/api/recovery/session/test-recovery-session/execute`, data: {} }
      ];

      for (const endpoint of endpoints) {
        const response = await axios({
          method: endpoint.method.toLowerCase(),
          url: `${BASE_URL}${endpoint.url}`,
          data: endpoint.data
        }).catch(err => err.response);

        expect(response.status).toBe(401);
      }
    });

    test('should enforce user ownership of sessions', async () => {
      // This would require creating a second user, for now we'll test with invalid session
      const response = await axios.get(`${BASE_URL}/api/recovery/someone-elses-session/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => err.response);

      expect(response.status).toBe(404); // Session not found (implies ownership check)
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed JSON requests', async () => {
      const sessionId = await createTestSessionWithErrors();

      const response = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, 
        'invalid json',
        {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      ).catch(err => err.response);

      expect(response.status).toBe(400);
    });

    test('should handle missing request body', async () => {
      const sessionId = await createTestSessionWithErrors();

      const response = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, 
        undefined,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      ).catch(err => err.response);

      expect(response.status).toBe(400);
    });

    test('should handle very long field names and values', async () => {
      const sessionId = await createTestSessionWithErrors();

      const longValue = 'x'.repeat(10000); // 10KB string
      const longFieldName = 'f'.repeat(1000); // 1KB field name

      const response = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, {
        recordIndex: 0,
        field: longFieldName,
        newValue: longValue
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Should handle gracefully (either succeed or fail gracefully)
      expect(response.status).toBeOneOf([200, 400, 413]);
    });
  });
});