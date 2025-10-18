#!/bin/bash
# Script to register Discord slash commands for STAGING environment
# Uses GUILD commands for instant visibility (no 1-hour delay)

set -e

echo "🎮 Discord Slash Command Registration (STAGING)"
echo "================================================"
echo ""
echo "⚠️  This script registers commands as GUILD commands (instant visibility)"
echo "   for use in staging Discord servers only."
echo ""

# Prompt for credentials
read -p "Enter Discord Application ID (STAGING_DISCORD_APPLICATION_ID): " APP_ID
read -s -p "Enter Discord Bot Token (STAGING_DISCORD_BOT_TOKEN): " BOT_TOKEN
echo ""
read -p "Enter Guild (Server) ID for staging: " GUILD_ID
echo ""

if [ -z "$APP_ID" ] || [ -z "$BOT_TOKEN" ] || [ -z "$GUILD_ID" ]; then
    echo "❌ Application ID, Bot Token, and Guild ID are required"
    exit 1
fi

# Determine if we're using guild or global commands
BASE_URL="https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands"
echo "📍 Using GUILD commands endpoint (instant registration)"
echo "   Guild ID: ${GUILD_ID}"
echo ""

# Register /debug-last command (STAGING ONLY - for debugging)
echo "📝 Registering /debug-last command (staging only)..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "debug-last",
    "type": 1,
    "description": "Show last run debug info (redacted, ephemeral)"
  }' \
  --silent -o /dev/null -w "Status: %{http_code}\n"

echo ""
echo "📝 Registering /diagnose command..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "diagnose",
    "type": 1,
    "description": "Run a quick staging diagnostic",
    "options": [{
      "name": "frontend_url",
      "description": "Optional: override frontend URL for checks",
      "type": 3,
      "required": false
    }, {
      "name": "api_base",
      "description": "Optional: override API base URL for checks",
      "type": 3,
      "required": false
    }]
  }' \
  --silent -o /dev/null -w "Status: %{http_code}\n"

echo ""
echo "📝 Registering /status command..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "status",
    "type": 1,
    "description": "Show last 1-3 runs for Client Deploy and Diagnose workflows",
    "options": [{
      "name": "count",
      "description": "Number of runs to show (1-3, default: 2)",
      "type": 4,
      "required": false,
      "min_value": 1,
      "max_value": 3
    }]
  }' \
  --silent -o /dev/null -w "Status: %{http_code}\n"

echo ""
echo "📝 Registering /verify-latest command..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "verify-latest",
    "type": 1,
    "description": "Verify the latest Client Deploy workflow run",
    "options": [{
      "name": "run_url",
      "description": "Optional: specific run URL to verify instead of latest",
      "type": 3,
      "required": false
    }, {
      "name": "diagnose",
      "description": "Optional: also trigger on-demand diagnose workflow",
      "type": 5,
      "required": false
    }]
  }' \
  --silent -o /dev/null -w "Status: %{http_code}\n"

echo ""
echo "📝 Registering /deploy-client command..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "deploy-client",
    "type": 1,
    "description": "Trigger Client Deploy workflow",
    "options": [{
      "name": "api_base",
      "description": "Optional: override API base URL",
      "type": 3,
      "required": false
    }, {
      "name": "wait",
      "description": "Optional: wait for deployment completion",
      "type": 5,
      "required": false
    }]
  }' \
  --silent -o /dev/null -w "Status: %{http_code}\n"

echo ""
echo "📝 Registering /triage command..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "triage",
    "type": 1,
    "description": "Auto-diagnose failing GitHub Actions and create draft PRs with fixes",
    "options": [{
      "name": "pr",
      "description": "PR number or workflow run ID to triage",
      "type": 4,
      "required": true
    }]
  }' \
  --silent -o /dev/null -w "Status: %{http_code}\n"

echo ""
echo "✅ Staging commands registered successfully!"
echo ""
echo "📋 Registered Commands:"
echo "  • /debug-last - Show last run debug info (redacted, ephemeral) [STAGING ONLY]"
echo "  • /diagnose - Run a quick staging diagnostic"
echo "  • /status - Show last 1-3 runs for workflows"
echo "  • /verify-latest - Verify the latest Client Deploy workflow run"
echo "  • /deploy-client - Trigger Client Deploy workflow"
echo "  • /triage - Auto-diagnose failing GitHub Actions and create draft PRs with fixes"
echo ""
echo "📋 Next Steps:"
echo "1. Commands should appear IMMEDIATELY in your Discord staging server"
echo "2. Verify the Interactions Endpoint URL is set in Discord Developer Portal"
echo "3. Ensure STAGING_DISCORD_PUBLIC_KEY matches the app in Developer Portal"
echo "4. Set SSM parameters:"
echo "   - /valine/staging/ENABLE_DEBUG_CMD=true (to enable /debug-last)"
echo "   - /valine/staging/ENABLE_ALERTS=false (keep disabled until testing)"
echo "   - /valine/staging/ALERT_CHANNEL_ID=1428102811832553554"
echo "5. Test /debug-last in staging server (should be ephemeral + redacted)"
echo ""
echo "🔍 To verify commands are registered, run:"
echo "   curl -H \"Authorization: Bot \$BOT_TOKEN\" \\"
echo "     https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands"
echo ""
