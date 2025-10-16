"""
Unit tests for HTTP checker module.
"""
import unittest
from unittest.mock import Mock, patch
from app.verification.http_checker import HTTPChecker


class TestHTTPChecker(unittest.TestCase):
    """Test HTTP checker functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.checker = HTTPChecker(timeout=5, max_retries=0)
    
    def test_check_endpoint_success(self):
        """Test successful endpoint check."""
        with patch('app.verification.http_checker.requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.headers = {'Content-Type': 'text/html'}
            mock_get.return_value = mock_response
            
            result = self.checker.check_endpoint('https://example.com', '/')
            
            self.assertTrue(result['success'])
            self.assertEqual(result['status_code'], 200)
            self.assertIsNotNone(result['response_time_ms'])
    
    def test_check_endpoint_timeout(self):
        """Test endpoint check with timeout."""
        with patch('app.verification.http_checker.requests.get') as mock_get:
            import requests
            mock_get.side_effect = requests.exceptions.Timeout()
            
            result = self.checker.check_endpoint('https://example.com', '/')
            
            self.assertFalse(result['success'])
            self.assertIsNone(result['status_code'])
            self.assertIn('Timeout', result['error'])
    
    def test_check_endpoint_404(self):
        """Test endpoint check with 404."""
        with patch('app.verification.http_checker.requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 404
            mock_response.headers = {}
            mock_get.return_value = mock_response
            
            result = self.checker.check_endpoint('https://example.com', '/notfound')
            
            self.assertFalse(result['success'])
            self.assertEqual(result['status_code'], 404)
    
    def test_check_frontend(self):
        """Test frontend check."""
        with patch('app.verification.http_checker.requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.headers = {'Cache-Control': 'no-cache'}
            mock_get.return_value = mock_response
            
            result = self.checker.check_frontend('https://example.com')
            
            self.assertTrue(result['all_success'])
            self.assertIn('/', result['endpoints'])
            self.assertIn('/index.html', result['endpoints'])
    
    def test_validate_cache_control(self):
        """Test cache control validation."""
        # Valid cache control
        is_valid, value = self.checker.validate_cache_control({'Cache-Control': 'no-cache'})
        self.assertTrue(is_valid)
        self.assertEqual(value, 'no-cache')
        
        # Invalid cache control
        is_valid, value = self.checker.validate_cache_control({'Cache-Control': 'public, max-age=300'})
        self.assertFalse(is_valid)
        
        # Missing cache control
        is_valid, value = self.checker.validate_cache_control({})
        self.assertFalse(is_valid)
        self.assertIsNone(value)
    
    def test_format_status_code(self):
        """Test status code formatting."""
        self.assertIn('✅', self.checker.format_status_code(200))
        self.assertIn('❌', self.checker.format_status_code(404))
        self.assertIn('❌', self.checker.format_status_code(500))
        self.assertIn('❌', self.checker.format_status_code(None))


if __name__ == '__main__':
    unittest.main()
