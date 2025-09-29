-- CRITICAL: Fix sequence misalignment after Supabase migration
-- Generated on: 2025-09-29T13:29:05.606Z
-- Execute these commands to fix sequence issues

BEGIN;

-- Fix brands sequence
SELECT setval('brands_id_seq', 26, false);

-- Fix products sequence
SELECT setval('products_id_seq', 38, false);

-- Fix media_assets sequence
SELECT setval('media_assets_id_seq', 19, false);

-- Fix syndication_channels sequence
SELECT setval('syndication_channels_id_seq', 10, false);

-- Fix syndication_logs sequence
SELECT setval('syndication_logs_id_seq', 114, false);

-- Fix import_sessions sequence
SELECT setval('import_sessions_id_seq', 58, false);

-- Fix field_mapping_cache sequence
SELECT setval('field_mapping_cache_id_seq', 15, false);

COMMIT;

-- Verify fixes with these queries:
-- SELECT currval('brands_id_seq') as current_value, MAX(id) as max_id FROM brands;
-- SELECT currval('products_id_seq') as current_value, MAX(id) as max_id FROM products;
-- SELECT currval('media_assets_id_seq') as current_value, MAX(id) as max_id FROM media_assets;
-- SELECT currval('syndication_channels_id_seq') as current_value, MAX(id) as max_id FROM syndication_channels;
-- SELECT currval('syndication_logs_id_seq') as current_value, MAX(id) as max_id FROM syndication_logs;
-- SELECT currval('import_sessions_id_seq') as current_value, MAX(id) as max_id FROM import_sessions;
-- SELECT currval('field_mapping_cache_id_seq') as current_value, MAX(id) as max_id FROM field_mapping_cache;