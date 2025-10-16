"""
Tests for time formatting utility.
"""
import unittest
from datetime import datetime, timedelta, timezone
from app.utils.time_formatter import TimeFormatter


class TestTimeFormatter(unittest.TestCase):
    """Test cases for TimeFormatter class."""

    def test_format_relative_time_seconds(self):
        """Test relative time formatting for seconds."""
        now = datetime.now(timezone.utc)
        dt = now - timedelta(seconds=30)
        result = TimeFormatter.format_relative_time(dt)
        
        self.assertEqual(result, '30s ago')

    def test_format_relative_time_minutes(self):
        """Test relative time formatting for minutes."""
        now = datetime.now(timezone.utc)
        dt = now - timedelta(minutes=5)
        result = TimeFormatter.format_relative_time(dt)
        
        self.assertEqual(result, '5m ago')

    def test_format_relative_time_hours(self):
        """Test relative time formatting for hours."""
        now = datetime.now(timezone.utc)
        dt = now - timedelta(hours=3)
        result = TimeFormatter.format_relative_time(dt)
        
        self.assertEqual(result, '3h ago')

    def test_format_relative_time_days(self):
        """Test relative time formatting for days."""
        now = datetime.now(timezone.utc)
        dt = now - timedelta(days=7)
        result = TimeFormatter.format_relative_time(dt)
        
        self.assertEqual(result, '7d ago')

    def test_format_relative_time_months(self):
        """Test relative time formatting for months."""
        now = datetime.now(timezone.utc)
        dt = now - timedelta(days=60)
        result = TimeFormatter.format_relative_time(dt)
        
        self.assertEqual(result, '2mo ago')

    def test_format_relative_time_just_now(self):
        """Test relative time for future time (just now)."""
        now = datetime.now(timezone.utc)
        dt = now + timedelta(seconds=5)
        result = TimeFormatter.format_relative_time(dt)
        
        self.assertEqual(result, 'just now')

    def test_format_relative_time_naive_datetime(self):
        """Test relative time with naive datetime (treated as UTC)."""
        now = datetime.now(timezone.utc)
        dt_naive = (now - timedelta(minutes=10)).replace(tzinfo=None)
        result = TimeFormatter.format_relative_time(dt_naive)
        
        self.assertIn('ago', result)

    def test_format_relative_time_none(self):
        """Test relative time with None."""
        result = TimeFormatter.format_relative_time(None)
        
        self.assertEqual(result, 'unknown')

    def test_format_duration_seconds(self):
        """Test duration formatting for seconds."""
        result = TimeFormatter.format_duration_seconds(45)
        
        self.assertEqual(result, '45s')

    def test_format_duration_minutes(self):
        """Test duration formatting for minutes."""
        result = TimeFormatter.format_duration_seconds(135)
        
        self.assertEqual(result, '2m 15s')

    def test_format_duration_minutes_exact(self):
        """Test duration formatting for exact minutes."""
        result = TimeFormatter.format_duration_seconds(120)
        
        self.assertEqual(result, '2m')

    def test_format_duration_hours(self):
        """Test duration formatting for hours."""
        result = TimeFormatter.format_duration_seconds(3900)
        
        self.assertEqual(result, '1h 5m')

    def test_format_duration_hours_exact(self):
        """Test duration formatting for exact hours."""
        result = TimeFormatter.format_duration_seconds(3600)
        
        self.assertEqual(result, '1h')

    def test_format_duration_none(self):
        """Test duration formatting with None."""
        result = TimeFormatter.format_duration_seconds(None)
        
        self.assertEqual(result, 'N/A')


if __name__ == '__main__':
    unittest.main()
