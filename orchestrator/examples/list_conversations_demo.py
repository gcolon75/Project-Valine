#!/usr/bin/env python3
"""
Demo script showing how to use list_conversations API.

This script creates some sample conversations and then demonstrates
different ways to query them.
"""
import sys
import json
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))

from agents.backend_agent import BackendAgent


def main():
    """Demonstrate list_conversations API."""
    print("=" * 80)
    print("Backend Agent - List Conversations Demo")
    print("=" * 80)
    print()
    
    # Initialize agent
    agent = BackendAgent(repo="gcolon75/Project-Valine")
    
    # Create some conversations in different states
    print("📝 Creating sample conversations...")
    print()
    
    # 1. Start a task that goes straight to preview (validators-and-security)
    result1 = agent.start_task(user="user1", task_id="validators-and-security")
    conv1_id = result1['conversation_id']
    print(f"✅ Created conversation 1: {conv1_id}")
    print(f"   Status: draft-preview")
    print()
    
    # 2. Start a task that needs clarification (theme-preference-api)
    result2 = agent.start_task(user="user2", task_id="theme-preference-api")
    conv2_id = result2['conversation_id']
    print(f"✅ Created conversation 2: {conv2_id}")
    print(f"   Status: waiting (needs clarification)")
    print()
    
    # 3. Start another task and run checks on it
    result3 = agent.start_task(user="user3", task_id="dashboard-stats-endpoints")
    conv3_id = result3['conversation_id']
    
    # This task also needs clarifications, so it will be in 'waiting' state
    # But we can still run checks on it
    if not result3.get('needs_clarification'):
        agent.run_checks(conversation_id=conv3_id)
        print(f"✅ Created conversation 3: {conv3_id}")
        print(f"   Status: draft-preview (with checks run)")
    else:
        # Even though it needs clarifications, we can run checks
        agent.run_checks(conversation_id=conv3_id)
        print(f"✅ Created conversation 3: {conv3_id}")
        print(f"   Status: waiting (needs clarification, but checks can still run)")
    print()
    
    # Now demonstrate querying
    print("=" * 80)
    print("🔍 Query 1: List All Conversations")
    print("=" * 80)
    print()
    
    all_conversations = agent.list_conversations()
    print(f"Found {len(all_conversations)} conversation(s)")
    print()
    
    for conv in all_conversations:
        print(f"Conversation: {conv['conversation_id']}")
        print(f"  Task: {conv['task_name'][:60]}...")
        print(f"  Status: {conv['status']}")
        print(f"  Preview Ready: {conv['preview_ready']}")
        print(f"  Checks Status: {conv['checks_status']}")
        print()
    
    # Query 2: Filter by status
    print("=" * 80)
    print("🔍 Query 2: Filter by Status (waiting)")
    print("=" * 80)
    print()
    
    waiting_conversations = agent.list_conversations(
        filters={'status': ['waiting']}
    )
    print(f"Found {len(waiting_conversations)} conversation(s) in 'waiting' state")
    print()
    
    for conv in waiting_conversations:
        print(f"Conversation: {conv['conversation_id']}")
        print(f"  Task: {conv['task_id']}")
        print(f"  Status: {conv['status']}")
        print()
    
    # Query 3: Multiple statuses
    print("=" * 80)
    print("🔍 Query 3: Filter by Multiple Statuses")
    print("=" * 80)
    print()
    
    active_conversations = agent.list_conversations(
        filters={'status': ['in-progress', 'waiting', 'draft-preview']}
    )
    print(f"Found {len(active_conversations)} active conversation(s)")
    print()
    
    # Query 4: JSON output (as required by spec)
    print("=" * 80)
    print("🔍 Query 4: JSON Output (spec format)")
    print("=" * 80)
    print()
    
    json_output = agent.list_conversations(
        filters={'status': ['in-progress', 'waiting', 'interrupted', 'draft-preview']}
    )
    
    print(json.dumps(json_output, indent=2))
    print()
    
    # Query 5: Max results
    print("=" * 80)
    print("🔍 Query 5: Limited Results (max_results=2)")
    print("=" * 80)
    print()
    
    limited_conversations = agent.list_conversations(max_results=2)
    print(f"Requested max 2, got {len(limited_conversations)} conversation(s)")
    print()
    
    # Show what happens after completing a task
    print("=" * 80)
    print("⚙️  Action: Complete a Conversation")
    print("=" * 80)
    print()
    
    print(f"Completing conversation: {conv1_id}")
    agent.confirm_and_prepare_pr(
        conversation_id=conv1_id,
        user_confirmation='yes'
    )
    print("✅ Conversation completed and removed from active list")
    print()
    
    # List again to show it's gone
    remaining_conversations = agent.list_conversations()
    print(f"Remaining active conversations: {len(remaining_conversations)}")
    print()
    
    print("=" * 80)
    print("✅ Demo Complete!")
    print("=" * 80)


if __name__ == "__main__":
    main()
