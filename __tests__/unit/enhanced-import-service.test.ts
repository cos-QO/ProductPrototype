/**
 * Unit Tests for Enhanced Import Service
 * Tests session management, variable injection, JSON parsing, and error recovery
 * Validates 100% JSON schema compliance and <$0.001 cost efficiency
 */

import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../server/websocket-service', () => ({
  WebSocketService: {
    getInstance: () => ({
      broadcastProgress: jest.fn(),
      broadcastError: jest.fn(),
      broadcastComplete: jest.fn()
    })
  }
}));

jest.mock('../../server/services/field-extraction-service', () => ({
  FieldExtractionService: {
    getInstance: () => ({
      extractFieldsFromFile: jest.fn().mockResolvedValue({
        fields: [
          {
            name: 'product_name',
            dataType: 'string',
            sampleValues: ['Test Product'],
            nullPercentage: 0,
            uniquePercentage: 100,
            isRequired: true
          },
          {
            name: 'price',
            dataType: 'number',
            sampleValues: [29.99],
            nullPercentage: 0,
            uniquePercentage: 100,
            isRequired: true
          }
        ],
        sampleData: [['Test Product', 29.99]],
        fileType: 'csv',
        metadata: {
          totalRecords: 1,
          totalFields: 2,
          fileSize: 1024,
          parseTime: 150,
          hasHeaders: true
        },
        confidence: 0.95
      })
    })
  }
}));

jest.mock('../../server/field-mapping-engine', () => ({
  FieldMappingEngine: jest.fn().mockImplementation(() => ({
    analyzeFieldMapping: jest.fn().mockResolvedValue({
      mappings: [
        {
          sourceField: 'product_name',
          targetField: 'name',
          confidence: 95,
          strategy: 'exact',
          reasoning: 'Direct field name match'
        },
        {
          sourceField: 'price',
          targetField: 'price',
          confidence: 100,
          strategy: 'exact',
          reasoning: 'Exact field name and type match'
        }
      ],
      metadata: {
        totalFields: 2,
        processingTime: 1200,
        cacheHits: 0,
        llmCost: 0.0008
      },
      status: 'success',
      errors: []
    })
  }))
}));

// Import after mocking
const { EnhancedImportService } = require('../../server/enhanced-import-service');

describe('EnhancedImportService', () => {
  let service: any;

  beforeEach(() => {
    service = new EnhancedImportService();
    clearConsoleErrors();
    jest.clearAllMocks();
  });

  describe('Session Management', () => {
    test('should create import session with unique ID', async () => {
      const session = await service.createImportSession({
        userId: 1,
        fileName: 'test.csv',
        fileSize: 1024,
        fileType: 'csv'
      });

      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toMatch(/^[a-zA-Z0-9\-_]+$/);
      expect(session.status).toBe('initiated');
      expect(session.metadata.fileName).toBe('test.csv');
      expect(session.metadata.fileSize).toBe(1024);
      expect(session.metadata.totalSteps).toBe(4);
    });

    test('should track session progress through workflow steps', async () => {
      const session = await service.createImportSession({
        userId: 1,
        fileName: 'test.csv',
        fileSize: 1024,
        fileType: 'csv'
      });

      // Step 1: File analysis
      await service.updateSessionProgress(session.sessionId, {
        step: 1,
        stepName: 'file_analysis',
        progress: 25,
        message: 'Analyzing file structure'
      });

      const updatedSession = await service.getSession(session.sessionId);
      expect(updatedSession.progress.currentStep).toBe(1);
      expect(updatedSession.progress.percentage).toBe(25);
      expect(updatedSession.status).toBe('analyzing');
    });

    test('should handle session timeout and cleanup', async () => {
      const session = await service.createImportSession({
        userId: 1,
        fileName: 'test.csv',
        fileSize: 1024,
        fileType: 'csv'
      });

      // Simulate timeout
      await service.handleSessionTimeout(session.sessionId);

      const timedOutSession = await service.getSession(session.sessionId);
      expect(timedOutSession.status).toBe('timeout');
      expect(timedOutSession.metadata.endTime).toBeDefined();
    });
  });

  describe('Variable Injection System', () => {
    test('should inject [UPLOADED_FIELDS] variable correctly', async () => {
      const template = 'Please map these uploaded fields: [UPLOADED_FIELDS] to the product schema.';
      const fields = ['product_name', 'price', 'sku', 'description'];

      const result = service.injectVariables(template, {
        UPLOADED_FIELDS: fields
      });

      expect(result).toContain('product_name');
      expect(result).toContain('price');
      expect(result).toContain('sku');
      expect(result).toContain('description');
      expect(result).not.toContain('[UPLOADED_FIELDS]');
    });

    test('should handle complex field structures in injection', async () => {
      const template = 'Map these fields: [UPLOADED_FIELDS] with their types and requirements.';
      const complexFields = [
        { name: 'product_name', type: 'string', required: true, sample: 'Test Product' },
        { name: 'price', type: 'number', required: true, sample: 29.99 },
        { name: 'description', type: 'string', required: false, sample: 'Product description' }
      ];

      const result = service.injectVariables(template, {
        UPLOADED_FIELDS: complexFields
      });

      expect(result).toContain('product_name (string, required)');
      expect(result).toContain('price (number, required)');
      expect(result).toContain('description (string, optional)');
      expect(result).not.toContain('[UPLOADED_FIELDS]');
    });

    test('should optimize field lists for token efficiency', async () => {
      const longFieldList = Array.from({ length: 100 }, (_, i) => ({
        name: `field_${i}`,
        type: 'string',
        required: i % 2 === 0
      }));

      const template = 'Map these fields: [UPLOADED_FIELDS]';
      const result = service.injectVariables(template, {
        UPLOADED_FIELDS: longFieldList
      });

      // Should truncate or summarize long lists
      const tokenCount = result.split(' ').length;
      expect(tokenCount).toBeLessThan(1000); // Reasonable token limit
    });

    test('should handle missing variables gracefully', async () => {
      const template = 'Map [UPLOADED_FIELDS] and [MISSING_VARIABLE] to schema.';
      const result = service.injectVariables(template, {
        UPLOADED_FIELDS: ['field1', 'field2']
      });

      expect(result).toContain('field1');
      expect(result).toContain('field2');
      expect(result).toContain('[MISSING_VARIABLE]'); // Should leave unknown variables
    });

    test('should support nested variable substitution', async () => {
      const template = 'Process [FIELD_COUNT] fields: [UPLOADED_FIELDS]';
      const fields = ['name', 'price', 'sku'];
      
      const result = service.injectVariables(template, {
        UPLOADED_FIELDS: fields,
        FIELD_COUNT: fields.length
      });

      expect(result).toContain('Process 3 fields');
      expect(result).toContain('name, price, sku');
    });
  });

  describe('JSON Response Parsing and Validation', () => {
    test('should validate JSON response against schema', async () => {
      const validResponse = {
        mappings: [
          {
            sourceField: 'product_name',
            targetField: 'name',
            confidence: 95,
            strategy: 'exact',
            reasoning: 'Direct match'
          }
        ],
        metadata: {
          totalFields: 1,
          processingTime: 1200,
          cacheHits: 0,
          llmCost: 0.0005
        },
        status: 'success',
        errors: []
      };

      const validation = service.validateMappingResponse(validResponse);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validResponse).toMatchSchema({
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
          cacheHits: 'number',
          llmCost: 'number'
        },
        status: 'enum[success|partial|failed]',
        errors: 'array'
      });
    });

    test('should detect and report schema violations', async () => {
      const invalidResponse = {
        mappings: [
          {
            sourceField: 'product_name',
            // Missing targetField
            confidence: 'invalid_number', // Wrong type
            strategy: 'invalid_strategy', // Invalid enum value
            reasoning: 123 // Wrong type
          }
        ],
        metadata: {
          totalFields: 'not_a_number' // Wrong type
        },
        status: 'invalid_status', // Invalid enum value
        errors: 'not_an_array' // Wrong type
      };

      const validation = service.validateMappingResponse(invalidResponse);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('targetField'),
          expect.stringContaining('confidence'),
          expect.stringContaining('strategy'),
          expect.stringContaining('totalFields'),
          expect.stringContaining('status')
        ])
      );
    });

    test('should handle malformed JSON gracefully', async () => {
      const malformedJSON = '{"mappings": [invalid json structure}';
      
      const parseResult = service.parseJSONResponse(malformedJSON);
      
      expect(parseResult.success).toBe(false);
      expect(parseResult.error).toContain('Invalid JSON');
      expect(parseResult.data).toBeNull();
    });

    test('should generate migration instructions from mappings', async () => {
      const mappings = [
        {
          sourceField: 'prod_name',
          targetField: 'name',
          confidence: 90,
          strategy: 'fuzzy'
        },
        {
          sourceField: 'price_usd',
          targetField: 'price',
          confidence: 85,
          strategy: 'statistical'
        }
      ];

      const instructions = service.generateMigrationInstructions(mappings);
      
      expect(instructions).toHaveLength(2);
      expect(instructions[0]).toEqual({
        action: 'map_field',
        from: 'prod_name',
        to: 'name',
        confidence: 90,
        transformation: null
      });
      expect(instructions[1]).toEqual({
        action: 'map_field',
        from: 'price_usd',
        to: 'price',
        confidence: 85,
        transformation: expect.any(String)
      });
    });
  });

  describe('Error Recovery and Auto-Fix', () => {
    test('should detect and suggest fixes for common data issues', async () => {
      const dataIssues = [
        { row: 1, field: 'price', value: '$invalid', issue: 'invalid_number' },
        { row: 2, field: 'email', value: 'not-an-email', issue: 'invalid_email' },
        { row: 3, field: 'date', value: '32/13/2024', issue: 'invalid_date' }
      ];

      const fixes = service.generateAutoFixes(dataIssues);
      
      expect(fixes).toHaveLength(3);
      
      const priceFix = fixes.find(f => f.field === 'price');
      expect(priceFix?.suggestedAction).toBe('remove_currency_symbols');
      expect(priceFix?.confidence).toBeGreaterThan(80);
      
      const emailFix = fixes.find(f => f.field === 'email');
      expect(emailFix?.suggestedAction).toBe('validate_email_format');
      
      const dateFix = fixes.find(f => f.field === 'date');
      expect(dateFix?.suggestedAction).toBe('standardize_date_format');
    });

    test('should apply auto-fixes with user approval', async () => {
      const originalData = [
        { price: '$29.99', email: 'user@domain', date: '12/31/2024' },
        { price: '39.99', email: 'test@example.com', date: '2024-01-01' }
      ];

      const autoFixes = [
        {
          field: 'price',
          suggestedAction: 'remove_currency_symbols',
          rows: [0],
          confidence: 95
        }
      ];

      const fixedData = service.applyAutoFixes(originalData, autoFixes, {
        approvedFixes: ['remove_currency_symbols']
      });

      expect(fixedData[0].price).toBe('29.99');
      expect(fixedData[1].price).toBe('39.99'); // Should remain unchanged
    });

    test('should track auto-fix success rates for learning', async () => {
      const fixResult = {
        fixType: 'remove_currency_symbols',
        appliedCount: 10,
        successCount: 9,
        userApprovalRate: 0.9
      };

      await service.recordAutoFixPerformance(fixResult);
      
      // Should update internal success rate tracking
      const fixStats = service.getAutoFixStatistics('remove_currency_symbols');
      expect(fixStats.successRate).toBeGreaterThan(0.8);
      expect(fixStats.confidence).toBeGreaterThan(80);
    });
  });

  describe('Performance and Cost Validation', () => {
    test('should meet response time requirements', async () => {
      const startTime = Date.now();
      
      const result = await service.processFileUpload({
        buffer: testUtils.createBuffer('product_name,price\nTest,29.99'),
        fileName: 'test.csv',
        fileType: 'csv',
        userId: 1
      });
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RESPONSE_TIME);
      expect(result.processingTime).toBeLessThan(1800); // Buffer for overhead
    });

    test('should track and limit LLM costs', async () => {
      const result = await service.processFieldMapping({
        sessionId: 'test-session',
        sourceFields: [
          {
            name: 'product_name',
            dataType: 'string',
            sampleValues: ['Test'],
            nullPercentage: 0,
            uniquePercentage: 100,
            isRequired: true
          }
        ],
        targetFields: ['name', 'price'],
        options: { enableLLM: true }
      });

      expect(result.metadata.llmCost).toBeDefined();
      expect(result.metadata.llmCost).toBeLessThan(PERFORMANCE_THRESHOLDS.COST_PER_OPERATION);
      
      // Should track cumulative costs
      const sessionCosts = await service.getSessionCosts('test-session');
      expect(sessionCosts.total).toBeLessThan(0.01); // Reasonable session limit
    });

    test('should implement cost controls and warnings', async () => {
      // Mock high cost scenario
      const highCostSession = 'high-cost-session';
      service.sessionCosts.set(highCostSession, { total: 0.05, operations: 50 });

      const costCheck = service.checkCostLimits(highCostSession);
      
      expect(costCheck.withinLimits).toBe(false);
      expect(costCheck.warnings).toContain('cost_limit_exceeded');
      expect(costCheck.recommendedActions).toContain('enable_caching');
    });

    test('should optimize performance through caching', async () => {
      const fieldPattern = {
        sourceFields: ['product_name', 'price'],
        targetFields: ['name', 'price']
      };

      // First call - should hit LLM
      const firstResult = await service.processFieldMapping({
        sessionId: 'cache-test-1',
        ...fieldPattern,
        options: { enableLLM: true }
      });

      // Second call - should use cache
      const secondResult = await service.processFieldMapping({
        sessionId: 'cache-test-2',
        ...fieldPattern,
        options: { enableLLM: true }
      });

      expect(firstResult.metadata.cacheHits).toBe(0);
      expect(secondResult.metadata.cacheHits).toBeGreaterThan(0);
      expect(secondResult.metadata.llmCost).toBe(0); // Cached response
    });
  });

  describe('Real-time Progress Tracking', () => {
    test('should broadcast progress updates via WebSocket', async () => {
      const { WebSocketService } = require('../../server/websocket-service');
      const wsService = WebSocketService.getInstance();

      await service.updateSessionProgress('test-session', {
        step: 2,
        stepName: 'field_mapping',
        progress: 50,
        message: 'Analyzing field mappings'
      });

      expect(wsService.broadcastProgress).toHaveBeenCalledWith(
        'test-session',
        expect.objectContaining({
          step: 2,
          stepName: 'field_mapping',
          progress: 50,
          message: 'Analyzing field mappings'
        })
      );
    });

    test('should handle WebSocket connection failures gracefully', async () => {
      const { WebSocketService } = require('../../server/websocket-service');
      const wsService = WebSocketService.getInstance();
      
      // Mock WebSocket failure
      wsService.broadcastProgress.mockRejectedValueOnce(new Error('WebSocket unavailable'));

      // Should not throw error, just log and continue
      await expect(
        service.updateSessionProgress('test-session', {
          step: 1,
          stepName: 'test',
          progress: 25,
          message: 'Test'
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Data Integrity and Validation', () => {
    test('should validate imported data against schema', async () => {
      const importData = [
        { name: 'Product 1', price: 29.99, sku: 'SKU-001' },
        { name: 'Product 2', price: 'invalid', sku: 'SKU-002' }, // Invalid price
        { name: '', price: 39.99, sku: 'SKU-003' } // Missing required field
      ];

      const validation = service.validateImportData(importData, {
        requiredFields: ['name', 'price', 'sku'],
        fieldTypes: {
          name: 'string',
          price: 'number',
          sku: 'string'
        }
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(2);
      expect(validation.validRecords).toBe(1);
      expect(validation.totalRecords).toBe(3);
    });

    test('should generate comprehensive validation report', async () => {
      const validationResult = {
        isValid: false,
        errors: [
          { row: 2, field: 'price', value: 'invalid', issue: 'type_mismatch' },
          { row: 3, field: 'name', value: '', issue: 'required_field_missing' }
        ],
        validRecords: 1,
        totalRecords: 3
      };

      const report = service.generateValidationReport(validationResult);

      expect(report.summary.successRate).toBe(33.33);
      expect(report.summary.totalErrors).toBe(2);
      expect(report.errorsByType.type_mismatch).toBe(1);
      expect(report.errorsByType.required_field_missing).toBe(1);
      expect(report.recommendations).toContain('Fix type mismatches');
    });
  });

  afterEach(() => {
    const errors = getConsoleErrors();
    if (errors.length > 0) {
      console.warn('Console errors detected during enhanced import test:', errors);
    }
  });
});