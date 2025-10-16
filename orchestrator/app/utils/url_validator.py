"""
URL validation utility with security guardrails.
Enforces https, domain allowlists, and rejects private IPs/localhost.
"""
import os
import re
from urllib.parse import urlparse


class URLValidator:
    """Validates URLs with security constraints."""

    def __init__(self):
        """Initialize validator with configuration from environment."""
        # Optional domain allowlist (comma-separated)
        self.allowed_domains = os.environ.get('ALLOWED_DOMAINS', '').split(',')
        self.allowed_domains = [d.strip() for d in self.allowed_domains if d.strip()]

        # Feature flag to allow localhost/local IPs in non-production
        self.allow_local = os.environ.get('SAFE_LOCAL', 'false').lower() == 'true'

    def validate_url(self, url):
        """
        Validate a URL against security rules.

        Args:
            url: URL string to validate

        Returns:
            dict with 'valid' (bool), 'message' (str), and 'url' (str if valid)
        """
        if not url or not isinstance(url, str):
            return {
                'valid': False,
                'message': 'URL is required and must be a string'
            }

        # Parse URL
        try:
            parsed = urlparse(url)
        except Exception as e:
            return {
                'valid': False,
                'message': f'Invalid URL format: {str(e)}'
            }

        # Must have https scheme
        if parsed.scheme != 'https':
            return {
                'valid': False,
                'message': 'URL must use https scheme'
            }

        # Must have a hostname
        if not parsed.hostname:
            return {
                'valid': False,
                'message': 'URL must have a valid hostname'
            }

        hostname = parsed.hostname.lower()

        # Check for localhost and local IPs (reject unless SAFE_LOCAL is enabled)
        if not self.allow_local:
            if hostname in ['localhost', '127.0.0.1', '::1']:
                return {
                    'valid': False,
                    'message': 'Localhost URLs are not allowed'
                }

            # Check for private IP ranges (basic check)
            if self._is_private_ip(hostname):
                return {
                    'valid': False,
                    'message': 'Private IP addresses are not allowed'
                }

        # Check domain allowlist if configured
        if self.allowed_domains:
            if not self._matches_allowed_domain(hostname):
                return {
                    'valid': False,
                    'message': f'Domain not in allowlist. Allowed domains: {", ".join(self.allowed_domains)}'
                }

        return {
            'valid': True,
            'message': 'URL is valid',
            'url': url
        }

    def _is_private_ip(self, hostname):
        """
        Check if hostname is a private IP address.
        Basic check for common private ranges.
        """
        # Match IP addresses
        ip_pattern = r'^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$'
        match = re.match(ip_pattern, hostname)

        if not match:
            return False

        octets = [int(match.group(i)) for i in range(1, 5)]

        # Check private ranges
        # 10.0.0.0/8
        if octets[0] == 10:
            return True

        # 172.16.0.0/12
        if octets[0] == 172 and 16 <= octets[1] <= 31:
            return True

        # 192.168.0.0/16
        if octets[0] == 192 and octets[1] == 168:
            return True

        return False

    def _matches_allowed_domain(self, hostname):
        """
        Check if hostname matches any allowed domain pattern.
        Supports wildcard patterns like *.example.com
        """
        for allowed in self.allowed_domains:
            # Handle wildcard patterns
            if allowed.startswith('*.'):
                # Match if hostname ends with the domain (without the *)
                domain_suffix = allowed[1:]  # Remove *
                if hostname.endswith(domain_suffix) or hostname == allowed[2:]:
                    return True
            else:
                # Exact match
                if hostname == allowed:
                    return True

        return False
