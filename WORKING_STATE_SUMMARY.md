# Working State Summary - Project Valine

**Last Updated**: 2025-11-20  
**Status**: ✅ WORKING - Frontend loads, owner can login

## What's Working

### Frontend Delivery
- CloudFront serves SPA from S3 (200 OK)
- No white screen issue
- SPA routing via CloudFront Function works
- Asset normalization and SRI integrity checks in place
- Domain: https://dkmxy676d3vgc.cloudfront.net

### Authentication Flow
- Owner-only mode active (allowlist enforced)
- `/auth/login` returns 200 OK with HttpOnly cookies for valid credentials
- `/auth/me` returns 200 OK with user JSON when authenticated
- `/auth/refresh` and `/auth/logout` functional
- JWT access/refresh tokens in HttpOnly cookies
- Proper HTTP status codes (no more 500 errors):
  - 200: Success
  - 401: Invalid credentials / unauthorized
  - 403: Not in allowlist
  - 500: Only for true server errors

### Admin Tools
- `scripts/admin-set-password.mjs` works from repository root (Windows compatible)
- Sets bcrypt-hashed passwords in database
- Usage: `node scripts/admin-set-password.mjs "email@example.com" "password"`

### Health & Diagnostics
- `/health` endpoint returns 200 OK with secrets status
- Structured logging with `correlationId` for CloudWatch tracking
- No secrets exposed in logs (redaction utilities working)

## How It Works

### Frontend → CloudFront → S3
1. User navigates to CloudFront domain
2. CloudFront Function handles SPA routing (rewrites `/path` to `/index.html`)
3. S3 serves index.html with SRI-protected assets
4. React app loads without white screen

### Authentication Flow
1. User submits login via `/auth/login`
2. Backend validates email in allowlist, checks password hash
3. JWT tokens generated and set as HttpOnly cookies
4. Frontend stores auth state, calls `/auth/me` to get user data
5. Refresh token rotates access token automatically

### Key Fixes (Recent PRs)
- **PR #253-254**: Fixed `error()` helper signature, token claim consistency, structured logging
- **PR #255**: Secrets management framework, redaction utilities, environment validation
- **PR #256**: Fixed auth 500 errors with proper try/catch, null checks, correlationId logging
- **PR #257**: Fixed admin script path resolution for serverless dependencies
- **PR #258**: Fixed Windows ESM import with `pathToFileURL()`

## Environment Variables (Critical)
- `JWT_SECRET`: Must be secure (not default)
- `DATABASE_URL`: PostgreSQL connection with credentials
- `FRONTEND_URL`: CloudFront domain (canonical)
- `ALLOWED_USER_EMAILS`: Owner emails (comma-separated)
- `VITE_API_BASE`: API Gateway endpoint

## Database Schema
- Users table with `passwordHash` column (bcrypt)
- Email stored lowercase
- Prisma ORM for queries

## Testing Login
```bash
# Set password
$env:DATABASE_URL = "postgresql://user:pass@host:5432/postgres?sslmode=require"
node scripts/admin-set-password.mjs "ghawk075@gmail.com" "Test123!"

# Test login
curl.exe -i -X POST "https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/login" -H "Origin: https://dkmxy676d3vgc.cloudfront.net" -H "Content-Type: application/json" --data "{\"email\":\"ghawk075@gmail.com\",\"password\":\"Test123!\"}"
```

## Known Working Commit
- SHA: 55743a8ba0693955744679fa99fdc6f3ca498092
- All auth tests passing
- Frontend delivery stable

## Quick Reference

### Key Documentation
- [AUTH_RECOVERY_CHECKLIST.md](./AUTH_RECOVERY_CHECKLIST.md) - Authentication troubleshooting
- [SECRETS_MANAGEMENT.md](./SECRETS_MANAGEMENT.md) - Environment variables and secrets
- [README.md](./README.md) - Project overview and status

### Important Directories
- `serverless/src/handlers/` - Lambda function handlers (auth, health, etc.)
- `serverless/src/utils/` - Shared utilities (headers, tokenManager, redaction)
- `scripts/` - Admin and deployment scripts
- `frontend/src/` - React application source

### Common Tasks

**Reset owner password:**
```bash
node scripts/admin-set-password.mjs "ghawk075@gmail.com" "NewPassword123!"
```

**Check deployment health:**
```bash
curl https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health
```

**Verify environment:**
```bash
node scripts/verify-env-contract.mjs
```

**Scan for secrets:**
```bash
node scripts/secret-audit.mjs
```

## What NOT to Modify

When making changes, DO NOT modify these working components unless explicitly required:
- `serverless/src/handlers/auth.js` - Authentication handler (working correctly)
- `serverless/src/handlers/health.js` - Health check endpoint
- `scripts/admin-set-password.mjs` - Password reset tool (Windows-compatible)
- CloudFront Function configuration (SPA routing working)
- `serverless/src/utils/headers.js` - Response helpers (error signature fixed)
- `serverless/src/utils/tokenManager.js` - JWT token utilities (claims standardized)

## Next Steps

If you encounter issues:

1. **Auth Problems**: See [AUTH_RECOVERY_CHECKLIST.md](./AUTH_RECOVERY_CHECKLIST.md)
2. **Secrets Issues**: See [SECRETS_MANAGEMENT.md](./SECRETS_MANAGEMENT.md)
3. **Deployment Issues**: Check CloudWatch logs with correlationId
4. **Frontend Issues**: Check browser console and network tab

## Contact & Support

- Repository: https://github.com/gcolon75/Project-Valine
- Issues: https://github.com/gcolon75/Project-Valine/issues
