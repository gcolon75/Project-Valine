"""
Trace store for tracking command execution traces.
Used by /debug-last command to retrieve recent execution details.
"""
import time
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone


class ExecutionTrace:
    """
    Represents a single command execution trace.
    """
    
    def __init__(self, trace_id: str, command: str, user_id: Optional[str] = None):
        """
        Initialize execution trace.
        
        Args:
            trace_id: Unique trace identifier
            command: Command being executed
            user_id: User who initiated the command
        """
        self.trace_id = trace_id
        self.command = command
        self.user_id = user_id
        self.started_at = time.time()
        self.completed_at: Optional[float] = None
        self.steps: List[Dict[str, Any]] = []
        self.error: Optional[str] = None
        self.metadata: Dict[str, Any] = {}
    
    def add_step(self, name: str, duration_ms: Optional[float] = None, 
                 status: str = "success", details: Optional[str] = None):
        """
        Add a step to the trace.
        
        Args:
            name: Step name
            duration_ms: Step duration in milliseconds
            status: Step status (success, failure, in_progress)
            details: Additional details
        """
        step = {
            "name": name,
            "timestamp": time.time(),
            "status": status
        }
        
        if duration_ms is not None:
            step["duration_ms"] = duration_ms
        
        if details:
            step["details"] = details
        
        self.steps.append(step)
    
    def set_error(self, error: str):
        """Set an error for this trace."""
        self.error = error
    
    def complete(self):
        """Mark the trace as completed."""
        self.completed_at = time.time()
    
    def get_duration_ms(self) -> Optional[float]:
        """Get total duration in milliseconds."""
        if self.completed_at:
            return (self.completed_at - self.started_at) * 1000
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert trace to dictionary."""
        return {
            "trace_id": self.trace_id,
            "command": self.command,
            "user_id": self.user_id,
            "started_at": datetime.fromtimestamp(self.started_at, tz=timezone.utc).isoformat(),
            "completed_at": datetime.fromtimestamp(self.completed_at, tz=timezone.utc).isoformat() if self.completed_at else None,
            "duration_ms": self.get_duration_ms(),
            "steps": self.steps,
            "error": self.error,
            "metadata": self.metadata
        }


class TraceStore:
    """
    In-memory store for execution traces.
    Maintains last N traces per user for /debug-last command.
    """
    
    # Maximum traces to keep per user
    MAX_TRACES_PER_USER = 10
    
    # Maximum traces to keep globally
    MAX_TRACES_GLOBAL = 100
    
    def __init__(self):
        """Initialize trace store."""
        self._traces: Dict[str, ExecutionTrace] = {}  # trace_id -> trace
        self._user_traces: Dict[str, List[str]] = {}  # user_id -> [trace_ids]
        self._last_trace_id: Optional[str] = None
    
    def create_trace(self, trace_id: str, command: str, 
                     user_id: Optional[str] = None) -> ExecutionTrace:
        """
        Create a new execution trace.
        
        Args:
            trace_id: Unique trace identifier
            command: Command being executed
            user_id: User who initiated the command
        
        Returns:
            New ExecutionTrace instance
        """
        trace = ExecutionTrace(trace_id, command, user_id)
        self._traces[trace_id] = trace
        
        # Track per user
        if user_id:
            if user_id not in self._user_traces:
                self._user_traces[user_id] = []
            self._user_traces[user_id].append(trace_id)
            
            # Limit traces per user
            if len(self._user_traces[user_id]) > self.MAX_TRACES_PER_USER:
                old_trace_id = self._user_traces[user_id].pop(0)
                if old_trace_id in self._traces:
                    del self._traces[old_trace_id]
        
        # Limit global traces
        if len(self._traces) > self.MAX_TRACES_GLOBAL:
            # Remove oldest traces
            sorted_traces = sorted(self._traces.items(), 
                                 key=lambda x: x[1].started_at)
            for old_trace_id, _ in sorted_traces[:10]:
                if old_trace_id in self._traces:
                    del self._traces[old_trace_id]
        
        # Track last trace
        self._last_trace_id = trace_id
        
        return trace
    
    def get_trace(self, trace_id: str) -> Optional[ExecutionTrace]:
        """Get a trace by ID."""
        return self._traces.get(trace_id)
    
    def get_last_trace(self, user_id: Optional[str] = None) -> Optional[ExecutionTrace]:
        """
        Get the last trace for a user (or globally if user_id not provided).
        
        Args:
            user_id: User ID to get last trace for
        
        Returns:
            Last ExecutionTrace or None
        """
        if user_id and user_id in self._user_traces:
            user_trace_ids = self._user_traces[user_id]
            if user_trace_ids:
                last_trace_id = user_trace_ids[-1]
                return self._traces.get(last_trace_id)
        elif self._last_trace_id:
            return self._traces.get(self._last_trace_id)
        
        return None
    
    def get_user_traces(self, user_id: str, limit: int = 5) -> List[ExecutionTrace]:
        """
        Get recent traces for a user.
        
        Args:
            user_id: User ID
            limit: Maximum number of traces to return
        
        Returns:
            List of ExecutionTrace instances (most recent first)
        """
        if user_id not in self._user_traces:
            return []
        
        trace_ids = self._user_traces[user_id][-limit:]
        traces = [self._traces[tid] for tid in reversed(trace_ids) if tid in self._traces]
        return traces


# Global trace store instance
_trace_store = TraceStore()


def get_trace_store() -> TraceStore:
    """Get the global trace store instance."""
    return _trace_store
