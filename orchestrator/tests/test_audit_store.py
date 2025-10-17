"""
Tests for audit store service.
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
from app.services.audit_store import AuditStore


class TestAuditStore(unittest.TestCase):
    """Test cases for AuditStore class."""

    @patch('app.services.audit_store.boto3')
    def setUp(self, mock_boto3):
        """Set up test fixtures."""
        # Mock DynamoDB resource and table
        self.mock_dynamodb = MagicMock()
        self.mock_table = MagicMock()
        mock_boto3.resource.return_value = self.mock_dynamodb
        self.mock_dynamodb.Table.return_value = self.mock_table
        
        # Create AuditStore instance
        self.store = AuditStore(table_name='test-audit-table')

    def test_init_with_table_name(self):
        """Test initialization with explicit table name."""
        self.assertEqual(self.store.table_name, 'test-audit-table')

    @patch('app.services.audit_store.boto3')
    @patch.dict('os.environ', {'AUDIT_TABLE_NAME': 'env-audit-table'})
    def test_init_with_env_var(self, mock_boto3):
        """Test initialization with environment variable."""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_boto3.resource.return_value = mock_dynamodb
        mock_dynamodb.Table.return_value = mock_table
        
        store = AuditStore()
        self.assertEqual(store.table_name, 'env-audit-table')

    def test_create_audit_record(self):
        """Test creating an audit record."""
        # Configure mock
        self.mock_table.put_item.return_value = {}
        
        # Create audit record
        audit_id = self.store.create_audit_record(
            trace_id='trace-123',
            user_id='user-456',
            command='relay-send',
            target_channel='channel-789',
            message='Test message',
            result='posted'
        )
        
        # Verify audit_id is a UUID
        self.assertIsNotNone(audit_id)
        self.assertEqual(len(audit_id), 36)  # UUID format
        
        # Verify put_item was called
        self.mock_table.put_item.assert_called_once()
        
        # Verify the record structure
        call_args = self.mock_table.put_item.call_args
        record = call_args[1]['Item']
        
        self.assertEqual(record['audit_id'], audit_id)
        self.assertEqual(record['trace_id'], 'trace-123')
        self.assertEqual(record['user_id'], 'user-456')
        self.assertEqual(record['command'], 'relay-send')
        self.assertEqual(record['target_channel'], 'channel-789')
        self.assertEqual(record['result'], 'posted')
        self.assertTrue(record['message_fingerprint'].startswith('…'))
        self.assertIsInstance(record['timestamp'], int)

    def test_create_audit_record_with_metadata(self):
        """Test creating an audit record with metadata."""
        self.mock_table.put_item.return_value = {}
        
        metadata = {'username': 'testuser', 'message_id': 'msg-123'}
        
        audit_id = self.store.create_audit_record(
            trace_id='trace-123',
            user_id='user-456',
            command='relay-dm',
            target_channel='channel-789',
            message='Test message',
            result='posted',
            metadata=metadata
        )
        
        # Verify metadata is included
        call_args = self.mock_table.put_item.call_args
        record = call_args[1]['Item']
        
        self.assertEqual(record['metadata'], metadata)

    def test_create_audit_record_with_moderator_approval(self):
        """Test creating an audit record with moderator approval."""
        self.mock_table.put_item.return_value = {}
        
        audit_id = self.store.create_audit_record(
            trace_id='trace-123',
            user_id='user-456',
            command='relay-send',
            target_channel='channel-789',
            message='Test message',
            result='posted',
            moderator_approval='moderator-999'
        )
        
        # Verify moderator_approval is included
        call_args = self.mock_table.put_item.call_args
        record = call_args[1]['Item']
        
        self.assertEqual(record['moderator_approval'], 'moderator-999')

    def test_create_audit_record_handles_exception(self):
        """Test that create_audit_record handles exceptions gracefully."""
        # Configure mock to raise exception
        self.mock_table.put_item.side_effect = Exception('DynamoDB error')
        
        # Should still return audit_id even if persistence fails
        audit_id = self.store.create_audit_record(
            trace_id='trace-123',
            user_id='user-456',
            command='relay-send',
            target_channel='channel-789',
            message='Test message',
            result='posted'
        )
        
        self.assertIsNotNone(audit_id)
        self.assertEqual(len(audit_id), 36)

    def test_get_audit_record_success(self):
        """Test retrieving an audit record successfully."""
        # Configure mock
        mock_record = {
            'audit_id': 'audit-123',
            'trace_id': 'trace-456',
            'user_id': 'user-789',
            'command': 'relay-send',
            'result': 'posted'
        }
        self.mock_table.get_item.return_value = {'Item': mock_record}
        
        # Get audit record
        record = self.store.get_audit_record('audit-123')
        
        # Verify
        self.assertEqual(record, mock_record)
        self.mock_table.get_item.assert_called_once_with(Key={'audit_id': 'audit-123'})

    def test_get_audit_record_not_found(self):
        """Test retrieving a non-existent audit record."""
        # Configure mock to return no item
        self.mock_table.get_item.return_value = {}
        
        # Get audit record
        record = self.store.get_audit_record('audit-999')
        
        # Verify returns None
        self.assertIsNone(record)

    def test_get_audit_record_handles_exception(self):
        """Test that get_audit_record handles exceptions."""
        # Configure mock to raise exception
        self.mock_table.get_item.side_effect = Exception('DynamoDB error')
        
        # Get audit record
        record = self.store.get_audit_record('audit-123')
        
        # Verify returns None on error
        self.assertIsNone(record)

    def test_query_user_audits_success(self):
        """Test querying user audits successfully."""
        # Configure mock
        mock_items = [
            {'audit_id': 'audit-1', 'user_id': 'user-123'},
            {'audit_id': 'audit-2', 'user_id': 'user-123'}
        ]
        self.mock_table.scan.return_value = {'Items': mock_items}
        
        # Query user audits
        audits = self.store.query_user_audits('user-123')
        
        # Verify
        self.assertEqual(len(audits), 2)
        self.assertEqual(audits, mock_items)

    def test_query_user_audits_with_limit(self):
        """Test querying user audits with limit."""
        mock_items = [
            {'audit_id': 'audit-1', 'user_id': 'user-123'},
            {'audit_id': 'audit-2', 'user_id': 'user-123'},
            {'audit_id': 'audit-3', 'user_id': 'user-123'}
        ]
        self.mock_table.scan.return_value = {'Items': mock_items}
        
        # Query with limit
        audits = self.store.query_user_audits('user-123', limit=5)
        
        # Verify limit was passed
        self.mock_table.scan.assert_called_once()
        call_kwargs = self.mock_table.scan.call_args[1]
        self.assertEqual(call_kwargs['Limit'], 5)

    def test_query_user_audits_handles_exception(self):
        """Test that query_user_audits handles exceptions."""
        # Configure mock to raise exception
        self.mock_table.scan.side_effect = Exception('DynamoDB error')
        
        # Query user audits
        audits = self.store.query_user_audits('user-123')
        
        # Verify returns empty list on error
        self.assertEqual(audits, [])

    def test_get_message_fingerprint(self):
        """Test message fingerprint generation."""
        fingerprint = AuditStore._get_message_fingerprint('test message')
        
        # Verify format
        self.assertTrue(fingerprint.startswith('…'))
        self.assertEqual(len(fingerprint), 5)  # … + 4 chars

    def test_get_message_fingerprint_empty(self):
        """Test fingerprint for empty message."""
        fingerprint = AuditStore._get_message_fingerprint('')
        
        self.assertEqual(fingerprint, '…(empty)')

    def test_get_message_fingerprint_consistent(self):
        """Test fingerprint is consistent for same message."""
        fp1 = AuditStore._get_message_fingerprint('test message')
        fp2 = AuditStore._get_message_fingerprint('test message')
        
        self.assertEqual(fp1, fp2)

    def test_get_message_fingerprint_different_messages(self):
        """Test fingerprint differs for different messages."""
        fp1 = AuditStore._get_message_fingerprint('message 1')
        fp2 = AuditStore._get_message_fingerprint('message 2')
        
        self.assertNotEqual(fp1, fp2)

    def test_audit_record_result_types(self):
        """Test different result types in audit records."""
        self.mock_table.put_item.return_value = {}
        
        for result in ['posted', 'blocked', 'failed']:
            audit_id = self.store.create_audit_record(
                trace_id='trace-123',
                user_id='user-456',
                command='relay-send',
                target_channel='channel-789',
                message='Test',
                result=result
            )
            
            # Verify result is stored
            call_args = self.mock_table.put_item.call_args
            record = call_args[1]['Item']
            self.assertEqual(record['result'], result)


if __name__ == '__main__':
    unittest.main()
