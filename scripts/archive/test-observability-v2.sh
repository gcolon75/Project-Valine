#!/bin/bash

# Test script for Observability v2 and Synthetic Journeys
# This script tests the observability endpoints and synthetic journey functionality

set -e

API_URL="${API_URL:-http://localhost:3000}"
echo "Testing against API: $API_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    
    echo -n "Testing $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        if [ -n "$body" ]; then
            echo "  Response: $(echo "$body" | jq -c '.' 2>/dev/null || echo "$body")"
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        echo "  Response: $body"
        return 1
    fi
    echo ""
}

echo "==================================="
echo "Observability v2 Test Suite"
echo "==================================="
echo ""

# Test 1: Health Check
echo "1. Health Check"
test_endpoint "Health Check" "GET" "/internal/observability/health" || true

# Test 2: Stats
echo "2. System Statistics"
test_endpoint "System Stats" "GET" "/internal/observability/stats" || true

# Test 3: Ingest Metrics
echo "3. Ingest Metrics"
test_endpoint "Ingest Metrics" "POST" "/internal/observability/metrics" \
    '{"type":"test","data":{"metric":"test_value","timestamp":'$(date +%s000)'}}' || true

# Test 4: Get Metrics
echo "4. Retrieve Metrics"
test_endpoint "Get Metrics" "GET" "/internal/observability/metrics?type=test" || true

# Test 5: Log Event
echo "5. Log Event"
test_endpoint "Log Event" "POST" "/internal/observability/log" \
    '{"level":"info","message":"Test log message","context":{"test":true}}' || true

# Test 6: Synthetic Journey (Simulated)
echo "6. Synthetic Journey (Simulated Mode)"
test_endpoint "Synthetic Journey - Simulated" "POST" "/internal/journey/run" \
    '{"mode":"simulated","scenarios":["register","login","logout"]}' || true

# Test 7: Synthetic Journey (Real) - only if enabled
echo "7. Synthetic Journey (Real Mode)"
echo -e "${YELLOW}Note: This test may fail if SYNTHETIC_USE_REAL_REQUESTS is not enabled${NC}"
test_endpoint "Synthetic Journey - Real" "POST" "/internal/journey/run" \
    '{"mode":"real","scenarios":["register"]}' || echo -e "${YELLOW}  Skipping real journey test (requires live API)${NC}"

echo ""
echo "==================================="
echo "Test Suite Complete"
echo "==================================="
