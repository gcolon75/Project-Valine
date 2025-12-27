# Account Creation MVP

## Overview

This document describes the Account Creation MVP feature for Project Valine, which provides user signup, email verification, and authentication endpoints.

**Status:** MVP Implementation  
**Last Updated:** November 10, 2025

## Features

- ✅ User signup with email and password
- ✅ Secure password hashing (bcryptjs with 12 rounds)
- ✅ Email normalization and uniqueness validation
- ✅ Email verification tokens (24-hour expiry)
- ✅ JWT-based authentication (24-hour tokens)
- ✅ Rate limiting (10 signups/min, 5 logins/min per IP)
- ✅ Protected endpoints with authentication
- ✅ E2E test coverage with Playwright
- ✅ Unit test coverage for utilities

## API Endpoints

### POST /api/users - Create Account

Create a new user account with email verification.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (201 Created):**
```json
{
  "message": "verification_required",
  "verifyHint": "Check server logs or analysis-output/ for verification token",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "status": "pending"
  }
}
```

**Error Responses:**
- `400` - Validation error (invalid email format, password too short)
- `409` - Email already exists
- `429` - Rate limit exceeded (10 signups/min per IP)

**Validation Rules:**
- Email must be valid format
- Password must be at least 8 characters
- Email is normalized (lowercase, trimmed) for uniqueness

---

### POST /api/auth/verify-email - Verify Email

Verify email address using the token from signup.

**Request:**
```json
{
  "token": "64-character-hex-token"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "message": "Email verified successfully"
}
```

**Error Responses:**
- `400` - Invalid token
- `410` - Token expired (24-hour expiry)

**Notes:**
- Token is single-use (deleted after verification)
- User status changes from "pending" to "active"
- `emailVerifiedAt` timestamp is set

---

### POST /api/auth/login - Login

Authenticate with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "displayName": "User Name",
    "username": "username"
  }
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Invalid email or password
- `403` - Email not verified (code: `email_not_verified`)
- `429` - Rate limit exceeded (5 logins/min per IP)

**Security:**
- Credentials are checked in constant time
- Error messages don't reveal if email exists
- Session is created for tracking

---

### GET /api/auth/me - Get Current User

Get authenticated user's information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "username": "username",
    "displayName": "User Name",
    "avatar": "https://...",
    "bio": "...",
    "role": "artist",
    "status": "active",
    "emailVerified": true,
    "createdAt": "2025-11-10T19:00:00.000Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized (missing or invalid token)
- `404` - User not found

---

## Environment Variables

### Required

```powershell
# Database connection (PostgreSQL recommended)
DATABASE_URL=postgresql://user:password@host:5432/valine_db

# JWT secret for authentication tokens
# Generate with: openssl rand -base64 32
AUTH_JWT_SECRET=your-256-bit-secret-key-here
```

### Optional

```powershell
# JWT token expiration (default: 24h)
JWT_EXPIRATION=24h

# Frontend base URL for verification links
FRONTEND_BASE_URL=http://localhost:5173

# Email sending (default: false for MVP)
EMAIL_ENABLED=false
```

## Local Development Setup

### 1. Install Dependencies

```powershell
# Root dependencies
npm install

# Server dependencies
cd server
npm install
```

### 2. Configure Environment

```powershell
# Copy example environment file
cp .env.example .env

# Edit .env and set:
# - DATABASE_URL (your PostgreSQL connection string)
# - AUTH_JWT_SECRET (generate with: openssl rand -base64 32)
```

### 3. Run Database Migrations

```powershell
cd api
npx prisma migrate deploy
npx prisma generate
```

### 4. Start the Server

```powershell
cd server
npm run dev
# Server runs on http://localhost:5000
```

### 5. Start the Frontend (Optional)

```powershell
# In another terminal, from project root
npm run dev
# Frontend runs on http://localhost:5173
```

### 6. Test the API

```powershell
# Sign up
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
    "Content-Type" = "application/json"
    "Content-Type" = "application/json"
    "Authorization" = "Bearer <token-from-login>"
} -Body '{"email":"test@example.com","password":"TestPassword123"}' -ContentType 'application/json'```

## Email Verification (MVP Implementation)

**Current Implementation (MVP):**
- Verification tokens are logged to server console
- Tokens are written to `analysis-output/verification-token-<userId>.json`
- E2E tests read tokens from this directory
- No actual email is sent

**Production TODO:**
- Integrate email service (SendGrid, AWS SES, etc.)
- Send verification emails with clickable links
- Add email templates
- Implement resend verification email endpoint
- Add email preferences and notifications

## Security Considerations

### Password Security

- **Hashing Algorithm:** bcryptjs with 12 salt rounds
- **Minimum Length:** 8 characters (enforced)
- **Storage:** Only hashed passwords stored in database
- **Future Enhancements:** 
  - Password complexity requirements
  - Check against common password breach lists
  - Password strength meter on frontend

### Email Normalization

- Emails are normalized (lowercase, trimmed) to prevent duplicates
- Case-insensitive uniqueness enforced via `normalizedEmail` field
- Prevents signup with `User@Example.com` if `user@example.com` exists

### JWT Tokens

- **Algorithm:** HS256 (HMAC with SHA-256)
- **Expiration:** 24 hours (configurable)
- **Issuer:** `project-valine`
- **Payload:** User ID, email, type
- **Secret:** Must be 256+ bits for production
- **Future Enhancements:**
  - Refresh tokens for longer sessions
  - Token rotation on critical actions
  - Revocation list for compromised tokens

### Rate Limiting

**Current Implementation (MVP):**
- In-memory rate limiting (per server instance)
- Signup: 10 requests/minute per IP
- Login: 5 requests/minute per IP
- Automatic cleanup to prevent memory leaks

**Production TODO:**
- Distributed rate limiting (Redis, Memcached)
- Per-user rate limits (not just IP)
- CAPTCHA integration for suspicious activity
- Progressive delays on repeated failures

### Token Security

- Verification tokens: 32 bytes random (cryptographically secure)
- 24-hour expiration for email verification
- Single-use tokens (deleted after verification)
- Tokens never logged in production (only in dev/test)

### Headers and Transport

- CORS configured for frontend origin
- Helmet.js for security headers
- HTTPS required in production
- httpOnly cookies option available (JWT preferred for MVP)

## Testing

### Unit Tests

Located in `server/src/__tests__/`:

```powershell
cd server
npm test

# Coverage report
npm run test:coverage
```

**Test Files:**
- `passwordHash.test.js` - Password hashing, normalization, validation
- `jwtToken.test.js` - Token generation, verification, expiration

### E2E Tests (Playwright)

Located in `tests/e2e/`:

```powershell
# Install Playwright
npx playwright install

# Run E2E tests
npx playwright test tests/e2e/signup.spec.ts
npx playwright test tests/e2e/login-duplicate-email.spec.ts
npx playwright test tests/e2e/login-unverified.spec.ts

# View HTML report
npx playwright show-report
```

**Test Scenarios:**
- ✅ Full signup and verification flow
- ✅ Login after verification
- ✅ Protected endpoint access with JWT
- ✅ Duplicate email prevention
- ✅ Case-insensitive email uniqueness
- ✅ Email format validation
- ✅ Password strength validation
- ✅ Login blocked before verification
- ✅ Invalid credentials handling
- ✅ Rate limiting enforcement

### Integration with Analyzer

The Playwright tests output JSON results to `test-results/results.json`, which is consumed by the orchestration analyzer:

```powershell
# Run analyzer on workflow run
node scripts/analyze-orchestration-run.mjs <run-id> \
  --out-dir analysis-output \
  --json \
  --fail-on P0
```

## Database Schema Changes

### User Model Updates

**Added Fields:**
- `normalizedEmail` (String, unique) - Lowercase, trimmed email
- `emailVerifiedAt` (DateTime, nullable) - Verification timestamp
- `status` (String) - User status: "pending" | "active" | "suspended"

**Existing Models Used:**
- `EmailVerificationToken` - Stores verification tokens
- `Session` - Tracks JWT sessions

### Migration

Migration: `20251110195138_add_account_creation_fields`

```powershell
cd api
npx prisma migrate deploy
```

**Rollback:** See `api/prisma/migrations/.../ROLLBACK.md`

## Workflow Integration

### CI/CD Pipeline

The E2E tests run in GitHub Actions workflow:

```yaml
- name: Run Account Creation Tests
  run: npx playwright test tests/e2e/
  env:
    VITE_API_BASE: ${{ secrets.STAGING_URL }}
    FRONTEND_BASE_URL: ${{ secrets.FRONTEND_BASE_URL }}
```

### Secrets Required

- `AUTH_JWT_SECRET` - JWT signing key (new)
- `STAGING_URL` - API base URL for staging tests (existing)
- `FRONTEND_BASE_URL` - Frontend URL for verification links (existing)
- `ORCHESTRATION_BOT_PAT` - For posting PR comments (existing, optional)

### Analyzer Artifacts

Tests produce artifacts consumed by analyzer:
- `test-results/results.json` - Playwright test results
- `analysis-output/verification-token-*.json` - Verification tokens (test only)

## Production Deployment Checklist

Before deploying to production:

- [ ] **Secrets Management**
  - [ ] Generate strong JWT secret (256+ bits)
  - [ ] Store `AUTH_JWT_SECRET` in AWS Secrets Manager or Parameter Store
  - [ ] Rotate secrets regularly
  - [ ] Never log secrets in production

- [ ] **Database**
  - [ ] Run migrations on production database
  - [ ] Backup database before migration
  - [ ] Test rollback procedure

- [ ] **Email Integration**
  - [ ] Configure email service (SendGrid, SES, etc.)
  - [ ] Set `EMAIL_ENABLED=true`
  - [ ] Test email delivery
  - [ ] Configure SPF/DKIM records

- [ ] **Security Hardening**
  - [ ] Enable HTTPS only
  - [ ] Configure CORS for production domain
  - [ ] Implement distributed rate limiting (Redis)
  - [ ] Add CAPTCHA for signup/login
  - [ ] Enable security monitoring

- [ ] **Monitoring**
  - [ ] Configure CloudWatch alarms
  - [ ] Track signup/login metrics
  - [ ] Monitor rate limit hits
  - [ ] Alert on authentication failures

## Future Enhancements

### Short-term (Next Sprint)

- [ ] Password reset flow
- [ ] Resend verification email endpoint
- [ ] Email templates and branding
- [ ] Account deletion/deactivation
- [ ] Login history and device tracking

### Medium-term

- [ ] Social login (Google, GitHub)
- [ ] Two-factor authentication (2FA)
- [ ] Password complexity requirements
- [ ] Passwordless login (magic links)
- [ ] Account recovery options

### Long-term

- [ ] OAuth 2.0 provider for third-party apps
- [ ] Single Sign-On (SSO) integration
- [ ] Advanced fraud detection
- [ ] Security audit logging
- [ ] GDPR compliance tools

## Troubleshooting

### Common Issues

**"AUTH_JWT_SECRET environment variable is required"**
- Set `AUTH_JWT_SECRET` in your `.env` file
- Generate with: `openssl rand -base64 32`

**"Failed to read verification token file"**
- Ensure server has write permissions to `analysis-output/`
- Check server logs for verification token
- For E2E tests, wait for file to be written

**"Email already exists"**
- Email normalization is case-insensitive
- Check for existing accounts with same email
- Try different email address

**Rate limit exceeded**
- Wait 60 seconds and try again
- In production, implement per-user rate limits
- Consider CAPTCHA for repeated failures

**Invalid or expired token**
- Verification tokens expire after 24 hours
- Request new verification email (when implemented)
- Check token is copied correctly (64 hex characters)
The Account Creation MVP provides the foundational user signup functionality that enables users to create accounts in Project Valine. This initial implementation focuses on secure user registration with email verification support, allowing users to later login and verify their email addresses.

**Goal**: Enable users to create accounts with email, username, password, and display name, storing credentials securely and returning a JWT token for immediate authenticated access (with limited permissions until email is verified).

## Endpoint Specification

### POST /auth/register

Creates a new user account with email verification workflow.

**URL**: `/auth/register`

**Method**: `POST`

**Authentication**: None (public endpoint)

**Rate Limiting**: 
- Max 3 registration attempts per hour per IP address
- Automatically reset on successful registration

**Request Body**:

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePassword123!",
  "displayName": "John Doe"
}
```

**Request Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email address (must be unique) |
| `username` | string | Yes | Unique username (must be unique) |
| `password` | string | Yes | Password (min 8 characters recommended) |
| `displayName` | string | Yes | User's display name |

**Success Response** (201 Created):

```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "username": "johndoe",
    "displayName": "John Doe",
    "emailVerified": false
  }
}
```

**Error Responses**:

**400 Bad Request** - Missing required fields:
```json
{
  "error": "MISSING_FIELDS",
  "message": "Email, username, password, and display name are required"
}
```

**409 Conflict** - Email already registered:
```json
{
  "error": "USER_EXISTS",
  "message": "Email already registered"
}
```

**409 Conflict** - Username already taken:
```json
{
  "error": "USER_EXISTS",
  "message": "Username already taken"
}
```

**429 Too Many Requests** - Rate limit exceeded:
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many registration attempts. Please try again later."
}
```

**500 Internal Server Error** - Server error:
```json
{
  "error": "REGISTRATION_FAILED",
  "message": "Failed to register user"
}
```

## Request/Response Examples

### Example 1: Successful Registration

**Request**:
```powershell
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "email": "alice@example.com", "username": "alicewonder", "password": "MySecurePass123!", "displayName": "Alice Wonder" }' -ContentType 'application/json'```

**Response** (201):
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImFsaWNlQGV4YW1wbGUuY29tIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDA2MDQ4MDB9.signature",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@example.com",
    "username": "alicewonder",
    "displayName": "Alice Wonder",
    "emailVerified": false
  }
}
```

### Example 2: Email Already Registered

**Request**:
```powershell
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "email": "alice@example.com", "username": "anotheralice", "password": "Password123!", "displayName": "Another Alice" }' -ContentType 'application/json'```

**Response** (409):
```json
{
  "error": "USER_EXISTS",
  "message": "Email already registered"
}
```

### Example 3: Missing Required Fields

**Request**:
```powershell
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "email": "bob@example.com", "password": "BobPass123!" }' -ContentType 'application/json'```

**Response** (400):
```json
{
  "error": "MISSING_FIELDS",
  "message": "Email, username, password, and display name are required"
}
```

## Environment Variables

The following environment variables are required for the Account Creation MVP:

### Backend Server (`/server/.env`)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret key for signing JWT tokens | `your-secret-key-change-in-production` | Yes |
| `JWT_EXPIRES_IN` | JWT token expiration duration | `7d` (7 days) | No (default: 7d) |
| `PORT` | Server port | `5000` | No (default: 5000) |
| `CORS_ORIGIN` | Frontend URL for CORS | `http://localhost:5173` | Yes |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/valine` | Yes |
| `EMAIL_ENABLED` | Enable email sending | `true` or `false` | No (default: false) |
| `BASE_URL` | Frontend base URL for email links | `http://localhost:5173` | Yes (if EMAIL_ENABLED=true) |

**Note**: In development with `EMAIL_ENABLED=false`, verification emails are logged to console instead of being sent.

### Frontend (`/.env` or `/.env.local`)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_API_BASE` | Backend API base URL | `http://localhost:5000` | Yes |
| `VITE_API_INTEGRATION` | Enable real API calls | `true` or `false` | No (default: false) |

## Quickstart

### Prerequisites

- Node.js 20.x or later
- PostgreSQL database (or use Supabase free tier)
- npm or yarn package manager

### 1. Database Setup

First, ensure your PostgreSQL database is running and accessible. The database schema will be automatically created via Prisma migrations.

```powershell
# Set your database URL
$env:DATABASE_URL = "postgresql://username:password@localhost:5432/valine_db"

# Run Prisma migrations (from project root)
cd api
npx prisma migrate deploy
```

### 2. Start the Backend Server

```powershell
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Edit .env and set your values:
# - JWT_SECRET (use a strong random string)
# - DATABASE_URL (your PostgreSQL connection string)
# - CORS_ORIGIN (http://localhost:5173)

# Start the development server
npm run dev
```

The server will start on `http://localhost:5000` by default.

### 3. Start the Frontend

```powershell
# Navigate to project root
cd ..

# Install dependencies (if not already done)
npm install

# Create .env file from example
cp .env.local.example .env

# Edit .env and set:
# VITE_API_BASE=http://localhost:5000
# VITE_API_INTEGRATION=true

# Start the development server
npm run dev
```

The frontend will start on `http://localhost:5173` (or `http://localhost:5174` if 5173 is taken).

### 4. Test Account Creation

**Using the UI**:
1. Navigate to `http://localhost:5173/signup` (or `/register`)
2. Fill in the registration form
3. Submit and verify you receive a JWT token

**Using curl**:
```powershell
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "email": "test@example.com", "username": "testuser", "password": "TestPass123!", "displayName": "Test User" }' -ContentType 'application/json'```

## Security Notes

### Password Hashing

Passwords are securely hashed using **bcrypt** with the following specifications:

- **Algorithm**: bcrypt (via `bcryptjs` library)
- **Salt Rounds**: 10 (2^10 = 1,024 iterations)
- **Output**: 60-character hash stored in database
- **Implementation**: `server/src/utils/crypto.js`

**Example**:
```javascript
import bcrypt from 'bcryptjs'

// Hashing (during registration)
const hashedPassword = await bcrypt.hash(plainPassword, 10)

// Verification (during login)
const isValid = await bcrypt.compare(plainPassword, hashedPassword)
```

**Security Features**:
- Automatically salted (unique salt per password)
- Resistant to rainbow table attacks
- Computationally expensive to brute force
- Industry-standard algorithm (OWASP recommended)

### Uniqueness Enforcement

The system enforces uniqueness constraints at two levels:

1. **Database Level** (Primary):
   - Unique constraint on `email` column
   - Unique constraint on `username` column
   - Prevents race conditions and duplicate entries

2. **Application Level** (User-friendly errors):
   - Pre-check before insertion using Prisma `findFirst`
   - Returns specific error messages:
     - "Email already registered" (for duplicate email)
     - "Username already taken" (for duplicate username)

**Database Schema** (Prisma):
```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  username     String   @unique
  password     String
  displayName  String
  emailVerified Boolean @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### JWT Token Security

- **Secret**: Configurable via `JWT_SECRET` environment variable
- **Expiration**: 7 days by default (configurable via `JWT_EXPIRES_IN`)
- **Payload**: Contains `userId`, `email`, and optional `sessionId`
- **Algorithm**: HS256 (HMAC with SHA-256)

**⚠️ Important**: Always use a strong, randomly generated `JWT_SECRET` in production. Never commit secrets to version control.

### Rate Limiting

Registration endpoint is protected with rate limiting:
- **Limit**: 3 attempts per hour per IP address
- **Window**: 60 minutes (3,600,000 milliseconds)
- **Reset**: Automatically reset on successful registration
- **Implementation**: `express-rate-limit` middleware

## TODO: Future Enhancements

The following features are planned for future releases:

### Email Verification (Phase 2)
- [ ] Implement email verification link delivery
- [ ] Add verification token expiration handling
- [ ] Create email verification UI flow
- [ ] Add resend verification email endpoint
- [ ] Implement verified vs. unverified user permissions

### Login Endpoint (Phase 2)
- [ ] Create POST `/auth/login` endpoint
- [ ] Support login with email or username
- [ ] Add optional 2FA support
- [ ] Implement session tracking
- [ ] Add "remember me" functionality

### Rate Limiting Enhancements (Phase 3)
- [ ] Add sliding window rate limiting
- [ ] Implement distributed rate limiting (Redis)
- [ ] Add IP reputation scoring
- [ ] Create admin dashboard for rate limit monitoring
- [ ] Add CAPTCHA for suspicious activity

### Password Requirements (Phase 3)
- [ ] Enforce minimum password length (8+ characters)
- [ ] Require password complexity (uppercase, lowercase, numbers, symbols)
- [ ] Add password strength indicator in UI
- [ ] Implement password breach checking (Have I Been Pwned API)
- [ ] Add password history to prevent reuse

### Account Security (Phase 4)
- [ ] Add two-factor authentication (2FA)
- [ ] Implement security questions
- [ ] Add device/session management
- [ ] Create account recovery flow
- [ ] Add suspicious login detection

### Validation & Error Handling (Phase 2)
- [ ] Add email format validation
- [ ] Implement username format rules (alphanumeric, length)
- [ ] Add profanity filter for usernames
- [ ] Improve error messages with specific validation failures
- [ ] Add internationalization (i18n) for error messages

### Audit & Monitoring (Phase 3)
- [ ] Log all registration attempts (success/failure)
- [ ] Add metrics for registration conversion rate
- [ ] Implement fraud detection
- [ ] Create registration analytics dashboard
- [ ] Add automated alerting for suspicious patterns

### Testing (Ongoing)
- [ ] Add comprehensive unit tests for registration endpoint
- [ ] Create integration tests for full signup flow
- [ ] Add load testing for rate limiting
- [ ] Implement security testing (SQL injection, XSS)
- [ ] Add E2E tests with Playwright

---

## Related Documentation

- [Backend API Guide](backend/README.md) - Complete backend development guide
- [Authentication Security](backend/auth-security.md) - Advanced auth features
- [Database Setup](deployment/database-setup.md) - Database configuration
- [Environment Variables](.env.example) - All environment variables
- [Quick Start Guide](quickstart/README.md) - Getting started

## Support

For issues or questions:
- Check server logs for detailed error messages
- Review test output for E2E test failures
- Open GitHub issue with reproduction steps
- Contact development team

---

**Last Updated:** November 10, 2025  
**Version:** 1.0.0 (MVP)
- **GitHub Issues**: [Create an issue](https://github.com/gcolon75/Project-Valine/issues)
- **Documentation**: See [docs/](docs/) for comprehensive guides
- **API Reference**: See [docs/api/](docs/api/) for complete API documentation
