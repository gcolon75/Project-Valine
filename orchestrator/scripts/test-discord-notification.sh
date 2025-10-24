#!/bin/bash
# Test Discord notification system locally
# Usage: ./test-discord-notification.sh

set -e

echo "🧪 Testing Discord Notification System"
echo ""

# Check for required environment variables
if [ -z "$DISCORD_BOT_TOKEN" ]; then
  echo "❌ DISCORD_BOT_TOKEN not set"
  echo "   Export it first: export DISCORD_BOT_TOKEN='your-token-here'"
  exit 1
fi

if [ -z "$DISCORD_CHANNEL_ID" ]; then
  echo "❌ DISCORD_CHANNEL_ID not set"
  echo "   Export it first: export DISCORD_CHANNEL_ID='your-channel-id-here'"
  exit 1
fi

echo "✅ Environment variables found"
echo ""

# Test the notification script
echo "📤 Sending test notification..."
cd "$(dirname "$0")/.."

# Set up test environment
export GITHUB_SHA=$(git rev-parse HEAD 2>/dev/null || echo "test-commit")
export GITHUB_RUN_ID="test-run-123"
export GITHUB_REPOSITORY="gcolon75/Project-Valine"
export GITHUB_SERVER_URL="https://github.com"

# Send test notification
./scripts/notify-deploy-status.sh "started" "🧪 **Test Notification**

This is a test of the DeployBot notification system.

If you see this message in Discord, notifications are working! ✅"

echo ""
echo "🎉 Test notification sent!"
echo "Check your Discord channel to verify it was received."
echo ""
echo "Next steps:"
echo "1. Verify the message appears in Discord"
echo "2. Check that the embed formatting looks correct"
echo "3. Confirm the commit and build links work"
echo ""
echo "If successful, your Discord notifications are ready for auto-deploy! 🚀"
