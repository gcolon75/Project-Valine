#!/bin/bash

###############################################################################
# Pre-commit Secret Scan Hook
#
# This hook runs the secret-audit script before each commit to prevent
# accidental secret commits.
#
# Installation:
#   cp scripts/hooks/pre-commit-secret-scan.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# To bypass (use with caution):
#   git commit --no-verify
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Running secret scan...${NC}"

# Run secret audit on staged files only
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
  echo -e "${GREEN}✅ No files staged for commit${NC}"
  exit 0
fi

# Create temporary directory for scanning
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Export staged files to temp directory
for file in $STAGED_FILES; do
  # Skip binary files and directories
  if [ -f "$file" ]; then
    mkdir -p "$TEMP_DIR/$(dirname "$file")"
    git show ":$file" > "$TEMP_DIR/$file" 2>/dev/null
  fi
done

# Run secret audit on temp directory
cd "$(git rev-parse --show-toplevel)" || exit 1

if ! node scripts/secret-audit.mjs 2>&1 | grep -q "No secrets detected"; then
  echo -e "${RED}❌ Secret scan failed!${NC}"
  echo ""
  echo "Potential secrets detected in staged files."
  echo "Review the findings above and either:"
  echo "  1. Remove the secrets from your files"
  echo "  2. Add false positives to .secret-allowlist"
  echo "  3. Use 'git commit --no-verify' to bypass (NOT RECOMMENDED)"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ Secret scan passed${NC}"
exit 0
