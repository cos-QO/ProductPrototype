// Global test setup for Enhanced Upload System
import '@testing-library/jest-dom';

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toHaveValidFieldMapping(): R;
      toMatchSchema(schema: any): R;
    }
  }
  
  var testUtils: {
    generateCSV: (headers: string[], rows: any[][]) => string;
    generateJSON: (data: any) => string;
    createBuffer: (content: string) => Buffer;
    measureTime: (fn: Function) => Promise<{ result: any; duration: number }>;
    generateTestProduct: () => any;
    waitFor: (ms: number) => Promise<void>;
  };
  
  var getConsoleErrors: () => string[];
  var clearConsoleErrors: () => void;
  var mockDatabase: any;
  var performanceMonitor: any;
  var TEST_FIELD_VARIATIONS: any;
  var ACCURACY_THRESHOLDS: any;
  var PERFORMANCE_THRESHOLDS: any;
}

expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toHaveValidFieldMapping(received: any) {
    const requiredFields = ['sourceField', 'targetField', 'confidence', 'strategy'];
    const hasAllFields = requiredFields.every(field => received.hasOwnProperty(field));
    const validConfidence = received.confidence >= 0 && received.confidence <= 100;
    const validStrategy = ['exact', 'fuzzy', 'llm', 'historical', 'statistical'].includes(received.strategy);
    
    const pass = hasAllFields && validConfidence && validStrategy;
    
    return {
      message: () => pass 
        ? `expected field mapping to be invalid`
        : `expected field mapping to have valid structure`,
      pass
    };
  },
  
  toMatchSchema(received: any, schema: any) {
    // Basic schema validation for testing
    function validateSchema(obj: any, schemaObj: any): boolean {
      for (const key in schemaObj) {
        if (!(key in obj)) return false;
        
        const expectedType = schemaObj[key];
        const actualValue = obj[key];
        
        if (typeof expectedType === 'string') {
          if (expectedType.startsWith('enum[')) {
            const enumValues = expectedType.slice(5, -1).split('|');
            if (!enumValues.includes(actualValue)) return false;
          } else if (expectedType.includes('number') && typeof actualValue !== 'number') {
            return false;
          } else if (expectedType.includes('string') && typeof actualValue !== 'string') {
            return false;
          } else if (expectedType.includes('array') && !Array.isArray(actualValue)) {
            return false;
          }
        } else if (typeof expectedType === 'object' && Array.isArray(expectedType)) {
          if (!Array.isArray(actualValue)) return false;
          if (actualValue.length > 0 && !validateSchema(actualValue[0], expectedType[0])) {
            return false;
          }
        } else if (typeof expectedType === 'object') {
          if (!validateSchema(actualValue, expectedType)) return false;
        }
      }
      return true;
    }
    
    const pass = validateSchema(received, schema);
    
    return {
      message: () => pass 
        ? `expected object not to match schema`
        : `expected object to match schema`,
      pass
    };
  }
});

// Global test utilities
global.testUtils = {
  // Generate test CSV content
  generateCSV: (headers: string[], rows: any[][]) => {
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  },
  
  // Generate test JSON content
  generateJSON: (data: any) => {
    return JSON.stringify(data, null, 2);
  },
  
  // Create test buffer from string
  createBuffer: (content: string) => {
    return Buffer.from(content, 'utf-8');
  },
  
  // Measure execution time
  measureTime: async (fn: Function) => {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  },
  
  // Generate random test data
  generateTestProduct: () => ({
    product_name: `Test Product ${Math.random().toString(36).substring(7)}`,
    price: (Math.random() * 100).toFixed(2),
    sku: `TEST-${Math.random().toString(36).substring(7).toUpperCase()}`,
    description: 'Test product description',
    category: 'Test Category',
    brand: 'Test Brand',
    weight: (Math.random() * 10).toFixed(2),
    dimensions: '10x10x10',
    color: 'Red',
    material: 'Plastic'
  }),
  
  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};

// Console error tracking for development environment testing
const originalConsoleError = console.error;
const consoleErrors: string[] = [];

console.error = (...args: any[]) => {
  consoleErrors.push(args.join(' '));
  originalConsoleError.apply(console, args);
};

global.getConsoleErrors = () => [...consoleErrors];
global.clearConsoleErrors = () => { consoleErrors.length = 0; };

// Database setup mock for testing
global.mockDatabase = {
  fieldMappingCache: new Map(),
  importSessions: new Map(),
  users: new Map([
    [1, { id: 1, username: 'testuser', email: 'test@example.com' }]
  ])
};

// Performance monitoring
global.performanceMonitor = {
  start: Date.now(),
  memory: process.memoryUsage(),
  
  getMetrics: () => ({
    duration: Date.now() - global.performanceMonitor.start,
    memoryUsage: process.memoryUsage(),
    memoryIncrease: process.memoryUsage().heapUsed - global.performanceMonitor.memory.heapUsed
  })
};

// Test data constants
global.TEST_FIELD_VARIATIONS = {
  STANDARD: {
    'product_name': 'name',
    'price': 'price',
    'sku': 'sku',
    'description': 'description'
  },
  
  ABBREVIATED: {
    'prod_name': 'name',
    'amt': 'price',
    'qty': 'quantity',
    'desc': 'description'
  },
  
  MIXED_CASE: {
    'Product Name': 'name',
    'PRICE': 'price',
    'SKU_CODE': 'sku',
    'Item_Description': 'description'
  },
  
  COMPLEX: {
    'Product-Name': 'name',
    'Price_USD': 'price',
    'stock#': 'quantity',
    'item.description': 'description'
  }
};

// Accuracy testing thresholds
global.ACCURACY_THRESHOLDS = {
  FIELD_MAPPING: 85, // 85% minimum accuracy
  TYPE_INFERENCE: 80, // 80% minimum accuracy
  PATTERN_RECOGNITION: 75, // 75% minimum accuracy
  OVERALL_CONFIDENCE: 70 // 70% minimum confidence
};

// Performance testing thresholds
global.PERFORMANCE_THRESHOLDS = {
  RESPONSE_TIME: 2000, // 2 seconds maximum
  MEMORY_INCREASE: 50 * 1024 * 1024, // 50MB maximum increase
  COST_PER_OPERATION: 0.001, // $0.001 maximum cost
  CONCURRENT_PROCESSING: 100 // 100 records per batch
};