"""
Unit tests for RBAC (Role-Based Access Control) functionality.
"""
import os
import pytest
import json
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'app'))

from utils.rbac import PermissionMatrix, get_permission_matrix


@pytest.fixture
def temp_permission_matrix(tmp_path):
    """Create a temporary permission matrix for testing"""
    matrix = {
        "rbacEnabled": True,
        "commands": {
            "/test-public": {
                "description": "Public command",
                "requiresAuth": False,
                "allowedRoleIds": [],
                "allowedUserIds": []
            },
            "/test-protected": {
                "description": "Protected command",
                "requiresAuth": True,
                "allowedRoleIds": ["role123"],
                "allowedUserIds": [],
                "bypassOnEnv": "development"
            },
            "/test-user-specific": {
                "description": "User-specific command",
                "requiresAuth": True,
                "allowedRoleIds": [],
                "allowedUserIds": ["user456"]
            }
        }
    }
    
    matrix_file = tmp_path / "permission_matrix.json"
    with open(matrix_file, 'w') as f:
        json.dump(matrix, f)
    
    return matrix_file


def test_rbac_disabled():
    """Test that all commands are allowed when RBAC is disabled"""
    os.environ['RBAC_ENABLED'] = 'false'
    pm = PermissionMatrix()
    
    allowed, error = pm.check_permission('/any-command', 'user123', [])
    assert allowed is True
    assert error is None
    
    # Cleanup
    del os.environ['RBAC_ENABLED']


def test_public_command(temp_permission_matrix):
    """Test that public commands are always allowed"""
    os.environ['RBAC_ENABLED'] = 'true'
    pm = PermissionMatrix(config_path=temp_permission_matrix)
    
    allowed, error = pm.check_permission('/test-public', 'user123', [])
    assert allowed is True
    assert error is None
    
    # Cleanup
    del os.environ['RBAC_ENABLED']


def test_protected_command_with_role(temp_permission_matrix):
    """Test that users with correct role can execute protected commands"""
    os.environ['RBAC_ENABLED'] = 'true'
    pm = PermissionMatrix(config_path=temp_permission_matrix)
    
    # User with correct role
    allowed, error = pm.check_permission('/test-protected', 'user123', ['role123'])
    assert allowed is True
    assert error is None
    
    # Cleanup
    del os.environ['RBAC_ENABLED']


def test_protected_command_without_role(temp_permission_matrix):
    """Test that users without correct role are denied"""
    os.environ['RBAC_ENABLED'] = 'true'
    os.environ['ENVIRONMENT'] = 'production'  # Bypass development environment bypass
    pm = PermissionMatrix(config_path=temp_permission_matrix)
    
    # User without correct role
    allowed, error = pm.check_permission('/test-protected', 'user123', ['wrong-role'])
    assert allowed is False
    assert error is not None
    assert 'Access Denied' in error
    
    # Cleanup
    del os.environ['RBAC_ENABLED']
    del os.environ['ENVIRONMENT']


def test_admin_role_override(temp_permission_matrix):
    """Test that admin roles can execute any command"""
    os.environ['RBAC_ENABLED'] = 'true'
    os.environ['ADMIN_ROLE_IDS'] = 'admin-role-1,admin-role-2'
    pm = PermissionMatrix(config_path=temp_permission_matrix)
    
    # User with admin role can execute protected command
    allowed, error = pm.check_permission('/test-protected', 'user123', ['admin-role-1'])
    assert allowed is True
    assert error is None
    
    # Cleanup
    del os.environ['RBAC_ENABLED']
    del os.environ['ADMIN_ROLE_IDS']


def test_user_specific_command(temp_permission_matrix):
    """Test that user-specific commands work correctly"""
    os.environ['RBAC_ENABLED'] = 'true'
    os.environ['ENVIRONMENT'] = 'production'  # No environment bypass
    pm = PermissionMatrix(config_path=temp_permission_matrix)
    
    # Correct user
    allowed, error = pm.check_permission('/test-user-specific', 'user456', [])
    assert allowed is True
    assert error is None
    
    # Wrong user
    allowed, error = pm.check_permission('/test-user-specific', 'user999', [])
    assert allowed is False
    assert error is not None
    
    # Cleanup
    del os.environ['RBAC_ENABLED']
    del os.environ['ENVIRONMENT']


def test_environment_bypass(temp_permission_matrix):
    """Test that environment bypass works correctly"""
    os.environ['RBAC_ENABLED'] = 'true'
    os.environ['ENVIRONMENT'] = 'development'
    pm = PermissionMatrix(config_path=temp_permission_matrix)
    
    # Command with bypassOnEnv=development should allow anyone in dev
    allowed, error = pm.check_permission('/test-protected', 'user123', [])
    assert allowed is True
    assert error is None
    
    # Cleanup
    del os.environ['RBAC_ENABLED']
    del os.environ['ENVIRONMENT']


def test_unknown_command(temp_permission_matrix):
    """Test that unknown commands default to allowed for backward compatibility"""
    os.environ['RBAC_ENABLED'] = 'true'
    pm = PermissionMatrix(config_path=temp_permission_matrix)
    
    allowed, error = pm.check_permission('/unknown-command', 'user123', [])
    assert allowed is True
    assert error is None
    
    # Cleanup
    del os.environ['RBAC_ENABLED']


def test_list_protected_commands(temp_permission_matrix):
    """Test listing all protected commands"""
    pm = PermissionMatrix(config_path=temp_permission_matrix)
    
    protected = pm.list_protected_commands()
    assert '/test-protected' in protected
    assert '/test-user-specific' in protected
    assert '/test-public' not in protected


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
