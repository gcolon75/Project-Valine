#!/usr/bin/env python3
"""
Demo: AI Triage Agents in Action

This script demonstrates how the Dev, Ops, and Analyst agents work together
to analyze PR failures and provide confidence-scored recommendations.

Usage:
    python3 demo_triage_agents.py
"""

import sys
from pathlib import Path

# Add orchestrator to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from triage_agents import DevAgent, OpsAgent, AnalystAgent


def print_section(title):
    """Print a section header."""
    print(f"\n{'=' * 70}")
    print(f"  {title}")
    print('=' * 70)


def demo_single_failure():
    """Demo: Analyze a single failure with all agents."""
    print_section("Demo 1: Single Failure Analysis")
    
    # Sample failure from a real PR
    failure = {
        "type": "missing_dependency",
        "message": "ModuleNotFoundError: No module named 'requests'",
        "file": "orchestrator/scripts/auto_triage_pr58.py",
        "line": 42,
        "context": "import requests\nresponse = requests.get(url)"
    }
    
    print("\n📋 Failure Details:")
    print(f"   Type: {failure['type']}")
    print(f"   Message: {failure['message']}")
    print(f"   Location: {failure['file']}:{failure['line']}")
    
    # Initialize agents
    agents = [
        DevAgent(),
        OpsAgent(),
        AnalystAgent()
    ]
    
    print("\n🤖 Running AI Agents...\n")
    
    total_boost = 0
    all_insights = []
    base_confidence = 50
    
    # Run each agent
    for agent in agents:
        print(f"   {agent.name}...")
        result = agent.analyze(failure)
        
        boost = result.get("confidence_boost", 0)
        total_boost += boost
        
        insights = result.get("insights", [])
        all_insights.extend(insights)
        
        if hasattr(agent, 'name') and agent.name == "AnalystAgent":
            if 'final_confidence' in result:
                base_confidence = result['final_confidence']
        
        # Show agent output
        print(f"      Confidence Boost: {boost:+d}")
        if insights:
            for insight in insights:
                print(f"      • {insight}")
        
        recommendations = result.get("recommendations", [])
        if recommendations:
            print(f"      💡 {recommendations[0]}")
        print()
    
    # Calculate final score
    final_confidence = min(base_confidence + total_boost, 100)
    
    print("📊 Final Analysis:")
    print(f"   Confidence Score: {final_confidence}%")
    
    if final_confidence >= 80:
        print("   Priority: 🔥 Quick Win (High Confidence)")
    elif final_confidence >= 60:
        print("   Priority: ⚠️  Medium Priority")
    else:
        print("   Priority: 🤔 Needs Manual Review")


def demo_multiple_failures():
    """Demo: Analyze multiple failures and sort by confidence."""
    print_section("Demo 2: Multiple Failures - Confidence Sorting")
    
    # Sample failures with different characteristics
    failures = [
        {
            "type": "missing_dependency",
            "message": "ModuleNotFoundError: No module named 'requests'",
            "file": "orchestrator/scripts/test.py",
            "line": 42,
            "context": "import requests"
        },
        {
            "type": "test_failure",
            "message": "AssertionError: Expected 200, got 404",
            "file": "tests/test_api.py",
            "line": 100
        },
        {
            "type": "missing_dependency",
            "message": "ImportError: No module named 'nonexistent_package_xyz'",
        },
        {
            "type": "python_error",
            "message": "TypeError: unsupported operand type(s)",
            "file": "src/utils.py"
        }
    ]
    
    print(f"\n📋 Analyzing {len(failures)} failures...\n")
    
    # Enhance failures with agents
    agents = [DevAgent(), OpsAgent(), AnalystAgent()]
    enhanced = []
    
    for i, failure in enumerate(failures, 1):
        ftype = failure.get('type', 'unknown')
        print(f"   {i}. {ftype}")
        
        total_boost = 0
        base_confidence = 50
        
        for agent in agents:
            result = agent.analyze(failure)
            total_boost += result.get("confidence_boost", 0)
            
            if hasattr(agent, 'name') and agent.name == "AnalystAgent":
                if 'final_confidence' in result:
                    base_confidence = result['final_confidence']
        
        final_confidence = min(base_confidence + total_boost, 100)
        failure['confidence'] = final_confidence
        enhanced.append(failure)
        
        print(f"      Confidence: {final_confidence}%")
    
    # Sort by confidence
    enhanced.sort(key=lambda f: f.get('confidence', 0), reverse=True)
    
    print("\n📊 Prioritized Failures (sorted by confidence):\n")
    
    for i, failure in enumerate(enhanced, 1):
        conf = failure.get('confidence', 0)
        ftype = failure.get('type', 'unknown')
        
        if conf >= 80:
            emoji = "🔥"
            priority = "Quick Win"
        elif conf >= 60:
            emoji = "⚠️"
            priority = "Medium"
        else:
            emoji = "🤔"
            priority = "Needs Review"
        
        print(f"   {i}. {emoji} {conf}% - {ftype} ({priority})")


def demo_agent_specialization():
    """Demo: Show what each agent specializes in."""
    print_section("Demo 3: Agent Specialization")
    
    print("\n🔧 Dev Agent - Code Analysis Specialist")
    print("   • Parses Python imports using AST")
    print("   • Searches codebase for package usage")
    print("   • Identifies file/line locations")
    print("   • Confidence Boost: 0-30 points")
    
    print("\n📦 Ops Agent - Package Validation Specialist")
    print("   • Queries PyPI API for package existence")
    print("   • Fetches latest versions and metadata")
    print("   • Checks package popularity (downloads/month)")
    print("   • Confidence Boost: -20 to +30 points")
    print("   • Note: Negative boost if package doesn't exist")
    
    print("\n📊 Analyst Agent - Confidence Scoring Specialist")
    print("   • Evaluates error message clarity (+20)")
    print("   • Checks for file/line info (+10)")
    print("   • Boosts confidence for test files (+10)")
    print("   • Identifies known failure patterns (+15)")
    print("   • Classifies priority (Quick Win / Medium / Review)")
    print("   • Base Confidence: 50%")
    
    print("\n🎯 Working Together:")
    print("   1. DevAgent finds where package is imported")
    print("   2. OpsAgent validates package exists on PyPI")
    print("   3. AnalystAgent calculates final confidence")
    print("   4. Failures sorted by confidence (high to low)")
    print("   5. Quick wins prioritized for auto-fix")


def main():
    """Run all demos."""
    print("=" * 70)
    print("  🤖 AI Triage Agents Demo")
    print("  Phase 6: Discord-as-PM Triage Bot")
    print("=" * 70)
    
    # Run demos
    demo_single_failure()
    demo_multiple_failures()
    demo_agent_specialization()
    
    print("\n" + "=" * 70)
    print("  ✅ Demo Complete!")
    print("=" * 70)
    print("\n💡 Next Steps:")
    print("   1. Run tests: python3 -m unittest tests.test_triage_agents -v")
    print("   2. Try on real PR: python3 scripts/auto_triage_with_agents.py --repo user/repo --pr 1")
    print("   3. Register Discord command: python3 scripts/register_triage_command.py")
    print("   4. Use in Discord: /triage pr:60")
    print("\n🎮 LFG! 🚀\n")


if __name__ == '__main__':
    main()
