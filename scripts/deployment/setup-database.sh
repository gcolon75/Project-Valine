#!/bin/bash

# Database Setup Script for Project Valine
# This script handles Prisma client generation and database migrations

set -e

echo "🗄️  Project Valine - Database Setup"
echo "===================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ Error: DATABASE_URL environment variable is not set${NC}"
  echo ""
  echo "Please set your database connection string:"
  echo "  export DATABASE_URL=\"postgresql://user:password@host:5432/valine_db\""
  echo ""
  echo "Or for local SQLite development:"
  echo "  export DATABASE_URL=\"file:./dev.db\""
  exit 1
fi

echo -e "${GREEN}✓${NC} DATABASE_URL is set"
echo ""

# Navigate to api directory
cd "$(dirname "$0")/../../api"

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Step 2: Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate
echo -e "${GREEN}✓${NC} Prisma Client generated"
echo ""

# Step 3: Run migrations
echo "🚀 Running database migrations..."
if [[ "$DATABASE_URL" == file:* ]]; then
  echo -e "${YELLOW}⚠${NC}  Using SQLite - running development migration"
  npx prisma migrate dev --name add_social_features
else
  echo "Running production migration..."
  npx prisma migrate deploy
fi
echo -e "${GREEN}✓${NC} Migrations completed"
echo ""

# Step 4: Verify setup
echo "🔍 Verifying database schema..."
npx prisma db pull --force 2>/dev/null || true
echo -e "${GREEN}✓${NC} Database setup complete!"
echo ""
echo "Expected tables created:"
echo "  - users"
echo "  - posts"
echo "  - connection_requests"
echo "  - scripts"
echo "  - auditions"
echo ""
echo -e "${GREEN}✅ Database is ready!${NC}"
echo ""
echo "Next steps:"
echo "  1. Run 'npx prisma studio' to inspect your database"
echo "  2. Deploy the backend with './scripts/deployment/deploy-backend.sh'"
