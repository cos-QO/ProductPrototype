import pg from 'pg';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
const { Pool } = pg;

const DATABASE_URL = "postgresql://postgres:postgres123@localhost:5432/queenone_dev";
const JWT_SECRET = "development-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";

async function testAuthentication() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('=== Authentication Flow Testing ===\n');
    
    // Test 1: Login flow simulation
    console.log('🧪 Test 1: Login Flow Simulation');
    const email = 'dev@localhost';
    const password = 'Dragonunicorn!';
    
    // Find user by email
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`✅ User found: ${user.first_name} ${user.last_name} (${user.email})`);
    
    // Verify password
    const isValidPassword = await argon2.verify(user.password_hash, password);
    console.log(`✅ Password verification: ${isValidPassword ? 'PASSED' : 'FAILED'}`);
    
    if (!isValidPassword) {
      console.log('❌ Authentication failed - stopping test');
      return;
    }
    
    // Test 2: JWT Token Generation
    console.log('\n🧪 Test 2: JWT Token Generation');
    const token = jwt.sign(
      { 
        userId: user.id,
        iat: Date.now(),
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    console.log(`✅ JWT Token generated: ${token.substring(0, 50)}...`);
    
    // Test 3: JWT Token Verification
    console.log('\n🧪 Test 3: JWT Token Verification');
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log(`✅ Token verification: PASSED`);
      console.log(`   - User ID: ${decoded.userId}`);
      console.log(`   - Issued at: ${new Date(decoded.iat)}`);
      console.log(`   - Expires: ${new Date(decoded.exp * 1000)}`);
    } catch (error) {
      console.log(`❌ Token verification: FAILED - ${error.message}`);
    }
    
    // Test 4: Complete Login Response Simulation
    console.log('\n🧪 Test 4: Complete Login Response');
    const { password_hash, ...userWithoutPassword } = user;
    const loginResponse = {
      user: userWithoutPassword,
      token: token
    };
    
    console.log('✅ Login response structure:');
    console.log(JSON.stringify(loginResponse, null, 2));
    
    // Test 5: Data Access with User Context
    console.log('\n🧪 Test 5: Data Access Verification');
    const dataQuery = `
      SELECT 
        b.id, b.name as brand_name,
        COUNT(p.id) as product_count
      FROM brands b 
      LEFT JOIN products p ON b.id = p.brand_id 
      WHERE b.owner_id = $1
      GROUP BY b.id, b.name
      ORDER BY b.name
    `;
    
    const dataResult = await pool.query(dataQuery, [user.id]);
    console.log(`✅ Accessible brands for ${user.first_name}:`);
    dataResult.rows.forEach(brand => {
      console.log(`   - ${brand.brand_name}: ${brand.product_count} products`);
    });
    
    // Test 6: Authentication Middleware Simulation
    console.log('\n🧪 Test 6: Auth Middleware Simulation');
    
    // Simulate extracting token from Authorization header
    const authHeader = `Bearer ${token}`;
    const extractedToken = authHeader.replace('Bearer ', '');
    console.log(`✅ Token extracted from header: ${extractedToken === token ? 'PASSED' : 'FAILED'}`);
    
    // Simulate token verification in middleware
    const decodedInMiddleware = jwt.verify(extractedToken, JWT_SECRET);
    console.log(`✅ Middleware token verification: PASSED`);
    
    // Simulate user lookup in middleware
    const middlewareUserResult = await pool.query('SELECT * FROM users WHERE id = $1', [decodedInMiddleware.userId]);
    const middlewareUser = middlewareUserResult.rows[0];
    const { password_hash: _, ...middlewareUserWithoutPassword } = middlewareUser;
    
    console.log(`✅ Middleware user lookup: PASSED`);
    console.log(`   - User: ${middlewareUser.first_name} ${middlewareUser.last_name}`);
    console.log(`   - Role: ${middlewareUser.role}`);
    
    console.log('\n🎉 ALL AUTHENTICATION TESTS PASSED!');
    
  } catch (error) {
    console.error('❌ Authentication test error:', error);
  } finally {
    await pool.end();
  }
}

testAuthentication().catch(console.error);