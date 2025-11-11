"""
State Store for managing multi-step flows and persistent state.
Supports Redis and Postgres backends with automatic failover.
"""
import os
import json
import time
from typing import Any, Dict, Optional
from datetime import datetime, timedelta


class StateStore:
    """
    Key-value store for managing conversation state, button interactions,
    and release tracking across Discord interactions.
    """
    
    def __init__(self, backend='auto'):
        """
        Initialize state store with specified backend.
        
        Args:
            backend: 'redis', 'postgres', or 'auto' (auto-detect)
        """
        self.backend_type = backend
        self.backend = None
        
        if backend == 'auto':
            self._auto_detect_backend()
        elif backend == 'redis':
            self._init_redis()
        elif backend == 'postgres':
            self._init_postgres()
        elif backend == 'memory':
            self._init_memory()
        else:
            raise ValueError(f"Unsupported backend: {backend}")
    
    def _auto_detect_backend(self):
        """Auto-detect available backend."""
        # Try Redis first
        if os.environ.get('REDIS_URL'):
            try:
                self._init_redis()
                return
            except Exception as e:
                print(f'Redis initialization failed: {e}')
        
        # Try Postgres second
        if os.environ.get('DATABASE_URL'):
            try:
                self._init_postgres()
                return
            except Exception as e:
                print(f'Postgres initialization failed: {e}')
        
        # Fallback to in-memory
        print('Warning: No persistent backend available, using in-memory store')
        self._init_memory()
    
    def _init_redis(self):
        """Initialize Redis backend."""
        try:
            import redis
            
            redis_url = os.environ.get('REDIS_URL')
            if not redis_url:
                raise ValueError('REDIS_URL not configured')
            
            self.backend = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            
            # Test connection
            self.backend.ping()
            
            self.backend_type = 'redis'
            print('StateStore initialized with Redis backend')
            
        except Exception as e:
            print(f'Failed to initialize Redis backend: {e}')
            raise
    
    def _init_postgres(self):
        """Initialize Postgres backend."""
        try:
            import psycopg2
            from urllib.parse import urlparse
            
            database_url = os.environ.get('DATABASE_URL')
            if not database_url:
                raise ValueError('DATABASE_URL not configured')
            
            # Parse connection string
            result = urlparse(database_url)
            
            self.backend = psycopg2.connect(
                database=result.path[1:],
                user=result.username,
                password=result.password,
                host=result.hostname,
                port=result.port
            )
            
            # Create table if not exists
            self._ensure_postgres_table()
            
            self.backend_type = 'postgres'
            print('StateStore initialized with Postgres backend')
            
        except Exception as e:
            print(f'Failed to initialize Postgres backend: {e}')
            raise
    
    def _init_memory(self):
        """Initialize in-memory backend (fallback)."""
        self.backend = {}
        self.backend_type = 'memory'
        print('StateStore initialized with in-memory backend (not persistent)')
    
    def _ensure_postgres_table(self):
        """Ensure state store table exists in Postgres."""
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS orchestrator_state (
            key VARCHAR(255) PRIMARY KEY,
            value TEXT NOT NULL,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_expires_at ON orchestrator_state(expires_at);
        """
        
        cursor = self.backend.cursor()
        try:
            cursor.execute(create_table_sql)
            self.backend.commit()
        finally:
            cursor.close()
    
    def put(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Store a value with optional TTL.
        
        Args:
            key: Storage key
            value: Value to store (will be JSON-serialized)
            ttl: Time-to-live in seconds (optional)
            
        Returns:
            True if successful
        """
        try:
            serialized = json.dumps(value)
            
            if self.backend_type == 'redis':
                if ttl:
                    self.backend.setex(key, ttl, serialized)
                else:
                    self.backend.set(key, serialized)
                    
            elif self.backend_type == 'postgres':
                expires_at = None
                if ttl:
                    expires_at = datetime.now() + timedelta(seconds=ttl)
                
                cursor = self.backend.cursor()
                try:
                    cursor.execute(
                        """
                        INSERT INTO orchestrator_state (key, value, expires_at)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (key) 
                        DO UPDATE SET value = %s, expires_at = %s, updated_at = CURRENT_TIMESTAMP
                        """,
                        (key, serialized, expires_at, serialized, expires_at)
                    )
                    self.backend.commit()
                finally:
                    cursor.close()
                    
            else:  # memory
                expiry = time.time() + ttl if ttl else None
                self.backend[key] = {'value': serialized, 'expiry': expiry}
            
            return True
            
        except Exception as e:
            print(f'Error storing key {key}: {e}')
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """
        Retrieve a value by key.
        
        Args:
            key: Storage key
            
        Returns:
            Deserialized value or None if not found/expired
        """
        try:
            if self.backend_type == 'redis':
                serialized = self.backend.get(key)
                if serialized:
                    return json.loads(serialized)
                    
            elif self.backend_type == 'postgres':
                cursor = self.backend.cursor()
                try:
                    cursor.execute(
                        """
                        SELECT value FROM orchestrator_state 
                        WHERE key = %s 
                        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
                        """,
                        (key,)
                    )
                    row = cursor.fetchone()
                    if row:
                        return json.loads(row[0])
                finally:
                    cursor.close()
                    
            else:  # memory
                record = self.backend.get(key)
                if record:
                    if record['expiry'] is None or record['expiry'] > time.time():
                        return json.loads(record['value'])
                    else:
                        # Clean up expired entry
                        del self.backend[key]
            
            return None
            
        except Exception as e:
            print(f'Error retrieving key {key}: {e}')
            return None
    
    def delete(self, key: str) -> bool:
        """
        Delete a key.
        
        Args:
            key: Storage key
            
        Returns:
            True if successful
        """
        try:
            if self.backend_type == 'redis':
                self.backend.delete(key)
                
            elif self.backend_type == 'postgres':
                cursor = self.backend.cursor()
                try:
                    cursor.execute("DELETE FROM orchestrator_state WHERE key = %s", (key,))
                    self.backend.commit()
                finally:
                    cursor.close()
                    
            else:  # memory
                if key in self.backend:
                    del self.backend[key]
            
            return True
            
        except Exception as e:
            print(f'Error deleting key {key}: {e}')
            return False
    
    def cleanup_expired(self) -> int:
        """
        Clean up expired entries (Postgres only, Redis auto-expires).
        
        Returns:
            Number of entries deleted
        """
        if self.backend_type == 'postgres':
            try:
                cursor = self.backend.cursor()
                try:
                    cursor.execute(
                        "DELETE FROM orchestrator_state WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP"
                    )
                    count = cursor.rowcount
                    self.backend.commit()
                    return count
                finally:
                    cursor.close()
            except Exception as e:
                print(f'Error cleaning up expired entries: {e}')
                return 0
        
        elif self.backend_type == 'memory':
            now = time.time()
            expired = [k for k, v in self.backend.items() if v['expiry'] and v['expiry'] < now]
            for key in expired:
                del self.backend[key]
            return len(expired)
        
        return 0


# Global state store instance
_state_store = None


def get_state_store() -> StateStore:
    """Get or create global state store instance."""
    global _state_store
    if _state_store is None:
        _state_store = StateStore(backend='auto')
    return _state_store
