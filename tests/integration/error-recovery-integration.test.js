/**
 * Error Recovery Integration Testing
 * Tests integration between ErrorRecoveryDialog and DataPreviewStep/ImportExecutionStep
 * 
 * TESTING SCOPE:
 * - Component interaction and state synchronization
 * - Error dialog opening and closing from different contexts
 * - Data flow between components after error resolution
 * - UI updates after successful error fixes
 * - Integration with import workflow continuation
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

describe('Error Recovery Integration Tests', () => {
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

  // Helper function to create test session with specific error patterns
  const createTestSession = async (scenario) => {
    let csvContent;
    
    switch (scenario) {
      case 'validation_errors':
        csvContent = `name,price,sku,email
,invalid_price,INVALID SKU,invalid@email
Product B,29.99,SKU002, valid@email.com 
Product C,-10,SKU003,valid@email.com`;
        break;
        
      case 'format_errors':
        csvContent = `name,price,email,phone
Product A,29.99, user@example.com ,555-123-4567
Product B,39.99,user@example.com, (555) 123 4567 
Product C,49.99,user@example.com,invalid_phone`;
        break;
        
      case 'mixed_errors':
        csvContent = `name,price,sku,inventory,category
,invalid_price,DUPLICATE,invalid_inventory,
Product B,29.99,DUPLICATE,25,Electronics
Product C,39.99,SKU003,-5,Invalid Category`;
        break;
        
      case 'recoverable_errors':
        csvContent = `name,email,price
Product A, test@example.com ,19.99
Product B, another@test.com ,29.99
Product C, third@email.com ,39.99`;
        break;
        
      default:
        csvContent = `name,price
Product A,invalid_price
Product B,29.99`;
    }

    const csvFilePath = path.join(__dirname, '../fixtures/integration-test.csv');
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
          sku: 'sku',
          email: 'email',
          phone: 'phone',
          inventory: 'inventory',
          category: 'category'
        }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      return {
        sessionId,
        errors: analysisResponse.data.errors || [],
        preview: analysisResponse.data.preview || []
      };
    } finally {
      if (fs.existsSync(csvFilePath)) {
        fs.unlinkSync(csvFilePath);
      }
    }
  };

  describe('DataPreviewStep Integration', () => {
    test('should detect errors during data preview step', async () => {
      console.log('🧪 Testing error detection in data preview...');

      const { sessionId, errors, preview } = await createTestSession('validation_errors');

      // Verify errors were detected
      expect(errors.length).toBeGreaterThan(0);
      expect(preview.length).toBeGreaterThan(0);

      console.log(`✓ Detected ${errors.length} errors in preview data`);

      // Verify error recovery status is available
      const statusResponse = await axios.get(`${BASE_URL}/api/recovery/${sessionId}/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data.errorCount).toBe(errors.length);
    });

    test('should update preview data after error resolution', async () => {
      console.log('🧪 Testing preview data updates after error fixes...');

      const { sessionId, errors } = await createTestSession('validation_errors');

      // Get initial preview data
      const initialPreviewResponse = await axios.get(`${BASE_URL}/api/import/sessions/${sessionId}/preview`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const initialPreview = initialPreviewResponse.data.preview;

      // Fix first error
      const firstError = errors[0];
      await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, {
        recordIndex: firstError.recordIndex,
        field: firstError.field,
        newValue: firstError.field === 'price' ? '19.99' : 'Fixed Value'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Get updated preview data
      const updatedPreviewResponse = await axios.get(`${BASE_URL}/api/import/sessions/${sessionId}/preview`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const updatedPreview = updatedPreviewResponse.data.preview;

      // Verify data was updated
      const updatedRecord = updatedPreview[firstError.recordIndex];
      expect(updatedRecord[firstError.field]).not.toBe(firstError.value);
      console.log(`✓ Preview data updated: ${firstError.field} = ${updatedRecord[firstError.field]}`);
    });

    test('should maintain preview data integrity during error recovery', async () => {
      console.log('🧪 Testing preview data integrity during error recovery...');

      const { sessionId, errors } = await createTestSession('mixed_errors');

      // Get initial preview
      const initialResponse = await axios.get(`${BASE_URL}/api/import/sessions/${sessionId}/preview`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const initialPreview = initialResponse.data.preview;
      const initialRecordCount = initialPreview.length;

      // Fix multiple errors
      const bulkFixes = errors.slice(0, 3).map(error => ({
        recordIndex: error.recordIndex,
        field: error.field,
        newValue: error.field === 'price' ? '25.99' : 'Fixed'
      }));

      await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-bulk`, {
        fixes: bulkFixes
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Verify preview integrity
      const updatedResponse = await axios.get(`${BASE_URL}/api/import/sessions/${sessionId}/preview`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const updatedPreview = updatedResponse.data.preview;

      // Should maintain same record count
      expect(updatedPreview.length).toBe(initialRecordCount);

      // Should maintain record order
      for (let i = 0; i < updatedPreview.length; i++) {
        if (!bulkFixes.some(fix => fix.recordIndex === i)) {
          // Unchanged records should remain identical
          expect(updatedPreview[i]).toEqual(initialPreview[i]);
        }
      }

      console.log(`✓ Preview data integrity maintained (${initialRecordCount} records)`);
    });
  });

  describe('ImportExecutionStep Integration', () => {
    test('should handle errors during import execution', async () => {
      console.log('🧪 Testing error handling during import execution...');

      const { sessionId, errors } = await createTestSession('validation_errors');

      // Try to execute import with errors (should fail or warn)
      const executeResponse = await axios.post(`${BASE_URL}/api/import/execute`, {
        sessionId: sessionId
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => err.response);

      // Should either fail with validation errors or warn about them
      if (executeResponse.status === 400) {
        expect(executeResponse.data.errors).toBeDefined();
        console.log(`✓ Import execution blocked with ${executeResponse.data.errors.length} errors`);
      } else {
        // If execution succeeded, it should have warnings
        expect(executeResponse.data.warnings).toBeDefined();
        console.log(`✓ Import execution completed with warnings`);
      }
    });

    test('should allow import execution after error resolution', async () => {
      console.log('🧪 Testing import execution after error resolution...');

      const { sessionId, errors } = await createTestSession('recoverable_errors');

      // Fix all errors first
      if (errors.length > 0) {
        const bulkFixes = errors.map(error => ({
          recordIndex: error.recordIndex,
          field: error.field,
          newValue: error.field === 'email' ? error.value.trim() : 'Fixed Value'
        }));

        const fixResponse = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-bulk`, {
          fixes: bulkFixes
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        expect(fixResponse.status).toBe(200);
        console.log(`✓ Fixed ${bulkFixes.length} errors`);
      }

      // Now import should succeed
      const executeResponse = await axios.post(`${BASE_URL}/api/import/execute`, {
        sessionId: sessionId
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(executeResponse.status).toBe(200);
      expect(executeResponse.data.success).toBe(true);
      console.log(`✓ Import executed successfully after error resolution`);
    });

    test('should track import progress after partial error resolution', async () => {
      console.log('🧪 Testing import progress tracking with partial fixes...');

      const { sessionId, errors } = await createTestSession('mixed_errors');

      // Fix only some errors
      const criticalErrors = errors.filter(e => e.severity === 'error');
      const halfwayPoint = Math.ceil(criticalErrors.length / 2);
      
      const partialFixes = criticalErrors.slice(0, halfwayPoint).map(error => ({
        recordIndex: error.recordIndex,
        field: error.field,
        newValue: 'Fixed Value'
      }));

      if (partialFixes.length > 0) {
        await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-bulk`, {
          fixes: partialFixes
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log(`✓ Fixed ${partialFixes.length} of ${criticalErrors.length} critical errors`);
      }

      // Check import readiness
      const statusResponse = await axios.get(`${BASE_URL}/api/recovery/${sessionId}/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(statusResponse.data.fixedCount).toBe(partialFixes.length);
      expect(statusResponse.data.errorCount).toBe(errors.length - partialFixes.length);
      console.log(`✓ Progress tracking accurate: ${statusResponse.data.fixedCount} fixed, ${statusResponse.data.errorCount} remaining`);
    });
  });

  describe('State Synchronization', () => {
    test('should maintain consistent state between recovery dialog and parent components', async () => {
      console.log('🧪 Testing state synchronization...');

      const { sessionId, errors } = await createTestSession('format_errors');

      // Simulate opening error recovery dialog
      const initialStatusResponse = await axios.get(`${BASE_URL}/api/recovery/${sessionId}/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const initialState = {
        errorCount: initialStatusResponse.data.errorCount,
        fixedCount: initialStatusResponse.data.fixedCount
      };

      // Apply fixes through recovery API
      const emailError = errors.find(e => e.field === 'email');
      if (emailError) {
        await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, {
          recordIndex: emailError.recordIndex,
          field: 'email',
          newValue: emailError.value.trim()
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      }

      // Verify state is updated
      const updatedStatusResponse = await axios.get(`${BASE_URL}/api/recovery/${sessionId}/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const updatedState = {
        errorCount: updatedStatusResponse.data.errorCount,
        fixedCount: updatedStatusResponse.data.fixedCount
      };

      // State should reflect the fix
      expect(updatedState.fixedCount).toBeGreaterThan(initialState.fixedCount);
      expect(updatedState.errorCount).toBeLessThan(initialState.errorCount);

      console.log(`✓ State synchronized: fixed count ${initialState.fixedCount} → ${updatedState.fixedCount}`);
    });

    test('should handle concurrent state updates gracefully', async () => {
      console.log('🧪 Testing concurrent state updates...');

      const { sessionId, errors } = await createTestSession('validation_errors');

      // Simulate multiple concurrent fix operations
      const concurrentFixes = errors.slice(0, 3).map((error, index) =>
        axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, {
          recordIndex: error.recordIndex,
          field: error.field,
          newValue: `Fixed_${index}`
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        })
      );

      // Execute concurrently
      const results = await Promise.allSettled(concurrentFixes);
      const successfulFixes = results.filter(r => r.status === 'fulfilled').length;

      // Verify final state is consistent
      const finalStatusResponse = await axios.get(`${BASE_URL}/api/recovery/${sessionId}/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(finalStatusResponse.data.fixedCount).toBe(successfulFixes);
      console.log(`✓ Concurrent fixes handled: ${successfulFixes} successful fixes`);
    });
  });

  describe('Workflow Continuation', () => {
    test('should allow workflow continuation after complete error resolution', async () => {
      console.log('🧪 Testing workflow continuation after error resolution...');

      const { sessionId, errors } = await createTestSession('recoverable_errors');

      // Fix all errors
      if (errors.length > 0) {
        const allFixes = errors.map(error => ({
          recordIndex: error.recordIndex,
          field: error.field,
          newValue: error.field === 'email' ? error.value.trim() : 'Fixed'
        }));

        await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-bulk`, {
          fixes: allFixes
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log(`✓ All ${errors.length} errors resolved`);
      }

      // Verify session is ready for import
      const statusResponse = await axios.get(`${BASE_URL}/api/import/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(statusResponse.data.status).toBeOneOf(['analyzed', 'ready']);

      // Import should now succeed
      const executeResponse = await axios.post(`${BASE_URL}/api/import/execute`, {
        sessionId: sessionId
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(executeResponse.status).toBe(200);
      console.log(`✓ Workflow continued successfully to import execution`);
    });

    test('should block workflow continuation with unresolved critical errors', async () => {
      console.log('🧪 Testing workflow blocking with unresolved errors...');

      const { sessionId, errors } = await createTestSession('validation_errors');

      // Leave some critical errors unfixed
      const criticalErrors = errors.filter(e => e.severity === 'error');
      const nonCriticalErrors = errors.filter(e => e.severity === 'warning');

      // Only fix non-critical errors
      if (nonCriticalErrors.length > 0) {
        const safeFixes = nonCriticalErrors.map(error => ({
          recordIndex: error.recordIndex,
          field: error.field,
          newValue: 'Fixed'
        }));

        await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-bulk`, {
          fixes: safeFixes
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log(`✓ Fixed ${safeFixes.length} non-critical errors`);
      }

      // Import should fail or warn if critical errors remain
      if (criticalErrors.length > 0) {
        const executeResponse = await axios.post(`${BASE_URL}/api/import/execute`, {
          sessionId: sessionId
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        }).catch(err => err.response);

        if (executeResponse.status === 400) {
          expect(executeResponse.data.errors).toBeDefined();
          console.log(`✓ Workflow correctly blocked with ${criticalErrors.length} critical errors`);
        } else {
          // If it succeeds, should have warnings
          expect(executeResponse.data.warnings).toBeDefined();
          console.log(`✓ Workflow continued with warnings about critical errors`);
        }
      }
    });
  });

  describe('UI Integration Scenarios', () => {
    test('should provide data for error recovery dialog opening', async () => {
      console.log('🧪 Testing error recovery dialog data provision...');

      const { sessionId, errors } = await createTestSession('mixed_errors');

      // Get data that would be passed to ErrorRecoveryDialog
      const statusResponse = await axios.get(`${BASE_URL}/api/recovery/${sessionId}/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const suggestionsResponse = await axios.get(`${BASE_URL}/api/recovery/${sessionId}/suggestions`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Verify dialog would have necessary data
      expect(statusResponse.data.sessionId).toBe(sessionId);
      expect(statusResponse.data.errorCount).toBe(errors.length);
      expect(Array.isArray(suggestionsResponse.data.suggestions)).toBe(true);

      console.log(`✓ Dialog data ready: ${errors.length} errors, ${suggestionsResponse.data.suggestions.length} suggestions`);
    });

    test('should handle error recovery dialog cancellation', async () => {
      console.log('🧪 Testing error recovery dialog cancellation...');

      const { sessionId, errors } = await createTestSession('validation_errors');

      // Simulate partial fixes then cancellation (no further action)
      const partialFixes = errors.slice(0, 1).map(error => ({
        recordIndex: error.recordIndex,
        field: error.field,
        newValue: 'Partial Fix'
      }));

      await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-bulk`, {
        fixes: partialFixes
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Verify session state after partial fixes
      const statusResponse = await axios.get(`${BASE_URL}/api/recovery/${sessionId}/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(statusResponse.data.fixedCount).toBe(1);
      expect(statusResponse.data.errorCount).toBe(errors.length - 1);

      console.log(`✓ Dialog cancellation handled: partial progress preserved`);
    });

    test('should support multiple error recovery dialog sessions', async () => {
      console.log('🧪 Testing multiple error recovery sessions...');

      // Create multiple sessions with errors
      const session1 = await createTestSession('validation_errors');
      const session2 = await createTestSession('format_errors');

      // Both sessions should maintain independent state
      const status1 = await axios.get(`${BASE_URL}/api/recovery/${session1.sessionId}/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const status2 = await axios.get(`${BASE_URL}/api/recovery/${session2.sessionId}/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Fix errors in first session only
      if (session1.errors.length > 0) {
        await axios.post(`${BASE_URL}/api/recovery/${session1.sessionId}/fix-single`, {
          recordIndex: session1.errors[0].recordIndex,
          field: session1.errors[0].field,
          newValue: 'Fixed'
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      }

      // Verify only first session was affected
      const updatedStatus1 = await axios.get(`${BASE_URL}/api/recovery/${session1.sessionId}/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const updatedStatus2 = await axios.get(`${BASE_URL}/api/recovery/${session2.sessionId}/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(updatedStatus1.data.fixedCount).toBeGreaterThan(status1.data.fixedCount);
      expect(updatedStatus2.data.fixedCount).toBe(status2.data.fixedCount);

      console.log(`✓ Multiple sessions maintained independent state`);
    });
  });

  describe('Error Recovery Completion Integration', () => {
    test('should properly complete error recovery workflow', async () => {
      console.log('🧪 Testing complete error recovery workflow integration...');

      const { sessionId, errors } = await createTestSession('recoverable_errors');

      // Track the complete workflow
      const workflow = {
        initialErrors: errors.length,
        fixedErrors: 0,
        importSuccess: false
      };

      // Fix all errors one by one to simulate user interaction
      for (const error of errors) {
        const fixResponse = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, {
          recordIndex: error.recordIndex,
          field: error.field,
          newValue: error.field === 'email' ? error.value.trim() : 'Fixed Value'
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        if (fixResponse.status === 200) {
          workflow.fixedErrors++;
        }
      }

      // Verify all errors were fixed
      const finalStatusResponse = await axios.get(`${BASE_URL}/api/recovery/${sessionId}/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(finalStatusResponse.data.fixedCount).toBe(workflow.fixedErrors);
      expect(finalStatusResponse.data.errorCount).toBe(0);

      // Complete the import
      const executeResponse = await axios.post(`${BASE_URL}/api/import/execute`, {
        sessionId: sessionId
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (executeResponse.status === 200) {
        workflow.importSuccess = true;
      }

      // Verify complete workflow success
      expect(workflow.initialErrors).toBeGreaterThan(0);
      expect(workflow.fixedErrors).toBe(workflow.initialErrors);
      expect(workflow.importSuccess).toBe(true);

      console.log(`✓ Complete workflow: ${workflow.initialErrors} errors → ${workflow.fixedErrors} fixed → import success`);
    });
  });
});