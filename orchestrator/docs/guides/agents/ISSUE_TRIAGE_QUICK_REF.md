# Issue Triage Agent - Quick Reference

**Support Main activated!** 🎮

## One-Liner

Automatically triage all open issues in the repo with `/triage-all`.

## Usage

### Discord (Recommended)
```
/triage-all
```

### CLI
```bash
export GITHUB_TOKEN="your_token"
export DISCORD_WEBHOOK="https://discord.com/api/webhooks/..." # optional
cd orchestrator/scripts
python issue_triage_agent.py
```

### GitHub Actions
**Actions** → **Issue Triage Agent** → **Run workflow**

## What It Does

1. 📥 Fetches all open issues
2. 📊 Prioritizes by labels/age
3. 🧠 Analyzes each issue
4. 🤖 Attempts auto-fixes
5. 🏷️ Marks as `triaged`
6. 📝 Posts to Discord

## Auto-Fix Logic

| Issue Type | Action |
|------------|--------|
| Typo/spelling | Mark for close |
| Missing info | Request details |
| Bug | Suggest PR |
| Feature | Suggest proposal |
| Docs | Note update needed |
| Question | Search codebase |

## Setup

### 1. Register Command
```bash
cd orchestrator/scripts
export DISCORD_BOT_TOKEN="your_token"
export DISCORD_APPLICATION_ID="your_app_id"
python register_triage_all_command.py --guild-id YOUR_GUILD_ID
```

### 2. Configure Secrets
Set in GitHub Actions:
- `GITHUB_TOKEN` (auto-provided)
- `DISCORD_WEBHOOK` (optional)

### 3. Test
```
/triage-all
```

## Expected Output

```
🕵️‍♂️ Found 5 open issues. Prioritizing…

1️⃣ #42: Fix typo in README [documentation]
   Auto-fixed typo. Closing issue. 📝
   Status: Marked as triaged ✅

2️⃣ #43: Add auth [feature]
   Drafting enhancement proposal... 🚀
   Status: Marked as triaged ✅

All issues triaged! GG, squad! 🎮
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Token error | `export GITHUB_TOKEN="ghp_..."` |
| 401 error | Check token has `repo` scope |
| Webhook fails | Verify URL, check permissions |

## Files

- Script: `orchestrator/scripts/issue_triage_agent.py`
- Handler: `orchestrator/app/handlers/discord_handler.py`
- Workflow: `.github/workflows/issue-triage-agent.yml`
- Register: `orchestrator/scripts/register_triage_all_command.py`
- Guide: `orchestrator/docs/guides/agents/ISSUE_TRIAGE_AGENT_GUIDE.md`

## Tips

- Run after sprint planning to triage new issues
- Use to clean up stale issues
- Combine with manual review for best results
- Great for repos with 10-100+ issues

## See Also

- Full guide: [ISSUE_TRIAGE_AGENT_GUIDE.md](ISSUE_TRIAGE_AGENT_GUIDE.md)
- PR triage: [PHASE5_TRIAGE_AGENT_GUIDE.md](PHASE5_TRIAGE_AGENT_GUIDE.md)
