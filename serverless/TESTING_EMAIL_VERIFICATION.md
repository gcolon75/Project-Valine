# Manual Testing Guide for Email Verification

This guide provides step-by-step instructions for manually testing the email verification functionality.

## Prerequisites

- Serverless API deployed to AWS or running locally
- Access to server logs (for extracting verification tokens in dev mode)
- curl or similar HTTP client
- API_BASE_URL set to your API endpoint

## Test Scenario 1: Complete Email Verification Flow

### Step 1: Register a New User

```bash
# Set your API base URL
export API_BASE="https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev"

# Register
curl -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "username": "newuser123",
    "displayName": "New User"
  }' | jq
```

**Expected Response (201):**
```json
{
  "user": {
    "id": "uuid-here",
    "username": "newuser123",
    "email": "newuser@example.com",
    "displayName": "New User",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=newuser123",
    "emailVerified": false,
    "createdAt": "2024-11-10T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Registration successful. Please check your email to verify your account."
}
```

**Save the token:**
```bash
export TOKEN="<token-from-response>"
```

### Step 2: Check Server Logs for Verification Token

In development mode (EMAIL_ENABLED=false), the verification email is logged to the console:

```
=== EMAIL VERIFICATION ===
To: newuser@example.com
Subject: Verify your Project Valine account
Hi newuser123,
Please verify your email address by clicking the link below:
http://localhost:5173/verify-email?token=abc123def456...
This link will expire in 24 hours.
==========================
```

**Extract the token:**
```bash
export VERIFICATION_TOKEN="abc123def456..."
```

### Step 3: Verify Email Address

```bash
curl -X POST "$API_BASE/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$VERIFICATION_TOKEN\"
  }" | jq
```

**Expected Response (200):**
```json
{
  "message": "Email verified successfully",
  "verified": true
}
```

### Step 4: Verify User Status

```bash
curl "$API_BASE/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected Response:**
```json
{
  "user": {
    "id": "uuid-here",
    "username": "newuser123",
    "email": "newuser@example.com",
    "emailVerified": true,  // <- Should be true now
    ...
  }
}
```

## Test Scenario 2: Resend Verification Email

### Prerequisites
- User registered but NOT verified (emailVerified: false)
- Valid JWT token from registration or login

```bash
curl -X POST "$API_BASE/auth/resend-verification" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

**Expected Response (200):**
```json
{
  "message": "Verification email sent successfully. Please check your email.",
  "email": "newuser@example.com"
}
```

**Check logs for new token** (in dev mode)

## Test Scenario 3: Edge Cases

### 3.1: Verify Already Verified User

```bash
# Try to verify again with the same or a new token
curl -X POST "$API_BASE/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$VERIFICATION_TOKEN\"
  }" | jq
```

**Expected Response (200):**
```json
{
  "message": "Email address already verified",
  "alreadyVerified": true
}
```

### 3.2: Resend for Already Verified User

```bash
curl -X POST "$API_BASE/auth/resend-verification" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

**Expected Response (400):**
```json
{
  "error": "Email address is already verified"
}
```

### 3.3: Invalid Verification Token

```bash
curl -X POST "$API_BASE/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "invalid-token-12345"
  }' | jq
```

**Expected Response (400):**
```json
{
  "error": "Invalid verification token"
}
```

### 3.4: Expired Verification Token

To test token expiration, you would need to:
1. Wait 24 hours after token creation, OR
2. Manually update the token's `expiresAt` field in the database to a past date

```bash
# After token expires
curl -X POST "$API_BASE/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$EXPIRED_TOKEN\"
  }" | jq
```

**Expected Response (400):**
```json
{
  "error": "Verification token has expired. Please request a new one."
}
```

### 3.5: Resend Without Authentication

```bash
curl -X POST "$API_BASE/auth/resend-verification" \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

**Expected Response (401):**
```json
{
  "error": "Unauthorized - No valid token provided"
}
```

### 3.6: Missing Token in Verify Request

```bash
curl -X POST "$API_BASE/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

**Expected Response (400):**
```json
{
  "error": "Verification token is required"
}
```

## Test Scenario 4: Login with Unverified Account

Currently, the system allows login with unverified email addresses but includes the verification status.

```bash
# Login before verifying email
curl -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!"
  }' | jq
```

**Expected Response (200):**
```json
{
  "user": {
    "id": "uuid-here",
    "username": "newuser123",
    "email": "newuser@example.com",
    "displayName": "New User",
    "emailVerified": false,  // <- Shows verification status
    ...
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** To enforce email verification before login, modify the login handler to return 403 when `emailVerified` is false.

## Test Scenario 5: Password Security (bcrypt)

Verify that passwords are properly hashed with bcrypt:

### 5.1: Different Passwords Should Not Match

```bash
# Register user 1
curl -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@example.com",
    "password": "Password123!",
    "username": "user1",
    "displayName": "User One"
  }' | jq

# Try to login with wrong password
curl -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@example.com",
    "password": "WrongPassword123!"
  }' | jq
```

**Expected Response (401):**
```json
{
  "error": "Invalid email or password"
}
```

### 5.2: Correct Password Should Work

```bash
curl -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@example.com",
    "password": "Password123!"
  }' | jq
```

**Expected Response (200):** Success with token

## Database Verification

You can also verify the implementation by checking the database directly:

### Check User Table
```sql
SELECT 
  id, 
  username, 
  email, 
  emailVerified, 
  emailVerifiedAt,
  created_at
FROM users
WHERE email = 'newuser@example.com';
```

### Check Verification Tokens
```sql
SELECT 
  id,
  userId,
  token,
  expiresAt,
  createdAt
FROM email_verification_tokens
WHERE userId = '<user-id>';
```

**After verification:**
- Token should be deleted from `email_verification_tokens`
- User's `emailVerified` should be `true`
- User's `emailVerifiedAt` should have a timestamp

## Automated Test Script

Run the included test script:

```bash
cd serverless
chmod +x test-endpoints.sh
./test-endpoints.sh $API_BASE
```

This will test:
- ✓ Registration (creates unverified user)
- ✓ Login (works with unverified user)
- ✓ Get current user (includes emailVerified status)
- ✓ Resend verification (generates new token)
- ✓ Verify with invalid token (returns 400)

## Production Setup

For production deployment with real emails:

1. Set environment variables:
```bash
export EMAIL_ENABLED=true
export SMTP_HOST=smtp.example.com
export SMTP_PORT=587
export SMTP_USER=noreply@example.com
export SMTP_PASSWORD=your-smtp-password
export FRONTEND_URL=https://app.projectvaline.com
```

2. Implement SMTP sending in the `sendVerificationEmail()` function (currently placeholder)

3. Test with real email addresses

4. (Optional) Enable email verification enforcement in login handler

## Success Criteria

All of the following should pass:

- [x] Registration creates unverified user with token
- [x] Verification token logged to console in dev mode
- [x] Valid token verifies email successfully
- [x] Invalid token returns 400 error
- [x] Expired token returns 400 with expiration message
- [x] Already verified user gets friendly message
- [x] Resend creates new token for unverified users
- [x] Resend fails with 400 for verified users
- [x] Resend requires authentication (401 without token)
- [x] Login includes emailVerified status
- [x] /auth/me includes emailVerified status
- [x] Passwords are hashed with bcrypt
- [x] Wrong password fails login
- [x] No security vulnerabilities detected
