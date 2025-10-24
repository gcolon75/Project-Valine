#!/bin/bash
# Notify Discord channel about deployment status
# Usage: ./notify-deploy-status.sh <status> <message>
# Status: success, failure, started
# Requires: DISCORD_DEPLOY_WEBHOOK or (DISCORD_BOT_TOKEN + DISCORD_CHANNEL_ID) environment variables

set -e

STATUS="${1:-unknown}"
MESSAGE="${2:-Deployment status update}"
DISCORD_DEPLOY_WEBHOOK="${DISCORD_DEPLOY_WEBHOOK:-}"
DISCORD_BOT_TOKEN="${DISCORD_BOT_TOKEN:-}"
DISCORD_CHANNEL_ID="${DISCORD_CHANNEL_ID:-}"

# Skip if no Discord configuration
if [ -z "$DISCORD_DEPLOY_WEBHOOK" ] && [ -z "$DISCORD_BOT_TOKEN" ]; then
  echo "⚠️  No Discord notification configured (set DISCORD_DEPLOY_WEBHOOK or DISCORD_BOT_TOKEN), skipping"
  exit 0
fi

if [ -z "$DISCORD_DEPLOY_WEBHOOK" ] && [ -z "$DISCORD_CHANNEL_ID" ]; then
  echo "⚠️  DISCORD_CHANNEL_ID not set, skipping Discord notification"
  exit 0
fi

# Get commit info
COMMIT_SHA="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo "unknown")}"
COMMIT_SHORT="${COMMIT_SHA:0:7}"
COMMIT_MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "Unknown commit")
GITHUB_RUN_URL="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-gcolon75/Project-Valine}/actions/runs/${GITHUB_RUN_ID:-}"

# Set color and emoji based on status
case "$STATUS" in
  "success")
    COLOR=3066993  # Green
    EMOJI="✅"
    TITLE="Deploy Successful - Lambda is LIVE! 🚀"
    ;;
  "failure")
    COLOR=15158332  # Red
    EMOJI="❌"
    TITLE="Deploy Failed - Lambda is DOWN! 💀"
    ;;
  "started")
    COLOR=3447003  # Blue
    EMOJI="🔄"
    TITLE="Deploy Started - Speedrunning to AWS... ⚡"
    ;;
  *)
    COLOR=10070709  # Gray
    EMOJI="❓"
    TITLE="Deploy Status Unknown"
    ;;
esac

# Build Discord embed JSON
EMBED_JSON=$(cat <<EOF
{
  "embeds": [{
    "title": "${EMOJI} ${TITLE}",
    "description": "${MESSAGE}",
    "color": ${COLOR},
    "fields": [
      {
        "name": "Commit",
        "value": "\`${COMMIT_SHORT}\` ${COMMIT_MSG}",
        "inline": false
      },
      {
        "name": "Build",
        "value": "[View Workflow Run](${GITHUB_RUN_URL})",
        "inline": false
      }
    ],
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "footer": {
      "text": "AWS DeployBot by Project Valine"
    }
  }]
}
EOF
)

# Send to Discord (prefer webhook, fall back to bot token)
if [ -n "$DISCORD_DEPLOY_WEBHOOK" ]; then
  echo "📤 Sending notification via webhook..."
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "${DISCORD_DEPLOY_WEBHOOK}" \
    -H "Content-Type: application/json" \
    -d "${EMBED_JSON}")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    echo "✓ Discord notification sent successfully via webhook"
  else
    echo "⚠️  Failed to send Discord notification via webhook (HTTP $HTTP_CODE)"
    echo "Response: $(echo "$RESPONSE" | head -n-1)"
  fi
else
  echo "📤 Sending notification via bot token..."
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages" \
    -H "Authorization: Bot ${DISCORD_BOT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${EMBED_JSON}")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    echo "✓ Discord notification sent successfully via bot token"
  else
    echo "⚠️  Failed to send Discord notification via bot token (HTTP $HTTP_CODE)"
    echo "Response: $(echo "$RESPONSE" | head -n-1)"
  fi
fi
