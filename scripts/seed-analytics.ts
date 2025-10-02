import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { productAnalytics } from "../shared/schema";
import { config } from "dotenv";

const { Client } = pg;

config();

async function seedAnalytics() {
  console.log("🌱 Starting analytics data seeding...");

  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://postgres.ozqlcusczxvuhxbhrgdn:postgres123@aws-1-us-east-2.pooler.supabase.com:6543/postgres",
  });

  await client.connect();
  const db = drizzle(client);

  // Product ID 37 - PowerHub 30000 Pro
  const productId = 37;

  // Generate 6 months of analytics data
  const now = new Date();
  const analyticsData = [];

  for (let i = 5; i >= 0; i--) {
    const periodStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    // Create increasingly better metrics over time (growth trend)
    const monthMultiplier = 1 + (5 - i) * 0.1; // 1.0 to 1.5

    analyticsData.push({
      productId,
      buyRate: 0.02 * monthMultiplier + Math.random() * 0.01, // 2-3% growing
      expectedBuyRate: 0.025, // 2.5% target
      returnRate: 0.05 - i * 0.005, // 5% decreasing to 2.5%
      rebuyRate: 0.15 * monthMultiplier, // 15-22.5%
      conversionRate: 0.03 * monthMultiplier, // 3-4.5%
      cartAbandonmentRate: 0.68 - i * 0.02, // 68% decreasing to 58%
      reorderRate: 0.2 * monthMultiplier, // 20-30%
      reviewRate: 0.08 * monthMultiplier, // 8-12%
      revenue: Math.floor(150000 * monthMultiplier + Math.random() * 50000), // $1500-2500
      margin: 0.35 + i * 0.01, // 35-40%
      averageOrderValue: Math.floor(12500 + Math.random() * 2500), // $125-150
      volume: Math.floor(100 * monthMultiplier + Math.random() * 20), // 100-170 units

      // Traffic sources (totaling to realistic numbers)
      trafficAds: Math.floor(500 * monthMultiplier),
      trafficEmails: Math.floor(350 * monthMultiplier),
      trafficText: Math.floor(120 * monthMultiplier),
      trafficStore: Math.floor(180 * monthMultiplier),
      trafficOrganic: Math.floor(800 * monthMultiplier),
      trafficSocial: Math.floor(250 * monthMultiplier),
      trafficDirect: Math.floor(400 * monthMultiplier),
      trafficReferral: Math.floor(150 * monthMultiplier),

      // Session metrics
      trafficSessions: Math.floor(2750 * monthMultiplier),
      pageViews: Math.floor(8250 * monthMultiplier),
      uniqueVisitors: Math.floor(2200 * monthMultiplier),
      bounceRate: 0.45 - i * 0.02, // 45% decreasing to 35%
      avgSessionDuration: 180 + i * 10, // 3-4 minutes

      // Performance scores
      performanceScore: 60 + i * 6, // 60-90
      trendScore: 50 + i * 8, // 50-90
      competitiveScore: 55 + i * 7, // 55-90

      // Metadata
      periodStart: periodStart,
      periodEnd: periodEnd,
      reportingPeriod: "monthly",
      dataQuality: 0.95,
      confidenceLevel: 0.9,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Insert current month's data (partial month)
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  analyticsData.push({
    productId,
    buyRate: 0.032, // 3.2% - best so far
    expectedBuyRate: 0.025,
    returnRate: 0.02, // 2% - lowest
    rebuyRate: 0.25, // 25% - highest
    conversionRate: 0.048, // 4.8%
    cartAbandonmentRate: 0.55, // 55%
    reorderRate: 0.32, // 32%
    reviewRate: 0.14, // 14%
    revenue: 285000, // $2,850
    margin: 0.42, // 42%
    averageOrderValue: 14500, // $145
    volume: 195, // Best month

    // Current month traffic (higher)
    trafficAds: 750,
    trafficEmails: 525,
    trafficText: 180,
    trafficStore: 270,
    trafficOrganic: 1200,
    trafficSocial: 375,
    trafficDirect: 600,
    trafficReferral: 225,

    trafficSessions: 4125,
    pageViews: 13200,
    uniqueVisitors: 3300,
    bounceRate: 0.32,
    avgSessionDuration: 245,

    performanceScore: 92,
    trendScore: 95,
    competitiveScore: 88,

    periodStart: currentMonthStart,
    periodEnd: now,
    reportingPeriod: "monthly",
    dataQuality: 0.98,
    confidenceLevel: 0.95,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  try {
    console.log(
      `📊 Inserting ${analyticsData.length} months of analytics data...`,
    );

    for (const data of analyticsData) {
      await db.insert(productAnalytics).values(data);
      console.log(
        `✅ Added analytics for ${data.periodStart.toISOString().slice(0, 7)}`,
      );
    }

    console.log("🎉 Analytics data seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding analytics:", error);
  } finally {
    await client.end();
  }
}

// Run the seed
seedAnalytics().catch(console.error);
