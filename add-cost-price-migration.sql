-- Phase 3 Migration: Add cost_price column to products table
-- This migration adds the cost_price column needed for Performance Insights

BEGIN;

-- Add cost_price column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'cost_price'
    ) THEN
        ALTER TABLE products ADD COLUMN cost_price INTEGER DEFAULT 0;
        COMMENT ON COLUMN products.cost_price IS 'Cost price in cents for contribution margin calculation';
    END IF;
END $$;

-- Ensure all existing products have a default cost_price of 0
UPDATE products SET cost_price = 0 WHERE cost_price IS NULL;

COMMIT;