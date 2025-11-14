#!/bin/bash
# Verification script for auth.js correctness
# Run this before deployment to ensure the file is ready

set -e

echo "========================================="
echo "Auth.js Pre-Deployment Verification"
echo "========================================="
echo ""

# Change to serverless directory
cd "$(dirname "$0")"

echo "✓ Checking file exists..."
if [ ! -f "src/handlers/auth.js" ]; then
    echo "✗ ERROR: src/handlers/auth.js not found"
    exit 1
fi

echo "✓ Checking Node.js syntax..."
node --check src/handlers/auth.js
if [ $? -ne 0 ]; then
    echo "✗ ERROR: Syntax check failed"
    exit 1
fi

echo "✓ Checking for duplicate exports..."
DUPLICATE_EXPORTS=$(grep -c "^export async function" src/handlers/auth.js || true)
if [ "$DUPLICATE_EXPORTS" -gt 0 ]; then
    echo "✗ ERROR: Found $DUPLICATE_EXPORTS 'export async function' statements"
    echo "  These cause duplicate export errors. Remove 'export' keyword."
    exit 1
fi

echo "✓ Checking for single export block..."
EXPORT_BLOCKS=$(grep -c "^export {" src/handlers/auth.js || true)
if [ "$EXPORT_BLOCKS" -ne 1 ]; then
    echo "✗ ERROR: Expected exactly 1 export block, found $EXPORT_BLOCKS"
    exit 1
fi

echo "✓ Checking for logging line..."
LOGGING_LINES=$(grep -c "\[LOGIN\] Raw body length:" src/handlers/auth.js || true)
if [ "$LOGGING_LINES" -lt 1 ]; then
    echo "⚠ WARNING: Logging line not found. This is needed for debugging."
fi

echo "✓ Verifying all required handlers are defined..."
REQUIRED_HANDLERS=(
    "login"
    "register"
    "me"
    "refresh"
    "logout"
    "verifyEmail"
    "resendVerification"
    "setup2FA"
    "enable2FA"
    "verify2FA"
    "disable2FA"
)

for handler in "${REQUIRED_HANDLERS[@]}"; do
    if ! grep -q "async function $handler" src/handlers/auth.js; then
        echo "✗ ERROR: Handler '$handler' not found"
        exit 1
    fi
done

echo "✓ Verifying handler exports..."
EXPORT_CONTENT=$(sed -n '/^export {/,/^}/p' src/handlers/auth.js)
for handler in "${REQUIRED_HANDLERS[@]}"; do
    if ! echo "$EXPORT_CONTENT" | grep -q "$handler"; then
        echo "✗ ERROR: Handler '$handler' not exported"
        exit 1
    fi
done

echo "✓ Checking for required imports..."
REQUIRED_IMPORTS=(
    "getPrisma"
    "getCorsHeaders"
    "bcrypt"
    "authenticator"
    "generateAccessToken"
    "generateRefreshToken"
)

for import in "${REQUIRED_IMPORTS[@]}"; do
    if ! grep -q "$import" src/handlers/auth.js; then
        echo "✗ ERROR: Required import '$import' not found"
        exit 1
    fi
done

echo ""
echo "========================================="
echo "✓ All verification checks passed!"
echo "========================================="
echo ""
echo "Handler count: $(grep -c '^async function' src/handlers/auth.js) async functions"
echo "Export count: $(echo "$EXPORT_CONTENT" | grep -o '  [a-zA-Z0-9]*,' | wc -l) handlers exported"
echo "File size: $(wc -l < src/handlers/auth.js) lines"
echo ""
echo "Ready for deployment!"
echo ""
echo "Next steps:"
echo "  1. Install serverless globally: npm install -g serverless"
echo "  2. Deploy: serverless deploy --stage prod --region us-west-2 --force"
echo "  3. Test: curl -X POST https://YOUR-API-URL/auth/login ..."
echo ""
