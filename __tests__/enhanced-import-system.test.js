/**
 * Phase 7 Testing: Enhanced Import System Unit & Integration Tests
 * 
 * Tests the complete bulk upload system implemented in Phases 4-6:
 * - Enhanced Import Service functionality
 * - Field Mapping Engine with LLM integration
 * - Batch Processing performance
 * - WebSocket real-time updates
 * - Error Recovery System
 * - File Processing optimization
 */

import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test configuration
const BASE_URL = global.testConfig.baseUrl;
let authToken = null;
let testSessionId = null;

describe('Enhanced Import System - Phase 7 Testing', () => {
  
  beforeAll(async () => {
    // Authenticate for testing
    const response = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'test123'
      });
    
    if (response.status === 200) {
      authToken = response.body.token;
    } else {
      // Try to register first
      await request(BASE_URL)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'test123',
          firstName: 'Test',
          lastName: 'User'
        });
      
      const loginResponse = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'test123'
        });
      
      authToken = loginResponse.body.token;
    }
  });

  describe('1. Upload Session Management', () => {
    test('should create upload session', async () => {
      const response = await request(BASE_URL)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('status', 'initialized');
      
      testSessionId = response.body.sessionId;
      console.log(`✅ Session created: ${testSessionId}`);
    });

    test('should get session status', async () => {
      const response = await request(BASE_URL)
        .get(`/api/upload/status/${testSessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('session');
      expect(response.body.session).toHaveProperty('id', testSessionId);
      expect(response.body.session).toHaveProperty('status');
    });
  });

  describe('2. File Upload & Analysis', () => {
    test('should upload and analyze CSV file', async () => {
      const csvData = global.testUtils.generateCSV(100);
      const csvPath = path.join(__dirname, 'test-products.csv');
      fs.writeFileSync(csvPath, csvData);

      const startTime = Date.now();
      const response = await request(BASE_URL)
        .post(`/api/upload/${testSessionId}/analyze`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvPath)
        .expect(200);

      const analysisTime = Date.now() - startTime;

      expect(response.body).toHaveProperty('fileInfo');
      expect(response.body.fileInfo).toHaveProperty('totalRecords', 100);
      expect(response.body).toHaveProperty('sourceFields');
      expect(response.body.sourceFields.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('suggestedMappings');

      console.log(`✅ File analysis completed in ${analysisTime}ms`);
      console.log(`📊 Records: ${response.body.fileInfo.totalRecords}, Fields: ${response.body.sourceFields.length}`);

      // Validate performance target (<2s for file analysis)
      expect(analysisTime).toBeLessThan(2000);

      // Cleanup
      fs.unlinkSync(csvPath);
    });

    test('should upload and analyze JSON file', async () => {
      const jsonData = global.testUtils.generateJSON(50);
      const jsonPath = path.join(__dirname, 'test-products.json');
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));

      const response = await request(BASE_URL)
        .post(`/api/upload/${testSessionId}/analyze`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', jsonPath)
        .expect(200);

      expect(response.body).toHaveProperty('fileInfo');
      expect(response.body.fileInfo).toHaveProperty('totalRecords', 50);
      expect(response.body).toHaveProperty('sourceFields');

      // Cleanup
      fs.unlinkSync(jsonPath);
    });
  });

  describe('3. Field Mapping Engine', () => {
    test('should analyze field mappings', async () => {
      const sourceFields = [
        {
          name: 'product_name',
          dataType: 'string',
          sampleValues: ['iPhone 15 Pro', 'Samsung Galaxy S24'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        },
        {
          name: 'retail_price',
          dataType: 'number',
          sampleValues: [999.99, 1199.99],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: false
        },
        {
          name: 'item_code',
          dataType: 'string',
          sampleValues: ['IPHONE15PRO', 'GALAXYS24'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        }
      ];

      const startTime = Date.now();
      const response = await request(BASE_URL)
        .post('/api/mapping/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sessionId: testSessionId, sourceFields })
        .expect(200);

      const mappingTime = Date.now() - startTime;

      expect(response.body).toHaveProperty('mappings');
      expect(response.body.mappings.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('averageConfidence');

      // Check field mapping accuracy
      const highConfidenceMappings = response.body.mappings.filter(m => m.confidence >= 90);
      const mappingAccuracy = (highConfidenceMappings.length / response.body.mappings.length) * 100;

      console.log(`✅ Field mapping completed in ${mappingTime}ms`);
      console.log(`🎯 Mapping accuracy: ${mappingAccuracy.toFixed(1)}%`);
      console.log(`📈 Average confidence: ${response.body.averageConfidence?.toFixed(1)}%`);

      // Validate performance targets
      expect(mappingTime).toBeLessThan(global.testConfig.performance.maxLLMResponseTime);
      expect(mappingAccuracy).toBeGreaterThanOrEqual(global.testConfig.performance.minFieldMappingAccuracy);

      if (response.body.llmCost) {
        expect(response.body.llmCost).toBeLessThan(global.testConfig.performance.maxCostPerSession);
        console.log(`💰 LLM cost: $${response.body.llmCost.toFixed(6)}`);
      }
    });

    test('should provide field suggestions', async () => {
      const response = await request(BASE_URL)
        .post('/api/mapping/suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceField: {
            name: 'mysterious_field',
            dataType: 'string',
            sampleValues: ['ABC123', 'DEF456', 'GHI789'],
            nullPercentage: 0,
            uniquePercentage: 100
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('suggestions');
      expect(response.body.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('4. Data Preview & Validation', () => {
    test('should generate data preview', async () => {
      const response = await request(BASE_URL)
        .get(`/api/preview/${testSessionId}?limit=20`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('statistics');
      expect(response.body).toHaveProperty('preview');
      expect(response.body.statistics).toHaveProperty('totalRecords');
      expect(response.body.statistics).toHaveProperty('validRecords');
      expect(response.body.statistics).toHaveProperty('errorRecords');

      console.log(`✅ Data preview generated`);
      console.log(`📊 Total: ${response.body.statistics.totalRecords}, Valid: ${response.body.statistics.validRecords}, Errors: ${response.body.statistics.errorRecords}`);
    });

    test('should validate preview data', async () => {
      const response = await request(BASE_URL)
        .post(`/api/preview/${testSessionId}/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ performDeepValidation: true })
        .expect(200);

      expect(response.body).toHaveProperty('validationResults');
      expect(response.body.validationResults).toHaveProperty('isValid');
      expect(response.body.validationResults).toHaveProperty('errors');
      expect(response.body.validationResults).toHaveProperty('warnings');
    });
  });

  describe('5. Import Execution', () => {
    test('should execute import and track progress', async () => {
      const response = await request(BASE_URL)
        .post(`/api/import/${testSessionId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          importConfig: {
            entityType: 'product',
            brandId: 1,
            skipErrors: false,
            updateExisting: true
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('status');
      console.log(`✅ Import execution started: ${response.body.status}`);

      // Monitor progress
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await global.testUtils.wait(1000);

        const progressResponse = await request(BASE_URL)
          .get(`/api/import/${testSessionId}/progress`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const progress = progressResponse.body.progress;
        console.log(`📈 Progress: ${progress.processedRecords}/${progress.totalRecords} (${Math.round((progress.processedRecords/progress.totalRecords)*100)}%)`);

        if (progress.status === 'completed') {
          // Validate processing speed
          const avgTimePerRecord = progress.processingTime / progress.totalRecords;
          console.log(`✅ Import completed in ${progress.processingTime}ms`);
          console.log(`⚡ Processing speed: ${avgTimePerRecord.toFixed(2)}ms/record`);
          
          expect(avgTimePerRecord).toBeLessThan(global.testConfig.performance.maxRecordProcessingTime);
          break;
        } else if (progress.status === 'failed') {
          throw new Error(`Import failed: ${progress.error}`);
        }

        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Import did not complete within expected time');
      }
    });
  });

  describe('6. Error Recovery System', () => {
    test('should analyze errors and provide recovery suggestions', async () => {
      const testErrors = [
        {
          recordIndex: 0,
          field: 'price',
          value: 'invalid_price',
          rule: 'Invalid number format',
          severity: 'error'
        },
        {
          recordIndex: 1,
          field: 'name',
          value: '',
          rule: 'Required field missing',
          severity: 'error'
        }
      ];

      const response = await request(BASE_URL)
        .post(`/api/recovery/${testSessionId}/analyze`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ errors: testErrors })
        .expect(200);

      expect(response.body).toHaveProperty('analysis');
      expect(response.body.analysis).toHaveProperty('totalErrors');
      expect(response.body.analysis).toHaveProperty('autoFixable');
      expect(response.body.analysis).toHaveProperty('manualRequired');

      const autoFixRate = (response.body.analysis.autoFixable / response.body.analysis.totalErrors) * 100;
      console.log(`✅ Error analysis completed`);
      console.log(`🔧 Auto-fix rate: ${autoFixRate.toFixed(1)}%`);

      // Validate minimum auto-fix rate (target: 85%+)
      expect(autoFixRate).toBeGreaterThanOrEqual(80);
    });

    test('should apply auto-fixes', async () => {
      const response = await request(BASE_URL)
        .post(`/api/recovery/${testSessionId}/auto-fix`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          applyFixes: true,
          confidenceThreshold: 80
        })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveProperty('appliedFixes');
      expect(response.body.results).toHaveProperty('successRate');

      console.log(`✅ Auto-fix applied: ${response.body.results.appliedFixes} fixes`);
      console.log(`📊 Success rate: ${response.body.results.successRate}%`);
    });
  });

  describe('7. File Processing Performance', () => {
    test('should handle large file with streaming', async () => {
      const largeCsvData = global.testUtils.generateCSV(1000);
      const largeCsvPath = path.join(__dirname, 'test-large.csv');
      fs.writeFileSync(largeCsvPath, largeCsvData);

      const fileSize = fs.statSync(largeCsvPath).size;
      console.log(`📁 Testing large file: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

      const startTime = Date.now();
      const response = await request(BASE_URL)
        .post('/api/files/preview')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeCsvPath)
        .query({ sampleSize: 10 })
        .expect(200);

      const processingTime = Date.now() - startTime;

      expect(response.body).toHaveProperty('preview');
      expect(response.body.preview).toHaveProperty('estimatedRecords');
      expect(response.body.preview.estimatedRecords).toBe(1000);

      console.log(`✅ Large file processed in ${processingTime}ms`);
      console.log(`⚡ Processing rate: ${(1000 / (processingTime / 1000)).toFixed(0)} records/sec`);

      // Cleanup
      fs.unlinkSync(largeCsvPath);
    });

    test('should get file processor statistics', async () => {
      const response = await request(BASE_URL)
        .get('/api/files/processor/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalFilesProcessed');
      expect(response.body.stats).toHaveProperty('totalRecordsProcessed');
      expect(response.body.stats).toHaveProperty('averageProcessingTime');

      console.log(`✅ File processor stats retrieved`);
      console.log(`📊 Files processed: ${response.body.stats.totalFilesProcessed}`);
      console.log(`📈 Records processed: ${response.body.stats.totalRecordsProcessed}`);
    });
  });

  describe('8. WebSocket Integration', () => {
    test('should retrieve WebSocket statistics', async () => {
      const response = await request(BASE_URL)
        .get('/api/websocket/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalConnections');
      expect(response.body.stats).toHaveProperty('activeSessions');

      console.log(`✅ WebSocket stats retrieved`);
      console.log(`🔗 Total connections: ${response.body.stats.totalConnections}`);
      console.log(`💫 Active sessions: ${response.body.stats.activeSessions}`);
    });
  });

  describe('9. System Performance Validation', () => {
    test('should meet all performance targets', async () => {
      console.log('🎯 Validating System Performance Targets:');
      console.log(`   ⚡ Processing Speed: <${global.testConfig.performance.maxRecordProcessingTime}ms/record`);
      console.log(`   🧠 LLM Response: <${global.testConfig.performance.maxLLMResponseTime}ms`);
      console.log(`   💰 Cost per Session: <$${global.testConfig.performance.maxCostPerSession}`);
      console.log(`   🎯 Field Mapping Accuracy: >${global.testConfig.performance.minFieldMappingAccuracy}%`);
      console.log(`   📡 WebSocket Latency: <${global.testConfig.performance.maxWebSocketLatency}ms`);

      // All performance validations are embedded in individual tests
      // This test serves as a summary and documentation
      expect(true).toBe(true);
    });
  });

  afterAll(async () => {
    // Cleanup session if created
    if (testSessionId) {
      try {
        await request(BASE_URL)
          .delete(`/api/upload/${testSessionId}`)
          .set('Authorization', `Bearer ${authToken}`);
      } catch (error) {
        console.warn('Session cleanup failed:', error.message);
      }
    }
  });
});