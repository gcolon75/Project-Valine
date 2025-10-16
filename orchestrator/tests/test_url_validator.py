"""
Tests for URL validation utility.
"""
import unittest
import os
from app.utils.url_validator import URLValidator


class TestURLValidator(unittest.TestCase):
    """Test cases for URLValidator class."""

    def setUp(self):
        """Set up test fixtures."""
        # Clear environment variables
        os.environ.pop('ALLOWED_DOMAINS', None)
        os.environ.pop('SAFE_LOCAL', None)

    def test_valid_https_url(self):
        """Test valid https URL."""
        validator = URLValidator()
        result = validator.validate_url('https://example.com')
        
        self.assertTrue(result['valid'])
        self.assertEqual(result['url'], 'https://example.com')

    def test_http_url_rejected(self):
        """Test http URL is rejected."""
        validator = URLValidator()
        result = validator.validate_url('http://example.com')
        
        self.assertFalse(result['valid'])
        self.assertIn('https', result['message'])

    def test_localhost_rejected_by_default(self):
        """Test localhost is rejected by default."""
        validator = URLValidator()
        result = validator.validate_url('https://localhost')
        
        self.assertFalse(result['valid'])
        self.assertIn('Localhost', result['message'])

    def test_localhost_allowed_with_safe_local(self):
        """Test localhost is allowed with SAFE_LOCAL flag."""
        os.environ['SAFE_LOCAL'] = 'true'
        validator = URLValidator()
        result = validator.validate_url('https://localhost')
        
        self.assertTrue(result['valid'])

    def test_private_ip_rejected(self):
        """Test private IP addresses are rejected."""
        validator = URLValidator()
        
        # Test various private IP ranges
        private_ips = [
            'https://10.0.0.1',
            'https://172.16.0.1',
            'https://192.168.1.1'
        ]
        
        for ip in private_ips:
            result = validator.validate_url(ip)
            self.assertFalse(result['valid'], f'{ip} should be rejected')
            self.assertIn('Private IP', result['message'])

    def test_private_ip_allowed_with_safe_local(self):
        """Test private IPs are allowed with SAFE_LOCAL flag."""
        os.environ['SAFE_LOCAL'] = 'true'
        validator = URLValidator()
        result = validator.validate_url('https://10.0.0.1')
        
        self.assertTrue(result['valid'])

    def test_domain_allowlist(self):
        """Test domain allowlist enforcement."""
        os.environ['ALLOWED_DOMAINS'] = 'example.com,test.com'
        validator = URLValidator()
        
        # Allowed domain
        result = validator.validate_url('https://example.com')
        self.assertTrue(result['valid'])
        
        # Not allowed domain
        result = validator.validate_url('https://other.com')
        self.assertFalse(result['valid'])
        self.assertIn('allowlist', result['message'])

    def test_wildcard_domain_allowlist(self):
        """Test wildcard domain matching."""
        os.environ['ALLOWED_DOMAINS'] = '*.example.com'
        validator = URLValidator()
        
        # Subdomain should match
        result = validator.validate_url('https://api.example.com')
        self.assertTrue(result['valid'])
        
        # Root domain should match
        result = validator.validate_url('https://example.com')
        self.assertTrue(result['valid'])
        
        # Different domain should not match
        result = validator.validate_url('https://other.com')
        self.assertFalse(result['valid'])

    def test_empty_url(self):
        """Test empty URL is rejected."""
        validator = URLValidator()
        result = validator.validate_url('')
        
        self.assertFalse(result['valid'])
        self.assertIn('required', result['message'])

    def test_invalid_url_format(self):
        """Test invalid URL format is rejected."""
        validator = URLValidator()
        result = validator.validate_url('not a url')
        
        self.assertFalse(result['valid'])

    def test_url_without_hostname(self):
        """Test URL without hostname is rejected."""
        validator = URLValidator()
        result = validator.validate_url('https://')
        
        self.assertFalse(result['valid'])
        self.assertIn('hostname', result['message'])


if __name__ == '__main__':
    unittest.main()
