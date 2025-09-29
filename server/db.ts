import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@shared/schema";
import { createMockDb, initializeSampleData } from "./mock-database";

// Database client and connection
let client: any;
let db: any;

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres123@localhost:5433/queenone_dev?sslmode=disable";

if (DATABASE_URL.includes("mock")) {
  console.warn("⚠️  Using mock database for UI testing only");

  // Initialize sample data on first load
  initializeSampleData();

  // Create mock client that mimics postgres-js interface
  client = {
    query: () => Promise.resolve({ rows: [] }),
    end: () => Promise.resolve(),
  };

  // Use the comprehensive mock database
  db = createMockDb();
} else {
  console.log(
    "🔌 Connecting to PostgreSQL:",
    DATABASE_URL.replace(/:[^:@]*@/, ":****@"),
  );

  // Critical: prepare: false is required for Supabase connection pooling
  // This prevents prepared statement issues with Supabase transaction mode
  client = postgres(DATABASE_URL, {
    prepare: false, // Required for Supabase transaction mode pooling
    max: 20, // Connection pool size
    idle_timeout: 30, // Close idle connections after 30s
    connect_timeout: 10, // Connection timeout in seconds
  });

  db = drizzle(client, { schema });
}

export { client, db };
