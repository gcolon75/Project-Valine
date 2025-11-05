"""
Tests for PersistenceAdapter implementations.
"""
import os
import sys
import unittest
import tempfile
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))

from services.persistence_adapter import (
    MemoryPersistenceAdapter,
    SQLitePersistenceAdapter,
    create_persistence_adapter
)


class TestMemoryPersistenceAdapter(unittest.TestCase):
    """Test suite for MemoryPersistenceAdapter."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.adapter = MemoryPersistenceAdapter()
    
    def test_save_and_get_conversation(self):
        """Test saving and retrieving a conversation."""
        conversation_data = {
            'conversation_id': 'conv123',
            'user_id': 'user456',
            'task_id': 'test-task',
            'status': 'in-progress',
            'created_at': datetime.now(timezone.utc).isoformat(),
            'last_activity_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Save conversation
        result = self.adapter.save_conversation(conversation_data)
        self.assertTrue(result)
        
        # Retrieve conversation
        retrieved = self.adapter.get_conversation('conv123')
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved['conversation_id'], 'conv123')
        self.assertEqual(retrieved['user_id'], 'user456')
    
    def test_get_nonexistent_conversation(self):
        """Test retrieving a conversation that doesn't exist."""
        result = self.adapter.get_conversation('nonexistent')
        self.assertIsNone(result)
    
    def test_delete_conversation(self):
        """Test deleting a conversation."""
        conversation_data = {
            'conversation_id': 'conv123',
            'user_id': 'user456',
            'task_id': 'test-task',
            'status': 'in-progress'
        }
        
        self.adapter.save_conversation(conversation_data)
        
        # Delete
        result = self.adapter.delete_conversation('conv123')
        self.assertTrue(result)
        
        # Verify deleted
        retrieved = self.adapter.get_conversation('conv123')
        self.assertIsNone(retrieved)
    
    def test_list_conversations(self):
        """Test listing conversations."""
        # Save multiple conversations
        for i in range(5):
            self.adapter.save_conversation({
                'conversation_id': f'conv{i}',
                'user_id': 'user123',
                'task_id': 'test-task',
                'status': 'in-progress' if i % 2 == 0 else 'waiting',
                'last_activity_at': datetime.now(timezone.utc).isoformat()
            })
        
        # List all
        all_convs = self.adapter.list_conversations()
        self.assertEqual(len(all_convs), 5)
        
        # Filter by status
        in_progress = self.adapter.list_conversations(
            filters={'status': ['in-progress']}
        )
        self.assertEqual(len(in_progress), 3)
        
        # Limit results
        limited = self.adapter.list_conversations(max_results=2)
        self.assertEqual(len(limited), 2)
    
    def test_cleanup_expired(self):
        """Test cleaning up expired conversations."""
        now = datetime.now(timezone.utc)
        old_time = (now - timedelta(hours=200)).isoformat()
        recent_time = (now - timedelta(hours=1)).isoformat()
        
        # Save old conversation
        self.adapter.save_conversation({
            'conversation_id': 'old_conv',
            'user_id': 'user123',
            'task_id': 'test-task',
            'status': 'in-progress',
            'last_activity_at': old_time
        })
        
        # Save recent conversation
        self.adapter.save_conversation({
            'conversation_id': 'recent_conv',
            'user_id': 'user123',
            'task_id': 'test-task',
            'status': 'in-progress',
            'last_activity_at': recent_time
        })
        
        # Cleanup with 168 hour (7 day) TTL
        cleaned = self.adapter.cleanup_expired(ttl_hours=168)
        self.assertEqual(cleaned, 1)
        
        # Verify old is gone, recent remains
        self.assertIsNone(self.adapter.get_conversation('old_conv'))
        self.assertIsNotNone(self.adapter.get_conversation('recent_conv'))


class TestSQLitePersistenceAdapter(unittest.TestCase):
    """Test suite for SQLitePersistenceAdapter."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Use temporary file for testing
        self.temp_db = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        self.temp_db.close()
        self.adapter = SQLitePersistenceAdapter(db_path=self.temp_db.name)
    
    def tearDown(self):
        """Clean up test fixtures."""
        self.adapter.close()
        try:
            os.unlink(self.temp_db.name)
        except Exception:
            pass
    
    def test_save_and_get_conversation(self):
        """Test saving and retrieving a conversation."""
        conversation_data = {
            'conversation_id': 'conv123',
            'user_id': 'user456',
            'task_id': 'test-task',
            'status': 'in-progress',
            'created_at': datetime.now(timezone.utc).isoformat(),
            'last_activity_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Save conversation
        result = self.adapter.save_conversation(conversation_data)
        self.assertTrue(result)
        
        # Retrieve conversation
        retrieved = self.adapter.get_conversation('conv123')
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved['conversation_id'], 'conv123')
        self.assertEqual(retrieved['user_id'], 'user456')
    
    def test_update_conversation(self):
        """Test updating an existing conversation."""
        conversation_data = {
            'conversation_id': 'conv123',
            'user_id': 'user456',
            'task_id': 'test-task',
            'status': 'in-progress',
            'created_at': datetime.now(timezone.utc).isoformat(),
            'last_activity_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Save initial
        self.adapter.save_conversation(conversation_data)
        
        # Update
        conversation_data['status'] = 'completed'
        self.adapter.save_conversation(conversation_data)
        
        # Verify update
        retrieved = self.adapter.get_conversation('conv123')
        self.assertEqual(retrieved['status'], 'completed')
    
    def test_list_conversations_with_filter(self):
        """Test listing conversations with status filter."""
        # Save multiple conversations
        for i in range(5):
            self.adapter.save_conversation({
                'conversation_id': f'conv{i}',
                'user_id': 'user123',
                'task_id': 'test-task',
                'status': 'in-progress' if i % 2 == 0 else 'waiting',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'last_activity_at': datetime.now(timezone.utc).isoformat()
            })
        
        # Filter by status
        in_progress = self.adapter.list_conversations(
            filters={'status': ['in-progress']}
        )
        self.assertEqual(len(in_progress), 3)
    
    def test_cleanup_expired(self):
        """Test cleaning up expired conversations."""
        now = datetime.now(timezone.utc)
        old_time = (now - timedelta(hours=200)).isoformat()
        recent_time = (now - timedelta(hours=1)).isoformat()
        
        # Save old conversation
        self.adapter.save_conversation({
            'conversation_id': 'old_conv',
            'user_id': 'user123',
            'task_id': 'test-task',
            'status': 'in-progress',
            'created_at': old_time,
            'last_activity_at': old_time
        })
        
        # Save recent conversation
        self.adapter.save_conversation({
            'conversation_id': 'recent_conv',
            'user_id': 'user123',
            'task_id': 'test-task',
            'status': 'in-progress',
            'created_at': recent_time,
            'last_activity_at': recent_time
        })
        
        # Cleanup with 168 hour (7 day) TTL
        cleaned = self.adapter.cleanup_expired(ttl_hours=168)
        self.assertEqual(cleaned, 1)
        
        # Verify old is gone, recent remains
        self.assertIsNone(self.adapter.get_conversation('old_conv'))
        self.assertIsNotNone(self.adapter.get_conversation('recent_conv'))


class TestPersistenceAdapterFactory(unittest.TestCase):
    """Test suite for persistence adapter factory."""
    
    def test_create_memory_adapter(self):
        """Test creating memory adapter."""
        adapter = create_persistence_adapter('memory')
        self.assertIsInstance(adapter, MemoryPersistenceAdapter)
    
    def test_create_sqlite_adapter(self):
        """Test creating SQLite adapter."""
        adapter = create_persistence_adapter('sqlite')
        self.assertIsInstance(adapter, SQLitePersistenceAdapter)
        if hasattr(adapter, 'close'):
            adapter.close()
    
    def test_create_default_adapter(self):
        """Test creating adapter with no type specified."""
        # Should default to memory
        adapter = create_persistence_adapter()
        self.assertIsInstance(adapter, MemoryPersistenceAdapter)
    
    def test_create_unknown_adapter(self):
        """Test creating adapter with unknown type."""
        # Should fall back to memory with warning
        adapter = create_persistence_adapter('unknown')
        self.assertIsInstance(adapter, MemoryPersistenceAdapter)


if __name__ == '__main__':
    unittest.main()
