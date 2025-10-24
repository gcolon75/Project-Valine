"""
Tests for UptimeGuardian agent.
Tests uptime checking, formatting, and error handling.
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
from app.agents.uptime_guardian import UptimeGuardian
import requests


class TestUptimeGuardian(unittest.TestCase):
    """Test cases for UptimeGuardian agent."""

    def test_initialization_with_urls(self):
        """Test UptimeGuardian initialization with explicit URLs."""
        guardian = UptimeGuardian(
            discord_handler_url='https://example.com/discord',
            api_base_url='https://api.example.com',
            frontend_url='https://app.example.com',
            timeout=15
        )
        
        self.assertEqual(guardian.discord_handler_url, 'https://example.com/discord')
        self.assertEqual(guardian.api_base_url, 'https://api.example.com')
        self.assertEqual(guardian.frontend_url, 'https://app.example.com')
        self.assertEqual(guardian.timeout, 15)

    def test_initialization_from_environment(self):
        """Test UptimeGuardian initialization from environment variables."""
        with patch.dict('os.environ', {
            'DISCORD_HANDLER_URL': 'https://env-discord.com',
            'API_BASE_URL': 'https://env-api.com',
            'FRONTEND_URL': 'https://env-frontend.com'
        }):
            guardian = UptimeGuardian()
            
            self.assertEqual(guardian.discord_handler_url, 'https://env-discord.com')
            self.assertEqual(guardian.api_base_url, 'https://env-api.com')
            self.assertEqual(guardian.frontend_url, 'https://env-frontend.com')

    @patch('app.agents.uptime_guardian.requests.head')
    def test_ping_endpoint_success(self, mock_head):
        """Test successful endpoint ping."""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_head.return_value = mock_response
        
        guardian = UptimeGuardian()
        result = guardian._ping_endpoint('https://example.com', 'Test Service')
        
        self.assertEqual(result['name'], 'Test Service')
        self.assertEqual(result['url'], 'https://example.com')
        self.assertEqual(result['status'], 'online')
        self.assertTrue(result['online'])
        self.assertIsNotNone(result['response_time_ms'])
        self.assertIsNone(result['error'])

    @patch('app.agents.uptime_guardian.requests.head')
    def test_ping_endpoint_404(self, mock_head):
        """Test endpoint ping with 404 error."""
        # Mock 404 response
        mock_response = Mock()
        mock_response.status_code = 404
        mock_head.return_value = mock_response
        
        guardian = UptimeGuardian()
        result = guardian._ping_endpoint('https://example.com', 'Test Service')
        
        self.assertEqual(result['status'], 'error_404')
        self.assertFalse(result['online'])
        self.assertEqual(result['error'], 'HTTP 404')

    @patch('app.agents.uptime_guardian.requests.head')
    def test_ping_endpoint_timeout(self, mock_head):
        """Test endpoint ping with timeout."""
        # Mock timeout
        mock_head.side_effect = requests.exceptions.Timeout()
        
        guardian = UptimeGuardian(timeout=5)
        result = guardian._ping_endpoint('https://example.com', 'Test Service')
        
        self.assertEqual(result['status'], 'timeout')
        self.assertFalse(result['online'])
        self.assertIn('Timeout after 5s', result['error'])

    @patch('app.agents.uptime_guardian.requests.head')
    def test_ping_endpoint_connection_error(self, mock_head):
        """Test endpoint ping with connection error."""
        # Mock connection error
        mock_head.side_effect = requests.exceptions.ConnectionError('Connection refused')
        
        guardian = UptimeGuardian()
        result = guardian._ping_endpoint('https://example.com', 'Test Service')
        
        self.assertEqual(result['status'], 'connection_error')
        self.assertFalse(result['online'])
        self.assertIn('Connection failed', result['error'])

    def test_ping_endpoint_no_url(self):
        """Test ping endpoint with no URL configured."""
        guardian = UptimeGuardian()
        result = guardian._ping_endpoint(None, 'Test Service')
        
        self.assertEqual(result['status'], 'skipped')
        self.assertFalse(result['online'])
        self.assertEqual(result['error'], 'URL not configured')

    @patch('app.agents.uptime_guardian.requests.head')
    def test_check_all_services_all_online(self, mock_head):
        """Test checking all services when all are online."""
        # Mock successful responses
        mock_response = Mock()
        mock_response.status_code = 200
        mock_head.return_value = mock_response
        
        guardian = UptimeGuardian(
            discord_handler_url='https://discord.example.com',
            api_base_url='https://api.example.com',
            frontend_url='https://app.example.com'
        )
        
        result = guardian.check_all_services()
        
        self.assertTrue(result['all_online'])
        self.assertFalse(result['any_offline'])
        self.assertEqual(result['total_checks'], 3)
        self.assertEqual(result['online_count'], 3)
        self.assertEqual(result['offline_count'], 0)
        self.assertEqual(len(result['checks']), 3)

    @patch('app.agents.uptime_guardian.requests.head')
    def test_check_all_services_one_offline(self, mock_head):
        """Test checking all services when one is offline."""
        # Mock responses - first online, second timeout, third online
        responses = [
            Mock(status_code=200),
            requests.exceptions.Timeout(),
            Mock(status_code=200)
        ]
        mock_head.side_effect = responses
        
        guardian = UptimeGuardian(
            discord_handler_url='https://discord.example.com',
            api_base_url='https://api.example.com',
            frontend_url='https://app.example.com'
        )
        
        result = guardian.check_all_services()
        
        self.assertFalse(result['all_online'])
        self.assertTrue(result['any_offline'])
        self.assertEqual(result['online_count'], 2)
        self.assertEqual(result['offline_count'], 1)

    @patch('app.agents.uptime_guardian.requests.head')
    def test_check_all_services_no_urls_configured(self, mock_head):
        """Test checking services when no URLs are configured."""
        guardian = UptimeGuardian()  # No URLs provided
        
        result = guardian.check_all_services()
        
        self.assertEqual(result['total_checks'], 0)
        self.assertEqual(result['online_count'], 0)
        self.assertEqual(result['offline_count'], 0)

    @patch('app.agents.uptime_guardian.requests.head')
    def test_format_uptime_message_all_online(self, mock_head):
        """Test formatting message when all services are online."""
        # Mock successful responses
        mock_response = Mock()
        mock_response.status_code = 200
        mock_head.return_value = mock_response
        
        guardian = UptimeGuardian(
            discord_handler_url='https://discord.example.com',
            api_base_url='https://api.example.com',
            frontend_url='https://app.example.com'
        )
        
        check_result = guardian.check_all_services()
        message = guardian.format_uptime_message(check_result)
        
        self.assertIn('✅', message)
        self.assertIn('All systems operational', message)
        self.assertIn('Discord Bot', message)
        self.assertIn('API', message)
        self.assertIn('Frontend', message)
        self.assertIn('Average ping', message)

    @patch('app.agents.uptime_guardian.requests.head')
    def test_format_uptime_message_with_offline(self, mock_head):
        """Test formatting message when some services are offline."""
        # Mock responses - first online, second offline
        responses = [
            Mock(status_code=200),
            requests.exceptions.ConnectionError('Connection refused'),
            Mock(status_code=200)
        ]
        mock_head.side_effect = responses
        
        guardian = UptimeGuardian(
            discord_handler_url='https://discord.example.com',
            api_base_url='https://api.example.com',
            frontend_url='https://app.example.com'
        )
        
        check_result = guardian.check_all_services()
        message = guardian.format_uptime_message(check_result)
        
        self.assertIn('❌', message)
        self.assertIn('ALERT', message)
        self.assertIn('Services down', message)
        self.assertIn('OFFLINE', message)
        self.assertIn('1/3 services down', message)

    def test_format_uptime_message_no_services(self):
        """Test formatting message when no services are configured."""
        guardian = UptimeGuardian()  # No URLs
        
        check_result = guardian.check_all_services()
        message = guardian.format_uptime_message(check_result)
        
        self.assertIn('⚠️', message)
        self.assertIn('No services configured', message)
        self.assertIn('DISCORD_HANDLER_URL', message)
        self.assertIn('API_BASE_URL', message)
        self.assertIn('FRONTEND_URL', message)

    @patch('app.agents.uptime_guardian.requests.head')
    def test_run_uptime_check(self, mock_head):
        """Test complete uptime check run."""
        # Mock successful responses
        mock_response = Mock()
        mock_response.status_code = 200
        mock_head.return_value = mock_response
        
        guardian = UptimeGuardian(
            discord_handler_url='https://discord.example.com',
            api_base_url='https://api.example.com'
        )
        
        result = guardian.run_uptime_check()
        
        self.assertEqual(result['status'], 'success')
        self.assertTrue(result['all_online'])
        self.assertIn('message', result)
        self.assertIn('result', result)
        self.assertIsInstance(result['message'], str)
        self.assertIsInstance(result['result'], dict)

    @patch('app.agents.uptime_guardian.requests.head')
    def test_api_health_endpoint_used(self, mock_head):
        """Test that /health endpoint is appended to API base URL."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_head.return_value = mock_response
        
        guardian = UptimeGuardian(api_base_url='https://api.example.com')
        
        guardian.check_all_services()
        
        # Verify that /health was appended to API URL
        call_args = mock_head.call_args_list
        api_call = [call for call in call_args if 'api.example.com' in str(call)]
        self.assertTrue(any('api.example.com/health' in str(call) for call in call_args))


if __name__ == '__main__':
    unittest.main()
