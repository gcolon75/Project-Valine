"""
Persistence adapter interface and implementations for conversation state storage.

Supports multiple backends:
- Memory (default, non-persistent)
- SQLite (file-based persistence)
- DynamoDB (cloud persistence with TTL)
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import os
import json


class PersistenceAdapter(ABC):
    """Base interface for persistence adapters."""
    
    @abstractmethod
    def save_conversation(self, conversation_data: Dict[str, Any]) -> bool:
        """
        Save a conversation state.
        
        Args:
            conversation_data: Dictionary containing conversation state
            
        Returns:
            True if successful, False otherwise
        """
        pass
    
    @abstractmethod
    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a conversation state by ID.
        
        Args:
            conversation_id: Unique conversation identifier
            
        Returns:
            Conversation data dict or None if not found
        """
        pass
    
    @abstractmethod
    def delete_conversation(self, conversation_id: str) -> bool:
        """
        Delete a conversation state.
        
        Args:
            conversation_id: Unique conversation identifier
            
        Returns:
            True if successful, False otherwise
        """
        pass
    
    @abstractmethod
    def list_conversations(
        self,
        filters: Optional[Dict[str, Any]] = None,
        max_results: int = 200
    ) -> List[Dict[str, Any]]:
        """
        List conversations with optional filtering.
        
        Args:
            filters: Optional filters (e.g., status, user_id)
            max_results: Maximum number of results
            
        Returns:
            List of conversation data dicts
        """
        pass
    
    @abstractmethod
    def cleanup_expired(self, ttl_hours: int = 168) -> int:
        """
        Clean up expired conversations based on TTL.
        
        Args:
            ttl_hours: Time-to-live in hours (default 168 = 7 days)
            
        Returns:
            Number of conversations cleaned up
        """
        pass


class MemoryPersistenceAdapter(PersistenceAdapter):
    """In-memory persistence adapter (non-persistent, default)."""
    
    def __init__(self):
        """Initialize in-memory storage."""
        self.conversations: Dict[str, Dict[str, Any]] = {}
    
    def save_conversation(self, conversation_data: Dict[str, Any]) -> bool:
        """Save conversation to memory."""
        conversation_id = conversation_data.get('conversation_id')
        if not conversation_id:
            return False
        
        self.conversations[conversation_id] = conversation_data.copy()
        return True
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve conversation from memory."""
        return self.conversations.get(conversation_id)
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete conversation from memory."""
        if conversation_id in self.conversations:
            del self.conversations[conversation_id]
            return True
        return False
    
    def list_conversations(
        self,
        filters: Optional[Dict[str, Any]] = None,
        max_results: int = 200
    ) -> List[Dict[str, Any]]:
        """List conversations from memory."""
        results = list(self.conversations.values())
        
        # Apply filters if provided
        if filters:
            if 'status' in filters:
                status_filter = filters['status']
                if isinstance(status_filter, str):
                    status_filter = [status_filter]
                results = [
                    conv for conv in results
                    if conv.get('status') in status_filter
                ]
        
        # Sort by last_activity_at (most recent first)
        results.sort(
            key=lambda x: x.get('last_activity_at', ''),
            reverse=True
        )
        
        return results[:max_results]
    
    def cleanup_expired(self, ttl_hours: int = 168) -> int:
        """Clean up expired conversations."""
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=ttl_hours)
        
        expired_ids = []
        for conv_id, conv_data in self.conversations.items():
            last_activity = conv_data.get('last_activity_at')
            if last_activity:
                try:
                    last_activity_dt = datetime.fromisoformat(last_activity)
                    if last_activity_dt < cutoff:
                        expired_ids.append(conv_id)
                except (ValueError, TypeError):
                    pass
        
        for conv_id in expired_ids:
            del self.conversations[conv_id]
        
        return len(expired_ids)


class SQLitePersistenceAdapter(PersistenceAdapter):
    """SQLite file-based persistence adapter."""
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize SQLite adapter.
        
        Args:
            db_path: Path to SQLite database file
        """
        import sqlite3
        
        self.db_path = db_path or os.getenv(
            'SQLITE_DB_PATH',
            '/tmp/backend_agent_conversations.db'
        )
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._init_schema()
    
    def _init_schema(self):
        """Initialize database schema."""
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                conversation_id TEXT PRIMARY KEY,
                user_id TEXT,
                task_id TEXT,
                status TEXT,
                data TEXT,
                created_at TEXT,
                last_activity_at TEXT
            )
        """)
        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_status 
            ON conversations(status)
        """)
        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_last_activity 
            ON conversations(last_activity_at DESC)
        """)
        self.conn.commit()
    
    def save_conversation(self, conversation_data: Dict[str, Any]) -> bool:
        """Save conversation to SQLite."""
        conversation_id = conversation_data.get('conversation_id')
        if not conversation_id:
            return False
        
        try:
            self.conn.execute("""
                INSERT OR REPLACE INTO conversations 
                (conversation_id, user_id, task_id, status, data, 
                 created_at, last_activity_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                conversation_id,
                conversation_data.get('user_id'),
                conversation_data.get('task_id'),
                conversation_data.get('status'),
                json.dumps(conversation_data),
                conversation_data.get('created_at'),
                conversation_data.get('last_activity_at')
            ))
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error saving conversation: {e}")
            return False
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve conversation from SQLite."""
        cursor = self.conn.execute(
            "SELECT data FROM conversations WHERE conversation_id = ?",
            (conversation_id,)
        )
        row = cursor.fetchone()
        
        if row:
            try:
                return json.loads(row[0])
            except json.JSONDecodeError:
                return None
        return None
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete conversation from SQLite."""
        try:
            self.conn.execute(
                "DELETE FROM conversations WHERE conversation_id = ?",
                (conversation_id,)
            )
            self.conn.commit()
            return True
        except Exception:
            return False
    
    def list_conversations(
        self,
        filters: Optional[Dict[str, Any]] = None,
        max_results: int = 200
    ) -> List[Dict[str, Any]]:
        """List conversations from SQLite."""
        query = "SELECT data FROM conversations"
        params = []
        
        # Apply filters
        if filters and 'status' in filters:
            status_filter = filters['status']
            if isinstance(status_filter, str):
                status_filter = [status_filter]
            
            placeholders = ','.join(['?' for _ in status_filter])
            query += f" WHERE status IN ({placeholders})"
            params.extend(status_filter)
        
        query += " ORDER BY last_activity_at DESC LIMIT ?"
        params.append(max_results)
        
        cursor = self.conn.execute(query, params)
        results = []
        
        for row in cursor:
            try:
                results.append(json.loads(row[0]))
            except json.JSONDecodeError:
                pass
        
        return results
    
    def cleanup_expired(self, ttl_hours: int = 168) -> int:
        """Clean up expired conversations."""
        cutoff = (
            datetime.now(timezone.utc) - timedelta(hours=ttl_hours)
        ).isoformat()
        
        cursor = self.conn.execute(
            "DELETE FROM conversations WHERE last_activity_at < ?",
            (cutoff,)
        )
        self.conn.commit()
        return cursor.rowcount
    
    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()


class DynamoDBPersistenceAdapter(PersistenceAdapter):
    """DynamoDB persistence adapter with TTL support."""
    
    def __init__(
        self,
        table_name: Optional[str] = None,
        region: Optional[str] = None
    ):
        """
        Initialize DynamoDB adapter.
        
        Args:
            table_name: DynamoDB table name
            region: AWS region
        """
        try:
            import boto3
        except ImportError:
            raise ImportError(
                "boto3 is required for DynamoDB persistence. "
                "Install with: pip install boto3"
            )
        
        self.table_name = table_name or os.getenv(
            'DYNAMODB_TABLE_NAME',
            'backend-agent-conversations'
        )
        self.region = region or os.getenv('DYNAMODB_REGION', 'us-east-1')
        
        self.dynamodb = boto3.resource('dynamodb', region_name=self.region)
        self.table = self.dynamodb.Table(self.table_name)
    
    def save_conversation(self, conversation_data: Dict[str, Any]) -> bool:
        """Save conversation to DynamoDB."""
        conversation_id = conversation_data.get('conversation_id')
        if not conversation_id:
            return False
        
        try:
            # Add TTL (7 days from last activity)
            last_activity = conversation_data.get('last_activity_at')
            if last_activity:
                last_activity_dt = datetime.fromisoformat(last_activity)
                ttl = int((last_activity_dt + timedelta(days=7)).timestamp())
            else:
                ttl = int(
                    (datetime.now(timezone.utc) + timedelta(days=7)).timestamp()
                )
            
            item = conversation_data.copy()
            item['ttl'] = ttl
            
            self.table.put_item(Item=item)
            return True
        except Exception as e:
            print(f"Error saving conversation to DynamoDB: {e}")
            return False
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve conversation from DynamoDB."""
        try:
            response = self.table.get_item(
                Key={'conversation_id': conversation_id}
            )
            item = response.get('Item')
            if item:
                # Remove TTL field from returned data
                item.pop('ttl', None)
                return item
            return None
        except Exception as e:
            print(f"Error getting conversation from DynamoDB: {e}")
            return None
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete conversation from DynamoDB."""
        try:
            self.table.delete_item(
                Key={'conversation_id': conversation_id}
            )
            return True
        except Exception:
            return False
    
    def list_conversations(
        self,
        filters: Optional[Dict[str, Any]] = None,
        max_results: int = 200
    ) -> List[Dict[str, Any]]:
        """List conversations from DynamoDB."""
        try:
            scan_kwargs = {'Limit': max_results}
            
            # Apply filters
            if filters and 'status' in filters:
                status_filter = filters['status']
                if isinstance(status_filter, str):
                    status_filter = [status_filter]
                
                # DynamoDB filter expression
                filter_expr = ' OR '.join([
                    f'#status = :status{i}'
                    for i in range(len(status_filter))
                ])
                
                scan_kwargs['FilterExpression'] = filter_expr
                scan_kwargs['ExpressionAttributeNames'] = {'#status': 'status'}
                scan_kwargs['ExpressionAttributeValues'] = {
                    f':status{i}': status
                    for i, status in enumerate(status_filter)
                }
            
            response = self.table.scan(**scan_kwargs)
            items = response.get('Items', [])
            
            # Remove TTL field and sort by last_activity_at
            results = []
            for item in items:
                item.pop('ttl', None)
                results.append(item)
            
            results.sort(
                key=lambda x: x.get('last_activity_at', ''),
                reverse=True
            )
            
            return results[:max_results]
        except Exception as e:
            print(f"Error listing conversations from DynamoDB: {e}")
            return []
    
    def cleanup_expired(self, ttl_hours: int = 168) -> int:
        """
        DynamoDB handles cleanup automatically via TTL.
        This method is a no-op for DynamoDB.
        """
        # DynamoDB TTL handles cleanup automatically
        return 0


def create_persistence_adapter(
    adapter_type: Optional[str] = None
) -> PersistenceAdapter:
    """
    Factory function to create a persistence adapter.
    
    Args:
        adapter_type: Type of adapter ('memory', 'sqlite', 'dynamodb')
                     If None, reads from PERSISTENCE_ADAPTER env var
    
    Returns:
        PersistenceAdapter instance
    """
    adapter_type = adapter_type or os.getenv('PERSISTENCE_ADAPTER', 'memory')
    adapter_type = adapter_type.lower()
    
    if adapter_type == 'sqlite':
        return SQLitePersistenceAdapter()
    elif adapter_type == 'dynamodb':
        return DynamoDBPersistenceAdapter()
    elif adapter_type == 'memory':
        return MemoryPersistenceAdapter()
    else:
        print(
            f"Warning: Unknown adapter type '{adapter_type}', "
            f"falling back to memory"
        )
        return MemoryPersistenceAdapter()
