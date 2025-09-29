#!/bin/bash

# QueenOne Product Prototype - Supabase Migration Script
# This script migrates from Docker PostgreSQL to Supabase

set -e  # Exit on any error

echo "🚀 Starting QueenOne ProductPrototype Migration to Supabase"
echo "=================================================="

# Check if required environment variables are set
if [[ -z "$SUPABASE_DB_PASSWORD" ]]; then
    echo "❌ Error: SUPABASE_DB_PASSWORD environment variable not set"
    echo "Please set your Supabase database password:"
    echo "export SUPABASE_DB_PASSWORD='your_password_here'"
    exit 1
fi

# Define connection strings
LOCAL_DB="postgresql://postgres:postgres123@localhost:5433/queenone_dev"
SUPABASE_DB="postgresql://postgres:$SUPABASE_DB_PASSWORD@db.ozqlcusczxvuhxbhrgdn.supabase.co:5432/postgres"

echo "✅ Environment variables validated"

# Step 1: Create comprehensive backup
echo "📦 Step 1/6: Creating comprehensive backup..."
BACKUP_FILE="migration-backups/pre_migration_backup_$(date +%Y%m%d_%H%M%S).sql"
docker exec queenone-postgres pg_dump -U postgres queenone_dev > "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"

# Step 2: Export data for migration
echo "📤 Step 2/6: Exporting data for migration..."
DATA_EXPORT="migration-backups/data_export_$(date +%Y%m%d_%H%M%S).sql"
docker exec queenone-postgres pg_dump -U postgres queenone_dev \
  --data-only \
  --inserts \
  --column-inserts \
  --no-owner \
  --no-privileges > "$DATA_EXPORT"
echo "✅ Data exported: $DATA_EXPORT"

# Step 3: Create schema in Supabase using Drizzle
echo "🏗️  Step 3/6: Creating schema in Supabase..."
export DATABASE_URL="$SUPABASE_DB"
npm run db:push
echo "✅ Schema created in Supabase"

# Step 4: Import data to Supabase
echo "⬆️  Step 4/6: Importing data to Supabase..."
psql "$SUPABASE_DB" -f "$DATA_EXPORT"
echo "✅ Data imported to Supabase"

# Step 5: Validate migration
echo "✅ Step 5/6: Validating migration..."
echo "Running validation queries..."

# Validate table counts
echo "Validating table counts..."
LOCAL_COUNT=$(docker exec queenone-postgres psql -U postgres -d queenone_dev -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")
SUPABASE_COUNT=$(psql "$SUPABASE_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")

echo "Local tables: $LOCAL_COUNT"
echo "Supabase tables: $SUPABASE_COUNT"

if [[ "$LOCAL_COUNT" != "$SUPABASE_COUNT" ]]; then
    echo "❌ Table count mismatch! Migration may have failed."
    exit 1
fi

# Validate key data counts
echo "Validating key data integrity..."
TABLES=("users" "brands" "products" "media_assets")

for table in "${TABLES[@]}"; do
    LOCAL_ROWS=$(docker exec queenone-postgres psql -U postgres -d queenone_dev -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0")
    SUPABASE_ROWS=$(psql "$SUPABASE_DB" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0")
    
    echo "Table $table - Local: $LOCAL_ROWS, Supabase: $SUPABASE_ROWS"
    
    if [[ "$LOCAL_ROWS" != "$SUPABASE_ROWS" ]]; then
        echo "❌ Data mismatch in table $table!"
        exit 1
    fi
done

echo "✅ Migration validation successful"

# Step 6: Update application configuration
echo "🔧 Step 6/6: Updating application configuration..."
if [[ -f ".env.supabase" ]]; then
    cp .env .env.backup
    cp .env.supabase .env.production
    echo "✅ Supabase configuration prepared"
    echo "💡 To activate Supabase:"
    echo "   cp .env.supabase .env"
    echo "   npm run dev"
else
    echo "❌ .env.supabase file not found"
    exit 1
fi

echo ""
echo "🎉 Migration to Supabase completed successfully!"
echo "=================================================="
echo "Next steps:"
echo "1. Update environment: cp .env.supabase .env"
echo "2. Test application: npm run dev"
echo "3. Verify all functionality works"
echo ""
echo "Rollback instructions (if needed):"
echo "1. cp .env.backup .env"
echo "2. npm run docker:up"
echo "3. npm run dev"
echo ""
echo "Migration files saved in: migration-backups/"