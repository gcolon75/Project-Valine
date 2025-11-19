#!/bin/bash

# Test Auth Login Script
# 
# This script tests authentication by attempting to log in with credentials
# provided via environment variables. Use this to verify that test accounts
# can authenticate successfully.
#
# SECURITY WARNING: Never commit credentials to the repository!
# Only use this script in secure local or CI environments.
#
# Usage:
#   export TEST_EMAIL="user@example.com"
#   export TEST_PASSWORD="password123"
#   export API_BASE="https://fb9pxd6m09.execute-api.us-west-2.amazonaws.com"
#   ./scripts/test-auth-login.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required environment variables
if [ -z "$TEST_EMAIL" ]; then
  echo -e "${RED}Error: TEST_EMAIL environment variable not set${NC}"
  echo "Usage:"
  echo "  export TEST_EMAIL=\"user@example.com\""
  echo "  export TEST_PASSWORD=\"password123\""
  echo "  export API_BASE=\"https://your-api-domain.com\" (optional)"
  echo "  ./scripts/test-auth-login.sh"
  exit 1
fi

if [ -z "$TEST_PASSWORD" ]; then
  echo -e "${RED}Error: TEST_PASSWORD environment variable not set${NC}"
  echo "Usage:"
  echo "  export TEST_EMAIL=\"user@example.com\""
  echo "  export TEST_PASSWORD=\"password123\""
  echo "  export API_BASE=\"https://your-api-domain.com\" (optional)"
  echo "  ./scripts/test-auth-login.sh"
  exit 1
fi

# Default API base if not provided
if [ -z "$API_BASE" ]; then
  # Try to read from .env.production if it exists
  if [ -f ".env.production" ]; then
    API_BASE=$(grep VITE_API_BASE .env.production | cut -d '=' -f2 | tr -d '"' | tr -d "'")
  fi
  
  if [ -z "$API_BASE" ]; then
    echo -e "${YELLOW}Warning: API_BASE not set, using default${NC}"
    API_BASE="http://localhost:4000"
  fi
fi

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Test Auth Login                                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "API Base: $API_BASE"
echo "Email: $TEST_EMAIL"
echo "Password: ******* (hidden)"
echo ""

# Security warning
echo -e "${YELLOW}⚠ SECURITY WARNING ⚠${NC}"
echo "This script sends credentials over the network."
echo "Only use in secure test/development environments."
echo "Never commit credentials to version control."
echo ""

# Test login
echo "Attempting login..."
echo ""

LOGIN_URL="$API_BASE/auth/login"
PAYLOAD=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
EOF
)

# Make request and capture response
HTTP_CODE=$(curl -s -o /tmp/auth-response.json -w "%{http_code}" \
  -X POST "$LOGIN_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "HTTP Status: $HTTP_CODE"
echo ""

# Check response
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo -e "${GREEN}✓ Login successful!${NC}"
  echo ""
  echo "Response:"
  cat /tmp/auth-response.json | python3 -m json.tool 2>/dev/null || cat /tmp/auth-response.json
  echo ""
  
  # Extract token if present
  TOKEN=$(cat /tmp/auth-response.json | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  if [ -n "$TOKEN" ]; then
    echo "Token (first 20 chars): ${TOKEN:0:20}..."
  else
    echo "Note: Response does not include a token (may be using HttpOnly cookies)"
  fi
  
  # Extract user info if present
  USER_ID=$(cat /tmp/auth-response.json | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  if [ -n "$USER_ID" ]; then
    echo "User ID: $USER_ID"
  fi
  
  exit 0
elif [ "$HTTP_CODE" -eq 401 ]; then
  echo -e "${RED}✗ Login failed: Invalid credentials (401 Unauthorized)${NC}"
  echo ""
  echo "Response:"
  cat /tmp/auth-response.json | python3 -m json.tool 2>/dev/null || cat /tmp/auth-response.json
  echo ""
  echo "Possible causes:"
  echo "  - Incorrect email or password"
  echo "  - Account doesn't exist"
  echo "  - Account is disabled or locked"
  exit 1
elif [ "$HTTP_CODE" -eq 403 ]; then
  echo -e "${RED}✗ Login failed: Forbidden (403)${NC}"
  echo ""
  echo "Response:"
  cat /tmp/auth-response.json | python3 -m json.tool 2>/dev/null || cat /tmp/auth-response.json
  echo ""
  echo "Possible causes:"
  echo "  - Account requires email verification"
  echo "  - Account is suspended"
  echo "  - IP-based restriction (WAF/allowlist)"
  exit 1
elif [ "$HTTP_CODE" -eq 000 ]; then
  echo -e "${RED}✗ Connection failed: Could not reach API${NC}"
  echo ""
  echo "Possible causes:"
  echo "  - API endpoint is down or unreachable"
  echo "  - DNS resolution failure"
  echo "  - Network/firewall blocking connection"
  echo "  - Incorrect API_BASE URL"
  echo ""
  echo "Run diagnostics:"
  echo "  node scripts/check-auth-backend.js --domain \$(echo $API_BASE | sed 's|https://||' | sed 's|http://||' | cut -d'/' -f1)"
  exit 1
else
  echo -e "${RED}✗ Login failed with HTTP $HTTP_CODE${NC}"
  echo ""
  echo "Response:"
  cat /tmp/auth-response.json | python3 -m json.tool 2>/dev/null || cat /tmp/auth-response.json
  echo ""
  exit 1
fi

# Cleanup
rm -f /tmp/auth-response.json
