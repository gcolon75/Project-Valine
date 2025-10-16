"""
Tests for trace store utility.
"""
import unittest
import time
from app.utils.trace_store import ExecutionTrace, TraceStore, get_trace_store


class TestExecutionTrace(unittest.TestCase):
    """Test cases for ExecutionTrace."""
    
    def test_create_trace(self):
        """Test creating a trace."""
        trace = ExecutionTrace('trace-123', 'user-456', 'channel-789', '/status')
        
        self.assertEqual(trace.trace_id, 'trace-123')
        self.assertEqual(trace.user_id, 'user-456')
        self.assertEqual(trace.channel_id, 'channel-789')
        self.assertEqual(trace.command, '/status')
        self.assertIsNotNone(trace.started_at)
        self.assertIsNone(trace.completed_at)
        self.assertEqual(len(trace.steps), 0)
        self.assertIsNone(trace.error)
    
    def test_add_step(self):
        """Test adding steps to trace."""
        trace = ExecutionTrace('trace-123', 'user-456', 'channel-789', '/status')
        
        trace.add_step('init', 'started')
        trace.add_step('fetch_data', 'completed', duration_ms=150.5, details='Fetched 10 records')
        
        self.assertEqual(len(trace.steps), 2)
        self.assertEqual(trace.steps[0]['name'], 'init')
        self.assertEqual(trace.steps[0]['status'], 'started')
        self.assertEqual(trace.steps[1]['duration_ms'], 150.5)
        self.assertEqual(trace.steps[1]['details'], 'Fetched 10 records')
    
    def test_set_error(self):
        """Test setting error on trace."""
        trace = ExecutionTrace('trace-123', 'user-456', 'channel-789', '/status')
        
        trace.set_error('ValueError', 'Invalid input', 'Traceback...')
        
        self.assertIsNotNone(trace.error)
        self.assertEqual(trace.error['type'], 'ValueError')
        self.assertEqual(trace.error['message'], 'Invalid input')
        self.assertEqual(trace.error['trace'], 'Traceback...')
    
    def test_complete(self):
        """Test completing a trace."""
        trace = ExecutionTrace('trace-123', 'user-456', 'channel-789', '/status')
        
        self.assertIsNone(trace.completed_at)
        trace.complete()
        self.assertIsNotNone(trace.completed_at)
    
    def test_add_run_url(self):
        """Test adding run URLs."""
        trace = ExecutionTrace('trace-123', 'user-456', 'channel-789', '/deploy')
        
        trace.add_run_url('https://github.com/user/repo/actions/runs/123')
        trace.add_run_url('https://github.com/user/repo/actions/runs/456')
        
        self.assertEqual(len(trace.run_urls), 2)
        self.assertIn('https://github.com/user/repo/actions/runs/123', trace.run_urls)
    
    def test_add_duplicate_run_url(self):
        """Test that duplicate URLs are not added."""
        trace = ExecutionTrace('trace-123', 'user-456', 'channel-789', '/deploy')
        
        url = 'https://github.com/user/repo/actions/runs/123'
        trace.add_run_url(url)
        trace.add_run_url(url)
        
        self.assertEqual(len(trace.run_urls), 1)
    
    def test_set_metadata(self):
        """Test setting metadata."""
        trace = ExecutionTrace('trace-123', 'user-456', 'channel-789', '/status')
        
        trace.set_metadata('workflow', 'Client Deploy')
        trace.set_metadata('run_id', 12345)
        
        self.assertEqual(trace.metadata['workflow'], 'Client Deploy')
        self.assertEqual(trace.metadata['run_id'], 12345)
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        trace = ExecutionTrace('trace-123', 'user-456', 'channel-789', '/status')
        trace.add_step('init', 'started')
        trace.add_run_url('https://github.com/user/repo/actions/runs/123')
        trace.complete()
        
        result = trace.to_dict()
        
        self.assertEqual(result['trace_id'], 'trace-123')
        self.assertEqual(result['user_id'], 'user-456')
        self.assertEqual(result['command'], '/status')
        self.assertIsNotNone(result['started_at'])
        self.assertIsNotNone(result['completed_at'])
        self.assertIsNotNone(result['duration_ms'])
        self.assertEqual(len(result['steps']), 1)
        self.assertEqual(len(result['run_urls']), 1)


class TestTraceStore(unittest.TestCase):
    """Test cases for TraceStore."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.store = TraceStore(max_traces=5)
    
    def test_create_trace(self):
        """Test creating a trace in store."""
        trace = self.store.create_trace('user-1', 'channel-1', '/status')
        
        self.assertIsNotNone(trace)
        self.assertEqual(trace.user_id, 'user-1')
        self.assertEqual(trace.channel_id, 'channel-1')
        self.assertEqual(trace.command, '/status')
    
    def test_create_trace_with_trace_id(self):
        """Test creating a trace with specific ID."""
        trace = self.store.create_trace('user-1', 'channel-1', '/status', trace_id='custom-123')
        
        self.assertEqual(trace.trace_id, 'custom-123')
    
    def test_create_trace_with_correlation_id(self):
        """Test creating a trace with correlation ID."""
        trace = self.store.create_trace('user-1', 'channel-1', '/diagnose', correlation_id='corr-456')
        
        self.assertEqual(trace.trace_id, 'corr-456')
    
    def test_get_trace(self):
        """Test retrieving a trace by ID."""
        trace = self.store.create_trace('user-1', 'channel-1', '/status', trace_id='trace-123')
        
        retrieved = self.store.get_trace('trace-123')
        
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.trace_id, 'trace-123')
        self.assertEqual(retrieved.user_id, 'user-1')
    
    def test_get_nonexistent_trace(self):
        """Test retrieving a non-existent trace."""
        result = self.store.get_trace('nonexistent')
        self.assertIsNone(result)
    
    def test_get_last_trace_for_user(self):
        """Test getting last trace for a user."""
        # Create multiple traces for same user
        trace1 = self.store.create_trace('user-1', 'channel-1', '/status', trace_id='trace-1')
        time.sleep(0.01)  # Small delay to ensure ordering
        trace2 = self.store.create_trace('user-1', 'channel-1', '/diagnose', trace_id='trace-2')
        
        last_trace = self.store.get_last_trace_for_user('user-1')
        
        self.assertIsNotNone(last_trace)
        self.assertEqual(last_trace.trace_id, 'trace-2')
    
    def test_get_last_trace_for_user_with_channel_filter(self):
        """Test getting last trace for user in specific channel."""
        trace1 = self.store.create_trace('user-1', 'channel-1', '/status', trace_id='trace-1')
        trace2 = self.store.create_trace('user-1', 'channel-2', '/diagnose', trace_id='trace-2')
        
        last_trace = self.store.get_last_trace_for_user('user-1', channel_id='channel-1')
        
        self.assertIsNotNone(last_trace)
        self.assertEqual(last_trace.trace_id, 'trace-1')
    
    def test_get_last_trace_for_nonexistent_user(self):
        """Test getting last trace for user with no traces."""
        result = self.store.get_last_trace_for_user('nonexistent-user')
        self.assertIsNone(result)
    
    def test_get_recent_traces_for_user(self):
        """Test getting recent traces for a user."""
        # Create multiple traces
        for i in range(5):
            self.store.create_trace('user-1', 'channel-1', f'/command-{i}', trace_id=f'trace-{i}')
        
        recent = self.store.get_recent_traces_for_user('user-1', limit=3)
        
        self.assertEqual(len(recent), 3)
        # Should be in reverse order (most recent first)
        self.assertEqual(recent[0].trace_id, 'trace-4')
        self.assertEqual(recent[1].trace_id, 'trace-3')
        self.assertEqual(recent[2].trace_id, 'trace-2')
    
    def test_lru_eviction(self):
        """Test that oldest traces are evicted when capacity is reached."""
        # Store has max_traces=5
        for i in range(7):
            self.store.create_trace('user-1', 'channel-1', f'/cmd-{i}', trace_id=f'trace-{i}')
        
        # First two traces should be evicted
        self.assertIsNone(self.store.get_trace('trace-0'))
        self.assertIsNone(self.store.get_trace('trace-1'))
        
        # Last 5 should still exist
        for i in range(2, 7):
            self.assertIsNotNone(self.store.get_trace(f'trace-{i}'))
    
    def test_eviction_updates_user_index(self):
        """Test that user index is updated when traces are evicted."""
        # Create traces that will cause eviction
        for i in range(7):
            self.store.create_trace('user-1', 'channel-1', f'/cmd-{i}', trace_id=f'trace-{i}')
        
        # Get recent traces - should only return ones still in store
        recent = self.store.get_recent_traces_for_user('user-1', limit=10)
        
        self.assertEqual(len(recent), 5)
        self.assertEqual(recent[0].trace_id, 'trace-6')
    
    def test_clear(self):
        """Test clearing all traces."""
        self.store.create_trace('user-1', 'channel-1', '/status', trace_id='trace-1')
        self.store.create_trace('user-2', 'channel-2', '/diagnose', trace_id='trace-2')
        
        self.store.clear()
        
        self.assertIsNone(self.store.get_trace('trace-1'))
        self.assertIsNone(self.store.get_trace('trace-2'))
        self.assertIsNone(self.store.get_last_trace_for_user('user-1'))
    
    def test_multiple_users(self):
        """Test traces for multiple users."""
        trace1 = self.store.create_trace('user-1', 'channel-1', '/status', trace_id='trace-1')
        trace2 = self.store.create_trace('user-2', 'channel-1', '/status', trace_id='trace-2')
        
        user1_trace = self.store.get_last_trace_for_user('user-1')
        user2_trace = self.store.get_last_trace_for_user('user-2')
        
        self.assertEqual(user1_trace.trace_id, 'trace-1')
        self.assertEqual(user2_trace.trace_id, 'trace-2')


class TestGetTraceStore(unittest.TestCase):
    """Test cases for get_trace_store singleton."""
    
    def test_get_trace_store_returns_instance(self):
        """Test that get_trace_store returns a TraceStore instance."""
        store = get_trace_store()
        self.assertIsInstance(store, TraceStore)
    
    def test_get_trace_store_returns_singleton(self):
        """Test that get_trace_store returns same instance."""
        store1 = get_trace_store()
        store2 = get_trace_store()
        self.assertIs(store1, store2)


if __name__ == '__main__':
    unittest.main()
