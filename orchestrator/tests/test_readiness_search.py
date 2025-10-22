"""
Unit tests for operational readiness search helper.
"""
import unittest
import tempfile
import os
from pathlib import Path
import sys

# Add parent directory to path to import the agent module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from operational_readiness_agent import OperationalReadinessAgent, OperationalReadinessConfig


class TestReadinessSearch(unittest.TestCase):
    """Test cases for operational readiness search functionality."""

    def setUp(self):
        """Set up test fixtures."""
        # Create a temporary directory for testing
        self.temp_dir = tempfile.mkdtemp()
        
        # Create a config that points to our temp directory
        self.config = OperationalReadinessConfig(repo="test/repo")
        self.agent = OperationalReadinessAgent(self.config)
        
        # Override repo_path to use temp directory
        self.agent.repo_path = self.temp_dir

    def tearDown(self):
        """Clean up test fixtures."""
        # Remove temporary directory
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_search_files_for_pattern_finds_placeholder(self):
        """Test that _search_files_for_pattern finds a sample placeholder variable."""
        # Create a test file with a placeholder variable
        test_file = os.path.join(self.temp_dir, 'test_config.py')
        with open(test_file, 'w') as f:
            f.write('# Test configuration file\n')
            f.write('STAGING_DISCORD_BOT_TOKEN=placeholder_value_12345\n')
            f.write('OTHER_VAR=some_other_value\n')
        
        # Search for the placeholder variable
        results = self.agent._search_files_for_pattern('STAGING_DISCORD_BOT_TOKEN', ['.py'])
        
        # Assert that we found the variable
        self.assertGreater(len(results), 0, "Should find at least one match")
        
        # Verify the result structure
        filepath, line_num, content = results[0]
        self.assertEqual(filepath, 'test_config.py')
        self.assertEqual(line_num, 2)
        self.assertIn('STAGING_DISCORD_BOT_TOKEN', content)
        self.assertIn('placeholder', content)

    def test_search_files_for_pattern_filters_by_extension(self):
        """Test that search only looks at specified file extensions."""
        # Create test files with different extensions
        py_file = os.path.join(self.temp_dir, 'test.py')
        txt_file = os.path.join(self.temp_dir, 'test.txt')
        
        with open(py_file, 'w') as f:
            f.write('STAGING_DISCORD_BOT_TOKEN=value1\n')
        
        with open(txt_file, 'w') as f:
            f.write('STAGING_DISCORD_BOT_TOKEN=value2\n')
        
        # Search only .py files
        results = self.agent._search_files_for_pattern('STAGING_DISCORD_BOT_TOKEN', ['.py'])
        
        # Should only find the .py file
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0][0], 'test.py')

    def test_search_files_for_pattern_multiple_matches(self):
        """Test that search finds multiple matches across files."""
        # Create multiple test files
        for i in range(3):
            test_file = os.path.join(self.temp_dir, f'config{i}.yml')
            with open(test_file, 'w') as f:
                f.write(f'GITHUB_TOKEN: value{i}\n')
        
        # Search for GITHUB_TOKEN
        results = self.agent._search_files_for_pattern('GITHUB_TOKEN', ['.yml'])
        
        # Should find all three files
        self.assertEqual(len(results), 3)
        
        # Verify each result has the expected pattern
        for filepath, line_num, content in results:
            self.assertTrue(filepath.startswith('config'))
            self.assertTrue(filepath.endswith('.yml'))
            self.assertIn('GITHUB_TOKEN', content)

    def test_search_files_for_pattern_skips_git_directory(self):
        """Test that search skips .git directory."""
        # Create a .git directory with a file
        git_dir = os.path.join(self.temp_dir, '.git')
        os.makedirs(git_dir)
        git_file = os.path.join(git_dir, 'config')
        with open(git_file, 'w') as f:
            f.write('STAGING_DISCORD_BOT_TOKEN=should_not_find\n')
        
        # Create a regular file
        regular_file = os.path.join(self.temp_dir, 'regular.py')
        with open(regular_file, 'w') as f:
            f.write('STAGING_DISCORD_BOT_TOKEN=should_find\n')
        
        # Search for the token
        results = self.agent._search_files_for_pattern('STAGING_DISCORD_BOT_TOKEN', ['.py'])
        
        # Should only find the regular file, not the .git file
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0][0], 'regular.py')
        self.assertNotIn('.git', results[0][0])

    def test_search_files_for_pattern_empty_result(self):
        """Test that search returns empty list when no matches found."""
        # Create a test file without the search pattern
        test_file = os.path.join(self.temp_dir, 'test.sh')
        with open(test_file, 'w') as f:
            f.write('#!/bin/bash\n')
            f.write('echo "Hello World"\n')
        
        # Search for a pattern that doesn't exist
        results = self.agent._search_files_for_pattern('NONEXISTENT_PATTERN', ['.sh'])
        
        # Should return empty list
        self.assertEqual(len(results), 0)


if __name__ == '__main__':
    unittest.main()
