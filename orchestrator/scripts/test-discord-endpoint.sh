#!/bin/bash
# Test Discord endpoint health after deployment
# This script verifies that the Lambda can handle Discord PING requests
# without crashing (e.g., ImportModuleError)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the Discord webhook URL from CloudFormation
echo "📡 Fetching Discord webhook URL from CloudFormation..."
DISCORD_URL=$(aws cloudformation describe-stacks \
    --stack-name valine-orchestrator-staging \
    --query 'Stacks[0].Outputs[?OutputKey==`DiscordWebhookUrl`].OutputValue' \
    --output text)

if [ -z "$DISCORD_URL" ]; then
    echo -e "${RED}❌ Failed to get Discord webhook URL from CloudFormation${NC}"
    exit 1
fi

echo "✅ Got endpoint URL: $DISCORD_URL"

# Create a Discord PING payload (type: 1)
PING_PAYLOAD='{"type":1}'

# Create test timestamp and fake signature
# We expect the Lambda to reject this (401) but NOT crash (500)
TEST_TIMESTAMP=$(date +%s)
FAKE_SIGNATURE="0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"

echo ""
echo "🔍 Testing Lambda health with PING request..."
echo "   Payload: $PING_PAYLOAD"
echo ""

# Send the request and capture both status code and response
HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$DISCORD_URL" \
    -H "Content-Type: application/json" \
    -H "X-Signature-Ed25519: $FAKE_SIGNATURE" \
    -H "X-Signature-Timestamp: $TEST_TIMESTAMP" \
    -d "$PING_PAYLOAD")

# Split response body and status code
HTTP_BODY=$(echo "$HTTP_RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -n 1)

echo "📊 Response Status: $HTTP_CODE"
echo "📄 Response Body: $HTTP_BODY"
echo ""

# Check the response
if [ "$HTTP_CODE" = "401" ]; then
    # Expected: Lambda is healthy but rejects invalid signature
    echo -e "${GREEN}✅ Lambda responded with 401 (signature rejected) - endpoint is HEALTHY${NC}"
    echo "   This proves:"
    echo "   - Lambda did not crash"
    echo "   - No ImportModuleError"
    echo "   - Signature verification is working"
    echo ""
    exit 0
elif [ "$HTTP_CODE" = "200" ]; then
    # Also acceptable: Lambda returned 200
    # Check if it's a PONG response (type: 1)
    if echo "$HTTP_BODY" | grep -q '"type":1' || echo "$HTTP_BODY" | grep -q '"type": 1'; then
        echo -e "${GREEN}✅ Lambda responded with PONG - endpoint is HEALTHY${NC}"
        echo "   Note: Signature verification may be disabled or bypassed"
        echo ""
        exit 0
    else
        echo -e "${YELLOW}⚠️  Lambda returned 200 but unexpected body${NC}"
        echo "   Expected PONG response with type:1"
        echo "   Got: $HTTP_BODY"
        exit 1
    fi
elif [ "$HTTP_CODE" = "500" ] || [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "503" ]; then
    # Lambda crashed or errored
    echo -e "${RED}❌ Lambda failed with error $HTTP_CODE - endpoint is UNHEALTHY${NC}"
    echo ""
    echo "   This indicates a serious problem, possibly:"
    echo "   - ImportModuleError"
    echo "   - Missing dependencies"
    echo "   - Code syntax error"
    echo "   - Lambda configuration issue"
    echo ""
    echo "   Response body: $HTTP_BODY"
    echo ""
    echo "   Check CloudWatch Logs:"
    echo "   aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow"
    echo ""
    exit 1
else
    # Unexpected status code
    echo -e "${YELLOW}⚠️  Unexpected HTTP status: $HTTP_CODE${NC}"
    echo "   Response: $HTTP_BODY"
    echo ""
    echo "   This may indicate:"
    echo "   - Gateway timeout"
    echo "   - Invalid endpoint URL"
    echo "   - Network issue"
    exit 1
fi
