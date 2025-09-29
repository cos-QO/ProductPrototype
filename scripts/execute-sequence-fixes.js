#!/usr/bin/env node

/**
 * CRITICAL: Execute Sequence Fixes
 *
 * This script executes the generated sequence fix commands and verifies the results.
 * Run this AFTER confirming the fix-sequences.sql script is correct.
 */

import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function executeSequenceFixes() {
  console.log("🔧 EXECUTING SEQUENCE FIXES");
  console.log("=".repeat(60));

  const client = await pool.connect();

  try {
    // Begin transaction
    console.log("🏁 Starting transaction...");
    await client.query("BEGIN");

    // Execute the fix commands
    const fixCommands = [
      {
        table: "brands",
        command: "SELECT setval('brands_id_seq', 26, false)",
        expectedNext: 26,
      },
      {
        table: "products",
        command: "SELECT setval('products_id_seq', 38, false)",
        expectedNext: 38,
      },
      {
        table: "media_assets",
        command: "SELECT setval('media_assets_id_seq', 19, false)",
        expectedNext: 19,
      },
      {
        table: "syndication_channels",
        command: "SELECT setval('syndication_channels_id_seq', 10, false)",
        expectedNext: 10,
      },
      {
        table: "syndication_logs",
        command: "SELECT setval('syndication_logs_id_seq', 114, false)",
        expectedNext: 114,
      },
      {
        table: "import_sessions",
        command: "SELECT setval('import_sessions_id_seq', 58, false)",
        expectedNext: 58,
      },
      {
        table: "field_mapping_cache",
        command: "SELECT setval('field_mapping_cache_id_seq', 15, false)",
        expectedNext: 15,
      },
    ];

    for (const fix of fixCommands) {
      console.log(`\n🔧 Fixing ${fix.table} sequence...`);

      try {
        const result = await client.query(fix.command);
        console.log(`   ✅ Success: Set sequence to ${fix.expectedNext}`);
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        throw error; // Will rollback transaction
      }
    }

    // Commit transaction
    console.log("\n✅ Committing changes...");
    await client.query("COMMIT");

    console.log("🎉 All sequence fixes applied successfully!");

    // Verify the fixes
    console.log("\n📋 VERIFYING SEQUENCE FIXES");
    console.log("-".repeat(40));

    for (const fix of fixCommands) {
      try {
        const verifyResult = await client.query(`
          SELECT 
            currval('${fix.table}_id_seq') as current_seq_value,
            (SELECT MAX(id) FROM ${fix.table}) as max_id_in_table,
            (SELECT COUNT(*) FROM ${fix.table}) as row_count
        `);

        const row = verifyResult.rows[0];
        const seqValue = parseInt(row.current_seq_value);
        const maxId = parseInt(row.max_id_in_table || 0);
        const rowCount = parseInt(row.row_count);

        console.log(`\n📊 ${fix.table}:`);
        console.log(`   Current sequence: ${seqValue}`);
        console.log(`   Max ID in table: ${maxId}`);
        console.log(`   Row count: ${rowCount}`);

        if (seqValue > maxId) {
          console.log(`   ✅ FIXED: Next insert will use ID ${seqValue + 1}`);
        } else {
          console.log(`   ⚠️  WARNING: Sequence may still cause issues`);
        }
      } catch (error) {
        console.log(
          `   ❌ Verification failed for ${fix.table}: ${error.message}`,
        );
      }
    }

    return true;
  } catch (error) {
    console.log("\n❌ TRANSACTION FAILED - ROLLING BACK");
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function testInsertOperationsFixed() {
  console.log("\n🧪 TESTING INSERT OPERATIONS AFTER FIXES");
  console.log("=".repeat(60));

  const client = await pool.connect();
  const testResults = [];

  try {
    // Updated test queries with correct column names
    const testTables = [
      {
        name: "products",
        insert: `INSERT INTO products (name, brand_id, price, created_by) VALUES ('Test Product After Fix', 1, 1999, (SELECT id FROM users LIMIT 1)) RETURNING id`,
        cleanup: `DELETE FROM products WHERE name = 'Test Product After Fix'`,
      },
      {
        name: "brands",
        insert: `INSERT INTO brands (name, slug, owner_id) VALUES ('Test Brand After Fix', 'test-brand-fix', (SELECT id FROM users LIMIT 1)) RETURNING id`,
        cleanup: `DELETE FROM brands WHERE slug = 'test-brand-fix'`,
      },
      {
        name: "media_assets",
        insert: `INSERT INTO media_assets (file_name, url, asset_type, uploaded_by) VALUES ('test-fix.jpg', '/test/path/fix.jpg', 'image', (SELECT id FROM users LIMIT 1)) RETURNING id`,
        cleanup: `DELETE FROM media_assets WHERE file_name = 'test-fix.jpg'`,
      },
    ];

    for (const test of testTables) {
      console.log(`\n🔍 Testing insert into ${test.name}...`);

      try {
        // Attempt insert
        const result = await client.query(test.insert);
        const insertedId = result.rows[0].id;
        console.log(`   ✅ Success: Inserted with ID ${insertedId}`);

        // Cleanup
        await client.query(test.cleanup);
        console.log(`   🧹 Cleaned up test record`);

        testResults.push({ table: test.name, status: "SUCCESS", insertedId });
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        testResults.push({
          table: test.name,
          status: "FAILED",
          error: error.message,
          isPrimaryKeyConstraint: error.message.includes(
            "duplicate key value violates unique constraint",
          ),
        });
      }
    }

    console.log("\n📊 INSERT TEST SUMMARY (AFTER FIXES):");
    const successCount = testResults.filter(
      (r) => r.status === "SUCCESS",
    ).length;
    const failedCount = testResults.filter((r) => r.status === "FAILED").length;

    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);

    testResults.forEach((result) => {
      const status = result.status === "SUCCESS" ? "✅" : "❌";
      console.log(`   ${status} ${result.table}: ${result.status}`);
      if (result.error && result.isPrimaryKeyConstraint) {
        console.log(`      🚨 SEQUENCE ISSUE STILL EXISTS!`);
      } else if (result.error) {
        console.log(`      ℹ️  Error: ${result.error}`);
      }
    });

    return testResults;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log("🚀 Starting sequence fix execution...\n");

    // 1. Execute the sequence fixes
    await executeSequenceFixes();

    // 2. Test insert operations with corrected queries
    const testResults = await testInsertOperationsFixed();

    // 3. Summary and recommendations
    console.log("\n" + "=".repeat(60));
    console.log("🎯 SEQUENCE FIX SUMMARY");
    console.log("=".repeat(60));

    const successfulTests = testResults.filter(
      (t) => t.status === "SUCCESS",
    ).length;
    const failedTests = testResults.filter((t) => t.status === "FAILED");

    if (successfulTests === testResults.length) {
      console.log("🎉 ALL SEQUENCE ISSUES RESOLVED!");
      console.log("✅ Write operations should now work correctly");
      console.log("✅ No more primary key constraint violations expected");
    } else {
      console.log(`⚠️  ${failedTests.length} issues remain:`);
      failedTests.forEach((test) => {
        if (test.isPrimaryKeyConstraint) {
          console.log(`   🚨 ${test.table}: Sequence issue persists`);
        } else {
          console.log(`   ⚠️  ${test.table}: ${test.error}`);
        }
      });
    }

    console.log("\n🏁 Sequence fix execution complete!");
  } catch (error) {
    console.error("❌ Sequence fix execution failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { executeSequenceFixes, testInsertOperationsFixed };
