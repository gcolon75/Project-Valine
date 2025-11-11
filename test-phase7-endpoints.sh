#!/bin/bash
# Manual testing script for Phase 7: Settings & Privacy endpoints
# Usage: ./test-phase7-endpoints.sh [API_BASE_URL] [AUTH_TOKEN]
#
# Example:
#   ./test-phase7-endpoints.sh http://localhost:4000 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

API_BASE="${1:-http://localhost:4000}"
AUTH_TOKEN="${2:-}"

if [ -z "$AUTH_TOKEN" ]; then
  echo "Error: AUTH_TOKEN is required"
  echo "Usage: $0 [API_BASE_URL] [AUTH_TOKEN]"
  exit 1
fi

echo "Testing Phase 7: Settings & Privacy Endpoints"
echo "=============================================="
echo "API Base: $API_BASE"
echo ""

# Test 1: GET /settings
echo "1. Testing GET /settings"
echo "------------------------"
curl -X GET "$API_BASE/settings" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

# Test 2: PUT /settings
echo "2. Testing PUT /settings"
echo "------------------------"
curl -X PUT "$API_BASE/settings" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notifications": {
      "email": true,
      "push": false
    },
    "privacy": {
      "showActivity": true
    }
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Test 3: POST /account/export
echo "3. Testing POST /account/export"
echo "--------------------------------"
curl -X POST "$API_BASE/account/export" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n" \
  | jq '.' 2>/dev/null || cat

# Note: DELETE /account is intentionally not tested here
# as it would delete the test account
echo ""
echo "4. DELETE /account (not tested - would delete account)"
echo "-------------------------------------------------------"
echo "To test manually:"
echo "curl -X DELETE \"$API_BASE/account\" \\"
echo "  -H \"Authorization: Bearer \$AUTH_TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"confirmPassword\": \"your-password\"}'"

echo ""
echo "=============================================="
echo "Phase 7 endpoint testing complete!"
