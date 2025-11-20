/**
 * Shared test environment setup
 * Sets production-like environment variables for cookie/CORS tests
 */

// Set production environment for cookie/CORS hardening tests
process.env.NODE_ENV = 'production';
process.env.FRONTEND_URL = 'https://dkmxy676d3vgc.cloudfront.net';
process.env.COOKIE_DOMAIN = 'dkmxy676d3vgc.cloudfront.net';

// Auth configuration
process.env.JWT_SECRET = 'test-secret-key-for-jwt-signing-min-32-chars-long';
process.env.JWT_ACCESS_EXPIRY = '30m';
process.env.JWT_REFRESH_EXPIRY = '7d';

// Allowlist configuration
process.env.ALLOWED_USER_EMAILS = 'ghawk075@gmail.com,test@example.com';
process.env.ENABLE_REGISTRATION = 'false';
process.env.STRICT_ALLOWLIST = '0'; // Disabled for tests (some tests set smaller allowlists)

// Feature flags
process.env.ANALYTICS_ENABLED = 'true';
process.env.ANALYTICS_PERSIST = 'true';
process.env.REPORTS_ENABLED = 'true';
process.env.MODERATION_ENABLED = 'true';

// Admin configuration
process.env.ADMIN_ROLE_IDS = 'admin-user-123';

// Database (will be mocked in tests)
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';

console.log('[setup-env] Test environment configured (NODE_ENV=production)');
