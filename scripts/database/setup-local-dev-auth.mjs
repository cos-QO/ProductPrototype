import pg from 'pg';
import * as argon2 from 'argon2';
const { Pool } = pg;

const DATABASE_URL = "postgresql://postgres:postgres123@localhost:5432/queenone_dev";

// Argon2id configuration (matching server/auth.ts)
const hashingConfig = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16, // 64MB
  timeCost: 3,
  parallelism: 1,
};

async function setupLocalDevAuth() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('=== Setting up Local Developer Authentication ===\n');
    
    const password = 'Dragonunicorn!';
    console.log(`🔐 Hashing password: "${password}"`);
    
    // Hash the password using Argon2id
    const passwordHash = await argon2.hash(password, hashingConfig);
    console.log(`✅ Password hashed successfully`);
    console.log(`   Hash: ${passwordHash.substring(0, 50)}...`);
    
    // Update the local-dev-user with the password hash
    const updateResult = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [passwordHash, 'local-dev-user']
    );
    
    if (updateResult.rows.length === 0) {
      console.log('❌ Failed to update local-dev-user');
      return;
    }
    
    console.log('✅ Local Developer account updated successfully');
    
    // Verify the password works
    console.log('\n🧪 Testing password verification...');
    const isValid = await argon2.verify(passwordHash, password);
    console.log(`✅ Password verification test: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    console.log('\n=== Local Developer Account Summary ===');
    const user = updateResult.rows[0];
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.first_name} ${user.last_name}`);
    console.log(`Role: ${user.role}`);
    console.log(`Password: Set and verified ✅`);
    console.log(`Created: ${user.created_at}`);
    console.log(`Updated: ${user.updated_at}`);
    
    // Check data access
    console.log('\n=== Data Access Verification ===');
    const dataResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM brands WHERE owner_id = 'local-dev-user') as brand_count,
        (SELECT COUNT(*) FROM products p JOIN brands b ON p.brand_id = b.id WHERE b.owner_id = 'local-dev-user') as product_count,
        (SELECT COUNT(*) FROM media_assets m JOIN brands b ON m.brand_id = b.id WHERE b.owner_id = 'local-dev-user') as media_count
    `);
    
    const data = dataResult.rows[0];
    console.log(`✅ Brands accessible: ${data.brand_count}`);
    console.log(`✅ Products accessible: ${data.product_count}`);
    console.log(`✅ Media assets accessible: ${data.media_count}`);
    
  } catch (error) {
    console.error('❌ Setup error:', error);
  } finally {
    await pool.end();
  }
}

setupLocalDevAuth().catch(console.error);