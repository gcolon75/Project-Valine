"""
Tests for StateStore service.
"""
import os
import unittest
import time
from unittest.mock import Mock, patch, MagicMock
from app.services.state_store import StateStore, get_state_store


class TestStateStore(unittest.TestCase):
    """Test cases for StateStore service."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Clear environment to force in-memory backend
        if 'REDIS_URL' in os.environ:
            del os.environ['REDIS_URL']
        if 'DATABASE_URL' in os.environ:
            del os.environ['DATABASE_URL']
    
    def test_init_memory_backend(self):
        """Test initialization with in-memory backend."""
        store = StateStore(backend='memory')
        self.assertEqual(store.backend_type, 'memory')
        self.assertIsInstance(store.backend, dict)
    
    def test_put_and_get(self):
        """Test storing and retrieving values."""
        store = StateStore(backend='memory')
        
        # Store a simple value
        result = store.put('test-key', {'data': 'value'})
        self.assertTrue(result)
        
        # Retrieve the value
        value = store.get('test-key')
        self.assertEqual(value, {'data': 'value'})
    
    def test_get_nonexistent_key(self):
        """Test retrieving non-existent key returns None."""
        store = StateStore(backend='memory')
        value = store.get('nonexistent')
        self.assertNone(value)
    
    def test_put_with_ttl(self):
        """Test storing values with TTL."""
        store = StateStore(backend='memory')
        
        # Store with 1 second TTL
        store.put('expiring-key', {'data': 'temp'}, ttl=1)
        
        # Should exist immediately
        value = store.get('expiring-key')
        self.assertEqual(value, {'data': 'temp'})
        
        # Wait for expiration
        time.sleep(1.1)
        
        # Should be None after expiration
        value = store.get('expiring-key')
        self.assertNone(value)
    
    def test_delete(self):
        """Test deleting values."""
        store = StateStore(backend='memory')
        
        # Store a value
        store.put('delete-me', {'data': 'value'})
        self.assertIsNotNone(store.get('delete-me'))
        
        # Delete it
        result = store.delete('delete-me')
        self.assertTrue(result)
        
        # Should be gone
        self.assertNone(store.get('delete-me'))
    
    def test_cleanup_expired(self):
        """Test cleaning up expired entries."""
        store = StateStore(backend='memory')
        
        # Add some values with different TTLs
        store.put('key1', {'data': '1'}, ttl=1)
        store.put('key2', {'data': '2'}, ttl=10)
        store.put('key3', {'data': '3'})  # No TTL
        
        # Wait for first to expire
        time.sleep(1.1)
        
        # Cleanup
        deleted = store.cleanup_expired()
        self.assertEqual(deleted, 1)
        
        # Verify correct keys remain
        self.assertIsNone(store.get('key1'))
        self.assertIsNotNone(store.get('key2'))
        self.assertIsNotNone(store.get('key3'))
    
    def test_complex_values(self):
        """Test storing complex nested values."""
        store = StateStore(backend='memory')
        
        complex_value = {
            'deploy_id': 'ship-staging-123',
            'env': 'staging',
            'verification_results': {
                'frontend': {'status': 'pass', 'latency_ms': 45},
                'api': {'status': 'pass', 'latency_ms': 32}
            },
            'metadata': {
                'initiated_by': 'user123',
                'initiated_at': time.time()
            }
        }
        
        store.put('complex-key', complex_value)
        retrieved = store.get('complex-key')
        
        self.assertEqual(retrieved, complex_value)
        self.assertEqual(retrieved['env'], 'staging')
        self.assertEqual(retrieved['verification_results']['frontend']['status'], 'pass')
    
    def test_get_state_store_singleton(self):
        """Test get_state_store returns singleton instance."""
        # Reset singleton for test
        import app.services.state_store as ss_module
        ss_module._state_store = None
        
        store1 = get_state_store()
        store2 = get_state_store()
        
        # Should be same instance
        self.assertIs(store1, store2)
        
        # Test it works
        store1.put('singleton-test', {'data': 'value'})
        value = store2.get('singleton-test')
        self.assertEqual(value, {'data': 'value'})
    
    def test_auto_detect_backend_memory_fallback(self):
        """Test auto-detect falls back to memory."""
        store = StateStore(backend='auto')
        self.assertEqual(store.backend_type, 'memory')


if __name__ == '__main__':
    unittest.main()
