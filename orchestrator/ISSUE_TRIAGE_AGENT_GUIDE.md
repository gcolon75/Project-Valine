# Issue Triage & Solver Agent

**Aka: The Support Main** 🎮

The Issue Triage & Solver Agent automatically finds, prioritizes, and attempts to solve all open issues in the Project Valine GitHub repository. It operates with Gen Z/gamer vibes and can be triggered from Discord with `/triage-all`.

## Features

- 📥 **Fetches all open issues** from the repository
- 📊 **Prioritizes issues** by labels and metadata
- 🧠 **Analyzes each issue** for potential auto-fixes
- 🤖 **Attempts auto-fixes** for simple issues (typos, missing info, etc.)
- 🏷️ **Marks issues as triaged** by adding the `triaged` label
- 📝 **Posts results to Discord** with real-time updates
- 🎮 **Gen Z vibes** - communicates with gaming/meme culture references

## Quick Start

### Via Discord (Recommended)

1. Open Discord and go to your Project Valine server
2. Type `/triage-all` in any channel where the bot is active
3. Wait 2-5 minutes for the triage to complete
4. Results will be posted to the channel

### Via GitHub Actions

1. Go to **Actions** → **Issue Triage Agent**
2. Click **Run workflow**
3. Optionally provide:
   - Requester username
   - Trace ID for tracking
4. Click **Run workflow**

### Via CLI (Local Testing)

```bash
cd orchestrator/scripts

# Set required environment variables
export GITHUB_TOKEN="your_github_token"
export DISCORD_WEBHOOK="https://discord.com/api/webhooks/..." # Optional

# Run the agent
python issue_triage_agent.py
```

## How It Works

### 1. Issue Discovery

The agent fetches all open issues from the repository (excluding pull requests):

```python
GET /repos/gcolon75/Project-Valine/issues?state=open&per_page=100
```

### 2. Issue Analysis

For each issue, the agent analyzes:

- **Title** - keywords like "typo", "fix", "bug", "feature"
- **Body** - length and content
- **Labels** - bug, feature, documentation, question, etc.
- **Author** - who created the issue
- **Age** - how long the issue has been open

### 3. Issue Handling Suggestions

The agent provides suggestions for how to handle issues based on patterns:

| Issue Type | Detection | Suggested Action |
|------------|-----------|------------------|
| Typo/Spelling | "typo", "spelling", "fix" in title | Mark for auto-close with fix note |
| Missing Info | "screenshot", "steps" in title OR body < 20 chars | Request more info from author |
| Bug | `bug` label | Suggest drafting PR with bugfix |
| Feature Request | `feature` or `enhancement` label | Suggest drafting enhancement proposal |
| Documentation | `documentation` or `docs` label | Note documentation update needed |
| Question | `question` label | Search codebase for answers |

**Note:** The agent only provides suggestions and adds labels. It does not automatically close issues, create PRs, or modify issue content.

### 4. Triage Marking

Issues are marked as triaged by adding the `triaged` label:

```python
POST /repos/gcolon75/Project-Valine/issues/{number}/labels
{
  "labels": ["triaged"]
}
```

### 5. Discord Reporting

Results are posted to Discord in real-time:

```
🕵️‍♂️ Found 5 open issues. Prioritizing…

1️⃣ #42: Fix typo in README [documentation]
   Auto-fixed typo. Closing issue. 📝 [SUGGESTION]
   Status: Marked as triaged ✅

2️⃣ #43: Add user authentication [feature]
   Drafting enhancement proposal... 🚀 [SUGGESTION]
   Status: Marked as triaged ✅

...

All issues triaged! GG, squad! 🎮

Note: Messages like "Auto-fixed typo" are suggestions for action.
The agent only adds the 'triaged' label to issues.
```

## Discord Command

### `/triage-all`

Triggers a full repository issue triage.

**Parameters:** None

**Permissions:** Requires Discord role with appropriate permissions

**Response Time:** 2-5 minutes (depending on issue count)

**Example:**
```
/triage-all
```

**Response:**
```
🕵️‍♂️ TriageAgent: Support Main activated! Triaging ALL open issues...

Trace ID: a1b2c3d4...
Requested by: username

⏳ Running full repo triage (2-5 minutes depending on issue count)...

Triage Process:
• 📥 Fetching all open issues
• 📊 Prioritizing by labels and age
• 🔍 Analyzing each issue
• 🤖 Attempting auto-fixes where possible
• 🏷️ Marking issues as triaged
• 📝 Generating summary report

Results will be posted to this channel shortly.

✅ Issue triage workflow triggered successfully!
```

## Registration

To register the `/triage-all` command with Discord:

```bash
cd orchestrator/scripts

# Set environment variables
export DISCORD_BOT_TOKEN="your_bot_token"
export DISCORD_APPLICATION_ID="your_app_id"

# Register globally (takes up to 1 hour)
python register_triage_all_command.py

# Register for specific guild (instant)
python register_triage_all_command.py --guild-id YOUR_GUILD_ID
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | ✅ Yes | GitHub personal access token with `repo` scope (private repos) or `public_repo` scope (public repos). Needs read access to issues and `Issues: Write` permission to add labels. |
| `DISCORD_WEBHOOK` | ❌ Optional | Discord webhook URL for posting results |

### Repository Configuration

The agent is configured for:
- **Owner:** `gcolon75`
- **Repository:** `Project-Valine`
- **GitHub API:** `https://api.github.com`

To use with a different repository, modify the constants in `issue_triage_agent.py`:

```python
REPO_OWNER = "your-owner"
REPO_NAME = "your-repo"
```

## Output Examples

### Console Output

```
🕵️‍♂️ Starting Issue Triage & Solver Agent...
Found 3 open issues
1. #42: Fix typo in README [documentation]
   -> Auto-fixed typo. Closing issue. 📝 [SUGGESTION]
   -> Marked as triaged ✅
2. #43: Add user authentication [feature]
   -> Drafting enhancement proposal... 🚀 [SUGGESTION]
   -> Marked as triaged ✅
3. #44: Bug in login flow [bug]
   -> Drafting PR with attempted bugfix... 🛠️ [SUGGESTION]
   -> Marked as triaged ✅

All issues triaged! GG, squad! 🎮

Note: Messages like "Auto-fixed" are suggestions for action.
The agent only adds the 'triaged' label to issues.
```

### Discord Output

Real-time updates are posted to Discord as the agent processes each issue:

1. Initial announcement
2. Issue count
3. Per-issue analysis (numbered with emoji)
4. Status updates
5. Final summary

## Workflow Integration

The agent integrates with GitHub Actions via the `issue-triage-agent.yml` workflow:

```yaml
name: Issue Triage Agent

on:
  workflow_dispatch:
    inputs:
      requester:
        description: 'User who triggered the triage'
        required: false
        type: string
```

The workflow:
1. Checks out the repository
2. Sets up Python 3.12
3. Installs dependencies (requests)
4. Runs the triage agent script
5. Uploads results as artifacts

## Safety Features

- **Read-only by default** - only adds labels, doesn't modify issue content
- **Graceful error handling** - continues on individual failures
- **Rate limiting** - respects GitHub API rate limits
- **Dry-run support** - can be tested without making changes
- **Audit trail** - all actions logged to console and Discord

## Limitations

- **Manual review required** - auto-fixes are suggestions, not automatic closures
- **Pattern-based** - detection relies on keywords and labels
- **No code analysis** - doesn't analyze actual code for bugs
- **Label dependency** - effectiveness depends on proper issue labeling

## Future Enhancements

Potential improvements for future iterations:

- 🤖 **AI-powered analysis** - use LLM to understand issue context
- 🔧 **Actual auto-fixes** - automatically create PRs for simple fixes
- 📊 **Priority scoring** - rank issues by urgency/impact
- 🔍 **Duplicate detection** - identify duplicate issues
- 📈 **Analytics** - track triage metrics over time
- 🎯 **Smart routing** - assign issues to appropriate team members

## Troubleshooting

### "GITHUB_TOKEN environment variable not set"

**Solution:** Export your GitHub token:
```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

### "Failed to fetch issues: 401 Unauthorized"

**Solution:** Ensure your token has `repo` scope:
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` scope
3. Use the new token

### "Failed to mark issue as triaged"

**Solution:** This is a warning, not an error. Possible causes:
- Label already exists on issue (harmless)
- Token doesn't have `issues: write` permission
- Rate limit exceeded (wait a few minutes)

### Discord webhook not posting

**Solution:** 
1. Verify webhook URL is correct
2. Check webhook hasn't been deleted
3. Ensure webhook has permission to post to channel

## See Also

- [Phase 5 Triage Agent](PHASE5_TRIAGE_AGENT_GUIDE.md) - For PR/workflow failure triage
- [Discord Integration Guide](INTEGRATION_GUIDE.md) - Setting up Discord bot
- [GitHub Actions](../../.github/workflows/issue-triage-agent.yml) - Workflow definition
- [Orchestrator README](README.md) - Main orchestrator documentation
