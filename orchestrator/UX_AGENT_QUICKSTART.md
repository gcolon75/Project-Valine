# UX Agent Quick Start Guide

## What is the UX Agent?

The UX Agent is a Discord bot feature that allows you to update your website's UI/UX through simple slash commands. Instead of manually editing code files and creating PRs, you can just type a command in Discord!

## Quick Examples

```bash
# Change header text
/ux-update section:header text:"Welcome to Project Valine!"

# Change footer color
/ux-update section:footer color:"#FF0080"

# Update brand name
/ux-update section:navbar brand:"Joint"

# Update homepage hero text
/ux-update section:home hero-text:"Your Creative Hub"
```

## What You Can Update

| Section | Properties | File |
|---------|-----------|------|
| `header` | text, color, links | `src/components/Header.jsx` |
| `footer` | text, color | `src/components/Footer.jsx` |
| `navbar` | text, color, links, brand | `src/components/NavBar.jsx` |
| `home` | hero-text, description, cta-text | `src/pages/Home.jsx` |

## How It Works

1. You type a `/ux-update` command in Discord
2. The UX Agent validates your request
3. It creates a draft PR with your changes
4. You review and merge the PR when ready
5. Your changes go live! 🎉

## Safety Features

- ✅ **Never auto-merges** - All changes are in draft PRs
- ✅ **Validates inputs** - Prevents invalid changes
- ✅ **Clear errors** - Helpful messages if something's wrong
- ✅ **Audit trail** - All actions are logged

## Bot Responses

### ✅ Success
```
🎨 UX Update Queued!

Section: header
Updates:
• text: Welcome to Project Valine!

Requested by: yourname
Draft PR: https://github.com/gcolon75/Project-Valine/pull/123

✅ A draft PR has been created for review.
```

### ❌ Error
```
❌ Unknown section: sidebar
Valid sections: header, footer, navbar, home
```

## Installation (For Admins)

### 1. Register the Command

```bash
cd orchestrator
export DISCORD_APPLICATION_ID="your_app_id"
export DISCORD_BOT_TOKEN="your_bot_token"
export DISCORD_GUILD_ID="your_guild_id"
python register_ux_command.py
```

### 2. Deploy Lambda

The handler is already integrated. Just deploy your orchestrator Lambda:

```bash
# Your normal deployment process
sam deploy
```

### 3. Test It

In Discord, type `/` and you should see `/ux-update` in the autocomplete.

Try it:
```
/ux-update section:header text:"Test Update"
```

## Testing Locally

Run the demo script to see how it works:

```bash
cd orchestrator
python examples/ux_agent_demo.py
```

Run the tests:

```bash
cd orchestrator
python -m unittest tests.test_ux_agent -v
```

## Common Use Cases

### Rebrand Your Site
```bash
/ux-update section:navbar brand:"Joint"
/ux-update section:footer text:"Joint"
```

### Update Hero Section
```bash
/ux-update section:home hero-text:"Welcome to Your Creative Hub"
/ux-update section:home description:"Where artists and collaborators meet"
/ux-update section:home cta-text:"Join Now"
```

### Change Color Scheme
```bash
/ux-update section:header color:"#4A90E2"
/ux-update section:footer color:"#4A90E2"
```

### Add Navigation Link
```bash
/ux-update section:navbar add-link:"About:/about"
```

## Troubleshooting

### Command doesn't appear in Discord
- Wait 60 seconds after registration (Discord propagation)
- Refresh Discord (Ctrl+R or Cmd+R)
- Check bot has `applications.commands` scope

### "Unknown section" error
Make sure you use one of: `header`, `footer`, `navbar`, `home`

### "Invalid color format" error
Use hex format like `#FF0080` (not `red` or `blue`)

### PR creation fails
- Check GitHub token permissions
- Verify repository access
- Check CloudWatch logs for details

## More Info

- Full docs: [UX_AGENT_README.md](UX_AGENT_README.md)
- Demo script: [examples/ux_agent_demo.py](examples/ux_agent_demo.py)
- Tests: [tests/test_ux_agent.py](tests/test_ux_agent.py)
- Implementation: [app/agents/ux_agent.py](app/agents/ux_agent.py)

## Support

Having issues? Check:
1. CloudWatch logs for errors
2. PR comments for validation feedback
3. Try simpler commands first
4. Run the demo script locally

---

**Pro Tip**: Start with small text changes to get familiar with the workflow before doing larger updates!
