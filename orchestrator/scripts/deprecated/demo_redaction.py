#!/usr/bin/env python3
"""
Demonstration of the Phase 5 Staging Validator's secret redaction capabilities.
"""
import sys
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent))

from phase5_staging_validator import redact_secrets


def demo_redaction():
    """Demonstrate various redaction scenarios"""
    
    print("=" * 80)
    print("Phase 5 Staging Validator - Secret Redaction Demo")
    print("=" * 80)
    print()
    
    # Example 1: Dictionary with sensitive keys
    print("Example 1: Dictionary with sensitive keys")
    print("-" * 40)
    data1 = {
        "username": "john_doe",
        "api_token": "secret_token_12345678",
        "password": "mypassword123456",
        "email": "john@example.com"
    }
    print(f"Before: {data1}")
    redacted1 = redact_secrets(data1)
    print(f"After:  {redacted1}")
    print()
    
    # Example 2: GitHub token in string
    print("Example 2: GitHub token in authorization header")
    print("-" * 40)
    data2 = "Authorization: Bearer ghp_1234567890abcdefghijklmnopqrstuv"
    print(f"Before: {data2}")
    redacted2 = redact_secrets(data2)
    print(f"After:  {redacted2}")
    print()
    
    # Example 3: Nested configuration
    print("Example 3: Nested configuration object")
    print("-" * 40)
    data3 = {
        "service": "orchestrator",
        "config": {
            "discord": {
                "bot_token": "MTAyNzQ5ODcxMjM0NTY3ODkwMA.GxYzAB.1234567890abcdefghijklmnopqrstuv",
                "channel_id": "1234567890"
            },
            "github": {
                "token": "ghp_abcdefghijklmnopqrstuvwxyz1234567890",
                "repo": "gcolon75/Project-Valine"
            }
        }
    }
    print(f"Before: {data3}")
    redacted3 = redact_secrets(data3)
    print(f"After:  {redacted3}")
    print()
    
    # Example 4: List of tokens
    print("Example 4: List of configuration items")
    print("-" * 40)
    data4 = [
        {"name": "staging", "token": "staging_token_123456789"},
        {"name": "production", "token": "prod_token_987654321"}
    ]
    print(f"Before: {data4}")
    redacted4 = redact_secrets(data4)
    print(f"After:  {redacted4}")
    print()
    
    # Example 5: Custom secret keys
    print("Example 5: Custom secret keys")
    print("-" * 40)
    data5 = {
        "username": "admin",
        "custom_secret": "my_custom_secret_12345",
        "webhook_url": "https://discord.com/api/webhooks/123/secret_webhook_token"
    }
    print(f"Before: {data5}")
    redacted5 = redact_secrets(data5, secret_keys=["custom_secret"])
    print(f"After:  {redacted5}")
    print()
    
    # Example 6: Preserving trace IDs
    print("Example 6: Preserving trace IDs while redacting secrets")
    print("-" * 40)
    data6 = {
        "trace_id": "abc123de-456f-789g-hij0-klmnopqrstuv",
        "correlation_id": "workflow-run-123456",
        "user_token": "secret_user_token_12345",
        "command": "/diagnose"
    }
    print(f"Before: {data6}")
    redacted6 = redact_secrets(data6)
    print(f"After:  {redacted6}")
    print()
    
    print("=" * 80)
    print("Key Points:")
    print("- Secrets show only last 4 characters")
    print("- Trace IDs and correlation IDs are preserved")
    print("- Works with nested structures (dicts, lists, tuples)")
    print("- Supports custom secret key patterns")
    print("- Handles common token formats (GitHub, Discord, etc.)")
    print("=" * 80)


if __name__ == "__main__":
    demo_redaction()
