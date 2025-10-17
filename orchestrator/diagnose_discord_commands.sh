#!/bin/bash
# Script to diagnose Discord slash command registration status
# Helps debug why commands aren't showing up in Discord

set -e

echo "🔍 Discord Slash Command Diagnostics"
echo "===================================="
echo ""

# Prompt for credentials
read -p "Enter Discord Application ID: " APP_ID
read -s -p "Enter Discord Bot Token: " BOT_TOKEN
echo ""
read -p "Enter Guild (Server) ID (optional, leave blank for global only): " GUILD_ID
echo ""

if [ -z "$APP_ID" ] || [ -z "$BOT_TOKEN" ]; then
    echo "❌ Application ID and Bot Token are required"
    exit 1
fi

echo "🔍 Running diagnostics..."
echo ""

# Test 1: Verify bot identity
echo "1️⃣ Verifying bot identity..."
BOT_INFO=$(curl -s -H "Authorization: Bot ${BOT_TOKEN}" \
  https://discord.com/api/v10/users/@me)

if echo "$BOT_INFO" | grep -q "\"id\""; then
    BOT_USERNAME=$(echo "$BOT_INFO" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    BOT_ID=$(echo "$BOT_INFO" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   ✅ Bot authenticated: @${BOT_USERNAME} (ID: ${BOT_ID})"
else
    echo "   ❌ Bot authentication failed"
    echo "   Response: $BOT_INFO"
    exit 1
fi
echo ""

# Test 2: List guilds the bot is in
echo "2️⃣ Checking bot guild membership..."
GUILDS=$(curl -s -H "Authorization: Bot ${BOT_TOKEN}" \
  https://discord.com/api/v10/users/@me/guilds)

if echo "$GUILDS" | grep -q "\"id\""; then
    echo "   ✅ Bot is member of the following servers:"
    echo "$GUILDS" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | while read name; do
        guild_id=$(echo "$GUILDS" | grep -B2 "\"name\":\"$name\"" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "      • $name (ID: $guild_id)"
    done
else
    echo "   ⚠️  Bot is not in any servers or couldn't fetch guilds"
    echo "   Response: $GUILDS"
fi
echo ""

# Test 3: List global commands
echo "3️⃣ Checking global commands..."
GLOBAL_CMDS=$(curl -s -H "Authorization: Bot ${BOT_TOKEN}" \
  https://discord.com/api/v10/applications/${APP_ID}/commands)

if [ "$GLOBAL_CMDS" = "[]" ]; then
    echo "   ⚠️  No global commands registered"
elif echo "$GLOBAL_CMDS" | grep -q "\"name\""; then
    echo "   ✅ Global commands found:"
    echo "$GLOBAL_CMDS" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | while read cmd; do
        echo "      • /$cmd"
    done
    
    # Check specifically for debug-last
    if echo "$GLOBAL_CMDS" | grep -q '"name":"debug-last"'; then
        echo "   ✅ /debug-last is registered as GLOBAL command"
    else
        echo "   ⚠️  /debug-last is NOT registered as global command"
    fi
else
    echo "   ⚠️  Unexpected response: $GLOBAL_CMDS"
fi
echo ""

# Test 4: List guild-specific commands (if guild ID provided)
if [ -n "$GUILD_ID" ]; then
    echo "4️⃣ Checking guild-specific commands for server $GUILD_ID..."
    GUILD_CMDS=$(curl -s -H "Authorization: Bot ${BOT_TOKEN}" \
      https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands)
    
    if [ "$GUILD_CMDS" = "[]" ]; then
        echo "   ⚠️  No guild commands registered for this server"
    elif echo "$GUILD_CMDS" | grep -q "\"name\""; then
        echo "   ✅ Guild commands found:"
        echo "$GUILD_CMDS" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | while read cmd; do
            echo "      • /$cmd"
        done
        
        # Check specifically for debug-last
        if echo "$GUILD_CMDS" | grep -q '"name":"debug-last"'; then
            echo "   ✅ /debug-last is registered as GUILD command (instant visibility)"
        else
            echo "   ⚠️  /debug-last is NOT registered as guild command"
        fi
    elif echo "$GUILD_CMDS" | grep -q "\"code\""; then
        ERROR_CODE=$(echo "$GUILD_CMDS" | grep -o '"code":[0-9]*' | cut -d':' -f2)
        ERROR_MSG=$(echo "$GUILD_CMDS" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
        echo "   ❌ Error fetching guild commands: Code $ERROR_CODE - $ERROR_MSG"
        
        if [ "$ERROR_CODE" = "50001" ]; then
            echo "   💡 Missing Access - Bot needs applications.commands scope"
        fi
    else
        echo "   ⚠️  Unexpected response: $GUILD_CMDS"
    fi
    echo ""
fi

# Summary and recommendations
echo "📊 Summary and Recommendations:"
echo "================================"
echo ""

# Check if debug-last exists anywhere
FOUND_DEBUG=false
if echo "$GLOBAL_CMDS" | grep -q '"name":"debug-last"'; then
    FOUND_DEBUG=true
    echo "⚠️  /debug-last is registered GLOBALLY (can take up to 1 hour to appear)"
fi
if [ -n "$GUILD_ID" ] && echo "$GUILD_CMDS" | grep -q '"name":"debug-last"'; then
    FOUND_DEBUG=true
    echo "✅ /debug-last is registered as GUILD command (should appear instantly)"
fi

if [ "$FOUND_DEBUG" = "false" ]; then
    echo "❌ ISSUE FOUND: /debug-last command is NOT registered"
    echo ""
    echo "🔧 FIX:"
    echo "   Run the staging registration script to register /debug-last as a guild command:"
    echo "   ./register_discord_commands_staging.sh"
    echo ""
fi

# Check bot scopes
echo "🔍 Bot Invite URL (with required scopes):"
echo "   https://discord.com/api/oauth2/authorize?client_id=${APP_ID}&scope=bot%20applications.commands&permissions=0"
echo ""
echo "   Make sure the bot was invited with BOTH scopes:"
echo "   • bot"
echo "   • applications.commands"
echo ""

echo "📝 Additional Checks:"
echo "   1. Verify STAGING_DISCORD_PUBLIC_KEY in GitHub repo variables"
echo "   2. Verify STAGING_DISCORD_APPLICATION_ID in GitHub repo variables"
echo "   3. Check SSM parameters in us-west-2:"
echo "      - /valine/staging/ENABLE_DEBUG_CMD=true"
echo "      - /valine/staging/ENABLE_ALERTS=false"
echo "      - /valine/staging/ALERT_CHANNEL_ID=1428102811832553554"
echo "   4. Verify Interactions Endpoint URL in Discord Developer Portal"
echo "   5. Check CloudWatch Logs: /aws/lambda/pv-api-prod-api"
echo ""
