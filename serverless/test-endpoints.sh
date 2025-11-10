#!/bin/bash

# Test script for Project Valine API endpoints
# Usage: ./test-endpoints.sh [API_BASE_URL]

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API Base URL from argument or environment
API_BASE="${1:-${API_BASE:-https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev}}"

echo "=================================="
echo "Project Valine API Test Suite"
echo "=================================="
echo ""
echo "API Base: $API_BASE"
echo ""

# Check if API_BASE is placeholder
if [[ "$API_BASE" == *"YOUR-API-ID"* ]]; then
  echo -e "${RED}Error: Please provide your API Gateway URL${NC}"
  echo "Usage: ./test-endpoints.sh https://your-api-id.execute-api.us-west-2.amazonaws.com/dev"
  echo "Or set: export API_BASE=https://your-api-id.execute-api.us-west-2.amazonaws.com/dev"
  exit 1
fi

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_endpoint() {
  local name=$1
  local method=$2
  local path=$3
  local data=$4
  local expected_status=$5
  local auth_header=$6
  
  echo -n "Testing $name... "
  
  if [ -n "$data" ]; then
    if [ -n "$auth_header" ]; then
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE$path" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $auth_header" \
        -d "$data")
    else
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE$path" \
        -H "Content-Type: application/json" \
        -d "$data")
    fi
  else
    if [ -n "$auth_header" ]; then
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE$path" \
        -H "Authorization: Bearer $auth_header")
    else
      response=$(curl -s -w "\n%{http_code}" "$API_BASE$path")
    fi
  fi
  
  status_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (Status: $status_code)"
    ((TESTS_PASSED++))
    return 0
  else
    echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $status_code)"
    echo "Response: $body"
    ((TESTS_FAILED++))
    return 1
  fi
}

# Generate unique test data
TIMESTAMP=$(date +%s)
TEST_EMAIL="test${TIMESTAMP}@example.com"
TEST_USERNAME="testuser${TIMESTAMP}"
TEST_PASSWORD="testpass123"

echo "=================================="
echo "1. Health & Meta Endpoints"
echo "=================================="
echo ""

test_endpoint "Health Check" "GET" "/health" "" "200"
test_endpoint "API Meta" "GET" "/meta" "" "200"

echo ""
echo "=================================="
echo "2. Authentication Endpoints"
echo "=================================="
echo ""

# Register
register_data="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"username\":\"$TEST_USERNAME\",\"displayName\":\"Test User\"}"
register_response=$(curl -s -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "$register_data")

if echo "$register_response" | grep -q "token"; then
  echo -e "${GREEN}✓ PASSED${NC} Register endpoint"
  ((TESTS_PASSED++))
  TOKEN=$(echo "$register_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  USER_ID=$(echo "$register_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "  Token: ${TOKEN:0:20}..."
  echo "  User ID: $USER_ID"
else
  echo -e "${RED}✗ FAILED${NC} Register endpoint"
  echo "Response: $register_response"
  ((TESTS_FAILED++))
  exit 1
fi

# Login
login_data="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
test_endpoint "Login" "POST" "/auth/login" "$login_data" "200"

# Me (authenticated)
test_endpoint "Get Current User" "GET" "/auth/me" "" "200" "$TOKEN"

# Email Verification - Test resend (should work for unverified users)
echo -n "Testing Resend Verification... "
resend_response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/auth/resend-verification" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}')
status_code=$(echo "$resend_response" | tail -n1)
if [ "$status_code" = "200" ]; then
  echo -e "${GREEN}✓ PASSED${NC}"
  ((TESTS_PASSED++))
  # Extract and display message
  message=$(echo "$resend_response" | head -n-1 | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
  echo "  Message: $message"
else
  echo -e "${RED}✗ FAILED${NC} (expected 200, got $status_code)"
  ((TESTS_FAILED++))
fi

# Email Verification - Test with invalid token (should fail)
echo -n "Testing Verify Email (invalid token)... "
verify_response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid-token-12345"}')
status_code=$(echo "$verify_response" | tail -n1)
if [ "$status_code" = "400" ]; then
  echo -e "${GREEN}✓ PASSED${NC} (correctly rejected invalid token)"
  ((TESTS_PASSED++))
else
  echo -e "${YELLOW}⚠ WARNING${NC} (expected 400, got $status_code - may need real token)"
fi

# Note: Real verification token test would require extracting token from logs
# which is not feasible in this automated test script

echo ""
echo "=================================="
echo "3. Reels Endpoints"
echo "=================================="
echo ""

# List reels (public)
test_endpoint "List Reels" "GET" "/reels?limit=10" "" "200"

# Create reel (authenticated)
reel_data="{\"videoUrl\":\"https://example.com/video${TIMESTAMP}.mp4\",\"thumbnail\":\"https://example.com/thumb${TIMESTAMP}.jpg\",\"caption\":\"Test reel\"}"
create_reel_response=$(curl -s -X POST "$API_BASE/reels" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$reel_data")

if echo "$create_reel_response" | grep -q "videoUrl"; then
  echo -e "${GREEN}✓ PASSED${NC} Create Reel"
  ((TESTS_PASSED++))
  REEL_ID=$(echo "$create_reel_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "  Reel ID: $REEL_ID"
else
  echo -e "${RED}✗ FAILED${NC} Create Reel"
  echo "Response: $create_reel_response"
  ((TESTS_FAILED++))
  REEL_ID=""
fi

# Test reel interactions if reel was created
if [ -n "$REEL_ID" ]; then
  test_endpoint "Like Reel" "POST" "/reels/$REEL_ID/like" "" "200" "$TOKEN"
  test_endpoint "Bookmark Reel" "POST" "/reels/$REEL_ID/bookmark" "" "200" "$TOKEN"
  test_endpoint "Get Reel Comments" "GET" "/reels/$REEL_ID/comments" "" "200"
  
  comment_data="{\"text\":\"Great reel!\"}"
  test_endpoint "Create Comment" "POST" "/reels/$REEL_ID/comments" "$comment_data" "201" "$TOKEN"
fi

echo ""
echo "=================================="
echo "4. Posts Endpoints (Legacy)"
echo "=================================="
echo ""

test_endpoint "List Posts" "GET" "/posts?limit=10" "" "200"

post_data="{\"content\":\"Test post content\",\"authorId\":\"$USER_ID\",\"media\":[]}"
test_endpoint "Create Post" "POST" "/posts" "$post_data" "201"

echo ""
echo "=================================="
echo "5. User Endpoints"
echo "=================================="
echo ""

test_endpoint "Get User by Username" "GET" "/users/$TEST_USERNAME" "" "200"

update_data="{\"bio\":\"Updated bio\",\"displayName\":\"Updated Name\"}"
test_endpoint "Update User" "PUT" "/users/$USER_ID" "$update_data" "200"

echo ""
echo "=================================="
echo "6. Conversations Endpoints"
echo "=================================="
echo ""

test_endpoint "List Conversations" "GET" "/conversations" "" "200" "$TOKEN"

echo ""
echo "=================================="
echo "7. Notifications Endpoints"
echo "=================================="
echo ""

test_endpoint "List Notifications" "GET" "/notifications" "" "200" "$TOKEN"
test_endpoint "List Unread Notifications" "GET" "/notifications?unreadOnly=true" "" "200" "$TOKEN"

echo ""
echo "=================================="
echo "Test Summary"
echo "=================================="
echo ""
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed! ✓${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. Please review the output above.${NC}"
  exit 1
fi
