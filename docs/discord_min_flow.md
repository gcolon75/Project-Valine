# Discord Minimal Global Registration Flow (Rin)

## Quick Start

This is the **simplest path** to register the `/ux-update` slash command globally for the Rin bot (staging).

### Prerequisites

You need only **two environment variables**:

1. **STAGING_DISCORD_APPLICATION_ID** - Your Discord Application ID
   - Example: `1428568840958251109`
   - Find it in the Discord Developer Portal → Applications → Your App → Application ID

2. **STAGING_DISCORD_BOT_TOKEN** - Your raw Discord bot token
   - **Important**: Use the raw token only, do NOT include the word "Bot"
   - Example: `MTQyODU2ODg0MDk1ODI1MTEwOQ.GxYz...` (just the token string)
   - Find it in the Discord Developer Portal → Applications → Your App → Bot → Token

### Usage

**Windows PowerShell:**

```powershell
# Set environment variables
$env:STAGING_DISCORD_APPLICATION_ID = "1428568840958251109"
$env:STAGING_DISCORD_BOT_TOKEN = "your_raw_token_here"

# Run the script
.\orchestrator\scripts\min_register_global.ps1
```

**Output example:**

```
Bot OK: @RinBot (ID:1428568840958251109)
GLOBAL: Created /ux-update
GLOBAL commands now: /ux-update
Heads-up: Global commands can take up to ~1 hour to appear in the Discord UI.
```

### What This Does

The script:
1. Verifies bot authentication with Discord API (`GET /users/@me`)
2. Checks if `/ux-update` command already exists globally
3. Creates or updates the `/ux-update` command using the **GLOBAL endpoint** (`POST/PATCH /applications/{app}/commands`)
4. Lists all registered global commands

### Important Notes

**⏰ Propagation Delay**

Global commands can take **up to ~1 hour** to appear in Discord. This is a Discord platform limitation. The tradeoff is simplicity - we only need APP_ID + BOT_TOKEN.

If you need **instant visibility** (commands appear in seconds), you'll need to switch to the guild endpoint, which requires a GUILD_ID. That's a more complex setup we can revisit later.

**🔒 Token Security**

- Never commit your bot token to version control
- Use raw token only (without "Bot " prefix)
- The script will automatically add "Bot " when making API requests

**✅ Verification**

After running the script, wait up to 1 hour, then:
1. Open your Discord server
2. Type `/` in any channel
3. Look for `/ux-update` command
4. Test it with: `/ux-update description:"Test the navbar"`

### Optional: List Current Global Commands

To see what commands are currently registered globally:

**PowerShell:**

```powershell
$env:STAGING_DISCORD_APPLICATION_ID = "1428568840958251109"
$env:STAGING_DISCORD_BOT_TOKEN = "your_raw_token_here"

iwr -UseBasicParsing -Headers @{Authorization="Bot $env:STAGING_DISCORD_BOT_TOKEN"} https://discord.com/api/v10/applications/$env:STAGING_DISCORD_APPLICATION_ID/commands | % Content
```

**Bash/curl:**

```powershell
$env:STAGING_DISCORD_APPLICATION_ID = "1428568840958251109"
$env:STAGING_DISCORD_BOT_TOKEN = "your_raw_token_here"

Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Get -Headers @{
    "Authorization" = "Bot $STAGING_DISCORD_BOT_TOKEN"
}```

### Troubleshooting

**Error: Missing STAGING_DISCORD_APPLICATION_ID**
- Set the environment variable as shown above

**Error: Missing STAGING_DISCORD_BOT_TOKEN**
- Set the environment variable with your raw bot token
- Make sure NOT to include "Bot " prefix

**Error: Token includes 'Bot '. Use raw token only.**
- Remove "Bot " from your token
- Use only the raw token string

**Error: HTTP 401 (Unauthorized)**
- Check your bot token is correct and hasn't expired
- Regenerate token in Discord Developer Portal if needed

**Error: HTTP 403 (Forbidden)**
- Verify your bot has proper permissions in the Discord Developer Portal
- Check that the bot is enabled

**Command doesn't appear after 1 hour**
- Check the script output for errors
- Verify command was created/updated successfully
- Try listing global commands using the optional command above

### Next Steps

**Want instant visibility?** (Optional, deferred)

If waiting 1 hour is not acceptable, you can switch to guild-specific commands:
1. Get your Discord server's GUILD_ID
2. Modify script to use guild endpoint: `/applications/{app}/guilds/{guild}/commands`
3. Commands will appear within seconds (not hours)

This is a more complex setup and can be done later when needed.

### Related Documentation

- [Discord API Documentation - Application Commands](https://discord.com/developers/docs/interactions/application-commands)
- [Discord Developer Portal](https://discord.com/developers/applications)
- Main orchestrator scripts README: `orchestrator/scripts/README.md`
