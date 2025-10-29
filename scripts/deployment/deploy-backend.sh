#!/bin/bash

# Backend Deployment Script for Project Valine
# Deploys the serverless backend to AWS

set -e

echo "🚀 Project Valine - Backend Deployment"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Default values
STAGE="${STAGE:-dev}"
REGION="${AWS_REGION:-us-west-2}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --stage)
      STAGE="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    --help)
      echo "Usage: ./deploy-backend.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --stage STAGE      Deployment stage (default: dev)"
      echo "  --region REGION    AWS region (default: us-west-2)"
      echo "  --help             Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  DATABASE_URL       Required - Database connection string"
      echo "  STAGE              Deployment stage (overridden by --stage)"
      echo "  AWS_REGION         AWS region (overridden by --region)"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo "Configuration:"
echo "  Stage:  $STAGE"
echo "  Region: $REGION"
echo ""

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ Error: DATABASE_URL environment variable is not set${NC}"
  echo ""
  echo "Set your database connection string:"
  echo "  export DATABASE_URL=\"postgresql://user:password@host:5432/valine_db\""
  exit 1
fi

echo -e "${GREEN}✓${NC} DATABASE_URL is configured"
echo ""

# Navigate to serverless directory
cd "$(dirname "$0")/../../serverless"

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Step 2: Generate Prisma Client for serverless
echo "🔧 Generating Prisma Client for serverless..."
cd ../api
npx prisma generate
cd ../serverless
echo -e "${GREEN}✓${NC} Prisma Client ready"
echo ""

# Step 3: Deploy to AWS
echo "☁️  Deploying to AWS..."
echo "   This may take a few minutes..."
npx serverless deploy --stage "$STAGE" --region "$REGION" --verbose

echo ""
echo -e "${GREEN}✅ Backend deployed successfully!${NC}"
echo ""
echo "📝 Save your API Gateway URL from the output above"
echo ""
echo "Next steps:"
echo "  1. Test your endpoints with './scripts/deployment/test-endpoints.sh'"
echo "  2. Update frontend with './scripts/deployment/configure-frontend.sh'"
