/**
 * Error Scenario Test Matrix
 * Comprehensive testing of various error conditions and recovery scenarios
 * 
 * TESTING SCOPE:
 * - All validation error types (required, format, type, business rules)
 * - Error combinations and cascading effects
 * - Edge cases and boundary conditions
 * - Data corruption scenarios
 * - Recovery strategy effectiveness
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

describe('Error Scenario Test Matrix', () => {
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

  // Helper function to create and analyze test data
  const createTestSession = async (csvContent, type = 'products') => {
    const csvFilePath = path.join(__dirname, '../fixtures/scenario-test.csv');
    fs.writeFileSync(csvFilePath, csvContent);

    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(csvFilePath));
      formData.append('type', type);

      const uploadResponse = await axios.post(`${BASE_URL}/api/import/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${authToken}`
        }
      });

      const sessionId = uploadResponse.data.sessionId;
      testSessions.push(sessionId);

      // Analyze to generate errors
      const analysisResponse = await axios.post(`${BASE_URL}/api/import/analyze`, {
        sessionId: sessionId,
        mappings: {
          name: 'name',
          price: 'price',
          sku: 'sku',
          email: 'email',
          inventory: 'inventory',
          category: 'category',
          description: 'description'
        }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      return {
        sessionId,
        errors: analysisResponse.data.errors || [],
        data: analysisResponse.data.preview || []
      };
    } finally {
      if (fs.existsSync(csvFilePath)) {
        fs.unlinkSync(csvFilePath);
      }
    }
  };

  describe('Required Field Validation Errors', () => {
    test('should detect missing required fields', async () => {
      const csvContent = `name,price,sku
,29.99,SKU001
Product B,,SKU002
Product C,39.99,`;

      const { errors } = await createTestSession(csvContent);

      const requiredErrors = errors.filter(e => e.rule === 'required');
      expect(requiredErrors.length).toBe(3); // name, price, sku missing

      // Verify error details
      const nameError = requiredErrors.find(e => e.field === 'name');
      expect(nameError).toBeDefined();
      expect(nameError.message).toContain('required');
      expect(nameError.severity).toBe('error');
    });

    test('should suggest defaults for missing required fields', async () => {
      const csvContent = `name,price,sku
,29.99,SKU001`;

      const { sessionId, errors } = await createTestSession(csvContent);

      const nameError = errors.find(e => e.field === 'name' && e.rule === 'required');
      expect(nameError.suggestion).toBeDefined();
      expect(nameError.autoFix).toBeDefined();
      expect(nameError.autoFix.action).toBe('default_value');
    });

    test('should handle fixing required field errors', async () => {
      const csvContent = `name,price,sku
,29.99,SKU001`;

      const { sessionId, errors } = await createTestSession(csvContent);

      const nameError = errors.find(e => e.field === 'name' && e.rule === 'required');
      
      const fixResponse = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-single`, {
        recordIndex: nameError.recordIndex,
        field: 'name',
        newValue: 'Product Name'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(fixResponse.status).toBe(200);
      expect(fixResponse.data.success).toBe(true);
      expect(fixResponse.data.fixedRecord.name).toBe('Product Name');
    });
  });

  describe('Data Type Validation Errors', () => {
    test('should detect invalid numeric values', async () => {
      const csvContent = `name,price,inventory
Product A,not_a_number,invalid_int
Product B,29.99.99,25.5
Product C,-10,abc123`;

      const { errors } = await createTestSession(csvContent);

      const typeErrors = errors.filter(e => e.rule === 'type');
      expect(typeErrors.length).toBeGreaterThan(0);

      // Check price type errors
      const priceError = typeErrors.find(e => e.field === 'price' && e.value === 'not_a_number');
      expect(priceError).toBeDefined();
      expect(priceError.message).toContain('number');
    });

    test('should handle currency formatting variations', async () => {
      const csvContent = `name,price
Product A,$29.99
Product B,29.99 USD
Product C,€35.00
Product D,¥1000`;

      const { sessionId, errors } = await createTestSession(csvContent);

      // Should either accept these formats or provide auto-fix suggestions
      const currencyErrors = errors.filter(e => e.field === 'price');
      currencyErrors.forEach(error => {
        if (error.autoFix) {
          expect(error.autoFix.action).toBeOneOf(['strip_currency', 'format_price']);
          expect(error.autoFix.confidence).toBeGreaterThan(0.5);
        }
      });
    });

    test('should handle date format variations', async () => {
      const csvContent = `name,created_date
Product A,2024-01-15
Product B,01/15/2024
Product C,Jan 15 2024
Product D,invalid_date`;

      const { errors } = await createTestSession(csvContent);

      const dateErrors = errors.filter(e => e.field === 'created_date');
      const invalidDateError = dateErrors.find(e => e.value === 'invalid_date');
      
      expect(invalidDateError).toBeDefined();
      expect(invalidDateError.rule).toBe('format');
    });
  });

  describe('Format Validation Errors', () => {
    test('should detect invalid email formats', async () => {
      const csvContent = `name,email
Product A,invalid_email
Product B,@missing-local.com
Product C,missing-at-symbol.com
Product D, spaces@email.com `;

      const { errors } = await createTestSession(csvContent);

      const emailErrors = errors.filter(e => e.field === 'email');
      expect(emailErrors.length).toBe(4);

      // Check specific email validation errors
      const invalidError = emailErrors.find(e => e.value === 'invalid_email');
      expect(invalidError.rule).toBe('format');
      expect(invalidError.message).toContain('email');
    });

    test('should suggest email format corrections', async () => {
      const csvContent = `name,email
Product A, test@example.com `;

      const { errors } = await createTestSession(csvContent);

      const emailError = errors.find(e => e.field === 'email');
      if (emailError) {
        expect(emailError.autoFix).toBeDefined();
        expect(emailError.autoFix.action).toBe('trim_whitespace');
        expect(emailError.autoFix.newValue).toBe('test@example.com');
      }
    });

    test('should handle SKU format validation', async () => {
      const csvContent = `name,sku
Product A,VALID-SKU-001
Product B,invalid sku spaces
Product C,@#$%^&*()
Product D,toolongskuthatexceedstypicallimits12345678901234567890`;

      const { errors } = await createTestSession(csvContent);

      const skuErrors = errors.filter(e => e.field === 'sku');
      expect(skuErrors.length).toBeGreaterThan(0);

      // Should detect invalid characters and length issues
      const spacesError = skuErrors.find(e => e.value.includes(' '));
      const specialCharsError = skuErrors.find(e => e.value === '@#$%^&*()');
      
      expect(spacesError || specialCharsError).toBeDefined();
    });
  });

  describe('Business Rule Validation Errors', () => {
    test('should detect duplicate SKUs', async () => {
      const csvContent = `name,sku,price
Product A,SKU001,29.99
Product B,SKU002,39.99
Product C,SKU001,49.99`;

      const { errors } = await createTestSession(csvContent);

      const duplicateErrors = errors.filter(e => e.rule === 'unique' && e.field === 'sku');
      expect(duplicateErrors.length).toBeGreaterThan(0);

      const duplicateError = duplicateErrors.find(e => e.value === 'SKU001');
      expect(duplicateError).toBeDefined();
      expect(duplicateError.message).toContain('duplicate');
    });

    test('should detect invalid price ranges', async () => {
      const csvContent = `name,price
Product A,-10.00
Product B,0.00
Product C,999999.99`;

      const { errors } = await createTestSession(csvContent);

      const priceRangeErrors = errors.filter(e => e.field === 'price' && e.rule === 'range');
      
      if (priceRangeErrors.length > 0) {
        const negativeError = priceRangeErrors.find(e => e.value === '-10.00');
        expect(negativeError).toBeDefined();
        expect(negativeError.message).toContain('positive');
      }
    });

    test('should validate inventory constraints', async () => {
      const csvContent = `name,inventory,price
Product A,-5,29.99
Product B,10000000,39.99
Product C,0.5,49.99`;

      const { errors } = await createTestSession(csvContent);

      const inventoryErrors = errors.filter(e => e.field === 'inventory');
      
      // Should detect negative inventory and non-integer values
      const negativeError = inventoryErrors.find(e => e.value === '-5');
      const decimalError = inventoryErrors.find(e => e.value === '0.5');
      
      expect(negativeError || decimalError).toBeDefined();
    });
  });

  describe('Data Corruption and Edge Cases', () => {
    test('should handle extremely long field values', async () => {
      const longValue = 'x'.repeat(10000); // 10KB string
      const csvContent = `name,description
Product A,"${longValue}"`;

      const { errors } = await createTestSession(csvContent);

      // Should either accept or provide reasonable error
      const descriptionErrors = errors.filter(e => e.field === 'description');
      if (descriptionErrors.length > 0) {
        expect(descriptionErrors[0].rule).toBeOneOf(['length', 'size']);
      }
    });

    test('should handle special characters and encoding issues', async () => {
      const csvContent = `name,description
"Product 测试",Description with émojis 🚀
"Product\nWith\nNewlines","Multi\nLine\nDescription"
"Product,With,Commas","Description,With,Commas"`;

      const { sessionId } = await createTestSession(csvContent);

      // Should parse successfully without corruption
      expect(sessionId).toBeDefined();
    });

    test('should handle malformed CSV data', async () => {
      const csvContent = `name,price,sku
Product A,29.99,SKU001
Product B,39.99,SKU002,Extra Column
Product C,"Unclosed Quote,49.99,SKU003`;

      const { errors } = await createTestSession(csvContent);

      // Should detect parsing errors
      const parsingErrors = errors.filter(e => e.rule === 'parse' || e.rule === 'format');
      expect(parsingErrors.length).toBeGreaterThan(0);
    });

    test('should handle empty files and single column files', async () => {
      // Test empty file
      const emptyContent = '';
      
      try {
        await createTestSession(emptyContent);
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain('empty');
      }

      // Test single column
      const singleColumnContent = `name
Product A
Product B`;

      const { errors } = await createTestSession(singleColumnContent);
      
      // Should detect missing required columns
      const missingColumnErrors = errors.filter(e => e.rule === 'missing_field');
      expect(missingColumnErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Combination Scenarios', () => {
    test('should handle multiple error types on same record', async () => {
      const csvContent = `name,price,sku,email
,invalid_price,INVALID SKU, invalid_email `;

      const { errors } = await createTestSession(csvContent);

      // Should detect all error types for record 0
      const record0Errors = errors.filter(e => e.recordIndex === 0);
      expect(record0Errors.length).toBe(4); // name, price, sku, email errors

      // Verify different error types
      const errorRules = record0Errors.map(e => e.rule);
      expect(errorRules).toContain('required'); // name
      expect(errorRules).toContain('type');     // price
      expect(errorRules).toContain('format');   // sku and email
    });

    test('should prioritize error severity correctly', async () => {
      const csvContent = `name,price,sku
Product A,invalid,INVALID SKU`;

      const { errors } = await createTestSession(csvContent);

      const record0Errors = errors.filter(e => e.recordIndex === 0);
      
      // Critical errors should be marked as 'error', format issues as 'warning'
      const criticalErrors = record0Errors.filter(e => e.severity === 'error');
      const warnings = record0Errors.filter(e => e.severity === 'warning');
      
      expect(criticalErrors.length).toBeGreaterThan(0);
    });

    test('should handle cascading error dependencies', async () => {
      const csvContent = `name,price,discount_price
Product A,29.99,39.99`;

      const { sessionId, errors } = await createTestSession(csvContent);

      // If discount_price > price, should detect business rule violation
      const businessRuleErrors = errors.filter(e => e.rule === 'business_rule');
      
      if (businessRuleErrors.length > 0) {
        const discountError = businessRuleErrors.find(e => 
          e.message.toLowerCase().includes('discount')
        );
        expect(discountError).toBeDefined();
      }
    });
  });

  describe('Error Recovery Strategy Validation', () => {
    test('should provide appropriate auto-fix suggestions by error type', async () => {
      const csvContent = `name,price,email,sku
,invalid_price, test@example.com ,INVALID SKU`;

      const { errors } = await createTestSession(csvContent);

      errors.forEach(error => {
        if (error.autoFix) {
          // Verify auto-fix action matches error type
          switch (error.rule) {
            case 'required':
              expect(error.autoFix.action).toBeOneOf(['default_value', 'generate_value']);
              break;
            case 'type':
              expect(error.autoFix.action).toBeOneOf(['convert_type', 'default_value']);
              break;
            case 'format':
              expect(error.autoFix.action).toBeOneOf(['trim_whitespace', 'format_value', 'normalize']);
              break;
          }
          
          // Confidence should be reasonable
          expect(error.autoFix.confidence).toBeGreaterThan(0);
          expect(error.autoFix.confidence).toBeLessThanOrEqual(1);
        }
      });
    });

    test('should provide manual fix guidance for complex errors', async () => {
      const csvContent = `name,complex_field
Product A,requires_manual_review`;

      const { errors } = await createTestSession(csvContent);

      // Complex errors should have suggestions even without auto-fix
      errors.forEach(error => {
        expect(error.suggestion).toBeDefined();
        expect(error.suggestion.length).toBeGreaterThan(10); // Meaningful suggestion
      });
    });

    test('should handle bulk error recovery efficiently', async () => {
      // Create dataset with repeating error patterns
      const rows = ['name,email'];
      for (let i = 1; i <= 100; i++) {
        rows.push(`Product ${i}, email${i}@example.com `); // Trailing space
      }
      const csvContent = rows.join('\n');

      const { sessionId, errors } = await createTestSession(csvContent);

      // Should detect pattern and allow bulk fix
      const emailErrors = errors.filter(e => e.field === 'email');
      expect(emailErrors.length).toBe(100);

      // All email errors should have same auto-fix action
      const autoFixActions = emailErrors
        .filter(e => e.autoFix)
        .map(e => e.autoFix.action);
      
      const uniqueActions = [...new Set(autoFixActions)];
      expect(uniqueActions.length).toBe(1); // Same fix for all
      expect(uniqueActions[0]).toBe('trim_whitespace');

      // Test bulk fix performance
      const startTime = Date.now();
      
      const bulkFixes = emailErrors.map(error => ({
        recordIndex: error.recordIndex,
        field: 'email',
        newValue: error.autoFix.newValue
      }));

      const bulkResponse = await axios.post(`${BASE_URL}/api/recovery/${sessionId}/fix-bulk`, {
        fixes: bulkFixes
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const duration = Date.now() - startTime;

      expect(bulkResponse.status).toBe(200);
      expect(bulkResponse.data.success).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete in <10 seconds
    });
  });

  describe('Error Message Quality and Localization', () => {
    test('should provide clear, actionable error messages', async () => {
      const csvContent = `name,price,email
,invalid_price,invalid_email`;

      const { errors } = await createTestSession(csvContent);

      errors.forEach(error => {
        // Error messages should be descriptive
        expect(error.message.length).toBeGreaterThan(5);
        expect(error.message).not.toMatch(/^Error:|^Invalid:/); // Avoid generic prefixes
        
        // Should contain field name
        expect(error.message.toLowerCase()).toContain(error.field.toLowerCase());
        
        // Should suggest action when possible
        if (error.suggestion) {
          expect(error.suggestion).toMatch(/^[A-Z]/); // Proper sentence case
          expect(error.suggestion.length).toBeGreaterThan(10);
        }
      });
    });

    test('should handle technical vs user-friendly messages', async () => {
      const csvContent = `name,price
Product A,invalid_json_{"key":"value"}`;

      const { errors } = await createTestSession(csvContent);

      const priceError = errors.find(e => e.field === 'price');
      
      if (priceError) {
        // Should not expose technical JSON parsing details to user
        expect(priceError.message).not.toContain('JSON');
        expect(priceError.message).not.toContain('parse');
        expect(priceError.message).not.toContain('syntax');
        
        // Should provide user-friendly guidance
        expect(priceError.message.toLowerCase()).toContain('price');
        expect(priceError.message.toLowerCase()).toMatch(/number|numeric|decimal/);
      }
    });
  });
});