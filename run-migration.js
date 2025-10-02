// Quick migration script to add cost_price column
import postgres from "postgres";

const sql = postgres({
  host: "aws-1-us-east-2.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  username: "postgres.ozqlcusczxvuhxbhrgdn",
  password: "8mN9VQPHhb72kzPE",
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  try {
    console.log("Checking if cost_price column exists...");

    const columnExists = await sql`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'cost_price'
    `;

    if (columnExists.length === 0) {
      console.log("Adding cost_price column to products table...");
      await sql`ALTER TABLE products ADD COLUMN cost_price INTEGER DEFAULT 0`;
      console.log("✅ cost_price column added successfully");
    } else {
      console.log("✅ cost_price column already exists");
    }

    // Ensure all products have a default cost_price
    const updateResult = await sql`
      UPDATE products SET cost_price = 0 WHERE cost_price IS NULL
    `;
    console.log(
      `✅ Updated ${updateResult.count} products with default cost_price`,
    );

    // Check if sku_dial_allocations table exists
    const tableExists = await sql`
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'sku_dial_allocations'
    `;

    if (tableExists.length === 0) {
      console.log("Creating sku_dial_allocations table...");
      await sql`
        CREATE TABLE sku_dial_allocations (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id INTEGER REFERENCES products(id) NOT NULL,
          performance_points INTEGER DEFAULT 0,
          inventory_points INTEGER DEFAULT 0,
          profitability_points INTEGER DEFAULT 0,
          demand_points INTEGER DEFAULT 0,
          competitive_points INTEGER DEFAULT 0,
          trend_points INTEGER DEFAULT 0,
          efficiency_rating VARCHAR(5) DEFAULT 'F',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT total_points_limit CHECK (
            (performance_points + inventory_points + profitability_points + 
             demand_points + competitive_points + trend_points) <= 888
          ),
          CONSTRAINT unique_product_allocation UNIQUE (product_id)
        )
      `;

      // Add indexes
      await sql`CREATE INDEX idx_sku_dial_allocations_product_id ON sku_dial_allocations(product_id)`;
      await sql`CREATE INDEX idx_sku_dial_allocations_efficiency ON sku_dial_allocations(efficiency_rating)`;

      console.log("✅ sku_dial_allocations table created successfully");
    } else {
      console.log("✅ sku_dial_allocations table already exists");
    }

    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await sql.end();
  }
}

runMigration();
