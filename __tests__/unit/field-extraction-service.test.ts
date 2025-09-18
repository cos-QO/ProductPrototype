/**
 * Unit Tests for Field Extraction Service
 * Tests enhanced field detection, type inference, and metadata extraction
 * Target: 85%+ accuracy for field mapping and type inference
 */

import { FieldExtractionService } from '../../server/services/field-extraction-service';

describe('FieldExtractionService', () => {
  let service: FieldExtractionService;
  
  beforeEach(() => {
    service = FieldExtractionService.getInstance();
    clearConsoleErrors();
  });

  describe('CSV File Processing', () => {
    test('should extract fields from standard CSV with headers', async () => {
      const csvContent = testUtils.generateCSV(
        ['product_name', 'price', 'sku', 'description'],
        [
          ['Test Product 1', '29.99', 'TEST-001', 'A great product'],
          ['Test Product 2', '49.99', 'TEST-002', 'Another great product'],
          ['Test Product 3', '19.99', 'TEST-003', 'The best product']
        ]
      );
      
      const buffer = testUtils.createBuffer(csvContent);
      const result = await service.extractFieldsFromFile(buffer, 'test.csv', 'csv');
      
      expect(result.fields).toHaveLength(4);
      expect(result.metadata.hasHeaders).toBe(true);
      expect(result.metadata.totalRecords).toBe(3);
      expect(result.confidence).toBeGreaterThan(0.8);
      
      // Validate field structures
      const nameField = result.fields.find(f => f.name === 'product_name');
      expect(nameField).toBeDefined();
      expect(nameField?.dataType).toBe('string');
      expect(nameField?.isRequired).toBe(true);
      
      const priceField = result.fields.find(f => f.name === 'price');
      expect(priceField).toBeDefined();
      expect(priceField?.dataType).toBe('number');
      expect(priceField?.metadata?.inferredType).toBe('currency');
    });

    test('should handle CSV without headers', async () => {
      const csvContent = testUtils.generateCSV(
        [], // No headers
        [
          ['Product 1', '29.99', 'SKU001'],
          ['Product 2', '49.99', 'SKU002']
        ]
      );
      
      const buffer = testUtils.createBuffer(csvContent);
      const result = await service.extractFieldsFromFile(buffer, 'test.csv', 'csv');
      
      expect(result.metadata.hasHeaders).toBe(false);
      expect(result.fields[0].name).toMatch(/column_\d+/);
      expect(result.fields).toHaveLength(3);
    });

    test('should detect field patterns and statistics', async () => {
      const csvContent = testUtils.generateCSV(
        ['sku', 'price_usd', 'percentage'],
        [
          ['PRD-001', '$29.99', '85%'],
          ['PRD-002', '$49.99', '92%'],
          ['PRD-003', '$19.99', '78%']
        ]
      );
      
      const buffer = testUtils.createBuffer(csvContent);
      const result = await service.extractFieldsFromFile(buffer, 'test.csv', 'csv');
      
      // Check SKU pattern detection
      const skuField = result.fields.find(f => f.name === 'sku');
      expect(skuField?.metadata?.patterns).toContain('code_alphanum');
      
      // Check currency pattern
      const priceField = result.fields.find(f => f.name === 'price_usd');
      expect(priceField?.metadata?.patterns).toContain('currency_usd');
      
      // Check percentage pattern
      const percentField = result.fields.find(f => f.name === 'percentage');
      expect(percentField?.metadata?.inferredType).toBe('percentage');
    });
  });

  describe('JSON File Processing', () => {
    test('should extract fields from JSON array', async () => {
      const jsonData = [
        {
          product_name: 'Test Product 1',
          price: 29.99,
          in_stock: true,
          tags: ['electronics', 'mobile']
        },
        {
          product_name: 'Test Product 2',
          price: 49.99,
          in_stock: false,
          tags: ['home', 'kitchen']
        }
      ];
      
      const buffer = testUtils.createBuffer(testUtils.generateJSON(jsonData));
      const result = await service.extractFieldsFromFile(buffer, 'test.json', 'json');
      
      expect(result.fields).toHaveLength(4);
      expect(result.metadata.totalRecords).toBe(2);
      expect(result.metadata.hasHeaders).toBe(true);
      
      // Validate field types
      const nameField = result.fields.find(f => f.name === 'product_name');
      expect(nameField?.dataType).toBe('string');
      
      const priceField = result.fields.find(f => f.name === 'price');
      expect(priceField?.dataType).toBe('number');
      
      const boolField = result.fields.find(f => f.name === 'in_stock');
      expect(boolField?.dataType).toBe('boolean');
      
      const arrayField = result.fields.find(f => f.name === 'tags');
      expect(arrayField?.dataType).toBe('json');
    });

    test('should handle nested JSON structures', async () => {
      const jsonData = [
        {
          product: {
            name: 'Nested Product',
            details: {
              price: 29.99,
              category: 'electronics'
            }
          },
          meta: {
            created_at: '2024-01-01',
            updated_at: '2024-01-02'
          }
        }
      ];
      
      const buffer = testUtils.createBuffer(testUtils.generateJSON(jsonData));
      const result = await service.extractFieldsFromFile(buffer, 'test.json', 'json');
      
      expect(result.fields.length).toBeGreaterThan(0);
      
      // Should flatten nested structures
      const productField = result.fields.find(f => f.name === 'product');
      expect(productField?.dataType).toBe('json');
    });
  });

  describe('Type Inference Accuracy', () => {
    test('should correctly identify currency fields', async () => {
      const testData = [
        { price: '$29.99', cost: '49.50', amount: '$1,234.56' },
        { price: '$39.99', cost: '59.75', amount: '$2,345.67' },
        { price: '$19.99', cost: '29.25', amount: '$3,456.78' }
      ];
      
      const buffer = testUtils.createBuffer(testUtils.generateJSON(testData));
      const result = await service.extractFieldsFromFile(buffer, 'test.json', 'json');
      
      const priceField = result.fields.find(f => f.name === 'price');
      expect(priceField?.metadata?.inferredType).toBe('currency');
      
      const costField = result.fields.find(f => f.name === 'cost');
      expect(costField?.dataType).toBe('number');
      
      const amountField = result.fields.find(f => f.name === 'amount');
      expect(amountField?.metadata?.inferredType).toBe('currency');
    });

    test('should identify email and URL patterns', async () => {
      const testData = [
        { 
          email: 'test@example.com',
          website: 'https://example.com',
          phone: '123-456-7890'
        },
        { 
          email: 'user@domain.org',
          website: 'http://test.com',
          phone: '987-654-3210'
        }
      ];
      
      const buffer = testUtils.createBuffer(testUtils.generateJSON(testData));
      const result = await service.extractFieldsFromFile(buffer, 'test.json', 'json');
      
      const emailField = result.fields.find(f => f.name === 'email');
      expect(emailField?.metadata?.inferredType).toBe('email');
      
      const urlField = result.fields.find(f => f.name === 'website');
      expect(urlField?.metadata?.inferredType).toBe('url');
      
      const phoneField = result.fields.find(f => f.name === 'phone');
      expect(phoneField?.metadata?.inferredType).toBe('phone');
    });

    test('should calculate accurate statistics', async () => {
      const testData = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        price: Math.random() * 100,
        name: `Product ${i + 1}`,
        active: i % 3 === 0
      }));
      
      const buffer = testUtils.createBuffer(testUtils.generateJSON(testData));
      const result = await service.extractFieldsFromFile(buffer, 'test.json', 'json');
      
      const priceField = result.fields.find(f => f.name === 'price');
      expect(priceField?.metadata?.statistics?.min).toBeDefined();
      expect(priceField?.metadata?.statistics?.max).toBeDefined();
      expect(priceField?.metadata?.statistics?.average).toBeDefined();
      
      const nameField = result.fields.find(f => f.name === 'name');
      expect(nameField?.metadata?.statistics?.avgLength).toBeDefined();
      expect(nameField?.metadata?.statistics?.commonValues).toBeDefined();
      
      // Check unique percentage calculation
      const idField = result.fields.find(f => f.name === 'id');
      expect(idField?.uniquePercentage).toBe(100); // All IDs should be unique
      
      const activeField = result.fields.find(f => f.name === 'active');
      expect(activeField?.uniquePercentage).toBeLessThan(100); // Boolean field should have <100% unique
    });
  });

  describe('Abbreviation Expansion', () => {
    test('should expand common abbreviations', async () => {
      const csvContent = testUtils.generateCSV(
        ['prod', 'qty', 'desc', 'amt', 'wt'],
        [
          ['Product 1', '10', 'Description 1', '29.99', '1.5'],
          ['Product 2', '20', 'Description 2', '39.99', '2.0']
        ]
      );
      
      const buffer = testUtils.createBuffer(csvContent);
      const result = await service.extractFieldsFromFile(buffer, 'test.csv', 'csv');
      
      const prodField = result.fields.find(f => f.name === 'prod');
      expect(prodField?.metadata?.abbreviationExpansion).toBe('product');
      
      const qtyField = result.fields.find(f => f.name === 'qty');
      expect(qtyField?.metadata?.abbreviationExpansion).toBe('quantity');
      
      const descField = result.fields.find(f => f.name === 'desc');
      expect(descField?.metadata?.abbreviationExpansion).toBe('description');
      
      const amtField = result.fields.find(f => f.name === 'amt');
      expect(amtField?.metadata?.abbreviationExpansion).toBe('amount');
      
      const wtField = result.fields.find(f => f.name === 'wt');
      expect(wtField?.metadata?.abbreviationExpansion).toBe('weight');
    });

    test('should normalize field names', async () => {
      const csvContent = testUtils.generateCSV(
        ['Product-Name', 'Price_USD', 'SKU#Code', 'Item.Description'],
        [
          ['Product 1', '$29.99', 'SKU001', 'Description 1']
        ]
      );
      
      const buffer = testUtils.createBuffer(csvContent);
      const result = await service.extractFieldsFromFile(buffer, 'test.csv', 'csv');
      
      result.fields.forEach(field => {
        expect(field.metadata?.normalizedName).toBeDefined();
        expect(field.metadata?.normalizedName).toMatch(/^[a-z0-9_]+$/);
      });
    });
  });

  describe('Performance and Efficiency', () => {
    test('should process large files efficiently', async () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => 
        testUtils.generateTestProduct()
      );
      
      const { result, duration } = await testUtils.measureTime(async () => {
        const buffer = testUtils.createBuffer(testUtils.generateJSON(largeData));
        return service.extractFieldsFromFile(buffer, 'large.json', 'json');
      });
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.metadata.totalRecords).toBe(1000);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test('should limit sample size for performance', async () => {
      const largeData = Array.from({ length: 500 }, (_, i) => ({
        id: i,
        name: `Product ${i}`
      }));
      
      const buffer = testUtils.createBuffer(testUtils.generateJSON(largeData));
      const result = await service.extractFieldsFromFile(
        buffer, 
        'large.json', 
        'json',
        { maxSampleSize: 50 }
      );
      
      // Should process only sample size for analysis
      expect(result.sampleData.length).toBeLessThanOrEqual(5); // Max 5 sample rows
      expect(result.metadata.totalRecords).toBe(500); // But count all records
    });
  });

  describe('Error Handling', () => {
    test('should handle empty files gracefully', async () => {
      const emptyBuffer = Buffer.alloc(0);
      
      await expect(
        service.extractFieldsFromFile(emptyBuffer, 'empty.csv', 'csv')
      ).rejects.toThrow('No data found in file');
    });

    test('should handle corrupted CSV files', async () => {
      const corruptedCSV = 'header1,header2\n"unclosed quote,value2\nval3,val4';
      const buffer = testUtils.createBuffer(corruptedCSV);
      
      // Should still attempt to parse what it can
      const result = await service.extractFieldsFromFile(buffer, 'corrupted.csv', 'csv');
      expect(result.fields.length).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.8); // Lower confidence due to corruption
    });

    test('should handle invalid JSON gracefully', async () => {
      const invalidJSON = '{"invalid": json, "missing": quotes}';
      const buffer = testUtils.createBuffer(invalidJSON);
      
      await expect(
        service.extractFieldsFromFile(buffer, 'invalid.json', 'json')
      ).rejects.toThrow('Invalid JSON format');
    });

    test('should handle mixed data types in columns', async () => {
      const mixedData = [
        { value: 'string' },
        { value: 123 },
        { value: true },
        { value: null },
        { value: { nested: 'object' } }
      ];
      
      const buffer = testUtils.createBuffer(testUtils.generateJSON(mixedData));
      const result = await service.extractFieldsFromFile(buffer, 'mixed.json', 'json');
      
      const valueField = result.fields.find(f => f.name === 'value');
      expect(valueField).toBeDefined();
      expect(valueField?.dataType).toBe('string'); // Should default to string for mixed types
      expect(valueField?.nullPercentage).toBeGreaterThan(0);
    });
  });

  describe('Confidence Scoring', () => {
    test('should assign high confidence to well-structured data', async () => {
      const wellStructuredData = Array.from({ length: 100 }, () => ({
        product_name: 'Test Product',
        price: 29.99,
        sku: 'TEST-001',
        category: 'Electronics',
        in_stock: true
      }));
      
      const buffer = testUtils.createBuffer(testUtils.generateJSON(wellStructuredData));
      const result = await service.extractFieldsFromFile(buffer, 'structured.json', 'json');
      
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test('should assign lower confidence to poorly structured data', async () => {
      const poorlyStructuredData = [
        { 'col1': 'val1', 'col2': 'val2' },
        { 'column_1': 'value1', 'column_2': null },
        { '1': 'a', '2': '' }
      ];
      
      const buffer = testUtils.createBuffer(testUtils.generateJSON(poorlyStructuredData));
      const result = await service.extractFieldsFromFile(buffer, 'poor.json', 'json');
      
      expect(result.confidence).toBeLessThan(0.7);
    });
  });

  describe('Accuracy Validation', () => {
    test('should meet 85% accuracy threshold for field type detection', async () => {
      const testCases = [
        { field: 'price', value: '$29.99', expectedType: 'currency' },
        { field: 'email', value: 'test@example.com', expectedType: 'email' },
        { field: 'url', value: 'https://example.com', expectedType: 'url' },
        { field: 'phone', value: '123-456-7890', expectedType: 'phone' },
        { field: 'date', value: '2024-01-01', expectedType: 'date' },
        { field: 'weight', value: '1.5kg', expectedType: 'measurement' },
        { field: 'percentage', value: '85%', expectedType: 'percentage' },
        { field: 'sku', value: 'PRD-001', expectedType: 'sku' },
        { field: 'name', value: 'Product Name', expectedType: 'string' },
        { field: 'quantity', value: '10', expectedType: 'number' }
      ];
      
      let correctInferences = 0;
      
      for (const testCase of testCases) {
        const data = [{ [testCase.field]: testCase.value }];
        const buffer = testUtils.createBuffer(testUtils.generateJSON(data));
        const result = await service.extractFieldsFromFile(buffer, 'test.json', 'json');
        
        const field = result.fields.find(f => f.name === testCase.field);
        if (field?.metadata?.inferredType === testCase.expectedType) {
          correctInferences++;
        }
      }
      
      const accuracy = (correctInferences / testCases.length) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(ACCURACY_THRESHOLDS.TYPE_INFERENCE);
    });
  });

  afterEach(() => {
    // Check for console errors that might indicate issues
    const errors = getConsoleErrors();
    if (errors.length > 0) {
      console.warn('Console errors detected during test:', errors);
    }
  });
});