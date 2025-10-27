# Discord Slash Command Registration - Fix Implementation

## Overview

This implementation fixes the Discord slash command registration failure in the staging environment by:

1. **Adding all 19 required commands** (18 base commands + ux-update)
2. **Implementing exponential backoff** for rate limit handling (429 errors)
3. **Improving error handling** for authentication (401) and permission (403) errors
4. **Generating comprehensive evidence reports** with timestamps and status

## Commands Registered

The following 19 commands are registered:

1. `plan` - Create a daily plan from ready GitHub issues
2. `approve` - Approve and execute a plan
3. `status` - Show last 1-3 runs for Client Deploy and Diagnose workflows
4. `ship` - Finalize and ship a completed run
5. `verify-latest` - Verify the latest Client Deploy workflow run
6. `verify-run` - Verify a specific workflow run by ID
7. `diagnose` - Trigger on-demand diagnose workflow
8. `deploy-client` - Trigger Client Deploy workflow
9. `set-frontend` - Update FRONTEND_BASE_URL (admin only)
10. `set-api-base` - Update VITE_API_BASE secret (admin only)
11. `agents` - List available orchestrator agents
12. `status-digest` - Show aggregated status digest
13. `relay-send` - Post message to Discord channel (admin only)
14. `relay-dm` - Post message to channel as bot (owner only)
15. `triage` - Auto-diagnose failing GitHub Actions
16. `debug-last` - Show last run debug info (feature-flagged)
17. `update-summary` - Generate and update project summary
18. `uptime-check` - Check uptime and health of services
19. `ux-update` - Trigger UX agent to improve user experience

## Usage

### Quick Start

```bash
cd orchestrator

# Set environment variables
export STAGING_DISCORD_APPLICATION_ID="your_app_id"
export STAGING_DISCORD_BOT_TOKEN="your_bot_token"
export STAGING_DISCORD_GUILD_ID="1407810581532250233"

# Register commands
python3 register_staging_commands.py
```

### Using Command-Line Arguments

```bash
python3 register_staging_commands.py \
  --app-id YOUR_APP_ID \
  --bot-token YOUR_BOT_TOKEN \
  --guild-id 1407810581532250233
```

### Check Status Without Registering

```bash
python3 register_staging_commands.py --check-only
```

## Rate Limit Handling

The implementation includes **exponential backoff** for rate limit (429) errors:

- **Initial backoff**: 1 second
- **Retry pattern**: 1s → 2s → 4s → 8s → 16s
- **Max retries**: 5 attempts
- **Honors `Retry-After` header** when provided by Discord

Example output:
```
⚠️  Rate limited (429). Exponential backoff: 2s. Attempt 2/5
⚠️  Rate limited (429). Retry-After header: 5s. Attempt 3/5
```

## Error Handling

### 401 - Authentication Failed
**Cause**: Invalid or expired bot token

**Solution**:
```bash
# Verify token is correct
echo $STAGING_DISCORD_BOT_TOKEN

# Update if needed
export STAGING_DISCORD_BOT_TOKEN="your_valid_token"
```

### 403 - Permission Denied
**Cause**: Bot lacks `applications.commands` scope

**Solution**:
1. Use the invite URL provided in error message
2. Ensure bot has both scopes: `bot` + `applications.commands`
3. Re-invite bot to server if needed

```
Invite URL: https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot%20applications.commands&permissions=0
```

### 429 - Rate Limited
**Cause**: Too many API requests

**Solution**: The script automatically handles this with exponential backoff. Wait for completion or retry after the indicated time.

## Evidence Reports

The script generates four evidence files in `discord_cmd_evidence/`:

1. **`evidence_TIMESTAMP.json`** - Complete execution log with all steps
2. **`commands_diff_TIMESTAMP.json`** - Comparison of expected vs registered commands
3. **`before_after_commands_TIMESTAMP.md`** - Human-readable before/after comparison
4. **`remediation_playbook_TIMESTAMP.md`** - Copy-paste commands for manual fixes

Example:
```
📄 Evidence Files Generated:
  • evidence: ./discord_cmd_evidence/evidence_20251025_024830.json
  • diff: ./discord_cmd_evidence/commands_diff_20251025_024830.json
  • before_after: ./discord_cmd_evidence/before_after_commands_20251025_024830.md
  • playbook: ./discord_cmd_evidence/remediation_playbook_20251025_024830.md
```

## Verification

After successful registration:

1. **Check Discord**
   - Go to staging server (Guild ID: 1407810581532250233)
   - Type `/` in any text channel
   - Verify all 19 commands appear in autocomplete

2. **Test Commands**
   - `/agents` - List available agents
   - `/status` - Show workflow status
   - `/ux-update feedback:"test"` - Test UX update command

3. **Verify Logs**
   - Check CloudWatch logs for interaction events
   - Verify handlers respond correctly

## Implementation Details

### Files Modified

1. **`app/agents/discord_slash_cmd_agent.py`**
   - Updated `DEFAULT_EXPECTED_COMMANDS` to include all 19 commands
   - Implemented exponential backoff in `_make_request()` method
   - Added better error messages for 401, 403, 429 errors
   - Uses guild commands endpoint for instant visibility

2. **`scripts/validate_discord_slash_commands.py`**
   - Added `ux-update` command to registration list
   - Updated expected commands count to 19

3. **`register_staging_commands.py`** (NEW)
   - Standalone CLI tool for easy command registration
   - Environment variable support
   - Check-only mode for status verification
   - Comprehensive error messages and next steps

### Key Features

- **Guild Commands**: Uses `/applications/{app_id}/guilds/{guild_id}/commands` endpoint for instant visibility (no 1-hour propagation delay)
- **Idempotent Registration**: Uses PUT method to overwrite all commands at once
- **Rate Limit Resilience**: Exponential backoff with max 5 retries
- **Evidence Generation**: Comprehensive logs and reports for troubleshooting
- **User-Friendly**: Clear error messages and actionable next steps

## Testing

The implementation has been:

1. ✅ Syntax validated with `python3 -m py_compile`
2. ✅ Command count verified (19 commands)
3. ✅ Help text tested
4. ✅ Error handling logic reviewed

To test with actual Discord API:

```bash
# Dry run (check only, no registration)
python3 register_staging_commands.py --check-only

# Full registration
python3 register_staging_commands.py
```

## Troubleshooting

### Commands not appearing in Discord

**Wait time**: Guild commands appear instantly, but client cache may need refresh
- Refresh Discord client (Ctrl+R or Cmd+R)
- Wait 30-60 seconds for propagation
- Re-check autocomplete

### Registration fails with connection error

**Check network**: Verify connectivity to Discord API
```bash
curl -I https://discord.com/api/v10/
```

### Bot not in guild

**Invite bot**:
1. Get invite URL from error message
2. Open URL in browser
3. Select staging server
4. Authorize with both scopes: `bot` + `applications.commands`

## References

- **Discord API Documentation**: https://discord.com/developers/docs/interactions/application-commands
- **Rate Limits**: https://discord.com/developers/docs/topics/rate-limits
- **Guild Commands**: Instant visibility vs Global commands (1-hour delay)
- **Problem Statement**: See parent issue for detailed requirements

## Support

For issues or questions:
1. Check evidence files in `discord_cmd_evidence/`
2. Review error messages and suggested solutions
3. Verify secrets in AWS SSM or environment variables
4. Check CloudWatch logs for handler responses
