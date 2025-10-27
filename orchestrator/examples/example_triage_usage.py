#!/usr/bin/env python3
"""
Example usage of Phase 5 Triage Agent

This demonstrates various ways to use the triage agent
for analyzing failed CI runs, PR failures, and workflow issues.
"""

import os
import sys
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent / "scripts"))

from phase5_triage_agent import (
    TriageConfig,
    Phase5TriageAgent,
    FailureContext,
    FailureInfo,
    redact_secrets
)


def example_1_triage_pr():
    """Example 1: Triage a failed PR"""
    print("=" * 60)
    print("Example 1: Triage a Failed PR")
    print("=" * 60)
    
    # This would normally use a real GitHub token from environment
    # For demo purposes, we'll show the configuration
    
    config = TriageConfig(
        repo="gcolon75/Project-Valine",
        failure_ref=49,  # PR number
        github_token=os.environ.get("GITHUB_TOKEN", "demo_token"),
        allow_auto_fix=False,
        verbose=True,
        dry_run=True  # Safe mode
    )
    
    print(f"Configuration:")
    print(f"  Repository: {config.repo}")
    print(f"  Failure Ref: PR #{config.failure_ref}")
    print(f"  Auto-fix: {config.allow_auto_fix}")
    print(f"  Dry Run: {config.dry_run}")
    print()
    
    # In real usage:
    # agent = Phase5TriageAgent(config)
    # report = agent.run()
    
    print("✓ Configuration ready for triage")
    print()


def example_2_triage_workflow_run():
    """Example 2: Triage a failed workflow run"""
    print("=" * 60)
    print("Example 2: Triage a Failed Workflow Run")
    print("=" * 60)
    
    config = TriageConfig(
        repo="gcolon75/Project-Valine",
        failure_ref=1234567890,  # Workflow run ID
        github_token=os.environ.get("GITHUB_TOKEN", "demo_token"),
        verbose=True
    )
    
    print(f"Configuration:")
    print(f"  Repository: {config.repo}")
    print(f"  Failure Ref: Workflow Run #{config.failure_ref}")
    print()
    
    print("✓ Configuration ready for triage")
    print()


def example_3_secret_redaction():
    """Example 3: Secret redaction"""
    print("=" * 60)
    print("Example 3: Secret Redaction")
    print("=" * 60)
    
    # Example data with secrets
    data = {
        "username": "john_doe",
        "email": "john@example.com",
        "api_token": "ghp_1234567890abcdef1234567890abcdef12",
        "password": "my_secret_password_123",
        "config": {
            "discord_token": "discord_bot_token_1234567890abcdef",
            "aws_access_key": "AKIAIOSFODNN7EXAMPLE"
        }
    }
    
    print("Original data (with secrets):")
    print(data)
    print()
    
    # Redact secrets
    redacted = redact_secrets(data)
    
    print("Redacted data (secrets hidden):")
    print(redacted)
    print()
    
    print("✓ Secrets redacted successfully")
    print()


def example_4_failure_categorization():
    """Example 4: Failure categorization"""
    print("=" * 60)
    print("Example 4: Failure Categorization")
    print("=" * 60)
    
    # Example failures with different categories
    failures = [
        FailureInfo(
            test_name="test_foo",
            error_message="AssertionError: expected True",
            category="test_failure"
        ),
        FailureInfo(
            error_message="Missing module: requests",
            category="missing_dependency"
        ),
        FailureInfo(
            error_message="ValueError: Invalid input",
            category="python_error",
            affected_files=["src/main.py"]
        )
    ]
    
    print("Detected failures:")
    for i, failure in enumerate(failures, 1):
        print(f"\n  Failure {i}:")
        print(f"    Category: {failure.category}")
        if failure.test_name:
            print(f"    Test: {failure.test_name}")
        print(f"    Error: {failure.error_message}")
        if failure.affected_files:
            print(f"    Files: {', '.join(failure.affected_files)}")
    
    print()
    print("✓ Failures categorized for analysis")
    print()


def example_5_cli_usage():
    """Example 5: CLI usage examples"""
    print("=" * 60)
    print("Example 5: CLI Usage Examples")
    print("=" * 60)
    
    examples = [
        {
            "description": "Triage a PR",
            "command": "python phase5_triage_agent.py run --repo gcolon75/Project-Valine --failure-ref 49"
        },
        {
            "description": "Triage a workflow run",
            "command": "python phase5_triage_agent.py run --repo gcolon75/Project-Valine --failure-ref 1234567890"
        },
        {
            "description": "Triage with auto-fix",
            "command": "python phase5_triage_agent.py run --repo gcolon75/Project-Valine --failure-ref 49 --auto-fix"
        },
        {
            "description": "Dry run mode",
            "command": "python phase5_triage_agent.py run --repo gcolon75/Project-Valine --failure-ref 49 --dry-run"
        },
        {
            "description": "Generate config file",
            "command": "python phase5_triage_agent.py generate-config --output triage_config.json"
        }
    ]
    
    for i, example in enumerate(examples, 1):
        print(f"\n  Example {i}: {example['description']}")
        print(f"    $ {example['command']}")
    
    print()
    print("✓ CLI usage examples shown")
    print()


def main():
    """Run all examples"""
    print("\n")
    print("*" * 60)
    print("Phase 5 Triage Agent - Usage Examples")
    print("*" * 60)
    print()
    
    try:
        example_1_triage_pr()
        example_2_triage_workflow_run()
        example_3_secret_redaction()
        example_4_failure_categorization()
        example_5_cli_usage()
        
        print("=" * 60)
        print("All examples completed successfully!")
        print("=" * 60)
        print()
        print("Next steps:")
        print("  1. Set GITHUB_TOKEN environment variable")
        print("  2. Run: python phase5_triage_agent.py run --repo owner/repo --failure-ref <ref>")
        print("  3. Review generated reports in triage_output/")
        print()
        
    except Exception as e:
        print(f"\n❌ Error running examples: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
