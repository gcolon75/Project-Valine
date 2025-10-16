"""
GitHub Actions integration for deploy verification.
Fetches workflow runs, jobs, and calculates step durations.
"""
import re
import os
from datetime import datetime
from github import GithubException
from app.config.verification_config import WORKFLOW_NAME, TARGET_BRANCH, STEP_PATTERNS


class GitHubActionsVerifier:
    """Verifies GitHub Actions workflow runs for deploy verification."""

    def __init__(self, github_service):
        """
        Initialize with a GitHub service instance.

        Args:
            github_service: Instance of GitHubService
        """
        self.github_service = github_service
        self.repo_name = os.environ.get('GITHUB_REPO', 'gcolon75/Project-Valine')

    def get_latest_run(self, workflow_name=None, branch=None):
        """
        Get the latest workflow run for the specified workflow.

        Args:
            workflow_name: Workflow name (default: WORKFLOW_NAME from config)
            branch: Branch name (default: TARGET_BRANCH from config)

        Returns:
            Workflow run object or None if not found
        """
        workflow_name = workflow_name or WORKFLOW_NAME
        branch = branch or TARGET_BRANCH

        try:
            repo = self.github_service.get_repository(self.repo_name)
            workflows = repo.get_workflows()

            # Find workflow by name
            target_workflow = None
            for workflow in workflows:
                if workflow.name == workflow_name:
                    target_workflow = workflow
                    break

            if not target_workflow:
                print(f'Workflow "{workflow_name}" not found')
                return None

            # Get runs for this workflow on the target branch
            runs = target_workflow.get_runs(branch=branch)

            # Return the first (latest) run
            for run in runs:
                return run

            print(f'No runs found for workflow "{workflow_name}" on branch "{branch}"')
            return None

        except GithubException as e:
            print(f'Error fetching latest workflow run: {str(e)}')
            return None

    def get_run_by_id(self, run_id):
        """
        Get a workflow run by its ID.

        Args:
            run_id: GitHub Actions run ID

        Returns:
            Workflow run object or None if not found
        """
        try:
            repo = self.github_service.get_repository(self.repo_name)
            return repo.get_workflow_run(run_id)
        except GithubException as e:
            print(f'Error fetching workflow run {run_id}: {str(e)}')
            return None

    def parse_run_id_from_url(self, run_url):
        """
        Extract run ID from a GitHub Actions run URL.

        Args:
            run_url: URL like https://github.com/owner/repo/actions/runs/12345

        Returns:
            Run ID as integer or None if invalid
        """
        match = re.search(r'/actions/runs/(\d+)', run_url)
        if match:
            return int(match.group(1))
        return None

    def get_run_info(self, run):
        """
        Extract comprehensive information from a workflow run.

        Args:
            run: GitHub workflow run object

        Returns:
            Dictionary with run information including durations
        """
        if not run:
            return None

        try:
            # Get jobs for this run
            jobs = list(run.jobs())

            # Calculate step durations
            step_durations = self._calculate_step_durations(jobs)

            # Gather run information
            run_info = {
                'run_id': run.id,
                'conclusion': run.conclusion,
                'status': run.status,
                'html_url': run.html_url,
                'head_sha': run.head_sha,
                'created_at': run.created_at,
                'updated_at': run.updated_at,
                'run_started_at': run.run_started_at,
                'jobs_count': len(jobs),
                'step_durations': step_durations,
                'workflow_name': run.name
            }

            return run_info

        except GithubException as e:
            print(f'Error getting run info: {str(e)}')
            return None

    def _calculate_step_durations(self, jobs):
        """
        Calculate durations for key steps from jobs.

        Args:
            jobs: List of job objects

        Returns:
            Dictionary with step names and durations in seconds
        """
        durations = {
            'build': None,
            's3_sync': None,
            'cloudfront_invalidation': None
        }

        for job in jobs:
            for step in job.steps:
                step_name = step.name

                # Match against patterns
                for key, pattern in STEP_PATTERNS.items():
                    if re.search(pattern, step_name):
                        # Calculate duration
                        duration = self._calculate_duration(step)
                        if duration is not None:
                            # Keep the first matching step for each category
                            if durations[key] is None:
                                durations[key] = duration
                        break

        return durations

    def _calculate_duration(self, step):
        """
        Calculate duration of a step in seconds.

        Args:
            step: GitHub job step object

        Returns:
            Duration in seconds or None if not available
        """
        try:
            if hasattr(step, 'started_at') and hasattr(step, 'completed_at'):
                if step.started_at and step.completed_at:
                    # Parse ISO format timestamps
                    if isinstance(step.started_at, str):
                        started = datetime.fromisoformat(step.started_at.replace('Z', '+00:00'))
                    else:
                        started = step.started_at

                    if isinstance(step.completed_at, str):
                        completed = datetime.fromisoformat(step.completed_at.replace('Z', '+00:00'))
                    else:
                        completed = step.completed_at

                    duration = (completed - started).total_seconds()
                    return round(duration, 1)
        except Exception as e:
            print(f'Error calculating step duration: {str(e)}')

        return None

    def get_cloudfront_status(self, run_info):
        """
        Determine CloudFront invalidation status from run info.

        Args:
            run_info: Dictionary with run information

        Returns:
            Status string: 'ok', 'missing', or 'failed'
        """
        if not run_info or not run_info.get('step_durations'):
            return 'unknown'

        cf_duration = run_info['step_durations'].get('cloudfront_invalidation')

        if cf_duration is None:
            return 'missing'
        elif cf_duration > 0:
            return 'ok'
        else:
            return 'failed'
