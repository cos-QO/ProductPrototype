-- SQL Script to Insert Analytics Data for PowerHub 30000 Pro (Product ID 37)
-- FIXED VERSION - Matches actual database schema
-- Run this directly in Supabase SQL Editor

-- Delete existing analytics for product 37 first (optional)
DELETE FROM product_analytics WHERE product_id = 37;

-- Insert 7 months of analytics data
-- Note: Using actual column names from the schema
INSERT INTO product_analytics (
  product_id, 
  buy_rate, expected_buy_rate, return_rate, rebuy_rate,
  conversion_rate, cart_abandonment_rate, reorder_rate, review_rate,
  revenue, margin, average_order_value, volume,
  traffic_ads, traffic_emails, traffic_text, traffic_store,
  traffic_organic, traffic_social, traffic_direct, traffic_referral,
  total_views, unique_visitors,
  performance_score, trend_score, competitive_score,
  period_start, period_end, reporting_period, 
  data_quality, confidence_level,
  created_at, updated_at
) VALUES
-- April 2025
(37, 0.025, 0.025, 0.045, 0.15, 0.03, 0.66, 0.20, 0.08,
 175000, 0.36, 13500, 110,
 500, 350, 120, 180, 800, 250, 400, 150,
 8250, 2200,
 66, 58, 62,
 '2025-04-01', '2025-04-30', 'monthly', 0.95, 0.90,
 NOW(), NOW()),

-- May 2025
(37, 0.027, 0.025, 0.040, 0.17, 0.033, 0.64, 0.22, 0.09,
 195000, 0.37, 13750, 125,
 550, 385, 132, 198, 880, 275, 440, 165,
 9075, 2420,
 72, 66, 69,
 '2025-05-01', '2025-05-31', 'monthly', 0.95, 0.90,
 NOW(), NOW()),

-- June 2025
(37, 0.029, 0.025, 0.035, 0.19, 0.036, 0.62, 0.24, 0.10,
 215000, 0.38, 14000, 140,
 600, 420, 144, 216, 960, 300, 480, 180,
 9900, 2640,
 78, 74, 76,
 '2025-06-01', '2025-06-30', 'monthly', 0.95, 0.90,
 NOW(), NOW()),

-- July 2025
(37, 0.030, 0.025, 0.030, 0.21, 0.039, 0.60, 0.26, 0.11,
 235000, 0.39, 14250, 155,
 650, 455, 156, 234, 1040, 325, 520, 195,
 10725, 2860,
 84, 82, 83,
 '2025-07-01', '2025-07-31', 'monthly', 0.95, 0.90,
 NOW(), NOW()),

-- August 2025  
(37, 0.031, 0.025, 0.025, 0.23, 0.042, 0.58, 0.28, 0.12,
 255000, 0.40, 14500, 170,
 700, 490, 168, 252, 1120, 350, 560, 210,
 11550, 3080,
 90, 90, 90,
 '2025-08-01', '2025-08-31', 'monthly', 0.95, 0.90,
 NOW(), NOW()),

-- September 2025
(37, 0.032, 0.025, 0.020, 0.25, 0.045, 0.56, 0.30, 0.13,
 275000, 0.41, 14750, 185,
 750, 525, 180, 270, 1200, 375, 600, 225,
 12375, 3300,
 96, 98, 97,
 '2025-09-01', '2025-09-30', 'monthly', 0.95, 0.90,
 NOW(), NOW()),

-- October 2025 (current month, partial data)
(37, 0.032, 0.025, 0.020, 0.25, 0.048, 0.55, 0.32, 0.14,
 285000, 0.42, 14500, 195,
 750, 525, 180, 270, 1200, 375, 600, 225,
 13200, 3300,
 92, 95, 88,
 '2025-10-01', '2025-10-02', 'monthly', 0.98, 0.95,
 NOW(), NOW());

-- Verify the data was inserted
SELECT 
  product_id,
  to_char(period_start, 'Mon YYYY') as month,
  ROUND(buy_rate * 100, 2) as buy_rate_pct,
  ROUND(expected_buy_rate * 100, 2) as expected_rate_pct,
  ROUND(revenue / 100.0, 2) as revenue_dollars,
  volume as units_sold,
  traffic_ads + traffic_emails + traffic_text + traffic_store + 
  traffic_organic + traffic_social + traffic_direct + traffic_referral as total_traffic,
  performance_score
FROM product_analytics 
WHERE product_id = 37
ORDER BY period_start DESC;

-- Additional check to see column totals
SELECT 
  COUNT(*) as records,
  SUM(revenue) / 100.0 as total_revenue_dollars,
  SUM(volume) as total_units,
  AVG(buy_rate * 100) as avg_buy_rate_pct,
  MAX(performance_score) as best_performance
FROM product_analytics
WHERE product_id = 37;