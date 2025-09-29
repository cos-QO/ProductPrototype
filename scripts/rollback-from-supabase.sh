#!/bin/bash

# QueenOne Product Prototype - Supabase Rollback Script
# This script rolls back from Supabase to Docker PostgreSQL

set -e  # Exit on any error

echo "🔄 Starting QueenOne ProductPrototype Rollback from Supabase"
echo "=================================================="

# Step 1: Find latest backup
echo "🔍 Step 1/4: Finding latest backup..."
LATEST_BACKUP=$(ls -t migration-backups/pre_migration_backup_*.sql 2>/dev/null | head -n1)

if [[ -z "$LATEST_BACKUP" ]]; then
    echo "❌ No backup files found in migration-backups/"
    echo "Cannot perform rollback without backup."
    exit 1
fi

echo "✅ Found backup: $LATEST_BACKUP"

# Step 2: Restore environment configuration
echo "🔧 Step 2/4: Restoring environment configuration..."
if [[ -f ".env.backup" ]]; then
    cp .env.backup .env
    echo "✅ Environment configuration restored"
else
    echo "⚠️  No .env.backup found, manually reverting to local PostgreSQL..."
    cat > .env << EOF
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/queenone_dev
REPLIT_DOMAINS=localhost
SESSION_SECRET=your_local_session_secret
JWT_SECRET=development-jwt-secret-key-for-local-testing-must-be-32-chars-minimum
PORT=5000

# OpenRouter Configuration
OPENROUTER_API_KEY=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
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_HTTP_REFERER=https://github.com/QueenOne/ProductPrototype
OPENROUTER_X_TITLE=QueenOne ProductPrototype - Bulk Upload
OPENROUTER_MODEL=openai/gpt-4o-mini
EOF
    echo "✅ Environment configuration manually restored"
fi

# Step 3: Ensure Docker PostgreSQL is running
echo "🐳 Step 3/4: Ensuring Docker PostgreSQL is running..."
if ! docker ps | grep -q queenone-postgres; then
    echo "Starting Docker PostgreSQL..."
    npm run docker:up
    sleep 10  # Wait for PostgreSQL to be ready
fi
echo "✅ Docker PostgreSQL is running"

# Step 4: Restore database from backup
echo "📥 Step 4/4: Restoring database from backup..."

# Drop and recreate database to ensure clean state
docker exec queenone-postgres psql -U postgres -c "DROP DATABASE IF EXISTS queenone_dev;"
docker exec queenone-postgres psql -U postgres -c "CREATE DATABASE queenone_dev;"

# Restore from backup
docker exec -i queenone-postgres psql -U postgres -d queenone_dev < "$LATEST_BACKUP"

echo "✅ Database restored from backup"

# Verify restoration
echo "🔍 Verifying restoration..."
TABLE_COUNT=$(docker exec queenone-postgres psql -U postgres -d queenone_dev -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d ' ')
echo "Tables restored: $TABLE_COUNT"

if [[ "$TABLE_COUNT" -gt "40" ]]; then
    echo "✅ Rollback completed successfully!"
else
    echo "⚠️  Warning: Table count seems low. Please verify manually."
fi

echo ""
echo "🎉 Rollback from Supabase completed!"
echo "=================================================="
echo "Your application is now running on local Docker PostgreSQL"
echo ""
echo "Next steps:"
echo "1. Start development server: npm run dev"
echo "2. Verify all functionality works"
echo "3. Check data integrity"
echo ""
echo "Connection restored to:"
echo "postgresql://postgres:postgres123@localhost:5433/queenone_dev"