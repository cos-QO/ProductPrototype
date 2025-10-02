import { db } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function checkTableStructure() {
  try {
    // Check if cost_price column exists
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name = 'cost_price';
    `);

    console.log("Cost price column check:", result.rows);

    // Check if sku_dial_allocations table exists
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'sku_dial_allocations';
    `);

    console.log(
      "SKU dial allocations table exists:",
      tableCheck.rows.length > 0,
    );

    if (tableCheck.rows.length === 0) {
      console.log("Creating sku_dial_allocations table...");
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS sku_dial_allocations (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id INTEGER REFERENCES products(id) NOT NULL,
          performance_points INTEGER DEFAULT 0,
          inventory_points INTEGER DEFAULT 0,
          profitability_points INTEGER DEFAULT 0,
          demand_points INTEGER DEFAULT 0,
          competitive_points INTEGER DEFAULT 0,
          trend_points INTEGER DEFAULT 0,
          efficiency_rating VARCHAR(5) DEFAULT 'C',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log("Table created successfully");
    }

    if (result.rows.length === 0) {
      console.log("Adding cost_price column to products table...");
      await db.execute(sql`
        ALTER TABLE products ADD COLUMN cost_price INTEGER DEFAULT 0;
      `);
      console.log("Column added successfully");
    }
  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

checkTableStructure();
