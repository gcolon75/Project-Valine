"""
Retry utilities with exponential backoff and jitter for API calls.

Handles rate limiting (429) and server errors (5xx) with smart retry logic.
Supports token pool rotation for high-throughput scenarios.
"""

import time
import random
import os
from typing import Callable, Optional, Any, List
from functools import wraps


class RetryConfig:
    """Configuration for retry behavior."""
    
    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True
    ):
        """
        Initialize retry configuration.
        
        Args:
            max_retries: Maximum number of retry attempts
            base_delay: Base delay in seconds before first retry
            max_delay: Maximum delay in seconds between retries
            exponential_base: Base for exponential backoff calculation
            jitter: Whether to add random jitter to delays
        """
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
    
    @classmethod
    def from_env(cls) -> 'RetryConfig':
        """Create configuration from environment variables."""
        return cls(
            max_retries=int(os.getenv('GITHUB_API_MAX_RETRIES', '3')),
            base_delay=float(os.getenv('GITHUB_API_BASE_DELAY', '1.0')),
            max_delay=float(os.getenv('GITHUB_API_MAX_DELAY', '60.0')),
            exponential_base=float(os.getenv('GITHUB_API_EXPONENTIAL_BASE', '2.0')),
            jitter=os.getenv('GITHUB_API_JITTER', 'true').lower() == 'true'
        )


class TokenPool:
    """Token pool for rotation across multiple GitHub API tokens."""
    
    def __init__(self, tokens: Optional[List[str]] = None):
        """
        Initialize token pool.
        
        Args:
            tokens: List of GitHub API tokens
        """
        if tokens:
            self.tokens = tokens
        else:
            # Try to load from environment
            token_str = os.getenv('GITHUB_API_TOKEN_POOL', '')
            if token_str:
                self.tokens = [t.strip() for t in token_str.split(',') if t.strip()]
            else:
                # Fallback to single token
                single_token = os.getenv('GITHUB_TOKEN', '')
                self.tokens = [single_token] if single_token else []
        
        self.current_index = 0
        self.token_failures = {token: 0 for token in self.tokens}
    
    def get_token(self) -> Optional[str]:
        """
        Get next available token from the pool.
        
        Returns:
            GitHub API token or None if no tokens available
        """
        if not self.tokens:
            return None
        
        # Simple round-robin selection
        token = self.tokens[self.current_index]
        self.current_index = (self.current_index + 1) % len(self.tokens)
        return token
    
    def mark_token_failed(self, token: str):
        """
        Mark a token as having failed (e.g., rate limited).
        
        Args:
            token: The token that failed
        """
        if token in self.token_failures:
            self.token_failures[token] += 1
    
    def get_best_token(self) -> Optional[str]:
        """
        Get the token with the fewest failures.
        
        Returns:
            Best available token or None
        """
        if not self.tokens:
            return None
        
        # Sort by failure count and return the best one
        best_token = min(self.tokens, key=lambda t: self.token_failures.get(t, 0))
        return best_token
    
    def size(self) -> int:
        """Get number of tokens in pool."""
        return len(self.tokens)


def calculate_delay(
    attempt: int,
    config: RetryConfig,
    rate_limit_reset: Optional[int] = None
) -> float:
    """
    Calculate delay before next retry with exponential backoff and jitter.
    
    Args:
        attempt: Current attempt number (0-indexed)
        config: Retry configuration
        rate_limit_reset: Optional Unix timestamp when rate limit resets
        
    Returns:
        Delay in seconds
    """
    # If rate limit reset time is provided, wait until then
    if rate_limit_reset:
        wait_time = rate_limit_reset - time.time()
        if wait_time > 0:
            # Add 1 second buffer
            return min(wait_time + 1, config.max_delay)
    
    # Calculate exponential backoff
    delay = config.base_delay * (config.exponential_base ** attempt)
    
    # Cap at max delay
    delay = min(delay, config.max_delay)
    
    # Add jitter to prevent thundering herd
    if config.jitter:
        # Add random jitter of ±25%
        jitter_amount = delay * 0.25
        delay = delay + random.uniform(-jitter_amount, jitter_amount)
    
    return max(0, delay)


def should_retry(exception: Exception, status_code: Optional[int] = None) -> bool:
    """
    Determine if an exception should trigger a retry.
    
    Args:
        exception: The exception that occurred
        status_code: Optional HTTP status code
        
    Returns:
        True if should retry, False otherwise
    """
    # Retry on rate limit errors (429)
    if status_code == 429:
        return True
    
    # Retry on server errors (5xx)
    if status_code and 500 <= status_code < 600:
        return True
    
    # Retry on specific exception types
    retry_exceptions = (
        'ConnectionError',
        'Timeout',
        'ReadTimeout',
        'ConnectTimeout',
        'HTTPError',
    )
    
    exception_name = type(exception).__name__
    return exception_name in retry_exceptions


def extract_rate_limit_reset(response: Any) -> Optional[int]:
    """
    Extract rate limit reset time from response headers.
    
    Args:
        response: HTTP response object
        
    Returns:
        Unix timestamp when rate limit resets, or None
    """
    try:
        # Try to get from headers
        if hasattr(response, 'headers'):
            reset_time = response.headers.get('X-RateLimit-Reset')
            if reset_time:
                return int(reset_time)
    except (ValueError, AttributeError, TypeError):
        pass
    
    return None


def retry_with_backoff(
    config: Optional[RetryConfig] = None,
    token_pool: Optional[TokenPool] = None
):
    """
    Decorator to retry function calls with exponential backoff.
    
    Args:
        config: Retry configuration (uses env vars if None)
        token_pool: Optional token pool for rotation
        
    Returns:
        Decorated function
        
    Example:
        @retry_with_backoff()
        def call_github_api():
            # API call code
            pass
    """
    if config is None:
        config = RetryConfig.from_env()
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            last_exception = None
            current_token = None
            
            for attempt in range(config.max_retries + 1):
                try:
                    # Rotate token if pool is available
                    if token_pool and token_pool.size() > 0:
                        current_token = token_pool.get_token()
                        # Inject token into kwargs if function accepts it
                        if 'token' in kwargs or 'github_token' in kwargs:
                            kwargs['token'] = current_token
                    
                    # Execute the function
                    return func(*args, **kwargs)
                    
                except Exception as e:
                    last_exception = e
                    
                    # Extract status code if available
                    status_code = None
                    if hasattr(e, 'response') and hasattr(e.response, 'status_code'):
                        status_code = e.response.status_code
                    elif hasattr(e, 'status_code'):
                        status_code = e.status_code
                    
                    # Check if we should retry
                    if attempt >= config.max_retries or not should_retry(e, status_code):
                        raise
                    
                    # Mark token as failed if rate limited
                    if status_code == 429 and current_token and token_pool:
                        token_pool.mark_token_failed(current_token)
                    
                    # Extract rate limit reset time
                    rate_limit_reset = None
                    if hasattr(e, 'response'):
                        rate_limit_reset = extract_rate_limit_reset(e.response)
                    
                    # Calculate delay
                    delay = calculate_delay(attempt, config, rate_limit_reset)
                    
                    # Log retry attempt
                    print(
                        f"Retry attempt {attempt + 1}/{config.max_retries} "
                        f"after {delay:.2f}s delay. Error: {str(e)}"
                    )
                    
                    # Wait before retrying
                    time.sleep(delay)
            
            # If we exhausted all retries, raise the last exception
            if last_exception:
                raise last_exception
        
        return wrapper
    return decorator


class RetryableGitHubClient:
    """
    Wrapper for GitHub client with built-in retry logic.
    
    Example:
        client = RetryableGitHubClient(github_service)
        result = client.call('get_repository', owner='foo', repo='bar')
    """
    
    def __init__(
        self,
        github_service: Any,
        config: Optional[RetryConfig] = None,
        token_pool: Optional[TokenPool] = None
    ):
        """
        Initialize retryable GitHub client.
        
        Args:
            github_service: GitHub service instance
            config: Retry configuration
            token_pool: Optional token pool
        """
        self.github_service = github_service
        self.config = config or RetryConfig.from_env()
        self.token_pool = token_pool or TokenPool()
    
    def call(self, method_name: str, *args, **kwargs) -> Any:
        """
        Call a GitHub service method with retry logic.
        
        Args:
            method_name: Name of the method to call
            *args: Positional arguments for the method
            **kwargs: Keyword arguments for the method
            
        Returns:
            Method return value
        """
        @retry_with_backoff(self.config, self.token_pool)
        def _call():
            method = getattr(self.github_service, method_name)
            return method(*args, **kwargs)
        
        return _call()
