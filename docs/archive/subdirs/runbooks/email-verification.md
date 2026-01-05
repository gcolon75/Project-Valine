# Email Verification Runbook

## Overview
Operational procedures for email verification flows in Project Valine, including initial signup verification and email change verification.

**Last Updated**: 2025-11-05  
**Owner**: Security & Operations Team  
**Severity**: P2 (Registration-blocking)

---

## Table of Contents
- [Signup Email Verification](#signup-email-verification)
- [Email Change Verification](#email-change-verification)
- [Resend Verification Email](#resend-verification-email)
- [Manual Verification](#manual-verification)
- [Troubleshooting](#troubleshooting)
- [Monitoring & Alerts](#monitoring--alerts)

---

## Signup Email Verification

### Flow Overview
1. User submits signup form
2. Account created with `email_verified = false`
3. Verification email sent with unique token
4. User clicks verification link
5. Account activated (`email_verified = true`)

### Detailed Procedure

#### 1. User Registration
**Endpoint**: `POST /api/auth/signup`

**Request**:
```json
{
  "email": "newuser@example.com",
  "password": "SecureP@ssw0rd!",
  "username": "newuser",
  "displayName": "New User"
}
```

**Validation**:
- Email format valid
- Email not already registered
- Password meets security requirements
- Username not taken (3-30 chars, alphanumeric + underscore)

**Response** (201 Created):
```json
{
  "success": true,
  "userId": "usr_abc123",
  "message": "Account created. Please check your email to verify your account."
}
```

#### 2. Generate Verification Token
```javascript
// Token generation
const token = crypto.randomBytes(32).toString('hex')
const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

// Store in database
await db.emailVerificationTokens.create({
  userId: user.id,
  tokenHash: tokenHash,
  email: user.email,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  createdAt: new Date()
})
```

**Token Properties**:
- **Length**: 64 hex characters
- **Expiry**: 24 hours
- **Storage**: SHA-256 hash only
- **Single Use**: Token invalidated after use

#### 3. Send Verification Email
**Template**: `email_verification.html`

**Subject**: "Verify Your Valine Account"

**Content**:
```html
<h1>Welcome to Valine!</h1>
<p>Click the button below to verify your email address:</p>
<a href="https://valine.app/verify-email?token={token}">Verify Email</a>
<p>Or copy this link: https://valine.app/verify-email?token={token}</p>
<p>This link expires in 24 hours.</p>
<p>If you didn't create a Valine account, you can safely ignore this email.</p>
```

**Email Service Integration**:
```javascript
// Using SendGrid/Mailgun
await emailService.send({
  to: user.email,
  from: 'noreply@valine.app',
  subject: 'Verify Your Valine Account',
  template: 'email_verification',
  data: {
    username: user.username,
    verificationUrl: `https://valine.app/verify-email?token=${token}`
  }
})
```

#### 4. User Clicks Verification Link
**Endpoint**: `POST /api/auth/verify-email`

**Request**:
```json
{
  "token": "abc123def456..."
}
```

**Backend Validation**:
1. **Hash token**:
   ```javascript
   const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
   ```

2. **Find token record**:
   ```sql
   SELECT * FROM email_verification_tokens
   WHERE token_hash = ?
   AND expires_at > NOW()
   AND used_at IS NULL
   ```

3. **Update user**:
   ```sql
   UPDATE users
   SET email_verified = true,
       email_verified_at = NOW()
   WHERE id = ?
   ```

4. **Invalidate token**:
   ```sql
   UPDATE email_verification_tokens
   SET used_at = NOW()
   WHERE id = ?
   ```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Email verified successfully! You can now log in."
}
```

#### 5. Post-Verification Actions
1. **Create welcome notification**:
   ```javascript
   await notifications.create({
     userId: user.id,
     type: 'WELCOME',
     title: 'Welcome to Valine!',
     message: 'Your account is now active. Complete your profile to get started.'
   })
   ```

2. **Log event**:
   ```javascript
   auditLog.create({
     event: 'EMAIL_VERIFIED',
     userId: user.id,
     metadata: {
       email: user.email,
       verifiedAt: new Date(),
       ip: req.ip
     }
   })
   ```

3. **Send welcome email** (optional):
   - Template: `welcome_email.html`
   - Subject: "Welcome to Valine!"

---

## Email Change Verification

### Flow Overview
Users changing their email must verify both old and new addresses.

### Procedure

#### 1. User Requests Email Change
**Endpoint**: `POST /api/users/me/email`

**Request**:
```json
{
  "newEmail": "newemail@example.com",
  "password": "CurrentP@ssw0rd!"
}
```

**Validation**:
- Password correct (security confirmation)
- New email format valid
- New email not already in use
- User's current email verified

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Verification emails sent to both addresses. Please verify to complete the change."
}
```

#### 2. Create Pending Email Change
```sql
INSERT INTO pending_email_changes (
  user_id,
  old_email,
  new_email,
  old_email_token_hash,
  new_email_token_hash,
  expires_at,
  created_at
) VALUES (?, ?, ?, ?, ?, NOW() + INTERVAL '24 hours', NOW())
```

#### 3. Send Verification Emails

**To Old Email** - Security notification:
```
Subject: Confirm Email Change Request

Someone requested to change your Valine email from this address to newemail@example.com.

If this was you, click here to confirm: [confirmation link]

If this wasn't you, your account may be compromised. Please reset your password immediately.
```

**To New Email** - Verification:
```
Subject: Verify Your New Valine Email

Click below to complete your email change:
[verification link]

This link expires in 24 hours.
```

#### 4. User Verifies Both Emails
**Endpoint**: `POST /api/auth/verify-email-change`

**Request**:
```json
{
  "oldEmailToken": "token1...",
  "newEmailToken": "token2..."
}
```

**Validation**:
- Both tokens valid and not expired
- Tokens match same pending change request
- Both tokens not already used

**Actions**:
1. Update user email
2. Mark email as verified
3. Invalidate all existing sessions (security)
4. Delete pending change record
5. Send confirmation to both addresses

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Email changed successfully. Please log in again."
}
```

---

## Resend Verification Email

### When to Use
- Original email lost or expired
- Email delivery failed
- User didn't receive email

### Rate Limits
- **Per User**: 3 requests per hour
- **Per IP**: 10 requests per hour

### Procedure

#### 1. User Requests Resend
**Endpoint**: `POST /api/auth/resend-verification`

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Validation**:
- Email exists in system
- Email not already verified
- Rate limit not exceeded

**Response** (200 OK):
```json
{
  "success": true,
  "message": "If an unverified account exists, a new verification email has been sent."
}
```

**Security Note**: Same response regardless of email existence to prevent enumeration.

#### 2. Generate New Token
```javascript
// Invalidate previous unused tokens
await db.emailVerificationTokens.updateMany({
  where: {
    userId: user.id,
    usedAt: null
  },
  data: {
    invalidatedAt: new Date()
  }
})

// Generate and send new token
const newToken = generateVerificationToken()
await sendVerificationEmail(user.email, newToken)
```

---

## Manual Verification

### When to Use
- Email service outage preventing verification
- User unable to receive emails (email provider issues)
- Emergency verification needed
- Support ticket escalation

### Prerequisites
- Admin/support privileges
- User identity verified through support channel
- Support ticket created

### Procedure

#### 1. Verify Admin Authorization
```powershell
# Check admin permissions
SELECT role FROM users WHERE id = ?
# Must have role = 'admin' or 'support_tier1'
```

#### 2. Manual Email Verification
**Endpoint**: `POST /api/admin/users/:userId/verify-email`

**Request**:
```json
{
  "reason": "Email service outage - user unable to verify",
  "ticketId": "SUP-67890",
  "verifiedBy": "admin_user_id"
}
```

**Actions**:
```sql
-- Mark email as verified
UPDATE users
SET email_verified = true,
    email_verified_at = NOW(),
    manual_verification = true
WHERE id = ?;

-- Log admin action
INSERT INTO audit_logs (
  event,
  user_id,
  admin_id,
  metadata,
  created_at
) VALUES (
  'MANUAL_EMAIL_VERIFICATION',
  ?,
  ?,
  jsonb_build_object(
    'reason', ?,
    'ticketId', ?
  ),
  NOW()
);
```

#### 3. Notify User
Send email confirming manual verification:
```
Subject: Your Valine Email Has Been Verified

Your email has been verified by our support team. Your account is now active.

If you have any questions, please refer to support ticket: SUP-67890
```

---

## Troubleshooting

### Email Not Received

**Check**:
1. **Spam folder**
2. **Email service operational**:
   ```powershell
   # Check email service status
   aws cloudwatch get-metric-statistics \
     --namespace AWS/SES \
     --metric-name Send \
     --start-time $(date -u -d '1 hour ago' --iso-8601) \
     --end-time $(date -u --iso-8601) \
     --period 300 \
     --statistics Sum
   ```

3. **Email logs**:
   ```sql
   SELECT * FROM email_logs
   WHERE recipient = 'user@example.com'
   AND template = 'email_verification'
   ORDER BY created_at DESC
   LIMIT 5
   ```

**Resolution**:
- Verify email not bounced/blocked
- Resend verification email
- Use manual verification if persistent issue

### Token Expired

**User Message**: "Verification link expired. Please request a new one."

**Resolution**:
- User clicks "Resend verification email"
- New token generated with 24-hour expiry

### Token Invalid

**User Message**: "Invalid verification link. Please request a new one."

**Possible Causes**:
- Token typo in URL
- Token already used
- Token manually invalidated

**Resolution**:
- User requests new verification email
- Check audit logs for suspicious activity

### Account Already Verified

**User Message**: "This account is already verified. You can log in."

**Action**: Redirect to login page

### Email Already Registered

**Scenario**: User tries to sign up with already-verified email

**Response**:
```json
{
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "An account with this email already exists.",
    "details": {
      "hint": "Try logging in or use password reset if you forgot your password."
    }
  }
}
```

---

## Monitoring & Alerts

### Metrics to Track

**Key Metrics**:
```
# Verification completion rate
(verified_emails / sent_verification_emails) * 100

# Average time to verify
AVG(email_verified_at - created_at) FROM users WHERE email_verified = true

# Expired tokens rate
(expired_tokens / total_tokens) * 100

# Resend requests
COUNT(*) FROM email_verification_tokens GROUP BY user_id HAVING COUNT(*) > 1
```

**Grafana Queries**:
```
# Verification success rate
sum(rate(email_verification_success_total[1h])) / sum(rate(email_verification_sent_total[1h]))

# Pending verifications by age
histogram_quantile(0.95, email_verification_pending_age_hours)

# Failed verifications
sum(rate(email_verification_failed_total[5m])) by (reason)
```

### Alert Thresholds

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Low Verification Rate | <50% for 1 hour | P2 | Check email service |
| Email Service Down | 0 emails sent for 10 min | P1 | Page on-call |
| High Resend Rate | >30% users requesting resend | P3 | Investigate delivery |
| Token Expiry Spike | >40% tokens expiring unused | P3 | Review user experience |

### CloudWatch Alarms

```yaml
# serverless.yml
custom:
  alerts:
    - EmailVerificationLowRate:
        metric: EmailVerificationSuccessRate
        threshold: 50
        period: 3600
        evaluationPeriods: 1
        statistic: Average
        comparisonOperator: LessThanThreshold
        
    - EmailVerificationServiceDown:
        metric: EmailsSent
        threshold: 1
        period: 600
        evaluationPeriods: 1
        statistic: Sum
        comparisonOperator: LessThanThreshold
```

---

## Security Considerations

### Token Security
- **Generation**: Cryptographically random (32 bytes)
- **Storage**: SHA-256 hash only (never plaintext)
- **Expiration**: 24 hours (configurable)
- **Single Use**: Token invalidated after successful verification
- **Transmission**: HTTPS only, no token in logs

### Rate Limiting
- **Per User**: 3 resend requests per hour
- **Per IP**: 10 resend requests per hour
- **Global**: 100 requests per minute (DDoS protection)

### Email Security
- **SPF**: Configured for valine.app domain
- **DKIM**: All emails signed
- **DMARC**: Policy set to quarantine
- **Unsubscribe**: Not applicable (transactional only)

### User Enumeration Prevention
- Same response for existing and non-existing emails
- No indication of email verification status in public APIs
- Rate limiting prevents brute-force enumeration

### Audit Trail
Every verification logged with:
- User ID
- Email address
- Token generation timestamp
- Verification timestamp
- IP address
- User agent
- Manual override (if applicable)

---

## Related Documentation
- [Password Reset Runbook](./password-reset.md)
- [2FA Enablement Runbook](./2fa-enablement.md)
- [Incident Response: Auth Abuse](../security/incident-response-auth-abuse.md)
- [Environment Variables Matrix](../security/environment-variables.md)

---

**Version**: 1.0  
**Review Schedule**: Quarterly or after security incidents
