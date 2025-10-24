"""
Tests for SummaryAgent.
"""
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))

from agents.summary_agent import SummaryAgent


class TestSummaryAgent(unittest.TestCase):
    """Test suite for SummaryAgent."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.agent = SummaryAgent(
            repo="test/repo",
            github_token="test_token",
            summary_file="test_summary.md"
        )
    
    def test_init(self):
        """Test SummaryAgent initialization."""
        self.assertEqual(self.agent.repo, "test/repo")
        self.assertEqual(self.agent.github_token, "test_token")
        self.assertEqual(self.agent.summary_file, "test_summary.md")
        self.assertIn("Authorization", self.agent.headers)
        self.assertEqual(self.agent.headers["Authorization"], "token test_token")
    
    def test_init_without_token(self):
        """Test SummaryAgent initialization without GitHub token."""
        agent = SummaryAgent(repo="test/repo")
        self.assertIsNone(agent.github_token)
        self.assertNotIn("Authorization", agent.headers)
    
    def test_generate_summary_basic(self):
        """Test basic summary generation without API calls."""
        summary = self.agent.generate_summary(
            custom_notes="Test notes",
            include_prs=False,
            include_workflows=False
        )
        
        self.assertIsInstance(summary, str)
        self.assertIn("🆕 Project Valine Status", summary)
        self.assertIn("Test notes", summary)
        self.assertIn("**Next quests:**", summary)
        self.assertIn("---", summary)
    
    def test_generate_summary_with_custom_notes(self):
        """Test summary generation with custom notes."""
        custom_notes = "- 🎮 New feature deployed\n- ✅ All tests passing"
        summary = self.agent.generate_summary(
            custom_notes=custom_notes,
            include_prs=False,
            include_workflows=False
        )
        
        self.assertIn(custom_notes, summary)
    
    @patch('agents.summary_agent.requests.get')
    def test_get_recent_prs_success(self, mock_get):
        """Test fetching recent PRs successfully."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                'number': 123,
                'title': 'Test PR',
                'merged_at': '2025-10-23T12:00:00Z'
            },
            {
                'number': 124,
                'title': 'Another PR',
                'merged_at': None  # Not merged
            }
        ]
        mock_get.return_value = mock_response
        
        prs = self.agent._get_recent_prs(5)
        
        self.assertEqual(len(prs), 1)  # Only merged PR
        self.assertEqual(prs[0]['number'], 123)
        self.assertEqual(prs[0]['title'], 'Test PR')
    
    @patch('agents.summary_agent.requests.get')
    def test_get_recent_prs_error(self, mock_get):
        """Test handling error when fetching PRs."""
        mock_get.side_effect = Exception("API error")
        
        prs = self.agent._get_recent_prs(5)
        
        self.assertEqual(prs, [])
    
    @patch('agents.summary_agent.requests.get')
    def test_get_recent_workflow_runs_success(self, mock_get):
        """Test fetching workflow runs successfully."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'workflow_runs': [
                {
                    'name': 'Client Deploy',
                    'conclusion': 'success',
                    'html_url': 'https://github.com/test/repo/runs/1'
                },
                {
                    'name': 'Other Workflow',
                    'conclusion': 'failure',
                    'html_url': 'https://github.com/test/repo/runs/2'
                }
            ]
        }
        mock_get.return_value = mock_response
        
        runs = self.agent._get_recent_workflow_runs("Client Deploy", 3)
        
        self.assertEqual(len(runs), 1)  # Only Client Deploy
        self.assertEqual(runs[0]['name'], 'Client Deploy')
        self.assertEqual(runs[0]['conclusion'], 'success')
    
    @patch('agents.summary_agent.requests.get')
    def test_get_recent_workflow_runs_error(self, mock_get):
        """Test handling error when fetching workflows."""
        mock_get.side_effect = Exception("API error")
        
        runs = self.agent._get_recent_workflow_runs("Client Deploy", 3)
        
        self.assertEqual(runs, [])
    
    def test_update_summary_file_new_file(self):
        """Test updating a new summary file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = os.path.join(tmpdir, "test_summary.md")
            agent = SummaryAgent(summary_file=test_file)
            
            new_summary = "## Test Summary\n\nTest content\n\n---\n\n"
            result = agent.update_summary_file(new_summary)
            
            self.assertTrue(result['success'])
            self.assertEqual(result['file_path'], test_file)
            
            # Verify file content
            with open(test_file, 'r') as f:
                content = f.read()
            
            self.assertIn("Test Summary", content)
            self.assertIn("Test content", content)
            self.assertIn("Comprehensive Summary", content)  # Default header
    
    def test_update_summary_file_existing_file(self):
        """Test updating an existing summary file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = os.path.join(tmpdir, "test_summary.md")
            
            # Create existing file
            existing_content = "# Existing Content\n\nOld summary\n"
            with open(test_file, 'w') as f:
                f.write(existing_content)
            
            agent = SummaryAgent(summary_file=test_file)
            
            new_summary = "## New Summary\n\nNew content\n\n---\n\n"
            result = agent.update_summary_file(new_summary)
            
            self.assertTrue(result['success'])
            
            # Verify file content - new summary should be at top
            with open(test_file, 'r') as f:
                content = f.read()
            
            self.assertIn("New Summary", content)
            self.assertIn("Existing Content", content)
            self.assertTrue(content.index("New Summary") < content.index("Existing Content"))
    
    def test_update_summary_file_error(self):
        """Test handling error when updating summary file."""
        # Use invalid path to trigger error
        agent = SummaryAgent(summary_file="/invalid/path/test_summary.md")
        
        new_summary = "## Test Summary\n\n"
        result = agent.update_summary_file(new_summary)
        
        self.assertFalse(result['success'])
        self.assertIn('error', result)
    
    @patch('agents.summary_agent.requests.get')
    def test_run_dry_run(self, mock_get):
        """Test running agent in dry-run mode."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = os.path.join(tmpdir, "test_summary.md")
            agent = SummaryAgent(
                repo="test/repo",
                github_token="test_token",
                summary_file=test_file
            )
            
            result = agent.run(
                custom_notes="Test notes",
                include_prs=False,
                include_workflows=False,
                dry_run=True
            )
            
            self.assertTrue(result['success'])
            self.assertTrue(result['dry_run'])
            self.assertIn('summary', result)
            self.assertFalse(os.path.exists(test_file))  # File not created in dry-run
    
    @patch('agents.summary_agent.requests.get')
    def test_run_success(self, mock_get):
        """Test successful agent run."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = os.path.join(tmpdir, "test_summary.md")
            agent = SummaryAgent(
                repo="test/repo",
                github_token="test_token",
                summary_file=test_file
            )
            
            result = agent.run(
                custom_notes="Test notes",
                include_prs=False,
                include_workflows=False,
                dry_run=False
            )
            
            self.assertTrue(result['success'])
            self.assertFalse(result['dry_run'])
            self.assertIn('summary', result)
            self.assertTrue(os.path.exists(test_file))  # File created
            
            # Verify file content
            with open(test_file, 'r') as f:
                content = f.read()
            
            self.assertIn("Test notes", content)
    
    @patch('agents.summary_agent.requests.get')
    def test_generate_summary_with_prs(self, mock_get):
        """Test summary generation with PR fetching."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                'number': 123,
                'title': 'Test PR',
                'merged_at': '2025-10-23T12:00:00Z'
            }
        ]
        mock_get.return_value = mock_response
        
        summary = self.agent.generate_summary(
            include_prs=True,
            include_workflows=False
        )
        
        self.assertIn("**Recent PRs:**", summary)
        self.assertIn("#123", summary)
        self.assertIn("Test PR", summary)
    
    @patch('agents.summary_agent.requests.get')
    def test_generate_summary_with_workflows(self, mock_get):
        """Test summary generation with workflow fetching."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'workflow_runs': [
                {
                    'name': 'Client Deploy',
                    'conclusion': 'success',
                    'html_url': 'https://github.com/test/repo/runs/1'
                }
            ]
        }
        mock_get.return_value = mock_response
        
        summary = self.agent.generate_summary(
            include_prs=False,
            include_workflows=True
        )
        
        self.assertIn("**Recent Deployments:**", summary)
        self.assertIn("✅", summary)  # Success icon


if __name__ == '__main__':
    unittest.main()
