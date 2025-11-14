#!/bin/bash

# Test script for Profile & Settings API endpoints
# Usage: ./test-profile-endpoints.sh [API_BASE_URL] [AUTH_TOKEN]

# Set colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
API_BASE="${1:-https://your-api-gateway-url.amazonaws.com/dev}"
AUTH_TOKEN="${2:-}"

if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${YELLOW}Warning: No AUTH_TOKEN provided. Some tests will fail.${NC}"
  echo "Usage: $0 [API_BASE_URL] [AUTH_TOKEN]"
  echo ""
fi

echo "Testing API at: $API_BASE"
echo "================================"
echo ""

# Helper function to make API calls
api_call() {
  local method=$1
  local endpoint=$2
  local data=$3
  local auth_required=${4:-true}
  
  local headers="Content-Type: application/json"
  if [ "$auth_required" = true ] && [ -n "$AUTH_TOKEN" ]; then
    headers="$headers"$'\n'"Authorization: Bearer $AUTH_TOKEN"
  fi
  
  echo -e "${YELLOW}Testing: $method $endpoint${NC}"
  
  if [ -n "$data" ]; then
    response=$(curl -s -X "$method" "$API_BASE$endpoint" \
      -H "$headers" \
      -d "$data" \
      -w "\n%{http_code}")
  else
    response=$(curl -s -X "$method" "$API_BASE$endpoint" \
      -H "$headers" \
      -w "\n%{http_code}")
  fi
  
  # Split response and status code
  body=$(echo "$response" | head -n -1)
  status=$(echo "$response" | tail -n 1)
  
  if [ "$status" -ge 200 ] && [ "$status" -lt 300 ]; then
    echo -e "${GREEN}✓ Success (HTTP $status)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}✗ Failed (HTTP $status)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  fi
  
  echo ""
  
  # Return status code
  return $status
}

# Test Profile Endpoints
echo "=== PROFILE ENDPOINTS ==="
echo ""

# Create Profile
PROFILE_DATA='{
  "vanityUrl": "testuser-'$(date +%s)'",
  "headline": "Test Actor & Director",
  "bio": "This is a test profile",
  "roles": ["Actor", "Director"],
  "location": {"city": "Los Angeles", "state": "CA", "country": "USA"},
  "tags": ["test", "demo"],
  "socialLinks": {"website": "https://example.com"}
}'

echo "1. Create Profile"
api_call POST "/profiles" "$PROFILE_DATA"

# Get Profile by Vanity URL (public)
echo "2. Get Profile by Vanity URL (Public)"
api_call GET "/profiles/testuser" "" false

# Get Profile by ID (requires auth)
echo "3. Get Profile by ID (Auth Required)"
if [ -n "$AUTH_TOKEN" ]; then
  # Would need actual profile ID from creation
  echo "Skipped - requires profile ID from creation"
else
  echo "Skipped - no auth token"
fi
echo ""

# Update Profile
UPDATE_DATA='{
  "headline": "Updated Headline",
  "bio": "Updated bio"
}'

echo "4. Update Profile"
if [ -n "$AUTH_TOKEN" ]; then
  echo "Skipped - requires profile ID"
else
  echo "Skipped - no auth token"
fi
echo ""

# Test Media Endpoints
echo "=== MEDIA ENDPOINTS ==="
echo ""

# Get Upload URL
UPLOAD_DATA='{
  "type": "video",
  "title": "Test Demo Reel",
  "description": "Test video upload",
  "privacy": "public"
}'

echo "5. Get Upload URL"
if [ -n "$AUTH_TOKEN" ]; then
  echo "Skipped - requires profile ID"
else
  echo "Skipped - no auth token"
fi
echo ""

# Test Credits Endpoints
echo "=== CREDITS ENDPOINTS ==="
echo ""

# Create Credit
CREDIT_DATA='{
  "title": "Test Movie",
  "role": "Lead Actor",
  "company": "Test Studio",
  "year": 2024,
  "description": "Test credit"
}'

echo "6. Create Credit"
if [ -n "$AUTH_TOKEN" ]; then
  echo "Skipped - requires profile ID"
else
  echo "Skipped - no auth token"
fi
echo ""

# List Credits
echo "7. List Credits"
echo "Skipped - requires profile ID"
echo ""

# Test Settings Endpoints
echo "=== SETTINGS ENDPOINTS ==="
echo ""

# Get Settings
echo "8. Get Settings"
api_call GET "/settings" ""

# Update Settings
SETTINGS_DATA='{
  "notifications": {
    "email": true,
    "push": false
  },
  "privacy": {
    "allowMessagesFrom": "connections"
  }
}'

echo "9. Update Settings"
api_call PUT "/settings" "$SETTINGS_DATA"

# Test Reel Request Endpoints
echo "=== REEL REQUEST ENDPOINTS ==="
echo ""

# Create Reel Request
REQUEST_DATA='{
  "message": "Would love to see your work!"
}'

echo "10. Create Reel Request"
if [ -n "$AUTH_TOKEN" ]; then
  echo "Skipped - requires media ID"
else
  echo "Skipped - no auth token"
fi
echo ""

# List Reel Requests
echo "11. List Reel Requests"
api_call GET "/reel-requests?type=received" ""

# Test Search Endpoints
echo "=== SEARCH ENDPOINTS ==="
echo ""

# Search Profiles
echo "12. Search Profiles"
api_call GET "/search?query=actor&limit=5" "" false

# Search Users
echo "13. Search Users"
api_call GET "/search/users?query=test&limit=5" "" false

# Summary
echo "================================"
echo "Testing Complete!"
echo ""
echo "Note: Some tests were skipped because they require:"
echo "- Valid authentication token"
echo "- Profile/Media/Credit IDs from previous operations"
echo ""
echo "For full testing, run tests in this order:"
echo "1. Create profile → save profile ID"
echo "2. Create media → save media ID"
echo "3. Create credit → save credit ID"
echo "4. Test update/delete with saved IDs"
