# Authentication Tests

This directory contains tests for the cookie-based authentication system (Phase C).

## Test Files

### Unit Tests (Jest - when available)

- **auth-cookies.test.js** - Token manager unit tests
  - Cookie generation
  - Token extraction from cookies/headers
  - Token verification
  - Cookie flag validation

- **auth-endpoints.test.js** - Auth endpoint integration tests
  - Login flow with cookies
  - Refresh token rotation
  - Logout cookie clearing
  - Header fallback authentication

### Integration Tests (Shell)

- **../test-cookie-auth.sh** - End-to-end cookie auth tests
  - Full authentication flow
  - Cookie persistence
  - Token rotation
  - Error handling

## Running Tests

### Manual Integration Tests

Run the shell script against a running API:

```bash
# Against local development server
cd serverless
./test-cookie-auth.sh

# Against staging
API_BASE=https://api-staging.valine.com ./test-cookie-auth.sh

# Against production (be careful!)
API_BASE=https://api.valine.com ./test-cookie-auth.sh
```

### Unit Tests (when Jest is configured)

```bash
cd serverless
npm install  # Install dependencies first
npm test tests/auth-cookies.test.js
npm test tests/auth-endpoints.test.js
```

## Test Coverage

### Covered Scenarios

✅ User registration with cookie auth  
✅ Login sets HttpOnly cookies  
✅ Access token cookie has correct flags  
✅ Refresh token cookie has correct flags  
✅ Protected routes work with cookie auth  
✅ Token refresh rotates both tokens  
✅ Logout clears cookies  
✅ Authorization header fallback works  
✅ Invalid credentials rejected  
✅ Missing tokens rejected  
✅ Expired tokens handled (in unit tests)  
✅ Cookie priority over header  

### Security Checks

✅ Tokens not in response body  
✅ HttpOnly flag prevents JS access  
✅ SameSite=Lax for CSRF protection  
✅ Secure flag in production  
✅ Token rotation on refresh  
✅ Cookies cleared on logout  

## Manual Testing

### Using cURL

See [docs/security/cookie_auth.md](../../docs/security/cookie_auth.md) for detailed cURL examples.

Quick test:

```bash
# Login and save cookies
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt \
  -v

# Use cookies for authenticated request
curl http://localhost:3001/auth/me \
  -b cookies.txt \
  -v

# Refresh tokens
curl -X POST http://localhost:3001/auth/refresh \
  -b cookies.txt \
  -c cookies.txt \
  -v

# Logout
curl -X POST http://localhost:3001/auth/logout \
  -b cookies.txt \
  -v
```

### Using Browser DevTools

1. Open Network tab
2. Login to the application
3. Check Response Headers for `Set-Cookie`
4. Verify cookies in Application > Cookies
5. Look for:
   - `access_token` (HttpOnly, Secure in prod, SameSite=Lax)
   - `refresh_token` (HttpOnly, Secure in prod, SameSite=Lax)

## Troubleshooting

### Tests Fail: Connection Refused

**Problem:** Cannot connect to API

**Solution:**
1. Start the local API server
2. Check API_BASE environment variable
3. Verify port is correct (default: 3001)

### Tests Fail: Cookies Not Set

**Problem:** Login succeeds but cookies not in file

**Solution:**
1. Check serverless deployment
2. Verify tokenManager.js is deployed
3. Check server logs for errors
4. Ensure multiValueHeaders is supported

### Tests Fail: 401 Unauthorized

**Problem:** Cookie auth not working

**Solution:**
1. Check CORS configuration allows credentials
2. Verify JWT_SECRET is set
3. Check token expiration times
4. Review server logs for token validation errors

## Adding New Tests

### Unit Test Template

```javascript
import { describe, it, expect } from '@jest/globals';
import { yourFunction } from '../src/utils/tokenManager.js';

describe('Your Feature', () => {
  it('should do something', () => {
    const result = yourFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Integration Test Template

```bash
echo "Test: Your test name"
RESPONSE=$(curl -s "$API_BASE/your/endpoint" \
  -b "$COOKIES_FILE" \
  -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Test passed"
else
  echo "✗ Test failed"
fi
```

## CI/CD Integration

These tests can be integrated into CI/CD:

```yaml
# .github/workflows/test-auth.yml
- name: Test Cookie Auth
  run: |
    cd serverless
    # Start server in background
    npm start &
    sleep 5
    # Run tests
    ./test-cookie-auth.sh
    # Stop server
    kill %1
```

## References

- [Cookie Auth Documentation](../../docs/security/cookie_auth.md)
- [Epic Playbook Phase C](.github/agents/github_agents_HIGH_IMPACT_EPIC_PLAYBOOK.md)
- [Token Manager Source](../src/utils/tokenManager.js)
- [Auth Handler Source](../src/handlers/auth.js)
