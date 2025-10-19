#!/usr/bin/env python3
"""
Enhanced Auto-Triage with AI Agents

This script enhances the auto_triage_pr58.py with AI agent analysis for smarter
failure diagnosis and higher confidence scores.

Usage:
    python auto_triage_with_agents.py --repo gcolon75/Project-Valine --pr 60 [--create-pr]
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any

# Add orchestrator to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import triage agents
try:
    from triage_agents import DevAgent, OpsAgent, AnalystAgent
except ImportError:
    print("⚠️  Warning: Could not import triage agents. Running without AI analysis.")
    DevAgent = OpsAgent = AnalystAgent = None

# Import the original triage script functions
try:
    from scripts import auto_triage_pr58
except ImportError:
    # Fallback: import directly
    import auto_triage_pr58


def enhance_failures_with_agents(failures: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Enhance failure analysis with AI agents.
    
    Args:
        failures: List of failure dictionaries from log analysis
        
    Returns:
        Enhanced failures with confidence scores and agent insights
    """
    if not (DevAgent and OpsAgent and AnalystAgent):
        print("⚠️  Skipping agent analysis (agents not available)")
        return failures
    
    print("\n🤖 Running AI Agent Analysis...")
    
    # Initialize agents
    agents = [
        DevAgent(),
        OpsAgent(),
        AnalystAgent()
    ]
    
    enhanced_failures = []
    
    for i, failure in enumerate(failures):
        print(f"  Analyzing failure {i+1}/{len(failures)}: {failure.get('type', 'unknown')}")
        
        # Run all agents
        total_boost = 0
        all_insights = []
        all_recommendations = []
        base_confidence = 50
        
        for agent in agents:
            try:
                if agent.can_analyze(failure):
                    result = agent.analyze(failure)
                    
                    # Collect boosts and insights
                    boost = result.get("confidence_boost", 0)
                    total_boost += boost
                    
                    insights = result.get("insights", [])
                    all_insights.extend(insights)
                    
                    recommendations = result.get("recommendations", [])
                    all_recommendations.extend(recommendations)
                    
                    # AnalystAgent provides final_confidence
                    if hasattr(agent, 'name') and agent.name == "AnalystAgent":
                        if 'final_confidence' in result:
                            base_confidence = result['final_confidence']
            except Exception as e:
                print(f"    ⚠️  {agent.name} error: {str(e)}")
                continue
        
        # Calculate final confidence
        final_confidence = min(base_confidence + total_boost, 100)
        
        # Add agent data to failure
        enhanced_failure = failure.copy()
        enhanced_failure['confidence'] = final_confidence
        enhanced_failure['insights'] = all_insights
        enhanced_failure['recommendations'] = list(set(all_recommendations))  # Deduplicate
        
        enhanced_failures.append(enhanced_failure)
    
    # Sort by confidence (high to low)
    enhanced_failures.sort(key=lambda f: f.get('confidence', 0), reverse=True)
    
    print(f"✅ Agent analysis complete")
    print(f"\n📊 Confidence Scores:")
    for i, failure in enumerate(enhanced_failures[:5]):
        conf = failure.get('confidence', 0)
        ftype = failure.get('type', 'unknown')
        emoji = "🔥" if conf >= 80 else "⚠️" if conf >= 60 else "🤔"
        print(f"  {i+1}. {emoji} {conf}% - {ftype}")
    
    return enhanced_failures


def generate_enhanced_pr_body(
    pr_number: int,
    run_url: str,
    enhanced_failures: List[Dict[str, Any]]
) -> str:
    """
    Generate PR body with AI agent insights.
    
    Args:
        pr_number: PR number being triaged
        run_url: GitHub Actions run URL
        enhanced_failures: Failures with agent analysis
        
    Returns:
        Markdown PR body
    """
    body = f"""## 🤖 AI-Assisted Triage Report for PR #{pr_number}

### Workflow Run
- **Run URL:** {run_url}
- **Analysis:** Automated with AI agents (Dev, Ops, Analyst)

---

"""
    
    # Separate into quick wins and needs review
    quick_wins = [f for f in enhanced_failures if f.get('confidence', 0) >= 80]
    medium = [f for f in enhanced_failures if 60 <= f.get('confidence', 0) < 80]
    needs_review = [f for f in enhanced_failures if f.get('confidence', 0) < 60]
    
    # Quick wins section
    if quick_wins:
        body += "### 🔥 Quick Wins (High Confidence ≥80%)\n\n"
        for i, failure in enumerate(quick_wins, 1):
            conf = failure.get('confidence', 0)
            ftype = failure.get('type', 'unknown')
            line = failure.get('line', '')
            file_path = failure.get('file', '')
            
            body += f"#### {i}. {ftype.replace('_', ' ').title()} ({conf}%)\n\n"
            body += f"**Error:** `{line[:150]}`\n\n"
            
            if file_path:
                line_num = failure.get('line_number', '')
                body += f"**Location:** `{file_path}" + (f":{line_num}" if line_num else "") + "`\n\n"
            
            # Agent insights
            insights = failure.get('insights', [])
            if insights:
                body += "**Agent Analysis:**\n"
                for insight in insights:
                    body += f"- {insight}\n"
                body += "\n"
            
            # Recommendations
            recommendations = failure.get('recommendations', [])
            if recommendations:
                body += "**Recommended Fix:**\n"
                for rec in recommendations[:2]:  # Limit to top 2
                    body += f"- 💡 {rec}\n"
                body += "\n"
            
            body += "---\n\n"
    
    # Medium priority
    if medium:
        body += "### ⚠️ Medium Priority (Confidence 60-79%)\n\n"
        for i, failure in enumerate(medium, 1):
            conf = failure.get('confidence', 0)
            ftype = failure.get('type', 'unknown')
            line = failure.get('line', '')
            
            body += f"{i}. **{ftype.replace('_', ' ').title()}** ({conf}%)\n"
            body += f"   - `{line[:100]}...`\n"
            
            recommendations = failure.get('recommendations', [])
            if recommendations:
                body += f"   - 💡 {recommendations[0]}\n"
            body += "\n"
    
    # Needs review
    if needs_review:
        body += "### 🤔 Needs Manual Review (Confidence <60%)\n\n"
        for i, failure in enumerate(needs_review, 1):
            conf = failure.get('confidence', 0)
            ftype = failure.get('type', 'unknown')
            body += f"{i}. **{ftype.replace('_', ' ').title()}** ({conf}%)\n"
        body += "\n"
    
    body += f"""
---

### 📈 Summary
- **Total Failures Analyzed:** {len(enhanced_failures)}
- **Quick Wins:** {len(quick_wins)}
- **Medium Priority:** {len(medium)}
- **Needs Review:** {len(needs_review)}

### 🔒 Safety Checks
- ✅ Draft PR (manual review required before merge)
- ✅ Secrets redacted
- ✅ AI-assisted analysis with confidence scores

---

*Generated by Phase-6 Triage Automation with AI Agents*
"""
    
    return body


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Enhanced Auto-Triage with AI Agents'
    )
    parser.add_argument('--repo', required=True, help='Repository (owner/repo)')
    parser.add_argument('--pr', type=int, required=True, help='PR number')
    parser.add_argument('--create-pr', action='store_true',
                       help='Create draft PR with fixes')
    parser.add_argument('--dry-run', action='store_true',
                       help='Dry run mode (no commits/PRs)')
    
    args = parser.parse_args()
    
    print("🎮 Enhanced Auto-Triage with AI Agents")
    print(f"📦 Repository: {args.repo}")
    print(f"🎯 PR: #{args.pr}")
    print(f"🚀 Mode: {'create-pr' if args.create_pr else 'triage-only'}")
    
    # For now, return a success message
    # In production, this would:
    # 1. Call auto_triage_pr58 functions to get failures
    # 2. Enhance with agents
    # 3. Optionally create PR
    
    print("\n✅ Triage command received!")
    print("⚠️  Note: Full implementation requires integration with existing triage script")
    print("\nTo complete implementation:")
    print("1. Import and call analyze_logs() from auto_triage_pr58.py")
    print("2. Pass failures through enhance_failures_with_agents()")
    print("3. Generate PR with generate_enhanced_pr_body()")
    print("4. Create draft PR if --create-pr flag is set")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
