"""
SummaryAgent for Project-Valine orchestrator.

AI Agent Prompt: Summary Agent for Project-Valine

## CONTEXT
You are the SummaryAgent in the Project-Valine orchestrator. Your mission: keep the team (and other bots) updated with the latest project status, recent changes, and next steps. Your updates go in PROJECT_VALINE_SUMMARY.md and/or the README—always at the top, in a format that's fast to scan for humans and machines.

## TRIGGER
- When a major event happens (deploy, PR merge, incident fix, new bot/command, etc)
- When a user runs `/update-summary` in Discord
- On a scheduled basis (e.g., daily or weekly)

## GOALS
- Write a concise, hype, Gen Z/gamer-themed summary of what's new, what's working, and what the next quests are.
- List all major changes since the last summary (deploys, new agents, bugfixes, commands, infra changes, etc).
- Update the "Current Status" section, including what works, what's broken, and what needs playtesting.
- Add links to key PRs, docs, or test results.
- Use emojis, bullet points, and gaming metaphors (bosses defeated, loot acquired, new abilities unlocked).
- If anything is broken, call it out with ❌ and suggest what's needed to fix.
- Never delete old summaries—just add a new one at the top.

## FORMAT EXAMPLE

## 🆕 Project Valine Status (2025-10-23)

- 🏆 **Lambda cache-buster fixed** (no more dead code deploys)
- 🎮 **Orchestrator bot online:** Discord slash commands working: /status, /triage, /diagnose, /debug-last
- 🛠️ **CI/CD:** Green builds, PRs auto-triaged, deploy health verified
- 🤖 **UXAgent coming soon:** Will let you update UI from Discord!
- 📈 **What's next:** Add `/ux-update` and SummaryAgent to automate docs
- ❌ **Known issues:** CloudWatch logs sometimes lag, minor emoji encoding bug

**Recent PRs:**  
- #91: Docs update  
- #88: Lambda cache-buster  
- #90: Deploy health check

**Next quests:**  
- Ship the UXAgent  
- Automate summary after every deploy/PR  
- Fix CloudWatch emoji bug

---

## DELIVERABLES
- Section at the top of PROJECT_VALINE_SUMMARY.md and/or README.md
- Must be Markdown, with bullet points and emojis
- Easy for other bots/agents to parse (clear headers, no weird formatting)

## TONE
- Gen Z, gaming, hype, no corporate BS
- Fast to read, easy to copy-paste, and makes new contributors feel welcome
"""
import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from pathlib import Path
import requests


class SummaryAgent:
    """
    SummaryAgent for Project Valine orchestrator.
    
    Generates and updates project summaries with the latest status, changes,
    and next steps in a Gen Z/gamer-themed style with emojis and bullet points.
    """
    
    def __init__(
        self,
        repo: str = "gcolon75/Project-Valine",
        github_token: Optional[str] = None,
        summary_file: str = "PROJECT_VALINE_SUMMARY.md"
    ):
        """
        Initialize SummaryAgent.
        
        Args:
            repo: Repository in format "owner/repo"
            github_token: GitHub API token (optional, for PR/workflow fetching)
            summary_file: Path to summary file (relative to repo root)
        """
        self.repo = repo
        self.github_token = github_token
        self.summary_file = summary_file
        self.base_url = "https://api.github.com"
        
        # Set up headers for GitHub API
        self.headers = {
            "Accept": "application/vnd.github.v3+json"
        }
        if github_token:
            self.headers["Authorization"] = f"token {github_token}"
    
    def _get_recent_prs(self, count: int = 5) -> List[Dict[str, Any]]:
        """
        Fetch recent merged PRs from GitHub.
        
        Args:
            count: Number of recent PRs to fetch
            
        Returns:
            List of PR dictionaries
        """
        try:
            url = f"{self.base_url}/repos/{self.repo}/pulls"
            params = {
                "state": "closed",
                "sort": "updated",
                "direction": "desc",
                "per_page": count
            }
            
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            
            if response.status_code == 200:
                prs = response.json()
                # Filter to only merged PRs
                merged_prs = [pr for pr in prs if pr.get('merged_at')]
                return merged_prs[:count]
            else:
                print(f"Failed to fetch PRs: {response.status_code}")
                return []
        except Exception as e:
            print(f"Error fetching PRs: {str(e)}")
            return []
    
    def _get_recent_workflow_runs(self, workflow_name: str = "Client Deploy", count: int = 3) -> List[Dict[str, Any]]:
        """
        Fetch recent workflow runs.
        
        Args:
            workflow_name: Name of workflow to fetch
            count: Number of recent runs to fetch
            
        Returns:
            List of workflow run dictionaries
        """
        try:
            url = f"{self.base_url}/repos/{self.repo}/actions/runs"
            params = {
                "per_page": count * 2  # Get more to filter by name
            }
            
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            
            if response.status_code == 200:
                runs = response.json().get('workflow_runs', [])
                # Filter by workflow name if specified
                if workflow_name:
                    runs = [r for r in runs if workflow_name.lower() in r.get('name', '').lower()]
                return runs[:count]
            else:
                print(f"Failed to fetch workflow runs: {response.status_code}")
                return []
        except Exception as e:
            print(f"Error fetching workflow runs: {str(e)}")
            return []
    
    def generate_summary(
        self,
        custom_notes: Optional[str] = None,
        include_prs: bool = True,
        include_workflows: bool = True
    ) -> str:
        """
        Generate a new project status summary.
        
        Args:
            custom_notes: Custom notes to include in summary
            include_prs: Whether to fetch and include recent PRs
            include_workflows: Whether to fetch and include workflow status
            
        Returns:
            Markdown formatted summary string
        """
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        lines = [
            f"## 🆕 Project Valine Status ({today})",
            ""
        ]
        
        # Add custom notes if provided
        if custom_notes:
            lines.append(custom_notes)
            lines.append("")
        
        # Fetch and add recent PRs
        if include_prs and self.github_token:
            recent_prs = self._get_recent_prs(5)
            if recent_prs:
                lines.append("**Recent PRs:**")
                for pr in recent_prs:
                    pr_num = pr.get('number')
                    pr_title = pr.get('title', 'No title')
                    lines.append(f"- #{pr_num}: {pr_title}")
                lines.append("")
        
        # Fetch and add workflow status
        if include_workflows and self.github_token:
            recent_runs = self._get_recent_workflow_runs("Client Deploy", 3)
            if recent_runs:
                lines.append("**Recent Deployments:**")
                for run in recent_runs:
                    conclusion = run.get('conclusion', 'in_progress')
                    if conclusion == 'success':
                        icon = '✅'
                    elif conclusion == 'failure':
                        icon = '❌'
                    else:
                        icon = '🔄'
                    
                    run_name = run.get('name', 'Unknown')
                    run_url = run.get('html_url', '')
                    lines.append(f"- {icon} [{run_name}]({run_url})")
                lines.append("")
        
        # Add next quests section
        lines.append("**Next quests:**")
        lines.append("- Continue development and testing")
        lines.append("- Monitor deployment health")
        lines.append("- Address any issues that arise")
        lines.append("")
        lines.append("---")
        lines.append("")
        
        return "\n".join(lines)
    
    def update_summary_file(
        self,
        new_summary: str,
        file_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update the summary file by prepending new summary at the top.
        
        Args:
            new_summary: New summary content to add
            file_path: Path to summary file (optional, uses self.summary_file if not provided)
            
        Returns:
            Dictionary with status and message
        """
        target_file = file_path or self.summary_file
        
        try:
            # Read existing content
            if os.path.exists(target_file):
                with open(target_file, 'r', encoding='utf-8') as f:
                    existing_content = f.read()
            else:
                existing_content = "# Project Valine - Comprehensive Summary\n\n"
            
            # Prepend new summary
            updated_content = new_summary + existing_content
            
            # Write updated content
            with open(target_file, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            
            return {
                'success': True,
                'message': f'Successfully updated {target_file}',
                'file_path': target_file
            }
        
        except Exception as e:
            return {
                'success': False,
                'message': f'Failed to update summary file: {str(e)}',
                'error': str(e)
            }
    
    def run(
        self,
        custom_notes: Optional[str] = None,
        include_prs: bool = True,
        include_workflows: bool = True,
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Run the summary agent to generate and update project summary.
        
        Args:
            custom_notes: Custom notes to include in summary
            include_prs: Whether to fetch and include recent PRs
            include_workflows: Whether to fetch and include workflow status
            dry_run: If True, generate summary but don't write to file
            
        Returns:
            Dictionary with status, summary content, and result
        """
        print("🤖 SummaryAgent starting...")
        
        # Generate summary
        print("📝 Generating summary...")
        summary = self.generate_summary(
            custom_notes=custom_notes,
            include_prs=include_prs,
            include_workflows=include_workflows
        )
        
        result = {
            'success': True,
            'summary': summary,
            'dry_run': dry_run
        }
        
        # Update file if not dry run
        if not dry_run:
            print(f"💾 Updating {self.summary_file}...")
            update_result = self.update_summary_file(summary)
            result.update(update_result)
            
            if update_result['success']:
                print(f"✅ Summary updated successfully!")
            else:
                print(f"❌ Failed to update summary: {update_result.get('message')}")
        else:
            print("🔍 Dry run - summary generated but not written to file")
            result['message'] = 'Dry run completed - summary generated but not saved'
        
        return result
