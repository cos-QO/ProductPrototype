import { db } from '../server/db.ts';
import { sql } from 'drizzle-orm';

async function checkImportTables() {
  try {
    console.log('Checking database tables for import functionality...\n');
    
    // Check if import_sessions table exists
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'import_sessions'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ import_sessions table EXISTS');
      
      // Get column information
      const columns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'import_sessions'
        ORDER BY ordinal_position
      `);
      
      console.log('\nTable columns:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
      });
    } else {
      console.log('❌ import_sessions table does NOT exist');
      console.log('\nThe table needs to be created. Migration SQL is available in:');
      console.log('  migrations/0002_modern_doctor_spectrum.sql');
    }
    
    // Also check related tables
    const relatedTables = ['field_mapping_cache', 'import_history', 'import_batches'];
    console.log('\n\nRelated tables status:');
    
    for (const tableName of relatedTables) {
      const check = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        )
      `);
      
      const exists = check.rows[0].exists;
      console.log(`  ${exists ? '✅' : '❌'} ${tableName}: ${exists ? 'exists' : 'missing'}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking tables:', error.message);
    if (error.message.includes('relation "import_sessions" does not exist')) {
      console.log('\n⚠️  The import_sessions table is missing from the database.');
      console.log('This is causing the CSV upload failure.');
      console.log('\nTo fix this, run: npm run db:migrate');
    }
    process.exit(1);
  }
}

checkImportTables();