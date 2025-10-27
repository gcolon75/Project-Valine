# Bot Unifier Guide - Project Valine

## Overview

Project Valine uses a **unified bot architecture** where a single Discord bot (Rin) handles all interactions, but different "agent personalities" provide specialized messaging styles through embeds, emojis, and formatting.

### The Rin Bot 🎮

**Rin** is the core orchestrator bot that:
- Uses a single `DISCORD_BOT_TOKEN` for all Discord interactions
- Routes slash commands to appropriate handlers
- Manages all webhook and event processing
- Coordinates between GitHub Actions and Discord

### Agent Personalities

Instead of running multiple bots with different tokens, we use **agent personalities** that are just different messaging styles powered by the same bot:

| Agent | Emoji | Role | Color | Commands |
|-------|-------|------|-------|----------|
| **Amadeus** | 🚀 | Deployment Specialist | Blue (#3498db) | `/deploy-client` |
| **BuildAgent** | 🏗️ | Build Monitor | Orange (#e67e22) | Build notifications |
| **StatusAgent** | 📊 | Status Reporter | Gray (#95a5a6) | `/status`, `/status-digest` |
| **VerifyAgent** | ✅ | Deployment Verifier | Green (#2ecc71) | `/verify-latest`, `/verify-run` |
| **DiagnoseAgent** | 🔍 | Infrastructure Diagnostics | Purple (#9b59b6) | `/diagnose` |
| **TriageAgent** | 🔧 | Issue Diagnostics | Gold (#f39c12) | `/triage` |
| **Rin** | 🎮 | Core Orchestrator | Pink (#e91e63) | General commands |

## Why Unified Architecture?

### ✅ Benefits

1. **Single Token Management**: Only one `DISCORD_BOT_TOKEN` to secure and rotate
2. **Simplified Permissions**: One bot with all necessary Discord permissions
3. **Easier Deployment**: Deploy once, all features available
4. **Consistent Experience**: Users interact with one bot identity
5. **Resource Efficient**: Single Lambda function handles all interactions
6. **Cleaner Audit Trail**: All actions traced to one bot identity

### 🎭 Personality Through Formatting

Each agent has its own "voice" through:

- **Custom Emojis**: Visual identity in every message
- **Branded Colors**: Distinct embed colors for each agent
- **Unique Tone**: Messaging style fits the agent's role
- **Footer Attribution**: "Powered by Rin" shows unified architecture

## Implementation

### Agent Messenger Module

Location: `orchestrator/app/utils/agent_messenger.py`

```python
from utils.agent_messenger import get_agent_messenger, AMADEUS, BUILD_AGENT

# Initialize messenger
discord_service = DiscordService()
messenger = get_agent_messenger(discord_service)

# Send as Amadeus
messenger.send_as_agent(
    channel_id='123456789',
    content='Client deployed successfully!',
    agent='amadeus',
    as_embed=True
)
```

### Example Messages

#### Amadeus (Deployment)

```
🚀 Amadeus: Client deployment initiated! 🚀

Correlation ID: `a1b2c3d4...`
Requested by: user123

⏳ Deployment in progress. Use `/status` to check progress.
```

#### StatusAgent (Build Status)

```
📊 StatusAgent: Workflow status report

Showing last 2 run(s) per workflow

Client Deploy:
🟢 success • 2h ago • 3m 45s • [run](https://github.com/...)
🔴 failure • 5h ago • 2m 12s • [run](https://github.com/...)
```

#### BuildAgent (Build Notifications)

```
🏗️ BuildAgent: Build completed!

Status: ✅ Success
Duration: 4m 23s
Branch: main
Commit: abc1234
```

## Usage Examples

### 1. Deploy Command (Amadeus)

User runs: `/deploy-client api_base:https://api.example.com`

Response:
```
🚀 Amadeus: Client deployment initiated! 🚀

API Base Override: `https://api.example.com`
Correlation ID: `f4e3d2c1...`
Requested by: developer123

⏳ Deployment in progress. Use `/status` to check progress.
```

### 2. Status Check (StatusAgent)

User runs: `/status count:2`

Response:
```
📊 StatusAgent: Workflow status report

Showing last 2 run(s) per workflow

Client Deploy:
🟢 success • 1h ago • 3m 12s • [run](...)
🟡 running • 5m ago • ongoing • [run](...)

Diagnose on Demand:
🟢 success • 3h ago • 45s • [run](...)
```

### 3. Successful Deployment (Amadeus Follow-up)

After deployment completes:
```
🚀 Amadeus: Mission accomplished! 🎉

Correlation ID: `f4e3d2c1...`
Run: https://github.com/.../actions/runs/12345

✅ Client deployed successfully and ready for action!
```

### 4. Failed Deployment (Amadeus Follow-up)

After deployment fails:
```
🚀 Amadeus: Deployment failed! 💥

Correlation ID: `f4e3d2c1...`
Run: https://github.com/.../actions/runs/12345
Status: failure

❌ Check the run logs for details. Use `/triage` for auto-fix.
```

## Configuration

### Environment Variables

Only ONE Discord bot token is needed:

```bash
# .env
DISCORD_BOT_TOKEN=your_single_bot_token_here
DISCORD_PUBLIC_KEY=your_discord_public_key
DISCORD_APPLICATION_ID=your_application_id
```

### Discord Bot Setup

1. Create ONE Discord application at https://discord.com/developers/applications
2. Enable bot features and get the token
3. Set bot permissions (slash commands, send messages, embed links)
4. Install bot to your server
5. Use this same token for all agent personalities

## Migrating from Multiple Bots (If Applicable)

If you previously had separate bots (Amadeus Bot, Build Bot, etc.):

### Step 1: Consolidate Tokens
Replace all bot tokens with Rin's token:
```bash
# OLD (multiple tokens)
AMADEUS_BOT_TOKEN=token1
BUILD_BOT_TOKEN=token2

# NEW (single token)
DISCORD_BOT_TOKEN=rin_token
```

### Step 2: Update Code
Replace direct Discord API calls with agent messenger:

```python
# OLD (separate bot)
amadeus_bot.send_message(channel_id, "Deploy started!")

# NEW (agent personality)
messenger.send_as_agent(channel_id, "Deploy started!", agent='amadeus')
```

### Step 3: Remove Old Bots
1. Deactivate old Discord applications
2. Remove old tokens from secrets/environment
3. Update documentation references

### Step 4: Test All Commands
Verify each command works with unified bot:
- `/deploy-client` (Amadeus)
- `/status` (StatusAgent)
- `/diagnose` (DiagnoseAgent)
- `/verify-latest` (VerifyAgent)
- `/triage` (TriageAgent)
- `/triage-all` (TriageAgent)

## Customization

### Adding New Agent Personalities

Edit `orchestrator/app/utils/agent_messenger.py`:

```python
# Define new agent
SECURITY_AGENT = AgentPersonality(
    name='SecurityAgent',
    emoji='🔒',
    color=0xc0392b,  # Dark red
    description='Security Monitoring'
)

# Register in AgentMessenger.__init__
self.agents = {
    # ... existing agents ...
    'security': SECURITY_AGENT
}
```

### Customizing Existing Agents

Modify personality attributes:

```python
AMADEUS = AgentPersonality(
    name='Amadeus',
    emoji='🚀',
    color=0x3498db,  # Change color
    description='Deployment Specialist'
)
```

## Best Practices

### 1. Consistent Agent Usage
- Use Amadeus for all deployment-related messages
- Use StatusAgent for workflow status reports
- Use BuildAgent for build notifications

### 2. Embed vs Plain Text
- Use embeds for rich, structured information
- Use plain text for quick updates and simple messages

### 3. Error Handling
- Always include agent branding in error messages
- Provide actionable next steps (e.g., "Use `/triage` for auto-fix")

### 4. User Experience
- Keep messages concise and informative
- Use emojis consistently for visual recognition
- Include relevant links (GitHub runs, documentation)

## Troubleshooting

### Issue: Messages appear as "Rin" instead of agent name

**Solution**: Ensure you're using `agent='agent_name'` parameter:
```python
# Wrong
messenger.send_as_agent(channel_id, content)

# Correct
messenger.send_as_agent(channel_id, content, agent='amadeus')
```

### Issue: Embeds not showing

**Solution**: Check that `as_embed=True` is set:
```python
messenger.send_as_agent(channel_id, content, agent='amadeus', as_embed=True)
```

### Issue: Colors not appearing

**Solution**: Verify color values are integers (not hex strings):
```python
# Wrong
color='#3498db'

# Correct
color=0x3498db
```

## FAQ

### Q: Can users tell it's the same bot?

A: Yes, but that's by design! The footer "Powered by Rin" makes this transparent. Users see specialized agents that are all part of the unified Rin orchestrator.

### Q: Can I still use different bot avatars for each agent?

A: No, the bot avatar is shared. However, embeds, emojis, and colors provide strong visual differentiation.

### Q: How do I handle webhooks for different agents?

A: All webhooks go to the same endpoint. Route internally based on event type and use appropriate agent personality for responses.

### Q: Can I disable specific agent personalities?

A: Yes, simply don't call that agent in your handlers. The personalities are just formatting helpers.

### Q: Is this approach Discord ToS compliant?

A: Yes! This is using Discord's intended architecture: one bot with rich embed formatting to represent different contexts.

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                  Discord                        │
│                                                 │
│  User types: /deploy-client                    │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│            Rin Bot (Single Token)               │
│                                                 │
│  ┌──────────────────────────────────────┐      │
│  │      Discord Handler (Lambda)         │      │
│  │                                       │      │
│  │  Routes to: handle_deploy_client_cmd │      │
│  └──────────────┬───────────────────────┘      │
│                 │                               │
│                 ▼                               │
│  ┌──────────────────────────────────────┐      │
│  │      AgentMessenger                   │      │
│  │                                       │      │
│  │  Personalities:                       │      │
│  │  - Amadeus (Deploy) 🚀                │      │
│  │  - BuildAgent 🏗️                      │      │
│  │  - StatusAgent 📊                     │      │
│  │  - VerifyAgent ✅                     │      │
│  │  - DiagnoseAgent 🔍                   │      │
│  │  - TriageAgent 🔧                     │      │
│  └──────────────┬───────────────────────┘      │
└─────────────────┼───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│         Discord (Message Sent)                  │
│                                                 │
│  🚀 Amadeus: Client deployment initiated! 🚀   │
│                                                 │
│  Correlation ID: `f4e3d2c1...`                 │
│  Requested by: developer123                     │
│                                                 │
│  ⏳ Deployment in progress.                     │
└─────────────────────────────────────────────────┘
```

## References

- Discord Embed Documentation: https://discord.com/developers/docs/resources/channel#embed-object
- Agent Messenger Code: `orchestrator/app/utils/agent_messenger.py`
- Discord Handler: `orchestrator/app/handlers/discord_handler.py`
- Discord Service: `orchestrator/app/services/discord.py`

## Changelog

- **2025-10-24**: Initial bot unifier implementation
  - Created AgentMessenger module
  - Updated deploy-client command to use Amadeus personality
  - Updated status command to use StatusAgent personality
  - Added comprehensive documentation

---

**Powered by Rin 🎮** - One bot, many personalities, infinite possibilities!
