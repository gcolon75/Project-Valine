#!/bin/bash
# Notify Discord channel about deployment status
# Usage: ./notify-deploy-status.sh <status> <message>
# Status: success, failure, started
# Requires: DISCORD_BOT_TOKEN environment variable

set -e

STATUS="${1:-unknown}"
MESSAGE="${2:-Deployment status update}"
DISCORD_BOT_TOKEN="${DISCORD_BOT_TOKEN:-}"
DISCORD_CHANNEL_ID="${DISCORD_CHANNEL_ID:-}"

# Skip if no Discord token is configured
if [ -z "$DISCORD_BOT_TOKEN" ]; then
  echo "⚠️  DISCORD_BOT_TOKEN not set, skipping Discord notification"
  exit 0
fi

if [ -z "$DISCORD_CHANNEL_ID" ]; then
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

# Send to Discord
RESPONSE=$(curl -s -X POST \
  "https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages" \
  -H "Authorization: Bot ${DISCORD_BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${EMBED_JSON}")

# Check if successful
if echo "$RESPONSE" | grep -q '"id"'; then
  echo "✓ Discord notification sent successfully"
else
  echo "⚠️  Failed to send Discord notification"
  echo "Response: $RESPONSE"
fi
