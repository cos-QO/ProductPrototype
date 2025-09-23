#!/bin/bash

# Database Connection Fix Script
# Resolves port conflicts and ensures PostgreSQL connectivity
# 
# IMPORTANT: This app uses PostgreSQL on port 5433 (NOT 5432)
# Run this script daily or whenever you encounter connection issues

echo "🔧 Fixing database connection issues..."
echo "📝 Note: Using PostgreSQL on port 5433 (configured for conflict avoidance)"

# 1. Kill any processes conflicting with PostgreSQL port 5432 (system conflicts)
echo "📍 Checking for port conflicts on 5432 (system PostgreSQL)..."
conflicting_pids=$(lsof -ti:5432 | grep -v docker 2>/dev/null || true)

if [ ! -z "$conflicting_pids" ]; then
    echo "⚠️  Found conflicting processes: $conflicting_pids"
    echo "$conflicting_pids" | xargs kill -9 2>/dev/null || true
    echo "✅ Killed conflicting processes"
else
    echo "✅ No port conflicts found"
fi

# 2. Verify PostgreSQL container is running
echo "🐳 Checking PostgreSQL container status..."
if docker ps | grep -q "queenone-postgres"; then
    echo "✅ PostgreSQL container is running"
else
    echo "⚠️  PostgreSQL container not running, starting..."
    cd "$(dirname "$0")/.."
    npm run docker:up
fi

# 3. Test database connectivity
echo "🔌 Testing database connection..."
if docker exec queenone-postgres pg_isready -U postgres >/dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
    
    # Test actual database
    if docker exec queenone-postgres psql -U postgres -d queenone_dev -c "SELECT 1;" >/dev/null 2>&1; then
        echo "✅ Database 'queenone_dev' is accessible"
        
        # Check data
        product_count=$(docker exec queenone-postgres psql -U postgres -d queenone_dev -t -c "SELECT COUNT(*) FROM products;" 2>/dev/null | tr -d ' ')
        brand_count=$(docker exec queenone-postgres psql -U postgres -d queenone_dev -t -c "SELECT COUNT(*) FROM brands;" 2>/dev/null | tr -d ' ')
        
        echo "📊 Database contains: $product_count products, $brand_count brands"
    else
        echo "❌ Database 'queenone_dev' is not accessible"
        exit 1
    fi
else
    echo "❌ PostgreSQL is not ready"
    exit 1
fi

# 4. Verify no other processes are using port 5432
final_check=$(lsof -ti:5432 | grep -v docker | wc -l 2>/dev/null || echo "0")
if [ "$final_check" -eq "0" ]; then
    echo "✅ Port 5432 is clean for PostgreSQL"
else
    echo "⚠️  Warning: Still have non-Docker processes on port 5432"
fi

echo "🎉 Database connection fix completed!"
echo ""
echo "Next steps:"
echo "1. Restart your development server: npm run dev"
echo "2. Test API endpoints: curl http://localhost:5000/api/products"
echo "3. Check dashboard: curl http://localhost:5000/api/dashboard/stats"