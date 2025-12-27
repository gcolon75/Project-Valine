# Environment Variables Checklist

**Last Updated:** 2025-12-09  
**Purpose:** Complete reference for all environment variables used in Project-Valine across frontend, backend, and deployment environments.

---

## Table of Contents

1. [Frontend Environment Variables](#frontend-environment-variables)
2. [Backend Environment Variables](#backend-environment-variables)
3. [Deployment Environments](#deployment-environments)
4. [Quick Start Guides](#quick-start-guides)

---

## Frontend Environment Variables

All frontend variables must be prefixed with `VITE_` to be exposed to the client bundle.

### Core API Configuration

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `VITE_API_BASE` | **Yes** | `http://localhost:3001` | Backend API base URL (API Gateway, NOT CloudFront) | `https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com` |
| `VITE_FRONTEND_URL` | No | `http://localhost:5173` | Frontend URL for CORS and build checks | `https://d1abc.cloudfront.net` |

**Important Notes:**
- Use API Gateway URL for `VITE_API_BASE`, not CloudFront distribution URL
- CloudFront is for static assets only
- Local dev: `http://localhost:3001` (serverless offline)
- Staging: `https://<api-id>.execute-api.us-west-2.amazonaws.com/dev`
- Production: `https://<api-id>.execute-api.us-west-2.amazonaws.com/prod`

---

### Authentication & Security

| Variable | Required | Default | Description | Values |
|----------|----------|---------|-------------|--------|
| `VITE_ENABLE_AUTH` | No | `false` | Enable HttpOnly cookie authentication | `true`, `false` |
| `VITE_API_USE_CREDENTIALS` | No | `false` | **DEPRECATED** - Use `VITE_ENABLE_AUTH` instead | `true`, `false` |
| `VITE_CSRF_ENABLED` | No | `false` | Enable CSRF token validation (auto-enabled with auth) | `true`, `false` |
| `VITE_TWO_FACTOR_ENABLED` | No | `false` | Enable 2FA UI in settings | `true`, `false` |
| `VITE_USE_SESSION_TRACKING` | No | `false` | Enable session management UI | `true`, `false` |

**Authentication Modes:**
- `VITE_ENABLE_AUTH=false`: Tokens stored in localStorage (legacy, development)
- `VITE_ENABLE_AUTH=true`: HttpOnly cookies with CSRF protection (recommended for production)

---

### Access Control

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `VITE_ALLOWED_USER_EMAILS` | No | _(empty)_ | Client-side email allowlist (comma-separated) | `ghawk075@gmail.com,user@example.com` |
| `VITE_ENABLE_REGISTRATION` | No | `false` | Show signup UI and registration routes | `true`, `false` |

**Notes:**
- `VITE_ALLOWED_USER_EMAILS` must match backend `ALLOWED_USER_EMAILS` for consistency
- Registration control is enforced server-side; this only controls UI visibility

---

### Feature Flags

| Variable | Required | Default | Description | Values |
|----------|----------|---------|-------------|--------|
| `VITE_ENABLE_PROFILE_LINKS_API` | No | `false` | Enable backend integration for profile links | `true`, `false` |
| `VITE_ANALYTICS_ENABLED` | No | `false` | Enable analytics tracking and config fetching | `true`, `false` |
| `VITE_USE_MSW` | No | `false` | Enable Mock Service Worker for development | `true`, `false` |
| `LEGAL_PAGES_ENABLED` | No | `true` | Show legal pages (Privacy, Terms, Cookies) | `true`, `false` |

---

### Development & Debugging

| Variable | Required | Default | Description | Values |
|----------|----------|---------|-------------|--------|
| `VITE_ENABLE_DEV_BYPASS` | No | `false` | **LOCALHOST ONLY** - Show dev bypass button on login | `true`, `false` |
| `VITE_DEBUG_API` | No | `false` | Enable detailed API logging in console | `true`, `false` |
| `VITE_API_STRIP_LEGACY_API_PREFIX` | No | `false` | Auto-remove `/api` prefix from request paths | `true`, `false` |
| `VITE_API_INTEGRATION` | No | `false` | Use real API with fallback vs. MSW mocks only | `true`, `false` |

**Security:**
- `VITE_ENABLE_DEV_BYPASS=true` will **FAIL the build** if `VITE_FRONTEND_URL` contains production domains
- Never deploy with dev bypass enabled

---

## Backend Environment Variables

Backend variables are used by Lambda functions and serverless framework.

### Database

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `DATABASE_URL` | **Yes** | _(none)_ | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |

**Connection String Formats:**
```powershell
# PostgreSQL (recommended)
DATABASE_URL=postgresql://username:password@host:5432/valine_db

# PostgreSQL with SSL (RDS)
DATABASE_URL=postgresql://username:password@host:5432/valine_db?sslmode=require

# MySQL (alternative)
DATABASE_URL=mysql://username:password@host:3306/valine_db

# SQLite (local dev only - NOT for production)
DATABASE_URL=file:./dev.db
```

---

### Authentication & Security

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `AUTH_JWT_SECRET` | **Yes** | _(none)_ | JWT signing secret (256+ bits) | Generate: `openssl rand -base64 32` |
| `JWT_EXPIRATION` | No | `24h` | Access token expiration time | `24h`, `1d`, `3600s` |
| `NODE_ENV` | No | `development` | Node environment (affects cookie security) | `production`, `development` |
| `CSRF_ENABLED` | No | `false` | Enable CSRF token validation | `true`, `false` |
| `COOKIE_DOMAIN` | No | _(empty)_ | Cookie domain scope | `.projectvaline.com` or empty |

**Security Best Practices:**
- Generate `AUTH_JWT_SECRET` with: `openssl rand -base64 32`
- Never commit secrets to version control
- Use AWS Systems Manager Parameter Store or Secrets Manager for production

---

### Access Control

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `ALLOWED_USER_EMAILS` | No | _(empty)_ | **Primary** server-side email allowlist (comma-separated) | `ghawk075@gmail.com,user@example.com` |
| `ENABLE_REGISTRATION` | No | `false` | Allow new user registrations | `true`, `false` |

**Notes:**
- `ALLOWED_USER_EMAILS` takes precedence over `ENABLE_REGISTRATION`
- When allowlist is set, only listed emails can register/login
- Frontend `VITE_ALLOWED_USER_EMAILS` should match for consistency

---

### Email Configuration

| Variable | Required | Default | Description | Values |
|----------|----------|---------|-------------|--------|
| `EMAIL_ENABLED` | No | `false` | Enable actual email sending (requires SMTP) | `true`, `false` |
| `FRONTEND_BASE_URL` | No | `http://localhost:5173` | Frontend URL for verification emails | `https://app.projectvaline.com` |

**MVP Status:**
- Email sending is currently disabled
- Verification tokens are logged to console
- Set `EMAIL_ENABLED=true` when SMTP is configured

---

### AWS Configuration

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `AWS_REGION` | No | `us-west-2` | AWS region for deployment | `us-west-2`, `us-east-1` |
| `STAGE` | No | `dev` | Deployment stage | `dev`, `staging`, `prod` |
| `S3_BUCKET` | No | _(none)_ | S3 bucket for media uploads | `valine-uploads-prod` |

---

### Optional Features

| Variable | Required | Default | Description | Values |
|----------|----------|---------|-------------|--------|
| `DEV_BYPASS_ENABLED` | No | `false` | Backend dev bypass endpoint (future) | `true`, `false` |

---

## Deployment Environments

### Local Development

**File:** `.env` (root directory)

```powershell
# Frontend
VITE_API_BASE=http://localhost:3001
VITE_ENABLE_AUTH=false
VITE_ENABLE_REGISTRATION=true
VITE_ENABLE_DEV_BYPASS=true
VITE_FRONTEND_URL=http://localhost:5173

# Backend (serverless/.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/valine_dev
AUTH_JWT_SECRET=your-local-secret-change-this
NODE_ENV=development
ENABLE_REGISTRATION=true
```

**Services Required:**
- PostgreSQL running locally
- Serverless offline: `cd serverless && npx serverless offline`
- Frontend dev server: `npm run dev`

---

### Staging

**File:** `.env.staging` (deployed via CI/CD)

```powershell
# Frontend
VITE_API_BASE=https://<api-id>.execute-api.us-west-2.amazonaws.com/dev
VITE_ENABLE_AUTH=true
VITE_ENABLE_REGISTRATION=false
VITE_ALLOWED_USER_EMAILS=ghawk075@gmail.com,tester@example.com
VITE_FRONTEND_URL=https://staging.projectvaline.com

# Backend (Lambda environment variables)
DATABASE_URL=postgresql://user:pass@rds-staging.amazonaws.com:5432/valine_staging?sslmode=require
AUTH_JWT_SECRET=<generated-secret-from-secrets-manager>
NODE_ENV=production
ALLOWED_USER_EMAILS=ghawk075@gmail.com,tester@example.com
ENABLE_REGISTRATION=false
CSRF_ENABLED=true
AWS_REGION=us-west-2
STAGE=dev
```

**Deployment:**
```powershell
cd serverless
npx serverless deploy --stage dev
```

---

### Production

**File:** `.env.production` (deployed via CI/CD)

```powershell
# Frontend
VITE_API_BASE=https://<api-id>.execute-api.us-west-2.amazonaws.com/prod
VITE_ENABLE_AUTH=true
VITE_ENABLE_REGISTRATION=false
VITE_ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com
VITE_FRONTEND_URL=https://app.projectvaline.com

# Backend (Lambda environment variables)
DATABASE_URL=postgresql://user:pass@rds-prod.amazonaws.com:5432/valine_prod?sslmode=require
AUTH_JWT_SECRET=<generated-secret-from-secrets-manager>
NODE_ENV=production
ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com
ENABLE_REGISTRATION=false
CSRF_ENABLED=true
AWS_REGION=us-west-2
STAGE=prod
S3_BUCKET=valine-uploads-prod
```

**Security Checklist:**
- [ ] `AUTH_JWT_SECRET` from AWS Secrets Manager
- [ ] `VITE_ENABLE_DEV_BYPASS=false` (or omitted)
- [ ] `NODE_ENV=production`
- [ ] `CSRF_ENABLED=true`
- [ ] `DATABASE_URL` with `sslmode=require`
- [ ] Email allowlist configured
- [ ] Registration disabled

---

## Quick Start Guides

### Frontend Developer Setup

```powershell
# 1. Copy example file
cp .env.local.example .env

# 2. Update VITE_API_BASE
# For local backend: http://localhost:3001
# For deployed backend: https://<api-id>.execute-api.us-west-2.amazonaws.com/dev

# 3. Start dev server
npm run dev
```

---

### Backend Developer Setup

```powershell
# 1. Set up database
createdb valine_dev

# 2. Copy environment file
cd serverless
cp .env.example .env

# 3. Update .env with your values
DATABASE_URL=postgresql://localhost:5432/valine_dev
AUTH_JWT_SECRET=$(openssl rand -base64 32)

# 4. Run migrations
npx prisma migrate dev

# 5. Start serverless offline
npm install
npx serverless offline
```

---

### Production Deployment

**Backend:**
```powershell
cd serverless

# Ensure production secrets are in AWS Secrets Manager/Parameter Store
# Set Lambda environment variables via serverless.yml or AWS Console

npx serverless deploy --stage prod
```

**Frontend:**
```powershell
# Build with production env vars
npm run build

# Deploy to S3
aws s3 sync dist/ s3://your-production-bucket/ --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id <dist-id> \
  --paths "/*"
```

---

## Environment Variable Checklist by Service

### Which Service Reads Each Variable?

| Variable | Frontend | Serverless Backend | Express Server (Legacy) |
|----------|----------|-------------------|------------------------|
| `VITE_API_BASE` | ✅ | ❌ | ❌ |
| `VITE_ENABLE_AUTH` | ✅ | ❌ | ❌ |
| `VITE_ALLOWED_USER_EMAILS` | ✅ | ❌ | ❌ |
| `DATABASE_URL` | ❌ | ✅ | ✅ |
| `AUTH_JWT_SECRET` | ❌ | ✅ | ✅ |
| `ALLOWED_USER_EMAILS` | ❌ | ✅ | ✅ |
| `ENABLE_REGISTRATION` | ❌ | ✅ | ✅ |
| `NODE_ENV` | ❌ | ✅ | ✅ |
| `AWS_REGION` | ❌ | ✅ | ❌ |
| `S3_BUCKET` | ❌ | ✅ | ❌ |

---

## Troubleshooting

### Frontend can't connect to API

**Symptoms:**
- Network errors in console
- Mock data showing instead of real data
- CORS errors

**Checklist:**
1. Verify `VITE_API_BASE` is set correctly (API Gateway URL, not CloudFront)
2. Check backend is running (local or deployed)
3. Test health endpoint: `Invoke-RestMethod -Uri "$env:VITE_API_BASE/health"`
4. Check for CORS configuration in backend
5. Run: `window.__diagnostics.summary()` in browser console

---

### Authentication not working

**Symptoms:**
- Login returns 401
- Token not being sent
- CSRF errors

**Checklist:**
1. Verify `VITE_ENABLE_AUTH` matches backend auth mode
2. Check `AUTH_JWT_SECRET` is set on backend
3. Verify email is in `ALLOWED_USER_EMAILS` (if allowlist enabled)
4. Check cookie settings match `NODE_ENV` (Secure flag in production)
5. Verify `CSRF_ENABLED` matches between frontend and backend

---

### Changes not reflecting

**Steps:**
1. Restart dev server after changing `.env` files
2. Clear browser cache and localStorage
3. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
4. Check Vite is picking up env vars: `console.log(import.meta.env)`

---

### Build failing with dev bypass error

**Error:**
```
Build failed: VITE_ENABLE_DEV_BYPASS=true with production VITE_FRONTEND_URL
```

**Fix:**
1. Set `VITE_ENABLE_DEV_BYPASS=false` in production `.env`
2. Dev bypass is only for localhost development
3. Never deploy with dev bypass enabled

---

## Additional Resources

- [Main .env.example](../.env.example)
- [Local Development .env.local.example](../.env.local.example)
- [System Handbook](./PROJECT_VALINE_SYSTEM_HANDBOOK.md)
- [Serverless Deployment Guide](./BACKEND-DEPLOYMENT.md)
- [Troubleshooting Runbook](./backend/troubleshooting-auth-profile-posts.md)

---

**Last Updated:** 2025-12-09  
**Maintainers:** Project-Valine Team
