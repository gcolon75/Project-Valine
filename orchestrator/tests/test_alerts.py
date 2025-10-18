"""
Unit tests for alerts utility.
"""
import pytest
import time
from unittest.mock import Mock, patch
from app.utils.alerts import AlertsManager
from app.utils.logger import StructuredLogger


class TestAlertsManager:
    """Tests for AlertsManager class."""
    
    def test_initialization_default(self):
        """Test default initialization."""
        manager = AlertsManager()
        
        assert manager.enable_alerts is False  # Default safe
        assert manager.discord_service is None
    
    def test_initialization_with_service(self):
        """Test initialization with Discord service."""
        mock_service = Mock()
        manager = AlertsManager(discord_service=mock_service)
        
        assert manager.discord_service == mock_service
    
    def test_initialization_enable_alerts(self):
        """Test initialization with alerts enabled."""
        manager = AlertsManager(enable_alerts=True)
        
        assert manager.enable_alerts is True
    
    @patch.dict('os.environ', {'ENABLE_ALERTS': 'true'})
    def test_enable_alerts_from_env(self):
        """Test reading ENABLE_ALERTS from environment."""
        manager = AlertsManager()
        
        assert manager.enable_alerts is True
    
    @patch.dict('os.environ', {'ENABLE_ALERTS': 'false'})
    def test_disable_alerts_from_env(self):
        """Test ENABLE_ALERTS=false from environment."""
        manager = AlertsManager()
        
        assert manager.enable_alerts is False
    
    def test_send_alert_disabled(self, capsys):
        """Test that alert is not sent when disabled."""
        manager = AlertsManager(enable_alerts=False)
        
        result = manager.send_alert("critical", "Test alert")
        
        assert result is False
    
    def test_send_alert_no_discord_service(self):
        """Test sending alert without Discord service."""
        manager = AlertsManager(enable_alerts=True, discord_service=None)
        
        result = manager.send_alert("critical", "Test alert")
        
        assert result is False
    
    @patch.dict('os.environ', {'ALERT_CHANNEL_ID': '12345'})
    def test_send_alert_success(self):
        """Test successful alert sending."""
        mock_service = Mock()
        manager = AlertsManager(enable_alerts=True, discord_service=mock_service)
        
        result = manager.send_alert(
            "critical",
            "Test alert",
            root_cause="Test cause",
            trace_id="trace-123"
        )
        
        assert result is True
        mock_service.send_message.assert_called_once()
        
        # Check that the content includes expected elements
        call_args = mock_service.send_message.call_args
        content = call_args[0][1]
        assert "🔴" in content  # Critical emoji
        assert "CRITICAL ALERT" in content
        assert "Test alert" in content
        assert "Test cause" in content
        assert "trace-123" in content
    
    def test_send_alert_with_links(self):
        """Test sending alert with links."""
        mock_service = Mock()
        manager = AlertsManager(enable_alerts=True, discord_service=mock_service)
        
        with patch.dict('os.environ', {'ALERT_CHANNEL_ID': '12345'}):
            result = manager.send_alert(
                "error",
                "Test alert",
                run_link="https://github.com/run/123",
                additional_links={"Logs": "https://logs.example.com"}
            )
        
        assert result is True
        call_args = mock_service.send_message.call_args
        content = call_args[0][1]
        assert "https://github.com/run/123" in content
        assert "https://logs.example.com" in content
    
    def test_severity_emojis(self):
        """Test different severity emojis."""
        mock_service = Mock()
        manager = AlertsManager(enable_alerts=True, discord_service=mock_service)
        
        with patch.dict('os.environ', {'ALERT_CHANNEL_ID': '12345'}):
            # Critical
            manager.send_alert("critical", "Critical alert")
            content = mock_service.send_message.call_args[0][1]
            assert "🔴" in content
            
            # Error
            manager.send_alert("error", "Error alert")
            content = mock_service.send_message.call_args[0][1]
            assert "⚠️" in content
            
            # Warning
            manager.send_alert("warning", "Warning alert")
            content = mock_service.send_message.call_args[0][1]
            assert "🟡" in content
    
    def test_rate_limiting(self):
        """Test that duplicate alerts are rate-limited."""
        mock_service = Mock()
        manager = AlertsManager(enable_alerts=True, discord_service=mock_service)
        
        with patch.dict('os.environ', {'ALERT_CHANNEL_ID': '12345'}):
            # Send first alert
            result1 = manager.send_alert("critical", "Duplicate alert", trace_id="trace-1")
            assert result1 is True
            
            # Send identical alert immediately
            result2 = manager.send_alert("critical", "Duplicate alert", trace_id="trace-1")
            assert result2 is False
            
            # Only called once
            assert mock_service.send_message.call_count == 1
    
    def test_rate_limiting_different_alerts(self):
        """Test that different alerts are not rate-limited."""
        mock_service = Mock()
        manager = AlertsManager(enable_alerts=True, discord_service=mock_service)
        
        with patch.dict('os.environ', {'ALERT_CHANNEL_ID': '12345'}):
            # Send first alert
            result1 = manager.send_alert("critical", "Alert 1")
            assert result1 is True
            
            # Send different alert
            result2 = manager.send_alert("critical", "Alert 2")
            assert result2 is True
            
            # Called twice
            assert mock_service.send_message.call_count == 2
    
    def test_rate_limiting_window_expiry(self):
        """Test that rate limit expires after window."""
        mock_service = Mock()
        manager = AlertsManager(enable_alerts=True, discord_service=mock_service)
        
        # Temporarily set shorter window for testing
        original_window = AlertsManager.RATE_LIMIT_WINDOW
        AlertsManager.RATE_LIMIT_WINDOW = 0.1  # 100ms
        
        try:
            with patch.dict('os.environ', {'ALERT_CHANNEL_ID': '12345'}):
                # Send first alert
                result1 = manager.send_alert("critical", "Timed alert")
                assert result1 is True
                
                # Wait for window to expire
                time.sleep(0.15)
                
                # Send same alert after window
                result2 = manager.send_alert("critical", "Timed alert")
                assert result2 is True
                
                # Called twice
                assert mock_service.send_message.call_count == 2
        finally:
            AlertsManager.RATE_LIMIT_WINDOW = original_window
    
    def test_send_critical_alert(self):
        """Test send_critical_alert shortcut."""
        mock_service = Mock()
        manager = AlertsManager(enable_alerts=True, discord_service=mock_service)
        
        with patch.dict('os.environ', {'ALERT_CHANNEL_ID': '12345'}):
            result = manager.send_critical_alert("Critical message")
        
        assert result is True
        content = mock_service.send_message.call_args[0][1]
        assert "CRITICAL" in content
    
    def test_send_error_alert(self):
        """Test send_error_alert shortcut."""
        mock_service = Mock()
        manager = AlertsManager(enable_alerts=True, discord_service=mock_service)
        
        with patch.dict('os.environ', {'ALERT_CHANNEL_ID': '12345'}):
            result = manager.send_error_alert("Error message")
        
        assert result is True
        content = mock_service.send_message.call_args[0][1]
        assert "ERROR" in content
    
    def test_send_warning_alert(self):
        """Test send_warning_alert shortcut."""
        mock_service = Mock()
        manager = AlertsManager(enable_alerts=True, discord_service=mock_service)
        
        with patch.dict('os.environ', {'ALERT_CHANNEL_ID': '12345'}):
            result = manager.send_warning_alert("Warning message")
        
        assert result is True
        content = mock_service.send_message.call_args[0][1]
        assert "WARNING" in content
    
    def test_alert_exception_handling(self):
        """Test that exceptions in alert sending are handled."""
        mock_service = Mock()
        mock_service.send_message.side_effect = Exception("Network error")
        manager = AlertsManager(enable_alerts=True, discord_service=mock_service)
        
        with patch.dict('os.environ', {'ALERT_CHANNEL_ID': '12345'}):
            result = manager.send_alert("critical", "Test alert")
        
        assert result is False
    
    def test_no_channel_id_configured(self):
        """Test alert fails gracefully when no channel ID is set."""
        mock_service = Mock()
        manager = AlertsManager(enable_alerts=True, discord_service=mock_service)
        
        with patch.dict('os.environ', {}, clear=True):
            result = manager.send_alert("critical", "Test alert")
        
        assert result is False
        mock_service.send_message.assert_not_called()
