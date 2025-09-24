import { storage } from './server/storage.ts';

async function testImageCorruption() {
  try {
    console.log('Testing brand image URL corruption scenario...');
    
    // Test 1: Create a brand with a placeholder URL
    const testBrand = {
      name: 'Test Corruption Brand',
      slug: 'test-corruption-brand',
      description: 'Testing URL corruption',
      logoUrl: 'https://via.placeholder.com/200x200?text=TestBrand'
    };
    
    console.log('\n1. Creating brand with logoUrl:', testBrand.logoUrl);
    const createdBrand = await storage.createBrand(testBrand);
    console.log('   Created brand logoUrl:', createdBrand.logoUrl);
    
    // Test 2: Retrieve the brand to see if URL persists
    console.log('\n2. Retrieving brand from database...');
    const retrievedBrand = await storage.getBrand(createdBrand.id);
    console.log('   Retrieved brand logoUrl:', retrievedBrand.logoUrl);
    
    // Test 3: Check for any corruption
    if (retrievedBrand.logoUrl !== testBrand.logoUrl) {
      console.log('   ⚠️  URL CORRUPTION DETECTED!');
      console.log('   Original:', testBrand.logoUrl);
      console.log('   Corrupted:', retrievedBrand.logoUrl);
    } else {
      console.log('   ✅ URL preserved correctly');
    }
    
    // Test 4: Try updating the brand
    console.log('\n3. Testing brand update...');
    const updatedBrand = await storage.updateBrand(createdBrand.id, {
      logoUrl: 'https://via.placeholder.com/200x200?text=UpdatedBrand'
    });
    console.log('   Updated brand logoUrl:', updatedBrand.logoUrl);
    
    // Cleanup
    await storage.deleteBrand(createdBrand.id);
    console.log('\n4. Test brand cleaned up');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testImageCorruption();