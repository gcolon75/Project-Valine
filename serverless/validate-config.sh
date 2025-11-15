#!/bin/bash
# Serverless Configuration Validation Script
# This script validates the serverless.yml before deployment

set -e

echo "=========================================="
echo "Serverless Configuration Validation"
echo "=========================================="
echo ""

cd "$(dirname "$0")"

# Check 1: YAML Syntax
echo "✓ Checking YAML syntax..."
npx js-yaml serverless.yml > /dev/null 2>&1 && echo "  ✅ YAML syntax is valid" || {
  echo "  ❌ YAML syntax error detected"
  exit 1
}

# Check 2: Verify Prisma layer exists
echo "✓ Checking Prisma layer..."
if [ -f "layers/prisma-layer.zip" ]; then
  SIZE=$(du -h layers/prisma-layer.zip | cut -f1)
  echo "  ✅ Prisma layer exists: $SIZE"
else
  echo "  ❌ Prisma layer not found at layers/prisma-layer.zip"
  exit 1
fi

# Check 3: Count functions
echo "✓ Counting Lambda functions..."
FUNCTION_COUNT=$(sed -n '/^functions:/,$p' serverless.yml | grep "^  [a-zA-Z]" | wc -l)
echo "  ✅ Found $FUNCTION_COUNT functions defined"

# Check 4: Verify critical functions exist
echo "✓ Verifying critical functions..."
CRITICAL_FUNCTIONS=("health" "register" "login" "me" "analyticsCleanup")
for func in "${CRITICAL_FUNCTIONS[@]}"; do
  if grep -q "^  $func:" serverless.yml; then
    echo "  ✅ $func function exists"
  else
    echo "  ❌ $func function not found"
    exit 1
  fi
done

# Check 5: Verify environment variables section
echo "✓ Checking environment variables configuration..."
REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "ALLOWED_USER_EMAILS" "ENABLE_REGISTRATION")
for var in "${REQUIRED_VARS[@]}"; do
  if grep -q "$var:" serverless.yml; then
    echo "  ✅ $var is configured"
  else
    echo "  ❌ $var not found in serverless.yml"
    exit 1
  fi
done

# Check 6: Verify .env.prod exists
echo "✓ Checking .env.prod file..."
if [ -f ".env.prod" ]; then
  echo "  ✅ .env.prod exists"
  
  # Check if sensitive values are set
  if grep -q "DATABASE_URL=postgresql://" .env.prod; then
    echo "  ✅ DATABASE_URL is configured in .env.prod"
  else
    echo "  ⚠️  DATABASE_URL may need to be set in .env.prod"
  fi
  
  if grep -q "JWT_SECRET=.*" .env.prod && ! grep -q "JWT_SECRET=your-jwt-secret" .env.prod; then
    echo "  ✅ JWT_SECRET is configured in .env.prod"
  else
    echo "  ⚠️  JWT_SECRET may need to be set in .env.prod"
  fi
else
  echo "  ⚠️  .env.prod not found (will use environment variables)"
fi

# Check 7: Verify package.json exists
echo "✓ Checking package.json..."
if [ -f "package.json" ]; then
  echo "  ✅ package.json exists"
else
  echo "  ❌ package.json not found"
  exit 1
fi

# Check 8: Verify serverless-esbuild plugin
echo "✓ Checking serverless plugins..."
if grep -q "serverless-esbuild" serverless.yml; then
  echo "  ✅ serverless-esbuild plugin configured"
else
  echo "  ❌ serverless-esbuild plugin not found"
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ All validation checks passed!"
echo "=========================================="
echo ""
echo "Ready to deploy with:"
echo "  npx serverless deploy --stage prod --region us-west-2 --force"
echo ""
echo "Or test locally first with:"
echo "  npx serverless offline"
echo ""
