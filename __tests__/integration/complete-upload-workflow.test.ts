/**
 * Integration Tests for Complete Upload Workflow
 * Tests end-to-end file upload, analysis, mapping, and import process
 * Validates performance targets and accuracy requirements
 */

import { jest } from '@jest/globals';
import request from 'supertest';

// Mock database and external services
jest.mock('../../server/db', () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      })
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue([{ insertedId: 1 }])
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ affectedRows: 1 }])
      })
    })
  }
}));

// Import server after mocking
const app = require('../../server/index');

describe('Complete Upload Workflow Integration Tests', () => {
  let server: any;
  let sessionId: string;

  beforeAll(async () => {
    // Setup test server
    server = app.listen(0); // Use random port
    await testUtils.waitFor(100); // Allow server to start
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(() => {
    clearConsoleErrors();
    jest.clearAllMocks();
  });

  describe('File Upload and Initial Analysis', () => {
    test('should handle CSV file upload with standard fields', async () => {
      const csvContent = testUtils.generateCSV(
        ['product_name', 'price', 'sku', 'description', 'category'],
        [
          ['Premium Headphones', '99.99', 'AUDIO-001', 'High-quality wireless headphones', 'Electronics'],
          ['Gaming Mouse', '49.99', 'GAMING-002', 'Ergonomic gaming mouse', 'Electronics'],
          ['Office Chair', '299.99', 'FURN-003', 'Comfortable office chair', 'Furniture']
        ]
      );

      const response = await request(app)
        .post('/api/upload/file')
        .attach('file', Buffer.from(csvContent), 'products.csv')
        .field('userId', '1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.analysis.fields).toHaveLength(5);
      expect(response.body.analysis.metadata.totalRecords).toBe(3);
      expect(response.body.analysis.confidence).toBeGreaterThan(0.8);

      sessionId = response.body.sessionId;

      // Validate field extraction
      const fields = response.body.analysis.fields;
      const nameField = fields.find((f: any) => f.name === 'product_name');
      expect(nameField.dataType).toBe('string');
      expect(nameField.isRequired).toBe(true);

      const priceField = fields.find((f: any) => f.name === 'price');
      expect(priceField.dataType).toBe('number');
      expect(priceField.metadata.inferredType).toBe('currency');
    });

    test('should handle JSON file upload with nested structures', async () => {
      const jsonData = [
        {
          product: {
            name: 'Smart Watch',
            details: {
              price: 199.99,
              model: 'SW-2024'
            }
          },
          inventory: {
            sku: 'WATCH-001',
            quantity: 50
          },
          metadata: {
            category: 'Electronics',
            brand: 'TechCorp'
          }
        },
        {
          product: {
            name: 'Fitness Tracker',
            details: {
              price: 89.99,
              model: 'FT-2024'
            }
          },
          inventory: {
            sku: 'FITNESS-002',
            quantity: 75
          },
          metadata: {
            category: 'Health',
            brand: 'FitTech'
          }
        }
      ];

      const response = await request(app)
        .post('/api/upload/file')
        .attach('file', Buffer.from(JSON.stringify(jsonData)), 'products.json')
        .field('userId', '1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.analysis.fields.length).toBeGreaterThan(0);
      expect(response.body.analysis.metadata.totalRecords).toBe(2);

      // Should handle nested structures appropriately
      const fields = response.body.analysis.fields;
      expect(fields.some((f: any) => f.name.includes('product'))).toBe(true);
    });

    test('should reject files that are too large', async () => {
      const largeContent = 'a'.repeat(20 * 1024 * 1024); // 20MB

      const response = await request(app)
        .post('/api/upload/file')
        .attach('file', Buffer.from(largeContent), 'large.csv')
        .field('userId', '1')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('file too large');
    });

    test('should validate file types and reject unsupported formats', async () => {
      const invalidContent = 'This is not a valid CSV or JSON file content';

      const response = await request(app)
        .post('/api/upload/file')
        .attach('file', Buffer.from(invalidContent), 'invalid.txt')
        .field('userId', '1')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('unsupported file type');
    });
  });

  describe('Field Mapping Analysis', () => {
    test('should analyze field mappings with high accuracy', async () => {
      // First upload a file
      const csvContent = testUtils.generateCSV(
        ['prod_name', 'amt', 'stock_code', 'item_desc'],
        [
          ['Product 1', '29.99', 'SKU001', 'Description 1'],
          ['Product 2', '49.99', 'SKU002', 'Description 2']
        ]
      );

      const uploadResponse = await request(app)
        .post('/api/upload/file')
        .attach('file', Buffer.from(csvContent), 'products.csv')
        .field('userId', '1')
        .expect(200);

      const sessionId = uploadResponse.body.sessionId;

      // Then analyze field mappings
      const mappingResponse = await request(app)
        .post('/api/mapping/analyze')
        .send({
          sessionId,
          targetFields: ['name', 'price', 'sku', 'description', 'category'],
          options: {
            enableLLM: false, // Use algorithmic strategies only for predictable testing
            strategies: ['exact', 'fuzzy', 'statistical']
          }
        })
        .expect(200);

      expect(mappingResponse.body.success).toBe(true);
      expect(mappingResponse.body.mappings).toBeDefined();
      expect(mappingResponse.body.mappings.length).toBeGreaterThan(0);

      // Validate mapping accuracy
      const mappings = mappingResponse.body.mappings;
      
      // Should map prod_name to name with high confidence
      const nameMapping = mappings.find((m: any) => m.targetField === 'name');
      expect(nameMapping).toBeDefined();
      expect(nameMapping.sourceField).toBe('prod_name');
      expect(nameMapping.confidence).toBeGreaterThan(70);

      // Should map amt to price
      const priceMapping = mappings.find((m: any) => m.targetField === 'price');
      expect(priceMapping).toBeDefined();
      expect(priceMapping.sourceField).toBe('amt');
      expect(priceMapping.confidence).toBeGreaterThan(60);

      // Validate response schema
      expect(mappingResponse.body).toMatchSchema({
        success: 'boolean',
        mappings: [{
          sourceField: 'string',
          targetField: 'string',
          confidence: 'number',
          strategy: 'enum[exact|fuzzy|llm|historical|statistical]',
          reasoning: 'string'
        }],
        metadata: {
          totalFields: 'number',
          processingTime: 'number',
          cacheHits: 'number'
        }
      });
    });

    test('should meet performance requirements for field mapping', async () => {
      const csvContent = testUtils.generateCSV(
        Array.from({ length: 25 }, (_, i) => `field_${i}`),
        [Array.from({ length: 25 }, (_, i) => `value_${i}`)]
      );

      const uploadResponse = await request(app)
        .post('/api/upload/file')
        .attach('file', Buffer.from(csvContent), 'large-fields.csv')
        .field('userId', '1')
        .expect(200);

      const startTime = Date.now();
      
      const mappingResponse = await request(app)
        .post('/api/mapping/analyze')
        .send({
          sessionId: uploadResponse.body.sessionId,
          targetFields: ['name', 'price', 'sku', 'description', 'category'],
          options: { enableLLM: false }
        })
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RESPONSE_TIME);
      expect(mappingResponse.body.metadata.processingTime).toBeLessThan(1800);
    });

    test('should handle mapping errors gracefully', async () => {
      const response = await request(app)
        .post('/api/mapping/analyze')
        .send({
          sessionId: 'non-existent-session',
          targetFields: ['name'],
          options: {}
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('session not found');
    });
  });

  describe('Data Preview and Validation', () => {
    test('should generate data preview with applied mappings', async () => {
      // Upload file
      const csvContent = testUtils.generateCSV(
        ['product_name', 'price', 'sku'],
        [
          ['Product 1', '29.99', 'SKU001'],
          ['Product 2', '49.99', 'SKU002'],
          ['Product 3', '19.99', 'SKU003']
        ]
      );

      const uploadResponse = await request(app)
        .post('/api/upload/file')
        .attach('file', Buffer.from(csvContent), 'products.csv')
        .field('userId', '1')
        .expect(200);

      const sessionId = uploadResponse.body.sessionId;

      // Analyze mappings
      const mappingResponse = await request(app)
        .post('/api/mapping/analyze')
        .send({
          sessionId,
          targetFields: ['name', 'price', 'sku'],
          options: { enableLLM: false }
        })
        .expect(200);

      // Generate preview
      const previewResponse = await request(app)
        .post('/api/preview/generate')
        .send({
          sessionId,
          mappings: mappingResponse.body.mappings,
          previewSize: 5
        })
        .expect(200);

      expect(previewResponse.body.success).toBe(true);
      expect(previewResponse.body.preview).toBeDefined();
      expect(previewResponse.body.preview.length).toBe(3);

      // Validate preview structure
      const preview = previewResponse.body.preview;
      expect(preview[0]).toHaveProperty('name', 'Product 1');
      expect(preview[0]).toHaveProperty('price', 29.99);
      expect(preview[0]).toHaveProperty('sku', 'SKU001');
    });

    test('should detect and report data quality issues', async () => {
      const csvContent = testUtils.generateCSV(
        ['product_name', 'price', 'email'],
        [
          ['Valid Product', '29.99', 'valid@example.com'],
          ['', '99.99', 'also-valid@test.org'], // Missing name
          ['Another Product', 'invalid-price', 'invalid-email'], // Invalid price and email
          ['Good Product', '-5.00', 'good@example.com'] // Negative price
        ]
      );

      const uploadResponse = await request(app)
        .post('/api/upload/file')
        .attach('file', Buffer.from(csvContent), 'products.csv')
        .field('userId', '1')
        .expect(200);

      const validationResponse = await request(app)
        .post('/api/preview/validate')
        .send({
          sessionId: uploadResponse.body.sessionId,
          validationRules: {
            requiredFields: ['product_name'],
            fieldTypes: {
              product_name: 'string',
              price: 'number',
              email: 'email'
            },
            constraints: {
              price: { min: 0 }
            }
          }
        })
        .expect(200);

      expect(validationResponse.body.success).toBe(true);
      expect(validationResponse.body.validation.isValid).toBe(false);
      expect(validationResponse.body.validation.errors.length).toBeGreaterThan(0);

      const errors = validationResponse.body.validation.errors;
      expect(errors.some((e: any) => e.issue === 'required_field_missing')).toBe(true);
      expect(errors.some((e: any) => e.issue === 'invalid_email')).toBe(true);
      expect(errors.some((e: any) => e.issue === 'type_mismatch')).toBe(true);
    });
  });

  describe('Import Execution and Progress Tracking', () => {
    test('should execute complete import with progress updates', async () => {
      // Upload file
      const csvContent = testUtils.generateCSV(
        ['product_name', 'price', 'sku', 'description'],
        Array.from({ length: 50 }, (_, i) => [
          `Product ${i + 1}`,
          `${(Math.random() * 100).toFixed(2)}`,
          `SKU-${String(i + 1).padStart(3, '0')}`,
          `Description for product ${i + 1}`
        ])
      );

      const uploadResponse = await request(app)
        .post('/api/upload/file')
        .attach('file', Buffer.from(csvContent), 'products.csv')
        .field('userId', '1')
        .expect(200);

      const sessionId = uploadResponse.body.sessionId;

      // Execute import
      const importResponse = await request(app)
        .post('/api/import/execute')
        .send({
          sessionId,
          mappings: [
            { sourceField: 'product_name', targetField: 'name', confidence: 100 },
            { sourceField: 'price', targetField: 'price', confidence: 100 },
            { sourceField: 'sku', targetField: 'sku', confidence: 100 },
            { sourceField: 'description', targetField: 'description', confidence: 100 }
          ],
          options: {
            batchSize: 10,
            skipErrors: false
          }
        })
        .expect(202); // Accepted for async processing

      expect(importResponse.body.success).toBe(true);
      expect(importResponse.body.importId).toBeDefined();

      // Check import status
      let importComplete = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      while (!importComplete && attempts < maxAttempts) {
        await testUtils.waitFor(1000); // Wait 1 second
        
        const statusResponse = await request(app)
          .get(`/api/import/status/${sessionId}`)
          .expect(200);

        expect(statusResponse.body.success).toBe(true);
        expect(statusResponse.body.status).toBeDefined();

        if (['completed', 'failed'].includes(statusResponse.body.status.status)) {
          importComplete = true;
          
          if (statusResponse.body.status.status === 'completed') {
            expect(statusResponse.body.status.progress.percentage).toBe(100);
            expect(statusResponse.body.status.results.successCount).toBe(50);
            expect(statusResponse.body.status.results.errorCount).toBe(0);
          }
        }
        
        attempts++;
      }

      expect(importComplete).toBe(true);
    });

    test('should handle import errors and provide recovery suggestions', async () => {
      const csvContent = testUtils.generateCSV(
        ['product_name', 'price', 'sku'],
        [
          ['Valid Product', '29.99', 'VALID-001'],
          ['', '49.99', 'MISSING-NAME'], // Missing required field
          ['Another Product', 'invalid', 'INVALID-PRICE'], // Invalid price
          ['Duplicate SKU', '39.99', 'VALID-001'] // Duplicate SKU
        ]
      );

      const uploadResponse = await request(app)
        .post('/api/upload/file')
        .attach('file', Buffer.from(csvContent), 'error-products.csv')
        .field('userId', '1')
        .expect(200);

      const importResponse = await request(app)
        .post('/api/import/execute')
        .send({
          sessionId: uploadResponse.body.sessionId,
          mappings: [
            { sourceField: 'product_name', targetField: 'name', confidence: 100 },
            { sourceField: 'price', targetField: 'price', confidence: 100 },
            { sourceField: 'sku', targetField: 'sku', confidence: 100 }
          ],
          options: {
            skipErrors: true,
            generateRecoveryReport: true
          }
        })
        .expect(202);

      // Wait for completion and check error handling
      await testUtils.waitFor(3000);

      const statusResponse = await request(app)
        .get(`/api/import/status/${uploadResponse.body.sessionId}`)
        .expect(200);

      expect(statusResponse.body.status.results.errorCount).toBeGreaterThan(0);
      expect(statusResponse.body.status.results.errors).toBeDefined();
      expect(statusResponse.body.status.recoveryReport).toBeDefined();

      const recoveryReport = statusResponse.body.status.recoveryReport;
      expect(recoveryReport.autoFixSuggestions.length).toBeGreaterThan(0);
      expect(recoveryReport.manualActionRequired.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery and Auto-Fix', () => {
    test('should detect and auto-fix common data issues', async () => {
      const csvContent = testUtils.generateCSV(
        ['product_name', 'price', 'email', 'phone'],
        [
          ['Product 1', '$29.99', 'user@example.com', '(555) 123-4567'],
          ['Product 2', '49.99 USD', 'test@domain.org', '555-987-6543'],
          ['Product 3', '€39.99', 'admin@company.co.uk', '+1-555-111-2222']
        ]
      );

      const uploadResponse = await request(app)
        .post('/api/upload/file')
        .attach('file', Buffer.from(csvContent), 'products.csv')
        .field('userId', '1')
        .expect(200);

      const autoFixResponse = await request(app)
        .post('/api/recovery/analyze')
        .send({
          sessionId: uploadResponse.body.sessionId,
          targetSchema: {
            name: { type: 'string', required: true },
            price: { type: 'number', required: true },
            email: { type: 'email', required: false },
            phone: { type: 'phone', required: false }
          }
        })
        .expect(200);

      expect(autoFixResponse.body.success).toBe(true);
      expect(autoFixResponse.body.autoFixes).toBeDefined();
      expect(autoFixResponse.body.autoFixes.length).toBeGreaterThan(0);

      const autoFixes = autoFixResponse.body.autoFixes;
      
      // Should detect currency symbol removal
      const priceFix = autoFixes.find((f: any) => f.field === 'price');
      expect(priceFix).toBeDefined();
      expect(priceFix.suggestedAction).toBe('normalize_currency');
      expect(priceFix.confidence).toBeGreaterThan(80);

      // Apply auto-fixes
      const applyResponse = await request(app)
        .post('/api/recovery/apply-fixes')
        .send({
          sessionId: uploadResponse.body.sessionId,
          approvedFixes: ['normalize_currency', 'standardize_phone'],
          autoApproveHighConfidence: true
        })
        .expect(200);

      expect(applyResponse.body.success).toBe(true);
      expect(applyResponse.body.appliedFixes.length).toBeGreaterThan(0);
    });
  });

  describe('WebSocket Real-time Updates', () => {
    test('should receive progress updates via WebSocket', (done) => {
      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://localhost:${server.address()?.port}/ws`);

      let progressUpdates: any[] = [];

      ws.on('open', async () => {
        // Subscribe to session updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          sessionId: 'test-websocket-session'
        }));

        // Trigger an import that will send progress updates
        const csvContent = testUtils.generateCSV(
          ['name', 'price'],
          Array.from({ length: 20 }, (_, i) => [`Product ${i}`, `${i * 10}`])
        );

        await request(app)
          .post('/api/upload/file')
          .attach('file', Buffer.from(csvContent), 'products.csv')
          .field('userId', '1')
          .field('sessionId', 'test-websocket-session');
      });

      ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'progress') {
          progressUpdates.push(message);
          
          // Check if we received completion message
          if (message.progress.percentage === 100) {
            expect(progressUpdates.length).toBeGreaterThan(1);
            expect(progressUpdates[0].progress.percentage).toBeLessThan(100);
            expect(progressUpdates[progressUpdates.length - 1].progress.percentage).toBe(100);
            
            ws.close();
            done();
          }
        }
      });

      ws.on('error', (error: Error) => {
        done(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        ws.close();
        done(new Error('WebSocket test timeout'));
      }, 10000);
    });
  });

  describe('Performance and Accuracy Validation', () => {
    test('should achieve 85% field mapping accuracy across diverse datasets', async () => {
      const testDatasets = [
        {
          name: 'standard_fields',
          headers: ['product_name', 'price', 'sku', 'description'],
          expectedMappings: { product_name: 'name', price: 'price', sku: 'sku', description: 'description' }
        },
        {
          name: 'abbreviated_fields',
          headers: ['prod', 'amt', 'qty', 'desc'],
          expectedMappings: { prod: 'name', amt: 'price', qty: 'quantity', desc: 'description' }
        },
        {
          name: 'mixed_case',
          headers: ['Product Name', 'PRICE', 'SKU_Code', 'item_description'],
          expectedMappings: { 'Product Name': 'name', 'PRICE': 'price', 'SKU_Code': 'sku', 'item_description': 'description' }
        }
      ];

      let totalCorrectMappings = 0;
      let totalMappings = 0;

      for (const dataset of testDatasets) {
        const csvContent = testUtils.generateCSV(
          dataset.headers,
          [dataset.headers.map((_, i) => `value_${i}`)]
        );

        const uploadResponse = await request(app)
          .post('/api/upload/file')
          .attach('file', Buffer.from(csvContent), `${dataset.name}.csv`)
          .field('userId', '1')
          .expect(200);

        const mappingResponse = await request(app)
          .post('/api/mapping/analyze')
          .send({
            sessionId: uploadResponse.body.sessionId,
            targetFields: ['name', 'price', 'sku', 'description', 'quantity'],
            options: { enableLLM: false }
          })
          .expect(200);

        const mappings = mappingResponse.body.mappings;
        
        for (const mapping of mappings) {
          totalMappings++;
          
          const expectedTarget = dataset.expectedMappings[mapping.sourceField];
          if (expectedTarget && mapping.targetField === expectedTarget && mapping.confidence >= 60) {
            totalCorrectMappings++;
          }
        }
      }

      const accuracy = (totalCorrectMappings / totalMappings) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(ACCURACY_THRESHOLDS.FIELD_MAPPING);
    });

    test('should meet cost efficiency targets', async () => {
      const operationCosts: number[] = [];

      // Perform multiple operations and track costs
      for (let i = 0; i < 5; i++) {
        const csvContent = testUtils.generateCSV(
          ['name', 'price', 'sku'],
          [[`Product ${i}`, `${i * 10}`, `SKU-${i}`]]
        );

        const uploadResponse = await request(app)
          .post('/api/upload/file')
          .attach('file', Buffer.from(csvContent), `product-${i}.csv`)
          .field('userId', '1')
          .expect(200);

        const mappingResponse = await request(app)
          .post('/api/mapping/analyze')
          .send({
            sessionId: uploadResponse.body.sessionId,
            targetFields: ['name', 'price', 'sku'],
            options: { enableLLM: true } // Enable LLM to test cost tracking
          })
          .expect(200);

        if (mappingResponse.body.metadata.llmCost) {
          operationCosts.push(mappingResponse.body.metadata.llmCost);
        }
      }

      // Average cost should be below threshold
      const averageCost = operationCosts.reduce((a, b) => a + b, 0) / operationCosts.length;
      expect(averageCost).toBeLessThan(PERFORMANCE_THRESHOLDS.COST_PER_OPERATION);
    });
  });

  afterEach(() => {
    const errors = getConsoleErrors();
    if (errors.length > 0) {
      console.warn('Console errors detected during integration test:', errors);
    }
  });
});