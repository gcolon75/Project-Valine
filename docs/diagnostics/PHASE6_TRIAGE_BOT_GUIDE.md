# Phase 6: Discord Triage Bot + AI Agents

## 🎯 Overview

Phase 6 adds intelligent PR triage capabilities to Project Valine's Discord bot, powered by specialized AI agents that analyze CI/CD failures and provide confidence-scored recommendations.

## ✨ Features

### 1. Discord `/triage` Command
- **Usage:** `/triage pr:<number> [create_pr:true]`
- **Description:** Auto-diagnose failures in a PR and optionally create draft fix PR
- **Response:** Formatted embed with failure analysis and confidence scores

### 2. AI Agent System
Three specialized agents analyze failures:

#### 🔧 **Dev Agent** - Code Analysis
- Parses Python imports using AST
- Identifies missing dependencies in codebase
- Provides file/location context
- **Confidence Boost:** 0-30 points

#### 📦 **Ops Agent** - Package Validation  
- Validates packages exist on PyPI
- Fetches latest versions
- Checks package popularity
- **Confidence Boost:** -20 to +30 points

#### 📊 **Analyst Agent** - Confidence Scoring
- Calculates overall confidence (0-100%)
- Prioritizes failures: 🔥 Quick Win (80%+), ⚠️ Medium (60-79%), 🤔 Needs Review (<60%)
- Identifies actionable failures
- **Base Score:** 50%

### 3. Enhanced Triage Reports
- Failures sorted by confidence score
- Agent insights included in PR descriptions
- Detailed recommendations for each failure
- Clear priority classification

## 📁 File Structure

```
orchestrator/
├── triage_agents/           # AI Agent Package
│   ├── __init__.py
│   ├── base_agent.py        # Base Agent class
│   ├── dev_agent.py         # Code analysis agent
│   ├── ops_agent.py         # PyPI validation agent
│   └── analyst_agent.py     # Confidence scoring agent
├── scripts/
│   ├── auto_triage_pr58.py  # Original triage script
│   ├── auto_triage_with_agents.py  # Enhanced with AI
│   └── register_triage_command.py  # Discord command registration
├── app/handlers/
│   └── discord_handler.py   # Updated with /triage handler
└── tests/
    └── test_triage_agents.py  # Agent unit tests
```

## 🚀 Quick Start

### 1. Register Discord Command

```bash
# Set environment variables
export DISCORD_APPLICATION_ID="your_app_id"
export DISCORD_BOT_TOKEN="your_bot_token"  
export DISCORD_GUILD_ID="your_guild_id"  # For instant guild commands

# Register command
cd orchestrator
python3 scripts/register_triage_command.py

# List registered commands
python3 scripts/register_triage_command.py --list
```

### 2. Use in Discord

```
# Triage a PR (analysis only)
/triage pr:60

# Triage and create draft fix PR
/triage pr:60 create_pr:true
```

### 3. Test Agents Locally

```bash
# Run agent tests
cd orchestrator
python3 -m unittest tests.test_triage_agents -v

# Test enhanced triage script
python3 scripts/auto_triage_with_agents.py --repo gcolon75/Project-Valine --pr 60

# Create PR with fixes
python3 scripts/auto_triage_with_agents.py --repo gcolon75/Project-Valine --pr 60 --create-pr
```

## 🤖 Agent Details

### Dev Agent Analysis

**What it does:**
- Extracts package names from error messages
- Searches codebase for import statements
- Uses Python AST parsing for accuracy
- Provides file location context

**Example Output:**
```
✅ `requests` is directly imported in `orchestrator/scripts/auto_triage_pr58.py`
📦 Add `requests` to requirements.txt
Confidence Boost: +30
```

### Ops Agent Analysis

**What it does:**
- Queries PyPI API for package existence
- Fetches latest version and metadata
- Checks package popularity
- Caches results to avoid rate limits

**Example Output:**
```
✅ `requests` exists on PyPI
📌 Latest version: `2.31.0`
🔥 Popular package (100M+ downloads/month)
💡 Add `requests==2.31.0` to requirements.txt
Confidence Boost: +30
```

### Analyst Agent Analysis

**What it does:**
- Evaluates error message clarity
- Checks for file/line location info
- Boosts confidence for test files
- Calculates final confidence score

**Example Output:**
```
🎯 Clear error type identified
📍 Exact location: `orchestrator/test.py:42`
🧪 Test file - easier to debug
🔥 Quick win (confidence: 85%)
```

## 📊 Confidence Scoring

Final confidence is calculated as:
```
base_confidence = 50
+ dev_agent_boost (0-30)
+ ops_agent_boost (-20 to +30)
+ analyst_agent_boost (0-30)
= final_confidence (capped at 100)
```

**Priority Classification:**
- **🔥 Quick Win:** ≥80% - High confidence, prioritize
- **⚠️ Medium Priority:** 60-79% - Review before fixing  
- **🤔 Needs Review:** <60% - Manual investigation needed

## 🔒 Safety Features

### Draft PRs Only
- All fix PRs created as drafts
- Require manual review before merge
- Clear labeling: `auto-triage`, `needs-review`

### Secret Redaction
- GitHub tokens redacted in logs
- Only show last 4 characters
- Pattern matching for common secrets

### Rate Limiting
- PyPI API calls cached
- 5-second timeout per request
- Handles 429 responses gracefully

### Change Limits
- Tracks files/lines changed
- Warns on invasive changes (>10 files)
- Requires `--allow-invasive` flag

## 🧪 Testing

### Unit Tests
```bash
# Run all agent tests
python3 -m unittest orchestrator.tests.test_triage_agents -v

# Run specific test class
python3 -m unittest orchestrator.tests.test_triage_agents.TestDevAgent -v

# Run specific test
python3 -m unittest orchestrator.tests.test_triage_agents.TestDevAgent.test_analyze_missing_dependency -v
```

### Integration Testing
```bash
# Test on real PR (read-only)
python3 orchestrator/scripts/auto_triage_with_agents.py \
  --repo gcolon75/Project-Valine \
  --pr 60

# Dry run with PR creation
python3 orchestrator/scripts/auto_triage_with_agents.py \
  --repo gcolon75/Project-Valine \
  --pr 60 \
  --create-pr \
  --dry-run
```

## 📝 Example Workflow

### 1. User Runs Command
```
User: /triage pr:60
Bot: 🔍 Starting triage for PR #60...
     Requested by: gcolon75
     Mode: triage-only
     ⏳ Analyzing workflow runs and logs...
```

### 2. Agents Analyze Failures
```
🤖 Running AI Agent Analysis...
  Analyzing failure 1/3: missing_dependency
  Analyzing failure 2/3: test_failure
  Analyzing failure 3/3: missing_dependency

✅ Agent analysis complete

📊 Confidence Scores:
  1. 🔥 85% - missing_dependency
  2. 🔥 80% - missing_dependency  
  3. ⚠️ 65% - test_failure
```

### 3. Bot Posts Results
```
🤖 AI-Assisted Triage Report for PR #60

### 🔥 Quick Wins (High Confidence ≥80%)

#### 1. Missing Dependency (85%)
**Error:** `ModuleNotFoundError: No module named 'requests'`
**Location:** `orchestrator/scripts/auto_triage_pr58.py:10`

**Agent Analysis:**
- ✅ `requests` is directly imported in `orchestrator/scripts/auto_triage_pr58.py`
- ✅ `requests` exists on PyPI
- 📌 Latest version: `2.31.0`
- 🔥 Popular package (100M+ downloads/month)

**Recommended Fix:**
- 💡 Add `requests==2.31.0` to requirements.txt

[Create Draft PR] [Cancel]
```

## 🔧 Configuration

### Environment Variables
```bash
# Discord
DISCORD_APPLICATION_ID="123456789"
DISCORD_BOT_TOKEN="your_bot_token"
DISCORD_GUILD_ID="987654321"

# GitHub
GITHUB_TOKEN="ghp_..."
GH_PAT="ghp_..."  # Alternative

# Optional
ENABLE_DEBUG_CMD="true"  # Enable /debug-last command
```

### AWS Lambda Configuration
If deploying as Lambda:
```yaml
# template.yaml
DiscordHandler:
  Environment:
    Variables:
      DISCORD_BOT_TOKEN: !Ref DiscordBotToken
      DISCORD_PUBLIC_KEY: !Ref DiscordPublicKey
      GITHUB_TOKEN: !Ref GitHubToken
```

## 🐛 Troubleshooting

### Command Not Appearing in Discord
1. **Wait 60 seconds** after registration (propagation delay)
2. **Refresh Discord** (Ctrl+R or Cmd+R)
3. **Check bot scopes:** `bot` + `applications.commands`
4. **Verify guild membership:** Bot must be in server

### Agent Analysis Fails
- **Import errors:** Ensure `triage_agents` package is in Python path
- **PyPI timeout:** Check network connectivity, increase timeout
- **AST parsing fails:** File may have syntax errors, uses text fallback

### PR Creation Fails  
- **403 Forbidden:** Check `GITHUB_TOKEN` has `repo` + `workflow` scopes
- **No changes made:** Agents couldn't determine fixes automatically
- **Rate limited:** GitHub API rate limit exceeded, wait and retry

## 📚 API Reference

### Agent Base Class
```python
class Agent(ABC):
    def __init__(self, name: str)
    
    @abstractmethod
    def analyze(self, failure: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a failure and provide insights.
        
        Args:
            failure: {
                "type": str,  # e.g., "missing_dependency"
                "message": str,  # Error message
                "file": str,  # Optional file path
                "line": int,  # Optional line number
                "context": str  # Optional surrounding context
            }
        
        Returns:
            {
                "confidence_boost": int,  # -20 to +30
                "insights": List[str],  # Human-readable insights
                "recommendations": List[str]  # Actionable fixes
            }
        """
```

### Enhanced Triage Function
```python
def enhance_failures_with_agents(
    failures: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Enhance failures with AI agent analysis.
    
    Returns failures sorted by confidence (high to low)
    with added fields:
    - confidence: int (0-100)
    - insights: List[str]
    - recommendations: List[str]
    """
```

## 🎯 Future Enhancements

### Planned Features
- [ ] Real-time CI polling in Discord
- [ ] Interactive fix selection buttons
- [ ] Multi-PR batch triage
- [ ] Custom agent configuration
- [ ] ML-based confidence tuning

### Potential Agents
- **Security Agent:** Check for CVEs in dependencies
- **Performance Agent:** Identify slow tests
- **Documentation Agent:** Suggest README updates
- **Docker Agent:** Analyze container build failures

## 🤝 Contributing

When adding new agents:

1. **Extend `Agent` base class**
2. **Implement `analyze()` method**
3. **Return confidence_boost, insights, recommendations**
4. **Add tests in `test_triage_agents.py`**
5. **Update documentation**

## 📄 License

Same as Project Valine main license.

## 🙌 Credits

- **Design:** Phase 6 speedrun guide
- **Implementation:** AI Copilot Coding Agent
- **Inspiration:** Gen Z speedrun culture 🎮
