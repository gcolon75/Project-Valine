"""
Configuration for deploy verification.
Defines workflow patterns, timeouts, and step matching rules.
"""

# GitHub Actions workflow configuration
WORKFLOW_NAME = "Client Deploy"
TARGET_BRANCH = "main"

# Step name patterns (regex patterns for matching)
STEP_PATTERNS = {
    'build': r'(?i)(build|vite build|npm run build|yarn build)',
    's3_sync': r'(?i)(s3 sync|aws s3 sync|upload|sync to s3)',
    'cloudfront_invalidation': r'(?i)(cloudfront.*invalidat|invalidat.*cloudfront)'
}

# HTTP check configuration
HTTP_TIMEOUT_SECONDS = 10
HTTP_MAX_RETRIES = 1
HTTP_RETRY_DELAY_SECONDS = 2

# Frontend endpoints to check
FRONTEND_ENDPOINTS = ['/', '/index.html']

# API endpoints to check
API_ENDPOINTS = ['/health', '/hello']

# Discord message colors
COLOR_SUCCESS = 0x00FF00  # Green
COLOR_FAILURE = 0xFF0000  # Red
COLOR_WARNING = 0xFFAA00  # Orange

# Cache-Control validation
EXPECTED_CACHE_CONTROL_PATTERN = r'(?i)no-cache'
