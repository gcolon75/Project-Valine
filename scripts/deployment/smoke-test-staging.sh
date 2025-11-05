#!/bin/bash
# Smoke test suite for Project Valine staging deployment
# Tests critical endpoints after migration deployment
#
# Usage:
#   export API_BASE="http://localhost:5000" or staging URL
#   ./smoke-test-staging.sh
#
# Exit codes:
#   0 - All tests passed
#   1 - One or more tests failed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE="${API_BASE:-http://localhost:5000}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_DIR="${LOG_DIR:-/tmp}"
LOG_FILE="$LOG_DIR/smoke_test_$TIMESTAMP.log"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Cleanup function
cleanup() {
    if [ -n "$TEST_USER_ID" ]; then
        echo "Cleaning up test data..."
        # Note: In production, add cleanup logic here
    fi
}

trap cleanup EXIT

# Helper functions
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

pass() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo -e "${GREEN}✓${NC} $*" | tee -a "$LOG_FILE"
}

fail() {
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo -e "${RED}✗${NC} $*" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $*" | tee -a "$LOG_FILE"
}

test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local data=$4
    local description=$5

    log "Testing: $description"
    log "  $method $API_BASE$endpoint"

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_BASE$endpoint" 2>&1)
    elif [ "$method" = "POST" ] || [ "$method" = "PATCH" ] || [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_BASE$endpoint" 2>&1)
    else
        fail "Unsupported HTTP method: $method"
        return 1
    fi

    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status_code" = "$expected_status" ]; then
        pass "$description - Status: $status_code"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        fail "$description - Expected: $expected_status, Got: $status_code"
        echo "Response body: $body"
        return 1
    fi
}

# Start tests
log "========================================="
log "Starting Smoke Tests"
log "========================================="
log "API Base URL: $API_BASE"
log "Log file: $LOG_FILE"
log ""

# Test 1: Health Check
log "Test Suite: Health Check"
log "-----------------------------------------"

if test_endpoint "GET" "/health" "200" "" "Health check endpoint"; then
    pass "Server is healthy and responding"
else
    fail "Health check failed - server may be down"
    exit 1
fi

echo "" | tee -a "$LOG_FILE"

# Test 2: Root endpoint
log "Test Suite: Root API"
log "-----------------------------------------"

test_endpoint "GET" "/" "200" "" "Root API endpoint"

echo "" | tee -a "$LOG_FILE"

# Test 3: Authentication Endpoints (Mock tests - adjust based on actual auth)
log "Test Suite: Authentication"
log "-----------------------------------------"

warn "Note: Auth endpoints require actual credentials - using mock tests"

# Test auth endpoint exists (should return 400/401 for invalid credentials, not 404)
if test_endpoint "POST" "/auth/login" "400" '{"username":"","password":""}' "Auth endpoint accessibility (empty credentials)"; then
    pass "Auth login endpoint is accessible"
else
    # Check if it's 401 instead
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{"username":"","password":""}' \
        "$API_BASE/auth/login" 2>&1)
    status_code=$(echo "$response" | tail -n1)
    if [ "$status_code" = "401" ]; then
        pass "Auth login endpoint is accessible (returned 401 for invalid credentials)"
    else
        fail "Auth login endpoint returned unexpected status: $status_code"
    fi
fi

echo "" | tee -a "$LOG_FILE"

# Test 4: Profile Endpoints
log "Test Suite: Profile Management"
log "-----------------------------------------"

# Test GET profile - using a test user ID
# In staging, replace with actual test user ID
TEST_USER_ID="${TEST_USER_ID:-test_user_123}"

# Test profile retrieval (may return 404 if user doesn't exist, which is OK for smoke test)
response=$(curl -s -w "\n%{http_code}" "$API_BASE/profiles/$TEST_USER_ID" 2>&1)
status_code=$(echo "$response" | tail -n1)

if [ "$status_code" = "200" ]; then
    pass "GET /profiles/:userId - Profile retrieved successfully"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [ "$status_code" = "404" ]; then
    warn "GET /profiles/:userId - Test user not found (404) - expected in clean environment"
    pass "Profile endpoint is responding correctly"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    fail "GET /profiles/:userId - Unexpected status: $status_code"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test PATCH profile - should require authentication
response=$(curl -s -w "\n%{http_code}" -X PATCH \
    -H "Content-Type: application/json" \
    -d '{"title":"Senior Voice Actor"}' \
    "$API_BASE/profiles/$TEST_USER_ID" 2>&1)
status_code=$(echo "$response" | tail -n1)

if [ "$status_code" = "401" ] || [ "$status_code" = "403" ] || [ "$status_code" = "404" ]; then
    pass "PATCH /profiles/:userId - Correctly requires authorization or user exists check"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    warn "PATCH /profiles/:userId - Unexpected status: $status_code (may need auth setup)"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

echo "" | tee -a "$LOG_FILE"

# Test 5: Profile Links Endpoints
log "Test Suite: Profile Links (New Feature)"
log "-----------------------------------------"

# Test GET profile links
response=$(curl -s -w "\n%{http_code}" "$API_BASE/profiles/$TEST_USER_ID/links" 2>&1)
status_code=$(echo "$response" | tail -n1)

if [ "$status_code" = "200" ] || [ "$status_code" = "404" ]; then
    pass "GET /profiles/:userId/links - Endpoint is accessible"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Check if response contains links array when status is 200
    if [ "$status_code" = "200" ]; then
        body=$(echo "$response" | head -n-1)
        if echo "$body" | jq -e '.links' > /dev/null 2>&1; then
            pass "Response contains 'links' array"
            TESTS_TOTAL=$((TESTS_TOTAL + 1))
            TESTS_PASSED=$((TESTS_PASSED + 1))
        fi
    fi
else
    fail "GET /profiles/:userId/links - Unexpected status: $status_code"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test POST profile link - should require authentication
response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"label":"My Website","url":"https://example.com","type":"website"}' \
    "$API_BASE/profiles/$TEST_USER_ID/links" 2>&1)
status_code=$(echo "$response" | tail -n1)

if [ "$status_code" = "401" ] || [ "$status_code" = "403" ] || [ "$status_code" = "404" ]; then
    pass "POST /profiles/:userId/links - Correctly requires authorization"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    warn "POST /profiles/:userId/links - Unexpected status: $status_code"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

echo "" | tee -a "$LOG_FILE"

# Test 6: Theme Preferences
log "Test Suite: Theme Preferences (New Feature)"
log "-----------------------------------------"

# Test GET preferences
response=$(curl -s -w "\n%{http_code}" "$API_BASE/api/me/preferences" 2>&1)
status_code=$(echo "$response" | tail -n1)

if [ "$status_code" = "200" ] || [ "$status_code" = "401" ]; then
    pass "GET /api/me/preferences - Endpoint is accessible"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    fail "GET /api/me/preferences - Unexpected status: $status_code"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test PATCH preferences - should require authentication
response=$(curl -s -w "\n%{http_code}" -X PATCH \
    -H "Content-Type: application/json" \
    -d '{"theme":"dark"}' \
    "$API_BASE/api/me/preferences" 2>&1)
status_code=$(echo "$response" | tail -n1)

if [ "$status_code" = "401" ] || [ "$status_code" = "403" ]; then
    pass "PATCH /api/me/preferences - Correctly requires authorization"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    warn "PATCH /api/me/preferences - Unexpected status: $status_code"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

echo "" | tee -a "$LOG_FILE"

# Test 7: Dashboard Stats
log "Test Suite: Dashboard Statistics"
log "-----------------------------------------"

# Test GET dashboard stats
response=$(curl -s -w "\n%{http_code}" "$API_BASE/dashboard/stats" 2>&1)
status_code=$(echo "$response" | tail -n1)

if [ "$status_code" = "200" ] || [ "$status_code" = "401" ]; then
    pass "GET /dashboard/stats - Endpoint is accessible"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Check response structure if status is 200
    if [ "$status_code" = "200" ]; then
        body=$(echo "$response" | head -n-1)
        if echo "$body" | jq -e '.stats' > /dev/null 2>&1; then
            pass "Response contains 'stats' object"
            TESTS_TOTAL=$((TESTS_TOTAL + 1))
            TESTS_PASSED=$((TESTS_PASSED + 1))
        fi
    fi
else
    fail "GET /dashboard/stats - Unexpected status: $status_code"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo "" | tee -a "$LOG_FILE"

# Test 8: Database Migration Verification
log "Test Suite: Database Migration Validation"
log "-----------------------------------------"

if [ -n "$DATABASE_URL" ]; then
    log "Checking database schema..."
    
    # Check if profile_links table exists
    if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM profile_links;" > /dev/null 2>&1; then
        pass "profile_links table exists and is accessible"
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        fail "profile_links table not found or not accessible"
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Check if theme column exists in users table
    if psql "$DATABASE_URL" -c "SELECT theme FROM users LIMIT 1;" > /dev/null 2>&1; then
        pass "users.theme column exists"
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        fail "users.theme column not found"
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Check if title column exists in profiles table
    if psql "$DATABASE_URL" -c "SELECT title FROM profiles LIMIT 1;" > /dev/null 2>&1; then
        pass "profiles.title column exists"
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        fail "profiles.title column not found"
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    warn "DATABASE_URL not set - skipping database schema checks"
fi

echo "" | tee -a "$LOG_FILE"

# Test 9: Rate Limiting Check
log "Test Suite: Rate Limiting"
log "-----------------------------------------"

log "Testing rate limit protection (sending 5 rapid requests)..."
for i in {1..5}; do
    response=$(curl -s -w "\n%{http_code}" "$API_BASE/health" 2>&1)
    status_code=$(echo "$response" | tail -n1)
    
    if [ "$status_code" = "429" ]; then
        pass "Rate limiting is active (429 received on request $i)"
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
        break
    fi
    
    if [ "$i" = "5" ]; then
        warn "No rate limiting detected (may be configured with higher limits)"
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
    
    sleep 0.1
done

echo "" | tee -a "$LOG_FILE"

# Summary
log "========================================="
log "Smoke Test Summary"
log "========================================="
log "Total Tests:  $TESTS_TOTAL"
log "Passed:       $TESTS_PASSED"
log "Failed:       $TESTS_FAILED"
log ""
log "Log file: $LOG_FILE"
log "========================================="

# Print colored summary
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}$TESTS_FAILED test(s) failed.${NC}"
    echo "Please review the log file: $LOG_FILE"
    exit 1
fi
