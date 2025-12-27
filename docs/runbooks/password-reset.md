# Password Reset Runbook

## Overview
Step-by-step operational procedures for password reset flows in Project Valine.

**Last Updated**: 2025-11-05  
**Owner**: Security & Operations Team  
**Severity**: P1 (User-impacting)

---

## Table of Contents
- [User-Initiated Password Reset](#user-initiated-password-reset)
- [Admin-Initiated Password Reset](#admin-initiated-password-reset)
- [Emergency Password Reset](#emergency-password-reset)
- [Troubleshooting](#troubleshooting)
- [Monitoring & Alerts](#monitoring--alerts)

---

## User-Initiated Password Reset

### Prerequisites
- Email service operational
- Database accessible
- Token generation system functional

### Standard Flow

#### 1. User Requests Reset
**Endpoint**: `POST /api/auth/forgot-password`

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "If an account with that email exists, a reset link has been sent."
}
```

**Security Note**: Always return the same message regardless of email existence to prevent user enumeration.

#### 2. System Actions
1. **Validate Email**:
   - Check email format
   - Rate limit: Max 3 requests per 15 minutes per email
   
2. **Generate Reset Token**:
   ```javascript
   // Token format: crypto.randomBytes(32).toString('hex')
   // Expiration: 1 hour from generation
   ```

3. **Store Token**:
   ```sql
   INSERT INTO password_reset_tokens (
     user_id,
     token_hash,
     expires_at,
     created_at
   ) VALUES (?, ?, NOW() + INTERVAL '1 hour', NOW())
   ```

4. **Send Email**:
   - Template: `password_reset_request.html`
   - Subject: "Reset Your Valine Password"
   - Reset URL: `https://valine.app/reset-password?token={token}`

#### 3. User Clicks Reset Link
**Endpoint**: `POST /api/auth/reset-password`

**Request**:
```json
{
  "token": "abc123...",
  "newPassword": "NewSecureP@ssw0rd!"
}
```

**Validation**:
- Token exists and not expired
- Token not already used
- Password meets requirements:
  - Minimum 8 characters
  - Contains uppercase, lowercase, number
  - Contains special character

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Password successfully reset. You can now log in."
}
```

#### 4. Post-Reset Actions
1. **Hash and Save Password**:
   ```javascript
   // Using bcrypt with cost factor 10
   const hashedPassword = await bcrypt.hash(newPassword, 10)
   ```

2. **Invalidate Token**:
   ```sql
   UPDATE password_reset_tokens
   SET used_at = NOW()
   WHERE token_hash = ?
   ```

3. **Invalidate All Sessions**:
   ```sql
   DELETE FROM user_sessions
   WHERE user_id = ?
   ```

4. **Send Confirmation Email**:
   - Template: `password_reset_confirmation.html`
   - Subject: "Your Valine Password Was Changed"

5. **Log Event**:
   ```javascript
   auditLog.create({
     event: 'PASSWORD_RESET',
     userId: user.id,
     metadata: {
       ip: req.ip,
       userAgent: req.headers['user-agent'],
       timestamp: new Date()
     }
   })
   ```

---

## Admin-Initiated Password Reset

### When to Use
- User locked out and cannot access email
- Suspicious activity requiring immediate password change
- Security incident response

### Prerequisites
- Admin privileges verified
- Incident ticket created
- User identity confirmed through support channel

### Procedure

#### 1. Verify Admin Authorization
```powershell
# Check admin permissions
SELECT role FROM users WHERE id = ?
# Must have role = 'admin' or 'support_tier2'
```

#### 2. Force Password Reset
**Endpoint**: `POST /api/admin/users/:userId/force-password-reset`

**Request**:
```json
{
  "reason": "User locked out - unable to access email",
  "ticketId": "SUP-12345",
  "notifyUser": true
}
```

**Actions**:
1. Generate temporary password
2. Set `require_password_change` flag
3. Invalidate all sessions
4. Send temporary password via verified support channel
5. Log admin action

#### 3. User First Login
- User logs in with temporary password
- System forces password change screen
- User sets new permanent password
- `require_password_change` flag cleared

---

## Emergency Password Reset

### Scenario: Suspected Account Compromise

#### Immediate Actions (0-5 minutes)
1. **Lock Account**:
   ```powershell
   # Set account status to suspended
   psql $DATABASE_URL -c "UPDATE users SET status = 'suspended', suspended_reason = 'security_incident' WHERE id = '${USER_ID}'"
   ```

2. **Invalidate All Sessions**:
   ```powershell
   # Clear all active sessions
   psql $DATABASE_URL -c "DELETE FROM user_sessions WHERE user_id = '${USER_ID}'"
   ```

3. **Invalidate API Tokens**:
   ```powershell
   # Revoke all API tokens
   psql $DATABASE_URL -c "UPDATE api_tokens SET revoked = true WHERE user_id = '${USER_ID}'"
   ```

#### Investigation (5-30 minutes)
1. **Review Audit Logs**:
   ```powershell
   # Check recent account activity
   psql $DATABASE_URL -c "SELECT * FROM audit_logs WHERE user_id = '${USER_ID}' AND created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at DESC"
   ```

2. **Check for Data Exfiltration**:
   - Review API calls
   - Check file downloads
   - Verify profile changes

3. **Document Timeline**:
   - First suspicious activity
   - Actions taken
   - Data potentially accessed

#### User Notification (30-60 minutes)
**Email Template**: `security_incident_notification.html`

Subject: "Urgent: Security Alert for Your Valine Account"

Content:
```
We detected suspicious activity on your Valine account and have 
temporarily locked it to protect your data.

What happened:
- [Specific activity detected]

What we did:
- Locked your account
- Invalidated all active sessions
- Reset your password

What you need to do:
1. Click this link to verify your identity: [secure link]
2. Set a new, strong password
3. Enable 2FA if not already active
4. Review recent account activity

If you did not initiate these actions, please contact us immediately.
```

#### Resolution
1. User verifies identity through support
2. Admin unlocks account after verification
3. User completes password reset
4. User reviews and confirms account activity
5. Incident closed and documented

---

## Troubleshooting

### Reset Email Not Received

**Check**:
1. **Email in spam folder**
2. **Email service operational**:
   ```powershell
   # Check email service health
Invoke-RestMethod -Uri "-s" -Method Get```
3. **Email bounced**:
   ```sql
   SELECT * FROM email_logs 
   WHERE recipient = 'user@example.com' 
   AND status = 'bounced'
   ORDER BY created_at DESC LIMIT 5
   ```

**Resolution**:
- Verify email address in database
- Check email service logs
- Manually generate reset link (admin only)

### Token Expired

**User Message**: "Reset link expired. Please request a new one."

**Resolution**:
- User initiates new reset request
- Tokens expire after 1 hour for security

### Token Already Used

**User Message**: "This reset link has already been used."

**Resolution**:
- User initiates new reset request
- Prevent token reuse attacks

### Rate Limit Exceeded

**User Message**: "Too many password reset attempts. Please try again in 15 minutes."

**Limits**:
- 3 requests per email per 15 minutes
- 10 requests per IP per hour

**Override** (admin only):
```powershell
# Clear rate limit for user
redis-cli DEL "rate_limit:password_reset:user@example.com"
```

---

## Monitoring & Alerts

### Metrics to Track

**Grafana Queries**:
```
# Password reset requests (success rate)
sum(rate(password_reset_requests_total[5m])) by (status)

# Average time to complete reset
histogram_quantile(0.95, password_reset_duration_seconds)

# Failed reset attempts
sum(rate(password_reset_failed_total[5m])) by (reason)
```

### Alert Thresholds

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High Reset Volume | >100 requests/min | P2 | Investigate potential attack |
| Email Service Down | 0 emails sent for 5 min | P1 | Page on-call engineer |
| High Failure Rate | >20% failures for 10 min | P2 | Check service health |
| Token Expiry Spike | >50% expired tokens | P3 | Review token TTL |

### CloudWatch Alarms

```yaml
# serverless.yml - CloudWatch alarm definitions
custom:
  alerts:
    - PasswordResetHighVolume:
        metric: PasswordResetRequests
        threshold: 100
        period: 60
        evaluationPeriods: 1
        statistic: Sum
        comparisonOperator: GreaterThanThreshold
        
    - PasswordResetFailures:
        metric: PasswordResetFailures
        threshold: 20
        period: 600
        evaluationPeriods: 1
        statistic: Sum
        comparisonOperator: GreaterThanThreshold
```

### Logs to Monitor

**Useful Log Queries**:
```powershell
# Recent password resets
aws logs filter-log-events \
  --log-group-name /aws/lambda/valine-api-prod \
  --filter-pattern "PASSWORD_RESET" \
  --start-time $(date -u -d '1 hour ago' +%s)000

# Failed reset attempts with reasons
aws logs filter-log-events \
  --log-group-name /aws/lambda/valine-api-prod \
  --filter-pattern "PASSWORD_RESET_FAILED" \
  --start-time $(date -u -d '24 hours ago' +%s)000
```

---

## Security Considerations

### Rate Limiting Strategy
- **Per Email**: 3 requests per 15 minutes
- **Per IP**: 10 requests per hour
- **Global**: 1000 requests per minute (DDoS protection)

### Token Security
- **Generation**: Cryptographically random (32 bytes)
- **Storage**: SHA-256 hash only (never plaintext)
- **Expiration**: 1 hour
- **Single Use**: Token invalidated after use
- **Transmission**: HTTPS only

### Email Security
- **SPF**: Configured for sending domain
- **DKIM**: Messages signed
- **DMARC**: Policy enforced
- **Content**: No sensitive data in email body

### Audit Trail
Every password reset logged with:
- User ID
- IP address
- User agent
- Timestamp
- Success/failure reason
- Admin override (if applicable)

---

## Related Documentation
- [Email Verification Runbook](./email-verification.md)
- [2FA Enablement Runbook](./2fa-enablement.md)
- [Incident Response: Auth Abuse](../security/incident-response-auth-abuse.md)
- [Environment Variables Matrix](../security/environment-variables.md)

---

**Version**: 1.0  
**Review Schedule**: Quarterly or after security incidents
