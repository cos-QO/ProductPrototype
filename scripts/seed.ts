import { db } from "../server/db";
import {
  users,
  brands,
  products,
  mediaAssets,
  syndicationChannels,
  syndicationLogs,
  productAnalytics,
} from "../shared/schema";
import { hashPassword } from "../server/auth";
import { mockData } from "../server/mock-database";

async function seed() {
  console.log("🌱 Starting database seeding...");

  try {
    // Check if we're using real PostgreSQL
    const isRealDB = true;

    if (false) {
      console.warn("⚠️  Using mock database - skipping seed");
      return;
    }

    console.log("Creating users...");
    // Create test users
    const testUsers = [
      {
        id: "user-brand-owner-1",
        email: "owner@queenone.com",
        passwordHash: await hashPassword("password123"),
        firstName: "Brand",
        lastName: "Owner",
        role: "brand_owner",
      },
      {
        id: "user-retailer-1",
        email: "retailer@queenone.com",
        passwordHash: await hashPassword("password123"),
        firstName: "Retail",
        lastName: "Partner",
        role: "retailer",
      },
      {
        id: "user-content-1",
        email: "content@queenone.com",
        passwordHash: await hashPassword("password123"),
        firstName: "Content",
        lastName: "Team",
        role: "content_team",
      },
    ];

    for (const user of testUsers) {
      await db.insert(users).values(user).onConflictDoNothing();
    }

    console.log("Creating brands...");
    // Create sample brands
    const sampleBrands = [
      {
        name: "Kerouac Watches",
        slug: "kerouac-watches",
        description: "Luxury timepieces inspired by the spirit of adventure",
        story:
          "Founded in 1957, Kerouac Watches embodies the free spirit of exploration and the precision of Swiss craftsmanship. Each timepiece tells a story of journeys taken and adventures yet to come.",
        category: "Luxury Watches",
        logoUrl: "https://via.placeholder.com/200x200?text=Kerouac",
        ownerId: "user-brand-owner-1",
        isActive: true,
      },
      {
        name: "Aurora Cosmetics",
        slug: "aurora-cosmetics",
        description: "Natural beauty products for the modern woman",
        story:
          "Aurora Cosmetics believes in enhancing natural beauty with sustainable, cruelty-free products sourced from the finest ingredients around the world.",
        category: "Beauty & Personal Care",
        logoUrl: "https://via.placeholder.com/200x200?text=Aurora",
        ownerId: "user-brand-owner-1",
        isActive: true,
      },
      {
        name: "TechFlow Electronics",
        slug: "techflow-electronics",
        description: "Innovative gadgets for the digital age",
        story:
          "TechFlow brings cutting-edge technology to everyday life, making advanced electronics accessible and intuitive for everyone.",
        category: "Electronics",
        logoUrl: "https://via.placeholder.com/200x200?text=TechFlow",
        ownerId: "user-brand-owner-1",
        isActive: true,
      },
    ];

    const insertedBrands = [];
    for (const brand of sampleBrands) {
      const [inserted] = await db
        .insert(brands)
        .values(brand)
        .onConflictDoUpdate({
          target: brands.slug,
          set: { updatedAt: new Date() },
        })
        .returning();
      insertedBrands.push(inserted);
    }

    console.log("Creating products...");
    // Create sample products
    const sampleProducts = [
      // Kerouac Watches products
      {
        name: "Explorer Classic",
        slug: "explorer-classic",
        shortDescription: "Timeless elegance meets rugged durability",
        longDescription:
          "The Explorer Classic combines Swiss precision with American adventure spirit. Featuring a 42mm stainless steel case, sapphire crystal, and water resistance to 200m.",
        story:
          "Inspired by cross-country journeys and the open road, the Explorer Classic was designed for those who seek adventure without compromising on style.",
        brandId: insertedBrands[0].id,
        sku: "KW-EXP-001",
        gtin: "1234567890123",
        status: "active",
        price: 249999, // $2,499.99 in cents
        compareAtPrice: 299999, // $2,999.99 in cents
        stock: 25,
        lowStockThreshold: 5,
      },
      {
        name: "Dharma Chronograph",
        slug: "dharma-chronograph",
        shortDescription: "Precision timing for the modern explorer",
        longDescription:
          "The Dharma Chronograph features multiple complications including a tachymeter, 24-hour display, and precision chronograph movement.",
        story:
          'Named after Kerouac\'s "Dharma Bums", this watch celebrates the philosophical journey as much as the physical one.',
        brandId: insertedBrands[0].id,
        sku: "KW-DHR-001",
        gtin: "1234567890124",
        status: "active",
        price: 349999, // $3,499.99 in cents
        compareAtPrice: 399999, // $3,999.99 in cents
        stock: 15,
        lowStockThreshold: 3,
      },
      {
        name: "Beat Generation Limited",
        slug: "beat-generation-limited",
        shortDescription: "Limited edition tribute to the Beat Generation",
        longDescription:
          "Only 100 pieces worldwide, each individually numbered. Features a unique dial design inspired by 1950s typography and jazz culture.",
        story:
          "Celebrating the literary movement that changed America, this limited edition piece is a collector's dream.",
        brandId: insertedBrands[0].id,
        sku: "KW-BGL-001",
        gtin: "1234567890125",
        status: "active",
        price: 599999, // $5,999.99 in cents
        stock: 3,
        lowStockThreshold: 1,
      },
      // Aurora Cosmetics products
      {
        name: "Glow Serum",
        slug: "glow-serum",
        shortDescription: "Vitamin C brightening serum",
        longDescription:
          "Our signature Glow Serum combines vitamin C with hyaluronic acid for intense hydration and brightening. Suitable for all skin types.",
        story:
          "Developed over 2 years of research with dermatologists, this serum represents the pinnacle of skincare science.",
        brandId: insertedBrands[1].id,
        sku: "AC-GLS-001",
        gtin: "2234567890123",
        status: "active",
        price: 6800, // $68.00 in cents
        compareAtPrice: 8500, // $85.00 in cents
        stock: 150,
        lowStockThreshold: 20,
      },
      {
        name: "Hydra Moisturizer",
        slug: "hydra-moisturizer",
        shortDescription: "24-hour hydration cream",
        longDescription:
          "Deep hydration without the heavy feel. Our lightweight formula absorbs quickly while providing all-day moisture.",
        story:
          "Inspired by Nordic skincare rituals, this moisturizer brings spa-quality hydration to your daily routine.",
        brandId: insertedBrands[1].id,
        sku: "AC-HYD-001",
        gtin: "2234567890124",
        status: "active",
        price: 5200, // $52.00 in cents
        compareAtPrice: 6500, // $65.00 in cents
        stock: 200,
        lowStockThreshold: 30,
      },
      // TechFlow Electronics products
      {
        name: "AirFlow Pro Earbuds",
        slug: "airflow-pro-earbuds",
        shortDescription: "Premium wireless earbuds with ANC",
        longDescription:
          "Experience crystal-clear audio with active noise cancellation, 30-hour battery life, and premium comfort.",
        story:
          "Engineered for audiophiles who demand the best in wireless audio technology.",
        brandId: insertedBrands[2].id,
        sku: "TF-AFP-001",
        gtin: "3234567890123",
        status: "active",
        price: 24999, // $249.99 in cents
        compareAtPrice: 29999, // $299.99 in cents
        stock: 75,
        lowStockThreshold: 10,
      },
      {
        name: "PowerHub 10000",
        slug: "powerhub-10000",
        shortDescription: "Ultra-fast charging power bank",
        longDescription:
          "10000mAh capacity with 65W fast charging. Charge multiple devices simultaneously with intelligent power distribution.",
        story:
          "Never run out of power again. Designed for the modern professional who needs reliable power on the go.",
        brandId: insertedBrands[2].id,
        sku: "TF-PH1-001",
        gtin: "3234567890124",
        status: "active",
        price: 7999, // $79.99 in cents
        compareAtPrice: 9999, // $99.99 in cents
        stock: 120,
        lowStockThreshold: 15,
      },
    ];

    const insertedProducts = [];
    for (const product of sampleProducts) {
      const [inserted] = await db
        .insert(products)
        .values(product)
        .onConflictDoUpdate({
          target: products.slug,
          set: { updatedAt: new Date() },
        })
        .returning();
      insertedProducts.push(inserted);
    }

    console.log("Creating sample media assets...");
    // Create sample media assets
    for (const product of insertedProducts.slice(0, 3)) {
      await db
        .insert(mediaAssets)
        .values({
          fileName: `${product.slug}-hero.jpg`,
          originalName: `${product.name} Hero Image`,
          mimeType: "image/jpeg",
          fileSize: 500000,
          url: `https://via.placeholder.com/800x600?text=${encodeURIComponent(product.name)}`,
          assetType: "hero",
          productId: product.id,
          uploadedBy: "user-brand-owner-1",
        })
        .onConflictDoNothing();
    }

    console.log("Creating syndication channels...");
    // Create syndication channels first
    const insertedChannels = await db
      .insert(syndicationChannels)
      .values([
        {
          name: "Amazon Marketplace",
          slug: "amazon-marketplace",
          type: "marketplace",
          endpoint: "https://api.amazon.com/v1",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "Shopify Store",
          slug: "shopify-store",
          type: "ecommerce",
          endpoint: "https://api.shopify.com/v1",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "POS System",
          slug: "pos-system",
          type: "pos",
          endpoint: "https://api.pos.com/v1",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "CSV Export",
          slug: "csv-export",
          type: "export",
          endpoint: "https://api.export.com/v1",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      .returning()
      .onConflictDoNothing();

    console.log("Creating sample syndication logs...");
    // Create sample syndication logs for today
    const today = new Date();
    if (insertedChannels.length > 0) {
      for (let i = 0; i < 3; i++) {
        await db
          .insert(syndicationLogs)
          .values({
            productId: insertedProducts[i].id,
            channelId: insertedChannels[0].id,
            action: i === 0 ? "create" : "update",
            endpoint: "/api/external/sync",
            method: "POST",
            status: 200,
            responseTime: Math.floor(Math.random() * 500) + 100,
            createdAt: today,
          })
          .onConflictDoNothing();
      }
    }

    console.log("Creating analytics data...");
    // Generate comprehensive analytics data for all products
    const generateAnalyticsSeedData = (productIds: number[]) => {
      const periods = [
        { start: "2024-01-01", end: "2024-01-31", period: "monthly" },
        { start: "2024-02-01", end: "2024-02-29", period: "monthly" },
        { start: "2024-03-01", end: "2024-03-31", period: "monthly" },
        { start: "2024-04-01", end: "2024-04-30", period: "monthly" },
        { start: "2024-05-01", end: "2024-05-31", period: "monthly" },
        { start: "2024-06-01", end: "2024-06-30", period: "monthly" },
        { start: "2024-07-01", end: "2024-07-31", period: "monthly" },
        { start: "2024-08-01", end: "2024-08-31", period: "monthly" },
        { start: "2024-09-01", end: "2024-09-30", period: "monthly" },
      ];

      const seedData = [];

      productIds.forEach((productId, productIndex) => {
        periods.forEach((period, index) => {
          // Create realistic trending data with some randomness
          const trendMultiplier = 1 + index * 0.08; // 8% improvement each month
          const basePerformance = 45 + Math.random() * 30 + productIndex * 5; // 45-80 base score
          const seasonalFactor = 1 + Math.sin(index * 0.5) * 0.2; // Seasonal variation

          seedData.push({
            productId,
            buyRate: Math.min(
              0.15,
              (0.02 + Math.random() * 0.06) * trendMultiplier * seasonalFactor,
            ),
            expectedBuyRate: 0.04 + Math.random() * 0.04,
            revenue: Math.floor(
              (30000 + Math.random() * 180000) *
                trendMultiplier *
                seasonalFactor,
            ),
            margin: 0.12 + Math.random() * 0.38, // 12-50% margin
            volume: Math.floor(
              (15 + Math.random() * 70) * trendMultiplier * seasonalFactor,
            ),
            totalViews: Math.floor(
              (800 + Math.random() * 4200) * trendMultiplier * seasonalFactor,
            ),
            uniqueVisitors: Math.floor(
              (600 + Math.random() * 2500) * trendMultiplier * seasonalFactor,
            ),

            // Traffic distribution with realistic patterns
            trafficAds: Math.floor(
              Math.random() * 800 * trendMultiplier * seasonalFactor,
            ),
            trafficEmails: Math.floor(
              Math.random() * 600 * trendMultiplier * seasonalFactor,
            ),
            trafficText: Math.floor(
              Math.random() * 250 * trendMultiplier * seasonalFactor,
            ),
            trafficStore: Math.floor(
              Math.random() * 150 * trendMultiplier * seasonalFactor,
            ),
            trafficOrganic: Math.floor(
              Math.random() * 1500 * trendMultiplier * seasonalFactor,
            ),
            trafficSocial: Math.floor(
              Math.random() * 450 * trendMultiplier * seasonalFactor,
            ),
            trafficDirect: Math.floor(
              Math.random() * 700 * trendMultiplier * seasonalFactor,
            ),
            trafficReferral: Math.floor(
              Math.random() * 300 * trendMultiplier * seasonalFactor,
            ),

            // Customer behavior with realistic rates
            returnRate: Math.max(0, 0.025 - Math.random() * 0.02), // 0-2.5%
            reorderRate: 0.12 + Math.random() * 0.28, // 12-40%
            reviewRate: 0.2 + Math.random() * 0.4, // 20-60%
            rebuyRate: 0.08 + Math.random() * 0.32, // 8-40%

            conversionRate: Math.min(
              0.12,
              (0.02 + Math.random() * 0.06) * trendMultiplier * seasonalFactor,
            ),
            averageOrderValue: Math.floor(
              (6000 + Math.random() * 12000) * trendMultiplier,
            ),
            cartAbandonmentRate: Math.max(0.4, 0.8 - Math.random() * 0.35),

            // Performance scores with upward trend and product variation
            performanceScore: Math.min(
              100,
              Math.floor(
                (basePerformance + productIndex * 2) * trendMultiplier,
              ),
            ),
            trendScore: Math.min(
              100,
              Math.floor(
                (basePerformance + 8 + productIndex * 3) * trendMultiplier,
              ),
            ),
            competitiveScore: Math.min(
              100,
              Math.floor(
                (basePerformance - 3 + productIndex) * trendMultiplier,
              ),
            ),

            periodStart: new Date(period.start),
            periodEnd: new Date(period.end),
            reportingPeriod: period.period,

            dataQuality: 0.8 + Math.random() * 0.2, // 80-100%
            confidenceLevel: 0.85 + Math.random() * 0.15, // 85-100%
          });
        });
      });

      return seedData;
    };

    // Generate analytics for all inserted products
    const productIds = insertedProducts.map((p) => p.id);
    const analyticsData = generateAnalyticsSeedData(productIds);

    // Insert analytics data in batches
    const batchSize = 50;
    for (let i = 0; i < analyticsData.length; i += batchSize) {
      const batch = analyticsData.slice(i, i + batchSize);
      await db.insert(productAnalytics).values(batch).onConflictDoNothing();
    }

    console.log("✅ Database seeding completed!");
    console.log(`
    Created:
    - ${testUsers.length} users
    - ${insertedBrands.length} brands (including Kerouac Watches)
    - ${insertedProducts.length} products
    - ${analyticsData.length} analytics records (9 months per product)
    - Sample media assets
    - Sample syndication logs
    
    You can now login with:
    - owner@queenone.com / password123 (Brand Owner)
    - retailer@queenone.com / password123 (Retailer)
    - content@queenone.com / password123 (Content Team)
    `);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the seed function
seed();
