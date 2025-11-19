#!/bin/bash
# scripts/diagnose-white-screen.sh
# Bash version of diagnose-white-screen script
# Diagnoses common white screen issues for SPA deployments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
DOMAIN=""
VERBOSE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --domain|-d)
      DOMAIN="$2"
      shift 2
      ;;
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 --domain <domain> [--verbose]"
      echo ""
      echo "Options:"
      echo "  --domain, -d    Domain to diagnose (e.g., example.com)"
      echo "  --verbose, -v   Show verbose output"
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
echo -e "${BLUE}White Screen Diagnostic Tool (Bash)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Domain: ${GREEN}$DOMAIN${NC}"
echo ""

# Test 1: Check if domain is reachable
echo -e "${BLUE}[1/5] Checking domain reachability...${NC}"
if curl -s -I --max-time 10 "$DOMAIN" > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Domain is reachable"
else
  echo -e "${RED}✗${NC} Domain is not reachable"
  echo -e "  ${YELLOW}Check:${NC} DNS, SSL certificate, network connectivity"
  exit 1
fi
echo ""

# Test 2: Check HTTP headers
echo -e "${BLUE}[2/5] Checking HTTP headers...${NC}"
HEADERS=$(curl -s -I "$DOMAIN" 2>&1)

# Check Content-Type
if echo "$HEADERS" | grep -i "content-type" | grep -q "text/html"; then
  echo -e "${GREEN}✓${NC} Content-Type is text/html"
else
  echo -e "${YELLOW}⚠${NC} Content-Type is not text/html"
  if [ "$VERBOSE" = true ]; then
    echo "$HEADERS" | grep -i "content-type" || echo "  No Content-Type header found"
  fi
fi

# Check Cache-Control
if echo "$HEADERS" | grep -iq "cache-control"; then
  CACHE_CONTROL=$(echo "$HEADERS" | grep -i "cache-control" | cut -d: -f2- | tr -d '\r\n' | xargs)
  echo -e "${GREEN}✓${NC} Cache-Control: $CACHE_CONTROL"
else
  echo -e "${YELLOW}⚠${NC} No Cache-Control header found"
fi

# Check X-Cache (CloudFront)
if echo "$HEADERS" | grep -iq "x-cache"; then
  X_CACHE=$(echo "$HEADERS" | grep -i "x-cache" | cut -d: -f2- | tr -d '\r\n' | xargs)
  echo -e "${GREEN}✓${NC} X-Cache: $X_CACHE"
else
  echo -e "${YELLOW}ℹ${NC} No X-Cache header (not using CloudFront or cached)"
fi
echo ""

# Test 3: Check main JS bundle
echo -e "${BLUE}[3/5] Checking main JS bundle...${NC}"

# Fetch index.html and extract main JS path
INDEX_HTML=$(curl -s "$DOMAIN" 2>&1)
JS_PATH=$(echo "$INDEX_HTML" | grep -oP '<script[^>]+type="module"[^>]+src="\K[^"]+' | head -1)

if [ -n "$JS_PATH" ]; then
  # Construct full URL
  if [[ "$JS_PATH" =~ ^/ ]]; then
    JS_URL="$DOMAIN$JS_PATH"
  else
    JS_URL="$DOMAIN/$JS_PATH"
  fi
  
  echo -e "  Main JS: ${GREEN}$JS_PATH${NC}"
  
  # Check if JS is accessible
  JS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$JS_URL" 2>&1)
  
  if [ "$JS_STATUS" = "200" ]; then
    echo -e "${GREEN}✓${NC} JS bundle is accessible (HTTP $JS_STATUS)"
    
    # Check MIME type
    JS_CONTENT_TYPE=$(curl -s -I "$JS_URL" 2>&1 | grep -i "content-type" | cut -d: -f2- | tr -d '\r\n' | xargs)
    if echo "$JS_CONTENT_TYPE" | grep -qi "javascript"; then
      echo -e "${GREEN}✓${NC} MIME type is correct: $JS_CONTENT_TYPE"
    else
      echo -e "${RED}✗${NC} MIME type is incorrect: $JS_CONTENT_TYPE"
      echo -e "  ${YELLOW}Expected:${NC} application/javascript or text/javascript"
      echo -e "  ${YELLOW}Fix:${NC} Configure S3/CloudFront to serve .js files with correct MIME type"
    fi
  else
    echo -e "${RED}✗${NC} JS bundle returned HTTP $JS_STATUS"
    echo -e "  ${YELLOW}Common causes:${NC}"
    echo -e "    - Bundle was pruned but index.html still references it"
    echo -e "    - Deployment script didn't upload all files"
    echo -e "    - CloudFront cache invalidation didn't complete"
  fi
else
  echo -e "${RED}✗${NC} Could not find main JS bundle in index.html"
  if [ "$VERBOSE" = true ]; then
    echo ""
    echo "index.html content:"
    echo "$INDEX_HTML" | head -30
  fi
fi
echo ""

# Test 4: Check CSS bundle (optional)
echo -e "${BLUE}[4/5] Checking CSS bundle...${NC}"
CSS_PATH=$(echo "$INDEX_HTML" | grep -oP '<link[^>]+rel="stylesheet"[^>]+href="\K[^"]+' | head -1)

if [ -n "$CSS_PATH" ]; then
  if [[ "$CSS_PATH" =~ ^/ ]]; then
    CSS_URL="$DOMAIN$CSS_PATH"
  else
    CSS_URL="$DOMAIN/$CSS_PATH"
  fi
  
  echo -e "  Main CSS: ${GREEN}$CSS_PATH${NC}"
  
  CSS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$CSS_URL" 2>&1)
  
  if [ "$CSS_STATUS" = "200" ]; then
    echo -e "${GREEN}✓${NC} CSS bundle is accessible (HTTP $CSS_STATUS)"
  else
    echo -e "${YELLOW}⚠${NC} CSS bundle returned HTTP $CSS_STATUS"
  fi
else
  echo -e "${YELLOW}ℹ${NC} No CSS bundle found (may be inlined or optional)"
fi
echo ""

# Test 5: Check SPA routing (CloudFront function)
echo -e "${BLUE}[5/5] Checking SPA routing...${NC}"

# Test a deep link that should return index.html
DEEP_LINK="$DOMAIN/profile/test-user"
DEEP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEEP_LINK" 2>&1)

if [ "$DEEP_STATUS" = "200" ]; then
  echo -e "${GREEN}✓${NC} Deep link test passed (HTTP $DEEP_STATUS)"
  echo -e "  CloudFront function is correctly rewriting requests"
else
  echo -e "${YELLOW}⚠${NC} Deep link returned HTTP $DEEP_STATUS"
  if [ "$DEEP_STATUS" = "404" ] || [ "$DEEP_STATUS" = "403" ]; then
    echo -e "  ${YELLOW}Issue:${NC} CloudFront viewer-request function may not be attached"
    echo -e "  ${YELLOW}Fix:${NC} Run: ./scripts/cloudfront-associate-spa-function.ps1"
  fi
fi
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Diagnosis Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "For more details, check:"
echo -e "  - Browser console (F12) for JavaScript errors"
echo -e "  - Network tab (F12) for 404s or MIME type issues"
echo -e "  - docs/white-screen-runbook.md for troubleshooting guide"
