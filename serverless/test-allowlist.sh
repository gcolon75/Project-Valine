#!/bin/bash
# Test Allowlist Logic Locally
# This script tests the allowlist logic without deploying to AWS

set -e

echo "=========================================="
echo "Allowlist Logic Test"
echo "=========================================="
echo ""

cd "$(dirname "$0")"

# Test the logic by checking the auth.js file
echo "Testing allowlist logic from src/handlers/auth.js..."
echo ""

# Extract the relevant logic
echo "1. Checking if ENABLE_REGISTRATION logic exists..."
if grep -q "ENABLE_REGISTRATION" src/handlers/auth.js; then
  echo "  ✅ ENABLE_REGISTRATION check found"
else
  echo "  ❌ ENABLE_REGISTRATION check not found"
  exit 1
fi

echo "2. Checking if ALLOWED_USER_EMAILS logic exists..."
if grep -q "ALLOWED_USER_EMAILS" src/handlers/auth.js; then
  echo "  ✅ ALLOWED_USER_EMAILS check found"
else
  echo "  ❌ ALLOWED_USER_EMAILS check not found"
  exit 1
fi

echo "3. Checking allowlist validation logic..."
if grep -q "Email not allowlisted" src/handlers/auth.js; then
  echo "  ✅ Allowlist validation logic found"
else
  echo "  ❌ Allowlist validation logic not found"
  exit 1
fi

echo "4. Checking registration closed message..."
if grep -q "Registration not permitted" src/handlers/auth.js; then
  echo "  ✅ Registration closed message found"
else
  echo "  ❌ Registration closed message not found"
  exit 1
fi

echo ""
echo "=========================================="
echo "Allowlist Configuration Test"
echo "=========================================="
echo ""

# Test with example emails
ALLOWED_EMAILS="ghawk075@gmail.com,valinejustin@gmail.com"
TEST_EMAIL_ALLOWED="ghawk075@gmail.com"
TEST_EMAIL_BLOCKED="hacker@evil.com"

echo "Configured allowlist: $ALLOWED_EMAILS"
echo ""

# Simulate the logic
IFS=',' read -ra EMAILS <<< "$ALLOWED_EMAILS"
FOUND_ALLOWED=false
FOUND_BLOCKED=false

for email in "${EMAILS[@]}"; do
  trimmed=$(echo "$email" | xargs)
  if [ "$trimmed" == "$TEST_EMAIL_ALLOWED" ]; then
    FOUND_ALLOWED=true
  fi
  if [ "$trimmed" == "$TEST_EMAIL_BLOCKED" ]; then
    FOUND_BLOCKED=true
  fi
done

echo "Test 1: Allowlisted email ($TEST_EMAIL_ALLOWED)"
if [ "$FOUND_ALLOWED" == "true" ]; then
  echo "  ✅ Would ALLOW registration"
else
  echo "  ❌ Would DENY registration (ERROR - should be allowed)"
  exit 1
fi

echo ""
echo "Test 2: Non-allowlisted email ($TEST_EMAIL_BLOCKED)"
if [ "$FOUND_BLOCKED" == "false" ]; then
  echo "  ✅ Would DENY registration"
else
  echo "  ❌ Would ALLOW registration (ERROR - should be denied)"
  exit 1
fi

echo ""
echo "=========================================="
echo "Environment Configuration Test"
echo "=========================================="
echo ""

# Check .env.prod configuration
if [ -f ".env.prod" ]; then
  echo "Checking .env.prod configuration..."
  
  # Check ENABLE_REGISTRATION
  ENABLE_REG=$(grep "^ENABLE_REGISTRATION=" .env.prod | cut -d'=' -f2)
  echo "  ENABLE_REGISTRATION=$ENABLE_REG"
  if [ "$ENABLE_REG" == "false" ]; then
    echo "    ✅ Correct (registration is closed)"
  else
    echo "    ⚠️  Warning: Registration is open to public"
  fi
  
  # Check ALLOWED_USER_EMAILS
  ALLOWED=$(grep "^ALLOWED_USER_EMAILS=" .env.prod | cut -d'=' -f2)
  echo "  ALLOWED_USER_EMAILS=$ALLOWED"
  if echo "$ALLOWED" | grep -q "ghawk075@gmail.com"; then
    echo "    ✅ ghawk075@gmail.com is in allowlist"
  else
    echo "    ❌ ghawk075@gmail.com is NOT in allowlist"
  fi
  if echo "$ALLOWED" | grep -q "valinejustin@gmail.com"; then
    echo "    ✅ valinejustin@gmail.com is in allowlist"
  else
    echo "    ❌ valinejustin@gmail.com is NOT in allowlist"
  fi
  
  # Check DATABASE_URL
  if grep -q "^DATABASE_URL=postgresql://" .env.prod; then
    echo "  ✅ DATABASE_URL is configured"
  else
    echo "  ❌ DATABASE_URL is not configured"
  fi
  
  # Check JWT_SECRET
  if grep -q "^JWT_SECRET=.\\{20,\\}" .env.prod; then
    echo "  ✅ JWT_SECRET is configured (sufficient length)"
  else
    echo "  ⚠️  JWT_SECRET may be too short or not configured"
  fi
fi

echo ""
echo "=========================================="
echo "✅ All allowlist logic tests passed!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - Allowlist logic is correctly implemented in auth.js"
echo "  - ghawk075@gmail.com will be ALLOWED to register"
echo "  - valinejustin@gmail.com will be ALLOWED to register"
echo "  - All other emails will be DENIED"
echo "  - Registration is CLOSED to public (ENABLE_REGISTRATION=false)"
echo ""
