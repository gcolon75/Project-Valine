"""
Alerts utility for sending critical failure notifications to Discord.
Includes rate-limiting to prevent duplicate alerts within a time window.
"""
import os
import time
import hashlib
from typing import Optional, Dict
from datetime import datetime, timezone
from services.discord import DiscordService
from utils.logger import StructuredLogger, redact_secrets


class AlertsManager:
    """
    Manages alerts for critical failures with rate-limiting.
    Posts to Discord with severity emoji, root cause, trace_id, and links.
    """
    
    # Alert rate-limiting window (seconds)
    RATE_LIMIT_WINDOW = 300  # 5 minutes
    
    # Severity emojis
    SEVERITY_EMOJIS = {
        "critical": "🔴",
        "error": "⚠️",
        "warning": "🟡"
    }
    
    def __init__(self, discord_service: Optional[DiscordService] = None,
                 enable_alerts: Optional[bool] = None, logger: Optional[StructuredLogger] = None):
        """
        Initialize alerts manager.
        
        Args:
            discord_service: Discord service instance for posting alerts
            enable_alerts: Whether alerts are enabled (defaults to ENABLE_ALERTS env var)
            logger: Structured logger instance
        """
        self.discord_service = discord_service
        
        # Feature flag: ENABLE_ALERTS (default: False for safety)
        if enable_alerts is None:
            enable_alerts = os.environ.get("ENABLE_ALERTS", "false").lower() == "true"
        self.enable_alerts = enable_alerts
        
        # Alert channel (optional, falls back to default channel)
        self.alert_channel_id = os.environ.get("ALERT_CHANNEL_ID")
        
        # Rate-limiting cache: {alert_hash: timestamp}
        self._alert_cache: Dict[str, float] = {}
        
        # Logger
        self.logger = logger or StructuredLogger(service="alerts")
    
    def _get_alert_hash(self, severity: str, message: str, trace_id: Optional[str]) -> str:
        """
        Generate a hash for an alert to detect duplicates.
        
        Args:
            severity: Alert severity
            message: Alert message
            trace_id: Trace ID (optional)
        
        Returns:
            SHA-256 hash of the alert
        """
        content = f"{severity}:{message}:{trace_id or 'none'}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _is_rate_limited(self, alert_hash: str) -> bool:
        """
        Check if an alert is rate-limited.
        
        Args:
            alert_hash: Hash of the alert
        
        Returns:
            True if the alert should be rate-limited
        """
        now = time.time()
        
        # Clean up old entries
        expired_keys = [k for k, v in self._alert_cache.items() 
                       if now - v > self.RATE_LIMIT_WINDOW]
        for key in expired_keys:
            del self._alert_cache[key]
        
        # Check if alert was recently sent
        if alert_hash in self._alert_cache:
            last_sent = self._alert_cache[alert_hash]
            if now - last_sent < self.RATE_LIMIT_WINDOW:
                return True
        
        # Record this alert
        self._alert_cache[alert_hash] = now
        return False
    
    def send_alert(self, severity: str, message: str, 
                   root_cause: Optional[str] = None,
                   trace_id: Optional[str] = None,
                   run_link: Optional[str] = None,
                   additional_links: Optional[Dict[str, str]] = None) -> bool:
        """
        Send an alert to Discord.
        
        Args:
            severity: Alert severity (critical, error, warning)
            message: Brief alert message
            root_cause: Root cause description
            trace_id: Trace ID for correlation
            run_link: Link to GitHub Actions run
            additional_links: Additional links to include
        
        Returns:
            True if alert was sent successfully
        """
        # Check if alerts are enabled
        if not self.enable_alerts:
            self.logger.debug("Alert skipped (ENABLE_ALERTS=false)", 
                            fn="send_alert", severity=severity)
            return False
        
        # Generate alert hash for rate-limiting
        alert_hash = self._get_alert_hash(severity, message, trace_id)
        
        # Check rate limit
        if self._is_rate_limited(alert_hash):
            self.logger.info("Alert rate-limited (duplicate within window)", 
                           fn="send_alert", alert_hash=alert_hash)
            return False
        
        # Get severity emoji
        emoji = self.SEVERITY_EMOJIS.get(severity.lower(), "📢")
        
        # Build alert content
        alert_lines = [f"{emoji} **{severity.upper()} ALERT**", "", message]
        
        if root_cause:
            alert_lines.extend(["", f"**Root Cause:** {root_cause}"])
        
        if trace_id:
            alert_lines.extend(["", f"**Trace ID:** `{trace_id}`"])
        
        # Add links
        if run_link:
            alert_lines.extend(["", f"[View Run]({run_link})"])
        
        if additional_links:
            for label, url in additional_links.items():
                alert_lines.append(f"[{label}]({url})")
        
        content = "\n".join(alert_lines)
        
        # Redact any secrets from content before logging
        safe_content = redact_secrets({"content": content})
        
        # Log the alert
        self.logger.info("Sending alert to Discord", 
                        fn="send_alert", 
                        severity=severity, 
                        trace_id=trace_id,
                        alert_hash=alert_hash)
        
        # Send to Discord
        try:
            if self.discord_service:
                # Get channel ID (check env var again for dynamic updates in tests)
                channel_id = self.alert_channel_id or os.environ.get("ALERT_CHANNEL_ID")
                if channel_id:
                    self.discord_service.send_message(channel_id, content)
                else:
                    # Fall back to default mechanism
                    self.logger.warn("ALERT_CHANNEL_ID not set, alert not sent",
                                   fn="send_alert")
                    return False
                
                self.logger.info("Alert sent successfully", 
                               fn="send_alert", 
                               alert_hash=alert_hash)
                return True
            else:
                self.logger.warn("Discord service not configured, alert not sent",
                               fn="send_alert")
                return False
        
        except Exception as e:
            self.logger.error(f"Failed to send alert: {str(e)}", 
                            fn="send_alert", 
                            error=str(e))
            return False
    
    def send_critical_alert(self, message: str, **kwargs) -> bool:
        """Send a critical alert."""
        return self.send_alert("critical", message, **kwargs)
    
    def send_error_alert(self, message: str, **kwargs) -> bool:
        """Send an error alert."""
        return self.send_alert("error", message, **kwargs)
    
    def send_warning_alert(self, message: str, **kwargs) -> bool:
        """Send a warning alert."""
        return self.send_alert("warning", message, **kwargs)
