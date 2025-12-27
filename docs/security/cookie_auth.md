# Cookie-Based Authentication

**Phase C Implementation: HttpOnly Cookie Auth + Refresh Token Rotation**

## Overview

Project Valine implements secure, HttpOnly cookie-based authentication with automatic token rotation. This approach significantly improves security compared to storing JWTs in localStorage by preventing XSS attacks from accessing authentication tokens.

## Architecture

### Token Types

1. **Access Token** (Short-lived: 30 minutes)
   - Stored in HttpOnly cookie: `access_token`
   - Used for authenticating API requests
   - Cannot be accessed by JavaScript
   - Type: `access` in JWT payload

2. **Refresh Token** (Long-lived: 7 days)
   - Stored in HttpOnly cookie: `refresh_token`
   - Used to obtain new access tokens
   - Includes unique `jti` (JWT ID) for rotation tracking
   - Type: `refresh` in JWT payload

### Cookie Flags

All authentication cookies use the following security flags:

```
HttpOnly    - Prevents JavaScript access (XSS protection)
Secure      - HTTPS only (enabled in production)
SameSite    - Lax (CSRF protection)
Path        - / (available to all routes)
Max-Age     - Token lifetime in seconds
Domain      - Configurable via COOKIE_DOMAIN env var (optional)
```

#### Cookie Configuration by Environment

**Development:**
```
access_token=<jwt>; HttpOnly; Path=/; SameSite=Lax; Max-Age=1800
refresh_token=<jwt>; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800
```

**Production:**
```
access_token=<jwt>; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=1800; Domain=.yourdomain.com
refresh_token=<jwt>; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=604800; Domain=.yourdomain.com
```

## Authentication Flow

### 1. Login Flow

```
Client                    API                     Database
  |                        |                          |
  |--- POST /auth/login -->|                          |
  |   {email, password}    |                          |
  |                        |--- Verify credentials -->|
  |                        |<-- User data ------------|
  |                        |                          |
  |                        |--- Generate tokens ------|
  |                        |                          |
  |<-- Set-Cookie ---------|                          |
  |    access_token        |                          |
  |    refresh_token       |                          |
  |    {user}              |                          |
```

**Request:**
```powershell
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"user@example.com","password":"secret"}' -ContentType 'application/json'```

**Response Headers:**
```
Set-Cookie: access_token=<jwt>; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=1800
Set-Cookie: refresh_token=<jwt>; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=604800
```

**Response Body:**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "username": "johndoe",
    "displayName": "John Doe"
  }
}
```

**Note:** No `token` field in response body - tokens are in cookies only.

### 2. Authenticated Requests

```
Client                    API                     
  |                        |                     
  |--- GET /auth/me ------>|                     
  |   Cookie: access_token |                     
  |                        |--- Verify token     
  |                        |                     
  |<-- {user} -------------|                     
```

**Request:**
```powershell
Invoke-RestMethod -Uri "https://api.valine.com/auth/me" -Method Get```

The API automatically extracts the access token from the cookie header.

### 3. Token Refresh Flow

```
Client                    API                     
  |                        |                     
  |--- POST /auth/refresh->|                     
  |   Cookie: refresh_token|                     
  |                        |--- Verify refresh token
  |                        |--- Generate new tokens
  |                        |                     
  |<-- Set-Cookie ---------|                     
  |    access_token (new)  |                     
  |    refresh_token (new) |                     
```

**Request:**
```powershell
Invoke-RestMethod -Uri "-X" -Method Post```

**Response Headers:**
```
Set-Cookie: access_token=<new-jwt>; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=1800
Set-Cookie: refresh_token=<new-jwt>; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=604800
```

**Token Rotation:** Each refresh generates both a new access token AND a new refresh token. This prevents refresh token reuse attacks.

### 4. Logout Flow

```
Client                    API                     
  |                        |                     
  |--- POST /auth/logout ->|                     
  |                        |                     
  |<-- Set-Cookie ---------|                     
  |    (clear cookies)     |                     
```

**Request:**
```powershell
Invoke-RestMethod -Uri "-X" -Method Post```

**Response Headers:**
```
Set-Cookie: access_token=; Path=/; SameSite=Lax; Max-Age=0
Set-Cookie: refresh_token=; Path=/; SameSite=Lax; Max-Age=0
```

## CSRF Protection

### SameSite Cookie Attribute

We use `SameSite=Lax` on all authentication cookies, which provides baseline CSRF protection:

- **Lax:** Cookies are sent with top-level navigations and same-site requests
- Prevents most CSRF attacks while allowing normal navigation
- Balances security and usability

### Additional CSRF Headers

For state-changing requests (POST, PUT, DELETE), the frontend adds:

```
X-Requested-With: XMLHttpRequest
```

This header:
- Cannot be set by cross-origin requests without CORS
- Provides additional verification that requests are from our frontend
- Acts as a custom CSRF token

### Why Not Double-Submit Cookie?

We opted for `SameSite=Lax` + custom header instead of double-submit cookie because:
1. Simpler implementation
2. Adequate protection for our threat model
3. SameSite is now widely supported
4. Reduces cookie payload size

## Authorization Header Fallback

For backward compatibility and tooling support (CLI, testing), the API also accepts:

```
Authorization: Bearer <access-token>
```

**Priority:**
1. Cookie-based authentication (preferred)
2. Authorization header (fallback)

This allows developers to test with tools like curl or Postman while production clients use secure cookies.

## Environment Variables

### Backend (serverless/.env)

```powershell
# JWT signing secret (REQUIRED - use strong random value in production)
JWT_SECRET=your-secret-key-change-in-production

# Node environment (affects cookie Secure flag)
NODE_ENV=production

# Cookie domain for cross-subdomain auth (optional)
# Leave empty for same-domain cookies
# Set to .yourdomain.com for subdomain sharing
COOKIE_DOMAIN=

# Frontend URL for CORS
FRONTEND_URL=https://app.yourdomain.com
```

### Frontend (client/.env)

```powershell
# Enable cookie-based authentication
VITE_ENABLE_AUTH=true

# API base URL
VITE_API_BASE=https://api.yourdomain.com

# Not needed for cookie auth (deprecated)
# VITE_API_USE_CREDENTIALS=true
```

## Security Considerations

### ✅ Protections Enabled

1. **XSS Protection:** HttpOnly cookies cannot be accessed by JavaScript
2. **CSRF Protection:** SameSite=Lax + X-Requested-With header
3. **HTTPS Enforcement:** Secure flag in production
4. **Token Rotation:** Refresh tokens are single-use
5. **Short Token Lifetime:** Access tokens expire in 30 minutes
6. **Refresh Token Binding:** Each refresh generates new tokens

### ⚠️ Important Security Notes

1. **Always use HTTPS in production** - The Secure flag requires it
2. **Keep JWT_SECRET secret** - Use environment variables, never commit
3. **Monitor for token abuse** - Implement rate limiting (see Phase D)
4. **Consider token blacklisting** - For immediate revocation if needed
5. **Use strong passwords** - Enforce password requirements

### 🔒 Threat Model

**Protected Against:**
- XSS attacks stealing tokens
- Basic CSRF attacks
- Token interception on HTTP (with Secure flag)
- Token replay after logout (cookies are cleared)

**Additional Considerations:**
- Subdomain attacks (if COOKIE_DOMAIN is set too broadly)
- Compromised refresh tokens (implement detection)
- Man-in-the-middle on non-HTTPS (mitigated with Secure flag)

## Migration Path from Header-Based Auth

### Phase 1: Dual Support (Current)

Both cookie and header authentication work:

```javascript
// Old way (still works)
Authorization: Bearer <token>

// New way (preferred)
Cookie: access_token=<token>
```

### Phase 2: Cookie-Only (Future)

1. Set `VITE_ENABLE_AUTH=true` in production
2. Frontend stops using localStorage
3. Monitor for any breaking integrations
4. Remove Authorization header support after migration period

### Code Changes Required

**Frontend:**
```javascript
// Before
localStorage.setItem('auth_token', data.token);

// After (VITE_ENABLE_AUTH=true)
// Tokens automatically stored in cookies, no localStorage
```

**API Clients:**
```javascript
// Before
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// After
axios.defaults.withCredentials = true; // Send cookies
```

## Testing

### Manual Testing with cURL

**Login:**
```powershell
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"test@example.com","password":"password"}' -ContentType 'application/json'```

**Authenticated Request:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/auth/me" -Method Get```

**Refresh Token:**
```powershell
Invoke-RestMethod -Uri "-X" -Method Post```

**Logout:**
```powershell
Invoke-RestMethod -Uri "-X" -Method Post```

### Automated Tests

Run the test suite:

```powershell
cd serverless
npm test tests/auth-cookies.test.js
npm test tests/auth-endpoints.test.js
```

## Troubleshooting

### Cookies Not Being Set

**Symptom:** Login succeeds but subsequent requests are unauthorized

**Solutions:**
1. Check CORS configuration allows credentials
2. Verify `withCredentials: true` in frontend
3. Ensure frontend and backend are on compatible domains
4. Check browser console for SameSite warnings

### Cookies Not Being Sent

**Symptom:** Requests don't include auth cookies

**Solutions:**
1. Verify `withCredentials: true` in axios config
2. Check CORS `Access-Control-Allow-Credentials: true`
3. Ensure cookies aren't blocked by browser settings
4. Verify SameSite attribute compatibility

### Token Expired Issues

**Symptom:** Frequent 401 errors

**Solutions:**
1. Implement automatic token refresh on 401
2. Refresh tokens proactively before expiry
3. Check server time sync (JWT exp uses server time)

### Cross-Domain Issues

**Symptom:** Cookies work on same domain but not subdomains

**Solutions:**
1. Set `COOKIE_DOMAIN=.yourdomain.com`
2. Ensure all subdomains use HTTPS
3. Verify SameSite settings allow your use case

## API Reference

### POST /auth/login

Authenticate user and set auth cookies.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secretpassword"
}
```

**Response:**
- Status: 200 OK
- Headers: `Set-Cookie: access_token=...; Set-Cookie: refresh_token=...`
- Body:
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "username": "johndoe",
    "displayName": "John Doe",
    "avatar": "https://...",
    "emailVerified": true
  }
}
```

### POST /auth/refresh

Rotate tokens and issue new access/refresh tokens.

**Request:** (no body, uses refresh_token cookie)

**Response:**
- Status: 200 OK
- Headers: `Set-Cookie: access_token=...; Set-Cookie: refresh_token=...`
- Body:
```json
{
  "message": "Token refreshed successfully"
}
```

### POST /auth/logout

Clear authentication cookies.

**Request:** (no body)

**Response:**
- Status: 200 OK
- Headers: `Set-Cookie: access_token=; Max-Age=0; Set-Cookie: refresh_token=; Max-Age=0`
- Body:
```json
{
  "message": "Logged out successfully"
}
```

### GET /auth/me

Get current user (requires authentication).

**Request:** (uses access_token cookie or Authorization header)

**Response:**
- Status: 200 OK
- Body:
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "username": "johndoe",
    "displayName": "John Doe",
    "bio": "...",
    "avatar": "https://...",
    "emailVerified": true
  }
}
```

## References

- [OWASP: Cross-Site Scripting (XSS)](https://owasp.org/www-community/attacks/xss/)
- [OWASP: Cross-Site Request Forgery (CSRF)](https://owasp.org/www-community/attacks/csrf)
- [MDN: SameSite cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [RFC 6265: HTTP State Management Mechanism](https://tools.ietf.org/html/rfc6265)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review test files for usage examples
3. Open an issue in the repository
