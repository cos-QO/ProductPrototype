-- Add cost_price column to products table if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price INTEGER DEFAULT 0;

-- Update the column to have the correct default
UPDATE products SET cost_price = 0 WHERE cost_price IS NULL;