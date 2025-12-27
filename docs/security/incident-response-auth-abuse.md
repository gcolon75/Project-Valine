# Incident Response Playbook: Authentication Abuse

## Overview
Incident response procedures for detecting and responding to authentication abuse, credential stuffing, brute force attacks, and account takeover attempts in Project Valine.

**Last Updated**: 2025-11-05  
**Owner**: Security Operations Team  
**Severity**: P1 (Active security threat)  
**MTTR Target**: <30 minutes for detection and initial response

---

## Table of Contents
- [Attack Types](#attack-types)
- [Detection & Indicators](#detection--indicators)
- [Response Procedures](#response-procedures)
- [Attack Scenarios](#attack-scenarios)
- [Prevention & Mitigation](#prevention--mitigation)
- [Post-Incident Actions](#post-incident-actions)

---

## Attack Types

### 1. Brute Force Attacks
**Description**: Attacker tries many passwords for a single account.

**Indicators**:
- High number of failed login attempts from single IP
- Sequential password attempts on one account
- Common password patterns (123456, password, etc.)

### 2. Credential Stuffing
**Description**: Attacker uses leaked credentials from other breaches.

**Indicators**:
- High success rate of logins from new locations
- Multiple accounts accessed from single IP
- Use of known leaked passwords

### 3. Account Enumeration
**Description**: Attacker identifies valid usernames/emails.

**Indicators**:
- Systematic login attempts on many accounts
- Pattern testing (name+year, firstname.lastname, etc.)
- Different response times for valid vs invalid usernames

### 4. Session Hijacking
**Description**: Attacker steals or guesses session tokens.

**Indicators**:
- Same session from multiple IPs/locations
- Sudden location change mid-session
- Multiple concurrent sessions

### 5. API Key Abuse
**Description**: Stolen or leaked API keys used maliciously.

**Indicators**:
- Unusual API usage patterns
- Requests from unexpected IPs/regions
- High request volume from single key

---

## Detection & Indicators

### Automated Detection

#### CloudWatch Alarms

```yaml
# serverless.yml
custom:
  alerts:
    - HighFailedLoginRate:
        metric: FailedLoginAttempts
        threshold: 100
        period: 300
        evaluationPeriods: 2
        statistic: Sum
        comparisonOperator: GreaterThanThreshold
        
    - SuspiciousLoginPattern:
        metric: LoginSuccessRate
        threshold: 80
        period: 300
        evaluationPeriods: 1
        statistic: Average
        comparisonOperator: GreaterThanThreshold
        # High success rate can indicate credential stuffing
        
    - MultipleAccountAccess:
        metric: UniqueAccountsPerIP
        threshold: 10
        period: 600
        evaluationPeriods: 1
        statistic: Maximum
        comparisonOperator: GreaterThanThreshold
```

#### Real-Time Monitoring Queries

**CloudWatch Insights**:
```
# Failed login attempts by IP
fields @timestamp, ip, username, reason
| filter eventType = "LOGIN_FAILED"
| stats count() as attempts by ip
| sort attempts desc
| limit 100

# Successful logins from new locations
fields @timestamp, userId, ip, location, previousLocation
| filter eventType = "LOGIN_SUCCESS" and location != previousLocation
| stats count() as newLocationLogins by userId
| filter newLocationLogins > 3

# Account enumeration detection
fields @timestamp, ip
| filter eventType = "LOGIN_FAILED"
| stats dc(username) as uniqueAttempts by ip
| filter uniqueAttempts > 50
```

### Manual Detection Signs

**Check Login Dashboard**:
- Spike in failed logins
- Unusual geographic patterns
- Off-hours activity spikes
- High velocity login attempts

**Check User Reports**:
- "I can't log in" (account locked)
- "Strange activity on my account"
- "I didn't make that post/message"

---

## Response Procedures

### Phase 1: Detection & Assessment (0-5 minutes)

#### 1.1 Confirm Incident
```powershell
# Check recent failed logins
aws logs filter-log-events \
  --log-group-name /aws/lambda/valine-api-prod \
  --filter-pattern "LOGIN_FAILED" \
  --start-time $(date -u -d '10 minutes ago' +%s)000

# Identify attack patterns
psql $DATABASE_URL << EOF
SELECT 
  ip_address,
  COUNT(*) as attempts,
  COUNT(DISTINCT user_id) as unique_accounts,
  MIN(created_at) as first_attempt,
  MAX(created_at) as last_attempt
FROM login_attempts
WHERE 
  created_at > NOW() - INTERVAL '10 minutes'
  AND success = false
GROUP BY ip_address
HAVING COUNT(*) > 50
ORDER BY attempts DESC;
EOF
```

#### 1.2 Assess Severity

**P1 - Critical** (Immediate response required):
- Active account takeover in progress
- >100 failed attempts per minute
- Multiple accounts compromised
- API keys being actively abused

**P2 - High** (Response within 15 minutes):
- Sustained brute force attack
- 50-100 failed attempts per minute
- No confirmed compromises yet

**P3 - Medium** (Response within 1 hour):
- Low-volume credential testing
- <50 failed attempts per minute
- Contained to single IP/account

#### 1.3 Alert Team
```powershell
# Post to incident channel
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "text": "🚨 P1 Security Incident: Authentication Abuse Detected", "attachments": [{ "color": "danger", "fields": [ {"title": "Type", "value": "Brute Force / Credential Stuffing", "short": true}, {"title": "Severity", "value": "P1", "short": true}, {"title": "Failed Attempts", "value": "1,247 in last 10 min", "short": true}, {"title": "Affected IPs", "value": "3 primary IPs", "short": true} ] }] }' -ContentType 'application/json'```

### Phase 2: Containment (5-15 minutes)

#### 2.1 Block Attack Sources

**Block by IP** (immediate):
```powershell
# Add to WAF block list
aws wafv2 update-ip-set \
  --name valine-blocked-ips \
  --scope REGIONAL \
  --id $IP_SET_ID \
  --addresses $(cat <<EOF
192.168.1.100/32
192.168.1.101/32
203.0.113.0/24
EOF
)

# Or block at API Gateway
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --variables "BLOCKED_IPS=192.168.1.100,192.168.1.101"
```

**Block by User-Agent** (if pattern identified):
```javascript
// Add to middleware
const blockedUserAgents = [
  /python-requests/,
  /curl\/7\.60\.0/, // Specific version used in attack
  /httpclient/
]

if (blockedUserAgents.some(ua => ua.test(req.headers['user-agent']))) {
  return res.status(403).json({ error: 'Forbidden' })
}
```

**Block by Geographic Location** (if attack from specific region):
```powershell
# Block country in CloudFront
aws cloudfront update-distribution \
  --id $DISTRIBUTION_ID \
  --if-match $ETAG \
  --distribution-config '{
    "GeoRestriction": {
      "RestrictionType": "blacklist",
      "Quantity": 1,
      "Items": ["RU"]
    }
  }'
```

#### 2.2 Increase Rate Limits

```javascript
// Temporarily reduce rate limits
const emergencyRateLimits = {
  login: {
    windowMs: 60000, // 1 minute
    maxRequests: 3,   // Down from 10
    blockDuration: 3600000 // Block for 1 hour
  },
  passwordReset: {
    windowMs: 60000,
    maxRequests: 1,   // Down from 3
    blockDuration: 3600000
  }
}

// Apply via feature flag or config update
await featureFlags.set('emergency-rate-limits', emergencyRateLimits)
```

#### 2.3 Enable Additional Protections

```javascript
// Enable CAPTCHA for all logins
await featureFlags.enable('captcha-all-logins')

// Require email verification for all logins
await featureFlags.enable('require-email-on-login')

// Enable MFA challenge for suspicious logins
await featureFlags.enable('suspicious-login-mfa')
```

### Phase 3: Investigation (15-30 minutes)

#### 3.1 Identify Compromised Accounts

```sql
-- Find accounts with successful logins from attack IPs
SELECT 
  u.id,
  u.email,
  u.username,
  la.ip_address,
  la.created_at as login_time
FROM users u
JOIN login_attempts la ON u.id = la.user_id
WHERE 
  la.ip_address IN ('192.168.1.100', '192.168.1.101')
  AND la.success = true
  AND la.created_at > NOW() - INTERVAL '24 hours'
ORDER BY la.created_at DESC;

-- Find accounts with suspicious activity
SELECT 
  user_id,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT location) as unique_locations,
  COUNT(*) as total_logins
FROM login_attempts
WHERE 
  created_at > NOW() - INTERVAL '1 hour'
  AND success = true
GROUP BY user_id
HAVING COUNT(DISTINCT ip_address) > 5
ORDER BY unique_ips DESC;
```

#### 3.2 Check for Data Exfiltration

```sql
-- Check for unusual API activity
SELECT 
  user_id,
  endpoint,
  COUNT(*) as request_count,
  COUNT(DISTINCT ip_address) as unique_ips
FROM api_requests
WHERE 
  created_at > NOW() - INTERVAL '1 hour'
  AND endpoint LIKE '%export%'
     OR endpoint LIKE '%download%'
GROUP BY user_id, endpoint
HAVING COUNT(*) > 50
ORDER BY request_count DESC;

-- Check for bulk message sends
SELECT 
  sender_id,
  COUNT(*) as messages_sent,
  COUNT(DISTINCT receiver_id) as unique_recipients
FROM messages
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY sender_id
HAVING COUNT(*) > 100
ORDER BY messages_sent DESC;
```

#### 3.3 Analyze Attack Pattern

```python
# Analyze attack patterns (Python script)
import pandas as pd
from collections import Counter

# Load failed login attempts
df = pd.read_sql("""
  SELECT ip_address, username, user_agent, created_at
  FROM login_attempts
  WHERE created_at > NOW() - INTERVAL '24 hours'
  AND success = false
""", connection)

# Pattern analysis
print("Top attacking IPs:", df['ip_address'].value_counts().head(10))
print("\nTop targeted usernames:", df['username'].value_counts().head(10))
print("\nUser agents:", Counter(df['user_agent']))
print("\nAttack timeline:", df.groupby(df['created_at'].dt.hour).size())
```

### Phase 4: Remediation (30-60 minutes)

#### 4.1 Lock Compromised Accounts

```javascript
// Lock accounts endpoint
async function lockCompromisedAccounts(userIds, reason) {
  for (const userId of userIds) {
    // Set account status
    await db.users.update({
      where: { id: userId },
      data: {
        status: 'locked',
        lockedReason: reason,
        lockedAt: new Date()
      }
    })
    
    // Invalidate all sessions
    await db.sessions.deleteMany({
      where: { userId: userId }
    })
    
    // Revoke API tokens
    await db.apiTokens.updateMany({
      where: { userId: userId },
      data: { revoked: true }
    })
    
    // Send notification email
    await sendEmail({
      to: user.email,
      template: 'account_locked_security',
      subject: 'Your Valine Account Has Been Locked',
      data: {
        reason: 'Suspicious activity detected',
        unlockUrl: `https://valine.app/unlock-account?token=${generateToken()}`
      }
    })
    
    // Log action
    await auditLog.create({
      event: 'ACCOUNT_LOCKED_SECURITY',
      userId: userId,
      metadata: { reason, timestamp: new Date() }
    })
  }
}

// Execute
await lockCompromisedAccounts([
  'usr_abc123',
  'usr_def456'
], 'Credential stuffing attack - unauthorized access detected')
```

#### 4.2 Force Password Reset

```sql
-- Set password reset required flag
UPDATE users
SET require_password_change = true,
    password_change_reason = 'security_incident'
WHERE id IN (
  SELECT DISTINCT user_id 
  FROM login_attempts 
  WHERE ip_address IN ('192.168.1.100', '192.168.1.101')
  AND success = true
);

-- Generate password reset tokens
INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
SELECT 
  id,
  encode(sha256(gen_random_bytes(32)), 'hex'),
  NOW() + INTERVAL '24 hours'
FROM users
WHERE require_password_change = true
AND password_change_reason = 'security_incident';
```

#### 4.3 Clean Up Attack Artifacts

```javascript
// Delete suspicious sessions
await db.sessions.deleteMany({
  where: {
    ipAddress: { in: attackIPs },
    createdAt: { gt: attackStartTime }
  }
})

// Invalidate verification tokens from attack IPs
await db.emailVerificationTokens.updateMany({
  where: {
    createdAt: { gt: attackStartTime },
    ipAddress: { in: attackIPs }
  },
  data: { invalidatedAt: new Date() }
})
```

### Phase 5: Communication (Concurrent with remediation)

#### 5.1 Notify Affected Users

**Email Template**: `security_incident_notification.html`

```
Subject: Important Security Notice - Action Required

Dear [Username],

We detected unusual activity on your Valine account and have taken 
immediate steps to protect it.

What happened:
We detected a security incident involving unauthorized login attempts 
from an unknown location.

What we did:
✓ Locked your account temporarily
✓ Invalidated all active sessions
✓ Required password reset

What you need to do:
1. Click here to reset your password: [secure link]
2. Review recent account activity
3. Enable two-factor authentication (recommended)

The incident occurred at approximately [time] on [date]. If you notice 
any unauthorized activity, please contact us immediately.

We take security seriously and apologize for any inconvenience.

Security Team
Valine
```

#### 5.2 Public Communication (if warranted)

**Criteria for public disclosure**:
- >1000 accounts affected
- Confirmed data breach
- Media attention
- Regulatory requirement

**Status Page Update**:
```
Investigating - Authentication Issues
Posted 1 hour ago · Nov 5, 2025

We are investigating reports of authentication issues affecting some 
users. We have implemented additional security measures and are 
working to resolve the issue.

Affected services:
- Login (degraded)
- Account registration (disabled temporarily)

Update: We have identified the cause as a coordinated attack and have 
blocked the sources. Affected users will receive individual 
notifications. Normal service is being restored.
```

---

## Attack Scenarios

### Scenario 1: Large-Scale Credential Stuffing

**Indicators**:
- 10,000+ login attempts in 10 minutes
- 5-10% success rate
- Multiple accounts from same IPs
- Known breach password patterns

**Response**:
1. Block attack IPs immediately (Phase 2.1)
2. Enable CAPTCHA for all logins
3. Lock all successfully accessed accounts
4. Force password reset for affected users
5. Monitor for secondary attacks

**Timeline**: 
- Detection: 5 minutes
- Containment: 10 minutes
- Full remediation: 2 hours

### Scenario 2: Targeted Account Takeover

**Indicators**:
- Persistent attempts on single high-value account
- Various IPs (distributed attack)
- Success after password change
- Immediate suspicious activity post-login

**Response**:
1. Lock target account immediately
2. Contact account owner via verified channel
3. Review account activity for 30 days prior
4. Check for social engineering or phishing
5. Implement enhanced monitoring

**Timeline**:
- Detection: 15 minutes
- Containment: 20 minutes
- Investigation: 4-8 hours

### Scenario 3: API Key Compromise

**Indicators**:
- Sudden spike in API usage
- Requests from unusual IPs/regions
- Access to unauthorized resources
- Unusual request patterns

**Response**:
1. Revoke compromised API key
2. Generate new key for legitimate user
3. Review all actions taken with compromised key
4. Check for data exfiltration
5. Implement key rotation policy

**Timeline**:
- Detection: 10 minutes
- Containment: 5 minutes
- Investigation: 2-4 hours

---

## Prevention & Mitigation

### Proactive Measures

#### 1. Rate Limiting
```javascript
// Implement progressive rate limiting
const rateLimits = {
  login: {
    tier1: { windowMs: 60000, max: 5 },      // 5 per minute
    tier2: { windowMs: 300000, max: 10 },    // 10 per 5 minutes
    tier3: { windowMs: 3600000, max: 20 }    // 20 per hour
  }
}

// Implement exponential backoff
let failedAttempts = await getFailedAttempts(ip)
let backoffDelay = Math.min(1000 * Math.pow(2, failedAttempts), 60000)
await sleep(backoffDelay)
```

#### 2. Account Lockout
```javascript
// Lock account after N failed attempts
const LOCK_THRESHOLD = 5
const LOCK_DURATION = 30 * 60 * 1000 // 30 minutes

if (failedAttempts >= LOCK_THRESHOLD) {
  await db.users.update({
    where: { id: userId },
    data: {
      lockedUntil: new Date(Date.now() + LOCK_DURATION),
      lockedReason: 'too_many_failed_attempts'
    }
  })
}
```

#### 3. CAPTCHA Implementation
```javascript
// Require CAPTCHA after N failed attempts
if (failedAttempts >= 3) {
  // Show CAPTCHA
  return res.json({
    requiresCaptcha: true,
    captchaSiteKey: process.env.RECAPTCHA_SITE_KEY
  })
}

// Verify CAPTCHA
const captchaVerified = await verifyCaptcha(captchaToken)
if (!captchaVerified) {
  return res.status(400).json({ error: 'Invalid CAPTCHA' })
}
```

#### 4. Device Fingerprinting
```javascript
// Track device fingerprints
const deviceFingerprint = generateFingerprint({
  userAgent: req.headers['user-agent'],
  acceptLanguage: req.headers['accept-language'],
  screenResolution: req.body.screenResolution,
  timezone: req.body.timezone
})

// Flag logins from new devices
if (!await isKnownDevice(userId, deviceFingerprint)) {
  // Require additional verification
  await sendVerificationEmail(userId, 'new_device')
}
```

#### 5. Breach Password Detection
```javascript
// Check against Have I Been Pwned
import { pwnedPassword } from 'hibp'

const isPwned = await pwnedPassword(password)
if (isPwned > 0) {
  return res.status(400).json({
    error: 'This password has been exposed in a data breach. Please choose a different password.'
  })
}
```

---

## Post-Incident Actions

### Immediate (Within 24 hours)

- [ ] Document incident timeline
- [ ] Preserve all logs and evidence
- [ ] Notify affected users
- [ ] Update security controls
- [ ] Brief leadership team

### Short-term (Within 1 week)

- [ ] Conduct incident retrospective
- [ ] Identify lessons learned
- [ ] Update runbooks and procedures
- [ ] Implement additional monitoring
- [ ] Review and update rate limits

### Long-term (Within 1 month)

- [ ] Implement recommended security enhancements
- [ ] Review and update security policies
- [ ] Conduct security awareness training
- [ ] Test incident response procedures
- [ ] Review third-party security tools

### Incident Report Template

```markdown
# Authentication Abuse Incident Report

**Incident ID**: INC-2025-001
**Date**: 2025-11-05
**Severity**: P1
**Status**: Resolved

## Summary
Brief description of the incident.

## Timeline
- 14:00 UTC: Attack began
- 14:05 UTC: Automated alert triggered
- 14:10 UTC: Team responded, blocked IPs
- 14:30 UTC: Compromised accounts locked
- 15:00 UTC: Attack fully mitigated
- 16:00 UTC: User notifications sent

## Impact
- Accounts affected: 47
- Data accessed: Profile information only
- Duration: 1 hour
- Financial impact: None

## Root Cause
Credential stuffing attack using leaked passwords from third-party breach.

## Actions Taken
1. Blocked attack source IPs
2. Locked compromised accounts
3. Forced password resets
4. Increased rate limits
5. Enabled additional monitoring

## Lessons Learned
- Need faster automated blocking
- Rate limits were too permissive
- CAPTCHA should trigger sooner

## Recommendations
1. Implement Have I Been Pwned integration
2. Reduce rate limits for login attempts
3. Enable CAPTCHA after 3 failed attempts
4. Implement device fingerprinting
5. Add WAF rules for common attack patterns

## Follow-up Actions
- [ ] Ticket #1234: Implement HIBP integration
- [ ] Ticket #1235: Update rate limit config
- [ ] Ticket #1236: Enable CAPTCHA system
```

---

## Related Documentation
- [Password Reset Runbook](../runbooks/password-reset.md)
- [2FA Enablement Runbook](../runbooks/2fa-enablement.md)
- [Rate Limiting Configuration](./rate-limiting.md)
- [Monitoring & Alerting Setup](./monitoring-setup.md)

---

**Version**: 1.0  
**Review Schedule**: Quarterly or after incidents  
**Last Tested**: 2025-11-05 (Tabletop exercise)
