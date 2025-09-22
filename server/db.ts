import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
const { Pool } = pg;
import * as schema from "@shared/schema";
import { createMockDb, initializeSampleData } from "./mock-database";

// Use PostgreSQL or mock database
let pool: any;
let db: any;

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres123@localhost:5432/queenone_dev?sslmode=disable";

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
    "🔌 Connecting to PostgreSQL:",
    DATABASE_URL.replace(/:[^:@]*@/, ":****@"),
  );
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: false,
  });
  db = drizzle(pool, { schema });
}

export { pool, db };
