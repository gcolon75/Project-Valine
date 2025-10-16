"""
HTTP health checker for frontend and API endpoints.
Performs HTTP checks with timeouts and retries.
"""
import re
import time
import requests
from app.config.verification_config import (
    HTTP_TIMEOUT_SECONDS,
    HTTP_MAX_RETRIES,
    HTTP_RETRY_DELAY_SECONDS,
    FRONTEND_ENDPOINTS,
    API_ENDPOINTS,
    EXPECTED_CACHE_CONTROL_PATTERN
)


class HTTPChecker:
    """Performs HTTP health checks on frontend and API endpoints."""

    def __init__(self, timeout=None, max_retries=None):
        """
        Initialize HTTP checker.

        Args:
            timeout: Request timeout in seconds (default: from config)
            max_retries: Maximum number of retries (default: from config)
        """
        self.timeout = timeout or HTTP_TIMEOUT_SECONDS
        self.max_retries = max_retries or HTTP_MAX_RETRIES

    def check_endpoint(self, base_url, endpoint, method='GET'):
        """
        Check a single endpoint with retries.

        Args:
            base_url: Base URL (without trailing slash)
            endpoint: Endpoint path (with leading slash)
            method: HTTP method (GET or HEAD)

        Returns:
            Dictionary with status, response_time_ms, headers, error
        """
        url = f"{base_url.rstrip('/')}{endpoint}"
        result = {
            'url': url,
            'status_code': None,
            'response_time_ms': None,
            'headers': {},
            'error': None,
            'success': False
        }

        for attempt in range(self.max_retries + 1):
            try:
                start_time = time.time()

                if method.upper() == 'HEAD':
                    response = requests.head(
                        url,
                        timeout=self.timeout,
                        allow_redirects=True
                    )
                else:
                    response = requests.get(
                        url,
                        timeout=self.timeout,
                        allow_redirects=True
                    )

                end_time = time.time()
                response_time_ms = round((end_time - start_time) * 1000, 0)

                result['status_code'] = response.status_code
                result['response_time_ms'] = response_time_ms
                result['headers'] = dict(response.headers)
                result['success'] = 200 <= response.status_code < 300

                return result

            except requests.exceptions.Timeout:
                result['error'] = f'Timeout after {self.timeout}s'
            except requests.exceptions.ConnectionError as e:
                result['error'] = f'Connection error: {str(e)}'
            except requests.exceptions.RequestException as e:
                result['error'] = f'Request error: {str(e)}'

            # Retry with delay if not last attempt
            if attempt < self.max_retries:
                time.sleep(HTTP_RETRY_DELAY_SECONDS)

        return result

    def check_frontend(self, frontend_base_url):
        """
        Check frontend endpoints.

        Args:
            frontend_base_url: Frontend base URL

        Returns:
            Dictionary with results for each endpoint
        """
        if not frontend_base_url:
            return {
                'error': 'Frontend base URL not provided',
                'endpoints': {}
            }

        # Ensure URL has protocol
        if not frontend_base_url.startswith('http'):
            frontend_base_url = f'https://{frontend_base_url}'

        results = {
            'base_url': frontend_base_url,
            'endpoints': {},
            'all_success': True
        }

        for endpoint in FRONTEND_ENDPOINTS:
            check_result = self.check_endpoint(frontend_base_url, endpoint)
            results['endpoints'][endpoint] = check_result

            if not check_result['success']:
                results['all_success'] = False

        return results

    def check_api(self, api_base_url):
        """
        Check API endpoints.

        Args:
            api_base_url: API base URL

        Returns:
            Dictionary with results for each endpoint
        """
        if not api_base_url:
            return {
                'error': 'API base URL not provided',
                'endpoints': {}
            }

        # Ensure URL has protocol
        if not api_base_url.startswith('http'):
            api_base_url = f'https://{api_base_url}'

        results = {
            'base_url': api_base_url,
            'endpoints': {},
            'all_success': True
        }

        for endpoint in API_ENDPOINTS:
            check_result = self.check_endpoint(api_base_url, endpoint)
            results['endpoints'][endpoint] = check_result

            if not check_result['success']:
                results['all_success'] = False

        return results

    def validate_cache_control(self, headers):
        """
        Check if Cache-Control header matches expected pattern.

        Args:
            headers: Dictionary of response headers

        Returns:
            Tuple (is_valid, cache_control_value)
        """
        cache_control = headers.get('Cache-Control', headers.get('cache-control', ''))

        if not cache_control:
            return False, None

        is_valid = bool(re.search(EXPECTED_CACHE_CONTROL_PATTERN, cache_control))
        return is_valid, cache_control

    def format_status_code(self, status_code):
        """
        Format status code for display.

        Args:
            status_code: HTTP status code

        Returns:
            Formatted string with emoji
        """
        if status_code is None:
            return '❌ Error'
        elif 200 <= status_code < 300:
            return f'✅ {status_code} OK'
        elif 300 <= status_code < 400:
            return f'⚠️ {status_code} Redirect'
        elif 400 <= status_code < 500:
            return f'❌ {status_code} Client Error'
        elif 500 <= status_code < 600:
            return f'❌ {status_code} Server Error'
        else:
            return f'❌ {status_code}'
