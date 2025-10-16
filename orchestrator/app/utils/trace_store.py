"""
In-memory trace store for storing recent command execution traces.

Provides LRU-based storage for debugging and troubleshooting command executions.
Traces are stored per user/channel/thread for easy retrieval via /debug-last.
"""
import time
import uuid
from collections import OrderedDict
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from threading import Lock


class ExecutionTrace:
    """Represents a single command execution trace."""
    
    def __init__(self, trace_id: str, user_id: str, channel_id: str, command: str):
        """
        Initialize execution trace.
        
        Args:
            trace_id: Unique trace identifier
            user_id: Discord user ID
            channel_id: Discord channel ID
            command: Command that was executed
        """
        self.trace_id = trace_id
        self.user_id = user_id
        self.channel_id = channel_id
        self.command = command
        self.started_at = datetime.now(timezone.utc)
        self.completed_at: Optional[datetime] = None
        self.steps: List[Dict[str, Any]] = []
        self.error: Optional[Dict[str, str]] = None
        self.metadata: Dict[str, Any] = {}
        self.run_urls: List[str] = []
    
    def add_step(self, name: str, status: str, duration_ms: Optional[float] = None, details: Optional[str] = None):
        """
        Add a step to the trace.
        
        Args:
            name: Step name
            status: Step status (started, completed, failed)
            duration_ms: Duration in milliseconds
            details: Additional details
        """
        step = {
            'name': name,
            'status': status,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }
        if duration_ms is not None:
            step['duration_ms'] = duration_ms
        if details:
            step['details'] = details
        self.steps.append(step)
    
    def set_error(self, error_type: str, message: str, trace: Optional[str] = None):
        """
        Set error information.
        
        Args:
            error_type: Type of error
            message: Error message
            trace: Stack trace (optional)
        """
        self.error = {
            'type': error_type,
            'message': message
        }
        if trace:
            self.error['trace'] = trace
    
    def complete(self):
        """Mark trace as completed."""
        self.completed_at = datetime.now(timezone.utc)
    
    def add_run_url(self, url: str):
        """Add a workflow run URL to the trace."""
        if url and url not in self.run_urls:
            self.run_urls.append(url)
    
    def set_metadata(self, key: str, value: Any):
        """Set metadata field."""
        self.metadata[key] = value
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert trace to dictionary for serialization.
        
        Returns:
            Dictionary representation of trace
        """
        duration = None
        if self.completed_at:
            duration = (self.completed_at - self.started_at).total_seconds() * 1000
        
        return {
            'trace_id': self.trace_id,
            'user_id': self.user_id,
            'channel_id': self.channel_id,
            'command': self.command,
            'started_at': self.started_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'duration_ms': duration,
            'steps': self.steps,
            'error': self.error,
            'metadata': self.metadata,
            'run_urls': self.run_urls
        }


class TraceStore:
    """
    LRU cache for storing recent execution traces.
    
    Stores traces per user/channel for easy retrieval.
    Automatically evicts oldest traces when capacity is reached.
    """
    
    def __init__(self, max_traces: int = 100):
        """
        Initialize trace store.
        
        Args:
            max_traces: Maximum number of traces to store
        """
        self.max_traces = max_traces
        self.traces: OrderedDict[str, ExecutionTrace] = OrderedDict()
        self.user_traces: Dict[str, List[str]] = {}  # user_id -> [trace_ids]
        self.lock = Lock()
    
    def create_trace(self, user_id: str, channel_id: str, command: str, 
                     trace_id: Optional[str] = None, correlation_id: Optional[str] = None) -> ExecutionTrace:
        """
        Create a new execution trace.
        
        Args:
            user_id: Discord user ID
            channel_id: Discord channel ID
            command: Command being executed
            trace_id: Optional trace ID (generated if not provided)
            correlation_id: Optional correlation ID
            
        Returns:
            ExecutionTrace instance
        """
        if not trace_id:
            trace_id = correlation_id if correlation_id else str(uuid.uuid4())
        
        trace = ExecutionTrace(trace_id, user_id, channel_id, command)
        
        with self.lock:
            # Add trace
            self.traces[trace_id] = trace
            self.traces.move_to_end(trace_id)
            
            # Track by user
            if user_id not in self.user_traces:
                self.user_traces[user_id] = []
            self.user_traces[user_id].append(trace_id)
            
            # Evict oldest if over capacity
            while len(self.traces) > self.max_traces:
                oldest_id, oldest_trace = self.traces.popitem(last=False)
                # Remove from user index
                if oldest_trace.user_id in self.user_traces:
                    user_trace_ids = self.user_traces[oldest_trace.user_id]
                    if oldest_id in user_trace_ids:
                        user_trace_ids.remove(oldest_id)
                    if not user_trace_ids:
                        del self.user_traces[oldest_trace.user_id]
        
        return trace
    
    def get_trace(self, trace_id: str) -> Optional[ExecutionTrace]:
        """
        Get trace by ID.
        
        Args:
            trace_id: Trace identifier
            
        Returns:
            ExecutionTrace if found, None otherwise
        """
        with self.lock:
            return self.traces.get(trace_id)
    
    def get_last_trace_for_user(self, user_id: str, channel_id: Optional[str] = None) -> Optional[ExecutionTrace]:
        """
        Get the most recent trace for a user.
        
        Args:
            user_id: Discord user ID
            channel_id: Optional channel ID to filter by
            
        Returns:
            Most recent ExecutionTrace for user, or None
        """
        with self.lock:
            if user_id not in self.user_traces:
                return None
            
            # Get trace IDs in reverse order (most recent first)
            trace_ids = self.user_traces[user_id]
            for trace_id in reversed(trace_ids):
                trace = self.traces.get(trace_id)
                if trace:
                    # If channel_id specified, filter by it
                    if channel_id is None or trace.channel_id == channel_id:
                        return trace
            
            return None
    
    def get_recent_traces_for_user(self, user_id: str, limit: int = 5) -> List[ExecutionTrace]:
        """
        Get recent traces for a user.
        
        Args:
            user_id: Discord user ID
            limit: Maximum number of traces to return
            
        Returns:
            List of recent ExecutionTrace objects
        """
        with self.lock:
            if user_id not in self.user_traces:
                return []
            
            trace_ids = self.user_traces[user_id]
            traces = []
            for trace_id in reversed(trace_ids[-limit:]):
                trace = self.traces.get(trace_id)
                if trace:
                    traces.append(trace)
            
            return traces
    
    def clear(self):
        """Clear all traces."""
        with self.lock:
            self.traces.clear()
            self.user_traces.clear()


# Global trace store instance
_global_trace_store: Optional[TraceStore] = None
_store_lock = Lock()


def get_trace_store() -> TraceStore:
    """
    Get the global trace store instance.
    
    Returns:
        TraceStore singleton instance
    """
    global _global_trace_store
    
    if _global_trace_store is None:
        with _store_lock:
            if _global_trace_store is None:
                _global_trace_store = TraceStore()
    
    return _global_trace_store
