#!/usr/bin/env node

/**
 * CRITICAL: Schema Verification Tool
 *
 * This script checks for schema differences between expected (schema.ts) and actual (Supabase) schemas
 * to identify missing columns, tables, or other structural issues.
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

async function checkTableSchema(tableName) {
  const client = await pool.connect();

  try {
    console.log(`\n🔍 Checking schema for: ${tableName}`);

    // Get table columns
    const result = await client.query(
      `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = $1 
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `,
      [tableName],
    );

    if (result.rows.length === 0) {
      console.log(`   ❌ Table '${tableName}' does not exist`);
      return null;
    }

    console.log(`   📊 Found ${result.rows.length} columns:`);
    result.rows.forEach((col) => {
      const nullable = col.is_nullable === "YES" ? "NULL" : "NOT NULL";
      const defaultVal = col.column_default
        ? ` DEFAULT ${col.column_default}`
        : "";
      console.log(
        `     - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`,
      );
    });

    return result.rows;
  } finally {
    client.release();
  }
}

async function checkCriticalTables() {
  console.log("🔍 CHECKING SCHEMA DIFFERENCES AFTER SUPABASE MIGRATION");
  console.log("=".repeat(60));

  const criticalTables = [
    "users",
    "brands",
    "products",
    "media_assets",
    "syndication_channels",
    "import_sessions",
  ];

  const schemaIssues = [];

  for (const table of criticalTables) {
    const columns = await checkTableSchema(table);

    if (!columns) {
      schemaIssues.push({
        table,
        issue: "TABLE_MISSING",
        severity: "CRITICAL",
      });
      continue;
    }

    // Check for specific expected columns based on our diagnostic errors
    const columnNames = columns.map((c) => c.column_name);

    if (table === "products" && !columnNames.includes("price_cents")) {
      schemaIssues.push({
        table,
        issue: "MISSING_COLUMN_price_cents",
        severity: "CRITICAL",
        found_columns: columnNames,
      });
    }

    if (table === "media_assets" && !columnNames.includes("filename")) {
      schemaIssues.push({
        table,
        issue: "MISSING_COLUMN_filename",
        severity: "CRITICAL",
        found_columns: columnNames,
      });
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 SCHEMA ANALYSIS SUMMARY");
  console.log("=".repeat(60));

  if (schemaIssues.length === 0) {
    console.log("✅ No critical schema issues detected");
  } else {
    console.log(`🚨 Found ${schemaIssues.length} schema issues:`);
    schemaIssues.forEach((issue) => {
      console.log(`   - ${issue.table}: ${issue.issue} (${issue.severity})`);
      if (issue.found_columns) {
        console.log(
          `     Available columns: ${issue.found_columns.join(", ")}`,
        );
      }
    });
  }

  return schemaIssues;
}

async function main() {
  try {
    const schemaIssues = await checkCriticalTables();

    if (schemaIssues.length > 0) {
      console.log("\n⚠️  Schema migration may be incomplete or outdated!");
      console.log("Consider running database migrations to align schemas.");
    }
  } catch (error) {
    console.error("❌ Schema check failed:", error);
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
