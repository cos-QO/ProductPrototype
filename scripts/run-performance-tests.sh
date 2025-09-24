#!/bin/bash

# Performance Testing Execution Script
# Runs comprehensive performance tests for bulk upload system

set -e

echo "🚀 Starting Performance Testing Suite"
echo "===================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DATABASE_URL="postgresql://postgres:postgres123@localhost:5433/queenone_dev"
TEST_RESULTS_DIR="./tests/performance/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_FILE="${TEST_RESULTS_DIR}/performance_results_${TIMESTAMP}.json"

# Create results directory
mkdir -p "$TEST_RESULTS_DIR"

# Function to log with timestamp
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Function to log success
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to log warning
log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to log error
log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if database is running
    if ! pg_isready -h localhost -p 5433 -U postgres > /dev/null 2>&1; then
        log_error "PostgreSQL database not running on port 5433"
        log "Please start the database with: npm run docker:up"
        exit 1
    fi
    log_success "Database connection verified"
    
    # Check if server dependencies are installed
    if [ ! -d "node_modules" ]; then
        log_error "Node modules not installed"
        log "Please run: npm install"
        exit 1
    fi
    log_success "Dependencies verified"
    
    # Check if server can start
    log "Checking server configuration..."
    if ! npm run check > /dev/null 2>&1; then
        log_warning "TypeScript compilation issues detected"
        log "Attempting to fix compilation issues..."
        npm run build || {
            log_error "Server compilation failed"
            exit 1
        }
    fi
    log_success "Server configuration verified"
}

# Start server in background
start_server() {
    log "Starting server for performance testing..."
    
    # Kill any existing server processes
    pkill -f "node.*server" || true
    pkill -f "tsx.*server" || true
    sleep 2
    
    # Start server in background
    NODE_ENV=development npm run dev > /dev/null 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to start
    log "Waiting for server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
            log_success "Server started successfully (PID: $SERVER_PID)"
            return 0
        fi
        sleep 1
    done
    
    log_error "Server failed to start within 30 seconds"
    exit 1
}

# Stop server
stop_server() {
    if [ ! -z "$SERVER_PID" ]; then
        log "Stopping server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
        sleep 2
        pkill -f "node.*server" || true
        pkill -f "tsx.*server" || true
        log_success "Server stopped"
    fi
}

# Run performance tests
run_performance_tests() {
    log "Running performance test suite..."
    
    # Set environment variables for testing
    export NODE_ENV=test
    export DATABASE_URL="$TEST_DATABASE_URL"
    export TEST_RESULTS_FILE="$RESULTS_FILE"
    
    # Run the performance tests
    npx jest tests/performance/large-dataset-performance.test.js \
        --verbose \
        --detectOpenHandles \
        --forceExit \
        --testTimeout=300000 \
        --json \
        --outputFile="$RESULTS_FILE" || {
        log_error "Performance tests failed"
        return 1
    }
    
    log_success "Performance tests completed"
}

# Generate performance report
generate_report() {
    log "Generating performance report..."
    
    cat > "${TEST_RESULTS_DIR}/performance_summary_${TIMESTAMP}.md" << EOF
# Performance Test Report
**Generated:** $(date)
**Test Suite:** Large Dataset Performance Tests

## Test Configuration
- Database: PostgreSQL (localhost:5433)
- Server: Node.js/Express (localhost:5000)
- Test Environment: ${NODE_ENV}
- Results File: $(basename "$RESULTS_FILE")

## Test Coverage
- ✅ Dataset sizes: 100, 500, 1000, 5000 records
- ✅ Memory usage monitoring and leak detection
- ✅ WebSocket performance validation
- ✅ Error recovery performance testing
- ✅ Concurrent upload load testing
- ✅ Resource scaling analysis

## Performance Thresholds
- **Memory Usage:** <1GB for datasets under 5000 records
- **Processing Time:** <10ms per record
- **WebSocket Latency:** <100ms average
- **Error Recovery:** <5 seconds for bulk fixes
- **Performance Score:** >60 for individual tests, >40 for concurrent

## Results Summary
$(if [ -f "$RESULTS_FILE" ]; then
    echo "Detailed results available in: $(basename "$RESULTS_FILE")"
    echo ""
    echo "Test execution completed at: $(date)"
else
    echo "⚠️ Results file not generated - check test execution logs"
fi)

## Next Steps
1. Review detailed JSON results for performance metrics
2. Analyze any failed tests or performance regressions
3. Implement recommended optimizations if needed
4. Schedule regular performance regression testing

EOF

    log_success "Performance report generated: performance_summary_${TIMESTAMP}.md"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    stop_server
    
    # Clean up test files (keep results)
    find tests/fixtures/performance -name "*.csv" -type f -delete 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Set trap for cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    log "Performance Testing Suite - QueenOne ProductPrototype"
    log "Testing bulk upload system with large datasets (100-5000+ records)"
    echo ""
    
    check_prerequisites
    start_server
    
    if run_performance_tests; then
        generate_report
        log_success "Performance testing completed successfully!"
        log "Results available in: $TEST_RESULTS_DIR"
        echo ""
        log "📊 Performance Summary:"
        log "  - Tested dataset sizes: 100, 500, 1000, 5000 records"
        log "  - Memory, CPU, and WebSocket performance validated"
        log "  - Error recovery and concurrent load testing completed"
        log "  - Full results: $(basename "$RESULTS_FILE")"
        echo ""
        log_success "All performance tests passed! 🎉"
    else
        log_error "Performance testing failed!"
        log "Check the logs above for error details"
        exit 1
    fi
}

# Execute main function
main "$@"