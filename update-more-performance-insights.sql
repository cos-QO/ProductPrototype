-- Update Performance Insights for popular products (IDs 1-10)
-- This ensures users can see the data on commonly viewed products

UPDATE product_analytics 
SET 
    bounce_rate = 0.35,              -- 35% bounce rate
    avg_session_duration = 285,      -- 4 minutes 45 seconds 
    page_views = 15600,              -- 15,600 page views
    traffic_sessions = 4875          -- 4,875 sessions (gives 3.2 pages/session)
WHERE product_id = 1;  -- Explorer Classic

UPDATE product_analytics 
SET 
    bounce_rate = 0.28,              -- 28% bounce rate (better performance)
    avg_session_duration = 312,      -- 5 minutes 12 seconds
    page_views = 18750,              -- 18,750 page views  
    traffic_sessions = 5890          -- 5,890 sessions (gives 3.2 pages/session)
WHERE product_id = 2;  -- Dharma Chronograph

UPDATE product_analytics 
SET 
    bounce_rate = 0.22,              -- 22% bounce rate (excellent)
    avg_session_duration = 395,      -- 6 minutes 35 seconds
    page_views = 9850,               -- 9,850 page views
    traffic_sessions = 2950          -- 2,950 sessions (gives 3.3 pages/session)
WHERE product_id = 3;  -- Beat Generation Limited

UPDATE product_analytics 
SET 
    bounce_rate = 0.31,              -- 31% bounce rate
    avg_session_duration = 225,      -- 3 minutes 45 seconds
    page_views = 22400,              -- 22,400 page views
    traffic_sessions = 7125          -- 7,125 sessions (gives 3.1 pages/session)
WHERE product_id = 4;  -- Glow Serum

UPDATE product_analytics 
SET 
    bounce_rate = 0.29,              -- 29% bounce rate
    avg_session_duration = 265,      -- 4 minutes 25 seconds
    page_views = 19200,              -- 19,200 page views
    traffic_sessions = 6150          -- 6,150 sessions (gives 3.1 pages/session)
WHERE product_id = 5;  -- Hydra Moisturizer

-- Verify the updates
SELECT 
    product_id,
    round((bounce_rate * 100)::numeric, 1) as "Bounce Rate %",
    round(avg_session_duration / 60.0, 1) as "Avg Session (min)",
    round((page_views::numeric / NULLIF(traffic_sessions, 0))::numeric, 1) as "Pages/Session",
    traffic_sessions as "Sessions",
    page_views as "Page Views"
FROM product_analytics 
WHERE product_id IN (1, 2, 3, 4, 5, 37)
ORDER BY product_id;