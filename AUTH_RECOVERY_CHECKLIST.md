# Authentication Recovery Checklist

This checklist helps diagnose and fix common authentication and login issues in Project Valine.

## Quick Diagnostics

### 1. Check Prisma Client Availability

**Symptom**: `PrismaClientInitializationError` or "Query engine not found"

**Solution**:
```bash
cd serverless
npm run prisma:generate
```

**Verify**:
- Check that `node_modules/@prisma/client` exists
- Verify `schema.prisma` includes your platform in `binaryTargets`:
  ```prisma
  generator client {
    provider = "prisma-client-js"
    binaryTargets = ["native", "rhel-openssl-3.0.x", "windows", "darwin", "darwin-arm64"]
  }
  ```

### 2. Check Allowlist Configuration

**Symptom**: Login returns `403 Access denied: email not in allowlist`

**Verify Environment**:
```bash
# Check allowlist in serverless/.env or environment
grep ALLOWED_USER_EMAILS serverless/.env

# Expected format (comma-separated, case-insensitive):
ALLOWED_USER_EMAILS=ghawk075@gmail.com,test@example.com
```

**Check Strict Mode**:
```bash
grep STRICT_ALLOWLIST serverless/.env
```
- `STRICT_ALLOWLIST=1` requires at least 2 emails in allowlist
- `STRICT_ALLOWLIST=0` allows any size allowlist (recommended for dev/testing)

**Common Fixes**:
- Email not in list → Add to `ALLOWED_USER_EMAILS`
- Empty allowlist → Add at least owner email
- Strict mode error (503) → Set `STRICT_ALLOWLIST=0` or add 2+ emails

### 3. Check Registration Settings

**Symptom**: Registration returns `403 Registration not permitted`

**Verify**:
```bash
grep ENABLE_REGISTRATION serverless/.env
```

**Configuration**:
- `ENABLE_REGISTRATION=false` (default): Only allowlisted emails can register
- `ENABLE_REGISTRATION=true`: Anyone can register (not recommended for production)

**Owner Registration Flow**:
1. Set `ALLOWED_USER_EMAILS=ghawk075@gmail.com`
2. Set `ENABLE_REGISTRATION=false`  
3. Register with owner email
4. Subsequent logins work automatically

### 4. Check Cookie Configuration

**Symptom**: Login succeeds but cookies not set / frontend loses authentication

**Verify Production Settings**:
```bash
grep NODE_ENV .env
grep COOKIE_DOMAIN .env
```

**Expected**:
- **Development**: `NODE_ENV=development`, no `COOKIE_DOMAIN` → SameSite=Lax
- **Production**: `NODE_ENV=production`, `COOKIE_DOMAIN=your-domain.com` → SameSite=Strict + Secure

**Common Issues**:
- Localhost: Don't set `COOKIE_DOMAIN` (use default same-domain)
- HTTPS required: Production cookies require HTTPS (`Secure` flag)
- Cross-domain: Set `COOKIE_DOMAIN` to parent domain (e.g., `.example.com`)

### 5. Check JWT Configuration

**Symptom**: Token verification fails / `401 Unauthorized`

**Verify**:
```bash
grep JWT_SECRET serverless/.env
```

**Requirements**:
- Must be at least 32 characters
- Same secret across all instances (if load balanced)
- Never commit to git (use .env file)

**Default (DEV ONLY)**:
```
JWT_SECRET=dev-secret-key-change-in-production
```

### 6. Verify Database Connection

**Symptom**: `500 Server error` during login/registration

**Check Connection**:
```bash
cd serverless
npx prisma db pull  # Test connection
```

**Verify `DATABASE_URL`**:
```bash
grep DATABASE_URL .env
```

**Format**:
```
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public
```

### 7. Check Error Helper Status Codes

**Symptom**: Tests expect numeric status codes but get strings

**Verify Fix**:
```javascript
// serverless/src/utils/headers.js
export function error(statusCode = 400, message = 'Bad Request', extra = {})
```

**Correct Usage**:
```javascript
return error(403, 'Access denied');  // ✓ statusCode first
return error('Access denied', 403);  // ✗ OLD - wrong order
```

## Test-Specific Issues

### Allowlist Tests Failing

**Symptom**: `Cannot assign to read only property 'getPrisma'`

**Solution**: Use `vi.spyOn` instead of direct assignment:
```javascript
// ✓ Correct
vi.spyOn(dbModule, 'getPrisma').mockReturnValue(mockPrisma);

// ✗ Wrong
dbModule.getPrisma = () => mockPrisma;
```

### Cookie Tests Failing (SameSite/Secure)

**Symptom**: Tests expect `Strict` but get `Lax` (or vice versa)

**Solution**: Ensure test sets `NODE_ENV` correctly:
```javascript
beforeEach(() => {
  process.env.NODE_ENV = 'production';  // For Strict cookies
  // OR
  process.env.NODE_ENV = 'development'; // For Lax cookies
});
```

### JWT Claim Mismatch

**Symptom**: `decoded.userId is undefined` or `payload.sub is undefined`

**Solution**: JWT now uses standard `sub` claim:
```javascript
// Token generation
jwt.sign({ sub: userId, type: 'access' }, secret);

// Token verification
const decoded = verifyToken(token);
const userId = decoded.sub;  // ✓ Use 'sub'
const userId = decoded.userId;  // ✗ OLD - no longer exists
```

## Deployment Verification

### Pre-Deployment Checklist

- [ ] `NODE_ENV=production` set
- [ ] `JWT_SECRET` configured (32+ chars)
- [ ] `ALLOWED_USER_EMAILS` contains owner email
- [ ] `STRICT_ALLOWLIST=1` (for production security)
- [ ] `ENABLE_REGISTRATION=false`
- [ ] `COOKIE_DOMAIN` set to your domain
- [ ] Database accessible from Lambda
- [ ] Prisma Client generated with correct targets

### Post-Deployment Verification

```bash
# Test health endpoint
curl https://api.your-domain.com/health

# Test owner login
curl -X POST https://api.your-domain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ghawk075@gmail.com","password":"Test123!"}'

# Expected: 200 with Set-Cookie headers
```

## Common Error Messages

| Error | Status | Cause | Solution |
|-------|--------|-------|----------|
| Access denied: email not in allowlist | 403 | Email not in `ALLOWED_USER_EMAILS` | Add email to allowlist |
| Registration not permitted | 403 | Registration disabled + not in allowlist | Add email to allowlist |
| Service temporarily unavailable: configuration error | 503 | Strict mode + allowlist < 2 emails | Add 2+ emails or disable strict mode |
| Invalid credentials | 401 | Wrong password or user not found | Check password / verify user exists in DB |
| Unauthorized - No valid token provided | 401 | Missing or invalid access token | Re-login to get new token |
| Missing refresh token | 401 | No refresh token in cookie | Re-login |
| Too many login attempts | 429 | Rate limit exceeded | Wait 1 minute and retry |

## Recovery Steps for Locked Out Owner

1. **Verify Allowlist**:
   ```bash
   # In serverless/.env
   ALLOWED_USER_EMAILS=ghawk075@gmail.com
   ```

2. **Reset Database (if needed)**:
   ```bash
   cd serverless
   npx prisma migrate reset  # WARNING: Deletes all data
   ```

3. **Register Owner Account**:
   ```bash
   curl -X POST https://api.your-domain.com/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"ghawk075@gmail.com","password":"Test123!"}'
   ```

4. **Login**:
   ```bash
   curl -X POST https://api.your-domain.com/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"ghawk075@gmail.com","password":"Test123!"}'
   ```

## For Developers

### Local Testing Setup

1. Copy environment template:
   ```bash
   cp serverless/.env.example serverless/.env
   ```

2. Set minimal config:
   ```bash
   DATABASE_URL=postgresql://localhost:5432/valine_dev
   ALLOWED_USER_EMAILS=test@example.com
   ENABLE_REGISTRATION=false
   STRICT_ALLOWLIST=0
   NODE_ENV=development
   JWT_SECRET=dev-secret-at-least-32-characters-long
   ```

3. Generate Prisma Client:
   ```bash
   cd serverless && npm run prisma:generate
   ```

4. Run tests:
   ```bash
   cd serverless && npm test
   ```

### Running Individual Test Suites

```bash
# Auth endpoints
npm test -- tests/auth-endpoints.test.js

# Cookie hardening
npm test -- tests/cookie-cors-hardening.test.js

# Allowlist enforcement  
npm test -- tests/allowlist-enforcement.test.js

# All analytics
npm test -- tests/analytics/
```

## Phase 2 Enhancements (Stabilization & Refinement)

### New Correlation ID Logging

All authentication operations now include a correlation ID for request tracing:

```bash
# Check CloudWatch logs for correlation ID
aws logs filter-log-events \
  --log-group-name /aws/lambda/pv-api-prod-login \
  --filter-pattern '{ $.correlationId = * }'
```

**Structured Log Format**:
```json
{
  "timestamp": "2025-11-20T02:00:00.000Z",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "login_denied",
  "email": "te***@example.com",
  "reason": "email_not_in_allowlist"
}
```

**Response Headers**:
- `X-Correlation-ID`: Same as log correlationId for request tracing
- `X-Service-Version`: Service version for deployment tracking
- `X-Auth-Mode`: Current authentication mode (owner-only, open, etc.)

### JWT Secret Validation

The application now fails-fast if deployed to production with the default JWT secret:

**Error Message**:
```
SECURITY ERROR: Default JWT_SECRET must not be used in production. 
Set a secure JWT_SECRET environment variable.
```

**Structured Log**:
```json
{
  "timestamp": "...",
  "event": "jwt_secret_invalid",
  "level": "error",
  "message": "Default JWT secret detected in production environment",
  "environment": "production"
}
```

**Fix**: Set `JWT_SECRET` environment variable to a strong secret (32+ characters).

### Legacy Password Column Support

For users created before the `passwordHash` column was standardized:

**Symptom**: Login returns `500 Server error` with log: `[LOGIN] User missing password hash`

**Automatic Fallback**: Auth handler now checks legacy `password` column automatically.

**Permanent Fix**: Run migration script once:
```bash
cd /home/runner/work/Project-Valine/Project-Valine
DATABASE_URL=postgresql://... node scripts/patch-legacy-passwords.mjs
```

**After Migration**: Remove fallback code from `src/handlers/auth.js` (search for "Transitional legacy password support").

### Token Claim Backward Compatibility

JWT tokens now use standard `sub` claim, with automatic fallback for legacy `userId` tokens:

**Current Tokens**: `{ sub: "user-id-123", type: "access", ... }`

**Legacy Tokens**: `{ userId: "user-id-123", type: "access", ... }` ← Still supported

**Code Example**:
```javascript
import { getUserIdFromDecoded } from './utils/tokenManager.js';

const decoded = verifyToken(token);
const userId = getUserIdFromDecoded(decoded); // Works with both formats
```

### 2FA API Changes

**BREAKING CHANGE**: Legacy lowercase 2FA aliases removed:

- ❌ `enable2fa` (removed)
- ❌ `verify2fa` (removed)
- ✅ `enable2FA` (use this)
- ✅ `verify2FA` (use this)

**Migration**: Update any client code or serverless.yml references from `enable2fa`/`verify2fa` to `enable2FA`/`verify2FA`.

### Pre-Deployment Validation

Run preflight checks before deploying:

```bash
# Verify configuration
node scripts/verify-predeploy.mjs

# Optimize Prisma for production
node scripts/prisma-optimize.mjs --prod
cd serverless && npm run prisma:generate

# Analyze test failures
npm test -- --reporter=json > test-results.json
node scripts/analyze-test-failures.mjs test-results.json
```

### Cookie Domain Normalization

Cookie domains are now automatically normalized:

**Input Examples**:
- ` Example.COM ` → `.example.com`
- `...example.com` → `.example.com`
- `localhost` → `localhost` (no dot prefix)
- `192.168.1.1` → `192.168.1.1` (no dot prefix)

**Benefit**: Prevents misconfiguration due to whitespace or casing issues.

## References

- [OWNER_ONLY_AUTH_DEPLOYMENT.md](./OWNER_ONLY_AUTH_DEPLOYMENT.md) - Production deployment guide
- [ALLOWLIST_DEPLOYMENT_GUIDE.md](./ALLOWLIST_DEPLOYMENT_GUIDE.md) - Allowlist configuration
- [Prisma Documentation](https://www.prisma.io/docs/) - Database client docs
- [JWT.io](https://jwt.io/) - JWT token debugger
- [scripts/patch-legacy-passwords.mjs](./scripts/patch-legacy-passwords.mjs) - Password migration script
- [scripts/verify-predeploy.mjs](./scripts/verify-predeploy.mjs) - Pre-deployment checks
- [scripts/prisma-optimize.mjs](./scripts/prisma-optimize.mjs) - Prisma binary optimization
