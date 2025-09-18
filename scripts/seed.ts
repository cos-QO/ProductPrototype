import { db } from '../server/db';
import { users, brands, products, mediaAssets, syndicationChannels, syndicationLogs } from '../shared/schema';
import { hashPassword } from '../server/auth';
import { mockData } from '../server/mock-database';

async function seed() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Check if we're using real PostgreSQL
    const isRealDB = true;
    
    if (false) {
      console.warn('⚠️  Using mock database - skipping seed');
      return;
    }
    
    console.log('Creating users...');
    // Create test users
    const testUsers = [
      {
        id: 'user-brand-owner-1',
        email: 'owner@queenone.com',
        passwordHash: await hashPassword('password123'),
        firstName: 'Brand',
        lastName: 'Owner',
        role: 'brand_owner'
      },
      {
        id: 'user-retailer-1',
        email: 'retailer@queenone.com',
        passwordHash: await hashPassword('password123'),
        firstName: 'Retail',
        lastName: 'Partner',
        role: 'retailer'
      },
      {
        id: 'user-content-1',
        email: 'content@queenone.com',
        passwordHash: await hashPassword('password123'),
        firstName: 'Content',
        lastName: 'Team',
        role: 'content_team'
      }
    ];
    
    for (const user of testUsers) {
      await db.insert(users)
        .values(user)
        .onConflictDoNothing();
    }
    
    console.log('Creating brands...');
    // Create sample brands
    const sampleBrands = [
      {
        name: 'Kerouac Watches',
        slug: 'kerouac-watches',
        description: 'Luxury timepieces inspired by the spirit of adventure',
        story: 'Founded in 1957, Kerouac Watches embodies the free spirit of exploration and the precision of Swiss craftsmanship. Each timepiece tells a story of journeys taken and adventures yet to come.',
        category: 'Luxury Watches',
        logoUrl: 'https://via.placeholder.com/200x200?text=Kerouac',
        ownerId: 'user-brand-owner-1',
        isActive: true
      },
      {
        name: 'Aurora Cosmetics',
        slug: 'aurora-cosmetics',
        description: 'Natural beauty products for the modern woman',
        story: 'Aurora Cosmetics believes in enhancing natural beauty with sustainable, cruelty-free products sourced from the finest ingredients around the world.',
        category: 'Beauty & Personal Care',
        logoUrl: 'https://via.placeholder.com/200x200?text=Aurora',
        ownerId: 'user-brand-owner-1',
        isActive: true
      },
      {
        name: 'TechFlow Electronics',
        slug: 'techflow-electronics',
        description: 'Innovative gadgets for the digital age',
        story: 'TechFlow brings cutting-edge technology to everyday life, making advanced electronics accessible and intuitive for everyone.',
        category: 'Electronics',
        logoUrl: 'https://via.placeholder.com/200x200?text=TechFlow',
        ownerId: 'user-brand-owner-1',
        isActive: true
      }
    ];
    
    const insertedBrands = [];
    for (const brand of sampleBrands) {
      const [inserted] = await db.insert(brands)
        .values(brand)
        .onConflictDoUpdate({
          target: brands.slug,
          set: { updatedAt: new Date() }
        })
        .returning();
      insertedBrands.push(inserted);
    }
    
    console.log('Creating products...');
    // Create sample products
    const sampleProducts = [
      // Kerouac Watches products
      {
        name: 'Explorer Classic',
        slug: 'explorer-classic',
        shortDescription: 'Timeless elegance meets rugged durability',
        longDescription: 'The Explorer Classic combines Swiss precision with American adventure spirit. Featuring a 42mm stainless steel case, sapphire crystal, and water resistance to 200m.',
        story: 'Inspired by cross-country journeys and the open road, the Explorer Classic was designed for those who seek adventure without compromising on style.',
        brandId: insertedBrands[0].id,
        sku: 'KW-EXP-001',
        gtin: '1234567890123',
        status: 'active',
        price: 249999, // $2,499.99 in cents
        compareAtPrice: 299999, // $2,999.99 in cents
        stock: 25,
        lowStockThreshold: 5
      },
      {
        name: 'Dharma Chronograph',
        slug: 'dharma-chronograph',
        shortDescription: 'Precision timing for the modern explorer',
        longDescription: 'The Dharma Chronograph features multiple complications including a tachymeter, 24-hour display, and precision chronograph movement.',
        story: 'Named after Kerouac\'s "Dharma Bums", this watch celebrates the philosophical journey as much as the physical one.',
        brandId: insertedBrands[0].id,
        sku: 'KW-DHR-001',
        gtin: '1234567890124',
        status: 'active',
        price: 349999, // $3,499.99 in cents
        compareAtPrice: 399999, // $3,999.99 in cents
        stock: 15,
        lowStockThreshold: 3
      },
      {
        name: 'Beat Generation Limited',
        slug: 'beat-generation-limited',
        shortDescription: 'Limited edition tribute to the Beat Generation',
        longDescription: 'Only 100 pieces worldwide, each individually numbered. Features a unique dial design inspired by 1950s typography and jazz culture.',
        story: 'Celebrating the literary movement that changed America, this limited edition piece is a collector\'s dream.',
        brandId: insertedBrands[0].id,
        sku: 'KW-BGL-001',
        gtin: '1234567890125',
        status: 'active',
        price: 599999, // $5,999.99 in cents
        stock: 3,
        lowStockThreshold: 1
      },
      // Aurora Cosmetics products
      {
        name: 'Glow Serum',
        slug: 'glow-serum',
        shortDescription: 'Vitamin C brightening serum',
        longDescription: 'Our signature Glow Serum combines vitamin C with hyaluronic acid for intense hydration and brightening. Suitable for all skin types.',
        story: 'Developed over 2 years of research with dermatologists, this serum represents the pinnacle of skincare science.',
        brandId: insertedBrands[1].id,
        sku: 'AC-GLS-001',
        gtin: '2234567890123',
        status: 'active',
        price: 6800, // $68.00 in cents
        compareAtPrice: 8500, // $85.00 in cents
        stock: 150,
        lowStockThreshold: 20
      },
      {
        name: 'Hydra Moisturizer',
        slug: 'hydra-moisturizer',
        shortDescription: '24-hour hydration cream',
        longDescription: 'Deep hydration without the heavy feel. Our lightweight formula absorbs quickly while providing all-day moisture.',
        story: 'Inspired by Nordic skincare rituals, this moisturizer brings spa-quality hydration to your daily routine.',
        brandId: insertedBrands[1].id,
        sku: 'AC-HYD-001',
        gtin: '2234567890124',
        status: 'active',
        price: 5200, // $52.00 in cents
        compareAtPrice: 6500, // $65.00 in cents
        stock: 200,
        lowStockThreshold: 30
      },
      // TechFlow Electronics products
      {
        name: 'AirFlow Pro Earbuds',
        slug: 'airflow-pro-earbuds',
        shortDescription: 'Premium wireless earbuds with ANC',
        longDescription: 'Experience crystal-clear audio with active noise cancellation, 30-hour battery life, and premium comfort.',
        story: 'Engineered for audiophiles who demand the best in wireless audio technology.',
        brandId: insertedBrands[2].id,
        sku: 'TF-AFP-001',
        gtin: '3234567890123',
        status: 'active',
        price: 24999, // $249.99 in cents
        compareAtPrice: 29999, // $299.99 in cents
        stock: 75,
        lowStockThreshold: 10
      },
      {
        name: 'PowerHub 10000',
        slug: 'powerhub-10000',
        shortDescription: 'Ultra-fast charging power bank',
        longDescription: '10000mAh capacity with 65W fast charging. Charge multiple devices simultaneously with intelligent power distribution.',
        story: 'Never run out of power again. Designed for the modern professional who needs reliable power on the go.',
        brandId: insertedBrands[2].id,
        sku: 'TF-PH1-001',
        gtin: '3234567890124',
        status: 'active',
        price: 7999, // $79.99 in cents
        compareAtPrice: 9999, // $99.99 in cents
        stock: 120,
        lowStockThreshold: 15
      }
    ];
    
    const insertedProducts = [];
    for (const product of sampleProducts) {
      const [inserted] = await db.insert(products)
        .values(product)
        .onConflictDoUpdate({
          target: products.slug,
          set: { updatedAt: new Date() }
        })
        .returning();
      insertedProducts.push(inserted);
    }
    
    console.log('Creating sample media assets...');
    // Create sample media assets
    for (const product of insertedProducts.slice(0, 3)) {
      await db.insert(mediaAssets)
        .values({
          fileName: `${product.slug}-hero.jpg`,
          originalName: `${product.name} Hero Image`,
          mimeType: 'image/jpeg',
          fileSize: 500000,
          url: `https://via.placeholder.com/800x600?text=${encodeURIComponent(product.name)}`,
          assetType: 'hero',
          productId: product.id,
          uploadedBy: 'user-brand-owner-1'
        })
        .onConflictDoNothing();
    }
    
    console.log('Creating syndication channels...');
    // Create syndication channels first
    const insertedChannels = await db.insert(syndicationChannels)
      .values([
        {
          name: 'Amazon Marketplace',
          slug: 'amazon-marketplace',
          type: 'marketplace',
          endpoint: 'https://api.amazon.com/v1',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Shopify Store',
          slug: 'shopify-store',
          type: 'ecommerce',
          endpoint: 'https://api.shopify.com/v1',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ])
      .returning()
      .onConflictDoNothing();
    
    console.log('Creating sample syndication logs...');
    // Create sample syndication logs for today
    const today = new Date();
    if (insertedChannels.length > 0) {
      for (let i = 0; i < 3; i++) {
        await db.insert(syndicationLogs)
          .values({
            productId: insertedProducts[i].id,
            channelId: insertedChannels[0].id,
            action: i === 0 ? 'create' : 'update',
            endpoint: '/api/external/sync',
            method: 'POST',
            status: 200,
            responseTime: Math.floor(Math.random() * 500) + 100,
            createdAt: today
          })
          .onConflictDoNothing();
      }
    }
    
    console.log('✅ Database seeding completed!');
    console.log(`
    Created:
    - ${testUsers.length} users
    - ${insertedBrands.length} brands (including Kerouac Watches)
    - ${insertedProducts.length} products
    - Sample media assets
    - Sample syndication logs
    
    You can now login with:
    - owner@queenone.com / password123 (Brand Owner)
    - retailer@queenone.com / password123 (Retailer)
    - content@queenone.com / password123 (Content Team)
    `);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the seed function
seed();