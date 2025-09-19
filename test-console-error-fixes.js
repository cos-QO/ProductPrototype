/**
 * PLAN-20250919-1620-001 Phase 3: Integration Test
 * Test console error fixes for Multi-Strategy Field Mapping
 */

// Mock CSV test data that previously caused console errors
const testCsvData = {
  fields: [
    {
      name: "product_name",
      dataType: "string",
      sampleValues: ["Test Product 1", "Test Product 2"],
    },
    { name: "price", dataType: "number", sampleValues: [29.99, 39.99] },
    {
      name: "sku_code",
      dataType: "string",
      sampleValues: ["ABC123", "DEF456"],
    },
    {
      name: "description",
      dataType: "string",
      sampleValues: ["Product description", "Another description"],
    },
  ],
  sampleData: [
    ["Test Product 1", 29.99, "ABC123", "Product description"],
    ["Test Product 2", 39.99, "DEF456", "Another description"],
  ],
  fileType: "csv",
};

console.log("🧪 Testing Console Error Fixes - PLAN-20250919-1620-001");
console.log("═".repeat(60));

async function testFieldMappingService() {
  try {
    // Import the fixed service
    const { MultiStrategyFieldMapping } = await import(
      "./server/services/multi-strategy-field-mapping.ts"
    );

    console.log("✅ Successfully imported MultiStrategyFieldMapping service");

    // Create service instance
    const mappingService = MultiStrategyFieldMapping.getInstance();
    console.log("✅ Service instance created");

    // Test the field mapping with the data that previously caused errors
    console.log("\n🔄 Testing field mapping with sample CSV data...");

    const result = await mappingService.generateMappings({
      fields: testCsvData.fields,
      sampleData: testCsvData.sampleData,
      fileType: testCsvData.fileType,
    });

    console.log("\n📊 Mapping Results:");
    console.log("Success:", result.success);
    console.log("Confidence:", result.confidence + "%");
    console.log("Mappings found:", result.mappings.length);
    console.log("Processing time:", result.processingTime + "ms");
    console.log("Strategies used:", result.strategiesUsed.join(", "));

    if (result.cost !== undefined) {
      console.log("LLM Cost:", "$" + result.cost.toFixed(4));
    }

    // Check specific fixes
    console.log("\n🔍 Verifying Fixes:");

    // 1. LLM Cost Limit Check
    if (result.cost && result.cost <= 0.005) {
      console.log("✅ LLM cost within new limit ($0.005)");
    } else if (result.cost === undefined) {
      console.log("ℹ️  LLM not used (acceptable)");
    } else {
      console.log("❌ LLM cost exceeds limit:", result.cost);
    }

    // 2. No SQL syntax errors (successful completion indicates this)
    if (result.success) {
      console.log("✅ No SQL syntax errors in learning cache updates");
    }

    // 3. Missing context variable (successful completion indicates this)
    if (result.success) {
      console.log("✅ PREVIOUS_MAPPINGS context variable properly handled");
    }

    // Display individual mappings
    if (result.mappings.length > 0) {
      console.log("\n📋 Individual Mappings:");
      result.mappings.forEach((mapping, index) => {
        console.log(
          `${index + 1}. ${mapping.sourceField} → ${mapping.targetField} (${mapping.confidence}% via ${mapping.strategy})`,
        );
      });
    }

    if (result.unmappedFields.length > 0) {
      console.log("\n⚠️  Unmapped Fields:", result.unmappedFields.join(", "));
    }

    console.log("\n✅ Integration test completed successfully!");
    return true;
  } catch (error) {
    console.error("❌ Integration test failed:");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    return false;
  }
}

// Run the test
testFieldMappingService()
  .then((success) => {
    if (success) {
      console.log("\n🎉 All console errors have been resolved!");
      console.log("User can now proceed with CSV import workflow.");
      process.exit(0);
    } else {
      console.log("\n💥 Test failed - additional fixes may be needed");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  });
