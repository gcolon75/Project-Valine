# Account Creation MVP

## Overview

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
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "username": "alicewonder",
    "password": "MySecurePass123!",
    "displayName": "Alice Wonder"
  }'
```

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
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "username": "anotheralice",
    "password": "Password123!",
    "displayName": "Another Alice"
  }'
```

**Response** (409):
```json
{
  "error": "USER_EXISTS",
  "message": "Email already registered"
}
```

### Example 3: Missing Required Fields

**Request**:
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@example.com",
    "password": "BobPass123!"
  }'
```

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

```bash
# Set your database URL
export DATABASE_URL="postgresql://username:password@localhost:5432/valine_db"

# Run Prisma migrations (from project root)
cd api
npx prisma migrate deploy
```

### 2. Start the Backend Server

```bash
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

```bash
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
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPass123!",
    "displayName": "Test User"
  }'
```

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
- **GitHub Issues**: [Create an issue](https://github.com/gcolon75/Project-Valine/issues)
- **Documentation**: See [docs/](docs/) for comprehensive guides
- **API Reference**: See [docs/api/](docs/api/) for complete API documentation
