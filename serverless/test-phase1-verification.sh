#!/bin/bash

# Phase 1 Validation Test Script
# Tests email verification enforcement and rate limiting

set -e

echo "================================================"
echo "Phase 1: Verification Enforcement Test Suite"
echo "================================================"
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
COOKIE_FILE="/tmp/test-cookies.txt"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_USERNAME="testuser$(date +%s)"
TEST_PASSWORD="TestPassword123!"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
test_start() {
  echo -e "${YELLOW}TEST: $1${NC}"
}

test_pass() {
  echo -e "${GREEN}✓ PASS: $1${NC}"
  ((TESTS_PASSED++))
}

test_fail() {
  echo -e "${RED}✗ FAIL: $1${NC}"
  ((TESTS_FAILED++))
}

cleanup() {
  rm -f "$COOKIE_FILE"
}

trap cleanup EXIT

# Test 1: Register new user
test_start "User registration creates unverified user"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"username\":\"$TEST_USERNAME\",\"displayName\":\"Test User\"}" \
  -c "$COOKIE_FILE" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$REGISTER_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ]; then
  # Check if emailVerified is false in response
  if echo "$RESPONSE_BODY" | grep -q '"emailVerified":false'; then
    test_pass "User registered with emailVerified=false"
  else
    test_fail "User registered but emailVerified field unexpected"
    echo "Response: $RESPONSE_BODY"
  fi
else
  test_fail "Registration failed with code $HTTP_CODE"
  echo "Response: $RESPONSE_BODY"
fi

# Test 2: Unverified user blocked from creating profile
test_start "Unverified user blocked from creating profile"
PROFILE_RESPONSE=$(curl -s -X POST "$API_URL/profiles" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{"vanityUrl":"testprofile","headline":"Test Headline"}' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$PROFILE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$PROFILE_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "403" ]; then
  if echo "$RESPONSE_BODY" | grep -qi "verification"; then
    test_pass "Profile creation blocked with 403 and verification message"
  else
    test_fail "Got 403 but message doesn't mention verification"
    echo "Response: $RESPONSE_BODY"
  fi
else
  test_fail "Expected 403, got $HTTP_CODE"
  echo "Response: $RESPONSE_BODY"
fi

# Test 3: Unverified user blocked from updating settings
test_start "Unverified user blocked from updating settings"
SETTINGS_RESPONSE=$(curl -s -X PUT "$API_URL/settings" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{"privacy":{"showActivity":false}}' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$SETTINGS_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$SETTINGS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "403" ]; then
  if echo "$RESPONSE_BODY" | grep -qi "verification"; then
    test_pass "Settings update blocked with 403 and verification message"
  else
    test_fail "Got 403 but message doesn't mention verification"
    echo "Response: $RESPONSE_BODY"
  fi
else
  test_fail "Expected 403, got $HTTP_CODE"
  echo "Response: $RESPONSE_BODY"
fi

# Test 4: Rate limiting on resend verification
test_start "Rate limiting on resend verification (5 per hour)"
echo "  Sending 6 resend requests..."

for i in {1..6}; do
  RESEND_RESPONSE=$(curl -s -X POST "$API_URL/auth/resend-verification" \
    -b "$COOKIE_FILE" \
    -w "\n%{http_code}")
  
  HTTP_CODE=$(echo "$RESEND_RESPONSE" | tail -n1)
  RESPONSE_BODY=$(echo "$RESEND_RESPONSE" | head -n-1)
  
  echo "  Request $i: HTTP $HTTP_CODE"
  
  if [ $i -le 5 ]; then
    # First 5 should succeed
    if [ "$HTTP_CODE" != "200" ]; then
      test_fail "Request $i should succeed but got $HTTP_CODE"
      echo "Response: $RESPONSE_BODY"
      break
    fi
  else
    # 6th should be rate limited
    if [ "$HTTP_CODE" = "429" ]; then
      if echo "$RESEND_RESPONSE" | grep -qi "retry-after"; then
        test_pass "6th request blocked with 429 and Retry-After header"
      else
        test_fail "Got 429 but missing Retry-After header"
        echo "Response: $RESEND_RESPONSE"
      fi
    else
      test_fail "Expected 429 on 6th request, got $HTTP_CODE"
      echo "Response: $RESPONSE_BODY"
    fi
  fi
  
  sleep 0.5
done

# Test 5: Check rate limit headers
test_start "Rate limit headers present in response"
RESEND_RESPONSE=$(curl -s -X POST "$API_URL/auth/resend-verification" \
  -b "$COOKIE_FILE" \
  -i)

if echo "$RESEND_RESPONSE" | grep -qi "x-ratelimit-limit"; then
  if echo "$RESEND_RESPONSE" | grep -qi "x-ratelimit-remaining"; then
    if echo "$RESEND_RESPONSE" | grep -qi "x-ratelimit-reset"; then
      test_pass "All rate limit headers present"
    else
      test_fail "Missing X-RateLimit-Reset header"
    fi
  else
    test_fail "Missing X-RateLimit-Remaining header"
  fi
else
  test_fail "Missing X-RateLimit-Limit header"
fi

# Test 6: Verify email and test access (requires manual DB update)
echo ""
echo -e "${YELLOW}Manual verification step required:${NC}"
echo "Run the following SQL to verify the user:"
echo ""
echo "  psql \$DATABASE_URL -c \"UPDATE users SET \\\"emailVerified\\\"=true WHERE email='$TEST_EMAIL'\""
echo ""
echo -n "Press Enter after running the SQL command to continue testing..."
read

# Test 7: Verified user allowed to create profile
test_start "Verified user allowed to create profile"
PROFILE_RESPONSE=$(curl -s -X POST "$API_URL/profiles" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{\"vanityUrl\":\"$TEST_USERNAME\",\"headline\":\"Test Headline\"}" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$PROFILE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$PROFILE_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ]; then
  test_pass "Profile created successfully for verified user"
else
  test_fail "Expected 201, got $HTTP_CODE"
  echo "Response: $RESPONSE_BODY"
fi

# Test 8: Verified user allowed to update settings
test_start "Verified user allowed to update settings"
SETTINGS_RESPONSE=$(curl -s -X PUT "$API_URL/settings" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{"privacy":{"showActivity":false}}' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$SETTINGS_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$SETTINGS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  test_pass "Settings updated successfully for verified user"
else
  test_fail "Expected 200, got $HTTP_CODE"
  echo "Response: $RESPONSE_BODY"
fi

# Summary
echo ""
echo "================================================"
echo "Test Summary"
echo "================================================"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed! ✓${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. Please review the output above.${NC}"
  exit 1
fi
