#!/usr/bin/env node

/**
 * CRITICAL: Database Sequence Diagnostic Tool
 *
 * This script diagnoses and fixes sequence misalignment issues after Supabase migration.
 * The root cause: Data migrated with explicit IDs but sequences weren't updated.
 *
 * Usage: node scripts/diagnose-sequence-issues.js
 */

import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

// Database connection setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// All tables with serial primary keys (from schema.ts analysis)
const TABLES_WITH_SEQUENCES = [
  "users",
  "brands",
  "products",
  "product_attributes",
  "media_assets",
  "product_families",
  "product_family_items",
  "product_associations",
  "brand_retailers",
  "variant_options",
  "variant_option_values",
  "product_variant_options",
  "product_variants",
  "variant_combinations",
  "syndication_channels",
  "product_syndications",
  "syndication_logs",
  "import_sessions",
  "field_mapping_cache",
  "import_history",
  "import_batches",
  "test_executions",
  "approval_requests",
  "approval_decisions",
  "approval_preferences",
  "approval_metrics",
  "edge_case_detections",
  "error_patterns",
  "error_analytics",
  "generated_test_cases",
  "edge_case_test_cases",
  "ml_feedback_sessions",
  "ml_learning_patterns",
  "user_behavior_profiles",
  "automation_confidence",
  "edge_case_integration_sessions",
  "automation_metrics",
  "system_performance_metrics",
  "test_execution_analytics",
  "cost_optimization_metrics",
  "performance_trends",
  "automation_alerts",
  "roi_metrics",
  "user_decision_analytics",
  "report_generations",
];

async function checkSequenceStatus() {
  console.log("🔍 DIAGNOSING SEQUENCE ISSUES AFTER SUPABASE MIGRATION");
  console.log("=".repeat(60));

  const client = await pool.connect();
  const issues = [];
  const fixCommands = [];

  try {
    for (const table of TABLES_WITH_SEQUENCES) {
      console.log(`\n📋 Checking table: ${table}`);

      // Check if table exists
      const tableExists = await client.query(
        `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = $1 AND table_schema = 'public'
        )
      `,
        [table],
      );

      if (!tableExists.rows[0].exists) {
        console.log(`   ⚠️  Table '${table}' does not exist - skipping`);
        continue;
      }

      // Get current sequence value
      const sequenceName = `${table}_id_seq`;
      let currentSeqValue = null;
      let maxIdValue = null;

      try {
        // Get current sequence value
        const seqResult = await client.query(`SELECT currval($1)`, [
          sequenceName,
        ]);
        currentSeqValue = parseInt(seqResult.rows[0].currval);
      } catch (error) {
        if (error.message.includes("is not yet defined")) {
          // Sequence exists but hasn't been used yet - get last_value
          try {
            const lastValueResult = await client.query(
              `SELECT last_value FROM ${sequenceName}`,
            );
            currentSeqValue = parseInt(lastValueResult.rows[0].last_value);
          } catch (e) {
            console.log(
              `   ❌ Could not get sequence value for ${sequenceName}: ${e.message}`,
            );
            continue;
          }
        } else {
          console.log(
            `   ❌ Sequence error for ${sequenceName}: ${error.message}`,
          );
          continue;
        }
      }

      // Get max ID from table
      try {
        const maxResult = await client.query(
          `SELECT COALESCE(MAX(id), 0) as max_id FROM ${table}`,
        );
        maxIdValue = parseInt(maxResult.rows[0].max_id);
      } catch (error) {
        console.log(
          `   ❌ Could not get max ID from ${table}: ${error.message}`,
        );
        continue;
      }

      // Get row count
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM ${table}`,
      );
      const rowCount = parseInt(countResult.rows[0].count);

      // Analyze the situation
      console.log(`   📊 Current sequence value: ${currentSeqValue}`);
      console.log(`   📊 Max ID in table: ${maxIdValue}`);
      console.log(`   📊 Row count: ${rowCount}`);

      if (maxIdValue > currentSeqValue) {
        const issue = {
          table,
          sequenceName,
          currentSeqValue,
          maxIdValue,
          rowCount,
          severity: "CRITICAL",
          nextInsertWillFail: currentSeqValue <= maxIdValue,
        };

        issues.push(issue);

        console.log(`   🚨 SEQUENCE ISSUE DETECTED!`);
        console.log(
          `   🚨 Next insert will try ID ${currentSeqValue + 1} but max existing is ${maxIdValue}`,
        );

        // Generate fix command
        const newSeqValue = maxIdValue + 1;
        const fixCommand = `SELECT setval('${sequenceName}', ${newSeqValue}, false);`;
        fixCommands.push({ table, command: fixCommand, newValue: newSeqValue });
      } else if (maxIdValue === currentSeqValue && rowCount > 0) {
        console.log(
          `   ⚠️  Sequence might cause issues on next insert (exactly at max value)`,
        );
        const newSeqValue = maxIdValue + 1;
        const fixCommand = `SELECT setval('${sequenceName}', ${newSeqValue}, false);`;
        fixCommands.push({ table, command: fixCommand, newValue: newSeqValue });
      } else {
        console.log(`   ✅ Sequence appears healthy`);
      }
    }

    // Summary Report
    console.log("\n" + "=".repeat(60));
    console.log("📋 SEQUENCE DIAGNOSTIC SUMMARY");
    console.log("=".repeat(60));

    if (issues.length === 0) {
      console.log("✅ No critical sequence issues detected");
    } else {
      console.log(`🚨 Found ${issues.length} critical sequence issues:`);
      issues.forEach((issue) => {
        console.log(
          `   - ${issue.table}: seq=${issue.currentSeqValue}, max_id=${issue.maxIdValue}`,
        );
      });
    }

    // Generate Fix Script
    if (fixCommands.length > 0) {
      console.log("\n🔧 GENERATED FIX COMMANDS:");
      console.log("-".repeat(40));

      const sqlScript = [
        "-- CRITICAL: Fix sequence misalignment after Supabase migration",
        "-- Generated on: " + new Date().toISOString(),
        "-- Execute these commands to fix sequence issues",
        "",
        "BEGIN;",
        "",
      ];

      fixCommands.forEach((fix) => {
        console.log(
          `${fix.command} -- Fix ${fix.table} (set to ${fix.newValue})`,
        );
        sqlScript.push(`-- Fix ${fix.table} sequence`);
        sqlScript.push(fix.command);
        sqlScript.push("");
      });

      sqlScript.push("COMMIT;");
      sqlScript.push("");
      sqlScript.push("-- Verify fixes with these queries:");
      fixCommands.forEach((fix) => {
        sqlScript.push(
          `-- SELECT currval('${fix.table}_id_seq') as current_value, MAX(id) as max_id FROM ${fix.table};`,
        );
      });

      // Write fix script to file
      const fs = await import("fs");
      const fixScriptPath = "./scripts/fix-sequences.sql";
      fs.writeFileSync(fixScriptPath, sqlScript.join("\n"));
      console.log(`\n💾 Fix script saved to: ${fixScriptPath}`);
    }

    return { issues, fixCommands };
  } finally {
    client.release();
  }
}

async function testInsertOperations() {
  console.log("\n🧪 TESTING INSERT OPERATIONS");
  console.log("=".repeat(60));

  const client = await pool.connect();
  const testResults = [];

  try {
    // Test critical tables that are commonly used
    const testTables = [
      {
        name: "products",
        insert: `INSERT INTO products (name, brand_id, price_cents, created_by) VALUES ('Test Product', 1, 1999, 1) RETURNING id`,
        cleanup: `DELETE FROM products WHERE name = 'Test Product'`,
      },
      {
        name: "brands",
        insert: `INSERT INTO brands (name, slug, owner_id) VALUES ('Test Brand', 'test-brand-seq', 1) RETURNING id`,
        cleanup: `DELETE FROM brands WHERE slug = 'test-brand-seq'`,
      },
      {
        name: "media_assets",
        insert: `INSERT INTO media_assets (filename, file_path, file_size, mime_type, created_by) VALUES ('test.jpg', '/test/path', 1024, 'image/jpeg', 1) RETURNING id`,
        cleanup: `DELETE FROM media_assets WHERE filename = 'test.jpg'`,
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

    console.log("\n📊 INSERT TEST SUMMARY:");
    testResults.forEach((result) => {
      const status = result.status === "SUCCESS" ? "✅" : "❌";
      console.log(`   ${status} ${result.table}: ${result.status}`);
      if (result.error && result.isPrimaryKeyConstraint) {
        console.log(
          `      🚨 PRIMARY KEY CONSTRAINT VIOLATION - SEQUENCE ISSUE CONFIRMED`,
        );
      }
    });

    return testResults;
  } finally {
    client.release();
  }
}

async function checkQueryPerformance() {
  console.log("\n⚡ CHECKING QUERY PERFORMANCE");
  console.log("=".repeat(60));

  const client = await pool.connect();

  try {
    const performanceTests = [
      {
        name: "Dashboard Counts",
        query: `
          SELECT 
            (SELECT COUNT(*) FROM products) as product_count,
            (SELECT COUNT(*) FROM brands) as brand_count,
            (SELECT COUNT(*) FROM users) as user_count
        `,
      },
      {
        name: "Products List",
        query: `SELECT id, name, price_cents FROM products LIMIT 10`,
      },
      {
        name: "Brands List",
        query: `SELECT id, name, slug FROM brands LIMIT 10`,
      },
    ];

    for (const test of performanceTests) {
      console.log(`\n🔍 Testing: ${test.name}`);
      const startTime = Date.now();

      try {
        const result = await client.query(test.query);
        const duration = Date.now() - startTime;

        console.log(`   ✅ Duration: ${duration}ms`);
        console.log(`   📊 Rows returned: ${result.rows.length}`);

        if (duration > 500) {
          console.log(`   ⚠️  SLOW QUERY - Duration exceeds 500ms`);
        } else if (duration > 200) {
          console.log(`   ⚠️  Moderate performance - Consider optimization`);
        }
      } catch (error) {
        console.log(`   ❌ Query failed: ${error.message}`);
      }
    }
  } finally {
    client.release();
  }
}

// Main execution
async function main() {
  try {
    console.log("🚀 Starting comprehensive sequence diagnostic...\n");

    // 1. Check sequence status
    const { issues, fixCommands } = await checkSequenceStatus();

    // 2. Test insert operations
    const testResults = await testInsertOperations();

    // 3. Check query performance
    await checkQueryPerformance();

    // 4. Final recommendations
    console.log("\n" + "=".repeat(60));
    console.log("🎯 RECOMMENDATIONS & NEXT STEPS");
    console.log("=".repeat(60));

    if (issues.length > 0) {
      console.log("🚨 IMMEDIATE ACTION REQUIRED:");
      console.log(
        "   1. Run the generated fix script: ./scripts/fix-sequences.sql",
      );
      console.log("   2. Test insert operations again after fixes");
      console.log("   3. Monitor performance after sequence adjustments");
    } else {
      console.log("✅ No sequence issues detected");

      // Check if insert tests failed for other reasons
      const failedTests = testResults.filter((t) => t.status === "FAILED");
      if (failedTests.length > 0) {
        console.log("⚠️  Insert operations failed for other reasons:");
        failedTests.forEach((test) => {
          console.log(`   - ${test.table}: ${test.error}`);
        });
      }
    }

    console.log("\n🏁 Diagnostic complete!");
  } catch (error) {
    console.error("❌ Diagnostic failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { checkSequenceStatus, testInsertOperations, checkQueryPerformance };
