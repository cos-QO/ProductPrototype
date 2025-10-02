-- Performance Insights Data Population Script
-- To be run after 0013_cooing_scourge.sql migration
-- Populates cost_price for existing products and creates default SKU Dial allocations

-- Update cost prices for existing products with realistic values
-- Using 40-70% margin strategy (cost_price = 30-60% of selling price)

UPDATE products 
SET cost_price = CASE 
  -- High-end luxury watches (60-70% margin, 30-40% cost ratio)
  WHEN price >= 200000 THEN ROUND(price * 0.35)  -- 65% margin
  WHEN price >= 100000 THEN ROUND(price * 0.40)  -- 60% margin
  
  -- Mid-range watches (50-60% margin, 40-50% cost ratio)  
  WHEN price >= 50000 THEN ROUND(price * 0.45)   -- 55% margin
  WHEN price >= 25000 THEN ROUND(price * 0.50)   -- 50% margin
  
  -- Entry-level watches (40-50% margin, 50-60% cost ratio)
  WHEN price >= 10000 THEN ROUND(price * 0.55)   -- 45% margin
  WHEN price >= 5000 THEN ROUND(price * 0.60)    -- 40% margin
  
  -- Budget watches (30-40% margin, 60-70% cost ratio)
  ELSE ROUND(price * 0.65)                       -- 35% margin
END
WHERE price IS NOT NULL AND price > 0;

-- Create default SKU Dial allocations for all existing products
-- Using balanced 148-point distribution per category (888/6 = 148)
-- Slight optimization toward performance and profitability for watches

INSERT INTO sku_dial_allocations (
  id,
  product_id, 
  performance_points,
  inventory_points,
  profitability_points,
  demand_points,
  competitive_points,
  trend_points,
  efficiency_rating
)
SELECT 
  gen_random_uuid() as id,
  p.id as product_id,
  -- Performance (Sales metrics) - 160 points (18%)
  160 as performance_points,
  
  -- Inventory (Stock optimization) - 130 points (14.6%)  
  130 as inventory_points,
  
  -- Profitability (Margin focus) - 170 points (19.1%)
  170 as profitability_points,
  
  -- Demand (Customer signals) - 138 points (15.5%) - max allowed
  138 as demand_points,
  
  -- Competitive (Market position) - 95 points (10.7%)
  95 as competitive_points,
  
  -- Trend (Growth trajectory) - 95 points (10.7%)
  95 as trend_points,
  
  -- Efficiency rating based on price tier
  CASE 
    WHEN p.price >= 100000 THEN 'A'  -- Premium products
    WHEN p.price >= 50000 THEN 'B'   -- High-end products  
    WHEN p.price >= 25000 THEN 'B'   -- Mid-range products
    WHEN p.price >= 10000 THEN 'C'   -- Entry products
    ELSE 'C'                         -- Budget products
  END as efficiency_rating
FROM products p
WHERE p.id IS NOT NULL
ON CONFLICT (product_id) DO NOTHING;

-- Verify the allocation totals (should all be 888)
-- SELECT 
--   product_id,
--   (performance_points + inventory_points + profitability_points + 
--    demand_points + competitive_points + trend_points) as total_points
-- FROM sku_dial_allocations 
-- WHERE (performance_points + inventory_points + profitability_points + 
--        demand_points + competitive_points + trend_points) != 888;

-- Update any existing products with zero prices to have minimal cost
UPDATE products 
SET cost_price = 100  -- $1.00 minimum cost
WHERE (price IS NULL OR price = 0) AND cost_price = 0;

-- Ensure all products have at least some cost basis for margin calculation
UPDATE products 
SET cost_price = GREATEST(cost_price, 50)  -- $0.50 minimum cost
WHERE cost_price < 50;