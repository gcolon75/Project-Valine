"""
Audit store service for Discord relay operations.
Persists audit records to DynamoDB for non-repudiation and investigation.
"""
import os
import time
import uuid
import hashlib
import boto3
from typing import Optional, Dict, Any


class AuditStore:
    """Service for persisting relay command audit records."""
    
    def __init__(self, table_name: Optional[str] = None):
        """
        Initialize AuditStore with DynamoDB table.
        
        Args:
            table_name: DynamoDB table name (defaults to AUDIT_TABLE_NAME env var)
        """
        self.table_name = table_name or os.environ.get('AUDIT_TABLE_NAME', 'valine-orchestrator-audit-dev')
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(self.table_name)
    
    def create_audit_record(self, 
                           trace_id: str,
                           user_id: str,
                           command: str,
                           target_channel: str,
                           message: str,
                           result: str,
                           moderator_approval: Optional[str] = None,
                           metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Create an audit record for a relay operation.
        
        Args:
            trace_id: Trace ID for correlation
            user_id: Discord user ID who issued the command
            command: Command name (e.g., 'relay-send', 'relay-dm')
            target_channel: Target Discord channel ID
            message: The message being posted (will be fingerprinted)
            result: Result status ('posted', 'blocked', 'failed')
            moderator_approval: Optional moderator approval ID
            metadata: Additional metadata to store
        
        Returns:
            Audit record ID (UUID)
        """
        audit_id = str(uuid.uuid4())
        timestamp = int(time.time())
        
        # Create message fingerprint (SHA256 hash, last 4 chars)
        message_fingerprint = self._get_message_fingerprint(message)
        
        # Build audit record
        record = {
            'audit_id': audit_id,
            'trace_id': trace_id,
            'user_id': user_id,
            'command': command,
            'target_channel': target_channel,
            'message_fingerprint': message_fingerprint,
            'timestamp': timestamp,
            'result': result
        }
        
        # Add optional fields
        if moderator_approval:
            record['moderator_approval'] = moderator_approval
        
        if metadata:
            record['metadata'] = metadata
        
        # Persist to DynamoDB
        try:
            self.table.put_item(Item=record)
            print(f'Audit record created: {audit_id}')
            return audit_id
        except Exception as e:
            print(f'Error creating audit record: {str(e)}')
            # Still return the audit_id even if persistence fails
            return audit_id
    
    def get_audit_record(self, audit_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve an audit record by ID.
        
        Args:
            audit_id: Audit record ID
        
        Returns:
            Audit record if found, None otherwise
        """
        try:
            response = self.table.get_item(Key={'audit_id': audit_id})
            return response.get('Item')
        except Exception as e:
            print(f'Error retrieving audit record {audit_id}: {str(e)}')
            return None
    
    def query_user_audits(self, user_id: str, limit: int = 10) -> list:
        """
        Query audit records for a specific user.
        
        Args:
            user_id: Discord user ID
            limit: Maximum number of records to return
        
        Returns:
            List of audit records
        """
        try:
            # Note: This requires a GSI on user_id if we want efficient queries
            # For now, using scan with filter (less efficient but works for low volume)
            response = self.table.scan(
                FilterExpression='user_id = :uid',
                ExpressionAttributeValues={':uid': user_id},
                Limit=limit
            )
            return response.get('Items', [])
        except Exception as e:
            print(f'Error querying user audits: {str(e)}')
            return []
    
    @staticmethod
    def _get_message_fingerprint(message: str) -> str:
        """
        Get a fingerprint of a message (last 4 chars of SHA256 hash).
        Never stores the full message for privacy.
        
        Args:
            message: Message text
        
        Returns:
            Fingerprint in format "…abcd"
        """
        if not message:
            return '…(empty)'
        
        hash_hex = hashlib.sha256(message.encode()).hexdigest()
        return f'…{hash_hex[-4:]}'
