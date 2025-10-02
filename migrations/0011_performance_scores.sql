-- Add performance scores column to product_analytics table
-- This stores pre-calculated scores on a 1-88,888 scale for efficient retrieval

ALTER TABLE product_analytics
ADD COLUMN IF NOT EXISTS performance_scores JSONB;

-- Create an index for efficient querying of scores
CREATE INDEX IF NOT EXISTS idx_product_analytics_performance_scores 
ON product_analytics USING GIN (performance_scores);

-- Add comment explaining the score system
COMMENT ON COLUMN product_analytics.performance_scores IS 
'Pre-calculated performance scores on a 1-88,888 scale. Structure:
{
  "rebuyRate": { "score": number, "originalValue": string },
  "avgSession": { "score": number, "originalValue": string },
  "bounceRate": { "score": number, "originalValue": string },
  "pagesPerSession": { "score": number, "originalValue": string }
}';

-- Update existing records with calculated scores
-- Note: This is a one-time migration to populate existing data
UPDATE product_analytics
SET performance_scores = jsonb_build_object(
  'rebuyRate', jsonb_build_object(
    'score', GREATEST(1, ROUND(rebuy_rate * 88888)),
    'originalValue', CONCAT(ROUND(rebuy_rate * 100, 1), '%')
  ),
  'avgSession', jsonb_build_object(
    'score', GREATEST(1, ROUND(LEAST(avg_session_duration / 60.0, 30) / 30 * 88888)),
    'originalValue', CONCAT(ROUND(avg_session_duration / 60), 'm')
  ),
  'bounceRate', jsonb_build_object(
    'score', GREATEST(1, ROUND((1 - bounce_rate) * 88888)),
    'originalValue', CONCAT(ROUND(bounce_rate * 100, 1), '% bounce')
  ),
  'pagesPerSession', jsonb_build_object(
    'score', CASE 
      WHEN traffic_sessions > 0 THEN GREATEST(1, ROUND(LEAST(page_views::numeric / traffic_sessions, 10) / 10 * 88888))
      ELSE 1
    END,
    'originalValue', CASE
      WHEN traffic_sessions > 0 THEN CONCAT(ROUND(page_views::numeric / traffic_sessions, 1), ' pages')
      ELSE '0.0 pages'
    END
  )
)
WHERE performance_scores IS NULL;