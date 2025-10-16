"""
Tests for alerting utility.
"""
import os
import unittest
import time
from unittest.mock import patch, MagicMock
from app.utils.alerting import (
    AlertDeduplicator,
    DiscordAlerter,
    get_alerter,
    should_enable_alerts
)


class TestAlertDeduplicator(unittest.TestCase):
    """Test cases for AlertDeduplicator."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.deduplicator = AlertDeduplicator(window_seconds=2)
    
    def test_first_alert_should_send(self):
        """Test that first alert of a type should be sent."""
        result = self.deduplicator.should_send_alert('error:test')
        self.assertTrue(result)
    
    def test_duplicate_alert_suppressed(self):
        """Test that duplicate alert within window is suppressed."""
        self.deduplicator.should_send_alert('error:test')
        result = self.deduplicator.should_send_alert('error:test')
        self.assertFalse(result)
    
    def test_different_alerts_allowed(self):
        """Test that different alerts are allowed."""
        self.deduplicator.should_send_alert('error:test1')
        result = self.deduplicator.should_send_alert('error:test2')
        self.assertTrue(result)
    
    def test_alert_after_window_allowed(self):
        """Test that alert is allowed after deduplication window."""
        self.deduplicator.should_send_alert('error:test')
        time.sleep(2.1)  # Wait for window to expire
        result = self.deduplicator.should_send_alert('error:test')
        self.assertTrue(result)
    
    def test_clear(self):
        """Test clearing all alerts."""
        self.deduplicator.should_send_alert('error:test')
        self.deduplicator.clear()
        result = self.deduplicator.should_send_alert('error:test')
        self.assertTrue(result)


class TestDiscordAlerter(unittest.TestCase):
    """Test cases for DiscordAlerter."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Save original env vars
        self.original_env = {
            'DISCORD_BOT_TOKEN': os.environ.get('DISCORD_BOT_TOKEN'),
            'DISCORD_ALERT_CHANNEL_ID': os.environ.get('DISCORD_ALERT_CHANNEL_ID'),
            'ENABLE_ALERTS': os.environ.get('ENABLE_ALERTS')
        }
        
        # Set test env vars
        os.environ['DISCORD_BOT_TOKEN'] = 'test-token-123'
        os.environ['DISCORD_ALERT_CHANNEL_ID'] = '123456789'
        os.environ['ENABLE_ALERTS'] = 'true'
        
        self.alerter = DiscordAlerter()
    
    def tearDown(self):
        """Clean up."""
        # Restore original env vars
        for key, value in self.original_env.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
    
    def test_is_enabled_with_config(self):
        """Test that alerter is enabled with proper config."""
        self.assertTrue(self.alerter._is_enabled())
    
    def test_is_enabled_without_token(self):
        """Test that alerter is disabled without token."""
        os.environ.pop('DISCORD_BOT_TOKEN', None)
        alerter = DiscordAlerter()
        self.assertFalse(alerter._is_enabled())
    
    def test_is_enabled_without_channel(self):
        """Test that alerter is disabled without channel ID."""
        os.environ.pop('DISCORD_ALERT_CHANNEL_ID', None)
        alerter = DiscordAlerter()
        self.assertFalse(alerter._is_enabled())
    
    def test_is_enabled_flag_false(self):
        """Test that alerter is disabled when ENABLE_ALERTS is false."""
        os.environ['ENABLE_ALERTS'] = 'false'
        alerter = DiscordAlerter()
        self.assertFalse(alerter._is_enabled())
    
    @patch('app.utils.alerting.requests.post')
    def test_send_alert_success(self, mock_post):
        """Test sending alert successfully."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        result = self.alerter.send_alert(
            severity='error',
            title='Test Alert',
            message='Test message',
            trace_id='trace-123'
        )
        
        self.assertTrue(result['success'])
        mock_post.assert_called_once()
        
        # Check that trace_id is included in content
        call_kwargs = mock_post.call_args[1]
        content = call_kwargs['json']['content']
        self.assertIn('Test Alert', content)
        self.assertIn('Test message', content)
        self.assertIn('trace-123', content)
    
    @patch('app.utils.alerting.requests.post')
    def test_send_alert_with_all_context(self, mock_post):
        """Test sending alert with all context fields."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        result = self.alerter.send_alert(
            severity='critical',
            title='Critical Error',
            message='Something went wrong',
            trace_id='trace-123',
            user_id='user-456',
            command='/deploy',
            run_url='https://github.com/user/repo/actions/runs/789',
            error_type='ValueError'
        )
        
        self.assertTrue(result['success'])
        
        # Check content includes all context
        call_kwargs = mock_post.call_args[1]
        content = call_kwargs['json']['content']
        self.assertIn('Critical Error', content)
        self.assertIn('trace-123', content)
        self.assertIn('<@user-456>', content)
        self.assertIn('/deploy', content)
        self.assertIn('ValueError', content)
        self.assertIn('https://github.com/user/repo/actions/runs/789', content)
    
    @patch('app.utils.alerting.requests.post')
    def test_send_alert_rate_limited(self, mock_post):
        """Test handling of rate limit response."""
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.text = 'Rate limit exceeded'
        mock_post.return_value = mock_response
        
        result = self.alerter.send_alert(
            severity='error',
            title='Test Rate Limited',
            message='Test',
            deduplicate=False  # Disable deduplication for this test
        )
        
        self.assertFalse(result['success'])
        self.assertIn('Rate limited', result['message'])
    
    @patch('app.utils.alerting.requests.post')
    def test_send_alert_http_error(self, mock_post):
        """Test handling of HTTP error."""
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_post.return_value = mock_response
        
        result = self.alerter.send_alert(
            severity='error',
            title='Test HTTP Error',
            message='Test',
            deduplicate=False  # Disable deduplication for this test
        )
        
        self.assertFalse(result['success'])
        self.assertIn('Failed to send alert', result['message'])
    
    @patch('app.utils.alerting.requests.post')
    def test_send_alert_exception(self, mock_post):
        """Test handling of exception during send."""
        mock_post.side_effect = Exception('Network error')
        
        result = self.alerter.send_alert(
            severity='error',
            title='Test',
            message='Test'
        )
        
        self.assertFalse(result['success'])
        self.assertIn('Exception sending alert', result['message'])
    
    def test_send_alert_disabled(self):
        """Test that alert is not sent when disabled."""
        os.environ['ENABLE_ALERTS'] = 'false'
        alerter = DiscordAlerter()
        
        result = alerter.send_alert(
            severity='error',
            title='Test',
            message='Test'
        )
        
        self.assertFalse(result['success'])
        self.assertIn('not enabled', result['message'])
    
    @patch('app.utils.alerting.requests.post')
    def test_send_critical_failure(self, mock_post):
        """Test sending critical failure alert."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        error = ValueError('Something went wrong')
        result = self.alerter.send_critical_failure(
            title='Handler Failed',
            error=error,
            trace_id='trace-123',
            command='/deploy'
        )
        
        self.assertTrue(result['success'])
        
        # Check content includes error details
        call_kwargs = mock_post.call_args[1]
        content = call_kwargs['json']['content']
        self.assertIn('Handler Failed', content)
        self.assertIn('Something went wrong', content)
        self.assertIn('ValueError', content)
    
    @patch('app.utils.alerting.requests.post')
    def test_send_dispatch_failure(self, mock_post):
        """Test sending dispatch failure alert."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        result = self.alerter.send_dispatch_failure(
            workflow_name='Client Deploy',
            error='Rate limit exceeded',
            trace_id='trace-123',
            correlation_id='corr-456'
        )
        
        self.assertTrue(result['success'])
        
        call_kwargs = mock_post.call_args[1]
        content = call_kwargs['json']['content']
        self.assertIn('Client Deploy', content)
        self.assertIn('Rate limit exceeded', content)
        self.assertIn('corr-456', content)
    
    @patch('app.utils.alerting.requests.post')
    def test_send_verification_failure(self, mock_post):
        """Test sending verification failure alert."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        failures = [
            'Frontend not accessible',
            'API health check failed',
            'Cache headers incorrect'
        ]
        
        result = self.alerter.send_verification_failure(
            run_url='https://github.com/user/repo/actions/runs/123',
            failures=failures,
            trace_id='trace-123'
        )
        
        self.assertTrue(result['success'])
        
        call_kwargs = mock_post.call_args[1]
        content = call_kwargs['json']['content']
        self.assertIn('Frontend not accessible', content)
        self.assertIn('API health check failed', content)
    
    @patch('app.utils.alerting._deduplicator')
    @patch('app.utils.alerting.requests.post')
    def test_deduplication(self, mock_post, mock_deduplicator):
        """Test that deduplication is called."""
        mock_deduplicator.should_send_alert.return_value = False
        
        result = self.alerter.send_alert(
            severity='error',
            title='Test',
            message='Test',
            deduplicate=True
        )
        
        self.assertFalse(result['success'])
        self.assertIn('suppressed', result['message'])
        mock_post.assert_not_called()


class TestHelperFunctions(unittest.TestCase):
    """Test cases for helper functions."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.original_enable_alerts = os.environ.get('ENABLE_ALERTS')
    
    def tearDown(self):
        """Clean up."""
        if self.original_enable_alerts is None:
            os.environ.pop('ENABLE_ALERTS', None)
        else:
            os.environ['ENABLE_ALERTS'] = self.original_enable_alerts
    
    def test_should_enable_alerts_true(self):
        """Test should_enable_alerts returns True when enabled."""
        os.environ['ENABLE_ALERTS'] = 'true'
        self.assertTrue(should_enable_alerts())
    
    def test_should_enable_alerts_false(self):
        """Test should_enable_alerts returns False when disabled."""
        os.environ['ENABLE_ALERTS'] = 'false'
        self.assertFalse(should_enable_alerts())
    
    def test_should_enable_alerts_default(self):
        """Test should_enable_alerts default is False."""
        os.environ.pop('ENABLE_ALERTS', None)
        self.assertFalse(should_enable_alerts())
    
    def test_get_alerter(self):
        """Test get_alerter returns DiscordAlerter instance."""
        alerter = get_alerter()
        self.assertIsInstance(alerter, DiscordAlerter)


if __name__ == '__main__':
    unittest.main()
