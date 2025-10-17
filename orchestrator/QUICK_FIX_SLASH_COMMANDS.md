# Quick Fix: Discord Slash Commands Not Appearing

## Problem
Discord slash commands (like `/debug-last`) not visible in staging server.

## Quick Solution

### One Command
```bash
cd orchestrator
./fix_staging_slash_commands.sh
```

Follow the prompts. Done!

---

## Manual Steps

### 1. Register Commands
```bash
cd orchestrator/scripts

python validate_discord_slash_commands.py full \
  --app-id YOUR_APP_ID \
  --bot-token YOUR_BOT_TOKEN \
  --guild-id YOUR_GUILD_ID \
  --register
```

### 2. Enable Debug Command
```bash
aws ssm put-parameter \
  --name "/valine/staging/ENABLE_DEBUG_CMD" \
  --value "true" \
  --type String \
  --overwrite \
  --region us-west-2
```

### 3. Test in Discord
1. Open Discord staging server
2. Type `/debug-last`
3. Should appear in autocomplete
4. Execute and verify response

---

## Common Issues

### ❌ Bot Not in Guild
**Fix:** Invite bot with both scopes:
```
https://discord.com/api/oauth2/authorize?client_id=APP_ID&scope=bot%20applications.commands&permissions=0
```

### ❌ Commands Not Appearing
**Fix:** Restart Discord client or wait 1 hour (if global commands used)

### ❌ Command Says "Disabled"
**Fix:** Enable feature flag:
```bash
aws ssm put-parameter --name "/valine/staging/ENABLE_DEBUG_CMD" --value "true" --type String --overwrite --region us-west-2
```

---

## More Help

See comprehensive guides:
- `SLASH_COMMANDS_FIX_GUIDE.md` - Full fix guide
- `scripts/README_SLASH_COMMANDS.md` - Script documentation
- `STAGING_SLASH_COMMANDS_FIX_SUMMARY.md` - Complete summary
