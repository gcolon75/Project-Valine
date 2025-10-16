#!/bin/bash
# Script to register Discord slash commands

set -e

echo "🎮 Discord Slash Command Registration"
echo "====================================="
echo ""

# Prompt for credentials
read -p "Enter Discord Application ID: " APP_ID
read -s -p "Enter Discord Bot Token: " BOT_TOKEN
echo ""
echo ""

if [ -z "$APP_ID" ] || [ -z "$BOT_TOKEN" ]; then
    echo "❌ Application ID and Bot Token are required"
    exit 1
fi

BASE_URL="https://discord.com/api/v10/applications/${APP_ID}/commands"

echo "📝 Registering /plan command..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "plan",
    "description": "Create a daily plan from ready GitHub issues",
    "options": [{
      "name": "channel_id",
      "description": "Discord channel ID to post plan to (optional, uses current channel)",
      "type": 3,
      "required": false
    }]
  }' \
  --silent -o /dev/null -w "Status: %{http_code}\n"

echo ""
echo "📝 Registering /approve command..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "approve",
    "description": "Approve and execute a plan",
    "options": [{
      "name": "run_id",
      "description": "Run ID to approve",
      "type": 3,
      "required": true
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
    "description": "Check orchestrator status",
    "options": [{
      "name": "run_id",
      "description": "Optional run ID for specific status",
      "type": 3,
      "required": false
    }]
  }' \
  --silent -o /dev/null -w "Status: %{http_code}\n"

echo ""
echo "📝 Registering /ship command..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ship",
    "description": "Finalize and ship a completed run",
    "options": [{
      "name": "run_id",
      "description": "Run ID to ship",
      "type": 3,
      "required": true
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
    "description": "Verify the latest Client Deploy workflow run",
    "options": [{
      "name": "run_url",
      "description": "Optional: specific run URL to verify instead of latest",
      "type": 3,
      "required": false
    }]
  }' \
  --silent -o /dev/null -w "Status: %{http_code}\n"

echo ""
echo "📝 Registering /verify-run command..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "verify-run",
    "description": "Verify a specific workflow run by ID",
    "options": [{
      "name": "run_id",
      "description": "GitHub Actions run ID to verify",
      "type": 3,
      "required": true
    }]
  }' \
  --silent -o /dev/null -w "Status: %{http_code}\n"

echo ""
echo "✅ Commands registered successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Verify commands appear in Discord (they may take a few minutes)"
echo "2. Set the Interactions Endpoint URL in Discord Developer Portal"
echo "3. Test commands in your Discord server"
echo ""
