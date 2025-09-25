import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
const { Pool } = pg;
import * as schema from "../shared/schema.js";
// Use PostgreSQL for Firebase Functions
let pool;
let db;
let dbInitialized = false;
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres123@localhost:5432/queenone_dev";
export async function initializeDatabase() {
    if (dbInitialized)
        return;
    console.log("🔌 Connecting to PostgreSQL for Firebase Functions");
    pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    db = drizzle(pool, { schema });
    dbInitialized = true;
}
export { pool, db };
//# sourceMappingURL=db.js.map