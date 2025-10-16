"""
Tests for structured logging utility.
"""
import json
import unittest
from io import StringIO
import logging
import sys
from app.utils.logger import (
    get_logger,
    redact,
    SecretRedactor,
    JSONFormatter,
    StructuredLogger
)


class TestSecretRedactor(unittest.TestCase):
    """Test cases for SecretRedactor."""
    
    def test_redact_token_in_text(self):
        """Test redaction of token in plain text."""
        text = 'token: ghp_1234567890abcdef'
        result = SecretRedactor.redact(text)
        self.assertNotIn('ghp_1234567890abcdef', result)
        self.assertIn('***REDACTED***', result)
    
    def test_redact_password_in_text(self):
        """Test redaction of password in text."""
        text = 'password=mySecretPassword123'
        result = SecretRedactor.redact(text)
        self.assertNotIn('mySecretPassword123', result)
        self.assertIn('***REDACTED***', result)
    
    def test_redact_authorization_header(self):
        """Test redaction of authorization header."""
        text = 'Authorization: Bearer abc123xyz'
        result = SecretRedactor.redact(text)
        self.assertNotIn('abc123xyz', result)
        self.assertIn('***REDACTED***', result)
    
    def test_redact_url_with_credentials(self):
        """Test redaction of credentials in URL."""
        text = 'https://user:pass@example.com/path'
        result = SecretRedactor.redact(text)
        self.assertNotIn('user:pass', result)
        self.assertIn('***REDACTED***@example.com', result)
    
    def test_redact_bot_token(self):
        """Test redaction of Discord bot token."""
        text = 'Bot MTk4NjIyNDgzNDcxOTI1MjQ4.Cl2FMQ.ZnCjm1XVW7vRze4b7Cq4se7kKWs'
        result = SecretRedactor.redact(text)
        self.assertNotIn('MTk4NjIyNDgzNDcxOTI1MjQ4', result)
        self.assertIn('Bot ***REDACTED***', result)
    
    def test_redact_dict_with_token(self):
        """Test redaction of token in dictionary."""
        data = {
            'token': 'secret123',
            'username': 'john',
            'password': 'pass456'
        }
        result = SecretRedactor.redact_dict(data)
        self.assertEqual(result['token'], '***REDACTED***')
        self.assertEqual(result['password'], '***REDACTED***')
        self.assertEqual(result['username'], 'john')
    
    def test_redact_nested_dict(self):
        """Test redaction in nested dictionary."""
        data = {
            'config': {
                'api_key': 'secret123',
                'endpoint': 'https://api.example.com'
            },
            'user': 'john'
        }
        result = SecretRedactor.redact_dict(data)
        self.assertEqual(result['config']['api_key'], '***REDACTED***')
        self.assertEqual(result['config']['endpoint'], 'https://api.example.com')
        self.assertEqual(result['user'], 'john')
    
    def test_redact_preserves_safe_data(self):
        """Test that redaction preserves safe data."""
        text = 'User john logged in at 2024-01-01'
        result = SecretRedactor.redact(text)
        self.assertEqual(result, text)
    
    def test_redact_function(self):
        """Test the convenience redact function."""
        text = 'secret: abc123'
        result = redact(text)
        self.assertNotIn('abc123', result)
        self.assertIn('***REDACTED***', result)


class TestJSONFormatter(unittest.TestCase):
    """Test cases for JSONFormatter."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.formatter = JSONFormatter(service_name='test-service')
    
    def test_format_basic_log(self):
        """Test formatting of basic log record."""
        record = logging.LogRecord(
            name='test',
            level=logging.INFO,
            pathname='test.py',
            lineno=1,
            msg='Test message',
            args=(),
            exc_info=None
        )
        record.funcName = 'test_function'
        
        result = self.formatter.format(record)
        log_data = json.loads(result)
        
        self.assertEqual(log_data['level'], 'INFO')
        self.assertEqual(log_data['service'], 'test-service')
        self.assertEqual(log_data['function'], 'test_function')
        self.assertEqual(log_data['message'], 'Test message')
        self.assertIn('timestamp', log_data)
    
    def test_format_log_with_trace_id(self):
        """Test formatting with trace_id."""
        record = logging.LogRecord(
            name='test',
            level=logging.INFO,
            pathname='test.py',
            lineno=1,
            msg='Test message',
            args=(),
            exc_info=None
        )
        record.funcName = 'test_function'
        record.trace_id = 'trace-123'
        
        result = self.formatter.format(record)
        log_data = json.loads(result)
        
        self.assertEqual(log_data['trace_id'], 'trace-123')
    
    def test_format_log_with_context(self):
        """Test formatting with additional context."""
        record = logging.LogRecord(
            name='test',
            level=logging.INFO,
            pathname='test.py',
            lineno=1,
            msg='Test message',
            args=(),
            exc_info=None
        )
        record.funcName = 'test_function'
        record.trace_id = 'trace-123'
        record.correlation_id = 'corr-456'
        record.user_id = 'user-789'
        record.command = '/status'
        
        result = self.formatter.format(record)
        log_data = json.loads(result)
        
        self.assertEqual(log_data['trace_id'], 'trace-123')
        self.assertEqual(log_data['correlation_id'], 'corr-456')
        self.assertEqual(log_data['user_id'], 'user-789')
        self.assertEqual(log_data['command'], '/status')
    
    def test_format_log_with_exception(self):
        """Test formatting with exception info."""
        try:
            raise ValueError('Test error')
        except ValueError:
            record = logging.LogRecord(
                name='test',
                level=logging.ERROR,
                pathname='test.py',
                lineno=1,
                msg='Error occurred',
                args=(),
                exc_info=sys.exc_info()
            )
            record.funcName = 'test_function'
            
            result = self.formatter.format(record)
            log_data = json.loads(result)
            
            self.assertIn('exception', log_data)
            self.assertEqual(log_data['exception']['type'], 'ValueError')
            self.assertIn('Test error', log_data['exception']['message'])
            self.assertIsInstance(log_data['exception']['traceback'], list)
    
    def test_format_redacts_secrets(self):
        """Test that formatter redacts secrets."""
        record = logging.LogRecord(
            name='test',
            level=logging.INFO,
            pathname='test.py',
            lineno=1,
            msg='Using token: secret123',
            args=(),
            exc_info=None
        )
        record.funcName = 'test_function'
        
        result = self.formatter.format(record)
        log_data = json.loads(result)
        
        self.assertNotIn('secret123', log_data['message'])
        self.assertIn('***REDACTED***', log_data['message'])


class TestStructuredLogger(unittest.TestCase):
    """Test cases for StructuredLogger."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Capture log output
        self.log_output = StringIO()
        self.handler = logging.StreamHandler(self.log_output)
        self.handler.setFormatter(JSONFormatter('test-service'))
        
        # Create logger
        self.logger = get_logger('test_logger', 'test-service')
        self.logger.logger.handlers = [self.handler]
        self.logger.logger.setLevel(logging.DEBUG)
    
    def tearDown(self):
        """Clean up."""
        self.log_output.close()
    
    def test_info_logging(self):
        """Test info level logging."""
        self.logger.info('Test info message')
        
        output = self.log_output.getvalue()
        log_data = json.loads(output)
        
        self.assertEqual(log_data['level'], 'INFO')
        self.assertEqual(log_data['message'], 'Test info message')
    
    def test_error_logging(self):
        """Test error level logging."""
        self.logger.error('Test error message')
        
        output = self.log_output.getvalue()
        log_data = json.loads(output)
        
        self.assertEqual(log_data['level'], 'ERROR')
        self.assertEqual(log_data['message'], 'Test error message')
    
    def test_logging_with_context(self):
        """Test logging with context."""
        logger_with_context = self.logger.with_context(
            trace_id='trace-123',
            user_id='user-456',
            command='/status'
        )
        logger_with_context.info('Test message')
        
        output = self.log_output.getvalue()
        log_data = json.loads(output)
        
        self.assertEqual(log_data['trace_id'], 'trace-123')
        self.assertEqual(log_data['user_id'], 'user-456')
        self.assertEqual(log_data['command'], '/status')
    
    def test_logging_with_fields(self):
        """Test logging with additional fields."""
        self.logger.info('Test message', duration=123, status='success')
        
        output = self.log_output.getvalue()
        log_data = json.loads(output)
        
        self.assertIn('fields', log_data)
        self.assertEqual(log_data['fields']['duration'], 123)
        self.assertEqual(log_data['fields']['status'], 'success')
    
    def test_error_with_exception(self):
        """Test error logging with exception info."""
        try:
            raise RuntimeError('Test runtime error')
        except RuntimeError:
            self.logger.error('Error occurred', exc_info=True)
        
        output = self.log_output.getvalue()
        log_data = json.loads(output)
        
        self.assertEqual(log_data['level'], 'ERROR')
        self.assertIn('exception', log_data)
        self.assertEqual(log_data['exception']['type'], 'RuntimeError')
    
    def test_context_isolation(self):
        """Test that context is isolated between loggers."""
        logger1 = self.logger.with_context(trace_id='trace-1')
        logger2 = self.logger.with_context(trace_id='trace-2')
        
        # Clear previous output
        self.log_output.truncate(0)
        self.log_output.seek(0)
        
        logger1.info('Message 1')
        output1 = self.log_output.getvalue()
        log_data1 = json.loads(output1.strip())
        
        self.log_output.truncate(0)
        self.log_output.seek(0)
        
        logger2.info('Message 2')
        output2 = self.log_output.getvalue()
        log_data2 = json.loads(output2.strip())
        
        self.assertEqual(log_data1['trace_id'], 'trace-1')
        self.assertEqual(log_data2['trace_id'], 'trace-2')


if __name__ == '__main__':
    unittest.main()
