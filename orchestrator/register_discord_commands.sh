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
    }, {
      "name": "diagnose",
      "description": "Optional: also trigger on-demand diagnose workflow",
      "type": 5,
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
echo "📝 Registering /diagnose command..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "diagnose",
    "description": "Trigger on-demand diagnose workflow",
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
echo "📝 Registering /deploy-client command..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "deploy-client",
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
echo "📝 Registering /set-frontend command (admin only)..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "set-frontend",
    "description": "Update FRONTEND_BASE_URL (admin only, feature-flagged)",
    "options": [{
      "name": "url",
      "description": "New frontend URL (must be https)",
      "type": 3,
      "required": true
    }, {
      "name": "confirm",
      "description": "Confirmation required (set to true)",
      "type": 5,
      "required": false
    }]
  }' \
  --silent -o /dev/null -w "Status: %{http_code}\n"

echo ""
echo "📝 Registering /set-api-base command (admin only)..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "set-api-base",
    "description": "Update VITE_API_BASE secret (admin only, feature-flagged)",
    "options": [{
      "name": "url",
      "description": "New API base URL (must be https)",
      "type": 3,
      "required": true
    }, {
      "name": "confirm",
      "description": "Confirmation required (set to true)",
      "type": 5,
      "required": false
    }]
  }' \
  --silent -o /dev/null -w "Status: %{http_code}\n"

echo ""
echo "📝 Registering /agents command..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "agents",
    "description": "List available orchestrator agents and their capabilities"
  }' \
  --silent -o /dev/null -w "Status: %{http_code}\n"

echo ""
echo "📝 Registering /status-digest command..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "status-digest",
    "description": "Show aggregated status digest for workflows over a time period",
    "options": [{
      "name": "period",
      "description": "Time period for digest (daily or weekly)",
      "type": 3,
      "required": false,
      "choices": [{
        "name": "daily",
        "value": "daily"
      }, {
        "name": "weekly",
        "value": "weekly"
      }]
    }]
  }' \
  --silent -o /dev/null -w "Status: %{http_code}\n"

echo ""
echo "📝 Registering /relay-send command (admin only)..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "relay-send",
    "description": "Post message to Discord channel (admin only, audited)",
    "options": [{
      "name": "channel_id",
      "description": "Target Discord channel ID",
      "type": 3,
      "required": true
    }, {
      "name": "message",
      "description": "Message to post",
      "type": 3,
      "required": true
    }, {
      "name": "ephemeral",
      "description": "Show confirmation as ephemeral (default: false)",
      "type": 5,
      "required": false
    }, {
      "name": "confirm",
      "description": "Confirmation required (set to true)",
      "type": 5,
      "required": false
    }]
  }' \
  --silent -o /dev/null -w "Status: %{http_code}\n"

echo ""
echo "📝 Registering /relay-dm command (owner only)..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "relay-dm",
    "description": "Post message to channel as bot (owner only, audited)",
    "options": [{
      "name": "message",
      "description": "Message to post",
      "type": 3,
      "required": true
    }, {
      "name": "target_channel_id",
      "description": "Target Discord channel ID",
      "type": 3,
      "required": true
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
echo "📝 Registering /debug-last command (feature-flagged)..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "debug-last",
    "description": "Show last run debug info (redacted, ephemeral, feature-flagged)"
  }' \
  --silent -o /dev/null -w "Status: %{http_code}\n"

echo ""
echo "📝 Registering /update-summary command..."
curl -X POST "${BASE_URL}" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "update-summary",
    "description": "Generate and update project summary with latest status",
    "options": [{
      "name": "notes",
      "description": "Optional: custom notes to include in summary",
      "type": 3,
      "required": false
    }, {
      "name": "dry_run",
      "description": "Optional: preview without saving to file",
      "type": 5,
      "required": false
    }]
  }' \
  --silent -o /dev/null -w "Status: %{http_code}\n"

echo ""
echo "✅ Commands registered successfully!"
echo ""
echo "📋 Registered Commands:"
echo "  • /plan - Create a daily plan from ready GitHub issues"
echo "  • /approve - Approve and execute a plan"
echo "  • /status - Show last 1-3 runs for Client Deploy and Diagnose workflows"
echo "  • /ship - Finalize and ship a completed run"
echo "  • /verify-latest - Verify the latest Client Deploy workflow run"
echo "  • /verify-run - Verify a specific workflow run by ID"
echo "  • /diagnose - Trigger on-demand diagnose workflow"
echo "  • /deploy-client - Trigger Client Deploy workflow with optional api_base override"
echo "  • /set-frontend - Update FRONTEND_BASE_URL (admin only, feature-flagged)"
echo "  • /set-api-base - Update VITE_API_BASE secret (admin only, feature-flagged)"
echo "  • /agents - List available orchestrator agents"
echo "  • /status-digest - Show aggregated status digest for workflows"
echo "  • /relay-send - Post message to Discord channel (admin only, audited)"
echo "  • /relay-dm - Post message to channel as bot (owner only, audited)"
echo "  • /triage - Auto-diagnose failing GitHub Actions and create draft PRs with fixes"
echo "  • /debug-last - Show last run debug info (redacted, ephemeral, feature-flagged)"
echo "  • /update-summary - Generate and update project summary with latest status"
echo ""
echo "📋 Next Steps:"
echo "1. Verify commands appear in Discord (they may take a few minutes)"
echo "2. Set the Interactions Endpoint URL in Discord Developer Portal"
echo "3. Test commands in your Discord server"
echo "4. For admin commands, configure ALLOW_SECRET_WRITES, ADMIN_USER_IDS, ADMIN_ROLE_IDS"
echo ""
