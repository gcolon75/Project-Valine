"""
Structured JSON logger utility with trace ID support and secret redaction.

Provides centralized logging with:
- JSON output format for CloudWatch parsing
- Trace ID and correlation ID propagation
- Secret/token redaction
- Contextual fields (user, command, service)
"""
import json
import logging
import re
import sys
import traceback
from datetime import datetime, timezone
from typing import Any, Dict, Optional


class SecretRedactor:
    """Redacts sensitive information from log messages and data."""
    
    # Patterns for sensitive data
    PATTERNS = [
        # Tokens and keys
        (r'(?i)(token|key|secret|password|auth)["\s:=]+([^\s"\']+)', r'\1=***REDACTED***'),
        # Authorization headers
        (r'(?i)authorization:\s*\w+\s+([^\s]+)', r'Authorization: ***REDACTED***'),
        # URLs with credentials
        (r'https?://([^:]+):([^@]+)@', r'https://***REDACTED***@'),
        # Discord tokens (format: Bot token or Bearer token)
        (r'Bot\s+[A-Za-z0-9_-]{20,}', r'Bot ***REDACTED***'),
        (r'Bearer\s+[A-Za-z0-9_-]{20,}', r'Bearer ***REDACTED***'),
    ]
    
    @classmethod
    def redact(cls, text: str) -> str:
        """
        Redact sensitive information from text.
        
        Args:
            text: Text that may contain sensitive information
            
        Returns:
            Text with sensitive information redacted
        """
        if not isinstance(text, str):
            text = str(text)
        
        redacted = text
        for pattern, replacement in cls.PATTERNS:
            redacted = re.sub(pattern, replacement, redacted)
        
        return redacted
    
    @classmethod
    def redact_dict(cls, data: Dict[str, Any], keys_to_redact: Optional[list] = None) -> Dict[str, Any]:
        """
        Redact sensitive keys from a dictionary.
        
        Args:
            data: Dictionary that may contain sensitive information
            keys_to_redact: Additional keys to redact (default: standard sensitive keys)
            
        Returns:
            Dictionary with sensitive values redacted
        """
        if keys_to_redact is None:
            keys_to_redact = [
                'token', 'password', 'secret', 'api_key', 'auth',
                'authorization', 'discord_token', 'github_token',
                'webhook_secret', 'bot_token'
            ]
        
        redacted = {}
        for key, value in data.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in keys_to_redact):
                redacted[key] = '***REDACTED***'
            elif isinstance(value, dict):
                redacted[key] = cls.redact_dict(value, keys_to_redact)
            elif isinstance(value, str):
                redacted[key] = cls.redact(value)
            else:
                redacted[key] = value
        
        return redacted


class JSONFormatter(logging.Formatter):
    """Custom formatter that outputs structured JSON logs."""
    
    def __init__(self, service_name: str = 'orchestrator'):
        """
        Initialize JSON formatter.
        
        Args:
            service_name: Name of the service for identification
        """
        super().__init__()
        self.service_name = service_name
    
    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record as JSON.
        
        Args:
            record: Log record to format
            
        Returns:
            JSON-formatted log string
        """
        log_data = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'service': self.service_name,
            'function': record.funcName,
            'message': record.getMessage(),
        }
        
        # Add trace_id if present
        if hasattr(record, 'trace_id'):
            log_data['trace_id'] = record.trace_id
        
        # Add correlation_id if present
        if hasattr(record, 'correlation_id'):
            log_data['correlation_id'] = record.correlation_id
        
        # Add user_id if present
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        
        # Add command if present
        if hasattr(record, 'command'):
            log_data['command'] = record.command
        
        # Add custom fields if present
        if hasattr(record, 'fields'):
            log_data['fields'] = record.fields
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': traceback.format_exception(*record.exc_info)
            }
        
        # Redact sensitive information
        log_data = SecretRedactor.redact_dict(log_data)
        
        return json.dumps(log_data)


class StructuredLogger:
    """
    Structured logger with context support for trace IDs and user information.
    """
    
    def __init__(self, name: str, service_name: str = 'orchestrator'):
        """
        Initialize structured logger.
        
        Args:
            name: Logger name (usually module name)
            service_name: Service name for identification
        """
        self.logger = logging.getLogger(name)
        self.service_name = service_name
        self.context = {}
        
        # Configure logger if not already configured
        if not self.logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(JSONFormatter(service_name))
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
    
    def with_context(self, **kwargs) -> 'StructuredLogger':
        """
        Create a new logger with additional context.
        
        Args:
            **kwargs: Context fields to add (trace_id, correlation_id, user_id, command, etc.)
            
        Returns:
            New logger instance with context
        """
        new_logger = StructuredLogger(self.logger.name, self.service_name)
        new_logger.context = {**self.context, **kwargs}
        new_logger.logger = self.logger
        return new_logger
    
    def _log(self, level: int, message: str, **kwargs):
        """
        Internal logging method that adds context.
        
        Args:
            level: Log level
            message: Log message
            **kwargs: Additional fields
        """
        extra = {**self.context}
        
        # Add any additional fields
        if kwargs:
            extra['fields'] = kwargs
        
        self.logger.log(level, message, extra=extra)
    
    def info(self, message: str, **kwargs):
        """Log info level message."""
        self._log(logging.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning level message."""
        self._log(logging.WARNING, message, **kwargs)
    
    def error(self, message: str, exc_info: bool = False, **kwargs):
        """
        Log error level message.
        
        Args:
            message: Error message
            exc_info: Include exception info (traceback)
            **kwargs: Additional fields
        """
        if exc_info:
            self.logger.error(message, exc_info=True, extra={**self.context, 'fields': kwargs} if kwargs else self.context)
        else:
            self._log(logging.ERROR, message, **kwargs)
    
    def debug(self, message: str, **kwargs):
        """Log debug level message."""
        self._log(logging.DEBUG, message, **kwargs)


def get_logger(name: str, service_name: str = 'orchestrator') -> StructuredLogger:
    """
    Get a structured logger instance.
    
    Args:
        name: Logger name (usually __name__)
        service_name: Service name for identification
        
    Returns:
        StructuredLogger instance
    """
    return StructuredLogger(name, service_name)


def redact(text: str) -> str:
    """
    Convenience function to redact sensitive information from text.
    
    Args:
        text: Text that may contain sensitive information
        
    Returns:
        Text with sensitive information redacted
    """
    return SecretRedactor.redact(text)
