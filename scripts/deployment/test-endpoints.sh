#!/bin/bash

# API Endpoint Testing Script for Project Valine
# Tests the deployed backend endpoints

set -e

echo "🧪 Project Valine - API Testing"
echo "==============================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if API_BASE is set
if [ -z "$API_BASE" ]; then
  echo -e "${RED}❌ Error: API_BASE environment variable is not set${NC}"
  echo ""
  echo "Please set your API Gateway URL:"
  echo "  export API_BASE=\"https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev\""
  exit 1
fi

echo -e "${GREEN}✓${NC} API_BASE: $API_BASE"
echo ""

# Test 1: Health Check
echo -e "${BLUE}Test 1: Health Check${NC}"
echo "GET $API_BASE/health"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓${NC} Health check passed"
  echo "   Response: $BODY"
else
  echo -e "${RED}✗${NC} Health check failed (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
fi
echo ""

# Test 2: Create User
echo -e "${BLUE}Test 2: Create User${NC}"
echo "POST $API_BASE/users"
USER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/users" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@valine.com",
    "displayName": "Test User",
    "bio": "This is a test account",
    "avatar": "https://i.pravatar.cc/150?img=1"
  }')

HTTP_CODE=$(echo "$USER_RESPONSE" | tail -n1)
BODY=$(echo "$USER_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓${NC} User created successfully"
  USER_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  echo "   User ID: $USER_ID"
else
  echo -e "${YELLOW}⚠${NC}  User creation returned HTTP $HTTP_CODE (may already exist)"
  echo "   Response: $BODY"
fi
echo ""

# Test 3: Get User Profile
echo -e "${BLUE}Test 3: Get User Profile${NC}"
echo "GET $API_BASE/users/testuser"
PROFILE_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/users/testuser")
HTTP_CODE=$(echo "$PROFILE_RESPONSE" | tail -n1)
BODY=$(echo "$PROFILE_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓${NC} Profile retrieved successfully"
  echo "   Response: $BODY" | head -c 200
  echo "..."
else
  echo -e "${RED}✗${NC} Failed to get profile (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
fi
echo ""

# Test 4: Create Post (if we have USER_ID)
if [ ! -z "$USER_ID" ]; then
  echo -e "${BLUE}Test 4: Create Post${NC}"
  echo "POST $API_BASE/posts"
  POST_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/posts" \
    -H "Content-Type: application/json" \
    -d "{
      \"content\": \"Hello from Project Valine! This is my first post.\",
      \"media\": [\"https://picsum.photos/400/300\"],
      \"authorId\": \"$USER_ID\"
    }")
  
  HTTP_CODE=$(echo "$POST_RESPONSE" | tail -n1)
  BODY=$(echo "$POST_RESPONSE" | head -n-1)
  
  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Post created successfully"
  else
    echo -e "${RED}✗${NC} Failed to create post (HTTP $HTTP_CODE)"
    echo "   Response: $BODY"
  fi
  echo ""
fi

# Test 5: List Posts
echo -e "${BLUE}Test 5: List Posts${NC}"
echo "GET $API_BASE/posts?limit=10"
POSTS_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/posts?limit=10")
HTTP_CODE=$(echo "$POSTS_RESPONSE" | tail -n1)
BODY=$(echo "$POSTS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓${NC} Posts retrieved successfully"
  POST_COUNT=$(echo "$BODY" | grep -o '"id":"[^"]*' | wc -l)
  echo "   Posts found: $POST_COUNT"
else
  echo -e "${RED}✗${NC} Failed to list posts (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
fi
echo ""

# Test 6: Auth Register Endpoint
echo -e "${BLUE}Test 6: Auth Register Endpoint${NC}"
echo "POST $API_BASE/auth/register"
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"testuser_'$(date +%s)'@example.com",
    "password":"securePass123",
    "username":"testuser'$(date +%s)'",
    "displayName":"Test User"
  }')
HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
BODY=$(echo "$REGISTER_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓${NC} User registered successfully"
  echo "   Response: $BODY" | head -c 200
  
  # Extract token if available
  TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  if [ ! -z "$TOKEN" ]; then
    echo "   Token received: ${TOKEN:0:20}..."
    export TEST_TOKEN="$TOKEN"
  fi
elif [ "$HTTP_CODE" = "409" ]; then
  echo -e "${YELLOW}⚠${NC}  User already exists (HTTP 409) - this is expected if running tests multiple times"
else
  echo -e "${RED}✗${NC} Registration failed (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
fi
echo ""

# Test 7: Auth Login Endpoint
echo -e "${BLUE}Test 7: Auth Login Endpoint${NC}"
echo "POST $API_BASE/auth/login (with invalid credentials - expect 400/401, not 404)"
AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}')
HTTP_CODE=$(echo "$AUTH_RESPONSE" | tail -n1)
BODY=$(echo "$AUTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓${NC} Auth endpoint accessible and correctly rejects bad credentials (HTTP $HTTP_CODE)"
  echo "   Response: $BODY" | head -c 200
elif [ "$HTTP_CODE" = "200" ]; then
  echo -e "${YELLOW}⚠${NC}  Login succeeded (HTTP 200) - user might exist from previous test"
else
  echo -e "${YELLOW}⚠${NC}  Auth endpoint returned HTTP $HTTP_CODE (expected 400/401 for bad creds)"
  echo "   Response: $BODY"
fi
echo ""

# Test 8: Auth /me Endpoint
echo -e "${BLUE}Test 8: Auth /me Endpoint${NC}"
if [ ! -z "$TEST_TOKEN" ]; then
  echo "GET $API_BASE/auth/me (with token from registration)"
  ME_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/auth/me" \
    -H "Authorization: Bearer $TEST_TOKEN")
  HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n1)
  BODY=$(echo "$ME_RESPONSE" | head -n-1)
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Current user retrieved successfully"
    echo "   Response: $BODY" | head -c 200
  else
    echo -e "${RED}✗${NC} Failed to get current user (HTTP $HTTP_CODE)"
    echo "   Response: $BODY"
  fi
else
  echo "GET $API_BASE/auth/me (without token - expect 401)"
  ME_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/auth/me")
  HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n1)
  BODY=$(echo "$ME_RESPONSE" | head -n-1)
  
  if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓${NC} Endpoint correctly requires authentication (HTTP 401)"
  else
    echo -e "${YELLOW}⚠${NC}  Expected 401 without token, got HTTP $HTTP_CODE"
    echo "   Response: $BODY"
  fi
fi
echo ""

# Test 9: Email Verification Endpoint
echo -e "${BLUE}Test 9: Email Verification Endpoint${NC}"
echo "POST $API_BASE/auth/verify-email (with invalid token - expect 400)"
VERIFY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid-token-12345"}')
HTTP_CODE=$(echo "$VERIFY_RESPONSE" | tail -n1)
BODY=$(echo "$VERIFY_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✓${NC} Verification endpoint accessible and correctly rejects invalid token (HTTP 400)"
  echo "   Response: $BODY" | head -c 200
else
  echo -e "${YELLOW}⚠${NC}  Expected 400 for invalid token, got HTTP $HTTP_CODE"
  echo "   Response: $BODY"
fi
echo ""

# Test 10: Resend Verification Endpoint
echo -e "${BLUE}Test 10: Resend Verification Endpoint${NC}"
if [ ! -z "$TEST_TOKEN" ]; then
  echo "POST $API_BASE/auth/resend-verification (with token)"
  RESEND_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/auth/resend-verification" \
    -H "Authorization: Bearer $TEST_TOKEN")
  HTTP_CODE=$(echo "$RESEND_RESPONSE" | tail -n1)
  BODY=$(echo "$RESEND_RESPONSE" | head -n-1)
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓${NC} Resend endpoint accessible (HTTP $HTTP_CODE)"
    echo "   Response: $BODY" | head -c 200
  else
    echo -e "${YELLOW}⚠${NC}  Unexpected response HTTP $HTTP_CODE"
    echo "   Response: $BODY"
  fi
else
  echo "POST $API_BASE/auth/resend-verification (without token - expect 401)"
  RESEND_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/auth/resend-verification")
  HTTP_CODE=$(echo "$RESEND_RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓${NC} Endpoint correctly requires authentication (HTTP 401)"
  else
    echo -e "${YELLOW}⚠${NC}  Expected 401 without token, got HTTP $HTTP_CODE"
  fi
fi
echo ""

echo "======================================"
echo -e "${GREEN}✅ API testing complete!${NC}"
echo ""
echo "Next steps:"
echo "  - Review the output above"
echo "  - Configure frontend with './scripts/deployment/configure-frontend.sh'"
echo "  - View logs: npx serverless logs -f getUser --stage dev --tail"
