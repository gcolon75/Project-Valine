#!/bin/bash
# scripts/assert-headers.sh
# Bash version of assert-headers script
# Validates that critical security and caching headers are present

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
DOMAIN=""
STRICT=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --domain|-d)
      DOMAIN="$2"
      shift 2
      ;;
    --strict|-s)
      STRICT=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 --domain <domain> [--strict]"
      echo ""
      echo "Options:"
      echo "  --domain, -d    Domain to check (e.g., example.com)"
      echo "  --strict, -s    Exit with error if any header is missing"
      echo "  --help, -h      Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

if [ -z "$DOMAIN" ]; then
  echo -e "${RED}Error: --domain is required${NC}"
  echo "Use --help for usage information"
  exit 1
fi

# Ensure domain has protocol
if [[ ! "$DOMAIN" =~ ^https?:// ]]; then
  DOMAIN="https://$DOMAIN"
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}HTTP Headers Assertion Tool (Bash)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Domain: ${GREEN}$DOMAIN${NC}"
echo -e "Mode:   ${STRICT:-false} && echo -n \"${YELLOW}STRICT${NC}\" || echo -n \"${GREEN}NORMAL${NC}\""
echo ""

# Fetch headers
echo -e "${BLUE}Fetching headers...${NC}"
HEADERS=$(curl -s -I "$DOMAIN" 2>&1)

if [ $? -ne 0 ]; then
  echo -e "${RED}✗${NC} Failed to fetch headers from $DOMAIN"
  exit 1
fi

echo ""

# Track overall status
ALL_PASSED=true

# Helper function to check header
check_header() {
  local header_name="$1"
  local required="$2"
  local expected_value="$3"
  
  if echo "$HEADERS" | grep -iq "^$header_name:"; then
    local value=$(echo "$HEADERS" | grep -i "^$header_name:" | cut -d: -f2- | tr -d '\r\n' | xargs)
    
    if [ -z "$expected_value" ]; then
      echo -e "${GREEN}✓${NC} $header_name: $value"
    else
      if echo "$value" | grep -q "$expected_value"; then
        echo -e "${GREEN}✓${NC} $header_name: $value"
      else
        echo -e "${YELLOW}⚠${NC} $header_name: $value"
        echo -e "  ${YELLOW}Expected:${NC} $expected_value"
        if [ "$required" = "true" ]; then
          ALL_PASSED=false
        fi
      fi
    fi
  else
    if [ "$required" = "true" ]; then
      echo -e "${RED}✗${NC} $header_name: ${RED}MISSING${NC}"
      ALL_PASSED=false
    else
      echo -e "${YELLOW}⚠${NC} $header_name: ${YELLOW}MISSING (optional)${NC}"
    fi
  fi
}

# Security Headers
echo -e "${BLUE}Security Headers:${NC}"
check_header "X-Content-Type-Options" true "nosniff"
check_header "X-Frame-Options" true "DENY\|SAMEORIGIN"
check_header "Referrer-Policy" false "strict-origin-when-cross-origin\|no-referrer"
check_header "Permissions-Policy" false ""
echo ""

# Caching Headers
echo -e "${BLUE}Caching Headers:${NC}"
check_header "Cache-Control" true ""
check_header "ETag" false ""
check_header "Last-Modified" false ""
echo ""

# CloudFront Headers (if applicable)
echo -e "${BLUE}CloudFront Headers (if applicable):${NC}"
check_header "X-Cache" false "Hit\|Miss\|RefreshHit"
check_header "X-Amz-Cf-Id" false ""
check_header "X-Amz-Cf-Pop" false ""
echo ""

# CSP Header (optional but recommended)
echo -e "${BLUE}Content Security Policy:${NC}"
if echo "$HEADERS" | grep -iq "^content-security-policy:"; then
  CSP=$(echo "$HEADERS" | grep -i "^content-security-policy:" | cut -d: -f2- | tr -d '\r\n' | xargs)
  echo -e "${GREEN}✓${NC} Content-Security-Policy present"
  
  # Check for common CSP directives
  if echo "$CSP" | grep -q "default-src"; then
    echo -e "  ${GREEN}✓${NC} Contains default-src"
  else
    echo -e "  ${YELLOW}⚠${NC} Missing default-src directive"
  fi
  
  if echo "$CSP" | grep -q "script-src"; then
    echo -e "  ${GREEN}✓${NC} Contains script-src"
  else
    echo -e "  ${YELLOW}⚠${NC} Missing script-src directive"
  fi
else
  echo -e "${YELLOW}⚠${NC} Content-Security-Policy: ${YELLOW}MISSING (recommended)${NC}"
  if [ "$STRICT" = true ]; then
    ALL_PASSED=false
  fi
fi
echo ""

# HTTPS/TLS Headers
echo -e "${BLUE}HTTPS/TLS:${NC}"
check_header "Strict-Transport-Security" true "max-age="

if [[ "$DOMAIN" =~ ^https:// ]]; then
  echo -e "${GREEN}✓${NC} Using HTTPS"
else
  echo -e "${RED}✗${NC} Not using HTTPS"
  ALL_PASSED=false
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
if [ "$ALL_PASSED" = true ]; then
  echo -e "${GREEN}✓ All required headers present${NC}"
  echo -e "${BLUE}========================================${NC}"
  exit 0
else
  echo -e "${RED}✗ Some required headers are missing${NC}"
  echo -e "${BLUE}========================================${NC}"
  
  if [ "$STRICT" = true ]; then
    echo ""
    echo -e "${YELLOW}Fix these issues and try again${NC}"
    exit 1
  else
    echo ""
    echo -e "${YELLOW}Run with --strict to enforce all checks${NC}"
    exit 0
  fi
fi
