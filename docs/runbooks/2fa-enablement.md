# Two-Factor Authentication (2FA) Enablement Runbook

## Overview
Operational procedures for 2FA (TOTP-based) setup, backup codes, and account recovery in Project Valine.

**Last Updated**: 2025-11-05  
**Owner**: Security & Operations Team  
**Severity**: P2 (Security feature)  
**Status**: Future Implementation (Runbook prepared for upcoming rollout)

---

## Table of Contents
- [2FA Enrollment](#2fa-enrollment)
- [2FA Login Flow](#2fa-login-flow)
- [Backup Codes](#backup-codes)
- [2FA Recovery](#2fa-recovery)
- [Admin 2FA Bypass](#admin-2fa-bypass)
- [Troubleshooting](#troubleshooting)
- [Monitoring & Alerts](#monitoring--alerts)

---

## 2FA Enrollment

### Prerequisites
- User account verified (email_verified = true)
- User logged in with valid session
- TOTP library available (e.g., `speakeasy`, `otplib`)

### Enrollment Flow

#### 1. User Initiates 2FA Setup
**Endpoint**: `POST /api/users/me/2fa/enroll`

**Request**:
```json
{
  "password": "CurrentP@ssw0rd!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "otpauth://totp/Valine:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Valine",
  "backupCodes": [
    "12345678",
    "23456789",
    "34567890",
    "45678901",
    "56789012",
    "67890123",
    "78901234",
    "89012345",
    "90123456",
    "01234567"
  ]
}
```

#### 2. Generate TOTP Secret
```javascript
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

// Generate secret
const secret = speakeasy.generateSecret({
  name: 'Valine',
  issuer: 'Valine',
  length: 32
})

// Generate QR code
const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)

// Store secret (encrypted)
await db.users.update({
  where: { id: userId },
  data: {
    twoFactorSecret: encrypt(secret.base32),
    twoFactorEnabled: false, // Not enabled until verified
    twoFactorEnrolledAt: new Date()
  }
})
```

**Secret Properties**:
- **Algorithm**: SHA1 (TOTP standard)
- **Digits**: 6
- **Period**: 30 seconds
- **Storage**: Encrypted at rest

#### 3. Generate Backup Codes
```javascript
// Generate 10 random 8-digit codes
const backupCodes = []
for (let i = 0; i < 10; i++) {
  const code = crypto.randomInt(10000000, 99999999).toString()
  backupCodes.push(code)
}

// Store hashed backup codes
await db.backupCodes.createMany({
  data: backupCodes.map(code => ({
    userId: userId,
    codeHash: bcrypt.hashSync(code, 10),
    createdAt: new Date(),
    usedAt: null
  }))
})

return backupCodes // Show to user ONCE
```

**Backup Code Properties**:
- **Count**: 10 codes per user
- **Format**: 8-digit numeric
- **Storage**: bcrypt hashed
- **Single Use**: Each code can only be used once

#### 4. User Scans QR Code
User adds account to authenticator app:
- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password
- LastPass Authenticator

**Display to User**:
```
1. Open your authenticator app
2. Scan this QR code: [QR image]
3. Or manually enter this code: JBSWY3DPEHPK3PXP
4. Save these backup codes in a secure location:
   12345678  23456789
   34567890  45678901
   56789012  67890123
   78901234  89012345
   90123456  01234567
5. Enter the 6-digit code from your app to verify
```

#### 5. User Verifies TOTP Code
**Endpoint**: `POST /api/users/me/2fa/verify-enrollment`

**Request**:
```json
{
  "code": "123456"
}
```

**Backend Verification**:
```javascript
import speakeasy from 'speakeasy'

// Retrieve encrypted secret
const user = await db.users.findUnique({
  where: { id: userId },
  select: { twoFactorSecret: true }
})

const secret = decrypt(user.twoFactorSecret)

// Verify code
const verified = speakeasy.totp.verify({
  secret: secret,
  encoding: 'base32',
  token: code,
  window: 1 // Allow 1 step before/after for clock skew
})

if (verified) {
  // Enable 2FA
  await db.users.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      twoFactorVerifiedAt: new Date()
    }
  })
  
  // Log event
  await auditLog.create({
    event: 'TWO_FACTOR_ENABLED',
    userId: userId,
    metadata: { ip: req.ip, userAgent: req.headers['user-agent'] }
  })
  
  return { success: true, message: '2FA enabled successfully' }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Two-factor authentication enabled successfully."
}
```

#### 6. Post-Enrollment Actions
1. **Send confirmation email**:
   - Template: `2fa_enabled.html`
   - Subject: "Two-Factor Authentication Enabled"
   - Include disable instructions

2. **Create notification**:
   ```javascript
   await notifications.create({
     userId: userId,
     type: '2FA_ENABLED',
     title: '2FA Enabled',
     message: 'Two-factor authentication is now active on your account.'
   })
   ```

3. **Invalidate all other sessions** (security best practice):
   ```sql
   DELETE FROM user_sessions
   WHERE user_id = ? AND id != ?
   ```

---

## 2FA Login Flow

### Standard Login with 2FA

#### 1. User Submits Credentials
**Endpoint**: `POST /api/auth/login`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "MyP@ssw0rd!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "requires2FA": true,
  "sessionToken": "temp_session_abc123",
  "message": "Enter your 2FA code to complete login."
}
```

**Backend Actions**:
1. Verify email and password
2. Check if 2FA enabled: `user.twoFactorEnabled === true`
3. Create temporary session (limited permissions)
4. Return `requires2FA: true` flag

#### 2. User Submits 2FA Code
**Endpoint**: `POST /api/auth/verify-2fa`

**Request**:
```json
{
  "sessionToken": "temp_session_abc123",
  "code": "123456"
}
```

**Backend Verification**:
```javascript
// Verify temp session
const tempSession = await db.tempSessions.findUnique({
  where: { token: sessionToken },
  include: { user: true }
})

if (!tempSession || tempSession.expiresAt < new Date()) {
  return { error: 'Session expired' }
}

// Verify TOTP code
const secret = decrypt(tempSession.user.twoFactorSecret)
const verified = speakeasy.totp.verify({
  secret: secret,
  encoding: 'base32',
  token: code,
  window: 1
})

if (verified) {
  // Create full session
  const session = await createSession(tempSession.userId)
  
  // Delete temp session
  await db.tempSessions.delete({ where: { id: tempSession.id } })
  
  // Log successful login
  await auditLog.create({
    event: 'LOGIN_2FA_SUCCESS',
    userId: tempSession.userId,
    metadata: { ip: req.ip }
  })
  
  return {
    success: true,
    token: session.token,
    user: { /* user data */ }
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "token": "session_token_def456",
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "username": "user123"
  }
}
```

---

## Backup Codes

### Using Backup Codes

**When to Use**:
- Lost authenticator device
- Phone stolen/broken
- Authenticator app uninstalled
- Can't access authenticator app

**Endpoint**: `POST /api/auth/verify-2fa-backup`

**Request**:
```json
{
  "sessionToken": "temp_session_abc123",
  "backupCode": "12345678"
}
```

**Backend Verification**:
```javascript
// Find matching backup code
const backupCodes = await db.backupCodes.findMany({
  where: {
    userId: tempSession.userId,
    usedAt: null
  }
})

let codeMatched = false
let matchedCodeId = null

for (const stored of backupCodes) {
  if (bcrypt.compareSync(backupCode, stored.codeHash)) {
    codeMatched = true
    matchedCodeId = stored.id
    break
  }
}

if (codeMatched) {
  // Mark code as used
  await db.backupCodes.update({
    where: { id: matchedCodeId },
    data: { usedAt: new Date() }
  })
  
  // Create session
  const session = await createSession(tempSession.userId)
  
  // Log backup code usage
  await auditLog.create({
    event: 'LOGIN_2FA_BACKUP_CODE',
    userId: tempSession.userId,
    metadata: { ip: req.ip, remainingCodes: backupCodes.length - 1 }
  })
  
  // Alert user about backup code usage
  await sendEmail({
    to: tempSession.user.email,
    template: '2fa_backup_code_used',
    subject: 'Backup Code Used for Login'
  })
  
  return {
    success: true,
    token: session.token,
    warning: `Backup code used. ${backupCodes.length - 1} codes remaining.`
  }
}
```

### Regenerating Backup Codes

**Endpoint**: `POST /api/users/me/2fa/regenerate-backup-codes`

**Request**:
```json
{
  "password": "CurrentP@ssw0rd!"
}
```

**Actions**:
1. Verify password
2. Invalidate all existing backup codes
3. Generate 10 new backup codes
4. Return new codes (shown ONCE)
5. Send security notification email

**Response** (200 OK):
```json
{
  "success": true,
  "backupCodes": [
    "98765432",
    "87654321",
    "76543210",
    "65432109",
    "54321098",
    "43210987",
    "32109876",
    "21098765",
    "10987654",
    "09876543"
  ],
  "message": "Save these codes in a secure location. They will not be shown again."
}
```

---

## 2FA Recovery

### Scenario: User Lost Access to Authenticator

#### Self-Service Recovery (if backup codes available)
1. User logs in with email/password
2. User clicks "Lost your authenticator? Use backup code"
3. User enters backup code
4. User logged in successfully
5. User re-enrolls 2FA with new device

#### Support-Assisted Recovery (no backup codes)

**Prerequisites**:
- Support ticket created
- User identity verified through:
  - Government ID verification
  - Security questions (if configured)
  - Email confirmation from registered address
  - Recent account activity verification

**Procedure**:

1. **User Contacts Support**:
   - Opens ticket: "Lost access to 2FA device"
   - Provides account details
   - Completes identity verification

2. **Admin Reviews Request**:
   ```bash
   # Check user account details
   psql $DATABASE_URL -c "
   SELECT id, email, username, two_factor_enabled, created_at, last_login
   FROM users WHERE email = 'user@example.com'
   "
   
   # Check recent account activity
   psql $DATABASE_URL -c "
   SELECT event, created_at, metadata
   FROM audit_logs
   WHERE user_id = 'usr_123'
   ORDER BY created_at DESC LIMIT 20
   "
   ```

3. **Admin Disables 2FA** (after verification):
   **Endpoint**: `POST /api/admin/users/:userId/disable-2fa`
   
   **Request**:
   ```json
   {
     "reason": "User lost access to authenticator device",
     "ticketId": "SUP-11223",
     "verificationMethod": "government_id_and_security_questions",
     "disabledBy": "admin_user_id"
   }
   ```
   
   **Actions**:
   ```sql
   -- Disable 2FA
   UPDATE users
   SET two_factor_enabled = false,
       two_factor_secret = NULL,
       two_factor_disabled_at = NOW()
   WHERE id = ?;
   
   -- Invalidate backup codes
   UPDATE backup_codes
   SET invalidated_at = NOW()
   WHERE user_id = ? AND used_at IS NULL;
   
   -- Invalidate all sessions (force re-login)
   DELETE FROM user_sessions WHERE user_id = ?;
   
   -- Log admin action
   INSERT INTO audit_logs (event, user_id, admin_id, metadata)
   VALUES ('TWO_FACTOR_DISABLED_BY_ADMIN', ?, ?, ?);
   ```

4. **Notify User**:
   ```
   Subject: Two-Factor Authentication Disabled
   
   Your two-factor authentication has been disabled by our support team
   per your request (Ticket: SUP-11223).
   
   You can now log in with just your email and password.
   
   IMPORTANT SECURITY RECOMMENDATIONS:
   1. Log in immediately and change your password
   2. Re-enable 2FA with your new device
   3. Generate new backup codes
   
   If you did not request this change, contact us immediately.
   ```

5. **User Re-enables 2FA**:
   - User logs in
   - User navigates to Security Settings
   - User follows enrollment process with new device

---

## Admin 2FA Bypass

### Emergency Access (Break-Glass)

**When to Use**:
- Critical system maintenance required
- Admin locked out during incident
- Security emergency requiring immediate access

**Prerequisites**:
- Multiple admin approvals required
- Incident ticket created (P1 severity)
- All actions logged and audited

**Procedure**:

1. **Generate Bypass Token**:
   ```bash
   # Run on secure admin console
   node scripts/generate-2fa-bypass.js \
     --user-id usr_123 \
     --reason "P1 incident response" \
     --ticket INC-9999 \
     --approved-by admin1,admin2
   ```
   
   **Output**:
   ```
   Bypass token: bypass_abcdef123456
   Valid for: 15 minutes
   Expires at: 2025-11-05 23:15:00 UTC
   Use once only
   ```

2. **Admin Uses Bypass Token**:
   **Endpoint**: `POST /api/auth/verify-2fa-bypass`
   
   **Request**:
   ```json
   {
     "sessionToken": "temp_session_abc123",
     "bypassToken": "bypass_abcdef123456"
   }
   ```

3. **Post-Bypass Actions**:
   - Session created with `bypass_used: true` flag
   - All actions logged with high visibility
   - Security review triggered automatically
   - Notification sent to all admins
   - User notified of bypass access

---

## Troubleshooting

### Code Not Accepted

**Possible Causes**:
1. **Clock skew**: Device time incorrect
   - **Solution**: Sync device time, verify with window: 2
   
2. **Wrong secret**: User scanned QR for different account
   - **Solution**: Re-enroll 2FA
   
3. **Code expired**: Waited too long (30-second window)
   - **Solution**: Use next code

### Lost Authenticator Device

**Solutions** (in order of preference):
1. Use backup code
2. Contact support for 2FA reset
3. Use account recovery email

### Backup Codes Not Working

**Checks**:
```sql
-- Verify backup codes exist and unused
SELECT COUNT(*) FROM backup_codes
WHERE user_id = ? AND used_at IS NULL AND invalidated_at IS NULL
```

**If no codes available**:
- User must contact support
- Full identity verification required
- Admin-assisted 2FA reset

### Can't Scan QR Code

**Alternative**:
- Provide text secret: "JBSWY3DPEHPK3PXP"
- User manually enters in authenticator app
- Ensure correct:
  - Account name: Valine
  - Type: Time-based
  - Algorithm: SHA1
  - Digits: 6
  - Period: 30 seconds

---

## Monitoring & Alerts

### Metrics to Track

**Grafana Queries**:
```
# 2FA enrollment rate
(users_with_2fa / total_users) * 100

# 2FA login success rate
sum(rate(login_2fa_success_total[5m])) / sum(rate(login_2fa_attempts_total[5m]))

# Backup code usage
sum(rate(login_backup_code_used_total[1h]))

# 2FA bypass usage (should be rare)
sum(rate(login_2fa_bypass_used_total[24h]))
```

### Alert Thresholds

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High 2FA Failure Rate | >20% failures for 10 min | P3 | Check for clock skew issues |
| Bypass Token Used | Any bypass usage | P2 | Security review required |
| Backup Code Exhaustion | User has 0 codes remaining | P3 | Prompt user to regenerate |
| Mass 2FA Disable | >10 disables per hour | P1 | Investigate potential attack |

### CloudWatch Alarms

```yaml
# serverless.yml
custom:
  alerts:
    - TwoFactorBypassUsed:
        metric: TwoFactorBypassUsed
        threshold: 1
        period: 60
        evaluationPeriods: 1
        statistic: Sum
        comparisonOperator: GreaterThanOrEqualToThreshold
        treatMissingData: notBreaching
```

---

## Security Considerations

### TOTP Security
- **Algorithm**: SHA1 (industry standard)
- **Window**: 1 step (allows 30-second clock skew)
- **Storage**: Encrypted at rest with envelope encryption
- **Transmission**: HTTPS only, never logged

### Backup Code Security
- **Generation**: Cryptographically random
- **Storage**: bcrypt hashed (cost factor 10)
- **Count**: 10 codes, regenerate when <3 remain
- **Single Use**: Invalidated after use
- **Display**: Shown only once during generation

### Bypass Token Security
- **Expiry**: 15 minutes
- **Single Use**: Invalidated after use
- **Approvals**: Requires 2+ admin approvals
- **Audit**: All usage logged and reviewed
- **Scope**: Full account access (use with caution)

### Session Security After 2FA
- Standard session timeout: 7 days
- Sensitive operations require re-authentication
- Sessions invalidated on password change or 2FA disable

---

## Related Documentation
- [Password Reset Runbook](./password-reset.md)
- [Email Verification Runbook](./email-verification.md)
- [Incident Response: Auth Abuse](../security/incident-response-auth-abuse.md)
- [Environment Variables Matrix](../security/environment-variables.md)

---

**Version**: 1.0  
**Review Schedule**: Quarterly or after security incidents  
**Implementation Status**: Planned for Q1 2026
