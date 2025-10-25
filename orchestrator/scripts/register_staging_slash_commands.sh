#!/bin/bash
set -e

# Register Discord Slash Commands for Staging Environment
# 
# This script registers slash commands (guild-level for instant visibility)
# in the staging Discord server.
#
# Required Environment Variables:
#   STAGING_DISCORD_APPLICATION_ID - Discord Application ID
#   STAGING_DISCORD_BOT_TOKEN - Discord Bot Token
#   STAGING_DISCORD_GUILD_ID - Discord Guild (Server) ID
#
# Optional Environment Variables:
#   EVIDENCE_DIR - Directory to store validation evidence (default: ./validation_evidence)
#
# Usage:
#   # Set environment variables
#   export STAGING_DISCORD_APPLICATION_ID="your_app_id"
#   export STAGING_DISCORD_BOT_TOKEN="your_bot_token"
#   export STAGING_DISCORD_GUILD_ID="your_guild_id"
#   
#   # Run registration
#   ./register_staging_slash_commands.sh
#
# Or pass as inline environment variables:
#   STAGING_DISCORD_APPLICATION_ID="..." \
#   STAGING_DISCORD_BOT_TOKEN="..." \
#   STAGING_DISCORD_GUILD_ID="..." \
#   ./register_staging_slash_commands.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Validate required environment variables
if [ -z "$STAGING_DISCORD_APPLICATION_ID" ]; then
    echo "❌ Error: STAGING_DISCORD_APPLICATION_ID is not set"
    exit 1
fi

if [ -z "$STAGING_DISCORD_BOT_TOKEN" ]; then
    echo "❌ Error: STAGING_DISCORD_BOT_TOKEN is not set"
    exit 1
fi

if [ -z "$STAGING_DISCORD_GUILD_ID" ]; then
    echo "❌ Error: STAGING_DISCORD_GUILD_ID is not set"
    exit 1
fi

# Set default evidence directory
EVIDENCE_DIR="${EVIDENCE_DIR:-$SCRIPT_DIR/validation_evidence}"

echo "🚀 Registering Discord Slash Commands for Staging"
echo ""
echo "Configuration:"
echo "  App ID: ***${STAGING_DISCORD_APPLICATION_ID: -4}"
echo "  Bot Token: ***${STAGING_DISCORD_BOT_TOKEN: -4}"
echo "  Guild ID: $STAGING_DISCORD_GUILD_ID"
echo "  Evidence Dir: $EVIDENCE_DIR"
echo ""

# Run the validation script with registration enabled
cd "$SCRIPT_DIR"
python3 validate_discord_slash_commands.py full \
    --app-id "$STAGING_DISCORD_APPLICATION_ID" \
    --bot-token "$STAGING_DISCORD_BOT_TOKEN" \
    --guild-id "$STAGING_DISCORD_GUILD_ID" \
    --evidence-dir "$EVIDENCE_DIR" \
    --register

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Registration completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Go to your Discord staging server"
    echo "2. Type '/' in the message box"
    echo "3. Look for all 18 commands (plan, approve, status, ship, verify-latest, etc.)"
    echo "4. Test /agents and /debug-last to verify they work"
    echo ""
else
    echo ""
    echo "❌ Registration failed!"
    echo "Check the output above and validation evidence in $EVIDENCE_DIR"
    echo ""
fi

exit $EXIT_CODE
