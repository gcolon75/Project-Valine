#!/bin/bash
# Script to verify Discord bot configuration and diagnose endpoint verification issues
# Usage: ./verify_discord_config.sh [--fix]

set -e

REGION="us-west-2"
FUNCTION_NAME="valine-orchestrator-discord-dev"
STACK_NAME="valine-orchestrator-staging"
STAGING_BOT_ID="1428568840958251109"

echo "=== Discord Bot Configuration Diagnostic ==="
echo ""
echo "Stack: $STACK_NAME"
echo "Function: $FUNCTION_NAME"
echo "Region: $REGION"
echo "Staging Bot ID: $STAGING_BOT_ID"
echo ""

# Step 1: Check if Lambda function exists
echo "Step 1: Checking Lambda function exists..."
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" &>/dev/null; then
    echo "✅ Lambda function exists"
else
    echo "❌ Lambda function NOT found"
    echo "   Run the deploy workflow first"
    exit 1
fi
echo ""

# Step 2: Get Lambda environment variables
echo "Step 2: Fetching Lambda environment variables..."
LAMBDA_ENV=$(aws lambda get-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION" \
    --query 'Environment.Variables' \
    --output json)

echo "Lambda environment variables:"
echo "$LAMBDA_ENV" | jq -r 'to_entries[] | "\(.key) = \(.value[:20])..."'
echo ""

# Step 3: Extract DISCORD_PUBLIC_KEY
echo "Step 3: Extracting DISCORD_PUBLIC_KEY..."
LAMBDA_PUBLIC_KEY=$(echo "$LAMBDA_ENV" | jq -r '.DISCORD_PUBLIC_KEY // empty')

if [ -z "$LAMBDA_PUBLIC_KEY" ]; then
    echo "❌ DISCORD_PUBLIC_KEY not found in Lambda environment"
    exit 1
fi

echo "Lambda DISCORD_PUBLIC_KEY (first 16 chars): ${LAMBDA_PUBLIC_KEY:0:16}..."
echo "Lambda DISCORD_PUBLIC_KEY (length): ${#LAMBDA_PUBLIC_KEY} characters"
echo ""

# Step 4: Validate public key format
echo "Step 4: Validating public key format..."
if [[ "$LAMBDA_PUBLIC_KEY" =~ ^[0-9a-fA-F]{64}$ ]]; then
    echo "✅ Public key format is valid (64 hex characters)"
else
    echo "❌ Public key format is INVALID"
    echo "   Expected: 64 hexadecimal characters (0-9, a-f)"
    echo "   Got: ${#LAMBDA_PUBLIC_KEY} characters"
    if [[ ! "$LAMBDA_PUBLIC_KEY" =~ ^[0-9a-fA-F]+$ ]]; then
        echo "   Contains non-hex characters"
    fi
    exit 1
fi
echo ""

# Step 5: Check CloudFormation stack
echo "Step 5: Checking CloudFormation stack..."
STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$STACK_STATUS" = "NOT_FOUND" ]; then
    echo "❌ CloudFormation stack NOT found"
    exit 1
else
    echo "✅ Stack status: $STACK_STATUS"
fi
echo ""

# Step 6: Get API endpoint
echo "Step 6: Getting API Gateway endpoint..."
API_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`DiscordWebhookUrl`].OutputValue' \
    --output text)

echo "Discord Webhook URL: $API_URL"
echo ""

# Step 7: Test API endpoint accessibility
echo "Step 7: Testing API endpoint accessibility..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "x-signature-ed25519: test" \
    -H "x-signature-timestamp: 1234567890" \
    -d '{"type":1}' || echo "000")

if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ API endpoint is accessible (returned 401 - signature verification failed as expected)"
elif [ "$HTTP_CODE" = "200" ]; then
    echo "⚠️  API endpoint returned 200 (unexpected without valid signature)"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "❌ API endpoint is NOT accessible (connection failed)"
else
    echo "⚠️  API endpoint returned HTTP $HTTP_CODE"
fi
echo ""

# Step 8: Check CloudWatch logs
echo "Step 8: Checking recent CloudWatch logs..."
LOG_GROUP="/aws/lambda/$FUNCTION_NAME"

LATEST_STREAM=$(aws logs describe-log-streams \
    --log-group-name "$LOG_GROUP" \
    --region "$REGION" \
    --order-by LastEventTime \
    --descending \
    --max-items 1 \
    --query 'logStreams[0].logStreamName' \
    --output text 2>/dev/null || echo "")

if [ -n "$LATEST_STREAM" ] && [ "$LATEST_STREAM" != "None" ]; then
    echo "Latest log stream: $LATEST_STREAM"
    echo ""
    echo "Recent log entries:"
    aws logs get-log-events \
        --log-group-name "$LOG_GROUP" \
        --log-stream-name "$LATEST_STREAM" \
        --region "$REGION" \
        --limit 10 \
        --query 'events[*].message' \
        --output text | tail -n 10
else
    echo "No log streams found (Lambda may not have been invoked yet)"
fi
echo ""

# Step 9: Instructions for Discord Portal verification
echo "Step 9: Discord Portal Configuration"
echo "======================================"
echo ""
echo "To verify the endpoint in Discord Developer Portal:"
echo ""
echo "1. Go to: https://discord.com/developers/applications/$STAGING_BOT_ID/information"
echo "2. Scroll to 'Interactions Endpoint URL'"
echo "3. Paste this URL: $API_URL"
echo "4. Click 'Save Changes'"
echo ""
echo "Discord will send a PING request to verify the endpoint."
echo "Watch the CloudWatch logs for any errors."
echo ""

# Step 10: Compare with GitHub Secret (if possible)
echo "Step 10: Comparison Check"
echo "========================="
echo ""
echo "IMPORTANT: Manually verify that the following match:"
echo ""
echo "1. Lambda DISCORD_PUBLIC_KEY (check AWS Console):"
echo "   ${LAMBDA_PUBLIC_KEY:0:20}...${LAMBDA_PUBLIC_KEY: -20}"
echo ""
echo "2. Discord Portal Public Key (from Discord Developer Portal):"
echo "   Applications → $STAGING_BOT_ID → General Information → Public Key"
echo ""
echo "3. GitHub Secret STAGING_DISCORD_PUBLIC_KEY (from GitHub repo settings):"
echo "   Settings → Secrets and variables → Actions → STAGING_DISCORD_PUBLIC_KEY"
echo ""
echo "All three MUST match exactly (no spaces, newlines, or extra characters)"
echo ""

# Step 11: Provide fix command
if [ "$1" = "--fix" ]; then
    echo "Step 11: Fix Mode"
    echo "================="
    echo ""
    read -p "Enter the correct public key from Discord Portal: " CORRECT_KEY
    
    # Validate format
    if [[ ! "$CORRECT_KEY" =~ ^[0-9a-fA-F]{64}$ ]]; then
        echo "❌ Invalid public key format. Must be 64 hex characters."
        exit 1
    fi
    
    echo ""
    echo "Updating Lambda environment variable..."
    
    # Get all current environment variables
    CURRENT_ENV=$(echo "$LAMBDA_ENV" | jq --arg key "$CORRECT_KEY" '.DISCORD_PUBLIC_KEY = $key')
    
    aws lambda update-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --region "$REGION" \
        --environment "Variables=$(echo $CURRENT_ENV | jq -c .)" \
        --query 'FunctionName' \
        --output text
    
    echo "✅ Lambda environment variable updated"
    echo ""
    echo "Wait 30 seconds for the update to propagate, then try Discord verification again."
else
    echo ""
    echo "===================================="
    echo "Diagnostic complete!"
    echo ""
    echo "If you need to update the Lambda environment variable manually:"
    echo "  ./verify_discord_config.sh --fix"
    echo ""
fi
