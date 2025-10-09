"""
Orchestrator graph - core workflow orchestration logic.
Manages the daily plan generation, approval, execution, and shipping workflow.
"""
import os
import uuid
from datetime import datetime
from ..services.github import GitHubService
from ..services.discord import DiscordService
from ..services.run_store import RunStore


class OrchestratorGraph:
    """
    Main orchestrator workflow graph.
    
    Coordinates between GitHub issues, Discord updates, and run state management.
    """
    
    def __init__(self, github_token=None, discord_bot_token=None, dynamodb_table=None):
        """Initialize orchestrator with service connections."""
        self.github = GitHubService(github_token)
        self.discord = DiscordService(discord_bot_token)
        self.run_store = RunStore(dynamodb_table)
    
    def create_daily_plan(self, channel_id, repo_name='gcolon75/Project-Valine', label='ready'):
        """
        Create a daily plan proposal from open GitHub issues.
        
        Args:
            channel_id: Discord channel ID to post plan to
            repo_name: GitHub repository name
            label: Label to filter issues by
        
        Returns:
            Dictionary with run_id, thread_id, and issue count
        """
        # Step 1: Fetch issues with the specified label
        print(f'Fetching issues with label "{label}" from {repo_name}')
        issues = self.github.get_issues_with_label(label=label, repo_name=repo_name)
        
        if not issues:
            print('No issues found with the specified label')
            return {
                'success': False,
                'message': f'No issues found with label "{label}"'
            }
        
        print(f'Found {len(issues)} issues')
        
        # Step 2: Create plan data
        plan_data = {
            'label': label,
            'repo_name': repo_name,
            'issue_count': len(issues),
            'issues': [
                {
                    'number': issue.number,
                    'title': issue.title,
                    'url': issue.html_url,
                    'labels': [label.name for label in issue.labels]
                }
                for issue in issues
            ],
            'created_at': datetime.now().isoformat()
        }
        
        # Step 3: Post plan to Discord and create thread
        print(f'Posting plan proposal to Discord channel {channel_id}')
        thread_name = f'Daily Plan - {datetime.now().strftime("%Y-%m-%d")}'
        thread = self.discord.send_plan_proposal(channel_id, issues, thread_name)
        
        if not thread:
            print('Failed to create Discord thread')
            return {
                'success': False,
                'message': 'Failed to post plan to Discord'
            }
        
        thread_id = thread.get('id')
        print(f'Created Discord thread: {thread_id}')
        
        # Step 4: Store run in DynamoDB
        run_id = str(uuid.uuid4())
        issue_numbers = [issue.number for issue in issues]
        
        run = self.run_store.create_run(
            run_id=run_id,
            plan_data=plan_data,
            discord_thread_id=thread_id,
            github_issues=issue_numbers
        )
        
        if not run:
            print('Failed to store run in DynamoDB')
            return {
                'success': False,
                'message': 'Failed to store run state'
            }
        
        # Step 5: Post summary to thread
        self.discord.post_to_thread(
            thread_id,
            f'✅ Plan created with run ID: `{run_id}`\n'
            f'📊 {len(issues)} issues ready for processing\n'
            f'Use `/approve` to start execution or provide feedback here.'
        )
        
        return {
            'success': True,
            'run_id': run_id,
            'thread_id': thread_id,
            'issue_count': len(issues)
        }
    
    def approve_plan(self, run_id):
        """
        Approve a plan and begin execution.
        
        Args:
            run_id: Run identifier to approve
        
        Returns:
            Dictionary with success status and message
        """
        # Get run from store
        run = self.run_store.get_run(run_id)
        if not run:
            return {
                'success': False,
                'message': f'Run {run_id} not found'
            }
        
        # Update status to in_progress
        self.run_store.update_run_status(run_id, 'in_progress', 'Plan approved, beginning execution')
        
        # Post update to Discord thread
        thread_id = run.get('discord_thread_id')
        if thread_id:
            self.discord.post_to_thread(
                thread_id,
                '✅ **Plan Approved!**\n'
                'Beginning execution of planned tasks...'
            )
        
        # TODO: Trigger actual task execution
        # This would involve:
        # 1. Processing each issue in the plan
        # 2. Creating branches and PRs
        # 3. Updating run state as tasks complete
        # 4. Posting progress updates to Discord
        
        return {
            'success': True,
            'run_id': run_id,
            'message': 'Plan approved and execution started'
        }
    
    def get_status(self, run_id=None):
        """
        Get status of orchestrator runs.
        
        Args:
            run_id: Optional specific run ID, if None returns all active runs
        
        Returns:
            Dictionary with status information
        """
        if run_id:
            run = self.run_store.get_run(run_id)
            if not run:
                return {
                    'success': False,
                    'message': f'Run {run_id} not found'
                }
            
            return {
                'success': True,
                'run': run
            }
        else:
            # Get all active runs
            active_runs = self.run_store.get_active_runs(limit=10)
            return {
                'success': True,
                'active_runs': active_runs,
                'count': len(active_runs)
            }
    
    def ship(self, run_id):
        """
        Finalize and ship a completed run.
        
        Args:
            run_id: Run identifier to ship
        
        Returns:
            Dictionary with success status and message
        """
        # Get run from store
        run = self.run_store.get_run(run_id)
        if not run:
            return {
                'success': False,
                'message': f'Run {run_id} not found'
            }
        
        # TODO: Implement shipping logic
        # This would involve:
        # 1. Verifying all PRs are merged or ready
        # 2. Triggering any deployment workflows
        # 3. Updating issue statuses
        # 4. Posting final summary to Discord
        # 5. Marking run as completed
        
        # Update status to completed
        self.run_store.update_run_status(run_id, 'completed', 'Run shipped successfully')
        
        # Post update to Discord thread
        thread_id = run.get('discord_thread_id')
        if thread_id:
            completed_count = len(run.get('completed_tasks', []))
            failed_count = len(run.get('failed_tasks', []))
            
            self.discord.post_to_thread(
                thread_id,
                f'🚢 **Shipped!**\n'
                f'✅ Completed: {completed_count}\n'
                f'❌ Failed: {failed_count}\n'
                f'Run {run_id} has been finalized.'
            )
        
        return {
            'success': True,
            'run_id': run_id,
            'message': 'Run shipped successfully'
        }
