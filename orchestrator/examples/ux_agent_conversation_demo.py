#!/usr/bin/env python3
"""
Demo script showing the UX Agent conversation flow.

This demonstrates the interactive confirmation flow where the agent:
1. Parses user intent
2. Asks clarifying questions if needed
3. Shows preview of changes
4. Waits for confirmation
5. Only executes after user confirms

Usage:
    python examples/ux_agent_conversation_demo.py
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.agents.ux_agent import UXAgent
from unittest.mock import Mock


def demo_structured_command():
    """Demo: Structured command with confirmation."""
    print("=" * 60)
    print("DEMO 1: Structured Command with Confirmation")
    print("=" * 60)
    
    # Initialize UX Agent with mock GitHub service
    mock_github = Mock()
    agent = UXAgent(github_service=mock_github, repo="gcolon75/Project-Valine")
    
    # User sends structured command
    print("\n👤 User: /ux-update section:header text:\"Level Up!\"")
    
    result = agent.start_conversation(
        command_text='section:header text:"Level Up!"',
        user_id='demo_user'
    )
    
    print(f"\n🤖 Agent Response:")
    print(result['message'])
    
    # User confirms
    print("\n👤 User: yes")
    
    conv_id = result['conversation_id']
    confirm_result = agent.confirm_and_execute(
        conversation_id=conv_id,
        user_response='yes'
    )
    
    print(f"\n🤖 Agent Response:")
    print(confirm_result['message'])
    print()


def demo_plain_text_with_clarification():
    """Demo: Plain text that needs clarification."""
    print("=" * 60)
    print("DEMO 2: Plain Text Needing Clarification")
    print("=" * 60)
    
    mock_github = Mock()
    agent = UXAgent(github_service=mock_github, repo="gcolon75/Project-Valine")
    
    # User sends vague request
    print("\n👤 User: /ux-update Make it blue")
    
    result = agent.start_conversation(
        plain_text='Make it blue',
        user_id='demo_user'
    )
    
    print(f"\n🤖 Agent Response:")
    print(result['message'])
    
    # User clarifies
    print("\n👤 User: The navbar background")
    
    conv_id = result['conversation_id']
    clarify_result = agent.confirm_and_execute(
        conversation_id=conv_id,
        user_response='The navbar background with color #0000FF'
    )
    
    print(f"\n🤖 Agent Response:")
    print(clarify_result['message'])
    
    # User confirms
    print("\n👤 User: yes")
    
    final_result = agent.confirm_and_execute(
        conversation_id=conv_id,
        user_response='yes'
    )
    
    print(f"\n🤖 Agent Response:")
    print(final_result['message'])
    print()


def demo_modification_during_confirmation():
    """Demo: User modifies request during confirmation."""
    print("=" * 60)
    print("DEMO 3: Modification During Confirmation")
    print("=" * 60)
    
    mock_github = Mock()
    agent = UXAgent(github_service=mock_github, repo="gcolon75/Project-Valine")
    
    # User sends initial request
    print("\n👤 User: /ux-update section:header text:\"Test Title\"")
    
    result = agent.start_conversation(
        command_text='section:header text:"Test Title"',
        user_id='demo_user'
    )
    
    print(f"\n🤖 Agent Response:")
    print(result['message'])
    
    # User modifies during confirmation
    print("\n👤 User: Actually, make it \"Better Title\" instead")
    
    conv_id = result['conversation_id']
    modify_result = agent.confirm_and_execute(
        conversation_id=conv_id,
        user_response='Actually, make it "Better Title" instead'
    )
    
    print(f"\n🤖 Agent Response:")
    print(modify_result['message'])
    
    # User confirms the modification
    print("\n👤 User: yes")
    
    final_result = agent.confirm_and_execute(
        conversation_id=conv_id,
        user_response='yes'
    )
    
    print(f"\n🤖 Agent Response:")
    print(final_result['message'])
    print()


def demo_cancellation():
    """Demo: User cancels the request."""
    print("=" * 60)
    print("DEMO 4: User Cancellation")
    print("=" * 60)
    
    mock_github = Mock()
    agent = UXAgent(github_service=mock_github, repo="gcolon75/Project-Valine")
    
    # User sends request
    print("\n👤 User: /ux-update section:footer color:\"#FF0080\"")
    
    result = agent.start_conversation(
        command_text='section:footer color:"#FF0080"',
        user_id='demo_user'
    )
    
    print(f"\n🤖 Agent Response:")
    print(result['message'])
    
    # User cancels
    print("\n👤 User: no")
    
    conv_id = result['conversation_id']
    cancel_result = agent.confirm_and_execute(
        conversation_id=conv_id,
        user_response='no'
    )
    
    print(f"\n🤖 Agent Response:")
    print(cancel_result['message'])
    print()


def demo_with_images():
    """Demo: Request with image attachments."""
    print("=" * 60)
    print("DEMO 5: Request with Image Attachments")
    print("=" * 60)
    
    mock_github = Mock()
    agent = UXAgent(github_service=mock_github, repo="gcolon75/Project-Valine")
    
    # User sends request with images
    print("\n👤 User: /ux-update Make the navbar match this design [screenshot attached]")
    
    images = [
        {'url': 'https://example.com/navbar-design.png'},
    ]
    
    result = agent.start_conversation(
        plain_text='Make the navbar match this design',
        user_id='demo_user',
        images=images
    )
    
    print(f"\n🤖 Agent Response:")
    print(result['message'])
    
    # User provides clarification
    print("\n👤 User: Use the blue color from image 1 for the background")
    
    conv_id = result['conversation_id']
    clarify_result = agent.confirm_and_execute(
        conversation_id=conv_id,
        user_response='section:navbar color:"#0000FF"'
    )
    
    print(f"\n🤖 Agent Response:")
    print(clarify_result['message'])
    
    # User confirms
    print("\n👤 User: yes")
    
    final_result = agent.confirm_and_execute(
        conversation_id=conv_id,
        user_response='yes'
    )
    
    print(f"\n🤖 Agent Response:")
    print(final_result['message'])
    print()


def main():
    """Run all demos."""
    print("\n" + "=" * 60)
    print("UX AGENT CONVERSATION FLOW DEMOS")
    print("=" * 60)
    print()
    
    demo_structured_command()
    demo_plain_text_with_clarification()
    demo_modification_during_confirmation()
    demo_cancellation()
    demo_with_images()
    
    print("=" * 60)
    print("All demos completed!")
    print("=" * 60)
    print()


if __name__ == '__main__':
    main()
