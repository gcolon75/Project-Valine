# UX Agent - Discord-Orchestrated Webpage Updates

## Overview

The UX Agent enables automated UI/UX changes to the Project Valine web app through Discord slash commands. It features an **interactive conversation flow** that ensures clarity and confirmation before making any changes. Users can update text, colors, and layout elements by issuing simple commands or plain English descriptions, optionally with screenshots, which automatically create draft GitHub PRs for review.

## Key Features

- 🎨 **Text Updates**: Change header, footer, navbar, and home page text
- 🌈 **Color Updates**: Update component colors with hex codes
- 🔗 **Link Management**: Add navigation links
- 🏷️ **Brand Updates**: Change brand name across components
- 🖼️ **Image Analysis**: Upload screenshots to guide style changes
- 💬 **Conversational Flow**: Interactive confirmation before changes
- 📝 **Draft PRs**: Automatically creates draft PRs for all changes
- 🔒 **Safety**: Never auto-merges; all changes require review
- 📊 **Audit Trail**: Logs all actions for compliance
- 🎮 **Gen Z Friendly**: Meme/gamer friendly tone and examples

## Interaction Flow

The UX Agent follows a conversation-based approach that ensures you always know exactly what's happening:

### 1. User Sends Request

Send a command or description, optionally with images:

```
/ux-update section:header text:"Welcome to Project Valine!"
```

Or use plain English:

```
/ux-update Can you make the navbar blue like in this screenshot?
```

### 2. Agent Restates and Previews

The agent will:
- Restate what you want in clear terms
- Show a code preview of the proposed change
- Ask for confirmation

Example response:
```
🎨 Got it! Here's what I'm about to do:

Section: header
File: src/components/Header.jsx

Changes:
• Update text to: "Welcome to Project Valine!"

Preview:
```jsx
<Link className="text-xl font-semibold">
  Welcome to Project Valine!
</Link>
```

✅ Ready to make this change? Type 'yes' to confirm or 'no' to cancel!
💬 Or tell me what to tweak if this isn't quite right!
```

### 3. Clarifying Questions (if needed)

If something is unclear, the agent will ask:

```
🤔 I need a bit more info to help you out!

1. Which section do you want to update? Choose from: header, navbar, footer, or home page
2. What exactly do you want to change? (e.g., text, color, add a link)

💡 Examples of what you can tell me:
• "Update the header text to 'Level Up!'"
• "Make the navbar background blue"
• "Change the footer text to 'Valine'"
• "Add an About link to the navbar"
```

### 4. User Confirms or Modifies

Respond with:
- `yes` / `confirm` / `go` → Executes the changes
- `no` / `cancel` / `stop` → Cancels the request
- Any other text → Updates the request based on your feedback

### 5. Agent Executes (After Confirmation)

Once confirmed, the agent:
- Creates a branch with the changes
- Opens a draft PR on GitHub
- Posts the PR link in Discord

```
🎨 Header updated! Draft PR: https://github.com/gcolon75/Project-Valine/pull/125
```

## Supported Sections

### Header (`header`)
- **Properties**: `text`, `color`, `links`
- **File**: `src/components/Header.jsx`
- **Examples**:
  - `/ux-update section:header text:"Welcome to Project Valine!"`
  - "Make the header say 'Level Up!'"

### Footer (`footer`)
- **Properties**: `text`, `color`
- **File**: `src/components/Footer.jsx`
- **Examples**:
  - `/ux-update section:footer text:"Valine"`
  - `/ux-update section:footer color:"#FF0080"`
  - "Change the footer color to blue"

### Navbar (`navbar`)
- **Properties**: `text`, `color`, `links`, `brand`
- **File**: `src/components/NavBar.jsx`
- **Examples**:
  - `/ux-update section:navbar brand:"Joint"`
  - `/ux-update section:navbar add-link:"About:/about"`
  - "Make the navbar blue like in the screenshot" [with image]

### Home (`home`)
- **Properties**: `hero-text`, `description`, `cta-text`
- **File**: `src/pages/Home.jsx`
- **Examples**:
  - `/ux-update section:home hero-text:"Your Creative Hub"`
  - `/ux-update section:home description:"Connect with creators worldwide"`
  - `/ux-update section:home cta-text:"Get Started"`
  - "Update the home page headline to 'Artists Connecting to Seekers 24/7'"

## Image Handling

The UX Agent can analyze uploaded images to understand your design intent:

### How to Use Images

1. **Upload screenshot with command:**
   ```
   /ux-update Make the navbar look like this
   [Attach screenshot]
   ```

2. **The agent will analyze the image and ask:**
   ```
   📸 I see you uploaded 1 image. 
   Looking at image 1, what specifically do you want me to change?
   • The background color?
   • The text style?
   • The layout/spacing?
   ```

3. **Reference images by number:**
   ```
   "Use the color from image 1 for the navbar background"
   "Match the text style in image 2"
   ```

### What the Agent Looks For

- **Colors**: Hex codes and dominant colors
- **Text Content**: Any visible text in quotes
- **Layout Cues**: Spacing, alignment hints
- **Style References**: Overall aesthetic direction

**Note:** In the current version, image analysis is basic. The agent will ask clarifying questions to understand your intent. Future versions will include AI-powered visual analysis.


## Usage

### Command Formats

#### Structured Command (Recommended for Precision)
```
/ux-update section:<section> <property>:"<value>"
```

#### Plain English (Natural Language)
```
/ux-update <description of what you want>
```

#### With Image Reference
```
/ux-update <description>
[Attach image(s)]
```

### Examples

#### Update Header Text (Structured)
```
/ux-update section:header text:"Welcome Home!"
```

**Agent Response:**
```
🎨 Got it! Here's what I'm about to do:

Section: header
File: src/components/Header.jsx

Changes:
• Update text to: "Welcome Home!"

Preview:
```jsx
<Link className="text-xl font-semibold">
  Welcome Home!
</Link>
```

✅ Ready to make this change? Type 'yes' to confirm or 'no' to cancel!
```

**User Confirms:**
```
yes
```

**Agent Executes:**
```
🎨 Header updated! Draft PR: https://github.com/gcolon75/Project-Valine/pull/123
```

#### Update with Plain English
```
/ux-update Make the footer text say "Valine"
```

**Agent Response:**
```
🎨 Got it! Here's what I'm about to do:

Section: footer
File: src/components/Footer.jsx

Changes:
• Update text to: "Valine"

Preview:
```jsx
&copy; {new Date().getFullYear()} Valine. All rights reserved.
```

✅ Ready to make this change? Type 'yes' to confirm!
```

#### Needs Clarification Example
```
/ux-update Make it blue
```

**Agent Response:**
```
🤔 I need a bit more info to help you out!

1. Which section do you want to update? Choose from: header, navbar, footer, or home page
2. What exactly do you want to make blue? The background, text, or something else?

💡 Examples of what you can tell me:
• "Update the header text to 'Level Up!'"
• "Make the navbar background blue"
```

**User Clarifies:**
```
The navbar background
```

**Agent Response:**
```
🎨 Got it! Here's what I'm about to do:

Section: navbar
File: src/components/NavBar.jsx

Changes:
• Update color to: blue

Preview:
```css
.navbar {
  background: blue;
}
```

✅ Ready to make this change? Type 'yes' to confirm!
```

#### With Image Upload
```
/ux-update Can you make the navbar match this design?
[Screenshot attached]
```

**Agent Response:**
```
🤔 I see you uploaded 1 image!

Looking at image 1, what specifically should I match?
• The color scheme?
• The text/font style?
• The layout/spacing?

💡 Try being specific like:
• "Use the blue color from image 1"
• "Match the font size in the screenshot"
```

#### Update Footer Color
```
/ux-update section:footer color:"#00FF00"
```

**Agent Response:**
```
🎨 Got it! Here's what I'm about to do:

Section: footer
File: src/components/Footer.jsx

Changes:
• Update color to: #00FF00

Preview:
```css
.footer {
  background: #00FF00;
}
```

✅ Ready to make this change? Type 'yes' to confirm or 'no' to cancel!
💬 Or tell me what to tweak!
```

#### Update Home Hero Text
```
/ux-update section:home hero-text:"Artists Connecting to Seekers 24/7"
```

**Agent Response:**
```
🎨 Got it! Here's what I'm about to do:

Section: home
File: src/pages/Home.jsx

Changes:
• Update Hero Text to: "Artists Connecting to Seekers 24/7"

Preview:
```jsx
<h1 className="text-4xl font-bold">
  Artists Connecting to Seekers 24/7
</h1>
```

✅ Ready to make this change? Type 'yes' to confirm!
```

#### Multiple Updates
```
/ux-update section:header text:"New Title" color:"#FF0080"
```

**Agent Response:**
```
🎨 Got it! Here's what I'm about to do:

Section: header
File: src/components/Header.jsx

Changes:
• Update text to: "New Title"
• Update color to: #FF0080

Preview:
```jsx
<Link className="text-xl font-semibold">
  New Title
</Link>
```

```css
.header {
  background: #FF0080;
}
```

✅ Ready to make this change? Type 'yes' to confirm!
```

#### User Modifies During Confirmation
```
/ux-update section:header text:"Test Title"
```

**Agent:**
```
🎨 Got it! Here's what I'm about to do:
...
✅ Ready to make this change? Type 'yes' to confirm!
```

**User:**
```
Actually, make it "Better Title" instead
```

**Agent:**
```
🎨 Updated! Here's the new preview:

Changes:
• Update text to: "Better Title"

Preview:
```jsx
<Link className="text-xl font-semibold">
  Better Title
</Link>
```

✅ Ready now? Type 'yes' to confirm!
```

## Tone & Style

The UX Agent uses a **Gen Z-friendly, playful tone** that's efficient and direct:

### Response Emojis
- 🎨 Design/UX updates
- 🤔 Clarification needed
- ✅ Confirmation/success
- 🚫 Cancellation
- 📸 Image-related
- 💡 Helpful examples
- 💬 Conversation continues

### Response Patterns

**Confirmation Requests:**
```
✅ Ready to make this change? Type 'yes' to confirm or 'no' to cancel!
💬 Or tell me what to tweak if this isn't quite right!
```

**Clarification Questions:**
```
🤔 I need a bit more info to help you out!
```

**Cancellation:**
```
🚫 No problem! Request cancelled. Hit me up if you want to try something else! 🎮
```

**Success:**
```
🎨 Header updated! Draft PR: https://github.com/...
```

**Examples Offered:**
```
💡 Examples of what you can tell me:
• "Update the header text to 'Level Up!'"
• "Make the navbar background blue"
```

### Conversation Philosophy

1. **Always restate understanding** before acting
2. **Always preview changes** with code snippets
3. **Always confirm** before finalizing
4. **Never assume** — ask when in doubt
5. **Be helpful** with examples when users are stuck
6. **Stay friendly** and gaming/meme references are okay

### Helpful Phrases

- "Got it! Here's what I'm about to do..."
- "I need a bit more info..."
- "Looking at image 1, what specifically..."
- "Ready to make this change?"
- "Or tell me what to tweak!"
- "No problem! Request cancelled."
- "Hit me up if you want to try something else! 🎮"

## Error Handling

The UX Agent provides helpful error messages and examples:

### Missing Section
```
❌ Missing section. 

💡 Examples:
• `/ux-update section:header text:"New Title"`
• "Make the navbar blue"
```

### Invalid Section
```
❌ Unknown section: sidebar. 

Valid sections: header, footer, navbar, home

💡 Try:
• `/ux-update section:header text:"Welcome!"`
```

### Invalid Property
```
❌ Invalid properties for header: background. 

Valid properties for header: text, color, links

💡 Try:
• `/ux-update section:header text:"New Title"`
• `/ux-update section:header color:"#FF0080"`
```

### Invalid Color Format
```
❌ Invalid color format: red. 

Use hex format like #FF0080

💡 Example:
• `/ux-update section:footer color:"#FF0080"`
```

### Vague Request
```
🤔 I need a bit more info to help you out!

1. Which section do you want to update? Choose from: header, navbar, footer, or home page

💡 Examples of what you can tell me:
• "Update the header text to 'Level Up!'"
• "Make the navbar background blue"
• "Change the footer text to 'Valine'"
```

### Conversation Expired
```
❌ Conversation not found or expired. Please start a new request.

💡 Try:
• `/ux-update section:header text:"Welcome!"`
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
- ✅ **Asks for clarification** when requests are vague
- ✅ **Shows previews** of all proposed changes
- ✅ **Waits for confirmation** before executing
- ✅ **Creates draft PRs** (never auto-merges)
- ✅ **Validates all inputs** (colors, sections, properties)
- ✅ **Provides clear error messages** with examples
- ✅ **Logs all actions** for audit
- ✅ **Assigns PRs to requester** for review
- ✅ **Supports plain English** and structured commands
- ✅ **Analyzes images** (basic support, asks clarifying questions)

### What UX Agent DOES NOT Do
- ❌ **Never executes without confirmation**
- ❌ **Never auto-merges PRs**
- ❌ **Never modifies files without PR review**
- ❌ **Never updates unspecified sections**
- ❌ **Never bypasses validation**
- ❌ **Never assumes vague requests** (asks questions instead)
- ❌ **Never proceeds with unclear image intent** (asks what to change)

### Conversation Safety

**Multi-Step Confirmation:**
1. Parse user intent
2. Generate preview with code snippets
3. Ask for explicit confirmation
4. Wait for 'yes'/'confirm'/'go' response
5. Only then create PR

**User Control:**
- Cancel anytime with 'no'/'cancel'/'stop'
- Modify request during confirmation
- See exactly what will change before it happens

**Audit Trail:**
Every interaction includes:
- User ID who requested
- Timestamp of request
- Conversation ID for tracking
- All clarifications and modifications
- Final confirmed changes

## Future Enhancements

Potential future features:
- 🖼️ **AI-Powered Image Analysis**: Advanced computer vision to extract colors, fonts, layouts from screenshots
- 📱 **Responsive Design Tweaks**: Preview changes across mobile/tablet/desktop
- 🎭 **Theme/Style Presets**: Apply pre-defined design themes
- 🔄 **Batch Updates**: Update multiple sections in one command
- 📸 **Preview Screenshots**: Generate before/after screenshots in Discord
- 🤖 **AI-Suggested Improvements**: Proactive UX recommendations
- 📊 **Analytics Integration**: Track which UX changes improve engagement
- 🎨 **Color Palette Generation**: Extract full color schemes from images
- ✏️ **Font Detection**: Identify and apply fonts from screenshots
- 🔍 **Component Discovery**: Auto-detect components in uploaded designs

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
