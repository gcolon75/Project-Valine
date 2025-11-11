#!/bin/bash

# Migration Verification Script
# Validates that all required staging migrations exist and are idempotent

set -e

echo "================================================"
echo "Staging Migrations Verification"
echo "================================================"
echo ""

MIGRATIONS_DIR="$(dirname "$0")/prisma/migrations"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Required migrations for staging first account
REQUIRED_MIGRATIONS=(
  "20251111191723_add_email_verification"
  "20251111193653_add_session_audits_2fa"
  "20251111201848_add_pr_intel_test_runs"
)

echo -e "${YELLOW}Checking required migration files...${NC}"
echo ""

MIGRATIONS_FOUND=0
MIGRATIONS_MISSING=0

# Check each migration exists
for migration in "${REQUIRED_MIGRATIONS[@]}"; do
  MIGRATION_DIR="$MIGRATIONS_DIR/$migration"
  MIGRATION_SQL="$MIGRATION_DIR/migration.sql"
  
  echo -n "  $migration... "
  
  if [ ! -d "$MIGRATION_DIR" ]; then
    echo -e "${RED}✗ MISSING (directory not found)${NC}"
    MIGRATIONS_MISSING=$((MIGRATIONS_MISSING + 1))
    continue
  fi
  
  if [ ! -f "$MIGRATION_SQL" ]; then
    echo -e "${RED}✗ MISSING (migration.sql not found)${NC}"
    MIGRATIONS_MISSING=$((MIGRATIONS_MISSING + 1))
    continue
  fi
  
  # Check for idempotent patterns (IF NOT EXISTS)
  IDEMPOTENT_COUNT=$(grep -c "IF NOT EXISTS\|IF EXISTS" "$MIGRATION_SQL" || echo "0")
  
  if [ "$IDEMPOTENT_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ FOUND (idempotent: $IDEMPOTENT_COUNT clauses)${NC}"
  else
    echo -e "${YELLOW}✓ FOUND (warning: may not be idempotent)${NC}"
  fi
  
  MIGRATIONS_FOUND=$((MIGRATIONS_FOUND + 1))
done

echo ""

if [ $MIGRATIONS_MISSING -gt 0 ]; then
  echo -e "${RED}✗ $MIGRATIONS_MISSING migration(s) missing!${NC}"
  echo "Expected migrations in $MIGRATIONS_DIR/"
  exit 1
fi

echo -e "${GREEN}✓ All $MIGRATIONS_FOUND required migrations found${NC}"
echo ""

# Display summary of each migration
echo -e "${BLUE}Migration Summary:${NC}"
echo ""

echo "1. 20251111191723_add_email_verification"
echo "   - Adds email verification to users table"
echo "   - Creates email_verification_tokens table"
echo ""

echo "2. 20251111193653_add_session_audits_2fa"
echo "   - Adds 2FA fields to users table"
echo "   - Creates refresh_tokens table for session tracking"
echo ""

echo "3. 20251111201848_add_pr_intel_test_runs"
echo "   - Creates pr_intelligence table"
echo "   - Creates test_runs table"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo -e "${YELLOW}⚠ DATABASE_URL not set.${NC}"
  echo ""
  echo "To apply migrations to database, run:"
  echo "  export DATABASE_URL='postgresql://USER:PASSWORD@HOST:PORT/DATABASE'"
  echo "  cd serverless"
  echo "  npx prisma migrate deploy"
  echo ""
  echo -e "${GREEN}✓ Migration files verified successfully${NC}"
  exit 0
fi

# If DATABASE_URL is set, offer to apply migrations
echo -e "${YELLOW}DATABASE_URL is set.${NC}"
echo ""
echo "To apply migrations, run:"
echo "  cd serverless"
echo "  npx prisma migrate deploy"
echo ""
echo "To check migration status:"
echo "  npx prisma migrate status"
echo ""
echo -e "${GREEN}✓ All migration files verified and ready to apply${NC}"
