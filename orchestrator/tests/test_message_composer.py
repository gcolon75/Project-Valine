"""
Unit tests for message composer module.
"""
import unittest
from app.verification.message_composer import MessageComposer


class TestMessageComposer(unittest.TestCase):
    """Test message composer functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.composer = MessageComposer()
    
    def test_compose_verification_message_success(self):
        """Test composing a successful verification message."""
        run_info = {
            'run_id': 12345,
            'conclusion': 'success',
            'html_url': 'https://github.com/owner/repo/actions/runs/12345',
            'step_durations': {
                'build': 45.2,
                's3_sync': 12.5,
                'cloudfront_invalidation': 8.3
            }
        }
        
        frontend_results = {
            'base_url': 'https://example.com',
            'all_success': True,
            'endpoints': {
                '/': {'success': True, 'status_code': 200, 'headers': {}},
                '/index.html': {'success': True, 'status_code': 200, 'headers': {'Cache-Control': 'no-cache'}}
            }
        }
        
        api_results = {
            'base_url': 'https://api.example.com',
            'all_success': True,
            'endpoints': {
                '/health': {'success': True, 'status_code': 200},
                '/hello': {'success': True, 'status_code': 200}
            }
        }
        
        message = self.composer.compose_verification_message(run_info, frontend_results, api_results)
        
        self.assertIn('✅', message['content'])
        self.assertIn('Client deploy OK', message['content'])
        self.assertIn('embed', message)
        self.assertEqual(message['embed']['color'], 0x00FF00)  # Green
    
    def test_compose_verification_message_failure(self):
        """Test composing a failed verification message."""
        run_info = {
            'run_id': 12345,
            'conclusion': 'failure',
            'html_url': 'https://github.com/owner/repo/actions/runs/12345',
            'step_durations': {}
        }
        
        frontend_results = {
            'base_url': 'https://example.com',
            'all_success': False,
            'endpoints': {}
        }
        
        api_results = {
            'base_url': 'https://api.example.com',
            'all_success': False,
            'endpoints': {}
        }
        
        message = self.composer.compose_verification_message(run_info, frontend_results, api_results)
        
        self.assertIn('❌', message['content'])
        self.assertIn('failed', message['content'].lower())
        self.assertIn('embed', message)
        self.assertEqual(message['embed']['color'], 0xFF0000)  # Red
    
    def test_compose_actions_line(self):
        """Test composing Actions checklist line."""
        run_info = {
            'conclusion': 'success',
            'step_durations': {
                'build': 45.2,
                's3_sync': 12.5,
                'cloudfront_invalidation': 8.3
            }
        }
        
        line = self.composer._compose_actions_line(run_info)
        
        self.assertIn('✅', line)
        self.assertIn('success', line)
        self.assertIn('45.2s', line)
        self.assertIn('12.5s', line)
    
    def test_compose_frontend_line(self):
        """Test composing frontend checklist line."""
        frontend_results = {
            'all_success': True,
            'endpoints': {
                '/': {'success': True, 'status_code': 200, 'headers': {}},
                '/index.html': {'success': True, 'status_code': 200, 'headers': {'Cache-Control': 'no-cache'}}
            }
        }
        
        line = self.composer._compose_frontend_line(frontend_results)
        
        self.assertIn('✅', line)
        self.assertIn('200 OK', line)
        self.assertIn('no-cache', line)
    
    def test_compose_api_line(self):
        """Test composing API checklist line."""
        api_results = {
            'all_success': True,
            'endpoints': {
                '/health': {'success': True, 'status_code': 200},
                '/hello': {'success': True, 'status_code': 200}
            }
        }
        
        line = self.composer._compose_api_line(api_results)
        
        self.assertIn('✅', line)
        self.assertIn('/health 200', line)
        self.assertIn('/hello 200', line)
    
    def test_compose_fixes_for_api_failure(self):
        """Test composing fixes for API failures."""
        run_info = {'conclusion': 'success', 'step_durations': {}}
        frontend_results = {'all_success': True, 'endpoints': {}}
        api_results = {
            'all_success': False,
            'endpoints': {
                '/health': {'success': False, 'status_code': 500}
            }
        }
        
        fixes = self.composer._compose_fixes(run_info, frontend_results, api_results)
        
        self.assertTrue(len(fixes) > 0)
        self.assertTrue(any('API' in fix or 'VITE_API_BASE' in fix for fix in fixes))


if __name__ == '__main__':
    unittest.main()
