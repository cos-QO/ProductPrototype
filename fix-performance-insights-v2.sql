-- Fix Performance Insights data for PowerHub 30000 Pro (Product ID: 37)
-- Version 2: Direct update without ALTER TABLE (columns already exist in schema)

-- Update existing analytics records with Performance Insights data
UPDATE product_analytics 
SET 
    bounce_rate = 0.32,                    -- 32% bounce rate (good performance)
    avg_session_duration = 245,            -- 4 minutes 5 seconds average session
    page_views = 13200,                    -- 13,200 page views
    traffic_sessions = 4125                -- 4,125 sessions (gives 3.2 pages/session)
WHERE product_id = 37 
AND period_start = '2025-10-01';

-- Update September data
UPDATE product_analytics 
SET 
    bounce_rate = 0.33,
    avg_session_duration = 240,
    page_views = 12375,
    traffic_sessions = 4125
WHERE product_id = 37 
AND period_start = '2025-09-01';

-- Update August data
UPDATE product_analytics 
SET 
    bounce_rate = 0.35,
    avg_session_duration = 230,
    page_views = 11550,
    traffic_sessions = 3850
WHERE product_id = 37 
AND period_start = '2025-08-01';

-- Update July data
UPDATE product_analytics 
SET 
    bounce_rate = 0.37,
    avg_session_duration = 220,
    page_views = 10725,
    traffic_sessions = 3575
WHERE product_id = 37 
AND period_start = '2025-07-01';

-- Update June data
UPDATE product_analytics 
SET 
    bounce_rate = 0.39,
    avg_session_duration = 210,
    page_views = 9900,
    traffic_sessions = 3300
WHERE product_id = 37 
AND period_start = '2025-06-01';

-- Update May data
UPDATE product_analytics 
SET 
    bounce_rate = 0.41,
    avg_session_duration = 200,
    page_views = 9075,
    traffic_sessions = 3025
WHERE product_id = 37 
AND period_start = '2025-05-01';

-- Update April data
UPDATE product_analytics 
SET 
    bounce_rate = 0.43,
    avg_session_duration = 190,
    page_views = 8250,
    traffic_sessions = 2750
WHERE product_id = 37 
AND period_start = '2025-04-01';

-- Verify the updates
SELECT 
    product_id,
    to_char(period_start, 'Mon YYYY') as month,
    ROUND(bounce_rate * 100, 1) as bounce_rate_pct,
    ROUND(avg_session_duration / 60.0, 1) as avg_session_minutes,
    page_views,
    traffic_sessions,
    CASE 
        WHEN traffic_sessions > 0 
        THEN ROUND(page_views::numeric / traffic_sessions, 1) 
        ELSE 0 
    END as pages_per_session
FROM product_analytics 
WHERE product_id = 37
ORDER BY period_start DESC
LIMIT 7;