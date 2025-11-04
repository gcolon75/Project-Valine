"""
Example usage of the BackendAgent for Project Valine.

This script demonstrates how to:
1. Initialize the BackendAgent
2. Get an overview of available backend tasks
3. Start a task and review the preview
4. Run checks on proposed changes
5. Confirm and prepare a draft PR

Usage:
    python3 examples/backend_agent_example.py
"""
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))

from agents.backend_agent import BackendAgent


def main():
    """Demonstrate BackendAgent usage."""
    print("=" * 80)
    print("Backend Agent Example - Project Valine")
    print("=" * 80)
    print()
    
    # 1. Initialize the agent
    print("📦 Step 1: Initialize BackendAgent")
    agent = BackendAgent(repo="gcolon75/Project-Valine")
    print(f"✅ Agent initialized for repo: {agent.repo}")
    print()
    
    # 2. Get task overview
    print("📋 Step 2: Get Backend Tasks Overview")
    print("-" * 80)
    overview = agent.next_tasks_overview(user="gabriel")
    print(overview['message'])
    print()
    
    # 3. Start a task (using validators-and-security as it doesn't need clarifications)
    print("🚀 Step 3: Start a Task (validators-and-security)")
    print("-" * 80)
    start_result = agent.start_task(
        user="gabriel",
        task_id="validators-and-security"
    )
    
    if start_result['success']:
        conversation_id = start_result['conversation_id']
        print(f"✅ Task started - Conversation ID: {conversation_id}")
        print()
        
        if start_result.get('needs_clarification'):
            print("🤔 Questions to answer:")
            for q in start_result['questions']:
                print(f"  - {q}")
            print()
        else:
            print("📄 Task Preview:")
            print(start_result['message'])
            print()
            
            # 4. Run checks
            print("🔍 Step 4: Run Checks")
            print("-" * 80)
            checks = agent.run_checks(conversation_id=conversation_id)
            print(checks['message'])
            print()
            
            # 5. Confirm and prepare PR
            print("✅ Step 5: Confirm and Prepare Draft PR")
            print("-" * 80)
            confirm = agent.confirm_and_prepare_pr(
                conversation_id=conversation_id,
                user_confirmation="yes"
            )
            
            if confirm['success'] and 'draft_pr_payload' in confirm:
                print(confirm['message'])
                print()
                
                # Show draft PR details
                pr = confirm['draft_pr_payload']
                print("📦 Draft PR Payload:")
                print(f"  Branch: {pr['branch']}")
                print(f"  Title: {pr['title']}")
                print(f"  Labels: {', '.join(pr['labels'])}")
                print(f"  Draft: {pr['draft']}")
                print()
                print("  Commits:")
                for commit in pr['commits']:
                    print(f"    - {commit}")
                print()
    else:
        print(f"❌ Error: {start_result['message']}")
    
    # 6. Example with a task that needs clarifications
    print("=" * 80)
    print("🎯 Example 2: Task with Clarifications (theme-preference-api)")
    print("-" * 80)
    
    start_result2 = agent.start_task(
        user="gabriel",
        task_id="theme-preference-api"
    )
    
    if start_result2['success'] and start_result2.get('needs_clarification'):
        print("🤔 This task needs clarifications:")
        print(start_result2['message'])
        print()
        print("💡 Next steps:")
        print("  1. Answer the clarification questions")
        print("  2. Call start_task again with answers in context_files")
        print("  3. Review the preview and confirm")
    
    print()
    print("=" * 80)
    print("✅ Backend Agent Example Complete!")
    print("=" * 80)


if __name__ == "__main__":
    main()
