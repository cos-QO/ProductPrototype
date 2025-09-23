async function testImportCorruption() {
  try {
    console.log('Testing import service for URL corruption...');
    
    // Test CSV data with placeholder URLs
    const csvData = `name,slug,description,logo_url
Test Import Brand 1,test-import-1,First test brand,https://via.placeholder.com/200x200?text=Import1
Test Import Brand 2,test-import-2,Second test brand,https://via.placeholder.com/200x200?text=Import2`;
    
    console.log('\nOriginal CSV data:');
    console.log(csvData);
    
    // Test the CSV parsing directly
    const { parse } = await import('csv-parse/sync');
    
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: false,  // Disable auto-casting to prevent date conversion issues
      cast_date: false
    });
    
    console.log('\nParsed CSV records:');
    records.forEach((record, index) => {
      console.log(`Record ${index + 1}:`, record);
      console.log(`  logo_url: "${record.logo_url}"`);
    });
    
    // Test the brand data transformation from import service
    records.forEach((row, index) => {
      const brandData = {
        name: row.name,
        slug: row.slug.toLowerCase().replace(/\s+/g, '-'),
        description: row.description || null,
        story: row.story || null,
        category: row.category || null,
        logoUrl: row.logo_url || row.logoUrl || null,
        ownerId: row.owner_id || row.ownerId || null,
        isActive: row.is_active !== undefined ? row.is_active : true
      };
      
      console.log(`\nTransformed brand data ${index + 1}:`);
      console.log(`  logoUrl: "${brandData.logoUrl}"`);
      
      if (brandData.logoUrl !== row.logo_url) {
        console.log('  ⚠️  URL corruption in transformation!');
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testImportCorruption();