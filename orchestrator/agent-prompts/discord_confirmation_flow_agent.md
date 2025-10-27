# Discord Bot Multi-Turn Confirmation Flow Agent Prompt

This document provides a reusable AI agent prompt pattern for handling multi-turn confirmation workflows in Discord bots (like Rin) that require user confirmation before executing actions.

## Problem Statement

Discord bots using slash commands face a fundamental technical limitation:

**Plain text responses (e.g., "yes", "confirm") in Discord chat do NOT trigger follow-up command logic.**

When a user issues a slash command (e.g., `/ux-update section:header ...`), the bot can respond with a message. However, if the bot asks for confirmation and the user simply types "yes" in chat, Discord does NOT route that text response back to the bot as a structured interaction.

This means traditional "ask-and-wait-for-reply" patterns used in other messaging platforms **do not work** with Discord slash commands.

## Workflow Requirements

When implementing a Discord bot command that requires user confirmation:

1. **Initial Command**: User issues slash command with parameters
2. **Preview Response**: Bot analyzes the request and provides:
   - Clear restatement of what will be done
   - Preview of changes (code snippets, file paths, descriptions)
   - Actionable next steps
3. **Confirmation Mechanism**: Bot must use one of these approaches:
   - **Preferred**: Discord buttons/components for yes/no confirmation
   - **Fallback**: Instruct user to re-run command with explicit confirmation parameters

## Implementation Patterns

### Pattern 1: Discord Buttons/Components (PREFERRED)

Use Discord's built-in interaction components for confirmation:

```python
# Example Python implementation with discord.py
from discord import ui, ButtonStyle

class ConfirmationView(ui.View):
    def __init__(self, conversation_id, agent):
        super().__init__(timeout=300)  # 5 minute timeout
        self.conversation_id = conversation_id
        self.agent = agent
        
    @ui.button(label="✅ Confirm", style=ButtonStyle.success)
    async def confirm_button(self, interaction, button):
        # Execute the confirmed action
        result = await self.agent.execute_confirmed_action(self.conversation_id)
        await interaction.response.send_message(result, ephemeral=True)
        
    @ui.button(label="❌ Cancel", style=ButtonStyle.danger)
    async def cancel_button(self, interaction, button):
        # Cancel the action
        self.agent.cancel_conversation(self.conversation_id)
        await interaction.response.send_message("🚫 Action cancelled.", ephemeral=True)

# Usage in command handler
async def handle_command(interaction):
    # Parse command and generate preview
    preview = agent.generate_preview(interaction.data)
    conversation_id = agent.start_conversation(interaction.user.id, preview)
    
    # Send preview with confirmation buttons
    view = ConfirmationView(conversation_id, agent)
    await interaction.response.send_message(
        f"🎨 **Preview of Changes:**\n\n{preview}\n\n**Ready to proceed?**",
        view=view,
        ephemeral=False
    )
```

**Benefits:**
- Native Discord UI (familiar to users)
- Handles confirmation in single interaction
- Built-in timeout management
- Clear visual feedback

**Requirements:**
- Bot must be set up to handle button interactions
- Need to store conversation state temporarily
- Must handle timeout scenarios

### Pattern 2: Explicit Confirmation Parameters (FALLBACK)

If Discord buttons are not available or supported in your framework, require explicit confirmation via command parameters:

```python
# Command definition with optional confirmation parameter
@app_commands.command(name="ux-update")
@app_commands.describe(
    section="Component section to update",
    text="New text content",
    conversation_id="ID from preview (required for confirmation)",
    confirm="Set to 'yes' to confirm and execute changes"
)
async def ux_update(
    interaction,
    section: str,
    text: str,
    conversation_id: Optional[str] = None,
    confirm: Optional[str] = None
):
    # If no conversation_id, this is initial request
    if conversation_id is None:
        # Generate preview and conversation ID
        preview = agent.generate_preview(section, text)
        conv_id = agent.start_conversation(interaction.user.id, preview)
        
        await interaction.response.send_message(
            f"🎨 **Preview of Changes:**\n\n{preview}\n\n"
            f"**To confirm, re-run this command:**\n"
            f"```\n/ux-update section:{section} text:\"{text}\" "
            f"conversation_id:{conv_id} confirm:yes\n```"
        )
        return
    
    # If conversation_id provided, verify and execute
    if confirm == "yes":
        result = agent.execute_confirmed_action(conversation_id, interaction.user.id)
        await interaction.response.send_message(result)
    else:
        await interaction.response.send_message(
            "❌ Confirmation required. Set `confirm:yes` to proceed."
        )
```

**Benefits:**
- Works without additional Discord bot setup
- No timeout concerns (stateless)
- Clear confirmation audit trail

**Drawbacks:**
- Less user-friendly (requires copy-paste or retyping)
- Longer workflow (two commands instead of one interaction)
- More potential for user errors

## Conversation State Management

For either pattern, you need to track conversation state:

### State Storage Options

**Option 1: In-Memory (Development/Testing)**
```python
# Simple dict for testing (NOT production-ready)
conversations = {}

def start_conversation(user_id, data):
    conversation_id = str(uuid.uuid4())
    conversations[conversation_id] = {
        'user_id': user_id,
        'data': data,
        'created_at': datetime.utcnow(),
        'status': 'pending'
    }
    return conversation_id
```

**Option 2: DynamoDB (Production)**
```python
import boto3
from datetime import datetime, timedelta

dynamodb = boto3.resource('dynamodb')
conversations_table = dynamodb.Table('discord-conversations')

def start_conversation(user_id, data):
    conversation_id = str(uuid.uuid4())
    ttl = int((datetime.utcnow() + timedelta(hours=1)).timestamp())
    
    conversations_table.put_item(
        Item={
            'conversation_id': conversation_id,
            'user_id': user_id,
            'data': data,
            'created_at': datetime.utcnow().isoformat(),
            'ttl': ttl,  # Auto-expire after 1 hour
            'status': 'pending'
        }
    )
    return conversation_id

def get_conversation(conversation_id):
    response = conversations_table.get_item(
        Key={'conversation_id': conversation_id}
    )
    return response.get('Item')

def complete_conversation(conversation_id):
    conversations_table.update_item(
        Key={'conversation_id': conversation_id},
        UpdateExpression='SET #status = :status',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={':status': 'completed'}
    )
```

**Key Considerations:**
- Use TTL for automatic cleanup (1 hour recommended)
- Validate user_id matches conversation owner
- Handle expired/missing conversation IDs gracefully
- Store minimal data needed for execution

## Response Message Guidelines

### Preview Messages

Structure preview messages to be clear and actionable:

```markdown
🎨 **Got it! Here's what I'm about to do:**

**Section:** header
**File:** src/components/Header.jsx

**Changes:**
• Update text to: "Welcome to Project Valine!"

**Preview:**
```jsx
<Link className="text-xl font-semibold">
  Welcome to Project Valine!
</Link>
```

**[Button UI or Command instruction here]**
```

### Confirmation Instructions (Fallback Pattern)

When using the parameter-based fallback:

```markdown
✅ **Ready to make this change?**

**To confirm, re-run with confirmation:**
```
/ux-update section:header text:"Welcome to Project Valine!" conversation_id:a1b2c3d4 confirm:yes
```

**To cancel:** Just ignore this message (it will expire in 1 hour)
```

### Error Messages

Handle common scenarios gracefully:

```markdown
❌ **Conversation not found or expired**

This confirmation link has expired or is invalid. Please start a new request:
```
/ux-update section:header text:"Your text here"
```
```

```markdown
❌ **Authorization Error**

This confirmation was created by another user. Only the original requester can confirm.
```

```markdown
❌ **Invalid confirmation parameter**

To confirm changes, set `confirm:yes` in your command.
```

## Security Considerations

### User Authorization
- ✅ Verify conversation owner matches confirmation requester
- ✅ Validate conversation hasn't been completed/cancelled already
- ✅ Check conversation hasn't expired (enforce TTL)

### Input Validation
- ✅ Validate all command parameters before creating conversation
- ✅ Sanitize user input before storing in state
- ✅ Validate conversation_id format (UUID expected)

### Audit Logging
- ✅ Log conversation creation (user, timestamp, preview)
- ✅ Log confirmation/cancellation (user, timestamp, action)
- ✅ Log execution results (success/failure, changes made)

## Testing Checklist

When implementing this pattern, verify:

### Functional Tests
- [ ] Initial command generates preview correctly
- [ ] Conversation ID is created and stored
- [ ] Confirmation with valid conversation_id executes action
- [ ] Confirmation with invalid conversation_id returns error
- [ ] Confirmation by different user is rejected
- [ ] Expired conversation_id returns appropriate error
- [ ] Cancellation properly cleans up state

### UX Tests
- [ ] Preview message is clear and informative
- [ ] Confirmation instructions are easy to follow
- [ ] Error messages are helpful and actionable
- [ ] Timeout behavior is reasonable (not too short)
- [ ] Button interactions feel responsive (if using buttons)

### Edge Cases
- [ ] User issues multiple requests before confirming first
- [ ] User tries to confirm same conversation_id twice
- [ ] Network timeout during confirmation
- [ ] State storage failure (DynamoDB unavailable)
- [ ] Command parameters contain special characters

## Example Implementation: UX Update Command

Here's how the Project Valine UX Agent could implement this pattern:

```python
class UXAgent:
    def __init__(self, dynamodb_table):
        self.conversations = dynamodb_table
        
    async def handle_ux_update(self, interaction, section, text, 
                               conversation_id=None, confirm=None):
        """Handle /ux-update command with confirmation flow."""
        
        # Pattern 2: Parameter-based confirmation
        if conversation_id is None:
            # Initial request - generate preview
            return await self._show_preview(interaction, section, text)
        
        # Confirmation attempt
        if confirm != "yes":
            return await interaction.response.send_message(
                "❌ To confirm, set `confirm:yes` in your command.",
                ephemeral=True
            )
        
        # Execute confirmed action
        return await self._execute_confirmed(interaction, conversation_id)
    
    async def _show_preview(self, interaction, section, text):
        """Generate preview and start conversation."""
        # Validate inputs
        if section not in ['header', 'footer', 'navbar', 'home']:
            return await interaction.response.send_message(
                f"❌ Invalid section: {section}",
                ephemeral=True
            )
        
        # Generate preview
        preview = self._generate_change_preview(section, text)
        
        # Create conversation
        conversation_id = str(uuid.uuid4())
        ttl = int((datetime.utcnow() + timedelta(hours=1)).timestamp())
        
        self.conversations.put_item(
            Item={
                'conversation_id': conversation_id,
                'user_id': str(interaction.user.id),
                'section': section,
                'text': text,
                'created_at': datetime.utcnow().isoformat(),
                'ttl': ttl,
                'status': 'pending'
            }
        )
        
        # Send preview with confirmation instructions
        message = (
            f"🎨 **Preview of Changes:**\n\n"
            f"**Section:** {section}\n"
            f"**File:** src/components/{section.capitalize()}.jsx\n\n"
            f"**Changes:**\n"
            f"• Update text to: \"{text}\"\n\n"
            f"**Preview:**\n```jsx\n{preview}\n```\n\n"
            f"✅ **To confirm, re-run with:**\n"
            f"```\n/ux-update section:{section} text:\"{text}\" "
            f"conversation_id:{conversation_id} confirm:yes\n```"
        )
        
        await interaction.response.send_message(message)
    
    async def _execute_confirmed(self, interaction, conversation_id):
        """Execute confirmed action."""
        # Retrieve conversation
        response = self.conversations.get_item(
            Key={'conversation_id': conversation_id}
        )
        
        conversation = response.get('Item')
        if not conversation:
            return await interaction.response.send_message(
                "❌ Conversation not found or expired.",
                ephemeral=True
            )
        
        # Verify ownership
        if conversation['user_id'] != str(interaction.user.id):
            return await interaction.response.send_message(
                "❌ Only the original requester can confirm this action.",
                ephemeral=True
            )
        
        # Check status
        if conversation['status'] != 'pending':
            return await interaction.response.send_message(
                "❌ This conversation has already been processed.",
                ephemeral=True
            )
        
        # Execute the change
        try:
            pr_url = await self._create_pr(
                conversation['section'],
                conversation['text']
            )
            
            # Mark conversation as completed
            self.conversations.update_item(
                Key={'conversation_id': conversation_id},
                UpdateExpression='SET #status = :status',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={':status': 'completed'}
            )
            
            await interaction.response.send_message(
                f"🎨 **Changes applied!**\n\n"
                f"Draft PR created: {pr_url}"
            )
            
        except Exception as e:
            logger.error(f"Failed to create PR: {e}")
            await interaction.response.send_message(
                f"❌ Failed to apply changes: {str(e)}",
                ephemeral=True
            )
```

## Summary: Key Takeaways

### Why This Matters
Discord does **NOT** support plain text replies after slash commands. Text responses like "yes" are **NOT** routed back to your bot as interactions.

### What to Do
1. **Preferred**: Use Discord buttons/components for interactive confirmation
2. **Fallback**: Require explicit `conversation_id` and `confirm:yes` parameters

### State Management
- Store conversation state with TTL (1 hour recommended)
- Use DynamoDB in production, in-memory for dev/test
- Validate user authorization before executing

### User Experience
- Always show clear preview before confirmation
- Provide actionable instructions (exact command to copy)
- Handle errors gracefully with helpful messages
- Set reasonable timeouts (5 minutes for buttons, 1 hour for state)

### Security
- Verify conversation ownership
- Validate all inputs
- Audit all actions
- Handle expired conversations

## Related Documentation

- [Discord Slash Command Agent](../DISCORD_SLASH_CMD_AGENT.md)
- [UX Agent README](../docs/guides/agents/UX_AGENT_README.md)
- [UX Agent Flow Diagram](../UX_AGENT_FLOW_DIAGRAM.md)
- [Discord Developer Documentation - Interactions](https://discord.com/developers/docs/interactions/receiving-and-responding)
- [Discord Developer Documentation - Message Components](https://discord.com/developers/docs/interactions/message-components)

## Version History

- **v1.0** (2025-10-26): Initial version documenting Discord confirmation flow patterns for multi-turn interactions
