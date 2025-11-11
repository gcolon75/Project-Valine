# Orchestrator Architecture

## Overview

The Project Valine orchestrator has been modularized to improve maintainability, testability, and scalability. This document describes the new architecture.

## Architecture Components

### Command System

Commands are now implemented as modular classes that extend `BaseCommand`. This provides:

- **Separation of concerns**: Each command is in its own file
- **Easier testing**: Commands can be unit tested in isolation
- **Reusability**: Common functionality shared via base class
- **Extensibility**: New commands added by creating new classes

#### Command Structure

```
orchestrator/app/commands/
├── __init__.py           # BaseCommand and CommandRegistry
├── status_digest.py      # Health snapshot command
├── ship.py               # Release conductor command
└── ...                   # Other command modules
```

#### Creating a Command

```python
from commands import BaseCommand

class MyCommand(BaseCommand):
    @property
    def name(self) -> str:
        return 'my-command'
    
    @property
    def description(self) -> str:
        return 'Description of my command'
    
    async def execute(self, interaction: dict) -> dict:
        # Command logic
        return {
            'type': 4,
            'data': {'content': 'Hello!'}
        }
    
    def handle_component(self, interaction: dict, custom_id: str) -> dict:
        # Handle button/select interactions
        if custom_id.startswith('my_button_'):
            # Handle button click
            pass
```

#### Registering a Command

```python
from commands import get_command_registry
from commands.my_command import MyCommand

registry = get_command_registry()
registry.register(MyCommand())
```

### State Store

The State Store provides persistent key-value storage for multi-step flows, button interactions, and release tracking.

#### Supported Backends

1. **Redis** (recommended for production)
   - Distributed across Lambda instances
   - Automatic TTL support
   - High performance

2. **Postgres** (alternative for persistent storage)
   - Uses `orchestrator_state` table
   - Good for complex queries
   - No Redis dependency

3. **In-Memory** (fallback for development)
   - Single instance only
   - Not persistent across Lambda cold starts
   - Used when no backend configured

#### Auto-Detection

The State Store automatically detects available backends:

1. Try Redis if `REDIS_URL` is set
2. Try Postgres if `DATABASE_URL` is set
3. Fall back to in-memory

#### Usage

```python
from services.state_store import get_state_store

# Get singleton instance
state = get_state_store()

# Store a value with 1 hour TTL
state.put('my-key', {'data': 'value'}, ttl=3600)

# Retrieve a value
value = state.get('my-key')  # Returns {'data': 'value'} or None

# Delete a value
state.delete('my-key')

# Clean up expired entries (Postgres only)
deleted = state.cleanup_expired()
```

#### State Keys

Use namespaced keys to avoid collisions:

```python
# Deploy states
deploy_id = f"ship-{env}-{timestamp}"
state.put(deploy_id, deploy_info)

# Button interactions
interaction_id = f"button-{message_id}-{user_id}"
state.put(interaction_id, interaction_data, ttl=900)  # 15 min

# Conversation states
conversation_id = f"conv-{thread_id}"
state.put(conversation_id, conversation_state, ttl=86400)  # 24 hours
```

### Dispatcher

The dispatcher routes Discord interactions to the appropriate command handlers.

#### Interaction Types

1. **Application Commands** (slash commands)
   - Routed by command name
   - Handled by command's `execute()` method

2. **Message Components** (buttons, selects)
   - Routed by `custom_id` prefix
   - Handled by command's `handle_component()` method

#### Example Dispatcher Logic

```python
def handle_interaction(interaction):
    interaction_type = interaction.get('type')
    
    if interaction_type == 2:  # Application Command
        command_name = interaction['data']['name']
        command = registry.get(command_name)
        if command:
            return await command.execute(interaction)
    
    elif interaction_type == 3:  # Message Component
        custom_id = interaction['data']['custom_id']
        handler = registry.get_component_handler(custom_id)
        if handler:
            return handler(interaction, custom_id)
```

## Migration Guide

### From Monolithic to Modular

**Before:**
```python
# All commands in discord_handler.py
def handle_status_digest_command(interaction):
    # 100+ lines of code
    pass

def handle_ship_command(interaction):
    # 150+ lines of code
    pass
```

**After:**
```python
# commands/status_digest.py
class StatusDigestCommand(BaseCommand):
    async def execute(self, interaction):
        # Focused command logic
        pass

# commands/ship.py
class ShipCommand(BaseCommand):
    async def execute(self, interaction):
        # Focused command logic
        pass
```

### Backward Compatibility

The modular system can coexist with the monolithic handler during migration:

1. New commands use modular approach
2. Old commands remain in handler during transition
3. Gradual migration over time

## Benefits

### Testability

Each command can be tested in isolation:

```python
def test_ship_command():
    command = ShipCommand()
    interaction = {...}
    response = await command.execute(interaction)
    assert response['type'] == 4
```

### Maintainability

- Easier to find and modify specific commands
- Changes isolated to single file
- Clear separation of concerns

### Scalability

- Add new commands without touching existing code
- Share common logic via base class
- Easy to add new interaction types

## Configuration

### Environment Variables

```bash
# State Store Backend
REDIS_URL=redis://localhost:6379
# or
DATABASE_URL=postgresql://...

# Optional: Force specific backend
STATE_STORE_BACKEND=redis  # redis, postgres, or memory
```

### SAM Template

```yaml
Environment:
  Variables:
    REDIS_URL: !Ref RedisUrl
    DATABASE_URL: !Ref DatabaseUrl
```

## Best Practices

### Command Design

1. **Keep commands focused**: One command = one purpose
2. **Use state store for multi-step flows**: Don't rely on ephemeral data
3. **Add component handlers for interactions**: Support buttons and selects
4. **Handle errors gracefully**: Return user-friendly error messages
5. **Log important events**: Use structured logging

### State Management

1. **Always set TTL**: Prevent unbounded growth
2. **Use descriptive keys**: Include context in key names
3. **Clean up after completion**: Delete state when flow finishes
4. **Handle missing state**: State may expire or be deleted

### Testing

1. **Mock dependencies**: Use mocks for external services
2. **Test error cases**: Verify error handling
3. **Test state transitions**: Verify multi-step flows
4. **Test TTL behavior**: Ensure cleanup works

## Troubleshooting

### State Not Persisting

**Problem**: State disappears between interactions

**Solutions**:
- Check if Redis/Postgres is configured
- Verify TTL is long enough for your use case
- Check connection to backend service
- Review logs for errors

### Command Not Found

**Problem**: Command not responding

**Solutions**:
- Verify command is registered in registry
- Check command name matches Discord registration
- Review dispatcher logs
- Confirm Lambda has latest code

### Component Handler Not Working

**Problem**: Buttons don't respond

**Solutions**:
- Verify `custom_id` prefix matches registration
- Check component handler is implemented
- Verify state exists for interaction
- Review component interaction logs

## Future Enhancements

- **Command permissions**: Per-command RBAC
- **Command middleware**: Pre/post execution hooks
- **Auto-registration**: Scan and register commands automatically
- **Command versioning**: Support multiple versions
- **Analytics**: Track command usage and performance
