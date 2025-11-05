#!/usr/bin/env python3
"""
CLI script to fetch backend agent conversation states.

This script provides a command-line interface to list active backend agent
conversations, matching the specification in the problem statement.

Usage:
    python scripts/list_backend_conversations.py [--status STATUS] [--max-results N]
    
Examples:
    # List all conversations
    python scripts/list_backend_conversations.py
    
    # List only conversations waiting for clarification
    python scripts/list_backend_conversations.py --status waiting
    
    # List conversations with multiple statuses
    python scripts/list_backend_conversations.py --status "in-progress,waiting,draft-preview"
    
    # Limit results
    python scripts/list_backend_conversations.py --max-results 10
"""
import sys
import json
import argparse
from pathlib import Path

# Add parent directory to path for imports
# Note: This script is designed to be run from the orchestrator directory:
#   cd orchestrator && python scripts/list_backend_conversations.py
# For production use, consider installing orchestrator as a proper package
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))

from agents.backend_agent import BackendAgent


def main():
    """Main entry point for CLI."""
    parser = argparse.ArgumentParser(
        description='List backend agent conversation states',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        '--repository',
        type=str,
        default='gcolon75/Project-Valine',
        help='Repository name (default: gcolon75/Project-Valine)'
    )
    
    parser.add_argument(
        '--status',
        type=str,
        help='Filter by status (comma-separated): in-progress, waiting, interrupted, completed, draft-preview'
    )
    
    parser.add_argument(
        '--max-results',
        type=int,
        default=200,
        help='Maximum number of results to return (default: 200)'
    )
    
    parser.add_argument(
        '--format',
        choices=['json', 'pretty'],
        default='json',
        help='Output format (default: json)'
    )
    
    args = parser.parse_args()
    
    # Initialize backend agent
    agent = BackendAgent(repo=args.repository)
    
    # Prepare filters
    filters = None
    if args.status:
        status_list = [s.strip() for s in args.status.split(',')]
        filters = {'status': status_list}
    
    # Fetch conversations
    conversations = agent.list_conversations(
        filters=filters,
        max_results=args.max_results
    )
    
    # Output results
    if args.format == 'json':
        # Return pure JSON (no explanatory text)
        print(json.dumps(conversations, indent=2))
    else:
        # Pretty format for human readability
        print(f"Found {len(conversations)} conversation(s)\n")
        print("=" * 80)
        
        for conv in conversations:
            print(f"Conversation ID: {conv['conversation_id']}")
            print(f"  Task ID: {conv['task_id']}")
            print(f"  Task Name: {conv['task_name']}")
            print(f"  Task Type: {conv['task_type']}")
            print(f"  Assigned Agent: {conv['assigned_agent']}")
            print(f"  Status: {conv['status']}")
            print(f"  Preview Ready: {conv['preview_ready']}")
            print(f"  Checks Status: {conv['checks_status']}")
            print(f"  Draft PR Exists: {conv['draft_pr_payload_exists']}")
            
            if conv['artifacts_urls']:
                print(f"  Artifacts:")
                for url in conv['artifacts_urls']:
                    print(f"    - {url}")
            
            print(f"  Created: {conv['created_at']}")
            print(f"  Last Activity: {conv['last_activity_at']}")
            print()
        
        print("=" * 80)
        print(f"Total: {len(conversations)} conversation(s)")


if __name__ == '__main__':
    main()
