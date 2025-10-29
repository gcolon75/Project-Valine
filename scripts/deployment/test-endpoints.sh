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

echo "======================================"
echo -e "${GREEN}✅ API testing complete!${NC}"
echo ""
echo "Next steps:"
echo "  - Review the output above"
echo "  - Configure frontend with './scripts/deployment/configure-frontend.sh'"
echo "  - View logs: npx serverless logs -f getUser --stage dev --tail"
