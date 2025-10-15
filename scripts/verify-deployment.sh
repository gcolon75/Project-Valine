#!/usr/bin/env bash
# Verification script for Project-Valine frontend deployment and Discord integrations
# Usage: ./scripts/verify-deployment.sh [options]
#
# Options:
#   --frontend-url URL        CloudFront domain (optional, will be derived if not provided)
#   --s3-bucket BUCKET        S3 bucket name (optional, will use secret if not provided)
#   --cloudfront-id ID        CloudFront distribution ID (optional, will use secret if not provided)
#   --api-base URL            API base URL (optional, will use secret if not provided)
#   --discord-bot-token TOKEN Discord bot token (optional, for bot verification)
#   --discord-channel-id ID   Discord channel ID for bot message test
#   --discord-webhook-url URL Discord webhook URL for webhook test
#   --skip-aws                Skip AWS S3/CloudFront checks if no credentials available
#   --skip-discord            Skip Discord verification checks
#   --help                    Show this help message

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

# Options
FRONTEND_URL=""
S3_BUCKET=""
CLOUDFRONT_ID=""
API_BASE=""
DISCORD_BOT_TOKEN=""
DISCORD_CHANNEL_ID=""
DISCORD_WEBHOOK_URL=""
SKIP_AWS=false
SKIP_DISCORD=false

# AWS configuration
AWS_REGION="us-west-2"
AWS_ACCOUNT="579939802800"
AWS_ROLE_ARN="arn:aws:iam::579939802800:role/ProjectValine-GitHubDeployRole"

# GitHub configuration
REPO_OWNER="gcolon75"
REPO_NAME="Project-Valine"
WORKFLOW_NAME="Client Deploy"
WORKFLOW_FILE=".github/workflows/client-deploy.yml"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --frontend-url)
      FRONTEND_URL="$2"
      shift 2
      ;;
    --s3-bucket)
      S3_BUCKET="$2"
      shift 2
      ;;
    --cloudfront-id)
      CLOUDFRONT_ID="$2"
      shift 2
      ;;
    --api-base)
      API_BASE="$2"
      shift 2
      ;;
    --discord-bot-token)
      DISCORD_BOT_TOKEN="$2"
      shift 2
      ;;
    --discord-channel-id)
      DISCORD_CHANNEL_ID="$2"
      shift 2
      ;;
    --discord-webhook-url)
      DISCORD_WEBHOOK_URL="$2"
      shift 2
      ;;
    --skip-aws)
      SKIP_AWS=true
      shift
      ;;
    --skip-discord)
      SKIP_DISCORD=true
      shift
      ;;
    --help)
      head -n 20 "$0" | grep "^#" | sed 's/^# //' | sed 's/^#//'
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Helper functions
print_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_section() {
  echo ""
  echo -e "${BLUE}▶ $1${NC}"
  echo ""
}

print_pass() {
  echo -e "${GREEN}✓ PASS:${NC} $1"
  ((PASS_COUNT++)) || true
}

print_fail() {
  echo -e "${RED}✗ FAIL:${NC} $1"
  ((FAIL_COUNT++)) || true
}

print_skip() {
  echo -e "${YELLOW}⊘ SKIP:${NC} $1"
  ((SKIP_COUNT++)) || true
}

print_info() {
  echo -e "${BLUE}ℹ INFO:${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠ WARNING:${NC} $1"
}

check_command() {
  if command -v "$1" &> /dev/null; then
    return 0
  else
    return 1
  fi
}

# Main verification script
print_header "Project-Valine Deployment Verification"
echo "Repository: $REPO_OWNER/$REPO_NAME"
echo "Region: $AWS_REGION"
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"

# ============================================================================
# A) GitHub Actions and Repository Checks
# ============================================================================

print_section "A) GitHub Actions and Repository Checks"

# A1: Check workflow file exists
print_info "Checking workflow file: $WORKFLOW_FILE"
if [ -f "$WORKFLOW_FILE" ]; then
  print_pass "Workflow file exists: $WORKFLOW_FILE"
else
  print_fail "Workflow file not found: $WORKFLOW_FILE"
fi

# A2: Check .env.example files
print_info "Checking .env.example files"

if [ -f ".env.example" ]; then
  if grep -q "VITE_API_BASE" .env.example; then
    print_pass "Root .env.example contains VITE_API_BASE"
    print_info "Content: $(grep VITE_API_BASE .env.example)"
  else
    print_fail "Root .env.example missing VITE_API_BASE"
  fi
else
  print_fail "Root .env.example not found"
fi

if [ -f "orchestrator/.env.example" ]; then
  if grep -q "DISCORD_PUBLIC_KEY" orchestrator/.env.example && grep -q "DISCORD_BOT_TOKEN" orchestrator/.env.example; then
    print_pass "orchestrator/.env.example contains Discord configuration"
    print_info "DISCORD_PUBLIC_KEY: $(grep DISCORD_PUBLIC_KEY orchestrator/.env.example)"
    print_info "DISCORD_BOT_TOKEN: $(grep DISCORD_BOT_TOKEN orchestrator/.env.example)"
  else
    print_fail "orchestrator/.env.example missing Discord configuration"
  fi
else
  print_fail "orchestrator/.env.example not found"
fi

# A3: Note about secrets (can't check actual values without GitHub API access)
print_info "Note: Actual secret values cannot be verified without GitHub API access"
print_info "Required secrets: S3_BUCKET, CLOUDFRONT_DISTRIBUTION_ID, VITE_API_BASE"
print_info "Optional secrets: FRONTEND_BASE_URL, DISCORD_BOT_TOKEN, DISCORD_WEBHOOK_URL"

# ============================================================================
# B) S3 and CloudFront Verification
# ============================================================================

print_section "B) S3 and CloudFront Verification"

if [ "$SKIP_AWS" = true ]; then
  print_skip "AWS checks skipped (--skip-aws flag set)"
else
  # Check if AWS CLI is available
  if ! check_command aws; then
    print_warning "AWS CLI not found, skipping AWS checks"
    print_info "Install AWS CLI: https://aws.amazon.com/cli/"
    SKIP_AWS=true
  else
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
      print_warning "No AWS credentials configured, skipping AWS checks"
      print_info "Configure credentials or use --skip-aws flag"
      SKIP_AWS=true
    else
      print_pass "AWS CLI configured and credentials available"
      
      # Get AWS identity
      AWS_IDENTITY=$(aws sts get-caller-identity --output json 2>/dev/null || echo "{}")
      print_info "AWS Account: $(echo "$AWS_IDENTITY" | jq -r '.Account // "unknown"')"
      print_info "AWS User/Role: $(echo "$AWS_IDENTITY" | jq -r '.Arn // "unknown"')"
    fi
  fi
fi

if [ "$SKIP_AWS" = false ]; then
  # B1: S3 bucket checks
  if [ -n "$S3_BUCKET" ]; then
    print_info "Checking S3 bucket: $S3_BUCKET"
    
    # Check if bucket exists and is accessible
    if aws s3 ls "s3://$S3_BUCKET" &> /dev/null; then
      print_pass "S3 bucket exists and is accessible: $S3_BUCKET"
      
      # List objects
      print_info "Checking for deployed files..."
      if aws s3 ls "s3://$S3_BUCKET/index.html" &> /dev/null; then
        print_pass "index.html found in S3 bucket"
      else
        print_fail "index.html not found in S3 bucket"
      fi
      
      if aws s3 ls "s3://$S3_BUCKET/assets/" &> /dev/null; then
        print_pass "assets/ directory found in S3 bucket"
        ASSET_COUNT=$(aws s3 ls "s3://$S3_BUCKET/assets/" --recursive | wc -l)
        print_info "Asset files found: $ASSET_COUNT"
      else
        print_warning "assets/ directory not found in S3 bucket"
      fi
      
      # Check Cache-Control headers
      print_info "Checking Cache-Control headers..."
      
      # Check HTML file (should be no-cache)
      HTML_CACHE=$(aws s3api head-object --bucket "$S3_BUCKET" --key "index.html" --query 'CacheControl' --output text 2>/dev/null || echo "not-found")
      if [ "$HTML_CACHE" = "no-cache" ]; then
        print_pass "HTML file has correct Cache-Control: no-cache"
      elif [ "$HTML_CACHE" = "not-found" ]; then
        print_fail "Could not retrieve Cache-Control for index.html"
      else
        print_fail "HTML file has incorrect Cache-Control: $HTML_CACHE (expected: no-cache)"
      fi
      
      # Check asset file (should be public, max-age=300)
      ASSET_FILE=$(aws s3 ls "s3://$S3_BUCKET/assets/" --recursive | head -1 | awk '{print $4}')
      if [ -n "$ASSET_FILE" ]; then
        ASSET_CACHE=$(aws s3api head-object --bucket "$S3_BUCKET" --key "$ASSET_FILE" --query 'CacheControl' --output text 2>/dev/null || echo "not-found")
        if [[ "$ASSET_CACHE" == *"public"* ]] && [[ "$ASSET_CACHE" == *"max-age"* ]]; then
          print_pass "Asset file has correct Cache-Control: $ASSET_CACHE"
        elif [ "$ASSET_CACHE" = "not-found" ]; then
          print_warning "Could not retrieve Cache-Control for asset file"
        else
          print_fail "Asset file has incorrect Cache-Control: $ASSET_CACHE"
        fi
      else
        print_warning "No asset files found to check Cache-Control"
      fi
    else
      print_fail "S3 bucket not accessible: $S3_BUCKET"
      print_info "Check bucket name and AWS permissions"
    fi
  else
    print_skip "S3 bucket name not provided (use --s3-bucket)"
  fi
  
  # B2: CloudFront checks
  if [ -n "$CLOUDFRONT_ID" ]; then
    print_info "Checking CloudFront distribution: $CLOUDFRONT_ID"
    
    DIST_INFO=$(aws cloudfront get-distribution --id "$CLOUDFRONT_ID" --output json 2>/dev/null || echo "{}")
    if [ "$(echo "$DIST_INFO" | jq -r '.Distribution.Id // empty')" = "$CLOUDFRONT_ID" ]; then
      print_pass "CloudFront distribution exists: $CLOUDFRONT_ID"
      
      # Get domain name
      CLOUDFRONT_DOMAIN=$(echo "$DIST_INFO" | jq -r '.Distribution.DomainName // empty')
      if [ -n "$CLOUDFRONT_DOMAIN" ]; then
        print_pass "CloudFront domain: $CLOUDFRONT_DOMAIN"
        
        # Use CloudFront domain if FRONTEND_URL not provided
        if [ -z "$FRONTEND_URL" ]; then
          FRONTEND_URL="$CLOUDFRONT_DOMAIN"
          print_info "Using CloudFront domain as FRONTEND_URL"
        fi
      fi
      
      # Check distribution status
      DIST_STATUS=$(echo "$DIST_INFO" | jq -r '.Distribution.Status // empty')
      if [ "$DIST_STATUS" = "Deployed" ]; then
        print_pass "CloudFront distribution status: $DIST_STATUS"
      else
        print_warning "CloudFront distribution status: $DIST_STATUS (expected: Deployed)"
      fi
      
      # Check recent invalidations
      print_info "Checking recent invalidations..."
      INVALIDATIONS=$(aws cloudfront list-invalidations --distribution-id "$CLOUDFRONT_ID" --max-items 5 --output json 2>/dev/null || echo '{"InvalidationList":{"Items":[]}}')
      INVALIDATION_COUNT=$(echo "$INVALIDATIONS" | jq -r '.InvalidationList.Items | length')
      
      if [ "$INVALIDATION_COUNT" -gt 0 ]; then
        print_pass "Found $INVALIDATION_COUNT recent invalidation(s)"
        LATEST_INVALIDATION=$(echo "$INVALIDATIONS" | jq -r '.InvalidationList.Items[0]')
        INV_ID=$(echo "$LATEST_INVALIDATION" | jq -r '.Id // empty')
        INV_STATUS=$(echo "$LATEST_INVALIDATION" | jq -r '.Status // empty')
        INV_TIME=$(echo "$LATEST_INVALIDATION" | jq -r '.CreateTime // empty')
        print_info "Latest invalidation: $INV_ID (Status: $INV_STATUS, Created: $INV_TIME)"
      else
        print_warning "No recent invalidations found"
      fi
    else
      print_fail "CloudFront distribution not found: $CLOUDFRONT_ID"
    fi
  else
    print_skip "CloudFront distribution ID not provided (use --cloudfront-id)"
  fi
fi

# ============================================================================
# C) Frontend Reachability and API Wiring
# ============================================================================

print_section "C) Frontend Reachability and API Wiring"

# C1: Frontend availability
if [ -n "$FRONTEND_URL" ]; then
  # Remove https:// prefix if present
  FRONTEND_URL_CLEAN="${FRONTEND_URL#https://}"
  FRONTEND_URL_CLEAN="${FRONTEND_URL_CLEAN#http://}"
  
  print_info "Testing frontend URL: https://$FRONTEND_URL_CLEAN"
  
  if check_command curl; then
    # Check frontend response
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$FRONTEND_URL_CLEAN" 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
      print_pass "Frontend is reachable (HTTP $HTTP_STATUS)"
      
      # Check if index.html is served
      FRONTEND_CONTENT=$(curl -s "https://$FRONTEND_URL_CLEAN" 2>/dev/null || echo "")
      if echo "$FRONTEND_CONTENT" | grep -q "<html" || echo "$FRONTEND_CONTENT" | grep -q "<!DOCTYPE"; then
        print_pass "Frontend serves HTML content"
        
        # Try to find VITE_API_BASE in the built assets
        if echo "$FRONTEND_CONTENT" | grep -q "execute-api" || echo "$FRONTEND_CONTENT" | grep -q "amazonaws"; then
          print_info "Frontend appears to reference AWS API endpoints"
        fi
      else
        print_warning "Frontend response doesn't appear to be HTML"
      fi
    elif [ "$HTTP_STATUS" = "403" ]; then
      print_fail "Frontend returned HTTP 403 (check CloudFront/S3 permissions)"
    elif [ "$HTTP_STATUS" = "000" ]; then
      print_fail "Failed to connect to frontend (network error)"
    else
      print_fail "Frontend returned HTTP $HTTP_STATUS"
    fi
  else
    print_warning "curl not found, skipping frontend HTTP checks"
  fi
else
  print_skip "Frontend URL not provided (use --frontend-url or --cloudfront-id)"
fi

# C2: API health checks
if [ -n "$API_BASE" ]; then
  # Remove trailing slash
  API_BASE="${API_BASE%/}"
  
  print_info "Testing API base URL: $API_BASE"
  
  if check_command curl; then
    # Test /health endpoint
    print_info "Testing $API_BASE/health"
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/health" 2>/dev/null || echo "000")
    if [ "$HEALTH_STATUS" = "200" ]; then
      HEALTH_RESPONSE=$(curl -s "$API_BASE/health" 2>/dev/null || echo "{}")
      print_pass "API /health endpoint returned HTTP $HEALTH_STATUS"
      print_info "Response: $HEALTH_RESPONSE"
      
      # Check if response is valid JSON with expected fields
      if echo "$HEALTH_RESPONSE" | jq -e '.ok' &> /dev/null; then
        print_pass "API /health response contains expected JSON structure"
      fi
    elif [ "$HEALTH_STATUS" = "000" ]; then
      print_fail "Failed to connect to API /health (network error)"
    else
      print_fail "API /health returned HTTP $HEALTH_STATUS"
    fi
    
    # Test /hello endpoint
    print_info "Testing $API_BASE/hello"
    HELLO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/hello" 2>/dev/null || echo "000")
    if [ "$HELLO_STATUS" = "200" ]; then
      HELLO_RESPONSE=$(curl -s "$API_BASE/hello" 2>/dev/null || echo "{}")
      print_pass "API /hello endpoint returned HTTP $HELLO_STATUS"
      print_info "Response: $HELLO_RESPONSE"
      
      # Check for expected message
      if echo "$HELLO_RESPONSE" | jq -e '.message' &> /dev/null; then
        print_pass "API /hello response contains expected JSON structure"
      fi
    elif [ "$HELLO_STATUS" = "000" ]; then
      print_fail "Failed to connect to API /hello (network error)"
    else
      print_fail "API /hello returned HTTP $HELLO_STATUS"
    fi
  else
    print_warning "curl not found, skipping API HTTP checks"
  fi
else
  print_skip "API base URL not provided (use --api-base)"
fi

# ============================================================================
# D) Discord Verification
# ============================================================================

print_section "D) Discord Verification"

if [ "$SKIP_DISCORD" = true ]; then
  print_skip "Discord checks skipped (--skip-discord flag set)"
else
  if ! check_command curl; then
    print_warning "curl not found, skipping Discord checks"
  else
    # D1: Webhook test
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
      print_info "Testing Discord webhook..."
      
      WEBHOOK_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Content-Type: application/json" \
        -X POST -d '{"content":"✅ Verification ping from Project-Valine deployment verification script"}' \
        "$DISCORD_WEBHOOK_URL" 2>/dev/null || echo "error\n000")
      
      WEBHOOK_STATUS=$(echo "$WEBHOOK_RESPONSE" | tail -1)
      
      if [ "$WEBHOOK_STATUS" = "204" ] || [ "$WEBHOOK_STATUS" = "200" ]; then
        print_pass "Discord webhook test successful (HTTP $WEBHOOK_STATUS)"
        print_info "A test message should appear in the configured Discord channel"
      else
        print_fail "Discord webhook test failed (HTTP $WEBHOOK_STATUS)"
      fi
      
      # Rate limit: wait 2 seconds before next Discord request
      sleep 2
    else
      print_skip "Discord webhook URL not provided (use --discord-webhook-url)"
    fi
    
    # D2: Bot token and message test
    if [ -n "$DISCORD_BOT_TOKEN" ] && [ -n "$DISCORD_CHANNEL_ID" ]; then
      print_info "Testing Discord bot..."
      
      BOT_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
        -H "Content-Type: application/json" \
        -X POST \
        -d '{"content":"✅ Verification ping from Project-Valine bot"}' \
        "https://discord.com/api/v10/channels/$DISCORD_CHANNEL_ID/messages" 2>/dev/null || echo "{}\n000")
      
      BOT_STATUS=$(echo "$BOT_RESPONSE" | tail -1)
      BOT_BODY=$(echo "$BOT_RESPONSE" | head -n -1)
      
      if [ "$BOT_STATUS" = "200" ]; then
        print_pass "Discord bot message sent successfully (HTTP $BOT_STATUS)"
        MESSAGE_ID=$(echo "$BOT_BODY" | jq -r '.id // empty' 2>/dev/null || echo "")
        if [ -n "$MESSAGE_ID" ]; then
          print_info "Message ID: $MESSAGE_ID"
          print_info "Channel ID: $(echo "$BOT_BODY" | jq -r '.channel_id // empty' 2>/dev/null)"
        fi
      elif [ "$BOT_STATUS" = "401" ]; then
        print_fail "Discord bot authentication failed (HTTP $BOT_STATUS - check token)"
      elif [ "$BOT_STATUS" = "403" ]; then
        print_fail "Discord bot permission denied (HTTP $BOT_STATUS - check bot permissions)"
      elif [ "$BOT_STATUS" = "404" ]; then
        print_fail "Discord channel not found (HTTP $BOT_STATUS - check channel ID)"
      else
        print_fail "Discord bot test failed (HTTP $BOT_STATUS)"
        if [ -n "$BOT_BODY" ] && [ "$BOT_BODY" != "{}" ]; then
          print_info "Response: $BOT_BODY"
        fi
      fi
    else
      if [ -z "$DISCORD_BOT_TOKEN" ]; then
        print_skip "Discord bot token not provided (use --discord-bot-token)"
      fi
      if [ -z "$DISCORD_CHANNEL_ID" ]; then
        print_skip "Discord channel ID not provided (use --discord-channel-id)"
      fi
    fi
  fi
fi

# ============================================================================
# Summary
# ============================================================================

print_header "Verification Summary"

echo ""
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo -e "${YELLOW}Skipped: $SKIP_COUNT${NC}"
echo ""

TOTAL_CHECKS=$((PASS_COUNT + FAIL_COUNT))
if [ $TOTAL_CHECKS -gt 0 ]; then
  SUCCESS_RATE=$((PASS_COUNT * 100 / TOTAL_CHECKS))
  echo "Success Rate: $SUCCESS_RATE% ($PASS_COUNT/$TOTAL_CHECKS)"
else
  echo "No checks were performed"
fi

echo ""

# Exit with appropriate status
if [ $FAIL_COUNT -eq 0 ]; then
  if [ $PASS_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    exit 0
  else
    echo -e "${YELLOW}⚠ No checks were performed (all skipped)${NC}"
    exit 0
  fi
else
  echo -e "${RED}✗ $FAIL_COUNT check(s) failed${NC}"
  echo ""
  echo "Remediation Steps:"
  echo "1. Review the failed checks above"
  echo "2. Check GitHub Actions workflow logs for deployment details"
  echo "3. Verify AWS credentials and permissions"
  echo "4. Ensure all required secrets are configured in GitHub"
  echo "5. Check CloudWatch logs for API and Lambda function errors"
  echo "6. Verify Discord bot permissions and channel access"
  exit 1
fi
