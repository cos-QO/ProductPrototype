#!/usr/bin/env node

/**
 * Test script for simplified field mapping integration
 * Tests the new direct OpenRouter API integration with user's API key
 */

import dotenv from 'dotenv';
dotenv.config();

async function testSimplifiedMapping() {
  console.log('🚀 Testing Simplified Field Mapping with OpenRouter API...\n');

  try {
    // Test OpenRouter client initialization
    const { OpenRouterClient } = await import('./services/openrouter-client.ts');
    const client = OpenRouterClient.getInstance();
    
    console.log('✅ OpenRouter Client Status:');
    console.log('   - API Available:', client.isAvailable());
    console.log('   - API Key:', process.env.OPENROUTER_API_KEY ? 'Configured' : 'Missing');
    console.log('   - Base URL:', process.env.OPENROUTER_BASE_URL || 'Default');
    console.log('   - Model:', process.env.OPENROUTER_MODEL || 'Default');
    console.log();

    if (!client.isAvailable()) {
      console.log('❌ OpenRouter API not available - check configuration');
      return;
    }

    // Test SimpleFieldMappingService
    const { SimpleFieldMappingService } = await import('./services/simple-field-mapping.ts');
    const simpleMapping = SimpleFieldMappingService.getInstance();
    
    console.log('✅ Simple Field Mapping Service initialized');
    console.log();

    // Test CSV field extraction
    const csvData = `product_name,cost,img_url,stock,brand_name,description
"Luxury Watch","2499.99","http://example.com/watch.jpg","50","Kerouac","Premium timepiece"
"Smart Phone","899.00","http://example.com/phone.jpg","100","TechFlow","Latest smartphone"
"Beauty Cream","49.99","http://example.com/cream.jpg","200","Aurora","Anti-aging cream"`;

    console.log('📝 Testing CSV field extraction...');
    const extractedFields = simpleMapping.extractFieldsFromFile(csvData, 'csv');
    console.log('   - Extracted fields:', extractedFields.fields);
    console.log('   - Sample data rows:', extractedFields.sampleData.length);
    console.log();

    // Test field mapping with OpenRouter
    console.log('🤖 Testing field mapping with OpenRouter API...');
    const result = await simpleMapping.processFileForMapping(extractedFields);
    
    console.log('📊 Mapping Results:');
    console.log('   - Success:', result.success);
    
    if (result.success) {
      console.log('   - Mapped fields:', result.mappings.length);
      console.log('   - Unmapped fields:', result.unmappedFields.length);
      console.log();
      
      console.log('📋 Field Mappings:');
      result.mappings.forEach(mapping => {
        console.log(`   - "${mapping.sourceField}" → "${mapping.targetField}" (${mapping.confidence}%)`);
        if (mapping.reasoning) {
          console.log(`     Reasoning: ${mapping.reasoning}`);
        }
      });
      console.log();
      
      if (result.unmappedFields.length > 0) {
        console.log('🚫 Unmapped fields (will be ignored):');
        result.unmappedFields.forEach(field => {
          console.log(`   - "${field}"`);
        });
        console.log();
      }
      
      if (result.usage) {
        console.log('💰 API Usage:');
        console.log(`   - Tokens used: ${result.usage.tokens}`);
        console.log(`   - Cost: $${result.usage.cost.toFixed(6)}`);
        console.log(`   - Response time: ${result.usage.responseTime}ms`);
        console.log();
      }
      
      const stats = simpleMapping.getUsageStats();
      console.log('📈 Session Stats:');
      console.log(`   - Total requests: ${stats.totalRequests}`);
      console.log(`   - Total cost: $${stats.totalCost.toFixed(6)}`);
      console.log(`   - Average response time: ${stats.averageResponseTime.toFixed(0)}ms`);
      console.log();
      
      // Validate cost requirement (<$0.001 per session)
      if (stats.totalCost < 0.001) {
        console.log('✅ Cost requirement met: <$0.001 per session');
      } else {
        console.log('❌ Cost requirement exceeded: >$0.001 per session');
      }
      
    } else {
      console.log('   - Error:', result.error);
    }

    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

// Test JSON field extraction
async function testJSONExtraction() {
  console.log('\n📝 Testing JSON field extraction...');
  
  try {
    const { SimpleFieldMappingService } = await import('./services/simple-field-mapping.ts');
    const simpleMapping = SimpleFieldMappingService.getInstance();
    
    const jsonData = [
      {
        "item_name": "Luxury Watch",
        "price_usd": 2499.99,
        "image_url": "http://example.com/watch.jpg",
        "quantity_available": 50,
        "manufacturer": "Kerouac",
        "product_details": "Premium timepiece"
      },
      {
        "item_name": "Smart Phone", 
        "price_usd": 899.00,
        "image_url": "http://example.com/phone.jpg",
        "quantity_available": 100,
        "manufacturer": "TechFlow",
        "product_details": "Latest smartphone"
      }
    ];

    const extractedFields = simpleMapping.extractFieldsFromFile(jsonData, 'json');
    console.log('   - Extracted fields:', extractedFields.fields);
    console.log('   - Sample data rows:', extractedFields.sampleData.length);
    
    // Test mapping
    const result = await simpleMapping.processFileForMapping(extractedFields);
    
    if (result.success) {
      console.log('\n📋 JSON Field Mappings:');
      result.mappings.forEach(mapping => {
        console.log(`   - "${mapping.sourceField}" → "${mapping.targetField}" (${mapping.confidence}%)`);
      });
    } else {
      console.log('   - Error:', result.error);
    }
    
  } catch (error) {
    console.error('❌ JSON test failed:', error.message);
  }
}

// Run tests
testSimplifiedMapping()
  .then(() => testJSONExtraction())
  .catch(console.error);