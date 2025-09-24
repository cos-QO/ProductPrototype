import { defineConfig } from "drizzle-kit";

// Allow mock database during development
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres123@localhost:5432/queenone_dev";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
