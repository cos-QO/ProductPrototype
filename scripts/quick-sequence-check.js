#!/usr/bin/env node

/**
 * Quick Sequence Health Check
 *
 * A lightweight script for regular monitoring of sequence health.
 * Run this after imports or when experiencing constraint violations.
 *
 * Usage: node scripts/quick-sequence-check.js
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

const CRITICAL_TABLES = [
  "users",
  "brands",
  "products",
  "media_assets",
  "syndication_channels",
  "import_sessions",
];

async function quickSequenceCheck() {
  console.log("🔍 QUICK SEQUENCE HEALTH CHECK");
  console.log("=".repeat(50));
  console.log(
    `Database: ${process.env.DATABASE_URL?.replace(/:[^:@]*@/, ":****@")}`,
  );
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log();

  const client = await pool.connect();
  const issues = [];

  try {
    for (const table of CRITICAL_TABLES) {
      // Check if table exists
      const tableCheck = await client.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)",
        [table],
      );

      if (!tableCheck.rows[0].exists) {
        console.log(`⚠️  ${table}: Table not found`);
        continue;
      }

      // Special handling for users (UUID primary key)
      if (table === "users") {
        const userCount = await client.query("SELECT COUNT(*) FROM users");
        console.log(
          `✅ ${table}: ${userCount.rows[0].count} records (UUID PK)`,
        );
        continue;
      }

      try {
        // Get sequence info
        const seqName = `${table}_id_seq`;
        const nextVal = await client.query(
          `SELECT nextval('${seqName}') as next_id`,
        );
        const nextId = parseInt(nextVal.rows[0].next_id);

        // Reset sequence back
        await client.query(`SELECT setval('${seqName}', ${nextId - 1}, true)`);

        // Get max ID
        const maxResult = await client.query(
          `SELECT COALESCE(MAX(id), 0) as max_id FROM ${table}`,
        );
        const maxId = parseInt(maxResult.rows[0].max_id);

        // Get row count
        const countResult = await client.query(
          `SELECT COUNT(*) as count FROM ${table}`,
        );
        const rowCount = parseInt(countResult.rows[0].count);

        if (nextId > maxId) {
          console.log(
            `✅ ${table}: seq=${nextId - 1}, max=${maxId}, count=${rowCount}`,
          );
        } else {
          console.log(
            `🚨 ${table}: seq=${nextId - 1}, max=${maxId}, count=${rowCount} - ISSUE!`,
          );
          issues.push({
            table,
            sequenceValue: nextId - 1,
            maxId,
            rowCount,
            fixCommand: `SELECT setval('${seqName}', ${maxId + 1}, false);`,
          });
        }
      } catch (error) {
        console.log(`❌ ${table}: ${error.message}`);
      }
    }

    console.log("\n" + "=".repeat(50));

    if (issues.length === 0) {
      console.log("✅ ALL SEQUENCES HEALTHY");
      console.log("🎉 No action required");
    } else {
      console.log(`🚨 ${issues.length} SEQUENCE ISSUES DETECTED`);
      console.log("\n🔧 Quick Fixes:");
      issues.forEach((issue) => {
        console.log(`-- Fix ${issue.table}:`);
        console.log(issue.fixCommand);
      });
      console.log("\n⚠️  Run full diagnostic for detailed analysis:");
      console.log("node scripts/diagnose-sequence-issues.js");
    }

    console.log("\n📊 Summary:");
    console.log(`   Tables checked: ${CRITICAL_TABLES.length}`);
    console.log(`   Issues found: ${issues.length}`);
    console.log(
      `   Status: ${issues.length === 0 ? "HEALTHY" : "NEEDS ATTENTION"}`,
    );

    return issues.length === 0;
  } finally {
    client.release();
    await pool.end();
  }
}

// Test a quick insert if requested
async function testQuickInsert(table = "brands") {
  if (process.argv.includes("--test-insert")) {
    console.log(`\n🧪 Testing insert into ${table}...`);

    const client = await pool.connect();

    try {
      const testInsert =
        table === "brands"
          ? `INSERT INTO brands (name, slug) VALUES ('Quick Test', 'quick-test-${Date.now()}') RETURNING id`
          : `INSERT INTO ${table} (name) VALUES ('Quick Test') RETURNING id`;

      const result = await client.query(testInsert);
      const insertedId = result.rows[0].id;
      console.log(`   ✅ Success: Inserted ID ${insertedId}`);

      // Cleanup
      const cleanup =
        table === "brands"
          ? `DELETE FROM brands WHERE id = ${insertedId}`
          : `DELETE FROM ${table} WHERE id = ${insertedId}`;

      await client.query(cleanup);
      console.log(`   🧹 Cleaned up test record`);
    } catch (error) {
      console.log(`   ❌ Insert failed: ${error.message}`);
      if (
        error.message.includes("duplicate key value violates unique constraint")
      ) {
        console.log("   🚨 SEQUENCE ISSUE CONFIRMED - Run fix commands above");
      }
    } finally {
      client.release();
    }
  }
}

async function main() {
  try {
    const healthy = await quickSequenceCheck();

    if (process.argv.includes("--test-insert")) {
      await testQuickInsert();
    }

    process.exit(healthy ? 0 : 1);
  } catch (error) {
    console.error("❌ Quick check failed:", error);
    process.exit(1);
  }
}

// Show usage if --help
if (process.argv.includes("--help")) {
  console.log(`
QUICK SEQUENCE HEALTH CHECK

Usage:
  node scripts/quick-sequence-check.js          # Basic health check
  node scripts/quick-sequence-check.js --test-insert  # Include insert test
  node scripts/quick-sequence-check.js --help   # Show this help

Purpose:
  Quickly check if database sequences are ahead of max IDs to prevent
  primary key constraint violations on insert operations.

Exit Codes:
  0 = All sequences healthy
  1 = Issues found or check failed

For detailed analysis, run:
  node scripts/diagnose-sequence-issues.js
`);
  process.exit(0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
