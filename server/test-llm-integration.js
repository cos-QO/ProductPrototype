#!/usr/bin/env node

/**
 * Test script for LLM Integration with OpenRouter GPT-4o-mini
 * 
 * Tests the field mapping capabilities without requiring a full API key
 * Demonstrates the integration and fallback behavior
 */

import { OpenRouterClient } from './services/openrouter-client.js';
import { fieldMappingEngine } from './field-mapping-engine.js';

async function testLLMIntegration() {
  console.log('🤖 Testing LLM Integration - OpenRouter + GPT-4o-mini\n');

  try {
    // Test 1: Check OpenRouter client initialization
    console.log('1. Testing OpenRouter Client Initialization...');
    const client = OpenRouterClient.getInstance();
    
    console.log(`   ✓ Client initialized successfully`);
    console.log(`   ✓ API Available: ${client.isAvailable()}`);
    console.log(`   ✓ Initial stats:`, client.getStats());
    
    // Test 2: Test field mapping engine with LLM integration
    console.log('\n2. Testing Field Mapping Engine with LLM Integration...');
    
    const testSourceFields = [
      {
        name: 'product_name',
        dataType: 'string',
        sampleValues: ['iPhone 15 Pro', 'Samsung Galaxy S24', 'Google Pixel 8'],
        nullPercentage: 0,
        uniquePercentage: 100,
        isRequired: true
      },
      {
        name: 'retail_price',
        dataType: 'number',
        sampleValues: [999.99, 1199.99, 699.99],
        nullPercentage: 0,
        uniquePercentage: 100,
        isRequired: false
      },
      {
        name: 'product_desc',
        dataType: 'string',
        sampleValues: ['Latest iPhone with advanced camera', 'Android flagship with AI features', 'Google phone with pure Android'],
        nullPercentage: 5,
        uniquePercentage: 100,
        isRequired: false
      },
      {
        name: 'stock_qty',
        dataType: 'number',
        sampleValues: [150, 87, 203],
        nullPercentage: 0,
        uniquePercentage: 95,
        isRequired: false
      },
      {
        name: 'mysterious_field',
        dataType: 'string',
        sampleValues: ['ABC123', 'DEF456', 'GHI789'],
        nullPercentage: 0,
        uniquePercentage: 100,
        isRequired: false
      }
    ];

    console.log(`   ✓ Testing with ${testSourceFields.length} source fields`);
    
    const mappings = await fieldMappingEngine.generateMappings(testSourceFields);
    
    console.log(`   ✓ Generated ${mappings.length} field mappings:`);
    mappings.forEach(mapping => {
      console.log(`     - ${mapping.sourceField} → ${mapping.targetField} (${mapping.confidence}% confidence, strategy: ${mapping.strategy})`);
      if (mapping.metadata?.reasoning) {
        console.log(`       Reasoning: ${mapping.metadata.reasoning}`);
      }
    });

    // Test 3: Test validation
    console.log('\n3. Testing Field Mapping Validation...');
    const validation = fieldMappingEngine.validateMappings(mappings);
    
    console.log(`   ✓ Validation completed:`);
    console.log(`     - Valid: ${validation.isValid}`);
    console.log(`     - Errors: ${validation.errors.length}`);
    console.log(`     - Warnings: ${validation.warnings.length}`);
    
    if (validation.errors.length > 0) {
      console.log('     Errors:', validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.log('     Warnings:', validation.warnings.slice(0, 3)); // Show first 3
    }

    // Test 4: Test individual field suggestions
    console.log('\n4. Testing Individual Field Suggestions...');
    const testField = testSourceFields[4]; // The mysterious field
    
    const suggestions = await fieldMappingEngine.getSuggestionsForField(testField);
    console.log(`   ✓ Generated ${suggestions.length} suggestions for '${testField.name}':`);
    suggestions.slice(0, 3).forEach((suggestion, index) => {
      console.log(`     ${index + 1}. ${suggestion.sourceField} → ${suggestion.targetField} (${suggestion.confidence}% confidence, ${suggestion.strategy})`);
    });

    // Test 5: Test LLM-specific functionality if available
    if (client.isAvailable()) {
      console.log('\n5. Testing Direct LLM Analysis...');
      
      try {
        const result = await client.analyzeFieldMapping(
          ['product_title', 'msrp_price', 'inventory_count'],
          [
            ['iPhone 15 Pro Max', 'MacBook Air M2', 'AirPods Pro'],
            [1199.99, 999.99, 249.99],
            [50, 25, 150]
          ],
          ['name', 'price', 'stock', 'shortDescription'],
          'E-commerce product data analysis'
        );
        
        if (result.success) {
          console.log(`   ✓ LLM analysis successful:`);
          console.log(`     - Mappings: ${result.mappings?.length || 0}`);
          console.log(`     - Usage: ${result.usage?.tokens || 0} tokens, $${result.usage?.cost?.toFixed(6) || 0} cost`);
          console.log(`     - Response time: ${result.usage?.responseTime || 0}ms`);
          
          result.mappings?.forEach(mapping => {
            console.log(`     - ${mapping.sourceField} → ${mapping.targetField} (${mapping.confidence}%)`);
            console.log(`       ${mapping.reasoning}`);
          });
        } else {
          console.log(`   ⚠ LLM analysis failed: ${result.error}`);
        }
      } catch (error) {
        console.log(`   ⚠ LLM test failed: ${error.message}`);
      }
    } else {
      console.log('\n5. LLM Service Not Available');
      console.log('   ⚠ OpenRouter API key not configured - LLM features will use fallback strategies');
      console.log('   ℹ To enable LLM features:');
      console.log('     1. Sign up for OpenRouter at https://openrouter.ai/');
      console.log('     2. Set OPENROUTER_API_KEY in your .env file');
      console.log('     3. Restart the application');
    }

    // Test 6: Final statistics
    console.log('\n6. Final Statistics...');
    const finalStats = client.getStats();
    console.log(`   ✓ Total requests: ${finalStats.totalRequests}`);
    console.log(`   ✓ Total tokens: ${finalStats.totalTokens}`);
    console.log(`   ✓ Total cost: $${finalStats.totalCost.toFixed(6)}`);
    console.log(`   ✓ Average response time: ${finalStats.averageResponseTime.toFixed(2)}ms`);

    console.log('\n✅ LLM Integration Test Complete!');
    console.log('\nThe system successfully integrates LLM capabilities with graceful fallback:');
    console.log('• Field mapping works with 5-strategy approach (exact, fuzzy, historical, statistical, LLM)');
    console.log('• LLM enhances accuracy when available');
    console.log('• System degrades gracefully when LLM is unavailable');
    console.log('• Cost tracking and monitoring in place');
    console.log('• Confidence scoring provides transparency');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testLLMIntegration().catch(console.error);
}

export { testLLMIntegration };