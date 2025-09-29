#!/bin/bash

# QueenOne Product Prototype - Migration Validation Script
# This script validates the migration integrity between PostgreSQL and Supabase

set -e

echo "🔍 QueenOne ProductPrototype Migration Validation"
echo "=============================================="

if [[ -z "$SUPABASE_DB_PASSWORD" ]]; then
    echo "❌ Error: SUPABASE_DB_PASSWORD environment variable not set"
    exit 1
fi

LOCAL_DB="postgresql://postgres:postgres123@localhost:5433/queenone_dev"
SUPABASE_DB="postgresql://postgres:$SUPABASE_DB_PASSWORD@db.ozqlcusczxvuhxbhrgdn.supabase.co:5432/postgres"

echo "📊 Comparing database schemas and data..."

# Function to run query on both databases and compare
compare_query() {
    local query="$1"
    local description="$2"
    
    echo "Checking: $description"
    
    local local_result=$(docker exec queenone-postgres psql -U postgres -d queenone_dev -t -c "$query" 2>/dev/null | tr -d ' \n')
    local supabase_result=$(psql "$SUPABASE_DB" -t -c "$query" 2>/dev/null | tr -d ' \n')
    
    if [[ "$local_result" == "$supabase_result" ]]; then
        echo "✅ $description: MATCH (Local: $local_result, Supabase: $supabase_result)"
    else
        echo "❌ $description: MISMATCH (Local: $local_result, Supabase: $supabase_result)"
        return 1
    fi
}

# Validation checks
VALIDATION_PASSED=true

# 1. Table count validation
if ! compare_query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" "Table count"; then
    VALIDATION_PASSED=false
fi

# 2. Core data validation
CORE_TABLES=("users" "brands" "products" "media_assets" "product_attributes")

for table in "${CORE_TABLES[@]}"; do
    if ! compare_query "SELECT COUNT(*) FROM $table;" "Row count in $table"; then
        VALIDATION_PASSED=false
    fi
done

# 3. Foreign key constraints validation
if ! compare_query "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY';" "Foreign key constraints"; then
    VALIDATION_PASSED=false
fi

# 4. Index validation
if ! compare_query "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema='public';" "Index count"; then
    VALIDATION_PASSED=false
fi

# 5. Data integrity spot checks
echo "🔍 Performing data integrity spot checks..."

# Check if products have valid brand references
ORPHANED_PRODUCTS_LOCAL=$(docker exec queenone-postgres psql -U postgres -d queenone_dev -t -c "SELECT COUNT(*) FROM products p LEFT JOIN brands b ON p.brand_id = b.id WHERE b.id IS NULL;" 2>/dev/null | tr -d ' ')
ORPHANED_PRODUCTS_SUPABASE=$(psql "$SUPABASE_DB" -t -c "SELECT COUNT(*) FROM products p LEFT JOIN brands b ON p.brand_id = b.id WHERE b.id IS NULL;" 2>/dev/null | tr -d ' ')

if [[ "$ORPHANED_PRODUCTS_LOCAL" == "$ORPHANED_PRODUCTS_SUPABASE" ]]; then
    echo "✅ Product-Brand relationships: CONSISTENT"
else
    echo "❌ Product-Brand relationships: INCONSISTENT"
    VALIDATION_PASSED=false
fi

# Check if media assets have valid product references
ORPHANED_MEDIA_LOCAL=$(docker exec queenone-postgres psql -U postgres -d queenone_dev -t -c "SELECT COUNT(*) FROM media_assets m LEFT JOIN products p ON m.product_id = p.id WHERE p.id IS NULL;" 2>/dev/null | tr -d ' ')
ORPHANED_MEDIA_SUPABASE=$(psql "$SUPABASE_DB" -t -c "SELECT COUNT(*) FROM media_assets m LEFT JOIN products p ON m.product_id = p.id WHERE p.id IS NULL;" 2>/dev/null | tr -d ' ')

if [[ "$ORPHANED_MEDIA_LOCAL" == "$ORPHANED_MEDIA_SUPABASE" ]]; then
    echo "✅ Media-Product relationships: CONSISTENT"
else
    echo "❌ Media-Product relationships: INCONSISTENT"
    VALIDATION_PASSED=false
fi

# 6. Sample data verification
echo "🔍 Verifying sample data integrity..."

# Check if sample brand exists
SAMPLE_BRAND_LOCAL=$(docker exec queenone-postgres psql -U postgres -d queenone_dev -t -c "SELECT name FROM brands WHERE name LIKE '%Kerouac%' LIMIT 1;" 2>/dev/null | tr -d ' ')
SAMPLE_BRAND_SUPABASE=$(psql "$SUPABASE_DB" -t -c "SELECT name FROM brands WHERE name LIKE '%Kerouac%' LIMIT 1;" 2>/dev/null | tr -d ' ')

if [[ "$SAMPLE_BRAND_LOCAL" == "$SAMPLE_BRAND_SUPABASE" ]]; then
    echo "✅ Sample brand data: CONSISTENT"
else
    echo "❌ Sample brand data: INCONSISTENT"
    VALIDATION_PASSED=false
fi

# Final validation result
echo ""
echo "=============================================="
if [[ "$VALIDATION_PASSED" == true ]]; then
    echo "🎉 MIGRATION VALIDATION SUCCESSFUL!"
    echo "All checks passed. Migration integrity confirmed."
else
    echo "❌ MIGRATION VALIDATION FAILED!"
    echo "Some checks failed. Please review the migration."
    exit 1
fi

echo ""
echo "Migration validation completed at: $(date)"