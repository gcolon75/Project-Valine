#!/usr/bin/env python3
"""
Example usage of SummaryAgent.

This script demonstrates how to use the SummaryAgent to generate
and update project summaries.
"""
import os
import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))

from agents.summary_agent import SummaryAgent


def example_basic():
    """Basic example without GitHub API calls."""
    print("=== Example 1: Basic Summary (No API) ===\n")
    
    agent = SummaryAgent(
        repo="gcolon75/Project-Valine",
        summary_file="/tmp/test_summary.md"
    )
    
    result = agent.run(
        custom_notes="🎮 Basic summary test\n- ✅ All systems operational",
        include_prs=False,
        include_workflows=False,
        dry_run=True
    )
    
    if result['success']:
        print("✅ Summary generated successfully!")
        print("\nGenerated summary:")
        print(result['summary'])
    else:
        print("❌ Failed to generate summary")
        print(f"Error: {result.get('message')}")


def example_with_custom_notes():
    """Example with detailed custom notes."""
    print("\n\n=== Example 2: Summary with Custom Notes ===\n")
    
    agent = SummaryAgent(
        repo="gcolon75/Project-Valine",
        summary_file="/tmp/test_summary.md"
    )
    
    custom_notes = """
- 🏆 **Lambda cache-buster fixed** (no more dead code deploys)
- 🎮 **Orchestrator bot online:** Discord slash commands working
- 🛠️ **CI/CD:** Green builds, PRs auto-triaged
- 🤖 **SummaryAgent deployed:** Now auto-generating status updates!
- 📈 **What's next:** Test /update-summary command in production
- ❌ **Known issues:** None! All systems green ✅
"""
    
    result = agent.run(
        custom_notes=custom_notes.strip(),
        include_prs=False,
        include_workflows=False,
        dry_run=True
    )
    
    if result['success']:
        print("✅ Summary generated successfully!")
        print("\nGenerated summary:")
        print(result['summary'])
    else:
        print("❌ Failed to generate summary")


def example_with_github_token():
    """Example with GitHub token for PR and workflow fetching."""
    print("\n\n=== Example 3: Summary with GitHub API (requires token) ===\n")
    
    github_token = os.environ.get('GITHUB_TOKEN')
    if not github_token:
        print("⚠️  GITHUB_TOKEN not set - skipping this example")
        print("   Set GITHUB_TOKEN environment variable to enable PR/workflow fetching")
        return
    
    agent = SummaryAgent(
        repo="gcolon75/Project-Valine",
        github_token=github_token,
        summary_file="/tmp/test_summary.md"
    )
    
    result = agent.run(
        custom_notes="🎮 Testing with GitHub API integration",
        include_prs=True,
        include_workflows=True,
        dry_run=True
    )
    
    if result['success']:
        print("✅ Summary generated successfully!")
        print("\nGenerated summary:")
        print(result['summary'])
    else:
        print("❌ Failed to generate summary")
        print(f"Error: {result.get('message')}")


def example_write_to_file():
    """Example that actually writes to a file."""
    print("\n\n=== Example 4: Write to File ===\n")
    
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
        temp_file = f.name
    
    try:
        agent = SummaryAgent(
            repo="gcolon75/Project-Valine",
            summary_file=temp_file
        )
        
        result = agent.run(
            custom_notes="🚀 File write test\n- Testing actual file write",
            include_prs=False,
            include_workflows=False,
            dry_run=False  # Actually write to file
        )
        
        if result['success']:
            print(f"✅ Summary written to: {temp_file}")
            print("\nFile contents:")
            with open(temp_file, 'r') as f:
                print(f.read())
        else:
            print("❌ Failed to write summary")
            print(f"Error: {result.get('message')}")
    finally:
        # Clean up temp file
        if os.path.exists(temp_file):
            os.unlink(temp_file)
            print(f"\n🧹 Cleaned up temp file: {temp_file}")


if __name__ == "__main__":
    print("🤖 SummaryAgent Examples\n")
    print("=" * 60)
    
    # Run examples
    example_basic()
    example_with_custom_notes()
    example_with_github_token()
    example_write_to_file()
    
    print("\n" + "=" * 60)
    print("✅ All examples completed!")
