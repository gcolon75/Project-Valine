#!/bin/bash
#
# Staging First Account Creation - Endpoint Sanity Tests
# Usage: ./test-staging-account-creation.sh [API_BASE_URL]
#
# This script tests the complete account creation, verification, and login flow
# as documented in docs/release/STAGING_FIRST_ACCOUNT.md
#

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Base URL from argument or environment
API_BASE="${1:-${API_BASE:-http://localhost:3000}}"

echo ""
echo "=========================================="
echo "Staging First Account - Sanity Tests"
echo "=========================================="
echo ""
echo "API Base: $API_BASE"
echo "Docs: docs/release/STAGING_FIRST_ACCOUNT.md"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
COOKIES_FILE="/tmp/staging-test-cookies-$$.txt"

# Cleanup on exit
cleanup() {
  rm -f "$COOKIES_FILE"
}
trap cleanup EXIT

# Generate random test user
TIMESTAMP=$(date +%s)
TEST_EMAIL="testuser${TIMESTAMP}@example.com"
TEST_USERNAME="testuser${TIMESTAMP}"
TEST_PASSWORD="SecurePass123!"

echo -e "${BLUE}Test User:${NC}"
echo "  Email: $TEST_EMAIL"
echo "  Username: $TEST_USERNAME"
echo ""

# Helper function to test endpoint
test_endpoint() {
  local test_name="$1"
  local expected_status="$2"
  shift 2
  
  echo -n "Testing: $test_name... "
  
  # Run curl and capture HTTP status and response
  local response_file="/tmp/staging-test-response-$$.txt"
  local status=$(curl -s -w "%{http_code}" -o "$response_file" "$@")
  local response=$(cat "$response_file")
  rm -f "$response_file"
  
  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $status)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $status)"
    echo -e "${YELLOW}Response:${NC} $response"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

# Test 1: Register new account
echo -e "${BLUE}[Test 1/7]${NC} Register new account (expect 201)"
test_endpoint "POST /auth/register" "201" \
  -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -c "$COOKIES_FILE" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"username\": \"$TEST_USERNAME\",
    \"displayName\": \"Test User $TIMESTAMP\"
  }"

if [ $? -eq 0 ]; then
  echo -e "${YELLOW}Note:${NC} Check logs or email for verification token"
fi
echo ""

# Test 2: Resend verification (first 5 should work)
echo -e "${BLUE}[Test 2/7]${NC} Resend verification email - first 5 requests (expect 200)"
for i in {1..5}; do
  test_endpoint "POST /auth/resend-verification (attempt $i/5)" "200" \
    -X POST "$API_BASE/auth/resend-verification" \
    -b "$COOKIES_FILE"
  sleep 1
done
echo ""

# Test 3: Rate limiting - 6th request should fail
echo -e "${BLUE}[Test 3/7]${NC} Rate limiting - 6th request (expect 429)"
test_endpoint "POST /auth/resend-verification (rate limited)" "429" \
  -X POST "$API_BASE/auth/resend-verification" \
  -b "$COOKIES_FILE"

echo -e "${YELLOW}Note:${NC} Rate limit resets after 15 minutes"
echo ""

# Test 4: Manual verification (requires token from logs/email)
echo -e "${BLUE}[Test 4/7]${NC} Verify email (manual step required)"
echo -e "${YELLOW}⚠ MANUAL STEP REQUIRED:${NC}"
echo "  1. Check server logs (if EMAIL_ENABLED=false) or email inbox"
echo "  2. Extract verification token from:"
echo "     - Logs: Look for 'Token (masked): abc123...xyz789'"
echo "     - Email: Extract from verification URL"
echo "  3. Run:"
echo ""
echo "     curl -X POST \"$API_BASE/auth/verify-email\" \\"
echo "       -H \"Content-Type: application/json\" \\"
echo "       -d '{\"token\": \"YOUR_TOKEN_HERE\"}'"
echo ""
read -p "Press Enter after verifying email (or Ctrl+C to skip)... "

# Test 5: Login
echo -e "${BLUE}[Test 5/7]${NC} Login with credentials (expect 200 + Set-Cookie)"
RESPONSE_FILE="/tmp/staging-test-login-$$.txt"
HTTP_STATUS=$(curl -s -w "%{http_code}" -o "$RESPONSE_FILE" \
  -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -c "$COOKIES_FILE" \
  -D - \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

if [ "$HTTP_STATUS" = "200" ]; then
  # Check for Set-Cookie headers
  COOKIES=$(cat "$RESPONSE_FILE" | grep -i "set-cookie" | wc -l)
  if [ "$COOKIES" -ge 2 ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP 200 with Set-Cookie headers)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP 200 but missing Set-Cookie headers)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
else
  echo -e "${RED}✗ FAIL${NC} (Expected 200, got $HTTP_STATUS)"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi
rm -f "$RESPONSE_FILE"
echo ""

# Test 6: Get current user
echo -e "${BLUE}[Test 6/7]${NC} Get authenticated user (expect 200)"
test_endpoint "GET /auth/me" "200" \
  -X GET "$API_BASE/auth/me" \
  -b "$COOKIES_FILE"
echo ""

# Test 7: List sessions
echo -e "${BLUE}[Test 7/7]${NC} List sessions (expect 200)"
test_endpoint "GET /auth/sessions" "200" \
  -X GET "$API_BASE/auth/sessions" \
  -b "$COOKIES_FILE"
echo ""

# Summary
echo "=========================================="
echo "Test Results Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All automated tests passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Verify email (manual step above)"
  echo "  2. Test protected endpoints with authenticated session"
  echo "  3. Review docs/release/STAGING_FIRST_ACCOUNT.md for deployment"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Review errors above.${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "  - Check server logs for detailed error messages"
  echo "  - Verify environment variables (see .env.example)"
  echo "  - Ensure database migrations are applied"
  echo "  - Check Redis connection for rate limiting"
  exit 1
fi
