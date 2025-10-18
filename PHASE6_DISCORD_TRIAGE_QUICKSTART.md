# Discord `/triage` Command - Quick Start

## TL;DR

Trigger automated PR triage and fixes from Discord in 3 steps.

## Prerequisites (30 seconds)

Ensure Discord bot is configured:
```bash
# Required environment variables
export DISCORD_APPLICATION_ID="your_app_id"
export DISCORD_BOT_TOKEN="your_bot_token"
export DISCORD_PUBLIC_KEY="your_public_key"
export GITHUB_TOKEN="your_github_token"
```

## Setup (1 minute)

### 1. Register the Command
```bash
cd orchestrator
./register_slash_commands.sh register
```

Wait 60 seconds for Discord propagation.

### 2. Verify Registration
In Discord, type `/` and look for `/triage` in autocomplete.

## Usage (10 seconds per triage)

### Basic Triage (Analysis Only)
```
/triage pr:58
```
**What happens:**
- Analyzes PR #58 failure logs
- Identifies root cause
- Provides diagnosis
- No code changes

### Auto-Fix (Create PR with Fixes)
```
/triage pr:58 auto_fix:true
```
**What happens:**
- Analyzes PR #58 failure logs
- Identifies root cause
- Creates fix PR automatically
- Limited to ≤10 files, ≤500 lines
- Creates draft PR if limits exceeded

### Invasive Auto-Fix (No Limits)
```
/triage pr:58 auto_fix:true allow_invasive:true
```
**What happens:**
- Same as auto-fix
- No file/line limits
- Creates fix PR regardless of size

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pr` | Integer | ✅ Yes | - | PR number or workflow run ID |
| `auto_fix` | Boolean | ❌ No | `false` | Create fix PR automatically |
| `allow_invasive` | Boolean | ❌ No | `false` | Allow unlimited file/line changes |

## Response

You'll see an immediate response like:

```
🔍 Starting Triage for PR #58

Requested by: gcolon75
Auto-fix: ✅ Enabled
Allow invasive: ❌ No

⏳ Analyzing failure logs...

This may take 1-2 minutes. Results will be posted when complete.

✅ Triage queued successfully!
📊 Check GitHub Actions for triage results
🔗 View PR: https://github.com/gcolon75/Project-Valine/pull/58
```

## What Gets Analyzed

The triage agent automatically:
1. ✅ Fetches PR/workflow run logs
2. ✅ Identifies failing tests/jobs
3. ✅ Extracts error messages and stack traces
4. ✅ Determines root cause category
5. ✅ Proposes minimal fixes
6. ✅ Creates fix PR (if `auto_fix:true`)

## Safety Features

All triage operations are safe:

| Feature | Protection |
|---------|------------|
| Secret Redaction | ✅ Tokens/credentials never exposed |
| File Limits | ✅ Max 10 files (unless `allow_invasive`) |
| Line Limits | ✅ Max 500 lines (unless `allow_invasive`) |
| Draft PRs | ✅ Creates drafts if limits exceeded |
| Manual Review | ✅ All PRs require approval |
| Rollback | ✅ Easy to close/revert PRs |

## Examples

### Example 1: Check Why Tests Failed
```
/triage pr:58
```
**Output:** Diagnosis report with root cause

### Example 2: Auto-Fix Simple Test Failure
```
/triage pr:58 auto_fix:true
```
**Output:** Fix PR created automatically

### Example 3: Auto-Fix Large Refactoring
```
/triage pr:58 auto_fix:true allow_invasive:true
```
**Output:** Fix PR created even if >10 files changed

### Example 4: Triage Workflow Run
```
/triage pr:1234567890 auto_fix:true
```
**Output:** Works with workflow run IDs too

## Debugging

### Use `/debug-last` to see execution trace
```
/debug-last
```
**Shows:**
- Command executed
- Trace ID
- Duration
- Steps with timings
- Errors (if any)

### Check CloudWatch Logs
Look for Lambda execution logs in AWS CloudWatch.

### Verify GitHub Token
Ensure `GITHUB_TOKEN` has proper permissions:
- ✅ Read repo data
- ✅ Write to repo (for auto-fix)
- ✅ Create PRs

## Troubleshooting

### Command Not Showing in Discord
- Wait 60 seconds after registration
- Refresh Discord (Ctrl+R)
- Re-run command registration
- Check bot has `applications.commands` scope

### "Missing GITHUB_TOKEN" Error
```bash
# Set token in Lambda environment
aws lambda update-function-configuration \
  --function-name your-discord-handler \
  --environment Variables={GITHUB_TOKEN=your_token}
```

### "Invalid PR Parameter" Error
- Use numeric PR number (e.g., `58`, not `#58`)
- Or use workflow run ID (10+ digits)
- Don't use PR URLs

### No Fix PR Created
- Ensure `auto_fix:true` is set
- Check logs for errors
- Verify token has write permissions
- Try with `allow_invasive:true`

## Next Steps

1. ✅ Use `/triage` on your next failing PR
2. ✅ Review auto-generated fix PRs
3. ✅ Merge fixes after approval
4. ✅ Monitor success rate

## Documentation

- **Full Guide:** [PHASE6_DISCORD_TRIAGE_COMMAND.md](./PHASE6_DISCORD_TRIAGE_COMMAND.md)
- **Triage Agent:** [orchestrator/PHASE5_TRIAGE_AUTOMATION_GUIDE.md](./orchestrator/PHASE5_TRIAGE_AUTOMATION_GUIDE.md)
- **Tests:** [orchestrator/tests/test_triage_command.py](./orchestrator/tests/test_triage_command.py)

## Support

- 🐛 **Bug?** Open an issue
- 📝 **Feedback?** Comment on PR
- ❓ **Question?** Ask in Discord

---

**Version:** 1.0  
**Status:** ✅ Ready to Use  
**Last Updated:** 2025-10-18
