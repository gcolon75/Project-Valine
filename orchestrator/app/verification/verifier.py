"""
Main verification orchestrator.
Coordinates GitHub Actions checks, HTTP checks, and message composition.
"""
import os
from services.github import GitHubService
from verification.github_actions import GitHubActionsVerifier
from verification.http_checker import HTTPChecker
from verification.message_composer import MessageComposer


class DeployVerifier:
    """Main orchestrator for deploy verification."""

    def __init__(self, github_token=None):
        """
        Initialize deploy verifier.

        Args:
            github_token: GitHub token (default: from environment)
        """
        self.github_service = GitHubService(token=github_token)
        self.actions_verifier = GitHubActionsVerifier(self.github_service)
        self.http_checker = HTTPChecker()
        self.message_composer = MessageComposer()

    def verify_latest_run(self, run_url=None):
        """
        Verify the latest Client Deploy run or a specific run by URL.

        Args:
            run_url: Optional GitHub Actions run URL

        Returns:
            Dictionary with verification results and Discord message
        """
        # Get the workflow run
        if run_url:
            # Parse run ID from URL
            run_id = self.actions_verifier.parse_run_id_from_url(run_url)
            if not run_id:
                return {
                    'error': 'Invalid run URL format',
                    'message': {
                        'content': '❌ Invalid run URL format',
                        'embed': None
                    }
                }
            run = self.actions_verifier.get_run_by_id(run_id)
        else:
            # Get latest run
            run = self.actions_verifier.get_latest_run()

        if not run:
            return {
                'error': 'No workflow run found',
                'message': {
                    'content': '❌ No Client Deploy workflow run found',
                    'embed': {
                        'title': 'Deploy Verification',
                        'description': 'No workflow run found for Client Deploy on main branch',
                        'color': 0xFF0000
                    }
                }
            }

        return self.verify_run(run.id)

    def verify_run(self, run_id):
        """
        Verify a specific workflow run by ID.

        Args:
            run_id: GitHub Actions run ID

        Returns:
            Dictionary with verification results and Discord message
        """
        # Get run information
        run = self.actions_verifier.get_run_by_id(run_id)
        if not run:
            return {
                'error': f'Workflow run {run_id} not found',
                'message': {
                    'content': f'❌ Workflow run {run_id} not found',
                    'embed': None
                }
            }

        run_info = self.actions_verifier.get_run_info(run)
        if not run_info:
            return {
                'error': 'Failed to get run information',
                'message': {
                    'content': '❌ Failed to get run information',
                    'embed': None
                }
            }

        # Get URLs from environment
        frontend_base_url = os.environ.get('FRONTEND_BASE_URL')
        api_base_url = os.environ.get('VITE_API_BASE')

        # Perform HTTP checks
        frontend_results = self.http_checker.check_frontend(frontend_base_url)
        api_results = self.http_checker.check_api(api_base_url)

        # Compose message
        message = self.message_composer.compose_verification_message(
            run_info,
            frontend_results,
            api_results
        )

        return {
            'run_info': run_info,
            'frontend_results': frontend_results,
            'api_results': api_results,
            'message': message
        }
