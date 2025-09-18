/**
 * Basic Setup Test - Validates test environment configuration
 */

describe('Test Environment Setup', () => {
  test('should have correct Node environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('should have test utilities available', () => {
    expect(global.testUtils).toBeDefined();
    expect(global.testUtils.generateCSV).toBeInstanceOf(Function);
    expect(global.testUtils.generateJSON).toBeInstanceOf(Function);
    expect(global.testUtils.createBuffer).toBeInstanceOf(Function);
  });

  test('should have accuracy thresholds defined', () => {
    expect(global.ACCURACY_THRESHOLDS).toBeDefined();
    expect(global.ACCURACY_THRESHOLDS.FIELD_MAPPING).toBe(85);
    expect(global.PERFORMANCE_THRESHOLDS).toBeDefined();
    expect(global.PERFORMANCE_THRESHOLDS.RESPONSE_TIME).toBe(2000);
  });

  test('should support custom Jest matchers', () => {
    const testMapping = {
      sourceField: 'product_name',
      targetField: 'name',
      confidence: 95,
      strategy: 'exact'
    };

    expect(testMapping).toHaveValidFieldMapping();
  });

  test('should generate test data correctly', () => {
    const headers = ['name', 'price', 'sku'];
    const rows = [['Product 1', '29.99', 'SKU001']];
    
    const csv = global.testUtils.generateCSV(headers, rows);
    expect(csv).toContain('name,price,sku');
    expect(csv).toContain('Product 1,29.99,SKU001');

    const data = [{ name: 'Product 1', price: 29.99 }];
    const json = global.testUtils.generateJSON(data);
    expect(json).toContain('"name": "Product 1"');
    expect(json).toContain('"price": 29.99');
  });

  test('should measure execution time', async () => {
    const { result, duration } = await global.testUtils.measureTime(async () => {
      await global.testUtils.waitFor(100);
      return 'test result';
    });

    expect(result).toBe('test result');
    expect(duration).toBeGreaterThanOrEqual(90);
    expect(duration).toBeLessThan(200);
  });
});