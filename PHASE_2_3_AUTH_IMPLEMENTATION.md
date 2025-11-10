# Phase 2-3: Serverless Auth Parity and Email Verification

## Implementation Summary

This document describes the changes made to implement Phase 2-3 of the automation playbook, focusing on serverless authentication parity and email verification functionality.

## Changes Made

### 1. Password Hashing Security Upgrade

**File:** `serverless/src/handlers/auth.js`

- **Replaced SHA-256 with bcrypt** for secure password hashing
- Added `hashPassword()` function using bcryptjs with 10 salt rounds
- Added `comparePassword()` function for secure password verification
- Updated `register()` handler to use async bcrypt hashing
- Updated `login()` handler to use bcrypt comparison instead of hash matching

**Security Improvement:** bcrypt is specifically designed for password hashing with built-in salt generation and configurable work factor, making it resistant to brute-force attacks.

### 2. Email Verification System

**File:** `serverless/src/handlers/auth.js`

Added two new handler functions:

#### a. `verifyEmail()` - POST /auth/verify-email
- Validates email verification tokens
- Checks token expiration (24-hour validity)
- Handles already-verified accounts gracefully
- Updates user's `emailVerified` and `emailVerifiedAt` fields
- Cleans up used/expired tokens

**Error Codes:**
- 400: Invalid or expired token
- 200: Success (verified or already verified)

#### b. `resendVerification()` - POST /auth/resend-verification
- Requires authentication (JWT token)
- Only works for unverified accounts
- Generates new 24-hour verification token
- Cleans up old tokens before creating new one
- Sends verification email

**Error Codes:**
- 401: Unauthorized (no valid token)
- 400: Email already verified
- 404: User not found
- 200: Success

### 3. Registration Enhancement

**File:** `serverless/src/handlers/auth.js`

Updated the `register()` handler to:
- Create `normalizedEmail` field (lowercase, trimmed)
- Set `emailVerified: false` for new users
- Generate 24-hour verification token
- Store token in `EmailVerificationToken` table
- Send verification email (console in dev, SMTP when enabled)
- Include verification message in response

### 4. Login Enhancement

**File:** `serverless/src/handlers/auth.js`

Updated the `login()` handler to:
- Fetch user with password field for comparison
- Use bcrypt for password verification
- Include `emailVerified` status in response
- Remove password field from response (security)
- Log unverified logins (for monitoring)
- Note: Currently allows unverified users to login (can be changed to enforce verification)

### 5. Current User Endpoint Enhancement

**File:** `serverless/src/handlers/auth.js`

Updated the `me()` handler to:
- Include `emailVerified` field in user response

### 6. Email Sending Infrastructure

**File:** `serverless/src/handlers/auth.js`

Added `sendVerificationEmail()` helper function:
- **Development mode** (EMAIL_ENABLED=false): Logs verification URL to console
- **Production mode** (EMAIL_ENABLED=true): Placeholder for SMTP integration
- Uses FRONTEND_URL environment variable for verification links
- Generates clean, readable console output for development

### 7. Serverless Configuration Updates

**File:** `serverless/serverless.yml`

Added new Lambda function definitions:
- `verifyEmail` - Handler: `src/handlers/auth.verifyEmail`
- `resendVerification` - Handler: `src/handlers/auth.resendVerification`

Added environment variables:
- `JWT_SECRET` - JWT signing secret (required)
- `EMAIL_ENABLED` - Toggle for SMTP emails (default: false)
- `FRONTEND_URL` - Base URL for verification links (default: http://localhost:5173)

### 8. Dependencies

**File:** `serverless/package.json`

Added dependency:
- `bcryptjs: ^2.4.3` - Secure password hashing library

### 9. API Documentation

**File:** `serverless/API_DOCUMENTATION.md`

Updated documentation for:
- POST /auth/register - Added emailVerified field and message
- POST /auth/login - Added emailVerified field
- GET /auth/me - Added emailVerified field

Added new documentation for:
- POST /auth/verify-email - Full specification with examples
- POST /auth/resend-verification - Full specification with examples

## Database Schema Requirements

The implementation assumes the following Prisma schema models exist (already present in `api/prisma/schema.prisma`):

### User Model Fields
- `emailVerified: Boolean @default(false)`
- `emailVerifiedAt: DateTime?`
- `normalizedEmail: String @unique`

### EmailVerificationToken Model
```prisma
model EmailVerificationToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@map("email_verification_tokens")
  @@index([userId])
  @@index([token])
  @@index([expiresAt])
}
```

## Environment Variables

The following environment variables must be set for deployment:

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing
- `AWS_REGION` - AWS region (default: us-west-2)

### Optional
- `EMAIL_ENABLED` - Set to "true" to enable SMTP emails (default: false)
- `FRONTEND_URL` - Base URL for email verification links (default: http://localhost:5173)
- `MEDIA_BUCKET` - S3 bucket name (default: valine-media-uploads)

## Testing Verification

### Manual Testing with cURL

#### 1. Register a new user
```bash
curl -X POST https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "username": "testuser",
    "displayName": "Test User"
  }'
```

Expected: 201 response with user, token, and message about email verification

#### 2. Check console for verification token
Look for console output with verification URL (in development mode)

#### 3. Verify email
```bash
curl -X POST https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_FROM_CONSOLE"
  }'
```

Expected: 200 response with success message

#### 4. Login with verified account
```bash
curl -X POST https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'
```

Expected: 200 response with user (emailVerified: true) and token

#### 5. Resend verification (before verifying)
```bash
curl -X POST https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/auth/resend-verification \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: 200 response with message about email sent

## Error Handling

The implementation follows the playbook requirements for error codes:

- **400 Bad Request** - Invalid input, expired tokens, already verified
- **401 Unauthorized** - Invalid credentials, missing/invalid JWT token
- **403 Forbidden** - (Optional) Can be enabled to block unverified users from login
- **404 Not Found** - User not found
- **409 Conflict** - User already exists (register)
- **500 Internal Server Error** - Server errors

## Security Considerations

1. **bcrypt vs SHA-256**: bcrypt is cryptographically designed for password hashing with:
   - Adaptive cost factor (configurable work)
   - Built-in salt generation
   - Resistance to rainbow table attacks
   - Resistance to brute-force attacks

2. **Token Security**:
   - 32-byte random tokens (crypto.randomBytes)
   - 24-hour expiration
   - Single-use tokens (deleted after verification)
   - Indexed for fast lookup

3. **JWT Security**:
   - Uses JWT_SECRET from environment
   - 7-day token expiration
   - Token includes only userId claim

4. **Email Verification**:
   - Tokens stored in database, not embedded in JWT
   - Expired tokens automatically rejected
   - Allows resending without security risk

## Future Enhancements

1. **SMTP Integration**: Implement actual email sending when EMAIL_ENABLED=true
2. **Rate Limiting**: Add rate limiting to prevent abuse of resend endpoint
3. **Email Templates**: Create HTML email templates for verification
4. **Enforce Verification**: Optionally require email verification before allowing login (return 403)
5. **Password Reset**: Similar flow using PasswordResetToken model
6. **Email Change**: Add endpoint to change email with re-verification

## Compliance with Playbook

✅ **Phase 2 Requirements**:
- Validated bcrypt hashing/comparison
- Verified JWT is signed with JWT_SECRET
- Confirmed GET /auth/me returns expected user shape with emailVerified field
- Ensured error codes: 401 for invalid creds, 409 for conflicts

✅ **Phase 3 Requirements**:
- Added POST /auth/verify-email (token in body; verify and mark user as verified)
- Added POST /auth/resend-verification (auth required; send new verification token)
- In dev: logs verification emails to console
- When EMAIL_ENABLED=true: ready for SMTP integration
- Updated serverless.yml with new endpoints

## Files Modified

1. `serverless/package.json` - Added bcryptjs dependency
2. `serverless/package-lock.json` - Lock file updated
3. `serverless/serverless.yml` - Added 2 endpoints and 3 environment variables
4. `serverless/src/handlers/auth.js` - Complete auth parity implementation
5. `serverless/API_DOCUMENTATION.md` - Updated with new endpoints

## Next Steps

1. Deploy to staging environment
2. Test all auth flows end-to-end
3. Implement SMTP email sending for production
4. Update frontend to call new verification endpoints
5. Add integration tests for email verification flow
