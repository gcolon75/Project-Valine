"""
Test that Lambda handler can be imported correctly.
This test verifies that the import paths are correct for Lambda deployment.
"""
import sys
import os
from pathlib import Path


def test_handler_import():
    """Test that the handler can be imported from the app/ directory."""
    # Get the app directory
    app_dir = Path(__file__).parent.parent / 'app'
    
    # Add app directory to sys.path to simulate Lambda environment
    original_path = sys.path.copy()
    try:
        sys.path.insert(0, str(app_dir))
        
        # Import the handler - this should work without errors
        from handlers.discord_handler import handler
        
        # Verify it's callable
        assert callable(handler), "Handler should be callable"
        
        print("✓ Handler import test passed")
        
    finally:
        # Restore original sys.path
        sys.path = original_path


def test_all_module_imports():
    """Test that all modules can be imported from app/ directory."""
    app_dir = Path(__file__).parent.parent / 'app'
    
    original_path = sys.path.copy()
    try:
        sys.path.insert(0, str(app_dir))
        
        # Test imports that the handler uses
        from verification.verifier import DeployVerifier
        from services.github import GitHubService
        from services.github_actions_dispatcher import GitHubActionsDispatcher
        from services.discord import DiscordService
        from services.audit_store import AuditStore
        from utils.url_validator import URLValidator
        from utils.admin_auth import AdminAuthenticator
        from utils.time_formatter import TimeFormatter
        from utils.trace_store import get_trace_store
        from utils.logger import redact_secrets, StructuredLogger
        from agents.registry import get_agents
        
        print("✓ All module imports test passed")
        
    finally:
        sys.path = original_path


if __name__ == '__main__':
    test_handler_import()
    test_all_module_imports()
    print("\n✅ All Lambda import tests passed!")
