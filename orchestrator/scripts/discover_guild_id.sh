#!/bin/bash
set -e

# Discover Staging Discord Guild ID
# 
# This script helps discover the guild ID for the staging Discord server
# by listing all guilds the bot is a member of.
#
# Required Environment Variables:
#   STAGING_DISCORD_BOT_TOKEN - Discord Bot Token
#
# Usage:
#   export STAGING_DISCORD_BOT_TOKEN="your_bot_token"
#   ./discover_guild_id.sh

if [ -z "$STAGING_DISCORD_BOT_TOKEN" ]; then
    echo "❌ Error: STAGING_DISCORD_BOT_TOKEN is not set"
    exit 1
fi

echo "🔍 Discovering Discord guilds for staging bot..."
echo ""
echo "Bot Token: ***${STAGING_DISCORD_BOT_TOKEN: -4}"
echo ""

# Use curl to get guilds
echo "Fetching guilds from Discord API..."
RESPONSE=$(curl -s -H "Authorization: Bot $STAGING_DISCORD_BOT_TOKEN" \
    https://discord.com/api/v10/users/@me/guilds)

# Check if curl succeeded
if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch guilds from Discord API"
    exit 1
fi

# Check if response contains error
if echo "$RESPONSE" | grep -q '"code"'; then
    echo "❌ Discord API returned an error:"
    echo "$RESPONSE" | python3 -m json.tool
    exit 1
fi

# Pretty print guilds
echo ""
echo "Guilds the bot is a member of:"
echo ""

# Use Python to format the output nicely
python3 << EOF
import json
import sys

response = '''$RESPONSE'''

try:
    guilds = json.loads(response)
    
    if not guilds:
        print("⚠️  Bot is not a member of any guilds")
        print("")
        print("To invite the bot to a guild, use this URL:")
        print("https://discord.com/api/oauth2/authorize?client_id=<APP_ID>&scope=bot%20applications.commands&permissions=0")
        print("")
        print("Replace <APP_ID> with your STAGING_DISCORD_APPLICATION_ID")
        sys.exit(1)
    
    for i, guild in enumerate(guilds, 1):
        guild_id = guild.get('id', 'unknown')
        guild_name = guild.get('name', 'Unknown')
        owner = guild.get('owner', False)
        
        print(f"{i}. {guild_name}")
        print(f"   Guild ID: {guild_id}")
        print(f"   Owner: {'Yes' if owner else 'No'}")
        print("")
    
    print("=" * 60)
    print("")
    print("To use a guild ID, set it as an environment variable:")
    print("")
    print("export STAGING_DISCORD_GUILD_ID=\"<guild_id_from_above>\"")
    print("")
    print("Or add it as a GitHub repository variable:")
    print("  Name: STAGING_DISCORD_GUILD_ID")
    print("  Value: <guild_id_from_above>")
    
except json.JSONDecodeError as e:
    print(f"❌ Failed to parse response as JSON: {e}")
    print("")
    print("Raw response:")
    print(response)
    sys.exit(1)
EOF

exit $?
