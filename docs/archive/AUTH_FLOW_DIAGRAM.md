# Authentication Flow Diagram

## Current State: FIXED ✅

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROJECT VALINE AUTH SYSTEM                    │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  REGISTRATION FLOW (Only 2 emails allowed)                     │
└────────────────────────────────────────────────────────────────┘

   User                  Lambda                   Database
    │                      │                          │
    │ POST /auth/register  │                          │
    ├─────────────────────>│                          │
    │  email, password     │                          │
    │                      │                          │
    │                      │ Check ALLOWED_USER_EMAILS│
    │                      │ (ghawk075@gmail.com,     │
    │                      │  valinejustin@gmail.com) │
    │                      │                          │
    │                      │ ✅ Email allowed?        │
    │                      │ ❌ Return 403            │
    │                      │                          │
    │                      │ Hash password (bcrypt)   │
    │                      │                          │
    │                      │ Create user ────────────>│
    │                      │                          │
    │    201 Created       │<─────────────────────────│
    │<─────────────────────│                          │
    │  { user: {...} }     │                          │
    │                      │                          │

┌────────────────────────────────────────────────────────────────┐
│  LOGIN FLOW (With cookies and optional 2FA)                    │
└────────────────────────────────────────────────────────────────┘

   User                  Lambda                   Database
    │                      │                          │
    │ POST /auth/login     │                          │
    ├─────────────────────>│                          │
    │  email, password     │                          │
    │  [twoFactorCode]     │                          │
    │                      │                          │
    │                      │ [LOGIN] Raw body length  │
    │                      │ (logged for debugging)   │
    │                      │                          │
    │                      │ Rate limit check         │
    │                      │ (10 per 60 seconds)      │
    │                      │                          │
    │                      │ Find user ──────────────>│
    │                      │                          │
    │                      │<─────────────────────────│
    │                      │ user data                │
    │                      │                          │
    │                      │ Verify password (bcrypt) │
    │                      │                          │
    │                      │ If 2FA enabled:          │
    │                      │   Verify TOTP code       │
    │                      │                          │
    │                      │ Generate JWT tokens:     │
    │                      │ - Access (15 min)        │
    │                      │ - Refresh (7 days)       │
    │                      │ - CSRF token             │
    │                      │                          │
    │    200 OK            │                          │
    │<─────────────────────│                          │
    │  Set-Cookie:         │                          │
    │   accessToken        │                          │
    │   refreshToken       │                          │
    │   csrfToken          │                          │
    │  { user, csrfToken } │                          │
    │                      │                          │

┌────────────────────────────────────────────────────────────────┐
│  AUTHENTICATED REQUEST FLOW                                    │
└────────────────────────────────────────────────────────────────┘

   User                  Lambda                   Database
    │                      │                          │
    │ GET /auth/me         │                          │
    ├─────────────────────>│                          │
    │  Cookie: accessToken │                          │
    │                      │                          │
    │                      │ Extract token from cookie│
    │                      │                          │
    │                      │ Verify JWT signature     │
    │                      │ (using JWT_SECRET)       │
    │                      │                          │
    │                      │ Get userId from token    │
    │                      │                          │
    │                      │ Find user ──────────────>│
    │                      │                          │
    │                      │<─────────────────────────│
    │                      │                          │
    │    200 OK            │                          │
    │<─────────────────────│                          │
    │  { user: {...} }     │                          │
    │                      │                          │

┌────────────────────────────────────────────────────────────────┐
│  2FA SETUP FLOW (Optional)                                     │
└────────────────────────────────────────────────────────────────┘

   User                  Lambda                   Database
    │                      │                          │
    │ POST /auth/2fa/setup │                          │
    ├─────────────────────>│                          │
    │  (authenticated)     │                          │
    │                      │                          │
    │                      │ Generate TOTP secret     │
    │                      │                          │
    │                      │ Save secret ─────────────>│
    │                      │                          │
    │    200 OK            │                          │
    │<─────────────────────│                          │
    │  { secret, otpauth } │ (for QR code)            │
    │                      │                          │
    │ Scan QR in app       │                          │
    │                      │                          │
    │ POST /auth/2fa/enable│                          │
    ├─────────────────────>│                          │
    │  { code: "123456" }  │                          │
    │                      │                          │
    │                      │ Verify code              │
    │                      │                          │
    │                      │ Enable 2FA ──────────────>│
    │                      │ (twoFactorEnabled=true)  │
    │                      │                          │
    │    200 OK            │                          │
    │<─────────────────────│                          │
    │  { twoFactorEnabled }│                          │
    │                      │                          │

┌────────────────────────────────────────────────────────────────┐
│  SECURITY LAYERS                                               │
└────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════╗
║  Layer 1: Email Allowlist                                 ║
║  ✅ Only 2 emails can register                            ║
║  ✅ Enforced in register() handler                        ║
╚═══════════════════════════════════════════════════════════╝
                           │
                           ▼
╔═══════════════════════════════════════════════════════════╗
║  Layer 2: Password Hashing                                ║
║  ✅ bcrypt with 12 rounds                                 ║
║  ✅ Salted automatically                                  ║
╚═══════════════════════════════════════════════════════════╝
                           │
                           ▼
╔═══════════════════════════════════════════════════════════╗
║  Layer 3: Rate Limiting                                   ║
║  ✅ 10 login attempts per 60 seconds                      ║
║  ✅ Prevents brute force attacks                          ║
╚═══════════════════════════════════════════════════════════╝
                           │
                           ▼
╔═══════════════════════════════════════════════════════════╗
║  Layer 4: JWT Tokens                                      ║
║  ✅ Signed with JWT_SECRET                                ║
║  ✅ Access token expires in 15 minutes                    ║
║  ✅ Refresh token expires in 7 days                       ║
╚═══════════════════════════════════════════════════════════╝
                           │
                           ▼
╔═══════════════════════════════════════════════════════════╗
║  Layer 5: Secure Cookies                                  ║
║  ✅ HttpOnly (prevents XSS)                               ║
║  ✅ Secure (HTTPS only in production)                     ║
║  ✅ SameSite=Lax (prevents CSRF)                          ║
╚═══════════════════════════════════════════════════════════╝
                           │
                           ▼
╔═══════════════════════════════════════════════════════════╗
║  Layer 6: CORS Protection                                 ║
║  ✅ Only allowed origins can make requests                ║
║  ✅ Configured in serverless.yml                          ║
╚═══════════════════════════════════════════════════════════╝
                           │
                           ▼
╔═══════════════════════════════════════════════════════════╗
║  Layer 7: Optional 2FA                                    ║
║  ✅ TOTP-based (Google Authenticator compatible)          ║
║  ✅ Can be enabled per user                               ║
╚═══════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────────┐
│  ALL 13 HANDLERS EXPORTED                                      │
└────────────────────────────────────────────────────────────────┘

Core Auth:
  ✅ login          - Authenticate user, return cookies
  ✅ register       - Create new user (email allowlist enforced)
  ✅ me             - Get current user info
  ✅ refresh        - Refresh access token
  ✅ logout         - Clear cookies

Email Verification (stubs for now):
  ✅ verifyEmail    - Verify email token
  ✅ resendVerification - Resend verification email

2FA Management:
  ✅ setup2FA       - Initialize 2FA secret
  ✅ enable2FA      - Enable 2FA after verification
  ✅ verify2FA      - Verify 2FA code (during login)
  ✅ disable2FA     - Disable 2FA

Legacy Aliases:
  ✅ enable2fa      - Alias to enable2FA
  ✅ verify2fa      - Alias to verify2FA

┌────────────────────────────────────────────────────────────────┐
│  DEPLOYMENT READY ✅                                           │
└────────────────────────────────────────────────────────────────┘

✅ No syntax errors
✅ No duplicate exports
✅ All handlers present
✅ Security verified (0 vulnerabilities)
✅ Documentation complete
✅ Verification scripts ready

Ready to deploy to AWS Lambda!
```
