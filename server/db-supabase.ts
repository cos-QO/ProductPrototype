import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
const { Pool } = pg;
import * as schema from "@shared/schema";
import { createMockDb, initializeSampleData } from "./mock-database";

// Supabase-optimized database connection
let pool: any;
let db: any;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is required for Supabase connection",
  );
}

if (DATABASE_URL.includes("mock")) {
  console.warn("⚠️  Using mock database for UI testing only");

  // Initialize sample data on first load
  initializeSampleData();

  // Create mock pool
  pool = {
    query: () => Promise.resolve({ rows: [] }),
    connect: () =>
      Promise.resolve({
        query: () => Promise.resolve({ rows: [] }),
        release: () => Promise.resolve(),
      }),
  };

  // Use the comprehensive mock database
  db = createMockDb();
} else {
  console.log(
    "🔌 Connecting to Supabase PostgreSQL:",
    DATABASE_URL.replace(/:[^:@]*@/, ":****@"),
  );

  // Supabase-optimized connection pool configuration
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Required for Supabase SSL
    },
    max: 20, // Connection pool size
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 2000, // Connection timeout
    // Note: prepare: false is handled by postgres-js, not node-postgres
  });

  db = drizzle(pool, { schema });
}

export { pool, db };
