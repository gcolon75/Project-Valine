"""
Discord alerting utility for critical failures.

Provides structured alerts to Discord channels with:
- Severity-based emoji indicators
- Trace ID for correlation
- Links to relevant resources
- Rate limiting to prevent alert spam
"""
import os
import time
import json
import requests
from typing import Dict, Optional
from collections import OrderedDict
from threading import Lock
from app.utils.logger import SecretRedactor


class AlertDeduplicator:
    """
    Deduplicates alerts within a time window to prevent spam.
    """
    
    def __init__(self, window_seconds: int = 300):
        """
        Initialize alert deduplicator.
        
        Args:
            window_seconds: Time window for deduplication (default: 5 minutes)
        """
        self.window_seconds = window_seconds
        self.recent_alerts: OrderedDict[str, float] = OrderedDict()
        self.lock = Lock()
    
    def should_send_alert(self, alert_signature: str) -> bool:
        """
        Check if an alert should be sent based on deduplication rules.
        
        Args:
            alert_signature: Unique signature for this alert type
            
        Returns:
            True if alert should be sent, False if it's a duplicate
        """
        current_time = time.time()
        
        with self.lock:
            # Clean up old entries
            cutoff_time = current_time - self.window_seconds
            keys_to_remove = []
            for sig, timestamp in self.recent_alerts.items():
                if timestamp < cutoff_time:
                    keys_to_remove.append(sig)
                else:
                    break  # OrderedDict is sorted by insertion order
            
            for key in keys_to_remove:
                del self.recent_alerts[key]
            
            # Check if this alert was recently sent
            if alert_signature in self.recent_alerts:
                return False
            
            # Record this alert
            self.recent_alerts[alert_signature] = current_time
            return True
    
    def clear(self):
        """Clear all recorded alerts."""
        with self.lock:
            self.recent_alerts.clear()


# Global deduplicator instance
_deduplicator = AlertDeduplicator()


class DiscordAlerter:
    """
    Sends critical failure alerts to Discord channels.
    """
    
    SEVERITY_EMOJIS = {
        'critical': '🚨',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️'
    }
    
    def __init__(self, bot_token: Optional[str] = None, channel_id: Optional[str] = None):
        """
        Initialize Discord alerter.
        
        Args:
            bot_token: Discord bot token (reads from env if not provided)
            channel_id: Discord channel ID for alerts (reads from env if not provided)
        """
        self.bot_token = bot_token or os.environ.get('DISCORD_BOT_TOKEN')
        self.channel_id = channel_id or os.environ.get('DISCORD_ALERT_CHANNEL_ID') or os.environ.get('DISCORD_TARGET_CHANNEL_ID')
        self.base_url = 'https://discord.com/api/v10'
    
    def send_alert(self,
                   severity: str,
                   title: str,
                   message: str,
                   trace_id: Optional[str] = None,
                   user_id: Optional[str] = None,
                   command: Optional[str] = None,
                   run_url: Optional[str] = None,
                   error_type: Optional[str] = None,
                   deduplicate: bool = True) -> Dict[str, any]:
        """
        Send an alert to Discord.
        
        Args:
            severity: Alert severity (critical, error, warning, info)
            title: Alert title
            message: Alert message
            trace_id: Trace ID for correlation
            user_id: Discord user ID (if applicable)
            command: Command that failed (if applicable)
            run_url: GitHub Actions run URL (if applicable)
            error_type: Type of error
            deduplicate: Whether to deduplicate this alert
            
        Returns:
            Dict with 'success' and 'message' keys
        """
        # Check if alerting is enabled
        if not self._is_enabled():
            return {
                'success': False,
                'message': 'Alerting is not enabled (missing bot token or channel ID)'
            }
        
        # Create alert signature for deduplication
        if deduplicate:
            signature = f"{severity}:{title}:{error_type or 'none'}"
            if not _deduplicator.should_send_alert(signature):
                return {
                    'success': False,
                    'message': 'Alert suppressed due to deduplication'
                }
        
        # Build alert content
        emoji = self.SEVERITY_EMOJIS.get(severity, '📢')
        content = f"{emoji} **{title}**\n\n{message}"
        
        # Add context
        if trace_id:
            content += f"\n\n**Trace ID:** `{trace_id[:16]}...`"
        
        if command:
            content += f"\n**Command:** `{command}`"
        
        if user_id:
            content += f"\n**User:** <@{user_id}>"
        
        if error_type:
            content += f"\n**Error Type:** `{error_type}`"
        
        if run_url:
            content += f"\n\n🔗 [View Run]({run_url})"
        
        # Add links to documentation
        runbook_url = os.environ.get('RUNBOOK_URL')
        if runbook_url:
            content += f"\n📖 [Runbook]({runbook_url})"
        
        # Redact any sensitive information
        content = SecretRedactor.redact(content)
        
        # Send to Discord
        try:
            url = f"{self.base_url}/channels/{self.channel_id}/messages"
            headers = {
                'Authorization': f'Bot {self.bot_token}',
                'Content-Type': 'application/json'
            }
            payload = {'content': content}
            
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'message': 'Alert sent successfully'
                }
            elif response.status_code == 429:
                # Rate limited
                return {
                    'success': False,
                    'message': f'Rate limited by Discord: {response.text}'
                }
            else:
                return {
                    'success': False,
                    'message': f'Failed to send alert: HTTP {response.status_code}'
                }
        
        except Exception as e:
            return {
                'success': False,
                'message': f'Exception sending alert: {str(e)}'
            }
    
    def send_critical_failure(self,
                              title: str,
                              error: Exception,
                              trace_id: Optional[str] = None,
                              user_id: Optional[str] = None,
                              command: Optional[str] = None,
                              run_url: Optional[str] = None) -> Dict[str, any]:
        """
        Send a critical failure alert.
        
        Args:
            title: Alert title
            error: Exception that occurred
            trace_id: Trace ID
            user_id: Discord user ID
            command: Command that failed
            run_url: GitHub Actions run URL
            
        Returns:
            Dict with 'success' and 'message' keys
        """
        error_message = str(error)
        # Truncate long error messages
        if len(error_message) > 500:
            error_message = error_message[:500] + '...'
        
        return self.send_alert(
            severity='critical',
            title=title,
            message=f"```\n{error_message}\n```",
            trace_id=trace_id,
            user_id=user_id,
            command=command,
            run_url=run_url,
            error_type=type(error).__name__
        )
    
    def send_dispatch_failure(self,
                              workflow_name: str,
                              error: str,
                              trace_id: Optional[str] = None,
                              correlation_id: Optional[str] = None) -> Dict[str, any]:
        """
        Send a workflow dispatch failure alert.
        
        Args:
            workflow_name: Name of workflow that failed to dispatch
            error: Error message
            trace_id: Trace ID
            correlation_id: Correlation ID
            
        Returns:
            Dict with 'success' and 'message' keys
        """
        message = f"Failed to dispatch **{workflow_name}** workflow.\n\n"
        message += f"Error: {error}"
        
        if correlation_id:
            message += f"\n\n**Correlation ID:** `{correlation_id}`"
        
        return self.send_alert(
            severity='error',
            title='Workflow Dispatch Failure',
            message=message,
            trace_id=trace_id
        )
    
    def send_verification_failure(self,
                                   run_url: str,
                                   failures: list,
                                   trace_id: Optional[str] = None) -> Dict[str, any]:
        """
        Send a verification failure alert.
        
        Args:
            run_url: GitHub Actions run URL
            failures: List of failure messages
            trace_id: Trace ID
            
        Returns:
            Dict with 'success' and 'message' keys
        """
        message = "Deploy verification failed:\n\n"
        for i, failure in enumerate(failures[:5], 1):  # Show max 5 failures
            message += f"{i}. {failure}\n"
        
        if len(failures) > 5:
            message += f"\n...and {len(failures) - 5} more failures"
        
        return self.send_alert(
            severity='error',
            title='Deploy Verification Failed',
            message=message,
            trace_id=trace_id,
            run_url=run_url,
            deduplicate=True
        )
    
    def _is_enabled(self) -> bool:
        """
        Check if alerting is enabled.
        
        Returns:
            True if enabled, False otherwise
        """
        # Check environment variable
        enable_alerts = os.environ.get('ENABLE_ALERTS', 'false').lower()
        if enable_alerts not in ('true', '1', 'yes'):
            return False
        
        # Check required configuration
        return bool(self.bot_token and self.channel_id)


def get_alerter() -> DiscordAlerter:
    """
    Get a Discord alerter instance.
    
    Returns:
        DiscordAlerter instance
    """
    return DiscordAlerter()


def should_enable_alerts() -> bool:
    """
    Check if alerts should be enabled.
    
    Returns:
        True if enabled, False otherwise
    """
    enable_alerts = os.environ.get('ENABLE_ALERTS', 'false').lower()
    return enable_alerts in ('true', '1', 'yes')
