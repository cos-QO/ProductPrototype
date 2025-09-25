import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = "postgresql://postgres:postgres123@localhost:5432/queenone_dev";

async function analyzeDatabase() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('=== Database Analysis ===\n');
    
    // Check users
    console.log('=== Current Users ===');
    const usersResult = await pool.query('SELECT * FROM users ORDER BY created_at');
    console.log(`Found ${usersResult.rows.length} users:`);
    usersResult.rows.forEach(user => {
      console.log(`- ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Name: ${user.first_name} ${user.last_name}`);
    });
    
    console.log('\n=== Current Brands ===');
    const brandsResult = await pool.query('SELECT * FROM brands ORDER BY created_at');
    console.log(`Found ${brandsResult.rows.length} brands:`);
    brandsResult.rows.forEach(brand => {
      console.log(`- ID: ${brand.id}, Name: ${brand.name}, Owner: ${brand.owner_id}, Active: ${brand.is_active}`);
    });
    
    console.log('\n=== Products Count by Brand ===');
    const productCountResult = await pool.query(`
      SELECT b.name as brand_name, b.owner_id, COUNT(p.id) as product_count 
      FROM brands b 
      LEFT JOIN products p ON b.id = p.brand_id 
      GROUP BY b.id, b.name, b.owner_id 
      ORDER BY product_count DESC
    `);
    console.log(`Brand breakdown:`);
    productCountResult.rows.forEach(row => {
      console.log(`- ${row.brand_name} (Owner: ${row.owner_id}): ${row.product_count} products`);
    });
    
    const totalProductsResult = await pool.query('SELECT COUNT(*) as total FROM products');
    console.log(`\nTotal products: ${totalProductsResult.rows[0].total}`);
    
  } catch (error) {
    console.error('Database analysis error:', error);
  } finally {
    await pool.end();
  }
}

analyzeDatabase().catch(console.error);