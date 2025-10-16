"""
Time formatting utilities for human-readable durations and relative times.
"""
from datetime import datetime, timezone


class TimeFormatter:
    """Formats time durations and relative times."""

    @staticmethod
    def format_relative_time(dt):
        """
        Format a datetime as relative time (e.g., "2h ago", "5m ago").
        
        Args:
            dt: datetime object (naive datetime is treated as UTC)
            
        Returns:
            str: Human-readable relative time
        """
        if not dt:
            return 'unknown'
        
        # Ensure timezone-aware datetime
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        
        now = datetime.now(timezone.utc)
        delta = now - dt
        
        total_seconds = int(delta.total_seconds())
        
        if total_seconds < 0:
            return 'just now'
        
        if total_seconds < 60:
            return f'{total_seconds}s ago'
        
        minutes = total_seconds // 60
        if minutes < 60:
            return f'{minutes}m ago'
        
        hours = minutes // 60
        if hours < 24:
            return f'{hours}h ago'
        
        days = hours // 24
        if days < 30:
            return f'{days}d ago'
        
        months = days // 30
        return f'{months}mo ago'
    
    @staticmethod
    def format_duration_seconds(seconds):
        """
        Format a duration in seconds to human-readable format.
        
        Args:
            seconds: Duration in seconds (int or float)
            
        Returns:
            str: Formatted duration (e.g., "82s", "2m 15s")
        """
        if seconds is None:
            return 'N/A'
        
        total_seconds = int(seconds)
        
        if total_seconds < 60:
            return f'{total_seconds}s'
        
        minutes = total_seconds // 60
        remaining_seconds = total_seconds % 60
        
        if minutes < 60:
            if remaining_seconds > 0:
                return f'{minutes}m {remaining_seconds}s'
            return f'{minutes}m'
        
        hours = minutes // 60
        remaining_minutes = minutes % 60
        
        if remaining_minutes > 0:
            return f'{hours}h {remaining_minutes}m'
        return f'{hours}h'
