"""
Unit tests for trace store utility.
"""
import pytest
import time
from app.utils.trace_store import ExecutionTrace, TraceStore, get_trace_store


class TestExecutionTrace:
    """Tests for ExecutionTrace class."""
    
    def test_trace_initialization(self):
        """Test trace initialization."""
        trace = ExecutionTrace("trace-123", "/diagnose", user_id="user-456")
        
        assert trace.trace_id == "trace-123"
        assert trace.command == "/diagnose"
        assert trace.user_id == "user-456"
        assert trace.started_at > 0
        assert trace.completed_at is None
        assert trace.steps == []
        assert trace.error is None
    
    def test_add_step(self):
        """Test adding steps to trace."""
        trace = ExecutionTrace("trace-123", "/test")
        
        trace.add_step("Step 1", duration_ms=100, status="success")
        trace.add_step("Step 2", duration_ms=200, status="failure", details="Error details")
        
        assert len(trace.steps) == 2
        assert trace.steps[0]["name"] == "Step 1"
        assert trace.steps[0]["duration_ms"] == 100
        assert trace.steps[0]["status"] == "success"
        assert trace.steps[1]["details"] == "Error details"
    
    def test_set_error(self):
        """Test setting error on trace."""
        trace = ExecutionTrace("trace-123", "/test")
        trace.set_error("Something went wrong")
        
        assert trace.error == "Something went wrong"
    
    def test_complete(self):
        """Test completing a trace."""
        trace = ExecutionTrace("trace-123", "/test")
        time.sleep(0.01)  # Small delay
        trace.complete()
        
        assert trace.completed_at is not None
        assert trace.completed_at > trace.started_at
    
    def test_get_duration_ms(self):
        """Test getting duration in milliseconds."""
        trace = ExecutionTrace("trace-123", "/test")
        time.sleep(0.01)  # Small delay
        trace.complete()
        
        duration = trace.get_duration_ms()
        assert duration is not None
        assert duration >= 10  # At least 10ms
    
    def test_get_duration_ms_incomplete(self):
        """Test getting duration for incomplete trace."""
        trace = ExecutionTrace("trace-123", "/test")
        
        duration = trace.get_duration_ms()
        assert duration is None
    
    def test_to_dict(self):
        """Test converting trace to dictionary."""
        trace = ExecutionTrace("trace-123", "/test", user_id="user-456")
        trace.add_step("Step 1", duration_ms=100)
        trace.complete()
        
        trace_dict = trace.to_dict()
        
        assert trace_dict["trace_id"] == "trace-123"
        assert trace_dict["command"] == "/test"
        assert trace_dict["user_id"] == "user-456"
        assert "started_at" in trace_dict
        assert "completed_at" in trace_dict
        assert trace_dict["duration_ms"] is not None
        assert len(trace_dict["steps"]) == 1


class TestTraceStore:
    """Tests for TraceStore class."""
    
    def test_store_initialization(self):
        """Test trace store initialization."""
        store = TraceStore()
        
        assert len(store._traces) == 0
        assert len(store._user_traces) == 0
        assert store._last_trace_id is None
    
    def test_create_trace(self):
        """Test creating a trace."""
        store = TraceStore()
        trace = store.create_trace("trace-123", "/test", user_id="user-456")
        
        assert trace.trace_id == "trace-123"
        assert trace.command == "/test"
        assert store._last_trace_id == "trace-123"
    
    def test_get_trace(self):
        """Test getting a trace by ID."""
        store = TraceStore()
        store.create_trace("trace-123", "/test")
        
        trace = store.get_trace("trace-123")
        assert trace is not None
        assert trace.trace_id == "trace-123"
    
    def test_get_trace_not_found(self):
        """Test getting non-existent trace."""
        store = TraceStore()
        
        trace = store.get_trace("non-existent")
        assert trace is None
    
    def test_get_last_trace(self):
        """Test getting last trace globally."""
        store = TraceStore()
        store.create_trace("trace-1", "/test1")
        store.create_trace("trace-2", "/test2")
        
        last_trace = store.get_last_trace()
        assert last_trace is not None
        assert last_trace.trace_id == "trace-2"
    
    def test_get_last_trace_for_user(self):
        """Test getting last trace for specific user."""
        store = TraceStore()
        store.create_trace("trace-1", "/test1", user_id="user-1")
        store.create_trace("trace-2", "/test2", user_id="user-2")
        store.create_trace("trace-3", "/test3", user_id="user-1")
        
        last_trace = store.get_last_trace(user_id="user-1")
        assert last_trace is not None
        assert last_trace.trace_id == "trace-3"
    
    def test_get_last_trace_empty(self):
        """Test getting last trace from empty store."""
        store = TraceStore()
        
        last_trace = store.get_last_trace()
        assert last_trace is None
    
    def test_get_user_traces(self):
        """Test getting traces for a user."""
        store = TraceStore()
        store.create_trace("trace-1", "/test1", user_id="user-1")
        store.create_trace("trace-2", "/test2", user_id="user-1")
        store.create_trace("trace-3", "/test3", user_id="user-2")
        
        traces = store.get_user_traces("user-1")
        assert len(traces) == 2
        assert traces[0].trace_id == "trace-2"  # Most recent first
        assert traces[1].trace_id == "trace-1"
    
    def test_get_user_traces_with_limit(self):
        """Test getting limited traces for a user."""
        store = TraceStore()
        for i in range(10):
            store.create_trace(f"trace-{i}", "/test", user_id="user-1")
        
        traces = store.get_user_traces("user-1", limit=3)
        assert len(traces) == 3
        assert traces[0].trace_id == "trace-9"  # Most recent
    
    def test_get_user_traces_no_traces(self):
        """Test getting traces for user with no traces."""
        store = TraceStore()
        
        traces = store.get_user_traces("user-1")
        assert len(traces) == 0
    
    def test_max_traces_per_user(self):
        """Test that old traces are removed when limit is reached."""
        store = TraceStore()
        
        # Create more traces than the limit
        for i in range(TraceStore.MAX_TRACES_PER_USER + 5):
            store.create_trace(f"trace-{i}", "/test", user_id="user-1")
        
        traces = store.get_user_traces("user-1", limit=100)
        assert len(traces) == TraceStore.MAX_TRACES_PER_USER
        
        # Old traces should be removed
        assert store.get_trace("trace-0") is None
        assert store.get_trace("trace-1") is None
    
    def test_max_traces_global(self):
        """Test that global trace limit is enforced."""
        store = TraceStore()
        
        # Create more traces than global limit
        for i in range(TraceStore.MAX_TRACES_GLOBAL + 10):
            store.create_trace(f"trace-{i}", "/test", user_id=f"user-{i}")
        
        # Should not exceed global limit
        assert len(store._traces) <= TraceStore.MAX_TRACES_GLOBAL
    
    def test_multiple_users(self):
        """Test handling multiple users."""
        store = TraceStore()
        store.create_trace("trace-1", "/test1", user_id="user-1")
        store.create_trace("trace-2", "/test2", user_id="user-2")
        store.create_trace("trace-3", "/test3", user_id="user-1")
        
        user1_traces = store.get_user_traces("user-1")
        user2_traces = store.get_user_traces("user-2")
        
        assert len(user1_traces) == 2
        assert len(user2_traces) == 1


class TestGetTraceStore:
    """Tests for get_trace_store function."""
    
    def test_get_trace_store_singleton(self):
        """Test that get_trace_store returns same instance."""
        store1 = get_trace_store()
        store2 = get_trace_store()
        
        assert store1 is store2
    
    def test_get_trace_store_returns_trace_store(self):
        """Test that get_trace_store returns TraceStore instance."""
        store = get_trace_store()
        
        assert isinstance(store, TraceStore)
