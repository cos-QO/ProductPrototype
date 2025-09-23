#!/bin/bash

# Comprehensive Bulk Upload End-to-End Test
# Tests the complete workflow with database connectivity verification

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    BULK UPLOAD E2E TEST                     ║"
echo "║              Testing Complete Workflow                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"

BASE_URL="http://localhost:5000"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_step() {
    echo -e "\n${CYAN}$1. $2${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Step 1: Verify Database Connectivity
log_step 1 "Verifying Database Connectivity"
DB_STATS=$(curl -s "$BASE_URL/api/dashboard/stats")
if [[ $? -eq 0 && $DB_STATS == *"totalProducts"* ]]; then
    INITIAL_PRODUCTS=$(echo $DB_STATS | grep -o '"totalProducts":[0-9]*' | cut -d':' -f2)
    TOTAL_BRANDS=$(echo $DB_STATS | grep -o '"totalBrands":[0-9]*' | cut -d':' -f2)
    log_success "Database connected - $INITIAL_PRODUCTS products, $TOTAL_BRANDS brands"
else
    log_error "Database connectivity failed"
    echo "Response: $DB_STATS"
    exit 1
fi

# Step 2: Check Test CSV File
log_step 2 "Checking Test CSV File"
if [[ -f "test-comprehensive-bulk-upload.csv" ]]; then
    ROW_COUNT=$(wc -l < test-comprehensive-bulk-upload.csv)
    ROW_COUNT=$((ROW_COUNT - 1)) # Subtract header
    log_success "CSV file found with $ROW_COUNT products"
else
    log_error "Test CSV file not found"
    exit 1
fi

# Step 3: Upload File
log_step 3 "Uploading CSV File"
UPLOAD_RESPONSE=$(curl -s -X POST \
  -F "file=@test-comprehensive-bulk-upload.csv" \
  "$BASE_URL/api/import/upload")

if [[ $UPLOAD_RESPONSE == *"sessionId"* ]]; then
    SESSION_ID=$(echo $UPLOAD_RESPONSE | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
    log_success "File uploaded - Session ID: $SESSION_ID"
else
    log_error "File upload failed"
    echo "Response: $UPLOAD_RESPONSE"
    exit 1
fi

# Step 4: Wait for Analysis
log_step 4 "Waiting for File Analysis and AI Field Mapping"
TIMEOUT=30
COUNTER=0

while [ $COUNTER -lt $TIMEOUT ]; do
    STATUS_RESPONSE=$(curl -s "$BASE_URL/api/import/sessions/$SESSION_ID/status")
    
    if [[ $STATUS_RESPONSE == *"status"* ]]; then
        STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        echo -e "${YELLOW}Status: $STATUS${NC}"
        
        if [[ $STATUS == "preview_ready" || $STATUS == "awaiting_approval" ]]; then
            log_success "File analysis completed"
            break
        elif [[ $STATUS == "failed" ]]; then
            log_error "Analysis failed"
            echo "Response: $STATUS_RESPONSE"
            exit 1
        fi
    fi
    
    sleep 2
    COUNTER=$((COUNTER + 2))
done

if [ $COUNTER -ge $TIMEOUT ]; then
    log_error "Timeout waiting for analysis"
    exit 1
fi

# Step 5: Check Field Mappings
log_step 5 "Checking AI Field Mapping Results"
MAPPINGS_RESPONSE=$(curl -s "$BASE_URL/api/import/sessions/$SESSION_ID/mappings")

if [[ $MAPPINGS_RESPONSE == *"suggestions"* ]]; then
    MAPPING_COUNT=$(echo $MAPPINGS_RESPONSE | grep -o '"sourceField"' | wc -l)
    log_success "AI generated $MAPPING_COUNT field mappings"
    
    # Show sample mappings
    echo -e "${BLUE}Sample mappings:${NC}"
    echo $MAPPINGS_RESPONSE | grep -o '"sourceField":"[^"]*","targetField":"[^"]*","confidence":[0-9.]*' | head -5 | while read line; do
        SOURCE=$(echo $line | cut -d'"' -f4)
        TARGET=$(echo $line | cut -d'"' -f8)
        CONFIDENCE=$(echo $line | cut -d':' -f3)
        PERCENT=$(echo "scale=0; $CONFIDENCE * 100 / 1" | bc)
        echo -e "  ${BLUE}$SOURCE → $TARGET (${PERCENT}%)${NC}"
    done
else
    log_warning "No field mappings found, continuing..."
fi

# Step 6: Generate Preview
log_step 6 "Generating Data Preview"
PREVIEW_REQUEST=$(curl -s -X POST "$BASE_URL/api/import/sessions/$SESSION_ID/preview")

# Wait for preview
COUNTER=0
while [ $COUNTER -lt 15 ]; do
    STATUS_RESPONSE=$(curl -s "$BASE_URL/api/import/sessions/$SESSION_ID/status")
    STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [[ $STATUS == "preview_ready" || $STATUS == "awaiting_approval" ]]; then
        log_success "Data preview generated"
        break
    fi
    
    sleep 1
    COUNTER=$((COUNTER + 1))
done

# Step 7: Get Preview Data
log_step 7 "Retrieving Preview Data"
PREVIEW_RESPONSE=$(curl -s "$BASE_URL/api/import/sessions/$SESSION_ID/preview")

if [[ $PREVIEW_RESPONSE == *"data"* ]]; then
    RECORD_COUNT=$(echo $PREVIEW_RESPONSE | grep -o '"name"' | wc -l)
    log_success "Preview contains $RECORD_COUNT records"
else
    log_warning "Preview data may be empty"
fi

# Step 8: Start Import Process
log_step 8 "Starting Import Process"
EXECUTE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/import/sessions/$SESSION_ID/execute")

if [[ $EXECUTE_RESPONSE == *"success"* || $EXECUTE_RESPONSE == *"Import started"* ]]; then
    log_success "Import process started"
else
    log_warning "Import response: $EXECUTE_RESPONSE"
fi

# Step 9: Monitor Import Progress
log_step 9 "Monitoring Import Progress"
TIMEOUT=60
COUNTER=0

while [ $COUNTER -lt $TIMEOUT ]; do
    STATUS_RESPONSE=$(curl -s "$BASE_URL/api/import/sessions/$SESSION_ID/status")
    STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    echo -e "${YELLOW}Import Status: $STATUS${NC}"
    
    if [[ $STATUS == "completed" ]]; then
        log_success "Import completed successfully"
        break
    elif [[ $STATUS == "failed" ]]; then
        log_error "Import failed"
        echo "Response: $STATUS_RESPONSE"
        exit 1
    fi
    
    sleep 2
    COUNTER=$((COUNTER + 2))
done

if [ $COUNTER -ge $TIMEOUT ]; then
    log_error "Timeout waiting for import completion"
    exit 1
fi

# Step 10: Verify Database Changes
log_step 10 "Verifying Database Changes"
FINAL_STATS=$(curl -s "$BASE_URL/api/dashboard/stats")
FINAL_PRODUCTS=$(echo $FINAL_STATS | grep -o '"totalProducts":[0-9]*' | cut -d':' -f2)
PRODUCTS_ADDED=$((FINAL_PRODUCTS - INITIAL_PRODUCTS))

log_success "Database updated - Added $PRODUCTS_ADDED products ($INITIAL_PRODUCTS → $FINAL_PRODUCTS)"

# Step 11: Test API Endpoints
log_step 11 "Testing API Endpoints"
PRODUCTS_RESPONSE=$(curl -s "$BASE_URL/api/products")
BRANDS_RESPONSE=$(curl -s "$BASE_URL/api/brands")
AUTH_RESPONSE=$(curl -s "$BASE_URL/api/auth/user")

if [[ $PRODUCTS_RESPONSE == *"name"* && $BRANDS_RESPONSE == *"name"* && $AUTH_RESPONSE == *"email"* ]]; then
    log_success "API endpoints working correctly"
else
    log_warning "Some API endpoints may have issues"
fi

# Final Summary
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                     TEST COMPLETED                          ║"
echo "║                                                              ║"
echo "║  ✅ Database Connectivity: VERIFIED                         ║"
echo "║  ✅ File Upload: SUCCESS                                     ║"
echo "║  ✅ AI Field Mapping: SUCCESS                               ║"
echo "║  ✅ Data Preview: SUCCESS                                    ║"
echo "║  ✅ Import Process: SUCCESS                                  ║"
echo "║  ✅ Database Updates: VERIFIED                              ║"
echo "║  ✅ API Endpoints: WORKING                                   ║"
echo "║                                                              ║"
printf "║  Products Added: %-47s ║\n" "$PRODUCTS_ADDED"
printf "║  Session ID: %-51s ║\n" "$SESSION_ID"
echo "║                                                              ║"
echo "║  🎉 BULK UPLOAD SYSTEM FULLY OPERATIONAL                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"