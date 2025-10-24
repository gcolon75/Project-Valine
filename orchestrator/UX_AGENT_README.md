# UX Agent - Discord-Orchestrated Webpage Updates

## Overview

The UX Agent enables automated UI/UX changes to the Project Valine web app through Discord slash commands. Users can update text, colors, and layout elements by issuing simple commands, which automatically create draft GitHub PRs for review.

## Features

- 🎨 **Text Updates**: Change header, footer, navbar, and home page text
- 🌈 **Color Updates**: Update component colors with hex codes
- 🔗 **Link Management**: Add navigation links
- 🏷️ **Brand Updates**: Change brand name across components
- 📝 **Draft PRs**: Automatically creates draft PRs for all changes
- 🔒 **Safety**: Never auto-merges; all changes require review
- 📊 **Audit Trail**: Logs all actions for compliance

## Supported Sections

### Header (`header`)
- **Properties**: `text`, `color`, `links`
- **File**: `src/components/Header.jsx`
- **Examples**:
  - `/ux-update section:header text:"Welcome to Project Valine!"`

### Footer (`footer`)
- **Properties**: `text`, `color`
- **File**: `src/components/Footer.jsx`
- **Examples**:
  - `/ux-update section:footer text:"Valine"`
  - `/ux-update section:footer color:"#FF0080"`

### Navbar (`navbar`)
- **Properties**: `text`, `color`, `links`, `brand`
- **File**: `src/components/NavBar.jsx`
- **Examples**:
  - `/ux-update section:navbar brand:"Joint"`
  - `/ux-update section:navbar add-link:"About:/about"`

### Home (`home`)
- **Properties**: `hero-text`, `description`, `cta-text`
- **File**: `src/pages/Home.jsx`
- **Examples**:
  - `/ux-update section:home hero-text:"Your Creative Hub"`
  - `/ux-update section:home description:"Connect with creators worldwide"`
  - `/ux-update section:home cta-text:"Get Started"`

## Usage

### Basic Command Structure

```
/ux-update section:<section> <property>:"<value>"
```

### Examples

#### Update Header Text
```
/ux-update section:header text:"Welcome Home!"
```
**Bot Response:**
```
🎨 UX update for header queued! https://github.com/gcolon75/Project-Valine/pull/123
```

#### Update Footer Color
```
/ux-update section:footer color:"#00FF00"
```
**Bot Response:**
```
🌈 Footer color updated to #00FF00 — see your PR: https://github.com/gcolon75/Project-Valine/pull/124
```

#### Update Navbar Brand
```
/ux-update section:navbar brand:"Joint"
```
**Bot Response:**
```
🎨 Navbar updated! Draft PR: https://github.com/gcolon75/Project-Valine/pull/125
```

#### Update Home Hero Text
```
/ux-update section:home hero-text:"Artists Connecting to Seekers 24/7"
```
**Bot Response:**
```
🎨 Home updated! Draft PR: https://github.com/gcolon75/Project-Valine/pull/126
```

### Multiple Updates

You can combine multiple property updates in one command:
```
/ux-update section:header text:"New Title" color:"#FF0080"
```

### Add Navigation Links

Add links with format `Label:/path` or just `/path`:
```
/ux-update section:navbar add-link:"About:/about"
/ux-update section:navbar add-link:"/contact"
```

## Error Handling

The UX Agent provides helpful error messages:

### Missing Section
```
❌ Missing section. Try: `/ux-update section:header text:"New Title"`
```

### Invalid Section
```
❌ Unknown section: sidebar. Valid sections: header, footer, navbar, home
```

### Invalid Property
```
❌ Invalid properties for header: background. Valid: text, color, links
```

### Invalid Color Format
```
❌ Invalid color format: red. Use hex format like #FF0080
```

## Implementation Details

### Architecture

1. **Command Parsing**: Discord interaction → UXAgent.parse_command()
2. **Validation**: Section and property validation
3. **Change Generation**: Generate file modifications
4. **PR Creation**: Create branch, commit changes, open draft PR
5. **Discord Response**: Send summary and PR link

### File Structure

```
orchestrator/
├── app/
│   ├── agents/
│   │   ├── ux_agent.py          # Main UX Agent implementation
│   │   └── registry.py          # Agent registry (includes UXAgent)
│   └── handlers/
│       └── discord_handler.py   # Discord command handler
├── tests/
│   └── test_ux_agent.py         # UX Agent tests
├── register_ux_command.py       # Command registration script
└── UX_AGENT_README.md          # This file
```

### Agent Configuration

The UX Agent is configured in `app/agents/registry.py`:

```python
AgentInfo(
    id='ux_agent',
    name='UX Agent',
    description='Automates UI/UX changes via Discord commands. Updates text, colors, layout, and links in React components. Opens draft PRs with proposed changes for review.',
    command='/ux-update'
)
```

### Section Mappings

Sections are mapped to files and supported properties:

```python
SECTION_MAPPINGS = {
    'header': {
        'file': 'src/components/Header.jsx',
        'component': 'Header',
        'properties': ['text', 'color', 'links']
    },
    'footer': {
        'file': 'src/components/Footer.jsx',
        'component': 'Footer',
        'properties': ['text', 'color']
    },
    # ... more sections
}
```

## Testing

Run the UX Agent tests:

```bash
cd orchestrator
python -m unittest tests.test_ux_agent -v
```

Test coverage:
- Command parsing (valid and invalid inputs)
- Section validation
- Property validation
- Text change generation
- Color change generation (with hex validation)
- Link change generation
- PR body generation
- Error handling

## Deployment

### 1. Register Discord Command

```bash
cd orchestrator
export DISCORD_APPLICATION_ID="your_app_id"
export DISCORD_BOT_TOKEN="your_bot_token"
export DISCORD_GUILD_ID="your_guild_id"
python register_ux_command.py
```

### 2. Deploy Lambda Handler

The handler is automatically deployed with the orchestrator Lambda function. The `/ux-update` command is already integrated into `discord_handler.py`.

### 3. Verify Installation

In Discord, type `/` and verify that `/ux-update` appears in the autocomplete list.

Test with a simple command:
```
/ux-update section:header text:"Test Update"
```

## Safety & Restrictions

### What UX Agent DOES
- ✅ Creates draft PRs (never auto-merges)
- ✅ Validates all inputs
- ✅ Provides clear error messages
- ✅ Logs all actions for audit
- ✅ Assigns PRs to requester

### What UX Agent DOES NOT Do
- ❌ Never auto-merges PRs
- ❌ Never modifies files without PR review
- ❌ Never updates unspecified sections
- ❌ Never bypasses validation

## Tone & Style

The UX Agent uses a Gen Z-friendly, playful tone:
- 🎨 Visual emoji indicators
- Direct, efficient responses
- Helpful examples on errors
- Gaming/meme references okay

Example responses:
```
🎨 Header text updated to 'Welcome Home!' — Draft PR created: [link]
🌈 Footer color updated to #00FF00 — see your PR: [link]
❌ Could not process your request — try `/ux-update section:header text:"New Title"`
```

## Future Enhancements

Potential future features:
- 🖼️ Image updates (hero images, logos)
- 📱 Responsive design tweaks
- 🎭 Theme/style presets
- 🔄 Batch updates
- 📸 Preview screenshots in Discord
- 🤖 AI-suggested improvements
- 📊 Analytics integration

## Troubleshooting

### Command Not Appearing
1. Wait 60 seconds after registration (Discord propagation)
2. Refresh Discord (Ctrl+R / Cmd+R)
3. Check bot has `applications.commands` scope

### PR Creation Fails
1. Verify GitHub token has write permissions
2. Check repository exists and is accessible
3. Ensure branch name doesn't conflict

### No Response from Bot
1. Check Lambda logs in CloudWatch
2. Verify Discord endpoint is healthy
3. Test with `/status` command first

## Support

For issues or questions:
1. Check CloudWatch logs for error details
2. Review PR comments for validation feedback
3. Test with simpler commands first
4. Contact DevOps team if Lambda issues persist

## Related Documentation

- [Agent Registry](app/agents/registry.py)
- [Discord Handler](app/handlers/discord_handler.py)
- [Discord Slash Command Agent](DISCORD_SLASH_CMD_AGENT.md)
- [Orchestrator README](README.md)
