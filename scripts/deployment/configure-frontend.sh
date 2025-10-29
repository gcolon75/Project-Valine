#!/bin/bash

# Frontend Configuration Script for Project Valine
# Updates environment variables to connect to the backend API

set -e

echo "⚙️  Project Valine - Frontend Configuration"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse command line arguments
API_URL=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --api-url)
      API_URL="$2"
      shift 2
      ;;
    --help)
      echo "Usage: ./configure-frontend.sh --api-url <API_GATEWAY_URL>"
      echo ""
      echo "Options:"
      echo "  --api-url URL    API Gateway URL from backend deployment"
      echo "  --help           Show this help message"
      echo ""
      echo "Example:"
      echo "  ./configure-frontend.sh --api-url https://abc123.execute-api.us-west-2.amazonaws.com/dev"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Interactive mode if API_URL not provided
if [ -z "$API_URL" ]; then
  echo "Please enter your API Gateway URL"
  echo "(e.g., https://abc123.execute-api.us-west-2.amazonaws.com/dev):"
  read -r API_URL
fi

if [ -z "$API_URL" ]; then
  echo -e "${RED}❌ Error: API URL is required${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} API URL: $API_URL"
echo ""

# Navigate to project root
cd "$(dirname "$0")/../.."

# Create or update .env file
echo "📝 Updating .env file..."
if [ -f .env ]; then
  # Backup existing .env
  cp .env .env.backup
  echo -e "${YELLOW}⚠${NC}  Backed up existing .env to .env.backup"
fi

# Update or create .env
cat > .env << EOF
# API Configuration
VITE_API_BASE=$API_URL

# Database (backend only - not used by frontend)
# This is set in AWS Lambda environment or serverless.yml
# DATABASE_URL=postgresql://user:password@host:5432/valine_db
EOF

echo -e "${GREEN}✓${NC} .env file updated"
echo ""

# Update .env.example
echo "📝 Updating .env.example..."
cat > .env.example << EOF
# Vite environment variable for the backend API base URL
# For local development, run the serverless backend locally on port 3001
# For production, use your AWS API Gateway URL (e.g., https://abc123.execute-api.us-west-2.amazonaws.com)
VITE_API_BASE=http://localhost:3001

# Database connection string (for serverless backend)
# This should be set in AWS Lambda environment or locally for development
# Replace 'your_username', 'your_password', and database details with actual values
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/valine_db
EOF

echo -e "${GREEN}✓${NC} .env.example updated"
echo ""

# Test the API connection
echo "🔍 Testing API connection..."
if command -v curl &> /dev/null; then
  HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" || echo "000")
  if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✓${NC} API is accessible and responding"
  else
    echo -e "${YELLOW}⚠${NC}  API returned HTTP $HEALTH_CHECK (expected 200)"
    echo "   This may be normal if health endpoint is not configured"
  fi
else
  echo -e "${YELLOW}⚠${NC}  curl not found, skipping connection test"
fi
echo ""

echo -e "${GREEN}✅ Frontend configured successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Test locally: npm run dev"
echo "  2. Build for production: npm run build"
echo "  3. Deploy: git add .env && git commit -m \"Configure API base URL\" && git push"
echo ""
echo "Note: The .env file is gitignored. For production deployment:"
echo "  - Set VITE_API_BASE as a GitHub secret/variable"
echo "  - Or use the GitHub Actions workflow to deploy with the correct URL"
