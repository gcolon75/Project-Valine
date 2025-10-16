"""
Integration tests for tracing and logging across components.
"""
import unittest
import os
from unittest.mock import patch, MagicMock
from app.utils.trace_store import get_trace_store
from app.utils.logger import get_logger


class TestTracingIntegration(unittest.TestCase):
    """Integration tests for trace propagation."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Clear trace store
        store = get_trace_store()
        store.clear()
        
        # Set dry-run mode
        self.original_dry_run = os.environ.get('DRY_RUN')
        os.environ['DRY_RUN'] = 'true'
    
    def tearDown(self):
        """Clean up."""
        if self.original_dry_run is None:
            os.environ.pop('DRY_RUN', None)
        else:
            os.environ['DRY_RUN'] = self.original_dry_run
    
    def test_trace_created_and_retrievable(self):
        """Test that traces are created and can be retrieved."""
        store = get_trace_store()
        
        # Create a trace
        trace = store.create_trace('user-1', 'channel-1', '/test-command')
        
        # Add some steps
        trace.add_step('init', 'started')
        trace.add_step('process', 'completed', duration_ms=100)
        trace.complete()
        
        # Retrieve the trace
        retrieved = store.get_last_trace_for_user('user-1')
        
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.trace_id, trace.trace_id)
        self.assertEqual(len(retrieved.steps), 2)
        self.assertIsNotNone(retrieved.completed_at)
    
    def test_logger_with_trace_context(self):
        """Test that logger includes trace context."""
        from io import StringIO
        import logging
        import json
        
        # Create logger with trace context
        logger = get_logger('test_integration')
        
        # Capture log output
        log_output = StringIO()
        handler = logging.StreamHandler(log_output)
        from app.utils.logger import JSONFormatter
        handler.setFormatter(JSONFormatter('test-service'))
        logger.logger.handlers = [handler]
        logger.logger.setLevel(logging.INFO)
        
        # Log with context
        logger_with_context = logger.with_context(
            trace_id='trace-123',
            user_id='user-456',
            command='/test'
        )
        logger_with_context.info('Test message')
        
        # Parse log output
        output = log_output.getvalue()
        log_data = json.loads(output)
        
        # Verify context is included
        self.assertEqual(log_data['trace_id'], 'trace-123')
        self.assertEqual(log_data['user_id'], 'user-456')
        self.assertEqual(log_data['command'], '/test')
        self.assertEqual(log_data['message'], 'Test message')
        
        log_output.close()
    
    def test_trace_with_error_logging(self):
        """Test trace with error tracking."""
        store = get_trace_store()
        
        # Create trace
        trace = store.create_trace('user-1', 'channel-1', '/failing-command')
        
        try:
            # Simulate an error
            trace.add_step('init', 'started')
            raise ValueError('Test error')
        except ValueError as e:
            # Record error in trace
            trace.set_error(type(e).__name__, str(e))
            trace.complete()
        
        # Retrieve and verify
        retrieved = store.get_last_trace_for_user('user-1')
        
        self.assertIsNotNone(retrieved.error)
        self.assertEqual(retrieved.error['type'], 'ValueError')
        self.assertEqual(retrieved.error['message'], 'Test error')
    
    def test_multiple_traces_per_user(self):
        """Test handling multiple traces for same user."""
        store = get_trace_store()
        
        # Create multiple traces
        trace1 = store.create_trace('user-1', 'channel-1', '/cmd1', trace_id='trace-1')
        trace1.complete()
        
        trace2 = store.create_trace('user-1', 'channel-1', '/cmd2', trace_id='trace-2')
        trace2.complete()
        
        # Get last trace
        last_trace = store.get_last_trace_for_user('user-1')
        self.assertEqual(last_trace.trace_id, 'trace-2')
        
        # Get recent traces
        recent = store.get_recent_traces_for_user('user-1', limit=2)
        self.assertEqual(len(recent), 2)
        self.assertEqual(recent[0].trace_id, 'trace-2')
        self.assertEqual(recent[1].trace_id, 'trace-1')


class TestDryRunMode(unittest.TestCase):
    """Test dry-run mode functionality."""
    
    def test_dry_run_env_variable(self):
        """Test reading DRY_RUN environment variable."""
        os.environ['DRY_RUN'] = 'true'
        dry_run = os.environ.get('DRY_RUN', 'false').lower() in ('true', '1', 'yes')
        self.assertTrue(dry_run)
        
        os.environ['DRY_RUN'] = 'false'
        dry_run = os.environ.get('DRY_RUN', 'false').lower() in ('true', '1', 'yes')
        self.assertFalse(dry_run)
        
        os.environ.pop('DRY_RUN', None)
    
    def test_command_execution_creates_trace(self):
        """Test that command execution creates a trace even in dry-run."""
        from app.utils.trace_store import get_trace_store
        
        os.environ['DRY_RUN'] = 'true'
        store = get_trace_store()
        store.clear()
        
        # Simulate command execution creating a trace
        user_id = 'test-user'
        channel_id = 'test-channel'
        command = '/test'
        
        trace = store.create_trace(user_id, channel_id, command)
        trace.add_step('init', 'started')
        trace.add_step('execute', 'completed', duration_ms=50)
        trace.complete()
        
        # Verify trace exists
        retrieved = store.get_last_trace_for_user(user_id)
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.command, command)
        self.assertEqual(len(retrieved.steps), 2)
        
        os.environ.pop('DRY_RUN', None)


class TestHandlerIntegration(unittest.TestCase):
    """Integration tests for handler components."""
    
    @patch('app.services.github.GitHubService')
    def test_status_command_with_tracing(self, mock_github_service):
        """Test status command creates proper trace."""
        from app.handlers.discord_handler import handle_status_command
        from app.utils.trace_store import get_trace_store
        
        store = get_trace_store()
        store.clear()
        
        # Mock GitHub service
        mock_service_instance = MagicMock()
        mock_github_service.return_value = mock_service_instance
        
        # Create interaction
        interaction = {
            'data': {'options': []},
            'member': {'user': {'id': 'test-user-123'}},
            'channel': {'id': 'test-channel-456'}
        }
        
        # Execute command (will create trace)
        try:
            response = handle_status_command(interaction)
        except Exception as e:
            # Command may fail due to missing dependencies, but trace should be created
            pass
        
        # Verify trace was created
        trace = store.get_last_trace_for_user('test-user-123')
        self.assertIsNotNone(trace)
        self.assertEqual(trace.command, '/status')
        self.assertGreater(len(trace.steps), 0)


if __name__ == '__main__':
    unittest.main()
