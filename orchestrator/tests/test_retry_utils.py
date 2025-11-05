"""
Tests for retry utilities.
"""
import os
import sys
import unittest
import time
from pathlib import Path
from unittest.mock import Mock, patch

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))

from utils.retry_utils import (
    RetryConfig,
    TokenPool,
    calculate_delay,
    should_retry,
    retry_with_backoff
)


class TestRetryConfig(unittest.TestCase):
    """Test suite for RetryConfig."""
    
    def test_init_defaults(self):
        """Test RetryConfig initialization with defaults."""
        config = RetryConfig()
        
        self.assertEqual(config.max_retries, 3)
        self.assertEqual(config.base_delay, 1.0)
        self.assertEqual(config.max_delay, 60.0)
        self.assertEqual(config.exponential_base, 2.0)
        self.assertTrue(config.jitter)
    
    def test_init_custom(self):
        """Test RetryConfig initialization with custom values."""
        config = RetryConfig(
            max_retries=5,
            base_delay=2.0,
            max_delay=120.0,
            exponential_base=3.0,
            jitter=False
        )
        
        self.assertEqual(config.max_retries, 5)
        self.assertEqual(config.base_delay, 2.0)
        self.assertEqual(config.max_delay, 120.0)
        self.assertEqual(config.exponential_base, 3.0)
        self.assertFalse(config.jitter)
    
    @patch.dict(os.environ, {
        'GITHUB_API_MAX_RETRIES': '5',
        'GITHUB_API_BASE_DELAY': '2.5',
        'GITHUB_API_MAX_DELAY': '90.0'
    })
    def test_from_env(self):
        """Test creating RetryConfig from environment variables."""
        config = RetryConfig.from_env()
        
        self.assertEqual(config.max_retries, 5)
        self.assertEqual(config.base_delay, 2.5)
        self.assertEqual(config.max_delay, 90.0)


class TestTokenPool(unittest.TestCase):
    """Test suite for TokenPool."""
    
    def test_init_with_tokens(self):
        """Test TokenPool initialization with tokens."""
        tokens = ['token1', 'token2', 'token3']
        pool = TokenPool(tokens)
        
        self.assertEqual(pool.size(), 3)
    
    def test_init_empty(self):
        """Test TokenPool initialization with no tokens."""
        pool = TokenPool([])
        
        self.assertEqual(pool.size(), 0)
    
    def test_get_token_round_robin(self):
        """Test token retrieval with round-robin."""
        tokens = ['token1', 'token2', 'token3']
        pool = TokenPool(tokens)
        
        # Get tokens in round-robin fashion
        self.assertEqual(pool.get_token(), 'token1')
        self.assertEqual(pool.get_token(), 'token2')
        self.assertEqual(pool.get_token(), 'token3')
        self.assertEqual(pool.get_token(), 'token1')  # Wraps around
    
    def test_get_token_empty_pool(self):
        """Test getting token from empty pool."""
        pool = TokenPool([])
        
        self.assertIsNone(pool.get_token())
    
    def test_mark_token_failed(self):
        """Test marking a token as failed."""
        tokens = ['token1', 'token2']
        pool = TokenPool(tokens)
        
        pool.mark_token_failed('token1')
        pool.mark_token_failed('token1')
        
        self.assertEqual(pool.token_failures['token1'], 2)
        self.assertEqual(pool.token_failures['token2'], 0)
    
    def test_get_best_token(self):
        """Test getting the best token with fewest failures."""
        tokens = ['token1', 'token2', 'token3']
        pool = TokenPool(tokens)
        
        # Mark some failures
        pool.mark_token_failed('token1')
        pool.mark_token_failed('token1')
        pool.mark_token_failed('token2')
        
        # token3 has no failures, should be best
        best = pool.get_best_token()
        self.assertEqual(best, 'token3')


class TestCalculateDelay(unittest.TestCase):
    """Test suite for calculate_delay function."""
    
    def test_exponential_backoff(self):
        """Test exponential backoff calculation."""
        config = RetryConfig(
            base_delay=1.0,
            exponential_base=2.0,
            max_delay=60.0,
            jitter=False
        )
        
        # Attempt 0: 1.0 * 2^0 = 1.0
        delay0 = calculate_delay(0, config)
        self.assertEqual(delay0, 1.0)
        
        # Attempt 1: 1.0 * 2^1 = 2.0
        delay1 = calculate_delay(1, config)
        self.assertEqual(delay1, 2.0)
        
        # Attempt 2: 1.0 * 2^2 = 4.0
        delay2 = calculate_delay(2, config)
        self.assertEqual(delay2, 4.0)
    
    def test_max_delay_cap(self):
        """Test that delay is capped at max_delay."""
        config = RetryConfig(
            base_delay=1.0,
            exponential_base=2.0,
            max_delay=10.0,
            jitter=False
        )
        
        # Attempt 10: 1.0 * 2^10 = 1024.0, but capped at 10.0
        delay = calculate_delay(10, config)
        self.assertEqual(delay, 10.0)
    
    def test_jitter_adds_randomness(self):
        """Test that jitter adds randomness to delay."""
        config = RetryConfig(
            base_delay=1.0,
            exponential_base=2.0,
            max_delay=60.0,
            jitter=True
        )
        
        # Get multiple delays for same attempt
        delays = [calculate_delay(2, config) for _ in range(10)]
        
        # Should have some variation due to jitter
        self.assertTrue(len(set(delays)) > 1)
        
        # All should be close to 4.0 (base calculation)
        for delay in delays:
            self.assertGreater(delay, 3.0)
            self.assertLess(delay, 5.0)
    
    def test_rate_limit_reset(self):
        """Test delay calculation with rate limit reset time."""
        config = RetryConfig()
        
        # Set reset time to 5 seconds from now
        future_time = int(time.time()) + 5
        
        delay = calculate_delay(0, config, rate_limit_reset=future_time)
        
        # Should wait until reset time (+1 second buffer)
        self.assertGreaterEqual(delay, 5)
        self.assertLessEqual(delay, 7)


class TestShouldRetry(unittest.TestCase):
    """Test suite for should_retry function."""
    
    def test_retry_on_429(self):
        """Test that 429 status code triggers retry."""
        exception = Exception("Rate limited")
        self.assertTrue(should_retry(exception, status_code=429))
    
    def test_retry_on_5xx(self):
        """Test that 5xx status codes trigger retry."""
        exception = Exception("Server error")
        self.assertTrue(should_retry(exception, status_code=500))
        self.assertTrue(should_retry(exception, status_code=502))
        self.assertTrue(should_retry(exception, status_code=503))
    
    def test_no_retry_on_4xx(self):
        """Test that 4xx status codes don't trigger retry."""
        exception = Exception("Client error")
        self.assertFalse(should_retry(exception, status_code=400))
        self.assertFalse(should_retry(exception, status_code=404))
    
    def test_no_retry_on_2xx(self):
        """Test that 2xx status codes don't trigger retry."""
        exception = Exception("Success")
        self.assertFalse(should_retry(exception, status_code=200))


class TestRetryWithBackoff(unittest.TestCase):
    """Test suite for retry_with_backoff decorator."""
    
    def test_success_no_retry(self):
        """Test that successful calls don't retry."""
        config = RetryConfig(max_retries=3)
        
        call_count = [0]
        
        @retry_with_backoff(config)
        def successful_function():
            call_count[0] += 1
            return "success"
        
        result = successful_function()
        
        self.assertEqual(result, "success")
        self.assertEqual(call_count[0], 1)  # Called only once
    
    def test_retry_on_exception(self):
        """Test that function retries on exception."""
        config = RetryConfig(max_retries=2, base_delay=0.01)
        
        call_count = [0]
        
        @retry_with_backoff(config)
        def failing_function():
            call_count[0] += 1
            if call_count[0] < 3:
                # Simulate rate limit error
                error = Exception("Rate limited")
                error.status_code = 429
                raise error
            return "success"
        
        result = failing_function()
        
        self.assertEqual(result, "success")
        self.assertEqual(call_count[0], 3)  # Initial + 2 retries
    
    def test_max_retries_exhausted(self):
        """Test that function raises after max retries."""
        config = RetryConfig(max_retries=2, base_delay=0.01)
        
        @retry_with_backoff(config)
        def always_failing():
            error = Exception("Always fails")
            error.status_code = 429
            raise error
        
        with self.assertRaises(Exception):
            always_failing()
    
    def test_no_retry_on_non_retryable_error(self):
        """Test that non-retryable errors don't retry."""
        config = RetryConfig(max_retries=3)
        
        call_count = [0]
        
        @retry_with_backoff(config)
        def non_retryable_error():
            call_count[0] += 1
            error = Exception("Client error")
            error.status_code = 400
            raise error
        
        with self.assertRaises(Exception):
            non_retryable_error()
        
        self.assertEqual(call_count[0], 1)  # No retries


if __name__ == '__main__':
    unittest.main()
