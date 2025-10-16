"""
GitHub Actions dispatcher for triggering workflows on demand.
Supports repository_dispatch and workflow_dispatch with polling and result parsing.
"""
import os
import re
import json
import time
import uuid
import requests
from datetime import datetime, timedelta, timezone
from github import GithubException


class GitHubActionsDispatcher:
    """Dispatches and monitors GitHub Actions workflow runs."""

    def __init__(self, github_service):
        """
        Initialize with a GitHub service instance.

        Args:
            github_service: Instance of GitHubService
        """
        self.github_service = github_service
        self.repo_name = os.environ.get('GITHUB_REPO', 'gcolon75/Project-Valine')
        self.token = github_service.token
        self.base_url = 'https://api.github.com'
        self.headers = {
            'Authorization': f'token {self.token}',
            'Accept': 'application/vnd.github.v3+json'
        }

    def generate_correlation_id(self):
        """Generate a UUID for correlation tracking."""
        return str(uuid.uuid4())

    def trigger_diagnose_dispatch(self, correlation_id, requester, channel_id='', thread_id='',
                                   frontend_url='', api_base=''):
        """
        Trigger diagnose workflow via repository_dispatch.

        Args:
            correlation_id: Unique correlation ID for tracking
            requester: Username or ID of the requester
            channel_id: Discord channel ID (optional)
            thread_id: Discord thread ID (optional)
            frontend_url: Frontend URL override (optional)
            api_base: API base URL override (optional)

        Returns:
            dict with 'success', 'message', and optionally 'run_url'
        """
        try:
            owner, repo = self.repo_name.split('/')
            url = f'{self.base_url}/repos/{owner}/{repo}/dispatches'

            payload = {
                'event_type': 'diagnose.request',
                'client_payload': {
                    'correlation_id': correlation_id,
                    'requester': requester,
                    'channel_id': channel_id,
                    'thread_id': thread_id,
                    'frontend_url': frontend_url,
                    'api_base': api_base
                }
            }

            response = requests.post(url, headers=self.headers, json=payload, timeout=10)

            # 204 No Content is success for repository_dispatch
            if response.status_code == 204:
                print(f'Repository dispatch triggered for correlation_id: {correlation_id}')
                return {
                    'success': True,
                    'message': f'Diagnose workflow triggered with correlation_id: {correlation_id}'
                }
            elif response.status_code == 403:
                print(f'Repository dispatch forbidden (403): {response.text}')
                return {
                    'success': False,
                    'message': 'Permission denied. Falling back to workflow_dispatch may be needed.'
                }
            elif response.status_code == 429:
                print('Rate limit exceeded (429)')
                return {
                    'success': False,
                    'message': 'Rate limit exceeded. Please try again later.'
                }
            else:
                print(f'Repository dispatch failed with status {response.status_code}: {response.text}')
                return {
                    'success': False,
                    'message': f'Failed to trigger workflow (status {response.status_code})'
                }

        except requests.exceptions.Timeout:
            print('Repository dispatch request timed out')
            return {
                'success': False,
                'message': 'Request timed out'
            }
        except Exception as e:
            print(f'Error triggering repository dispatch: {str(e)}')
            return {
                'success': False,
                'message': f'Error: {str(e)}'
            }

    def trigger_workflow_dispatch(self, workflow_id, correlation_id, requester,
                                   channel_id='', thread_id='', frontend_url='', api_base=''):
        """
        Trigger workflow via workflow_dispatch (fallback).

        Args:
            workflow_id: Workflow file name or ID
            correlation_id: Unique correlation ID for tracking
            requester: Username or ID of the requester
            channel_id: Discord channel ID (optional)
            thread_id: Discord thread ID (optional)
            frontend_url: Frontend URL override (optional)
            api_base: API base URL override (optional)

        Returns:
            dict with 'success', 'message'
        """
        try:
            owner, repo = self.repo_name.split('/')
            url = f'{self.base_url}/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches'

            payload = {
                'ref': 'main',
                'inputs': {
                    'correlation_id': correlation_id,
                    'requester': requester,
                    'channel_id': channel_id,
                    'thread_id': thread_id,
                    'frontend_url': frontend_url,
                    'api_base': api_base
                }
            }

            response = requests.post(url, headers=self.headers, json=payload, timeout=10)

            if response.status_code == 204:
                print(f'Workflow dispatch triggered for correlation_id: {correlation_id}')
                return {
                    'success': True,
                    'message': f'Workflow triggered with correlation_id: {correlation_id}'
                }
            else:
                print(f'Workflow dispatch failed with status {response.status_code}: {response.text}')
                return {
                    'success': False,
                    'message': f'Failed to trigger workflow (status {response.status_code})'
                }

        except Exception as e:
            print(f'Error triggering workflow dispatch: {str(e)}')
            return {
                'success': False,
                'message': f'Error: {str(e)}'
            }

    def find_run_by_correlation_id(self, correlation_id, max_age_minutes=5):
        """
        Find a workflow run by correlation_id in the run name.

        Args:
            correlation_id: Correlation ID to search for
            max_age_minutes: Maximum age of runs to search (default: 5)

        Returns:
            Workflow run object or None if not found
        """
        try:
            repo = self.github_service.get_repository(self.repo_name)
            cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=max_age_minutes)

            # Get recent workflow runs
            workflows = repo.get_workflows()
            for workflow in workflows:
                if 'Diagnose' in workflow.name:
                    runs = workflow.get_runs()
                    for run in runs:
                        # Check if run is recent enough
                        if run.created_at < cutoff_time:
                            continue

                        # Check if correlation_id is in run name
                        if correlation_id in run.name:
                            print(f'Found run {run.id} for correlation_id: {correlation_id}')
                            return run

            print(f'No run found for correlation_id: {correlation_id}')
            return None

        except GithubException as e:
            print(f'Error finding run by correlation_id: {str(e)}')
            return None

    def poll_run_completion(self, correlation_id, timeout_seconds=180, poll_interval=5):
        """
        Poll for run completion by correlation_id.

        Args:
            correlation_id: Correlation ID to track
            timeout_seconds: Maximum time to wait (default: 180)
            poll_interval: Seconds between polls (default: 5)

        Returns:
            dict with 'success', 'run', 'message', 'timed_out'
        """
        start_time = time.time()
        run = None
        retries = 0
        max_retries = 2

        print(f'Polling for run with correlation_id: {correlation_id}')

        # First, wait a bit for the run to be created
        time.sleep(3)

        while time.time() - start_time < timeout_seconds:
            try:
                # Try to find the run
                if run is None:
                    run = self.find_run_by_correlation_id(correlation_id)
                    if run is None:
                        # Not found yet, wait and retry
                        if retries < max_retries:
                            retries += 1
                            print(f'Run not found yet, retry {retries}/{max_retries}')
                            time.sleep(poll_interval)
                            continue
                        else:
                            return {
                                'success': False,
                                'run': None,
                                'message': f'Run not found for correlation_id: {correlation_id}',
                                'timed_out': False
                            }

                # Check run status
                run = self.github_service.get_repository(self.repo_name).get_workflow_run(run.id)

                if run.status == 'completed':
                    print(f'Run {run.id} completed with conclusion: {run.conclusion}')
                    return {
                        'success': True,
                        'run': run,
                        'message': f'Run completed: {run.conclusion}',
                        'timed_out': False
                    }

                # Still in progress, wait
                print(f'Run {run.id} status: {run.status}')
                time.sleep(poll_interval)

            except GithubException as e:
                if e.status == 403 or e.status == 429:
                    # Rate limit, back off
                    print(f'Rate limit hit (status {e.status}), backing off...')
                    time.sleep(poll_interval * 2)
                else:
                    print(f'Error polling run: {str(e)}')
                    time.sleep(poll_interval)

        # Timed out
        print(f'Polling timed out after {timeout_seconds} seconds')
        return {
            'success': False,
            'run': run,
            'message': f'Polling timed out after {timeout_seconds} seconds',
            'timed_out': True
        }

    def parse_summary_json(self, summary_text):
        """
        Parse the JSON block from GITHUB_STEP_SUMMARY text.

        Args:
            summary_text: Text content of the step summary

        Returns:
            dict with parsed JSON or None if not found
        """
        try:
            # Look for JSON fenced code block
            pattern = r'```json\s*(\{.*?\})\s*```'
            match = re.search(pattern, summary_text, re.DOTALL)

            if match:
                json_str = match.group(1)
                return json.loads(json_str)

            print('No JSON block found in summary')
            return None

        except json.JSONDecodeError as e:
            print(f'Error parsing JSON from summary: {str(e)}')
            return None

    def download_artifact(self, run_id, artifact_name='diagnose-summary'):
        """
        Download and parse artifact from a run.

        Args:
            run_id: GitHub Actions run ID
            artifact_name: Name of the artifact (default: 'diagnose-summary')

        Returns:
            dict with parsed JSON or None if not found
        """
        try:
            owner, repo = self.repo_name.split('/')
            url = f'{self.base_url}/repos/{owner}/{repo}/actions/runs/{run_id}/artifacts'

            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()

            artifacts = response.json().get('artifacts', [])

            # Find the artifact
            artifact = None
            for art in artifacts:
                if art['name'] == artifact_name:
                    artifact = art
                    break

            if not artifact:
                print(f'Artifact {artifact_name} not found for run {run_id}')
                return None

            # Download artifact
            download_url = artifact['archive_download_url']
            download_response = requests.get(download_url, headers=self.headers, timeout=10)
            download_response.raise_for_status()

            # The artifact is a zip file, but for simplicity, we'll try to get the JSON
            # In practice, you'd need to unzip and read the file
            # For now, we'll return None and rely on parsing the summary
            print(f'Artifact downloaded but zip extraction not implemented')
            return None

        except Exception as e:
            print(f'Error downloading artifact: {str(e)}')
            return None

    def get_run_summary(self, run):
        """
        Get comprehensive summary from a completed run.

        Args:
            run: GitHub workflow run object

        Returns:
            dict with run information and parsed results
        """
        try:
            summary = {
                'run_id': run.id,
                'html_url': run.html_url,
                'status': run.status,
                'conclusion': run.conclusion,
                'created_at': run.created_at,
                'updated_at': run.updated_at,
                'run_name': run.name,
                'checks': None
            }

            # Try to get artifact first (not fully implemented due to zip handling)
            # artifact_data = self.download_artifact(run.id)
            # if artifact_data:
            #     summary['checks'] = artifact_data

            # For now, we'll parse the summary from the run's jobs
            # The GITHUB_STEP_SUMMARY is not directly accessible via API
            # We'd need to fetch the job logs or use the Checks API

            # As a simplified approach, we'll return basic info
            # The Discord handler can construct a message from the run URL

            return summary

        except Exception as e:
            print(f'Error getting run summary: {str(e)}')
            return None

    def format_result_for_discord(self, summary):
        """
        Format run summary for Discord message.

        Args:
            summary: Run summary dict

        Returns:
            dict with 'content' and optional 'embed'
        """
        if not summary:
            return {
                'content': '❌ Failed to get run summary'
            }

        conclusion = summary.get('conclusion', 'unknown')
        run_url = summary.get('html_url', '')

        if conclusion == 'success':
            icon = '🟢'
            status_text = 'OK'
        elif conclusion == 'failure':
            icon = '🔴'
            status_text = 'Failed'
        else:
            icon = '⚠️'
            status_text = conclusion.capitalize()

        # Basic message without parsed checks
        content = f'{icon} **Diagnose {status_text}**\n\n'
        content += f'**Run:** {run_url}\n'
        content += f'**Status:** {conclusion}\n'
        content += '\nℹ️ View the run for detailed results and evidence.'

        return {
            'content': content
        }

    def get_workflow_by_name(self, workflow_name):
        """
        Get a workflow by name.

        Args:
            workflow_name: Name of the workflow to find

        Returns:
            Workflow object or None if not found
        """
        try:
            repo = self.github_service.get_repository(self.repo_name)
            workflows = repo.get_workflows()
            
            for workflow in workflows:
                if workflow.name == workflow_name:
                    print(f'Found workflow "{workflow_name}" with ID: {workflow.id}')
                    return workflow
            
            print(f'Workflow "{workflow_name}" not found')
            return None
        except GithubException as e:
            print(f'Error getting workflow by name: {str(e)}')
            return None

    def list_workflow_runs(self, workflow_name, branch='main', count=3):
        """
        List recent runs for a workflow.

        Args:
            workflow_name: Name of the workflow
            branch: Branch to filter by (default: main)
            count: Number of runs to retrieve (default: 3, max: 100)

        Returns:
            list of workflow run dicts with relevant info, or empty list on error
        """
        try:
            workflow = self.get_workflow_by_name(workflow_name)
            if not workflow:
                return []

            # Get runs for the workflow on the specified branch
            runs = workflow.get_runs(branch=branch)
            
            result = []
            for i, run in enumerate(runs):
                if i >= count:
                    break
                
                # Calculate duration if completed
                duration_seconds = None
                if run.status == 'completed' and run.created_at and run.updated_at:
                    duration = run.updated_at - run.created_at
                    duration_seconds = int(duration.total_seconds())
                
                result.append({
                    'id': run.id,
                    'name': run.name,
                    'status': run.status,
                    'conclusion': run.conclusion,
                    'html_url': run.html_url,
                    'created_at': run.created_at,
                    'updated_at': run.updated_at,
                    'duration_seconds': duration_seconds,
                    'event': run.event,
                    'head_sha': run.head_sha[:7] if run.head_sha else None
                })
            
            return result

        except GithubException as e:
            print(f'Error listing workflow runs for "{workflow_name}": {str(e)}')
            return []
        except Exception as e:
            print(f'Unexpected error listing workflow runs: {str(e)}')
            return []

    def trigger_client_deploy(self, correlation_id, requester, api_base=''):
        """
        Trigger Client Deploy workflow via workflow_dispatch.

        Args:
            correlation_id: Unique correlation ID for tracking
            requester: Username or ID of the requester
            api_base: Optional API base URL override

        Returns:
            dict with 'success', 'message', and optionally 'workflow_id'
        """
        try:
            workflow = self.get_workflow_by_name('Client Deploy')
            if not workflow:
                return {
                    'success': False,
                    'message': 'Client Deploy workflow not found'
                }

            owner, repo = self.repo_name.split('/')
            url = f'{self.base_url}/repos/{owner}/{repo}/actions/workflows/{workflow.id}/dispatches'

            payload = {
                'ref': 'main',
                'inputs': {
                    'correlation_id': correlation_id,
                    'requester': requester
                }
            }
            
            # Add api_base input if provided
            if api_base:
                payload['inputs']['VITE_API_BASE'] = api_base

            response = requests.post(url, headers=self.headers, json=payload, timeout=10)

            if response.status_code == 204:
                print(f'Client Deploy triggered with correlation_id: {correlation_id}')
                return {
                    'success': True,
                    'message': f'Client Deploy triggered',
                    'workflow_id': workflow.id
                }
            elif response.status_code == 403:
                print(f'Client Deploy dispatch forbidden (403): {response.text}')
                return {
                    'success': False,
                    'message': 'Permission denied. Check GitHub token permissions.'
                }
            elif response.status_code == 429:
                print('Rate limit exceeded (429)')
                return {
                    'success': False,
                    'message': 'Rate limit exceeded. Please try again later.'
                }
            else:
                print(f'Client Deploy dispatch failed with status {response.status_code}: {response.text}')
                return {
                    'success': False,
                    'message': f'Failed to trigger workflow (status {response.status_code})'
                }

        except requests.exceptions.Timeout:
            print('Client Deploy dispatch request timed out')
            return {
                'success': False,
                'message': 'Request timed out'
            }
        except Exception as e:
            print(f'Error triggering Client Deploy: {str(e)}')
            return {
                'success': False,
                'message': f'Error: {str(e)}'
            }

    def find_recent_run_for_workflow(self, workflow_name, max_age_seconds=30):
        """
        Find the most recent run for a workflow (within max_age_seconds).

        Args:
            workflow_name: Name of the workflow
            max_age_seconds: Maximum age of runs to consider (default: 30)

        Returns:
            Workflow run object or None if not found
        """
        try:
            workflow = self.get_workflow_by_name(workflow_name)
            if not workflow:
                return None

            cutoff_time = datetime.now(timezone.utc) - timedelta(seconds=max_age_seconds)
            runs = workflow.get_runs()

            for run in runs:
                # Ensure timezone-aware comparison
                run_created = run.created_at
                if run_created.tzinfo is None:
                    run_created = run_created.replace(tzinfo=timezone.utc)
                
                if run_created >= cutoff_time:
                    print(f'Found recent run {run.id} for workflow "{workflow_name}"')
                    return run

            print(f'No recent run found for workflow "{workflow_name}"')
            return None

        except GithubException as e:
            print(f'Error finding recent run: {str(e)}')
            return None

    def find_run_by_correlation(self, correlation_id, workflow_name='Client Deploy', max_age_minutes=5):
        """
        Find a workflow run by correlation_id in the run name.

        Args:
            correlation_id: Correlation ID to search for
            workflow_name: Name of the workflow (default: 'Client Deploy')
            max_age_minutes: Maximum age of runs to search (default: 5)

        Returns:
            Workflow run object or None if not found
        """
        try:
            workflow = self.get_workflow_by_name(workflow_name)
            if not workflow:
                print(f'Workflow "{workflow_name}" not found')
                # Fallback to recent run on main
                return self.find_recent_run_for_workflow(workflow_name, max_age_seconds=max_age_minutes*60)

            cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=max_age_minutes)
            runs = workflow.get_runs()

            for run in runs:
                # Ensure timezone-aware comparison
                run_created = run.created_at
                if run_created.tzinfo is None:
                    run_created = run_created.replace(tzinfo=timezone.utc)
                
                # Check if run is recent enough
                if run_created < cutoff_time:
                    continue

                # Check if correlation_id is in run name
                if correlation_id in run.name:
                    print(f'Found run {run.id} for correlation_id: {correlation_id}')
                    return run

            print(f'No run found for correlation_id: {correlation_id}, falling back to most recent')
            # Fallback to most recent run on main
            return self.find_recent_run_for_workflow(workflow_name, max_age_seconds=max_age_minutes*60)

        except GithubException as e:
            print(f'Error finding run by correlation_id: {str(e)}')
            return None

    def poll_run_conclusion(self, run_id, timeout_seconds=180, poll_interval=3):
        """
        Poll for run completion by run_id.

        Args:
            run_id: Run ID to track
            timeout_seconds: Maximum time to wait (default: 180)
            poll_interval: Seconds between polls (default: 3)

        Returns:
            dict with 'completed', 'conclusion', 'run', 'message', 'timed_out'
        """
        start_time = time.time()
        retries = 0
        max_retries = 2

        print(f'Polling for run completion: {run_id}')

        while time.time() - start_time < timeout_seconds:
            try:
                # Get the run
                run = self.github_service.get_repository(self.repo_name).get_workflow_run(run_id)

                if run.status == 'completed':
                    print(f'Run {run.id} completed with conclusion: {run.conclusion}')
                    return {
                        'completed': True,
                        'conclusion': run.conclusion,
                        'run': run,
                        'message': f'Run completed: {run.conclusion}',
                        'timed_out': False
                    }

                # Still in progress, wait
                print(f'Run {run.id} status: {run.status}')
                time.sleep(poll_interval)

            except GithubException as e:
                if e.status == 403 or e.status == 429:
                    # Rate limit, back off
                    if retries < max_retries:
                        retries += 1
                        print(f'Rate limit hit (status {e.status}), retry {retries}/{max_retries}')
                        time.sleep(poll_interval * 2)
                    else:
                        print(f'Rate limit exceeded after {max_retries} retries')
                        return {
                            'completed': False,
                            'conclusion': None,
                            'run': None,
                            'message': 'Rate limit exceeded',
                            'timed_out': False
                        }
                else:
                    print(f'Error polling run: {str(e)}')
                    time.sleep(poll_interval)

        # Timed out
        print(f'Polling timed out after {timeout_seconds} seconds')
        try:
            run = self.github_service.get_repository(self.repo_name).get_workflow_run(run_id)
        except:
            run = None
        
        return {
            'completed': False,
            'conclusion': None,
            'run': run,
            'message': f'Polling timed out after {timeout_seconds} seconds',
            'timed_out': True
        }
