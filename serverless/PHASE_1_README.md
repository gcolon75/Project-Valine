# Phase 1: Verification Enforcement & Resend Endpoint Integrity

## Summary

This PR implements Phase 1 of the backend security roadmap, focusing on email verification enforcement to ensure account safety for real user creation.

## Changes

### 1. Database Schema Updates

**Added to `User` model:**
- `normalizedEmail` (String?, unique) - Lowercase normalized email for case-insensitive lookups
- `emailVerified` (Boolean, default: false) - Email verification status
- `emailVerifiedAt` (DateTime?) - Timestamp of when email was verified

**New model: `EmailVerificationToken`**
- `id` (String, PK)
- `userId` (String, FK to User)
- `token` (String, unique)
- `expiresAt` (DateTime)
- `createdAt` (DateTime)

**Migration file:** `serverless/prisma/migrations/20251111191723_add_email_verification/migration.sql`

### 2. Verification Enforcement on Protected Endpoints

Updated the following handlers to require email verification:

- **Profiles:**
  - `POST /profiles` - Create profile (requires verified email)
  - `PUT /profiles/{id}` - Update profile (already had enforcement)

- **Media:**
  - `POST /profiles/{id}/media/upload-url` - Start media upload (already had enforcement)
  - `POST /profiles/{id}/media/complete` - Complete media upload (now enforced)

- **Settings:**
  - `PUT /settings` - Update user settings (already had enforcement)

**Enforcement mechanism:** Uses `requireEmailVerified(userId)` middleware that returns 403 if user email is not verified.

### 3. Rate Limiting for Verification Resend

**Updated rate limit configuration:**
- Added `emailVerification` config: 5 requests per hour
- Applied to `POST /auth/resend-verification` endpoint

**Implementation:**
- Uses existing rate limiting middleware with Redis/in-memory fallback
- Returns 429 with `Retry-After` header when limit exceeded
- Includes rate limit headers in successful responses

### 4. Security Enhancements

**Token masking in logs:**
- Verification tokens are masked in logs (shows first 8 and last 4 chars)
- Prevents token leakage in development/production logs

**Email sending:**
- Respects `EMAIL_ENABLED` environment variable
- Dev mode: logs to console with masked token
- Production mode: ready for SMTP integration (TODO)

### 5. Environment Configuration

**New environment variables in `.env.example`:**
```bash
# Email Configuration (Phase 1)
EMAIL_ENABLED=false
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=noreply@projectvaline.com
FRONTEND_URL=http://localhost:5173
```

## Security Impact

### Protections Added
1. **Unverified users blocked** from creating profiles, uploading media, or changing settings
2. **Rate limiting** prevents verification email abuse (5 per hour per user)
3. **Token security** via masking in logs and 24-hour expiry

### Attack Vectors Mitigated
- Email verification bypass attempts
- Spam/abuse via unlimited verification emails
- Token harvesting from logs

## Testing

### Automated Tests
- `serverless/tests/verification-enforcement.test.js` - Comprehensive test scenarios
- Test coverage includes:
  - Unverified user blocked (403)
  - Verified user allowed (200/201)
  - Rate limiting (429 after limit)
  - Token masking in logs

### Manual Testing (cURL examples)

**1. Test unverified user blocked:**
```bash
# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","username":"testuser","displayName":"Test"}' \
  -c cookies.txt

# Try to create profile (expect 403)
curl -X POST http://localhost:3000/profiles \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"vanityUrl":"testuser","headline":"Test"}' \
  -v
```

**2. Test rate limiting:**
```bash
# Send 6 requests (6th should fail with 429)
for i in {1..6}; do
  curl -X POST http://localhost:3000/auth/resend-verification -b cookies.txt -v
  sleep 1
done
```

**3. Test verified user allowed:**
```bash
# Manually verify user in DB
psql $DATABASE_URL -c "UPDATE users SET \"emailVerified\"=true WHERE email='test@example.com'"

# Create profile (expect 201)
curl -X POST http://localhost:3000/profiles \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"vanityUrl":"testuser","headline":"Test"}' \
  -v
```

## Migration Steps

### Apply Migration
```bash
# Development
cd serverless
npm run prisma:migrate

# Production (after PR merge)
npm run prisma:deploy
```

### Rollback (if needed)
```bash
# Execute rollback script
psql $DATABASE_URL -f serverless/prisma/migrations/20251111191723_add_email_verification/rollback.sql
```

## Rollback Instructions

### Option 1: Feature Flag Disable
Set `EMAIL_ENABLED=false` in environment (already default). This keeps the code but doesn't enforce SMTP sending.

**Note:** Verification enforcement is NOT feature-flagged as it's a critical security control. To disable enforcement, revert the PR.

### Option 2: Database Rollback
```bash
# Run rollback SQL
psql $DATABASE_URL -f serverless/prisma/migrations/20251111191723_add_email_verification/rollback.sql

# Revert code changes
git revert <commit-hash>
```

### Option 3: Emergency Bypass (Production)
If verification is blocking legitimate users:
```sql
-- Temporarily mark all users as verified (use with caution)
UPDATE users SET "emailVerified" = true WHERE "emailVerified" = false;
```

## Environment Setup for Deployment

### Development
```bash
EMAIL_ENABLED=false
FRONTEND_URL=http://localhost:5173
```

### Staging
```bash
EMAIL_ENABLED=false  # Or true with test SMTP
FRONTEND_URL=https://staging.yourdomain.com
SMTP_HOST=smtp.mailtrap.io  # Use test SMTP service
SMTP_PORT=587
SMTP_USER=<mailtrap-user>
SMTP_PASS=<mailtrap-pass>
FROM_EMAIL=noreply@staging.yourdomain.com
```

### Production
```bash
EMAIL_ENABLED=true
FRONTEND_URL=https://yourdomain.com
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<sendgrid-api-key>
FROM_EMAIL=noreply@yourdomain.com
```

## Files Modified

- `serverless/prisma/schema.prisma` - Added email verification fields and model
- `serverless/prisma/migrations/20251111191723_add_email_verification/migration.sql` - Migration
- `serverless/prisma/migrations/20251111191723_add_email_verification/rollback.sql` - Rollback
- `serverless/src/config/rateLimits.js` - Added email verification rate limit config
- `serverless/src/handlers/auth.js` - Added rate limiting to resendVerification, masked tokens
- `serverless/src/handlers/profiles.js` - Added verification requirement to createProfile
- `serverless/src/handlers/media.js` - Added verification requirement to completeUpload
- `serverless/.env.example` - Documented EMAIL_* variables
- `serverless/tests/verification-enforcement.test.js` - Test suite

## Next Steps (Phase 2)

Phase 2 will implement:
- Refresh token persistence and auditing
- Session listing and revocation
- 2FA scaffold (setup, enable, verify endpoints)
- Enhanced session security with JTI rotation

## Success Criteria

✅ Schema migration applied without breaking changes  
✅ Unverified users receive 403 on protected endpoints  
✅ Verified users can access all endpoints normally  
✅ Rate limiting prevents email spam (5/hour limit)  
✅ Tokens masked in logs for security  
✅ Rollback plan tested and documented  

## Risk Analysis

**Low Risk:**
- Additive schema changes (no data loss)
- Feature flag available for email sending
- Comprehensive rollback plan

**Medium Risk:**
- Existing unverified users may be locked out of features
  - Mitigation: Provide clear error message with resend link
  - Mitigation: Support team can manually verify users if needed

**High Risk:**
- None identified

## Deployment Checklist

- [ ] Review PR and approve
- [ ] Merge to main branch
- [ ] Deploy to staging environment
- [ ] Run migration on staging database
- [ ] Test verification flow on staging
- [ ] Monitor error rates and logs
- [ ] Deploy to production (off-peak hours)
- [ ] Run migration on production database
- [ ] Verify existing users can still login
- [ ] Monitor for verification-related support tickets
- [ ] Update documentation and support runbooks
