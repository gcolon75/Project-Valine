"""
Structured logger utility for Project Valine orchestrator.
Produces JSON logs with fields: ts, level, service, fn, trace_id, correlation_id, user_id, cmd, msg.
"""
import json
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any


class StructuredLogger:
    """
    Structured logger that outputs JSON formatted logs.
    Includes trace_id for distributed tracing and correlation.
    """
    
    def __init__(self, service: str = "orchestrator"):
        """
        Initialize the structured logger.
        
        Args:
            service: Service name for the logs (default: "orchestrator")
        """
        self.service = service
        self._context = {}
    
    def set_context(self, **kwargs):
        """
        Set context values that will be included in all subsequent logs.
        
        Args:
            **kwargs: Context key-value pairs (e.g., trace_id, correlation_id, user_id)
        """
        self._context.update(kwargs)
    
    def clear_context(self):
        """Clear all context values."""
        self._context = {}
    
    def _log(self, level: str, msg: str, fn: Optional[str] = None, 
             cmd: Optional[str] = None, **extra):
        """
        Internal logging method that formats and outputs JSON logs.
        
        Args:
            level: Log level (info, warn, error, debug)
            msg: Log message
            fn: Function name
            cmd: Command being executed
            **extra: Additional fields to include in the log
        """
        log_entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "service": self.service,
            "msg": msg
        }
        
        # Add function name if provided
        if fn:
            log_entry["fn"] = fn
        
        # Add command if provided
        if cmd:
            log_entry["cmd"] = cmd
        
        # Add context (trace_id, correlation_id, user_id)
        log_entry.update(self._context)
        
        # Add any extra fields
        log_entry.update(extra)
        
        # Output as JSON
        print(json.dumps(log_entry))
    
    def info(self, msg: str, **kwargs):
        """Log info level message."""
        self._log("info", msg, **kwargs)
    
    def warn(self, msg: str, **kwargs):
        """Log warning level message."""
        self._log("warn", msg, **kwargs)
    
    def error(self, msg: str, **kwargs):
        """Log error level message."""
        self._log("error", msg, **kwargs)
    
    def debug(self, msg: str, **kwargs):
        """Log debug level message."""
        self._log("debug", msg, **kwargs)


def redact_secrets(data: Any, secret_keys: Optional[list] = None) -> Any:
    """
    Redact sensitive information from data structures.
    
    Args:
        data: Data to redact (dict, list, or primitive)
        secret_keys: List of keys to redact (case-insensitive)
                     Default: ["token", "secret", "password", "key", "authorization"]
    
    Returns:
        Redacted copy of the data
    """
    if secret_keys is None:
        secret_keys = ["token", "secret", "password", "key", "authorization", "api_key"]
    
    # Normalize secret keys to lowercase for comparison
    secret_keys_lower = [k.lower() for k in secret_keys]
    
    if isinstance(data, dict):
        redacted = {}
        for key, value in data.items():
            # Check if key contains any secret keyword
            key_lower = key.lower()
            is_secret = any(secret_key in key_lower for secret_key in secret_keys_lower)
            
            if is_secret:
                # Redact the value but show fingerprint (last 4 chars)
                if isinstance(value, str) and len(value) > 4:
                    redacted[key] = f"***{value[-4:]}"
                else:
                    redacted[key] = "***"
            else:
                # Recursively redact nested structures
                redacted[key] = redact_secrets(value, secret_keys)
        return redacted
    
    elif isinstance(data, list):
        return [redact_secrets(item, secret_keys) for item in data]
    
    elif isinstance(data, tuple):
        return tuple(redact_secrets(item, secret_keys) for item in data)
    
    else:
        # Primitive types (str, int, bool, None, etc.)
        return data


def get_trace_fingerprint(trace_id: str) -> str:
    """
    Get a short fingerprint of a trace_id for display.
    
    Args:
        trace_id: Full trace ID
    
    Returns:
        Short fingerprint (first 8 chars)
    """
    if not trace_id:
        return "unknown"
    return trace_id[:8] if len(trace_id) >= 8 else trace_id
