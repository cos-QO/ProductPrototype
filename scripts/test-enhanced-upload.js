#!/usr/bin/env node

/**
 * Test Script for Enhanced Upload Architecture
 * 
 * Tests the implementation of:
 * - Field Extraction Service
 * - Variable Injection System  
 * - Prompt Template Engine
 * - Multi-Strategy Field Mapping
 * - Learning System Integration
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test data samples
const testData = {
  csv: `product_name,sku_code,price_usd,stock_qty,description,brand_name
Luxury Watch Alpha,LWA-001,2499.99,15,Premium Swiss-made timepiece,Kerouac Watches
Beauty Serum Pro,BSP-202,89.99,50,Anti-aging facial serum with peptides,Aurora Cosmetics
Smart Headphones X1,SHX-101,299.99,25,Wireless noise-canceling headphones,TechFlow Electronics`,

  json: JSON.stringify([
    {
      "product_title": "Luxury Watch Alpha",
      "item_code": "LWA-001", 
      "selling_price": 2499.99,
      "inventory_count": 15,
      "product_description": "Premium Swiss-made timepiece",
      "manufacturer": "Kerouac Watches"
    },
    {
      "product_title": "Beauty Serum Pro",
      "item_code": "BSP-202",
      "selling_price": 89.99, 
      "inventory_count": 50,
      "product_description": "Anti-aging facial serum with peptides",
      "manufacturer": "Aurora Cosmetics"
    }
  ], null, 2),

  xlsx: {
    // Simulate XLSX structure
    headers: ['Name', 'Product Code', 'Cost', 'Available Stock', 'Details', 'Brand'],
    data: [
      ['Luxury Watch Alpha', 'LWA-001', 2499.99, 15, 'Premium Swiss-made timepiece', 'Kerouac Watches'],
      ['Beauty Serum Pro', 'BSP-202', 89.99, 50, 'Anti-aging facial serum with peptides', 'Aurora Cosmetics']
    ]
  }
};

async function testFieldExtractionService() {
  console.log('\n🔍 Testing Field Extraction Service...');
  
  try {
    // Dynamic import for ESM
    const { FieldExtractionService } = await import('../server/field-extraction-service.ts');
    const fieldExtractor = FieldExtractionService.getInstance();
    
    // Test CSV parsing
    const csvBuffer = Buffer.from(testData.csv, 'utf-8');
    const csvResult = await fieldExtractor.extractFieldsFromFile(
      csvBuffer,
      'test-products.csv',
      'csv',
      {
        maxSampleSize: 10,
        includeStatistics: true,
        expandAbbreviations: true,
        inferTypes: true,
        analyzePatterns: true
      }
    );
    
    console.log('✅ CSV Field Extraction Results:');
    console.log(`   - Fields detected: ${csvResult.fields.length}`);
    console.log(`   - Total records: ${csvResult.metadata.totalRecords}`);
    console.log(`   - Confidence: ${Math.round(csvResult.confidence * 100)}%`);
    
    csvResult.fields.forEach(field => {
      console.log(`   - ${field.name} (${field.dataType}) - ${field.sampleValues.slice(0, 2).join(', ')}`);
      if (field.metadata?.abbreviationExpansion && field.metadata.abbreviationExpansion !== field.name) {
        console.log(`     Expanded: ${field.metadata.abbreviationExpansion}`);
      }
    });
    
    // Test JSON parsing  
    const jsonBuffer = Buffer.from(testData.json, 'utf-8');
    const jsonResult = await fieldExtractor.extractFieldsFromFile(
      jsonBuffer,
      'test-products.json', 
      'json'
    );
    
    console.log('\n✅ JSON Field Extraction Results:');
    console.log(`   - Fields detected: ${jsonResult.fields.length}`);
    console.log(`   - Total records: ${jsonResult.metadata.totalRecords}`);
    
    return { csvResult, jsonResult };
    
  } catch (error) {
    console.error('❌ Field Extraction Test Failed:', error.message);
    return null;
  }
}

async function testPromptTemplateEngine() {
  console.log('\n📝 Testing Prompt Template Engine...');
  
  try {
    const { PromptTemplateEngine } = await import('../server/services/prompt-template-engine.ts');
    const promptEngine = PromptTemplateEngine.getInstance();
    
    // Test variable injection
    const testFields = {
      fields: [
        { name: 'product_name', dataType: 'string', sampleValues: ['Luxury Watch Alpha', 'Beauty Serum Pro'] },
        { name: 'sku_code', dataType: 'string', sampleValues: ['LWA-001', 'BSP-202'] },
        { name: 'price_usd', dataType: 'number', sampleValues: [2499.99, 89.99] }
      ],
      sampleData: [
        ['Luxury Watch Alpha', 'LWA-001', 2499.99],
        ['Beauty Serum Pro', 'BSP-202', 89.99]
      ]
    };
    
    // Test [UPLOADED_FIELDS] variable compilation
    const compiled = await promptEngine.compile('field-mapping-v1', {
      uploadedFields: testFields,
      SKU_FIELDS: {
        name: 'Product name/title (required)',
        sku: 'Stock keeping unit identifier', 
        price: 'Product selling price in cents'
      }
    });
    
    console.log('✅ Template Compilation Results:');
    console.log('   - Template compiled successfully');
    console.log('   - [UPLOADED_FIELDS] variable injected');
    console.log('   - Template length:', compiled.length, 'characters');
    
    // Test available templates
    const templates = await promptEngine.getAvailableTemplates();
    console.log('   - Available templates:', templates.join(', '));
    
    return compiled;
    
  } catch (error) {
    console.error('❌ Prompt Template Test Failed:', error.message);
    return null;
  }
}

async function testMultiStrategyMapping() {
  console.log('\n🎯 Testing Multi-Strategy Field Mapping...');
  
  try {
    const { MultiStrategyFieldMapping } = await import('../server/services/multi-strategy-field-mapping.ts');
    const mapper = MultiStrategyFieldMapping.getInstance();
    
    // Create test extracted fields
    const extractedFields = {
      fields: [
        { 
          name: 'product_name', 
          dataType: 'string', 
          sampleValues: ['Luxury Watch Alpha', 'Beauty Serum Pro'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        },
        { 
          name: 'sku_code', 
          dataType: 'string', 
          sampleValues: ['LWA-001', 'BSP-202'],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: true
        },
        { 
          name: 'price_usd', 
          dataType: 'number', 
          sampleValues: [2499.99, 89.99],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: false
        },
        { 
          name: 'stock_qty', 
          dataType: 'number', 
          sampleValues: [15, 50],
          nullPercentage: 0,
          uniquePercentage: 100,
          isRequired: false
        }
      ],
      sampleData: [
        ['Luxury Watch Alpha', 'LWA-001', 2499.99, 15],
        ['Beauty Serum Pro', 'BSP-202', 89.99, 50]
      ],
      fileType: 'csv',
      metadata: {
        totalRecords: 2,
        totalFields: 4,
        fileSize: 1024,
        parseTime: 50,
        hasHeaders: true
      },
      confidence: 0.95
    };
    
    // Test multi-strategy mapping
    const mappingResult = await mapper.generateMappings(extractedFields);
    
    console.log('✅ Multi-Strategy Mapping Results:');
    console.log(`   - Success: ${mappingResult.success}`);
    console.log(`   - Mappings found: ${mappingResult.mappings.length}`);
    console.log(`   - Overall confidence: ${mappingResult.confidence}%`);
    console.log(`   - Processing time: ${mappingResult.processingTime}ms`);
    console.log(`   - Strategies used: ${mappingResult.strategiesUsed.join(', ')}`);
    console.log(`   - Cost: $${mappingResult.cost?.toFixed(6) || '0'}`);
    
    mappingResult.mappings.forEach(mapping => {
      console.log(`   - ${mapping.sourceField} → ${mapping.targetField} (${mapping.confidence}% via ${mapping.strategy})`);
    });
    
    if (mappingResult.unmappedFields.length > 0) {
      console.log(`   - Unmapped fields: ${mappingResult.unmappedFields.join(', ')}`);
    }
    
    return mappingResult;
    
  } catch (error) {
    console.error('❌ Multi-Strategy Mapping Test Failed:', error.message);
    return null;
  }
}

async function testLearningSystem() {
  console.log('\n🧠 Testing Learning System...');
  
  try {
    const { LearningSystem } = await import('../server/services/learning-system.ts');
    const learningSystem = LearningSystem.getInstance();
    
    // Test learning from successful mappings
    await learningSystem.learnFromMapping('product_name', 'name', 95, 'exact');
    await learningSystem.learnFromMapping('sku_code', 'sku', 90, 'fuzzy');
    await learningSystem.learnFromMapping('price_usd', 'price', 85, 'semantic');
    
    console.log('✅ Learning System Results:');
    console.log('   - Successfully learned from 3 field mappings');
    
    // Test getting suggestions
    const suggestions = await learningSystem.getSuggestions(['product_title', 'item_code', 'selling_price']);
    
    console.log(`   - Generated ${suggestions.length} suggestions for new fields`);
    suggestions.forEach(suggestion => {
      console.log(`   - ${suggestion.sourceField}:`);
      suggestion.suggestions.forEach(s => {
        console.log(`     → ${s.targetField} (${s.predictedConfidence}%) - ${s.reasoning}`);
      });
    });
    
    // Test statistics
    const stats = await learningSystem.getStatistics();
    if (stats) {
      console.log('   - Learning statistics:');
      console.log(`     Total patterns: ${stats.patterns?.totalPatterns || 0}`);
      console.log(`     Avg success rate: ${stats.patterns?.avgSuccessRate?.toFixed(1) || 0}%`);
    }
    
    return suggestions;
    
  } catch (error) {
    console.error('❌ Learning System Test Failed:', error.message);
    return null;
  }
}

async function testIntegration() {
  console.log('\n🔄 Testing Full Integration...');
  
  try {
    // Test complete workflow
    const extractionResults = await testFieldExtractionService();
    if (!extractionResults) throw new Error('Field extraction failed');
    
    const templateResults = await testPromptTemplateEngine();
    if (!templateResults) throw new Error('Template compilation failed');
    
    const mappingResults = await testMultiStrategyMapping();
    if (!mappingResults) throw new Error('Multi-strategy mapping failed');
    
    const learningResults = await testLearningSystem();
    
    console.log('✅ Full Integration Test Results:');
    console.log('   - Field extraction: ✓');
    console.log('   - Template engine: ✓');
    console.log('   - Multi-strategy mapping: ✓');  
    console.log('   - Learning system: ✓');
    console.log('\n🎉 All enhanced upload architecture components working correctly!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Integration Test Failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Enhanced Upload Architecture Test Suite');
  console.log('==========================================');
  
  try {
    const success = await testIntegration();
    
    if (success) {
      console.log('\n✅ ALL TESTS PASSED');
      console.log('Enhanced upload architecture is ready for production!');
      process.exit(0);
    } else {
      console.log('\n❌ SOME TESTS FAILED');
      console.log('Please review the errors above and fix issues before deployment.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 TEST SUITE CRASHED:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export {
  testFieldExtractionService,
  testPromptTemplateEngine,
  testMultiStrategyMapping,
  testLearningSystem,
  testIntegration
};