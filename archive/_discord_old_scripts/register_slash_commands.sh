#!/bin/bash
#
# Discord Slash Command Registration - Shell Wrapper
#
# Simple wrapper around register_slash_commands_agent.py for staging environments.
# Uses environment variables for credentials.
#
# Required Environment Variables:
#   DISCORD_APPLICATION_ID - Discord Application ID
#   DISCORD_BOT_TOKEN - Discord Bot Token
#   DISCORD_GUILD_ID_STAGING - Discord Guild ID (optional, can be discovered)
#
# Usage:
#   # Check current status (no registration)
#   ./register_slash_commands.sh check
#
#   # Register commands
#   ./register_slash_commands.sh register
#
#   # Full flow with automatic registration
#   ./register_slash_commands.sh full --register
#
# Examples:
#   # Export variables first
#   export DISCORD_APPLICATION_ID="123456789012345678"
#   export DISCORD_BOT_TOKEN="your_bot_token"
#   export DISCORD_GUILD_ID_STAGING="987654321098765432"
#
#   # Then run
#   ./register_slash_commands.sh check
#   ./register_slash_commands.sh register
#   ./register_slash_commands.sh full --register

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_SCRIPT="$SCRIPT_DIR/register_slash_commands_agent.py"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Python script exists
if [ ! -f "$AGENT_SCRIPT" ]; then
    echo -e "${RED}❌ Error: Agent script not found at $AGENT_SCRIPT${NC}"
    exit 1
fi

# Check required environment variables
if [ -z "$DISCORD_APPLICATION_ID" ]; then
    echo -e "${RED}❌ Error: DISCORD_APPLICATION_ID environment variable is not set${NC}"
    echo ""
    echo "Export the variable first:"
    echo "  export DISCORD_APPLICATION_ID=\"your_app_id\""
    exit 1
fi

if [ -z "$DISCORD_BOT_TOKEN" ]; then
    echo -e "${RED}❌ Error: DISCORD_BOT_TOKEN environment variable is not set${NC}"
    echo ""
    echo "Export the variable first:"
    echo "  export DISCORD_BOT_TOKEN=\"your_bot_token\""
    exit 1
fi

# Guild ID is optional (can be discovered)
if [ -z "$DISCORD_GUILD_ID_STAGING" ]; then
    echo -e "${YELLOW}⚠️  Warning: DISCORD_GUILD_ID_STAGING not set. Will attempt discovery.${NC}"
    echo ""
fi

# Print configuration (redacted)
echo "Configuration:"
echo "  App ID: ***${DISCORD_APPLICATION_ID: -4}"
echo "  Bot Token: ***${DISCORD_BOT_TOKEN: -4}"
if [ -n "$DISCORD_GUILD_ID_STAGING" ]; then
    echo "  Guild ID: $DISCORD_GUILD_ID_STAGING"
else
    echo "  Guild ID: (will be discovered)"
fi
echo ""

# Run Python agent
python3 "$AGENT_SCRIPT" "$@"

EXIT_CODE=$?

# Interpret exit code
echo ""
case $EXIT_CODE in
    0)
        echo -e "${GREEN}✅ SUCCESS: Agent completed successfully${NC}"
        ;;
    1)
        echo -e "${RED}❌ FAIL: Agent encountered errors${NC}"
        ;;
    2)
        echo -e "${YELLOW}⚠️  PARTIAL: Agent completed with warnings${NC}"
        ;;
    130)
        echo -e "${YELLOW}⚠️  INTERRUPTED: User cancelled operation${NC}"
        ;;
    *)
        echo -e "${RED}❌ UNKNOWN: Agent exited with code $EXIT_CODE${NC}"
        ;;
esac

exit $EXIT_CODE
