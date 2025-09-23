import pg from 'pg';
import * as argon2 from 'argon2';
const { Pool } = pg;

const DATABASE_URL = "postgresql://postgres:postgres123@localhost:5432/queenone_dev";

async function checkUserAuth() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('=== User Authentication Analysis ===\n');
    
    // Check local-dev-user
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', ['local-dev-user']);
    
    if (userResult.rows.length === 0) {
      console.log('❌ local-dev-user not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`✅ local-dev-user found:`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Has password hash: ${user.password_hash ? 'Yes' : 'No'}`);
    
    if (user.password_hash) {
      console.log(`   - Password hash: ${user.password_hash.substring(0, 50)}...`);
      
      // Test password verification
      try {
        const isValidPassword = await argon2.verify(user.password_hash, 'Dragonunicorn!');
        console.log(`   - Password "Dragonunicorn!" is valid: ${isValidPassword ? '✅ Yes' : '❌ No'}`);
      } catch (error) {
        console.log(`   - Password verification error: ${error.message}`);
      }
    }
    
    console.log('\n=== Ownership Summary ===');
    const ownershipResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM brands WHERE owner_id = 'local-dev-user') as brand_count,
        (SELECT COUNT(*) FROM products p JOIN brands b ON p.brand_id = b.id WHERE b.owner_id = 'local-dev-user') as product_count
    `);
    
    const ownership = ownershipResult.rows[0];
    console.log(`Local Developer owns:`);
    console.log(`- ${ownership.brand_count} brands`);
    console.log(`- ${ownership.product_count} products`);
    
  } catch (error) {
    console.error('Auth check error:', error);
  } finally {
    await pool.end();
  }
}

checkUserAuth().catch(console.error);