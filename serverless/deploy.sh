#!/bin/bash
# Quick Deploy Script for Project Valine Backend
# This script deploys the serverless backend to AWS

set -e

echo "=========================================="
echo "Project Valine - Backend Deployment"
echo "=========================================="
echo ""

cd "$(dirname "$0")"

# Step 1: Validate configuration
echo "Step 1: Validating configuration..."
bash validate-config.sh || {
  echo "❌ Configuration validation failed"
  exit 1
}

echo ""
echo "Step 2: Validating Prisma layer artifact..."
LAYER_ZIP="layers/prisma-layer.zip"
if [ ! -f "$LAYER_ZIP" ]; then
  echo "❌ ERROR: Prisma layer not found at $LAYER_ZIP"
  echo ""
  echo "The Prisma layer must be built before deployment."
  echo "Run one of the following commands first:"
  echo ""
  echo "  Linux/Mac:  ./scripts/build-prisma-layer.sh"
  echo "  Windows:    powershell -ExecutionPolicy Bypass -File scripts/build-prisma-layer.ps1"
  echo ""
  exit 1
fi

LAYER_SIZE=$(du -h "$LAYER_ZIP" | cut -f1)
echo "  ✅ Prisma layer found: $LAYER_ZIP ($LAYER_SIZE)"

echo ""
echo "Step 3: Deploying to AWS..."
echo "  Region: us-west-2"
echo "  Stage: prod"
echo "  Stack: pv-api-prod"
echo ""

# Check if .env.prod exists and source it
if [ -f ".env.prod" ]; then
  echo "  Loading environment variables from .env.prod..."
  set -a
  source .env.prod
  set +a
  echo "  ✅ Environment variables loaded"
fi

# Deploy
echo ""
echo "  Running deployment (this may take 2-3 minutes)..."
npx serverless deploy --stage prod --region us-west-2 --force

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Verify environment variables:"
echo "   aws lambda get-function-configuration --function-name pv-api-prod-register --region us-west-2 --query 'Environment.Variables'"
echo ""
echo "2. Test health endpoint:"
echo "   curl https://ce73w43mga.execute-api.us-west-2.amazonaws.com/health"
echo ""
echo "3. Test registration with allowlisted email:"
echo "   curl -X POST https://ce73w43mga.execute-api.us-west-2.amazonaws.com/auth/register \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"ghawk075@gmail.com\",\"username\":\"gcolon\",\"password\":\"TestPassword123!\",\"displayName\":\"Gabriel Colon\"}'"
echo ""
echo "4. Test registration with non-allowlisted email (should fail):"
echo "   curl -X POST https://ce73w43mga.execute-api.us-west-2.amazonaws.com/auth/register \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"hacker@evil.com\",\"username\":\"hacker\",\"password\":\"Test123!\",\"displayName\":\"Hacker\"}'"
echo ""
echo "5. Check CloudWatch logs:"
echo "   aws logs tail /aws/lambda/pv-api-prod-register --since 5m --region us-west-2"
echo ""
