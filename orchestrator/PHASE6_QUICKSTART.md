# Phase 6: Discord Triage Bot + AI Agents - Quick Start

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Python 3.10+
- Discord bot with slash commands enabled
- GitHub token with `repo` + `workflow` scopes

### 1. Install Dependencies
```bash
cd orchestrator
pip install -r requirements.txt
```

### 2. Set Environment Variables
```bash
# Discord
export DISCORD_APPLICATION_ID="your_app_id"
export DISCORD_BOT_TOKEN="your_bot_token"
export DISCORD_GUILD_ID="your_guild_id"

# GitHub
export GITHUB_TOKEN="ghp_..."
```

### 3. Register Discord Command
```bash
python3 scripts/register_triage_command.py
```

### 4. Test Agents Locally
```bash
# Run tests
python3 -m unittest tests.test_triage_agents -v

# Test script
python3 scripts/auto_triage_with_agents.py --repo gcolon75/Project-Valine --pr 60
```

### 5. Use in Discord
```
/triage pr:60
```

## 📚 Full Documentation
See [PHASE6_TRIAGE_BOT_GUIDE.md](../PHASE6_TRIAGE_BOT_GUIDE.md) for complete details.

## 🧪 Quick Test Example

```python
from triage_agents import DevAgent, OpsAgent, AnalystAgent

# Sample failure
failure = {
    "type": "missing_dependency",
    "message": "ModuleNotFoundError: No module named 'requests'",
    "file": "orchestrator/scripts/test.py",
    "line": 42
}

# Run agents
agents = [DevAgent(), OpsAgent(), AnalystAgent()]
for agent in agents:
    result = agent.analyze(failure)
    print(f"{agent.name}: {result}")
```

## 🎯 What's Implemented

✅ AI Agent System (DevAgent, OpsAgent, AnalystAgent)  
✅ Discord `/triage` command handler  
✅ Enhanced triage script with agent integration  
✅ Command registration utility  
✅ 10 passing unit tests  
✅ Comprehensive documentation  

## 🔨 What's Remaining

⏳ CI polling for PR check status  
⏳ Discord embed formatting  
⏳ Interactive buttons for PR creation  
⏳ Full end-to-end integration  
⏳ Deployment to AWS Lambda  

## 🆘 Troubleshooting

**Command doesn't appear in Discord?**
- Wait 60 seconds after registration
- Refresh Discord (Ctrl+R / Cmd+R)
- Check bot has `applications.commands` scope

**Agent tests fail?**
- Ensure you're in the `orchestrator` directory
- Check Python version is 3.10+
- Verify `requests` is installed

**PyPI validation fails?**
- Check internet connectivity
- May hit rate limits (cached after first call)
- Use mock in tests if needed

## 📞 Support

See troubleshooting section in [PHASE6_TRIAGE_BOT_GUIDE.md](../PHASE6_TRIAGE_BOT_GUIDE.md)

## 🎮 LFG! 🚀
