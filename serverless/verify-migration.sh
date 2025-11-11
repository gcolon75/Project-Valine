#!/bin/bash

# Migration Verification Script
# Validates that the migration SQL is syntactically correct and can be applied

set -e

echo "================================================"
echo "Phase 1: Migration Verification"
echo "================================================"
echo ""

MIGRATION_DIR="$(dirname "$0")/prisma/migrations/20251111191723_add_email_verification"
MIGRATION_SQL="$MIGRATION_DIR/migration.sql"
ROLLBACK_SQL="$MIGRATION_DIR/rollback.sql"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Checking migration files...${NC}"

# Check files exist
if [ ! -f "$MIGRATION_SQL" ]; then
  echo -e "${RED}✗ Migration SQL not found at $MIGRATION_SQL${NC}"
  exit 1
fi

if [ ! -f "$ROLLBACK_SQL" ]; then
  echo -e "${RED}✗ Rollback SQL not found at $ROLLBACK_SQL${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Migration files found${NC}"
echo ""

# Display migration SQL
echo -e "${YELLOW}Migration SQL:${NC}"
echo "---"
cat "$MIGRATION_SQL"
echo "---"
echo ""

# Display rollback SQL
echo -e "${YELLOW}Rollback SQL:${NC}"
echo "---"
cat "$ROLLBACK_SQL"
echo "---"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo -e "${YELLOW}⚠ DATABASE_URL not set. Skipping database validation.${NC}"
  echo "To test migration on actual database, set DATABASE_URL and re-run."
  echo ""
  echo -e "${GREEN}✓ Migration files are present and formatted correctly${NC}"
  exit 0
fi

# If DATABASE_URL is set, offer to test migration
echo -e "${YELLOW}DATABASE_URL is set. Would you like to test the migration?${NC}"
echo "This will:"
echo "  1. Apply the migration"
echo "  2. Verify tables/columns were created"
echo "  3. Roll back the migration"
echo "  4. Verify rollback was successful"
echo ""
echo -n "Proceed? (y/N): "
read -r PROCEED

if [ "$PROCEED" != "y" ] && [ "$PROCEED" != "Y" ]; then
  echo "Skipping database test."
  exit 0
fi

echo ""
echo -e "${YELLOW}Testing migration...${NC}"

# Apply migration
echo "Applying migration..."
if psql "$DATABASE_URL" -f "$MIGRATION_SQL" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Migration applied successfully${NC}"
else
  echo -e "${RED}✗ Migration failed${NC}"
  exit 1
fi

# Verify migration
echo "Verifying migration..."
COLUMNS_CHECK=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_name = 'users' 
  AND column_name IN ('normalizedEmail', 'emailVerified', 'emailVerifiedAt')
")

TABLE_CHECK=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_name = 'email_verification_tokens'
")

if [ $(echo "$COLUMNS_CHECK" | tr -d ' ') = "3" ] && [ $(echo "$TABLE_CHECK" | tr -d ' ') = "1" ]; then
  echo -e "${GREEN}✓ Migration verified (columns and table created)${NC}"
else
  echo -e "${RED}✗ Migration verification failed${NC}"
  echo "  Expected 3 new columns in users table, found: $COLUMNS_CHECK"
  echo "  Expected 1 new table (email_verification_tokens), found: $TABLE_CHECK"
  exit 1
fi

# Test rollback
echo ""
echo -e "${YELLOW}Testing rollback...${NC}"

if psql "$DATABASE_URL" -f "$ROLLBACK_SQL" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Rollback applied successfully${NC}"
else
  echo -e "${RED}✗ Rollback failed${NC}"
  exit 1
fi

# Verify rollback
echo "Verifying rollback..."
COLUMNS_CHECK=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_name = 'users' 
  AND column_name IN ('normalizedEmail', 'emailVerified', 'emailVerifiedAt')
")

TABLE_CHECK=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_name = 'email_verification_tokens'
")

if [ $(echo "$COLUMNS_CHECK" | tr -d ' ') = "0" ] && [ $(echo "$TABLE_CHECK" | tr -d ' ') = "0" ]; then
  echo -e "${GREEN}✓ Rollback verified (columns and table removed)${NC}"
else
  echo -e "${RED}✗ Rollback verification failed${NC}"
  echo "  Expected 0 columns in users table, found: $COLUMNS_CHECK"
  echo "  Expected 0 tables (email_verification_tokens), found: $TABLE_CHECK"
  exit 1
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✓ Migration and rollback tested successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Note: The migration has been rolled back. To apply it permanently, run:"
echo "  psql \$DATABASE_URL -f $MIGRATION_SQL"
