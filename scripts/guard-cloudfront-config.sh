#!/bin/bash
# scripts/guard-cloudfront-config.sh
# Bash version of guard-cloudfront-config script
# Validates CloudFront distribution configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
DISTRIBUTION_ID=""
CHECK_LOCAL_FILE=false
LOCAL_FILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --distribution-id|-d)
      DISTRIBUTION_ID="$2"
      shift 2
      ;;
    --file|-f)
      CHECK_LOCAL_FILE=true
      LOCAL_FILE="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [--distribution-id <id>] [--file <config.json>]"
      echo ""
      echo "Options:"
      echo "  --distribution-id, -d   CloudFront distribution ID to check"
      echo "  --file, -f              Check a local config JSON file instead"
      echo "  --help, -h              Show this help message"
      echo ""
      echo "Note: Requires AWS CLI to be configured when using --distribution-id"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CloudFront Config Guard (Bash)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Track overall status
ALL_CHECKS_PASSED=true

# Function to check configuration
check_config() {
  local config="$1"
  
  echo -e "${BLUE}Checking configuration...${NC}"
  echo ""
  
  # Check 1: SPA viewer-request function attached
  echo -e "${BLUE}[1/5] SPA Routing Function${NC}"
  if echo "$config" | grep -q "viewer-request"; then
    FUNCTION_ARN=$(echo "$config" | grep -A5 "viewer-request" | grep -oP '"FunctionARN"\s*:\s*"\K[^"]+' | head -1)
    if [ -n "$FUNCTION_ARN" ]; then
      echo -e "${GREEN}✓${NC} Viewer-request function attached"
      echo -e "  ARN: $FUNCTION_ARN"
    else
      echo -e "${YELLOW}⚠${NC} Viewer-request function structure found but ARN missing"
      ALL_CHECKS_PASSED=false
    fi
  else
    echo -e "${RED}✗${NC} No viewer-request function found"
    echo -e "  ${YELLOW}Impact:${NC} Deep links will return 404 instead of serving index.html"
    echo -e "  ${YELLOW}Fix:${NC} Attach SPA routing function to distribution"
    ALL_CHECKS_PASSED=false
  fi
  echo ""
  
  # Check 2: Default root object
  echo -e "${BLUE}[2/5] Default Root Object${NC}"
  if echo "$config" | grep -q '"DefaultRootObject"'; then
    ROOT_OBJ=$(echo "$config" | grep -oP '"DefaultRootObject"\s*:\s*"\K[^"]+' | head -1)
    if [ "$ROOT_OBJ" = "index.html" ]; then
      echo -e "${GREEN}✓${NC} Default root object is index.html"
    else
      echo -e "${YELLOW}⚠${NC} Default root object is: $ROOT_OBJ"
      echo -e "  ${YELLOW}Expected:${NC} index.html"
    fi
  else
    echo -e "${RED}✗${NC} No default root object configured"
    ALL_CHECKS_PASSED=false
  fi
  echo ""
  
  # Check 3: Custom error responses for SPA
  echo -e "${BLUE}[3/5] Custom Error Responses${NC}"
  if echo "$config" | grep -q '"CustomErrorResponses"'; then
    if echo "$config" | grep -A10 '"CustomErrorResponses"' | grep -q '"ErrorCode"\s*:\s*403'; then
      echo -e "${GREEN}✓${NC} 403 → 200 redirect configured (for S3 SPA)"
    else
      echo -e "${YELLOW}⚠${NC} No 403 error handling found"
    fi
    
    if echo "$config" | grep -A10 '"CustomErrorResponses"' | grep -q '"ErrorCode"\s*:\s*404'; then
      echo -e "${GREEN}✓${NC} 404 → 200 redirect configured (for SPA routing)"
    else
      echo -e "${YELLOW}⚠${NC} No 404 error handling found"
    fi
  else
    echo -e "${YELLOW}⚠${NC} No custom error responses configured"
    echo -e "  ${YELLOW}Tip:${NC} Add 403→200 and 404→200 redirects for SPA"
  fi
  echo ""
  
  # Check 4: Origin configuration
  echo -e "${BLUE}[4/5] Origin Configuration${NC}"
  if echo "$config" | grep -q '"Origins"'; then
    ORIGIN_DOMAIN=$(echo "$config" | grep -oP '"DomainName"\s*:\s*"\K[^"]+' | head -1)
    echo -e "  Origin: ${GREEN}$ORIGIN_DOMAIN${NC}"
    
    if echo "$ORIGIN_DOMAIN" | grep -q "s3.*amazonaws.com"; then
      echo -e "${GREEN}✓${NC} Using S3 origin"
      
      # Check if using S3 website endpoint
      if echo "$ORIGIN_DOMAIN" | grep -q "s3-website"; then
        echo -e "${GREEN}✓${NC} Using S3 website endpoint (recommended for SPA)"
      else
        echo -e "${YELLOW}⚠${NC} Using S3 REST endpoint (website endpoint recommended)"
      fi
    else
      echo -e "${BLUE}ℹ${NC} Using custom origin: $ORIGIN_DOMAIN"
    fi
  else
    echo -e "${RED}✗${NC} No origin configuration found"
    ALL_CHECKS_PASSED=false
  fi
  echo ""
  
  # Check 5: Cache behaviors
  echo -e "${BLUE}[5/5] Cache Behaviors${NC}"
  if echo "$config" | grep -q '"CacheBehaviors"'; then
    BEHAVIOR_COUNT=$(echo "$config" | grep -c '"PathPattern"' || echo "0")
    echo -e "  ${GREEN}$BEHAVIOR_COUNT${NC} custom cache behaviors configured"
    
    # Check for common patterns
    if echo "$config" | grep -q '/assets/\*'; then
      echo -e "${GREEN}✓${NC} /assets/* cache behavior found"
    fi
    
    if echo "$config" | grep -q '/api/\*'; then
      echo -e "${GREEN}✓${NC} /api/* cache behavior found"
    fi
  else
    echo -e "${BLUE}ℹ${NC} No custom cache behaviors (using default only)"
  fi
  echo ""
}

# Main execution
if [ "$CHECK_LOCAL_FILE" = true ]; then
  # Check local file
  if [ -z "$LOCAL_FILE" ]; then
    echo -e "${RED}Error: --file requires a file path${NC}"
    exit 1
  fi
  
  if [ ! -f "$LOCAL_FILE" ]; then
    echo -e "${RED}Error: File not found: $LOCAL_FILE${NC}"
    exit 1
  fi
  
  echo -e "Checking local file: ${GREEN}$LOCAL_FILE${NC}"
  echo ""
  
  CONFIG=$(cat "$LOCAL_FILE")
  check_config "$CONFIG"
  
else
  # Check AWS CloudFront
  if [ -z "$DISTRIBUTION_ID" ]; then
    echo -e "${YELLOW}No distribution ID provided${NC}"
    echo -e "Usage: $0 --distribution-id <id>"
    echo -e "   Or: $0 --file <config.json>"
    exit 1
  fi
  
  # Check if AWS CLI is available
  if ! command -v aws &> /dev/null; then
    echo -e "${YELLOW}⚠ AWS CLI not found${NC}"
    echo -e "Skipping CloudFront checks (AWS CLI required)"
    echo ""
    echo -e "${BLUE}To check CloudFront configuration:${NC}"
    echo -e "  1. Install AWS CLI: https://aws.amazon.com/cli/"
    echo -e "  2. Configure credentials: aws configure"
    echo -e "  3. Re-run this script"
    exit 0
  fi
  
  # Check if AWS credentials are configured
  if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${YELLOW}⚠ AWS credentials not configured${NC}"
    echo -e "Skipping CloudFront checks (credentials required)"
    echo ""
    echo -e "${BLUE}To configure AWS credentials:${NC}"
    echo -e "  aws configure"
    exit 0
  fi
  
  echo -e "Checking distribution: ${GREEN}$DISTRIBUTION_ID${NC}"
  echo ""
  
  # Fetch distribution config
  echo -e "${BLUE}Fetching distribution configuration...${NC}"
  CONFIG=$(aws cloudfront get-distribution-config --id "$DISTRIBUTION_ID" 2>&1)
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Failed to fetch distribution config"
    echo "$CONFIG"
    exit 1
  fi
  
  check_config "$CONFIG"
fi

# Summary
echo -e "${BLUE}========================================${NC}"
if [ "$ALL_CHECKS_PASSED" = true ]; then
  echo -e "${GREEN}✓ All checks passed${NC}"
  echo -e "${BLUE}========================================${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠ Some checks failed${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
  echo -e "Review the issues above and update your CloudFront configuration"
  exit 1
fi
