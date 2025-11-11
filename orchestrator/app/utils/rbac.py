"""
RBAC (Role-Based Access Control) utilities for Discord command permissions.
"""
import json
import os
from pathlib import Path
from typing import Optional, List, Dict, Any


class PermissionMatrix:
    """Load and manage command permissions from permission_matrix.json"""
    
    def __init__(self, config_path: Optional[str] = None):
        if config_path is None:
            # Default to config/permission_matrix.json relative to this file
            config_path = Path(__file__).parent.parent / 'config' / 'permission_matrix.json'
        
        self.config_path = Path(config_path)
        self.matrix = self._load_matrix()
        self.rbac_enabled = os.getenv('RBAC_ENABLED', 'true').lower() == 'true' and self.matrix.get('rbacEnabled', True)
        self.current_env = os.getenv('ENVIRONMENT', 'development').lower()
        
        # Load admin role IDs from environment
        admin_roles_str = os.getenv('ADMIN_ROLE_IDS', '')
        self.admin_role_ids = [r.strip() for r in admin_roles_str.split(',') if r.strip()]
    
    def _load_matrix(self) -> Dict[str, Any]:
        """Load permission matrix from JSON file"""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Warning: Permission matrix not found at {self.config_path}")
            return {"rbacEnabled": False, "commands": {}}
        except json.JSONDecodeError as e:
            print(f"Error: Failed to parse permission matrix: {e}")
            return {"rbacEnabled": False, "commands": {}}
    
    def check_permission(
        self, 
        command: str, 
        user_id: str, 
        user_role_ids: Optional[List[str]] = None
    ) -> tuple[bool, Optional[str]]:
        """
        Check if a user has permission to execute a command.
        
        Args:
            command: Command name (e.g., '/deploy-client')
            user_id: Discord user ID
            user_role_ids: List of Discord role IDs the user has
        
        Returns:
            Tuple of (is_allowed, error_message)
            - (True, None) if allowed
            - (False, error_message) if denied
        """
        # If RBAC is disabled, allow all
        if not self.rbac_enabled:
            return True, None
        
        # Get command config
        command_config = self.matrix.get('commands', {}).get(command)
        
        if not command_config:
            # Command not in matrix - default to allow for backward compatibility
            return True, None
        
        # Check if auth is required
        requires_auth = command_config.get('requiresAuth', False)
        if not requires_auth:
            return True, None
        
        # Check environment bypass
        bypass_env = command_config.get('bypassOnEnv')
        if bypass_env and bypass_env.lower() == self.current_env:
            return True, None
        
        user_role_ids = user_role_ids or []
        
        # Check if user is admin (global override)
        if any(role_id in self.admin_role_ids for role_id in user_role_ids):
            return True, None
        
        # Check allowed user IDs
        allowed_user_ids = command_config.get('allowedUserIds', [])
        if user_id in allowed_user_ids:
            return True, None
        
        # Check allowed role IDs
        allowed_role_ids = command_config.get('allowedRoleIds', [])
        
        # If both allowedRoleIds and allowedUserIds are empty, deny access
        # (requiresAuth=true but no one is explicitly allowed)
        if not allowed_role_ids and not allowed_user_ids:
            # For backward compatibility, allow if no restrictions specified
            # Change this to False if you want to deny by default
            return True, None
        
        # Check if user has any of the allowed roles
        if allowed_role_ids and any(role_id in allowed_role_ids for role_id in user_role_ids):
            return True, None
        
        # User is not authorized
        error_msg = (
            f"⛔ **Access Denied**\n\n"
            f"You don't have permission to use `{command}`.\n"
            f"This command requires specific Discord roles.\n\n"
            f"Contact a server administrator if you believe this is an error."
        )
        return False, error_msg
    
    def get_command_description(self, command: str) -> Optional[str]:
        """Get description for a command"""
        command_config = self.matrix.get('commands', {}).get(command)
        return command_config.get('description') if command_config else None
    
    def list_protected_commands(self) -> List[str]:
        """List all commands that require authentication"""
        commands = self.matrix.get('commands', {})
        return [
            cmd for cmd, config in commands.items()
            if config.get('requiresAuth', False)
        ]


# Singleton instance
_permission_matrix = None


def get_permission_matrix() -> PermissionMatrix:
    """Get singleton PermissionMatrix instance"""
    global _permission_matrix
    if _permission_matrix is None:
        _permission_matrix = PermissionMatrix()
    return _permission_matrix
