"""
Unit tests for structured logger utility.
"""
import json
import pytest
from io import StringIO
import sys
from app.utils.logger import StructuredLogger, redact_secrets, get_trace_fingerprint


class TestStructuredLogger:
    """Tests for StructuredLogger class."""
    
    def test_logger_initialization(self):
        """Test logger initializes with correct service name."""
        logger = StructuredLogger(service="test-service")
        assert logger.service == "test-service"
    
    def test_logger_default_service(self):
        """Test logger uses default service name."""
        logger = StructuredLogger()
        assert logger.service == "orchestrator"
    
    def test_log_json_format(self, capsys):
        """Test that logs are output in JSON format."""
        logger = StructuredLogger(service="test")
        logger.info("test message")
        
        captured = capsys.readouterr()
        log_entry = json.loads(captured.out.strip())
        
        assert log_entry["level"] == "info"
        assert log_entry["msg"] == "test message"
        assert log_entry["service"] == "test"
        assert "ts" in log_entry
    
    def test_log_levels(self, capsys):
        """Test different log levels."""
        logger = StructuredLogger()
        
        logger.info("info message")
        log = json.loads(capsys.readouterr().out.strip())
        assert log["level"] == "info"
        
        logger.warn("warning message")
        log = json.loads(capsys.readouterr().out.strip())
        assert log["level"] == "warn"
        
        logger.error("error message")
        log = json.loads(capsys.readouterr().out.strip())
        assert log["level"] == "error"
        
        logger.debug("debug message")
        log = json.loads(capsys.readouterr().out.strip())
        assert log["level"] == "debug"
    
    def test_log_with_context(self, capsys):
        """Test logging with context (trace_id, user_id)."""
        logger = StructuredLogger()
        logger.set_context(trace_id="trace-123", user_id="user-456")
        logger.info("test message")
        
        captured = capsys.readouterr()
        log_entry = json.loads(captured.out.strip())
        
        assert log_entry["trace_id"] == "trace-123"
        assert log_entry["user_id"] == "user-456"
    
    def test_log_with_function_name(self, capsys):
        """Test logging with function name."""
        logger = StructuredLogger()
        logger.info("test message", fn="my_function")
        
        captured = capsys.readouterr()
        log_entry = json.loads(captured.out.strip())
        
        assert log_entry["fn"] == "my_function"
    
    def test_log_with_command(self, capsys):
        """Test logging with command."""
        logger = StructuredLogger()
        logger.info("test message", cmd="/diagnose")
        
        captured = capsys.readouterr()
        log_entry = json.loads(captured.out.strip())
        
        assert log_entry["cmd"] == "/diagnose"
    
    def test_log_with_extra_fields(self, capsys):
        """Test logging with extra fields."""
        logger = StructuredLogger()
        logger.info("test message", custom_field="custom_value", count=42)
        
        captured = capsys.readouterr()
        log_entry = json.loads(captured.out.strip())
        
        assert log_entry["custom_field"] == "custom_value"
        assert log_entry["count"] == 42
    
    def test_context_persistence(self, capsys):
        """Test that context persists across multiple log calls."""
        logger = StructuredLogger()
        logger.set_context(trace_id="trace-789")
        
        logger.info("first message")
        log1 = json.loads(capsys.readouterr().out.strip())
        
        logger.info("second message")
        log2 = json.loads(capsys.readouterr().out.strip())
        
        assert log1["trace_id"] == "trace-789"
        assert log2["trace_id"] == "trace-789"
    
    def test_clear_context(self, capsys):
        """Test clearing context."""
        logger = StructuredLogger()
        logger.set_context(trace_id="trace-999")
        logger.info("with context")
        log1 = json.loads(capsys.readouterr().out.strip())
        
        logger.clear_context()
        logger.info("without context")
        log2 = json.loads(capsys.readouterr().out.strip())
        
        assert log1["trace_id"] == "trace-999"
        assert "trace_id" not in log2
    
    def test_timestamp_format(self, capsys):
        """Test that timestamp is in ISO format."""
        logger = StructuredLogger()
        logger.info("test")
        
        captured = capsys.readouterr()
        log_entry = json.loads(captured.out.strip())
        
        # Should be ISO 8601 format
        assert "T" in log_entry["ts"]
        assert log_entry["ts"].endswith("Z") or "+" in log_entry["ts"]


class TestRedactSecrets:
    """Tests for redact_secrets function."""
    
    def test_redact_dict_with_token(self):
        """Test redacting token from dictionary."""
        data = {"token": "secret123456", "other": "value"}
        redacted = redact_secrets(data)
        
        assert redacted["token"] == "***3456"
        assert redacted["other"] == "value"
    
    def test_redact_dict_with_password(self):
        """Test redacting password from dictionary."""
        data = {"password": "mypassword123", "username": "john"}
        redacted = redact_secrets(data)
        
        assert redacted["password"] == "***d123"
        assert redacted["username"] == "john"
    
    def test_redact_dict_with_secret(self):
        """Test redacting secret from dictionary."""
        data = {"secret": "topsecret", "public": "data"}
        redacted = redact_secrets(data)
        
        assert redacted["secret"] == "***cret"
        assert redacted["public"] == "data"
    
    def test_redact_nested_dict(self):
        """Test redacting from nested dictionary."""
        data = {
            "user": {
                "name": "john",
                "api_key": "key12345678"
            }
        }
        redacted = redact_secrets(data)
        
        assert redacted["user"]["name"] == "john"
        assert redacted["user"]["api_key"] == "***5678"
    
    def test_redact_list_of_dicts(self):
        """Test redacting from list of dictionaries."""
        data = [
            {"name": "item1", "token": "token123456"},
            {"name": "item2", "password": "pass789"}
        ]
        redacted = redact_secrets(data)
        
        assert redacted[0]["name"] == "item1"
        assert redacted[0]["token"] == "***3456"
        assert redacted[1]["password"] == "***s789"
    
    def test_redact_case_insensitive(self):
        """Test that redaction is case-insensitive."""
        data = {
            "TOKEN": "token123",
            "Password": "pass456",
            "API_KEY": "key789"
        }
        redacted = redact_secrets(data)
        
        assert redacted["TOKEN"] == "***n123"
        assert redacted["Password"] == "***s456"
        assert redacted["API_KEY"] == "***y789"
    
    def test_redact_short_values(self):
        """Test redacting short values (< 4 chars)."""
        data = {"token": "abc"}
        redacted = redact_secrets(data)
        
        assert redacted["token"] == "***"
    
    def test_redact_custom_keys(self):
        """Test redacting with custom secret keys."""
        data = {"custom_secret": "value123", "token": "token456"}
        redacted = redact_secrets(data, secret_keys=["custom_secret"])
        
        assert redacted["custom_secret"] == "***e123"
        assert redacted["token"] == "token456"  # Not redacted
    
    def test_redact_primitives(self):
        """Test that primitive types are returned unchanged."""
        assert redact_secrets("string") == "string"
        assert redact_secrets(123) == 123
        assert redact_secrets(True) is True
        assert redact_secrets(None) is None
    
    def test_redact_authorization_header(self):
        """Test redacting authorization header."""
        data = {"Authorization": "Bearer token12345678"}
        redacted = redact_secrets(data)
        
        assert redacted["Authorization"] == "***5678"


class TestGetTraceFingerprint:
    """Tests for get_trace_fingerprint function."""
    
    def test_fingerprint_length(self):
        """Test that fingerprint is 8 characters."""
        trace_id = "abc123def456"
        fingerprint = get_trace_fingerprint(trace_id)
        
        assert len(fingerprint) == 8
        assert fingerprint == "abc123de"
    
    def test_fingerprint_short_id(self):
        """Test fingerprint with ID shorter than 8 chars."""
        trace_id = "abc"
        fingerprint = get_trace_fingerprint(trace_id)
        
        assert fingerprint == "abc"
    
    def test_fingerprint_empty_id(self):
        """Test fingerprint with empty ID."""
        fingerprint = get_trace_fingerprint("")
        
        assert fingerprint == "unknown"
    
    def test_fingerprint_none_id(self):
        """Test fingerprint with None ID."""
        fingerprint = get_trace_fingerprint(None)
        
        assert fingerprint == "unknown"
