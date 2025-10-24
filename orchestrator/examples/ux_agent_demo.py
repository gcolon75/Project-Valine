#!/usr/bin/env python3
"""
UX Agent Demo Script

This script demonstrates the UX Agent functionality without requiring
Discord or GitHub integration. It shows how commands are parsed and
what changes would be generated.

Usage:
    python examples/ux_agent_demo.py
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.agents.ux_agent import UXAgent
from unittest.mock import Mock


def demo_command_parsing():
    """Demonstrate command parsing."""
    print("=" * 70)
    print("UX Agent Demo - Command Parsing")
    print("=" * 70)
    print()
    
    # Create agent with mock GitHub service
    mock_github = Mock()
    agent = UXAgent(github_service=mock_github)
    
    test_commands = [
        'section:header text:"Welcome to Project Valine!"',
        'section:footer color:"#FF0080"',
        'section:navbar brand:"Joint"',
        'section:home hero-text:"Your Creative Hub"',
        'section:invalid text:"Test"',  # Invalid section
        'text:"Missing section"',  # Missing section
    ]
    
    for i, cmd in enumerate(test_commands, 1):
        print(f"Command {i}: {cmd}")
        result = agent.parse_command(cmd)
        
        if result['success']:
            print(f"  ✅ Parsed successfully")
            print(f"     Section: {result['section']}")
            print(f"     Updates: {result['updates']}")
        else:
            print(f"  ❌ Error: {result.get('error')}")
            print(f"     Message: {result.get('message')}")
        print()


def demo_update_processing():
    """Demonstrate update processing."""
    print("=" * 70)
    print("UX Agent Demo - Update Processing")
    print("=" * 70)
    print()
    
    # Create agent with mock GitHub service
    mock_github = Mock()
    agent = UXAgent(github_service=mock_github)
    
    test_updates = [
        {
            'section': 'header',
            'updates': {'text': 'Welcome Home!'},
            'desc': 'Update header text'
        },
        {
            'section': 'footer',
            'updates': {'text': 'Project Valine'},
            'desc': 'Update footer text'
        },
        {
            'section': 'navbar',
            'updates': {'brand': 'Joint'},
            'desc': 'Update navbar brand'
        },
        {
            'section': 'home',
            'updates': {'hero-text': 'Artists Connecting to Seekers 24/7'},
            'desc': 'Update home hero text'
        },
        {
            'section': 'footer',
            'updates': {'color': '#FF0080'},
            'desc': 'Update footer color'
        },
    ]
    
    for i, test in enumerate(test_updates, 1):
        print(f"Test {i}: {test['desc']}")
        print(f"  Section: {test['section']}")
        print(f"  Updates: {test['updates']}")
        
        result = agent.process_update(
            section=test['section'],
            updates=test['updates'],
            requester='demo_user'
        )
        
        if result['success']:
            print(f"  ✅ Success!")
            print(f"     Message: {result['message']}")
            print(f"     PR URL: {result['pr_url']}")
            print(f"     Changes: {len(result.get('changes', []))} change(s)")
        else:
            print(f"  ❌ Failed")
            print(f"     Error: {result.get('error')}")
            print(f"     Message: {result['message']}")
        print()


def demo_section_mappings():
    """Display available sections and properties."""
    print("=" * 70)
    print("UX Agent Demo - Available Sections")
    print("=" * 70)
    print()
    
    # Create agent with mock GitHub service
    mock_github = Mock()
    agent = UXAgent(github_service=mock_github)
    
    for section, info in agent.SECTION_MAPPINGS.items():
        print(f"📄 Section: {section}")
        print(f"   File: {info['file']}")
        print(f"   Component: {info['component']}")
        print(f"   Properties: {', '.join(info['properties'])}")
        print()


def demo_error_handling():
    """Demonstrate error handling."""
    print("=" * 70)
    print("UX Agent Demo - Error Handling")
    print("=" * 70)
    print()
    
    # Create agent with mock GitHub service
    mock_github = Mock()
    agent = UXAgent(github_service=mock_github)
    
    error_cases = [
        {
            'section': 'invalid_section',
            'updates': {'text': 'Test'},
            'desc': 'Invalid section name'
        },
        {
            'section': 'header',
            'updates': {'invalid_prop': 'Test'},
            'desc': 'Invalid property for section'
        },
        {
            'section': 'footer',
            'updates': {'color': 'red'},
            'desc': 'Invalid color format'
        },
    ]
    
    for i, case in enumerate(error_cases, 1):
        print(f"Error Case {i}: {case['desc']}")
        print(f"  Section: {case['section']}")
        print(f"  Updates: {case['updates']}")
        
        result = agent.process_update(
            section=case['section'],
            updates=case['updates'],
            requester='demo_user'
        )
        
        print(f"  ❌ Error (expected)")
        print(f"     Error Code: {result.get('error')}")
        print(f"     Message: {result['message']}")
        print()


def demo_example_commands():
    """Show example Discord commands."""
    print("=" * 70)
    print("UX Agent Demo - Example Discord Commands")
    print("=" * 70)
    print()
    
    examples = [
        {
            'category': 'Header Updates',
            'commands': [
                '/ux-update section:header text:"Welcome to Project Valine!"',
                '/ux-update section:header color:"#4A90E2"',
            ]
        },
        {
            'category': 'Footer Updates',
            'commands': [
                '/ux-update section:footer text:"Valine"',
                '/ux-update section:footer color:"#FF0080"',
            ]
        },
        {
            'category': 'Navbar Updates',
            'commands': [
                '/ux-update section:navbar brand:"Joint"',
                '/ux-update section:navbar add-link:"About:/about"',
            ]
        },
        {
            'category': 'Home Page Updates',
            'commands': [
                '/ux-update section:home hero-text:"Your Creative Hub"',
                '/ux-update section:home description:"Connect with creators worldwide"',
                '/ux-update section:home cta-text:"Get Started"',
            ]
        },
    ]
    
    for example in examples:
        print(f"📱 {example['category']}")
        for cmd in example['commands']:
            print(f"   {cmd}")
        print()


def main():
    """Run all demos."""
    print("\n🎨 UX Agent Demonstration\n")
    
    try:
        demo_section_mappings()
        demo_command_parsing()
        demo_update_processing()
        demo_error_handling()
        demo_example_commands()
        
        print("=" * 70)
        print("Demo completed successfully! 🎉")
        print("=" * 70)
        print()
        print("To use the UX Agent in production:")
        print("1. Register the /ux-update command: python register_ux_command.py")
        print("2. Deploy the Lambda handler")
        print("3. Test in Discord with example commands")
        print()
        
    except Exception as e:
        print(f"\n❌ Error running demo: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
