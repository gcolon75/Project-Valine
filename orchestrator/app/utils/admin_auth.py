"""
Admin authorization utility with feature flags and allowlists.
Enforces strict access control for sensitive operations.
"""
import os
import hashlib


class AdminAuthenticator:
    """Handles admin authorization checks."""

    def __init__(self):
        """Initialize authenticator with configuration from environment."""
        # Feature flag for secret write operations (default: OFF)
        self.allow_secret_writes = os.environ.get('ALLOW_SECRET_WRITES', 'false').lower() == 'true'
        
        # Admin user IDs (comma-separated)
        admin_users = os.environ.get('ADMIN_USER_IDS', '').split(',')
        self.admin_user_ids = set(u.strip() for u in admin_users if u.strip())
        
        # Admin role IDs (comma-separated)
        admin_roles = os.environ.get('ADMIN_ROLE_IDS', '').split(',')
        self.admin_role_ids = set(r.strip() for r in admin_roles if r.strip())
    
    def is_admin(self, user_id, role_ids=None):
        """
        Check if a user is an admin.
        
        Args:
            user_id: Discord user ID
            role_ids: List of Discord role IDs for the user
            
        Returns:
            bool: True if user is admin, False otherwise
        """
        # Check user ID
        if user_id in self.admin_user_ids:
            return True
        
        # Check role IDs
        if role_ids and self.admin_role_ids:
            user_role_set = set(role_ids)
            if self.admin_role_ids & user_role_set:
                return True
        
        return False
    
    def can_write_secrets(self):
        """
        Check if secret write operations are allowed.
        
        Returns:
            bool: True if ALLOW_SECRET_WRITES is enabled
        """
        return self.allow_secret_writes
    
    def authorize_admin_action(self, user_id, role_ids=None, requires_secret_write=False):
        """
        Authorize an admin action.
        
        Args:
            user_id: Discord user ID
            role_ids: List of Discord role IDs for the user
            requires_secret_write: Whether this action requires secret write permission
            
        Returns:
            dict with 'authorized' (bool) and 'message' (str)
        """
        # Check if user is admin
        if not self.is_admin(user_id, role_ids):
            return {
                'authorized': False,
                'message': '❌ Not allowed (admin only)'
            }
        
        # Check if secret write is required and enabled
        if requires_secret_write and not self.can_write_secrets():
            return {
                'authorized': False,
                'message': '❌ Secret write operations are disabled. Set ALLOW_SECRET_WRITES=true to enable.'
            }
        
        return {
            'authorized': True,
            'message': 'Authorized'
        }
    
    @staticmethod
    def get_value_fingerprint(value):
        """
        Get a fingerprint of a value for logging (last 4 chars of hash).
        Never logs the actual value.
        
        Args:
            value: String value to fingerprint
            
        Returns:
            str: Fingerprint in format "…abcd"
        """
        if not value:
            return '…(empty)'
        
        hash_hex = hashlib.sha256(value.encode()).hexdigest()
        return f'…{hash_hex[-4:]}'
