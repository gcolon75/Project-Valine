#!/usr/bin/env python3
"""
Unit tests for _search_files_for_pattern() helper in operational_readiness_agent.py
"""
import os
import sys
import tempfile
import shutil
import unittest
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from operational_readiness_agent import (
    OperationalReadinessAgent,
    OperationalReadinessConfig
)


class TestSearchFilesForPattern(unittest.TestCase):
    """Test _search_files_for_pattern helper function"""
    
    def setUp(self):
        """Set up test environment with temp directory"""
        # Create temp directory inside the repo
        self.test_dir = tempfile.mkdtemp(prefix='test_readiness_', dir=os.getcwd())
        
        # Create a config and agent instance
        config = OperationalReadinessConfig()
        config.repo = "gcolon75/Project-Valine"
        self.agent = OperationalReadinessAgent(config)
        
        # Override repo_path to use test directory
        self.original_repo_path = self.agent.repo_path
        self.agent.repo_path = self.test_dir
    
    def tearDown(self):
        """Clean up temp directory"""
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
        
        # Restore original repo_path
        self.agent.repo_path = self.original_repo_path
    
    def test_search_finds_placeholder_env_var(self):
        """Test that _search_files_for_pattern finds a placeholder env var in a temp file"""
        # Create a temp file with a placeholder env var
        test_file = os.path.join(self.test_dir, 'test_config.py')
        with open(test_file, 'w') as f:
            f.write("# Test configuration\n")
            f.write("STAGING_DISCORD_BOT_TOKEN=placeholder\n")
            f.write("# End of config\n")
        
        # Search for the pattern
        results = self.agent._search_files_for_pattern(['STAGING_DISCORD_BOT_TOKEN'])
        
        # Assert that we found at least one match
        self.assertGreater(len(results), 0, "Should find at least one match")
        
        # Check that the match contains the expected pattern
        found = False
        for match in results:
            if match['pattern'] == 'STAGING_DISCORD_BOT_TOKEN':
                # Verify the file is correct (relative path)
                self.assertIn('test_config.py', match['file'])
                # Verify the content contains our placeholder
                self.assertIn('STAGING_DISCORD_BOT_TOKEN', match['content'])
                found = True
                break
        
        self.assertTrue(found, "Should find STAGING_DISCORD_BOT_TOKEN in results")
    
    def test_search_respects_max_matches(self):
        """Test that _search_files_for_pattern respects max_matches parameter"""
        # Create a temp file with multiple occurrences
        test_file = os.path.join(self.test_dir, 'multi_match.py')
        with open(test_file, 'w') as f:
            for i in range(30):
                f.write(f"GITHUB_TOKEN_{i} = 'token'\n")
        
        # Search with a low max_matches
        results = self.agent._search_files_for_pattern(['GITHUB_TOKEN'], max_matches=5)
        
        # Count how many matches for this pattern
        pattern_matches = [r for r in results if r['pattern'] == 'GITHUB_TOKEN']
        self.assertLessEqual(len(pattern_matches), 5, "Should respect max_matches limit")
    
    def test_search_skips_non_text_extensions(self):
        """Test that _search_files_for_pattern only searches text files"""
        # Create files with various extensions
        test_py = os.path.join(self.test_dir, 'test.py')
        test_txt = os.path.join(self.test_dir, 'test.txt')
        test_yml = os.path.join(self.test_dir, 'test.yml')
        
        with open(test_py, 'w') as f:
            f.write("SECRET_KEY = 'value'\n")
        
        with open(test_txt, 'w') as f:
            f.write("SECRET_KEY = 'value'\n")
        
        with open(test_yml, 'w') as f:
            f.write("SECRET_KEY: value\n")
        
        # Search for pattern
        results = self.agent._search_files_for_pattern(['SECRET_KEY'])
        
        # Should find in .py and .yml but not .txt
        found_files = [r['file'] for r in results]
        
        # Check we found it in expected files
        py_found = any('test.py' in f for f in found_files)
        yml_found = any('test.yml' in f for f in found_files)
        txt_found = any('test.txt' in f for f in found_files)
        
        self.assertTrue(py_found, "Should find pattern in .py files")
        self.assertTrue(yml_found, "Should find pattern in .yml files")
        self.assertFalse(txt_found, "Should not find pattern in .txt files")
    
    def test_search_skips_hidden_directories(self):
        """Test that _search_files_for_pattern skips hidden directories"""
        # Create a hidden directory
        hidden_dir = os.path.join(self.test_dir, '.hidden')
        os.makedirs(hidden_dir)
        
        test_file = os.path.join(hidden_dir, 'test.py')
        with open(test_file, 'w') as f:
            f.write("HIDDEN_SECRET = 'value'\n")
        
        # Search for pattern
        results = self.agent._search_files_for_pattern(['HIDDEN_SECRET'])
        
        # Should not find anything in hidden directory
        self.assertEqual(len(results), 0, "Should skip hidden directories")


if __name__ == '__main__':
    unittest.main()
