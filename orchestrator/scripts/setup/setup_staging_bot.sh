#!/bin/bash
# Quick-start script for setting up Discord staging bot
# This script automates the diagnostic and registration process
#
# USAGE: Run this script from the orchestrator root directory:
#   cd orchestrator
#   ./scripts/setup/setup_staging_bot.sh

set -e

echo "🚀 Discord Staging Bot Quick Setup"
echo "==================================="
echo ""
echo "This script will:"
echo "  1. Diagnose current command registration status"
echo "  2. Verify bot authentication and guild membership"
echo "  3. Optionally register commands for staging"
echo ""

# Check if AWS CLI is available
if command -v aws &> /dev/null; then
    AWS_AVAILABLE=true
else
    AWS_AVAILABLE=false
    echo "⚠️  AWS CLI not found. SSM parameter checks will be skipped."
    echo ""
fi

# Prompt for credentials
echo "📝 Enter your staging Discord credentials:"
echo ""
read -p "Discord Application ID (STAGING_DISCORD_APPLICATION_ID): " APP_ID
read -s -p "Discord Bot Token (STAGING_DISCORD_BOT_TOKEN): " BOT_TOKEN
echo ""
read -p "Staging Guild (Server) ID: " GUILD_ID
echo ""

if [ -z "$APP_ID" ] || [ -z "$BOT_TOKEN" ] || [ -z "$GUILD_ID" ]; then
    echo "❌ All fields are required"
    exit 1
fi

# Validate credentials and get bot info
echo "🔍 Step 1: Validating bot credentials..."
BOT_INFO=$(curl -s -H "Authorization: Bot ${BOT_TOKEN}" \
  https://discord.com/api/v10/users/@me)

if echo "$BOT_INFO" | grep -q "\"id\""; then
    BOT_USERNAME=$(echo "$BOT_INFO" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    BOT_ID=$(echo "$BOT_INFO" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "✅ Bot authenticated: @${BOT_USERNAME} (ID: ${BOT_ID})"
else
    echo "❌ Bot authentication failed. Check your bot token."
    exit 1
fi
echo ""

# Check guild membership
echo "🔍 Step 2: Checking guild membership..."
GUILDS=$(curl -s -H "Authorization: Bot ${BOT_TOKEN}" \
  https://discord.com/api/v10/users/@me/guilds)

GUILD_FOUND=false
if echo "$GUILDS" | grep -q "\"id\":\"${GUILD_ID}\""; then
    GUILD_FOUND=true
    GUILD_NAME=$(echo "$GUILDS" | grep -A5 "\"id\":\"${GUILD_ID}\"" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "✅ Bot is member of guild: $GUILD_NAME (ID: $GUILD_ID)"
else
    echo "❌ Bot is NOT a member of the specified guild"
    echo ""
    echo "🔧 ACTION REQUIRED:"
    echo "   Invite the bot using this URL:"
    echo "   https://discord.com/api/oauth2/authorize?client_id=${APP_ID}&scope=bot%20applications.commands&permissions=0"
    echo ""
    echo "   Make sure to use BOTH scopes: bot + applications.commands"
    exit 1
fi
echo ""

# Check current guild commands
echo "🔍 Step 3: Checking registered guild commands..."
GUILD_CMDS=$(curl -s -H "Authorization: Bot ${BOT_TOKEN}" \
  https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands)

if [ "$GUILD_CMDS" = "[]" ]; then
    echo "⚠️  No guild commands currently registered"
    NEEDS_REGISTRATION=true
elif echo "$GUILD_CMDS" | grep -q "\"name\""; then
    echo "✅ Found registered commands:"
    echo "$GUILD_CMDS" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | while read cmd; do
        echo "   • /$cmd"
    done
    
    # Check for debug-last specifically
    if echo "$GUILD_CMDS" | grep -q '"name":"debug-last"'; then
        echo "✅ /debug-last is already registered"
        NEEDS_REGISTRATION=false
    else
        echo "⚠️  /debug-last is NOT registered"
        NEEDS_REGISTRATION=true
    fi
else
    echo "⚠️  Could not fetch guild commands"
    NEEDS_REGISTRATION=true
fi
echo ""

# Check AWS SSM parameters if available
if [ "$AWS_AVAILABLE" = true ]; then
    echo "🔍 Step 4: Checking AWS SSM parameters..."
    AWS_REGION="us-west-2"
    
    # Check ENABLE_DEBUG_CMD
    DEBUG_CMD=$(aws ssm get-parameter --name "/valine/staging/ENABLE_DEBUG_CMD" --region $AWS_REGION --query "Parameter.Value" --output text 2>/dev/null || echo "NOT_SET")
    
    if [ "$DEBUG_CMD" = "true" ]; then
        echo "✅ ENABLE_DEBUG_CMD = true"
    elif [ "$DEBUG_CMD" = "NOT_SET" ]; then
        echo "⚠️  ENABLE_DEBUG_CMD not set (will default to false)"
        echo "   To enable: aws ssm put-parameter --name '/valine/staging/ENABLE_DEBUG_CMD' --value 'true' --type String --overwrite --region us-west-2"
    else
        echo "⚠️  ENABLE_DEBUG_CMD = $DEBUG_CMD (should be 'true' to use /debug-last)"
        echo "   To enable: aws ssm put-parameter --name '/valine/staging/ENABLE_DEBUG_CMD' --value 'true' --type String --overwrite --region us-west-2"
    fi
    
    # Check ENABLE_ALERTS
    ALERTS=$(aws ssm get-parameter --name "/valine/staging/ENABLE_ALERTS" --region $AWS_REGION --query "Parameter.Value" --output text 2>/dev/null || echo "NOT_SET")
    
    if [ "$ALERTS" = "false" ]; then
        echo "✅ ENABLE_ALERTS = false (safe default)"
    elif [ "$ALERTS" = "NOT_SET" ]; then
        echo "✅ ENABLE_ALERTS not set (will default to false)"
    else
        echo "⚠️  ENABLE_ALERTS = $ALERTS"
    fi
    
    # Check ALERT_CHANNEL_ID
    ALERT_CH=$(aws ssm get-parameter --name "/valine/staging/ALERT_CHANNEL_ID" --region $AWS_REGION --query "Parameter.Value" --output text 2>/dev/null || echo "NOT_SET")
    
    if [ "$ALERT_CH" = "1428102811832553554" ]; then
        echo "✅ ALERT_CHANNEL_ID = 1428102811832553554"
    elif [ "$ALERT_CH" = "NOT_SET" ]; then
        echo "⚠️  ALERT_CHANNEL_ID not set"
        echo "   To set: aws ssm put-parameter --name '/valine/staging/ALERT_CHANNEL_ID' --value '1428102811832553554' --type String --overwrite --region us-west-2"
    else
        echo "ℹ️  ALERT_CHANNEL_ID = $ALERT_CH"
    fi
    echo ""
fi

# Offer to register commands if needed
if [ "$NEEDS_REGISTRATION" = true ]; then
    echo "🔧 Commands need to be registered"
    echo ""
    read -p "Would you like to register staging commands now? (y/n): " REGISTER
    
    if [ "$REGISTER" = "y" ] || [ "$REGISTER" = "Y" ]; then
        echo ""
        echo "📝 Registering commands..."
        
        BASE_URL="https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands"
        
        # Register minimal staging commands
        COMMANDS=(
            '{"name":"debug-last","type":1,"description":"Show last run debug info (redacted, ephemeral)"}'
            '{"name":"diagnose","type":1,"description":"Run a quick staging diagnostic"}'
            '{"name":"status","type":1,"description":"Show last 1-3 runs for workflows","options":[{"name":"count","description":"Number of runs (1-3)","type":4,"required":false,"min_value":1,"max_value":3}]}'
        )
        
        for cmd in "${COMMANDS[@]}"; do
            CMD_NAME=$(echo "$cmd" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
            echo -n "   Registering /$CMD_NAME... "
            
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}" \
              -H "Authorization: Bot ${BOT_TOKEN}" \
              -H "Content-Type: application/json" \
              -d "$cmd")
            
            if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
                echo "✅ ($HTTP_CODE)"
            else
                echo "❌ ($HTTP_CODE)"
            fi
        done
        
        echo ""
        echo "✅ Commands registered!"
        echo "   They should appear IMMEDIATELY in your Discord server."
    fi
fi

# Summary
echo ""
echo "📊 Setup Summary"
echo "================"
echo ""
echo "✅ Bot: @${BOT_USERNAME} (ID: ${BOT_ID})"
echo "✅ Guild: ${GUILD_NAME:-Unknown} (ID: ${GUILD_ID})"
echo "✅ Application ID: ${APP_ID}"
echo ""

if [ "$NEEDS_REGISTRATION" = false ]; then
    echo "✅ Commands are registered and ready to use"
else
    echo "⚠️  Commands may need registration"
fi

echo ""
echo "📋 Next Steps:"
echo "   1. Go to your Discord staging server"
echo "   2. Type /debug-last (should appear in autocomplete)"
echo "   3. Execute the command and verify:"
echo "      • Response is ephemeral (only you see it)"
echo "      • Secrets are redacted (***abcd format)"
echo "      • Shows trace ID, command, duration, steps"
echo ""
echo "   4. If /debug-last returns 'disabled', enable it:"
echo "      aws ssm put-parameter --name '/valine/staging/ENABLE_DEBUG_CMD' \\"
echo "        --value 'true' --type String --overwrite --region us-west-2"
echo ""
echo "📚 For troubleshooting, see: orchestrator/DISCORD_STAGING_SETUP.md"
echo ""
