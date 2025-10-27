# UX Agent Quick Start Guide

## What is the UX Agent?

The UX Agent is an **interactive Discord bot** that helps you update Project Valine's UI/UX through simple commands. It features:
- ✅ **Interactive conversation flow** with confirmation before changes
- 📸 **Image upload support** for design references
- 💬 **Plain English commands** (no coding required!)
- 🎨 **Live code previews** before applying changes
- 🔒 **Always creates draft PRs** (never auto-merges)

## Quick Start in 3 Steps

### Step 1: Send Your Request

Choose your style:

#### Option A: Structured Command (Most Precise)
```
/ux-update command:"section:header text:\"Level Up!\""
```

#### Option B: Plain English (Most Natural)
```
/ux-update description:"Make the navbar blue"
```

#### Option C: With Image (Most Visual)
```
/ux-update description:"Match this design"
[Attach screenshot]
```

### Step 2: Review the Preview

The agent shows you exactly what will change:
```
🎨 Got it! Here's what I'm about to do:

Section: header
File: src/components/Header.jsx

Changes:
• Update text to: "Level Up!"

Preview:
```jsx
<Link className="text-xl font-semibold">
  Level Up!
</Link>
```

✅ Ready to make this change? Type 'yes' to confirm!
```

### Step 3: Confirm or Modify

Respond with:
- **`yes`** → Creates draft PR
- **`no`** → Cancels request  
- **Any other text** → Modifies your request

## Quick Examples

```bash
# Update header text (plain English)
/ux-update description:"Change header to 'Welcome Home!'"

# Change footer color (structured)
/ux-update command:"section:footer color:\"#FF0080\""

# Update brand name (plain English)
/ux-update description:"Update the navbar brand to 'Joint'"

# Add navigation link
/ux-update description:"Add an About link to the navbar"

# Use design reference
/ux-update description:"Make the navbar look like this"
[Attach screenshot]
```

## What You Can Update

| Section | Properties | File |
|---------|-----------|------|
| `header` | text, color, links | `src/components/Header.jsx` |
| `footer` | text, color | `src/components/Footer.jsx` |
| `navbar` | text, color, links, brand | `src/components/NavBar.jsx` |
| `home` | hero-text, description, cta-text | `src/pages/Home.jsx` |

## How It Works (Interactive Flow)

1. **You send a request** in Discord (command, plain English, or with images)
2. **Agent asks clarifying questions** if needed
3. **Agent shows preview** of exactly what will change
4. **You confirm** (or modify, or cancel)
5. **Agent creates draft PR** after your confirmation
6. **You review and merge** when ready
7. **Changes go live!** 🎉

### Example Conversation

```
👤 User: /ux-update description:"Make the header say 'Level Up!'"

🤖 Agent: 
🎨 Got it! Here's what I'm about to do:
...
✅ Ready to make this change? Type 'yes' to confirm!

👤 User: Actually, make it "Game On!" instead

🤖 Agent:
🎨 Updated! Here's the new preview:
Changes: Update text to: "Game On!"
...
✅ Ready now? Type 'yes' to confirm!

👤 User: yes

🤖 Agent:
🎨 Header updated! Draft PR: https://github.com/...
```

## Safety Features

- ✅ **Asks for confirmation** - Never executes without your approval
- ✅ **Shows previews** - See exactly what will change
- ✅ **Never auto-merges** - All changes are in draft PRs
- ✅ **Validates inputs** - Prevents invalid changes
- ✅ **Clear errors** - Helpful messages with examples
- ✅ **Audit trail** - All actions are logged
- ✅ **Conversation flow** - Ask clarifying questions when unclear

## Bot Response Examples

### ✅ Success (After Confirmation)
```
🎨 Header updated! Draft PR: https://github.com/gcolon75/Project-Valine/pull/123
```

### 🤔 Needs Clarification
```
🤔 I need a bit more info to help you out!

1. Which section do you want to update? Choose from: header, navbar, footer, or home page

💡 Examples of what you can tell me:
• "Update the header text to 'Level Up!'"
• "Make the navbar background blue"
```

### 🎨 Preview (Awaiting Confirmation)
```
🎨 Got it! Here's what I'm about to do:

Section: footer
File: src/components/Footer.jsx

Changes:
• Update color to: #FF0080

Preview:
```css
.footer {
  background: #FF0080;
}
```

✅ Ready to make this change? Type 'yes' to confirm or 'no' to cancel!
💬 Or tell me what to tweak!
```

### 🚫 Cancellation
```
🚫 No problem! Request cancelled. Hit me up if you want to try something else! 🎮
```

### ❌ Error
```
❌ Unknown section: sidebar
Valid sections: header, footer, navbar, home

💡 Try: /ux-update description:"Update the header to..."
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

Run the conversation demo to see how it works:

```bash
cd orchestrator
python examples/ux_agent_conversation_demo.py
```

This shows 5 interactive scenarios:
1. Structured command with confirmation
2. Plain text needing clarification
3. Modification during confirmation
4. User cancellation
5. Request with image attachments

Run the unit tests:

```bash
cd orchestrator
python -m unittest tests.test_ux_agent -v
```

Expected output: `Ran 32 tests in 0.004s - OK`

## Common Use Cases

### Rebrand Your Site (Interactive)
```
👤: /ux-update description:"Update navbar brand to 'Joint'"
🤖: [Shows preview]
👤: yes
🤖: ✅ Done! Draft PR created

👤: /ux-update description:"Change footer to 'Joint'"
🤖: [Shows preview]
👤: yes
🤖: ✅ Done!
```

### Update Hero Section
```
👤: /ux-update description:"Change home page headline to 'Welcome to Your Creative Hub'"
🤖: [Shows preview with code snippet]
👤: yes
🤖: ✅ Home updated! Draft PR: ...
```

### Change Color Scheme (with modifications)
```
👤: /ux-update command:"section:header color:\"#4A90E2\""
🤖: [Shows preview]
👤: Actually, make it #5BA3F5 instead
🤖: [Shows updated preview]
👤: yes
🤖: ✅ Header updated!
```

### Add Navigation Link
```
👤: /ux-update description:"Add an About page link to navbar"
🤖: [Asks for clarification] What path should I use?
👤: /about
🤖: [Shows preview]
👤: yes
🤖: ✅ Link added!
```

## Troubleshooting

### "Conversation not found or expired"
Your conversation timed out. Start a new request with `/ux-update`

### "I need a bit more info..."
The agent needs clarification. Answer the questions it asks.

### Command doesn't appear in Discord
- Wait 60 seconds after registration (Discord propagation)
- Refresh Discord (Ctrl+R or Cmd+R)
- Check bot has `applications.commands` scope

### "Unknown section" error
Use one of: `header`, `footer`, `navbar`, `home`

### "Invalid color format" error
Use hex format like `#FF0080` (not color names like `red`)

### PR creation fails
- Check GitHub token permissions
- Verify repository access
- Check CloudWatch logs for details

### Agent doesn't understand my request
Be more specific:
- ❌ "Make it blue"
- ✅ "Make the navbar background blue"

## Pro Tips

1. **Be specific**: "navbar background blue" > "make it blue"
2. **Use quotes**: For text with spaces: `"Welcome Home!"`
3. **Hex colors only**: `#FF0080` not `red`
4. **Modify anytime**: Change your mind during preview
5. **Cancel freely**: Just say `no` - no worries!
6. **Images help**: Upload mockups for color/style references

## More Info

- Full docs: [UX_AGENT_README.md](UX_AGENT_README.md)
- Conversation demo: [examples/ux_agent_conversation_demo.py](examples/ux_agent_conversation_demo.py)
- Tests: [tests/test_ux_agent.py](tests/test_ux_agent.py)
- Implementation: [app/agents/ux_agent.py](app/agents/ux_agent.py)

## Support

Having issues? Check:
1. Try the conversation demo script locally
2. CloudWatch logs for errors
3. PR comments for validation feedback
4. Start with simple text changes first

---

**Gen Z Tip**: The agent speaks your language! Be casual, friendly, and don't worry about perfect syntax. It's designed to help, not judge 🎮

**Remember**: The agent ALWAYS asks for confirmation before changing anything. You're in full control!
