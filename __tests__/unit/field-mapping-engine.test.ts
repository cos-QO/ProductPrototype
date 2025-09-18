/**
 * Unit Tests for Field Mapping Engine
 * Tests multi-strategy field mapping with 85%+ accuracy target
 * Validates exact, fuzzy, LLM, historical, and statistical mapping strategies
 */

import { jest } from '@jest/globals';

// Mock dependencies before importing
jest.mock('../../server/db', () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([])
        })
      })
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue([{ insertedId: 1 }])
    })
  }
}));

jest.mock('../../server/services/openrouter-client', () => ({
  OpenRouterClient: jest.fn().mockImplementation(() => ({
    analyzeFieldMapping: jest.fn().mockResolvedValue({
      mappings: [
        {
          sourceField: 'product_name',
          targetField: 'name',
          confidence: 95,
          reasoning: 'Strong semantic match for product name field'
        },
        {
          sourceField: 'price_usd',
          targetField: 'price',
          confidence: 88,
          reasoning: 'Price field with currency indicator maps to price'
        }
      ],
      cost: 0.0008,
      processingTime: 1100
    }))
  }))
}));

// Import after mocking
import { FieldMappingEngine } from '../../server/field-mapping-engine';

describe('FieldMappingEngine', () => {
  let engine: FieldMappingEngine;
  let mockOpenRouterClient: any;

  beforeEach(() => {
    engine = new FieldMappingEngine();
    clearConsoleErrors();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup OpenRouter mock
    const { OpenRouterClient } = require('../../server/services/openrouter-client');
    mockOpenRouterClient = new OpenRouterClient();
  });

  describe('Exact Matching Strategy', () => {
    test('should match identical field names with 100% confidence', async () => {
      const sourceFields = [
        {
          name: 'product_name',
          dataType: 'string' as const,
          sampleValues: ['Product 1', 'Product 2'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        }
      ];

      const result = await engine.analyzeFieldMapping({
        sourceFields,
        targetFields: ['name', 'product_name', 'price'],
        options: { enableLLM: false }
      });

      const exactMatch = result.mappings.find(m => 
        m.sourceField === 'product_name' && m.strategy === 'exact'
      );

      expect(exactMatch).toBeDefined();
      expect(exactMatch?.targetField).toBe('product_name');
      expect(exactMatch?.confidence).toBe(100);
    });

    test('should handle multiple exact matches correctly', async () => {
      const sourceFields = [
        {
          name: 'name',
          dataType: 'string' as const,
          sampleValues: ['Product 1'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        },
        {
          name: 'price',
          dataType: 'number' as const,
          sampleValues: [29.99, 49.99],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        },
        {
          name: 'sku',
          dataType: 'string' as const,
          sampleValues: ['SKU-001', 'SKU-002'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        }
      ];

      const result = await engine.analyzeFieldMapping({
        sourceFields,
        targetFields: ['name', 'price', 'sku', 'description'],
        options: { enableLLM: false }
      });

      const exactMatches = result.mappings.filter(m => m.strategy === 'exact');
      expect(exactMatches).toHaveLength(3);
      
      exactMatches.forEach(match => {
        expect(match.confidence).toBe(100);
        expect(match.sourceField).toBe(match.targetField);
      });
    });
  });

  describe('Fuzzy Matching Strategy', () => {
    test('should match similar field names with high confidence', async () => {
      const sourceFields = [
        {
          name: 'prod_name',
          dataType: 'string' as const,
          sampleValues: ['Product 1', 'Product 2'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        },
        {
          name: 'item_price',
          dataType: 'number' as const,
          sampleValues: [29.99, 49.99],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        }
      ];

      const result = await engine.analyzeFieldMapping({
        sourceFields,
        targetFields: ['name', 'price', 'sku'],
        options: { enableLLM: false }
      });

      const fuzzyMatches = result.mappings.filter(m => m.strategy === 'fuzzy');
      expect(fuzzyMatches.length).toBeGreaterThan(0);

      const nameMatch = fuzzyMatches.find(m => m.sourceField === 'prod_name');
      expect(nameMatch?.targetField).toBe('name');
      expect(nameMatch?.confidence).toBeGreaterThan(70);
      expect(nameMatch?.confidence).toBeLessThan(100);

      const priceMatch = fuzzyMatches.find(m => m.sourceField === 'item_price');
      expect(priceMatch?.targetField).toBe('price');
      expect(priceMatch?.confidence).toBeGreaterThan(70);
    });

    test('should calculate Levenshtein distance accurately', async () => {
      const testCases = [
        { source: 'product_name', target: 'prod_name', expectedSimilarity: 80 },
        { source: 'description', target: 'desc', expectedSimilarity: 60 },
        { source: 'quantity', target: 'qty', expectedSimilarity: 40 },
        { source: 'price', target: 'cost', expectedSimilarity: 20 }
      ];

      for (const testCase of testCases) {
        const sourceFields = [{
          name: testCase.source,
          dataType: 'string' as const,
          sampleValues: ['test'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        }];

        const result = await engine.analyzeFieldMapping({
          sourceFields,
          targetFields: [testCase.target],
          options: { enableLLM: false }
        });

        const fuzzyMatch = result.mappings.find(m => 
          m.sourceField === testCase.source && m.strategy === 'fuzzy'
        );

        if (fuzzyMatch) {
          expect(fuzzyMatch.confidence).toBeWithinRange(
            testCase.expectedSimilarity - 20, 
            testCase.expectedSimilarity + 20
          );
        }
      }
    });
  });

  describe('Statistical Mapping Strategy', () => {
    test('should map fields based on data type and patterns', async () => {
      const sourceFields = [
        {
          name: 'field1',
          dataType: 'number' as const,
          sampleValues: [29.99, 49.99, 19.99],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true,
          metadata: {
            inferredType: 'currency',
            patterns: ['decimal_two_places']
          }
        },
        {
          name: 'field2',
          dataType: 'string' as const,
          sampleValues: ['PRD-001', 'PRD-002', 'PRD-003'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true,
          metadata: {
            inferredType: 'sku',
            patterns: ['code_alphanum', 'fixed_length']
          }
        }
      ];

      const result = await engine.analyzeFieldMapping({
        sourceFields,
        targetFields: ['name', 'price', 'sku', 'description'],
        options: { enableLLM: false }
      });

      const statisticalMatches = result.mappings.filter(m => m.strategy === 'statistical');
      
      const priceMatch = statisticalMatches.find(m => m.targetField === 'price');
      expect(priceMatch).toBeDefined();
      expect(priceMatch?.sourceField).toBe('field1');
      expect(priceMatch?.confidence).toBeGreaterThan(60);

      const skuMatch = statisticalMatches.find(m => m.targetField === 'sku');
      expect(skuMatch).toBeDefined();
      expect(skuMatch?.sourceField).toBe('field2');
      expect(skuMatch?.confidence).toBeGreaterThan(60);
    });

    test('should consider data uniqueness for mapping', async () => {
      const sourceFields = [
        {
          name: 'id_field',
          dataType: 'number' as const,
          sampleValues: [1, 2, 3, 4, 5],
          nullPercentage: 0,
          uniquePercentage: 100, // High uniqueness
          isRequired: true
        },
        {
          name: 'category_field',
          dataType: 'string' as const,
          sampleValues: ['Electronics', 'Electronics', 'Home'],
          nullPercentage: 0,
          uniquePercentage: 30, // Low uniqueness
          isRequired: false
        }
      ];

      const result = await engine.analyzeFieldMapping({
        sourceFields,
        targetFields: ['id', 'category', 'name'],
        options: { enableLLM: false }
      });

      const statisticalMatches = result.mappings.filter(m => m.strategy === 'statistical');
      
      // High uniqueness field should prefer ID-type targets
      const idMatch = statisticalMatches.find(m => 
        m.sourceField === 'id_field' && m.targetField === 'id'
      );
      expect(idMatch?.confidence).toBeGreaterThan(50);

      // Low uniqueness field should prefer category-type targets
      const categoryMatch = statisticalMatches.find(m => 
        m.sourceField === 'category_field' && m.targetField === 'category'
      );
      expect(categoryMatch?.confidence).toBeGreaterThan(50);
    });
  });

  describe('LLM Integration Strategy', () => {
    test('should use LLM for complex field mapping', async () => {
      const sourceFields = [
        {
          name: 'item_title',
          dataType: 'string' as const,
          sampleValues: ['Premium Bluetooth Headphones', 'Wireless Mouse'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        },
        {
          name: 'cost_per_unit',
          dataType: 'number' as const,
          sampleValues: [99.99, 29.99],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        }
      ];

      const result = await engine.analyzeFieldMapping({
        sourceFields,
        targetFields: ['name', 'price', 'description'],
        options: { enableLLM: true }
      });

      expect(mockOpenRouterClient.analyzeFieldMapping).toHaveBeenCalled();
      
      const llmMatches = result.mappings.filter(m => m.strategy === 'llm');
      expect(llmMatches.length).toBeGreaterThan(0);

      // Verify LLM responses are included
      const nameMatch = llmMatches.find(m => m.targetField === 'name');
      expect(nameMatch?.sourceField).toBe('product_name'); // From mock response
      expect(nameMatch?.confidence).toBe(95);
      expect(nameMatch?.metadata?.reasoning).toContain('semantic match');
    });

    test('should track LLM costs and performance', async () => {
      const sourceFields = [
        {
          name: 'test_field',
          dataType: 'string' as const,
          sampleValues: ['test'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        }
      ];

      const result = await engine.analyzeFieldMapping({
        sourceFields,
        targetFields: ['name'],
        options: { enableLLM: true }
      });

      expect(result.metadata.llmCost).toBeDefined();
      expect(result.metadata.llmCost).toBeLessThan(PERFORMANCE_THRESHOLDS.COST_PER_OPERATION);
      expect(result.metadata.processingTime).toBeDefined();
      expect(result.metadata.processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RESPONSE_TIME);
    });

    test('should handle LLM errors gracefully', async () => {
      // Mock LLM failure
      mockOpenRouterClient.analyzeFieldMapping.mockRejectedValueOnce(
        new Error('LLM service unavailable')
      );

      const sourceFields = [
        {
          name: 'test_field',
          dataType: 'string' as const,
          sampleValues: ['test'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        }
      ];

      const result = await engine.analyzeFieldMapping({
        sourceFields,
        targetFields: ['name'],
        options: { enableLLM: true }
      });

      // Should fallback to other strategies when LLM fails
      expect(result.mappings.length).toBeGreaterThan(0);
      expect(result.mappings.every(m => m.strategy !== 'llm')).toBe(true);
    });
  });

  describe('Historical Learning Strategy', () => {
    test('should use cached mappings for repeated patterns', async () => {
      // Mock database to return cached mapping
      const { db } = require('../../server/db');
      db.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            {
              sourceFieldPattern: 'prod_name',
              targetField: 'name',
              confidence: 92,
              usageCount: 15,
              successRate: 0.95
            }
          ])
        })
      });

      const sourceFields = [
        {
          name: 'prod_name',
          dataType: 'string' as const,
          sampleValues: ['Product 1'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        }
      ];

      const result = await engine.analyzeFieldMapping({
        sourceFields,
        targetFields: ['name', 'price'],
        options: { enableLLM: false }
      });

      const historicalMatch = result.mappings.find(m => m.strategy === 'historical');
      expect(historicalMatch).toBeDefined();
      expect(historicalMatch?.sourceField).toBe('prod_name');
      expect(historicalMatch?.targetField).toBe('name');
      expect(historicalMatch?.confidence).toBeGreaterThan(85);
    });

    test('should weight historical mappings by success rate', async () => {
      const { db } = require('../../server/db');
      db.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            {
              sourceFieldPattern: 'price',
              targetField: 'price',
              confidence: 88,
              usageCount: 50,
              successRate: 0.98 // High success rate
            },
            {
              sourceFieldPattern: 'price',
              targetField: 'cost',
              confidence: 85,
              usageCount: 10,
              successRate: 0.60 // Lower success rate
            }
          ])
        })
      });

      const sourceFields = [
        {
          name: 'price',
          dataType: 'number' as const,
          sampleValues: [29.99],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        }
      ];

      const result = await engine.analyzeFieldMapping({
        sourceFields,
        targetFields: ['price', 'cost'],
        options: { enableLLM: false }
      });

      const historicalMatches = result.mappings.filter(m => m.strategy === 'historical');
      
      // Should prefer mapping with higher success rate
      const bestMatch = historicalMatches.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      
      expect(bestMatch.targetField).toBe('price'); // Higher success rate mapping
    });
  });

  describe('Confidence Scoring', () => {
    test('should calculate accurate confidence scores', async () => {
      const sourceFields = [
        {
          name: 'product_name', // Exact match
          dataType: 'string' as const,
          sampleValues: ['Product 1'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        },
        {
          name: 'prod_title', // Fuzzy match
          dataType: 'string' as const,
          sampleValues: ['Product 2'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        },
        {
          name: 'unknown_field', // No good match
          dataType: 'string' as const,
          sampleValues: ['Unknown'],
          nullPercentage: 50,
          uniquePercentage: 30,
          isRequired: false
        }
      ];

      const result = await engine.analyzeFieldMapping({
        sourceFields,
        targetFields: ['name', 'product_name', 'price'],
        options: { enableLLM: false }
      });

      // Exact match should have highest confidence
      const exactMatch = result.mappings.find(m => 
        m.sourceField === 'product_name' && m.strategy === 'exact'
      );
      expect(exactMatch?.confidence).toBe(100);

      // Fuzzy match should have moderate confidence
      const fuzzyMatch = result.mappings.find(m => 
        m.sourceField === 'prod_title' && m.strategy === 'fuzzy'
      );
      expect(fuzzyMatch?.confidence).toBeWithinRange(70, 95);

      // Poor match should have low confidence
      const poorMatch = result.mappings.find(m => 
        m.sourceField === 'unknown_field'
      );
      if (poorMatch) {
        expect(poorMatch.confidence).toBeLessThan(60);
      }
    });

    test('should adjust confidence based on data quality indicators', async () => {
      const highQualityField = {
        name: 'prod_name',
        dataType: 'string' as const,
        sampleValues: ['Product 1', 'Product 2', 'Product 3'],
        nullPercentage: 0, // No nulls
        uniquePercentage: 100, // All unique
        isRequired: true
      };

      const lowQualityField = {
        name: 'prod_name',
        dataType: 'string' as const,
        sampleValues: ['', null, 'Product'],
        nullPercentage: 67, // High null percentage
        uniquePercentage: 30, // Low uniqueness
        isRequired: false
      };

      const highQualityResult = await engine.analyzeFieldMapping({
        sourceFields: [highQualityField],
        targetFields: ['name'],
        options: { enableLLM: false }
      });

      const lowQualityResult = await engine.analyzeFieldMapping({
        sourceFields: [lowQualityField],
        targetFields: ['name'],
        options: { enableLLM: false }
      });

      const highQualityMatch = highQualityResult.mappings[0];
      const lowQualityMatch = lowQualityResult.mappings[0];

      expect(highQualityMatch?.confidence).toBeGreaterThan(lowQualityMatch?.confidence);
    });
  });

  describe('Performance and Accuracy Validation', () => {
    test('should meet response time requirements', async () => {
      const largeFieldSet = Array.from({ length: 50 }, (_, i) => ({
        name: `field_${i}`,
        dataType: 'string' as const,
        sampleValues: [`value_${i}`],
        nullPercentage: 0,
        uniquePercentage: 100,
        isRequired: true
      }));

      const { result, duration } = await testUtils.measureTime(async () => {
        return engine.analyzeFieldMapping({
          sourceFields: largeFieldSet,
          targetFields: ['name', 'price', 'sku', 'description', 'category'],
          options: { enableLLM: false }
        });
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.RESPONSE_TIME);
      expect(result.mappings.length).toBeGreaterThan(0);
    });

    test('should achieve 85% accuracy across diverse field variations', async () => {
      const testCases = [
        // Standard variations
        { source: 'product_name', target: 'name', expectedMatch: true },
        { source: 'price', target: 'price', expectedMatch: true },
        { source: 'sku', target: 'sku', expectedMatch: true },
        
        // Abbreviated variations
        { source: 'prod', target: 'name', expectedMatch: true },
        { source: 'amt', target: 'price', expectedMatch: true },
        { source: 'qty', target: 'quantity', expectedMatch: true },
        
        // Complex variations
        { source: 'Product-Name', target: 'name', expectedMatch: true },
        { source: 'Price_USD', target: 'price', expectedMatch: true },
        { source: 'item.description', target: 'description', expectedMatch: true },
        
        // Should not match
        { source: 'random_field', target: 'name', expectedMatch: false }
      ];

      let correctMappings = 0;
      const totalCases = testCases.length;

      for (const testCase of testCases) {
        const sourceFields = [{
          name: testCase.source,
          dataType: 'string' as const,
          sampleValues: ['test value'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        }];

        const result = await engine.analyzeFieldMapping({
          sourceFields,
          targetFields: [testCase.target, 'other_field'],
          options: { enableLLM: false }
        });

        const bestMatch = result.mappings.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        );

        const isCorrect = testCase.expectedMatch 
          ? (bestMatch.targetField === testCase.target && bestMatch.confidence >= 60)
          : (bestMatch.targetField !== testCase.target || bestMatch.confidence < 60);

        if (isCorrect) {
          correctMappings++;
        }
      }

      const accuracy = (correctMappings / totalCases) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(ACCURACY_THRESHOLDS.FIELD_MAPPING);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty source fields gracefully', async () => {
      const result = await engine.analyzeFieldMapping({
        sourceFields: [],
        targetFields: ['name', 'price'],
        options: { enableLLM: false }
      });

      expect(result.mappings).toEqual([]);
      expect(result.metadata.totalFields).toBe(0);
      expect(result.status).toBe('success');
    });

    test('should handle fields with no clear mapping', async () => {
      const sourceFields = [
        {
          name: 'completely_random_field_xyz123',
          dataType: 'string' as const,
          sampleValues: ['random', 'values', 'here'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: false
        }
      ];

      const result = await engine.analyzeFieldMapping({
        sourceFields,
        targetFields: ['name', 'price', 'sku'],
        options: { enableLLM: false }
      });

      // Should still provide mappings, but with lower confidence
      expect(result.mappings.length).toBeGreaterThan(0);
      expect(result.mappings.every(m => m.confidence < 70)).toBe(true);
    });

    test('should cache successful mappings for learning', async () => {
      const { db } = require('../../server/db');
      
      const sourceFields = [
        {
          name: 'product_title',
          dataType: 'string' as const,
          sampleValues: ['Product 1'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        }
      ];

      await engine.analyzeFieldMapping({
        sourceFields,
        targetFields: ['name'],
        options: { enableLLM: false }
      });

      // Should attempt to cache the successful mapping
      expect(db.insert).toHaveBeenCalled();
    });
  });

  afterEach(() => {
    const errors = getConsoleErrors();
    if (errors.length > 0) {
      console.warn('Console errors detected during field mapping test:', errors);
    }
  });
});