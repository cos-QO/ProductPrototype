#!/usr/bin/env node

import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.supabase' });

console.log('🔍 Testing Supabase Connection...');
console.log('📋 Connection Details:');
console.log(`   Host: ${process.env.SUPABASE_HOST}`);
console.log(`   Port: ${process.env.SUPABASE_PORT}`);
console.log(`   Database: ${process.env.SUPABASE_DB_NAME}`);
console.log(`   User: ${process.env.SUPABASE_DB_USER}`);

// Test different connection formats
const connectionOptions = [
  // Format 1: Direct URL
  {
    name: 'Direct URL (db.ozql...)',
    url: 'postgresql://postgres:postgres123@db.ozqlcusczxvuhxbhrgdn.supabase.co:5432/postgres'
  },
  // Format 2: Alternative URL  
  {
    name: 'Alternative URL (ozql...)',
    url: 'postgresql://postgres:postgres123@ozqlcusczxvuhxbhrgdn.supabase.co:6543/postgres'
  },
  // Format 3: Alternative port
  {
    name: 'Alternative Port 5433',
    url: 'postgresql://postgres:postgres123@db.ozqlcusczxvuhxbhrgdn.supabase.co:5433/postgres'
  }
];

async function testConnection(option) {
  console.log(`\n🧪 Testing: ${option.name}`);
  console.log(`   URL: ${option.url.replace('postgres123', '****')}`);
  
  try {
    const sql = postgres(option.url, { 
      prepare: false,
      max: 1,
      idle_timeout: 10,
      connect_timeout: 10
    });
    
    const result = await sql`SELECT version() as version, current_database() as database`;
    console.log(`✅ Success! Connected to: ${result[0].database}`);
    console.log(`   PostgreSQL: ${result[0].version.split(' ').slice(0, 2).join(' ')}`);
    
    await sql.end();
    return true;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return false;
  }
}

async function main() {
  let successfulConnection = null;
  
  for (const option of connectionOptions) {
    const success = await testConnection(option);
    if (success && !successfulConnection) {
      successfulConnection = option;
    }
  }
  
  if (successfulConnection) {
    console.log(`\n🎉 Connection successful with: ${successfulConnection.name}`);
    console.log(`📝 Use this URL for migration: ${successfulConnection.url}`);
  } else {
    console.log('\n❌ All connection attempts failed');
    console.log('💡 Please check:');
    console.log('   - Supabase project is active');
    console.log('   - Database password is correct');
    console.log('   - Network connectivity');
    console.log('   - Supabase dashboard for connection details');
  }
}

main().catch(console.error);