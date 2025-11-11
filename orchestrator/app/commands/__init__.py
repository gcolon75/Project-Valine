"""
Commands package for modular Discord command handling.
Each command module implements a specific Discord slash command.
"""

__all__ = [
    'BaseCommand',
    'CommandRegistry',
]

from typing import Dict, Type, Callable


class BaseCommand:
    """Base class for Discord commands."""
    
    def __init__(self):
        """Initialize command."""
        pass
    
    @property
    def name(self) -> str:
        """Command name (e.g., 'status-digest')."""
        raise NotImplementedError
    
    @property
    def description(self) -> str:
        """Command description."""
        raise NotImplementedError
    
    async def execute(self, interaction: Dict) -> Dict:
        """
        Execute the command.
        
        Args:
            interaction: Discord interaction payload
            
        Returns:
            Discord response payload
        """
        raise NotImplementedError
    
    def handle_component(self, interaction: Dict, custom_id: str) -> Dict:
        """
        Handle button/select menu interactions.
        
        Args:
            interaction: Discord interaction payload
            custom_id: Component custom ID
            
        Returns:
            Discord response payload or None if not handled
        """
        return None


class CommandRegistry:
    """Registry for Discord commands."""
    
    def __init__(self):
        """Initialize command registry."""
        self._commands: Dict[str, BaseCommand] = {}
        self._component_handlers: Dict[str, Callable] = {}
    
    def register(self, command: BaseCommand):
        """
        Register a command.
        
        Args:
            command: Command instance to register
        """
        self._commands[command.name] = command
        print(f'Registered command: {command.name}')
    
    def get(self, name: str) -> BaseCommand:
        """
        Get command by name.
        
        Args:
            name: Command name
            
        Returns:
            Command instance or None
        """
        return self._commands.get(name)
    
    def register_component_handler(self, prefix: str, handler: Callable):
        """
        Register a component interaction handler.
        
        Args:
            prefix: Custom ID prefix (e.g., 'ship_')
            handler: Handler function
        """
        self._component_handlers[prefix] = handler
    
    def get_component_handler(self, custom_id: str) -> Callable:
        """
        Get component handler by custom ID.
        
        Args:
            custom_id: Component custom ID
            
        Returns:
            Handler function or None
        """
        for prefix, handler in self._component_handlers.items():
            if custom_id.startswith(prefix):
                return handler
        return None
    
    def list_commands(self) -> list:
        """
        List all registered commands.
        
        Returns:
            List of command names
        """
        return list(self._commands.keys())


# Global command registry
_registry = None


def get_command_registry() -> CommandRegistry:
    """Get or create global command registry."""
    global _registry
    if _registry is None:
        _registry = CommandRegistry()
    return _registry
