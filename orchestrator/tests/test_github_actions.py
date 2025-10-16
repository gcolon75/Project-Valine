"""
Unit tests for GitHub Actions verifier module.
"""
import unittest
from unittest.mock import Mock, MagicMock
from datetime import datetime
from app.verification.github_actions import GitHubActionsVerifier


class TestGitHubActionsVerifier(unittest.TestCase):
    """Test GitHub Actions verifier functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_github_service = Mock()
        self.verifier = GitHubActionsVerifier(self.mock_github_service)
    
    def test_parse_run_id_from_url(self):
        """Test parsing run ID from URL."""
        url = 'https://github.com/owner/repo/actions/runs/12345'
        run_id = self.verifier.parse_run_id_from_url(url)
        self.assertEqual(run_id, 12345)
        
        # Test invalid URL
        invalid_url = 'https://github.com/owner/repo'
        run_id = self.verifier.parse_run_id_from_url(invalid_url)
        self.assertIsNone(run_id)
    
    def test_get_cloudfront_status(self):
        """Test CloudFront status determination."""
        # Test with successful invalidation
        run_info = {
            'step_durations': {
                'cloudfront_invalidation': 8.3
            }
        }
        status = self.verifier.get_cloudfront_status(run_info)
        self.assertEqual(status, 'ok')
        
        # Test with missing invalidation
        run_info = {
            'step_durations': {
                'cloudfront_invalidation': None
            }
        }
        status = self.verifier.get_cloudfront_status(run_info)
        self.assertEqual(status, 'missing')
        
        # Test with no run info
        status = self.verifier.get_cloudfront_status(None)
        self.assertEqual(status, 'unknown')
    
    def test_calculate_duration(self):
        """Test step duration calculation."""
        # Mock step with datetime objects
        step = Mock()
        step.started_at = datetime(2024, 1, 1, 12, 0, 0)
        step.completed_at = datetime(2024, 1, 1, 12, 1, 30)
        
        duration = self.verifier._calculate_duration(step)
        self.assertEqual(duration, 90.0)
        
        # Test with missing timestamps
        step_no_time = Mock()
        step_no_time.started_at = None
        step_no_time.completed_at = None
        
        duration = self.verifier._calculate_duration(step_no_time)
        self.assertIsNone(duration)


if __name__ == '__main__':
    unittest.main()
