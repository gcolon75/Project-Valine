# SummaryAgent Guide

## Overview

The **SummaryAgent** automatically generates and updates project status summaries in a Gen Z/gamer-themed style with emojis and bullet points. It's designed to keep the team (and other bots) updated with the latest project status, recent changes, and next steps.

## Purpose

- Write concise, hype summaries of what's new, what's working, and what the next quests are
- List all major changes since the last summary (deploys, new agents, bugfixes, commands, infra changes)
- Update the "Current Status" section with what works, what's broken, and what needs testing
- Add links to key PRs, docs, or test results
- Never delete old summaries—just add new ones at the top

## Discord Command

### `/update-summary`

Generate and update the project summary at the top of PROJECT_VALINE_SUMMARY.md.

**Options:**
- `notes` (optional): Custom notes to include in the summary (e.g., "🎮 New feature deployed\n- ✅ All tests passing")
- `dry_run` (optional): Set to `true` to preview the summary without saving it to the file

**Examples:**

```
/update-summary
```
Generates a summary with recent PRs and workflow status.

```
/update-summary notes:"🏆 Lambda cache-buster fixed" dry_run:true
```
Previews a summary with custom notes without saving.

```
/update-summary notes:"- 🎮 New bot command deployed\n- ✅ Tests passing\n- 📈 Ready for prod"
```
Generates and saves a summary with custom notes.

## Format

Summaries are formatted in a gaming/Gen Z style with:

- 🆕 emoji headers
- Bullet points with status icons (✅ ❌ 🔄 🟢 🔴)
- Gaming metaphors (bosses defeated, loot acquired, abilities unlocked)
- Links to PRs and workflow runs
- Clear "Next quests" section
- Horizontal rule separator

### Example Output

```markdown
## 🆕 Project Valine Status (2025-10-23)

- 🏆 **Lambda cache-buster fixed** (no more dead code deploys)
- 🎮 **Orchestrator bot online:** Discord slash commands working
- 🛠️ **CI/CD:** Green builds, PRs auto-triaged
- 🤖 **SummaryAgent deployed:** Now auto-generating status updates!

**Recent PRs:**
- #92: Add SummaryAgent implementation
- #91: Docs update  
- #90: Deploy health check

**Recent Deployments:**
- ✅ [Client Deploy](https://github.com/...)
- ✅ [Client Deploy](https://github.com/...)

**Next quests:**
- Test /update-summary command in Discord
- Automate summary after every deploy
- Add more gaming metaphors

---
```

## Architecture

### SummaryAgent Class

Located at: `orchestrator/app/agents/summary_agent.py`

**Key Methods:**

- `generate_summary()`: Generates markdown summary with optional PR/workflow fetching
- `update_summary_file()`: Prepends new summary to PROJECT_VALINE_SUMMARY.md
- `run()`: Main entry point that generates and updates summary
- `_get_recent_prs()`: Fetches recent merged PRs from GitHub API
- `_get_recent_workflow_runs()`: Fetches recent workflow runs from GitHub API

### Discord Handler Integration

Located at: `orchestrator/app/handlers/discord_handler.py`

**Function:** `handle_update_summary_command()`

- Extracts command options (notes, dry_run)
- Initializes SummaryAgent with GitHub token
- Runs the agent and returns results to Discord
- Provides user-friendly feedback with trace ID

## Configuration

### Environment Variables

- `GITHUB_TOKEN`: Required for fetching PRs and workflow runs
- `GITHUB_REPOSITORY`: Repository name (default: gcolon75/Project-Valine)

### File Location

Summaries are written to: `PROJECT_VALINE_SUMMARY.md` (relative to repo root)

## Testing

Run the test suite:

```bash
cd orchestrator
python -m unittest tests.test_summary_agent -v
```

**Test Coverage:**
- 15 tests covering all major functionality
- Initialization with/without token
- Summary generation with custom notes
- PR and workflow fetching (with mocking)
- File operations (create, update, error handling)
- Dry-run mode
- Full end-to-end run

## Registration

The SummaryAgent is registered in the agent registry at `orchestrator/app/agents/registry.py`:

```python
AgentInfo(
    id='summary_agent',
    name='Summary Agent',
    description='Generates and updates project summaries...',
    command='/update-summary'
)
```

## Discord Command Registration

To register the `/update-summary` command:

### Staging (Guild Commands - Instant)

```bash
cd orchestrator
./register_discord_commands_staging.sh
```

### Production (Global Commands - 1 hour delay)

```bash
cd orchestrator
./register_discord_commands.sh
```

## Usage Tips

1. **After Major Events**: Run `/update-summary` after deploys, PR merges, or incident fixes
2. **Custom Notes**: Use the `notes` parameter to highlight specific achievements
3. **Dry Run**: Use `dry_run:true` to preview before committing
4. **Scheduled**: Consider setting up a scheduled task to run daily/weekly
5. **Gaming Style**: Embrace the gaming metaphors for engagement!

## Examples of Custom Notes

### After Deploy Success
```
notes:"🎮 Lambda cache-buster shipped! No more stale code. Boss defeated: S3 Cache Monster 💀"
```

### After PR Merge
```
notes:"✨ New abilities unlocked:\n- /update-summary command\n- Auto-generates status updates\n- Gaming-style summaries with emojis"
```

### After Incident Fix
```
notes:"🔧 Emergency patch deployed!\n- Fixed CloudWatch lag issue\n- Added retry logic\n- All systems green ✅"
```

### Weekly Summary
```
notes:"📅 Weekly Recap:\n- 12 PRs merged\n- 3 new features shipped\n- 0 critical bugs\n- Team morale: 📈 STONKS"
```

## Troubleshooting

### Command not appearing in Discord
1. Wait 60 seconds for guild commands to propagate
2. Refresh Discord client (Ctrl+R or Cmd+R)
3. Verify command was registered: Check registration script output
4. Re-run registration script if needed

### Summary not updating
1. Check GitHub token is valid in environment
2. Verify repository path is correct
3. Check file permissions on PROJECT_VALINE_SUMMARY.md
4. Try dry-run mode to see if generation works

### PR/Workflow fetching fails
1. Ensure `GITHUB_TOKEN` environment variable is set
2. Check token has read permissions for repository
3. Verify API rate limits haven't been exceeded
4. Agent will still generate summary even if fetching fails

## Future Enhancements

- Automatic scheduling (daily/weekly summaries)
- Integration with GitHub webhooks to auto-update on events
- Support for multiple output formats (Discord embed, Slack, etc.)
- Custom template support
- More gaming metaphors and emojis
- Achievement tracking (days since last incident, deploy streaks, etc.)

## Related Documentation

- [Agent Registry](app/agents/registry.py)
- [Discord Handler](app/handlers/discord_handler.py)
- [PROJECT_VALINE_SUMMARY.md](../PROJECT_VALINE_SUMMARY.md)
- [Tests](tests/test_summary_agent.py)

---

**Pro Tip**: The SummaryAgent is designed to make project updates fun and engaging. Don't be afraid to go wild with gaming metaphors and emojis! 🎮🎯🚀
