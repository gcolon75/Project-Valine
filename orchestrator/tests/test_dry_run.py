"""Tests for Dry-Run Preview Generation."""

import unittest
import json
import tempfile
import shutil
from pathlib import Path


class TestDryRunGenerator(unittest.TestCase):
    """Test cases for DryRunGenerator."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create temporary repo directory
        self.temp_repo = tempfile.mkdtemp()
        
        # Create mock component files
        self._create_mock_components()
        
        # Import after setting up temp dir
        from app.agents.ux_agent.dry_run import DryRunGenerator
        self.generator = DryRunGenerator(repo_path=self.temp_repo)
    
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_repo, ignore_errors=True)
    
    def _create_mock_components(self):
        """Create mock React component files."""
        # Create directory structure
        components_dir = Path(self.temp_repo) / 'src' / 'components'
        pages_dir = Path(self.temp_repo) / 'src' / 'pages'
        components_dir.mkdir(parents=True, exist_ok=True)
        pages_dir.mkdir(parents=True, exist_ok=True)
        
        # Mock Header.jsx
        header_content = '''import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-4">
        <Link to="/" className="text-xl font-semibold">
          Project Valine
        </Link>
      </div>
    </header>
  );
}
'''
        with open(components_dir / 'Header.jsx', 'w') as f:
            f.write(header_content)
        
        # Mock Footer.jsx
        footer_content = '''export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-8 py-4">
      <div className="container mx-auto text-center">
        &copy; {new Date().getFullYear()} Valine. All rights reserved.
      </div>
    </footer>
  );
}
'''
        with open(components_dir / 'Footer.jsx', 'w') as f:
            f.write(footer_content)
        
        # Mock NavBar.jsx
        navbar_content = '''export default function NavBar() {
  return (
    <nav className="navbar">
      <span>Joint</span>
    </nav>
  );
}
'''
        with open(components_dir / 'NavBar.jsx', 'w') as f:
            f.write(navbar_content)
        
        # Mock Home.jsx
        home_content = '''export default function Home() {
  return (
    <div className="home">
      <h1>Welcome to Valine</h1>
      <p className="mt-4 text-lg">
        Your creative hub
      </p>
      <Link to="/start" className="rounded-full bg-brand px-6 py-3">
        Get Started
      </Link>
    </div>
  );
}
'''
        with open(pages_dir / 'Home.jsx', 'w') as f:
            f.write(home_content)
    
    def _create_task(self, section: str, updates: dict) -> dict:
        """Helper to create a task dictionary."""
        return {
            'task_id': '550e8400-e29b-41d4-a716-446655440000',
            'task_type': 'ux_update',
            'requested_by': {
                'user_id': 'test_user',
                'role': 'pm'
            },
            'parameters': {
                'dry_run': True,
                'target_section': section,
                'updates': updates
            }
        }
    
    def test_generate_header_text_change(self):
        """Test generating preview for header text change."""
        task = self._create_task('header', {'text': 'New Title'})
        result = self.generator.generate_proposed_changes(task)
        
        self.assertTrue(result['success'])
        self.assertIn('proposed_changes', result)
        self.assertIn('preview_message', result)
        self.assertIn('diff', result)
        
        # Check proposed changes
        changes = result['proposed_changes']
        self.assertEqual(len(changes), 1)
        self.assertEqual(changes[0]['property'], 'text')
        self.assertEqual(changes[0]['value'], 'New Title')
        self.assertIn('Header.jsx', changes[0]['file'])
    
    def test_generate_footer_text_change(self):
        """Test generating preview for footer text change."""
        task = self._create_task('footer', {'text': 'MyApp'})
        result = self.generator.generate_proposed_changes(task)
        
        self.assertTrue(result['success'])
        changes = result['proposed_changes']
        self.assertEqual(len(changes), 1)
        self.assertEqual(changes[0]['value'], 'MyApp')
    
    def test_generate_navbar_brand_change(self):
        """Test generating preview for navbar brand change."""
        task = self._create_task('navbar', {'brand': 'MyBrand'})
        result = self.generator.generate_proposed_changes(task)
        
        self.assertTrue(result['success'])
        changes = result['proposed_changes']
        self.assertEqual(len(changes), 1)
        self.assertEqual(changes[0]['value'], 'MyBrand')
    
    def test_generate_home_hero_text_change(self):
        """Test generating preview for home hero text change."""
        task = self._create_task('home', {'hero-text': 'Level Up!'})
        result = self.generator.generate_proposed_changes(task)
        
        self.assertTrue(result['success'])
        changes = result['proposed_changes']
        self.assertEqual(len(changes), 1)
        self.assertEqual(changes[0]['value'], 'Level Up!')
    
    def test_generate_multiple_changes(self):
        """Test generating preview with multiple property updates."""
        # Use home page which has multiple distinct elements
        task = self._create_task('home', {
            'hero-text': 'New Title',
            'description': 'New description'
        })
        result = self.generator.generate_proposed_changes(task)
        
        self.assertTrue(result['success'])
        changes = result['proposed_changes']
        self.assertEqual(len(changes), 2)
    
    def test_invalid_section(self):
        """Test error handling for invalid section."""
        task = self._create_task('invalid_section', {'text': 'Test'})
        result = self.generator.generate_proposed_changes(task)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'invalid_section')
    
    def test_unsupported_task_type(self):
        """Test error handling for unsupported task type."""
        task = self._create_task('header', {'text': 'Test'})
        task['task_type'] = 'code_change'
        result = self.generator.generate_proposed_changes(task)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'unsupported_task_type')
    
    def test_plain_text_needs_clarification(self):
        """Test that plain text description requires clarification."""
        task = {
            'task_id': '550e8400-e29b-41d4-a716-446655440000',
            'task_type': 'ux_update',
            'requested_by': {'user_id': 'test', 'role': 'pm'},
            'parameters': {
                'dry_run': True,
                'plain_text': 'Make the header blue'
            }
        }
        result = self.generator.generate_proposed_changes(task)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'needs_clarification')
        self.assertTrue(result.get('clarification_needed'))
    
    def test_file_not_found(self):
        """Test error handling when component file doesn't exist."""
        # Remove header file
        header_path = Path(self.temp_repo) / 'src' / 'components' / 'Header.jsx'
        header_path.unlink()
        
        task = self._create_task('header', {'text': 'Test'})
        result = self.generator.generate_proposed_changes(task)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'file_not_found')
    
    def test_preview_message_format(self):
        """Test that preview message has correct format."""
        task = self._create_task('header', {'text': 'New Title'})
        result = self.generator.generate_proposed_changes(task)
        
        self.assertTrue(result['success'])
        message = result['preview_message']
        
        # Check message contains key elements
        self.assertIn('UX Update Preview', message)
        self.assertIn('Task ID', message)
        self.assertIn('header', message)
        self.assertIn('Proposed Changes', message)
        self.assertIn('Diff Preview', message)
        self.assertIn('Confirm', message)
    
    def test_diff_generation(self):
        """Test that unified diff is generated."""
        task = self._create_task('header', {'text': 'New Title'})
        result = self.generator.generate_proposed_changes(task)
        
        self.assertTrue(result['success'])
        diff = result['diff']
        
        # Check diff format
        self.assertIn('---', diff)
        self.assertIn('+++', diff)
        self.assertIn('@@', diff)
    
    def test_change_structure(self):
        """Test that proposed changes have correct structure."""
        task = self._create_task('header', {'text': 'New Title'})
        result = self.generator.generate_proposed_changes(task)
        
        self.assertTrue(result['success'])
        change = result['proposed_changes'][0]
        
        # Required fields
        self.assertIn('file', change)
        self.assertIn('property', change)
        self.assertIn('value', change)
        self.assertIn('diff', change)
        self.assertIn('description', change)
        self.assertIn('preview_html', change)
    
    def test_insufficient_parameters(self):
        """Test error when neither structured updates nor plain_text provided."""
        task = {
            'task_id': '550e8400-e29b-41d4-a716-446655440000',
            'task_type': 'ux_update',
            'requested_by': {'user_id': 'test', 'role': 'pm'},
            'parameters': {
                'dry_run': True
                # Missing both target_section+updates and plain_text
            }
        }
        result = self.generator.generate_proposed_changes(task)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'insufficient_parameters')
    
    def test_generic_property_handling(self):
        """Test handling of properties without defined patterns."""
        task = self._create_task('header', {'unknown_prop': 'value'})
        result = self.generator.generate_proposed_changes(task)
        
        # Should succeed with placeholder
        self.assertTrue(result['success'])
        change = result['proposed_changes'][0]
        self.assertEqual(change['property'], 'unknown_prop')
        self.assertIn('manual implementation needed', change['diff'])


class TestDryRunCLI(unittest.TestCase):
    """Test CLI functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        
        # Create example task file
        self.task_file = Path(self.temp_dir) / 'task.json'
        task = {
            'task_id': '550e8400-e29b-41d4-a716-446655440000',
            'task_type': 'ux_update',
            'requested_by': {'user_id': 'test', 'role': 'pm'},
            'parameters': {
                'dry_run': True,
                'target_section': 'header',
                'updates': {'text': 'Test'}
            }
        }
        with open(self.task_file, 'w') as f:
            json.dump(task, f)
    
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_cli_help(self):
        """Test CLI help message."""
        import subprocess
        
        result = subprocess.run(
            ['python3', '-m', 'app.agents.ux_agent.dry_run', '--help'],
            cwd='/home/runner/work/Project-Valine/Project-Valine/orchestrator',
            capture_output=True,
            text=True
        )
        
        self.assertEqual(result.returncode, 0)
        self.assertIn('--task', result.stdout)
        self.assertIn('--repo', result.stdout)


if __name__ == '__main__':
    unittest.main()
