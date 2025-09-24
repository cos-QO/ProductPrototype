-- Phase 3.5: Product Variants System Enhancement
-- Migration to add comprehensive variant support

-- Variant Options Table (Size, Color, Material, etc.)
CREATE TABLE IF NOT EXISTS variant_options (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  option_type VARCHAR(50) NOT NULL DEFAULT 'text', -- text, color, size, image, number
  is_global BOOLEAN DEFAULT true, -- Global options vs product-specific
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Variant Option Values (Small, Medium, Large for Size option)
CREATE TABLE IF NOT EXISTS variant_option_values (
  id SERIAL PRIMARY KEY,
  option_id INTEGER REFERENCES variant_options(id) ON DELETE CASCADE,
  value VARCHAR(255) NOT NULL,
  display_value VARCHAR(255) NOT NULL,
  hex_color VARCHAR(7), -- For color options (#FF0000)
  image_url VARCHAR(500), -- For image-based options
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Product Variant Options (Which options apply to which products)
CREATE TABLE IF NOT EXISTS product_variant_options (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  option_id INTEGER REFERENCES variant_options(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, option_id)
);

-- Product Variants (The actual variant products)
-- Enhanced version using existing products table with additional metadata
CREATE TABLE IF NOT EXISTS product_variants (
  id SERIAL PRIMARY KEY,
  parent_product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  variant_product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  variant_sku VARCHAR(100),
  variant_name VARCHAR(255),
  price_adjustment INTEGER DEFAULT 0, -- Price difference from parent in cents
  weight_adjustment INTEGER DEFAULT 0, -- Weight difference in grams
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(parent_product_id, variant_product_id)
);

-- Variant Option Combinations (Size=Large + Color=Red)
CREATE TABLE IF NOT EXISTS variant_combinations (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER REFERENCES product_variants(id) ON DELETE CASCADE,
  option_id INTEGER REFERENCES variant_options(id) ON DELETE CASCADE,
  option_value_id INTEGER REFERENCES variant_option_values(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(variant_id, option_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_variant_options_slug ON variant_options(slug);
CREATE INDEX IF NOT EXISTS idx_variant_options_type ON variant_options(option_type);
CREATE INDEX IF NOT EXISTS idx_variant_option_values_option_id ON variant_option_values(option_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_options_product_id ON product_variant_options(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_parent ON product_variants(parent_product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_variant ON product_variants(variant_product_id);
CREATE INDEX IF NOT EXISTS idx_variant_combinations_variant_id ON variant_combinations(variant_id);

-- Insert default variant options
INSERT INTO variant_options (name, slug, display_name, description, option_type, is_global, sort_order) 
VALUES
  ('size', 'size', 'Size', 'Product size variations', 'text', true, 1),
  ('color', 'color', 'Color', 'Product color variations', 'color', true, 2),
  ('material', 'material', 'Material', 'Product material variations', 'text', true, 3),
  ('finish', 'finish', 'Finish', 'Product finish variations', 'text', true, 4),
  ('style', 'style', 'Style', 'Product style variations', 'text', true, 5),
  ('capacity', 'capacity', 'Capacity', 'Product capacity variations', 'text', true, 6),
  ('pattern', 'pattern', 'Pattern', 'Product pattern variations', 'image', true, 7),
  ('texture', 'texture', 'Texture', 'Product texture variations', 'text', true, 8)
ON CONFLICT (slug) DO NOTHING;

-- Insert common variant option values
WITH size_option AS (SELECT id FROM variant_options WHERE slug = 'size' LIMIT 1),
     color_option AS (SELECT id FROM variant_options WHERE slug = 'color' LIMIT 1),
     material_option AS (SELECT id FROM variant_options WHERE slug = 'material' LIMIT 1)

INSERT INTO variant_option_values (option_id, value, display_value, hex_color, sort_order)
SELECT * FROM (
  -- Size values
  SELECT (SELECT id FROM size_option), 'xs', 'Extra Small', NULL, 1
  UNION SELECT (SELECT id FROM size_option), 's', 'Small', NULL, 2
  UNION SELECT (SELECT id FROM size_option), 'm', 'Medium', NULL, 3
  UNION SELECT (SELECT id FROM size_option), 'l', 'Large', NULL, 4
  UNION SELECT (SELECT id FROM size_option), 'xl', 'Extra Large', NULL, 5
  UNION SELECT (SELECT id FROM size_option), 'xxl', '2X Large', NULL, 6
  
  -- Color values
  UNION SELECT (SELECT id FROM color_option), 'black', 'Black', '#000000', 1
  UNION SELECT (SELECT id FROM color_option), 'white', 'White', '#FFFFFF', 2
  UNION SELECT (SELECT id FROM color_option), 'red', 'Red', '#FF0000', 3
  UNION SELECT (SELECT id FROM color_option), 'blue', 'Blue', '#0000FF', 4
  UNION SELECT (SELECT id FROM color_option), 'green', 'Green', '#008000', 5
  UNION SELECT (SELECT id FROM color_option), 'navy', 'Navy', '#000080', 6
  UNION SELECT (SELECT id FROM color_option), 'gray', 'Gray', '#808080', 7
  UNION SELECT (SELECT id FROM color_option), 'silver', 'Silver', '#C0C0C0', 8
  
  -- Material values
  UNION SELECT (SELECT id FROM material_option), 'cotton', 'Cotton', NULL, 1
  UNION SELECT (SELECT id FROM material_option), 'leather', 'Leather', NULL, 2
  UNION SELECT (SELECT id FROM material_option), 'metal', 'Metal', NULL, 3
  UNION SELECT (SELECT id FROM material_option), 'plastic', 'Plastic', NULL, 4
  UNION SELECT (SELECT id FROM material_option), 'wood', 'Wood', NULL, 5
  UNION SELECT (SELECT id FROM material_option), 'glass', 'Glass', NULL, 6
  UNION SELECT (SELECT id FROM material_option), 'ceramic', 'Ceramic', NULL, 7
  UNION SELECT (SELECT id FROM material_option), 'stainless_steel', 'Stainless Steel', NULL, 8
) AS new_values
WHERE NOT EXISTS (
  SELECT 1 FROM variant_option_values vov 
  WHERE vov.option_id = new_values.option_id 
  AND vov.value = new_values.value
);