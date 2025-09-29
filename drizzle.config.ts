import { defineConfig } from "drizzle-kit";

// Support both local PostgreSQL and Supabase
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres123@localhost:5433/queenone_dev";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
  // Supabase-specific configurations
  schemaFilter: ["public"],
  tablesFilter: ["!auth.*", "!storage.*"],
  // Enable prepare: false for Supabase compatibility
  introspect: {
    casing: "snake_case",
  },
});
