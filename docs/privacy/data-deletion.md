# Privacy Data Deletion Runbook

## Overview
Operational procedures for GDPR/CCPA-compliant user data deletion requests ("Right to be Forgotten") in Project Valine.

**Last Updated**: 2025-11-05  
**Owner**: Privacy & Compliance Team  
**Compliance**: GDPR Article 17, CCPA Section 1798.105  
**Severity**: P1 (Legal requirement, 30-day response deadline)

---

## Table of Contents
- [Legal Requirements](#legal-requirements)
- [Deletion Types](#deletion-types)
- [User Self-Service Deletion](#user-self-service-deletion)
- [Data Scope & Retention](#data-scope--retention)
- [Deletion Process](#deletion-process)
- [Manual Deletion](#manual-deletion)
- [Troubleshooting](#troubleshooting)
- [Monitoring & Compliance](#monitoring--compliance)

---

## Legal Requirements

### GDPR (European Union)
**Article 17**: Right to erasure ("right to be forgotten")

**Grounds for Deletion**:
1. Data no longer necessary for original purpose
2. User withdraws consent
3. User objects to processing
4. Data unlawfully processed
5. Compliance with legal obligation

**Response Time**: 30 days (extendable to 60 days in complex cases)

**Exceptions** (data may be retained):
- Legal obligation (e.g., financial records for tax purposes)
- Exercise or defense of legal claims
- Public interest or scientific research

### CCPA (California, USA)
**Section 1798.105**: Right to deletion

**Response Time**: 45 days (extendable to 90 days)

**Exceptions** (business may deny):
- Complete transaction
- Detect security incidents
- Exercise free speech
- Comply with legal obligation
- Internal lawful uses reasonably aligned with consumer expectations

---

## Deletion Types

### 1. Soft Delete (Account Deactivation)
**User Action**: "Deactivate Account"
- Account hidden from public view
- User can no longer log in
- Data retained for 30 days (recovery period)
- After 30 days, automatic hard delete triggered

### 2. Hard Delete (Permanent Deletion)
**User Action**: "Delete Account Permanently"
- Immediate deletion of personal data
- No recovery possible
- Certain data retained per legal requirements
- Anonymous/aggregated data may be retained

### 3. Right to be Forgotten Request
**User Action**: "Delete My Personal Data (GDPR/CCPA)"
- Most comprehensive deletion
- Includes removal from backups
- Third-party data processors notified
- Deletion certificate provided

---

## User Self-Service Deletion

### Flow Overview
1. User navigates to Privacy Settings
2. User confirms deletion request
3. 30-day cooling-off period (soft delete)
4. User can cancel within 30 days
5. After 30 days, permanent deletion occurs
6. User receives deletion confirmation

### User Interface Flow

#### 1. Navigate to Account Deletion
**URL**: `/settings/account/delete`

**UI Display**:
```
Delete Your Account
===================

⚠️ Warning: This action cannot be undone after 30 days.

What happens when you delete your account:
✓ Your profile will be immediately hidden from others
✓ You will be logged out and unable to log back in
✓ Your data will be permanently deleted after 30 days
✓ You can cancel this request within 30 days

What data will be deleted:
• Profile information
• Posts, reels, and comments
• Messages and conversations
• Media files
• Account settings

What data will be retained (legal requirements):
• Financial transaction records (7 years)
• Abuse reports you filed (legal claims)

Before you proceed:
[ ] I understand my account will be deactivated immediately
[ ] I understand data will be permanently deleted after 30 days
[ ] I want to download my data first → [ Download Data ]

Enter your password to confirm: [________]

[ Cancel ]  [ Deactivate Account ]  [ Delete Permanently ]
```

#### 2. User Clicks "Deactivate Account" (Soft Delete)

**Endpoint**: `POST /api/users/me/deactivate`

**Request**:
```json
{
  "password": "CurrentP@ssw0rd!",
  "reason": "taking_a_break",
  "feedback": "Optional user feedback"
}
```

**Validation**:
- User authenticated
- Password correct
- No pending financial transactions

**Response** (200 OK):
```json
{
  "success": true,
  "deactivationDate": "2025-11-05T23:00:00Z",
  "permanentDeletionDate": "2025-12-05T23:00:00Z",
  "cancellationUrl": "https://valine.app/reactivate?token=abc123",
  "message": "Account deactivated. You have 30 days to change your mind."
}
```

**Actions**:
1. Set `account_status = 'deactivated'`
2. Set `scheduled_deletion_at = NOW() + 30 days`
3. Generate reactivation token (valid 30 days)
4. Log out all sessions
5. Send confirmation email

#### 3. User Clicks "Delete Permanently" (Hard Delete)

**Endpoint**: `POST /api/users/me/delete-permanent`

**Request**:
```json
{
  "password": "CurrentP@ssw0rd!",
  "confirmationText": "DELETE",
  "reason": "privacy_concerns"
}
```

**Additional Confirmation**:
```
⚠️ FINAL WARNING ⚠️

Type "DELETE" to confirm permanent deletion: [________]

This is your last chance. After clicking confirm:
• Your account will be deleted immediately
• All your data will be permanently removed
• This action CANNOT be undone
• You will NOT be able to recover your account

[ Cancel ]  [ Confirm Permanent Deletion ]
```

**Response** (200 OK):
```json
{
  "success": true,
  "deletionId": "del_abc123",
  "deletionDate": "2025-11-05T23:00:00Z",
  "message": "Your account has been scheduled for permanent deletion."
}
```

**Actions**:
1. Add to deletion queue (background job)
2. Log out all sessions
3. Send final confirmation email
4. Begin deletion process (asynchronous)

---

## Data Scope & Retention

### Data to be Deleted

#### Immediately Deleted
- ✅ Profile information (name, bio, headline)
- ✅ Avatar and profile images
- ✅ Posts, reels, comments
- ✅ Messages and conversations (both sides)
- ✅ Likes, bookmarks, follows
- ✅ User settings and preferences
- ✅ Notification preferences
- ✅ API tokens and sessions
- ✅ Email verification tokens
- ✅ Password reset tokens

#### Deleted After Retention Period
- ✅ Audit logs (30 days retention)
- ✅ Security logs (90 days retention)
- ✅ Analytics events (90 days retention)

#### Anonymized (Personal Identifiers Removed)
- ✅ Abuse reports filed by user (reporter identity removed)
- ✅ Support tickets (user contact info removed)
- ✅ Aggregated analytics (no personal data)

#### Retained (Legal Requirements)
- ❌ Financial transaction records (7 years)
- ❌ Legal notices sent to user (7 years)
- ❌ Records related to active legal claims
- ❌ Tax documents (per jurisdiction requirements)

### Data Retention Policy

```javascript
const RETENTION_POLICY = {
  // Immediate deletion (within 24 hours)
  immediate: [
    'users', 'profiles', 'posts', 'reels', 'comments',
    'messages', 'media', 'sessions', 'tokens'
  ],
  
  // Short-term retention
  '30_days': ['audit_logs', 'email_logs'],
  '90_days': ['security_logs', 'analytics_events'],
  
  // Long-term retention (legal)
  '7_years': [
    'financial_transactions',
    'invoices',
    'tax_documents'
  ],
  
  // Anonymized (indefinite, no personal data)
  'anonymized': [
    'abuse_reports',
    'support_tickets',
    'aggregated_analytics'
  ]
}
```

---

## Deletion Process

### Background Job Processing

#### 1. Queue Deletion Job
```javascript
// Add to priority queue
await queue.add('user-deletion', {
  userId: user.id,
  deletionType: 'hard_delete',
  requestedAt: new Date(),
  legalBasis: 'GDPR Article 17'
}, {
  priority: 1, // High priority
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 300000 // 5 minutes
  }
})
```

#### 2. Execute Deletion (Step-by-Step)

**Phase 1: Verify Prerequisites**
```javascript
// Check no active financial transactions
const activeTransactions = await db.transactions.count({
  where: {
    userId: userId,
    status: { in: ['pending', 'processing'] }
  }
})

if (activeTransactions > 0) {
  throw new Error('Cannot delete: active financial transactions')
}

// Check no active legal holds
const legalHolds = await db.legalHolds.count({
  where: {
    userId: userId,
    status: 'active'
  }
})

if (legalHolds > 0) {
  throw new Error('Cannot delete: active legal hold')
}
```

**Phase 2: Notify Third Parties**
```javascript
// Notify data processors (if applicable)
await Promise.all([
  notifyCDN({ action: 'purge_user', userId }),
  notifyAnalytics({ action: 'delete_user', userId }),
  notifyEmailService({ action: 'unsubscribe', userId })
])
```

**Phase 3: Delete User Data**
```sql
-- Delete in order (respecting foreign key constraints)

-- 1. Notifications
DELETE FROM notifications WHERE recipient_id = ? OR triggerer_id = ?;

-- 2. Messages and conversations
DELETE FROM messages WHERE sender_id = ?;
DELETE FROM conversation_participants WHERE user_id = ?;
-- Orphaned conversations cleaned up separately

-- 3. Social interactions
DELETE FROM likes WHERE user_id = ?;
DELETE FROM bookmarks WHERE user_id = ?;
DELETE FROM comments WHERE author_id = ?;

-- 4. Content
DELETE FROM reels WHERE author_id = ?;
DELETE FROM posts WHERE author_id = ?;

-- 5. Connection requests
DELETE FROM connection_requests WHERE sender_id = ? OR receiver_id = ?;

-- 6. Profile and media
DELETE FROM media WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = ?);
DELETE FROM credits WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = ?);
DELETE FROM profiles WHERE user_id = ?;

-- 7. Profile links
DELETE FROM profile_links WHERE user_id = ?;

-- 8. Settings
DELETE FROM user_settings WHERE user_id = ?;

-- 9. Tokens and sessions
DELETE FROM password_reset_tokens WHERE user_id = ?;
DELETE FROM email_verification_tokens WHERE user_id = ?;
DELETE FROM api_tokens WHERE user_id = ?;
DELETE FROM user_sessions WHERE user_id = ?;
DELETE FROM backup_codes WHERE user_id = ?;

-- 10. User account (final)
DELETE FROM users WHERE id = ?;
```

**Phase 4: Delete Media Files**
```javascript
// Delete S3 objects
const userMedia = await listUserMedia(userId)

for (const media of userMedia) {
  await s3.deleteObject({
    Bucket: 'valine-media',
    Key: media.s3Key
  })
  
  // Delete video thumbnails
  if (media.posterS3Key) {
    await s3.deleteObject({
      Bucket: 'valine-media',
      Key: media.posterS3Key
    })
  }
}
```

**Phase 5: Anonymize Retained Data**
```sql
-- Anonymize financial records
UPDATE financial_transactions
SET user_email = 'deleted_user@valine.internal',
    user_name = 'Deleted User'
WHERE user_id = ?;

-- Anonymize support tickets
UPDATE support_tickets
SET user_email = 'deleted_user@valine.internal',
    user_name = 'Deleted User'
WHERE user_id = ?;

-- Anonymize abuse reports
UPDATE abuse_reports
SET reporter_email = 'deleted_user@valine.internal',
    reporter_name = 'Deleted User'
WHERE reporter_id = ?;
```

**Phase 6: Remove from Backups (Eventual)**
```javascript
// Flag user for backup removal
await db.deletionLog.create({
  userId: userId,
  deletionDate: new Date(),
  backupRemovalRequired: true,
  backupRetentionDays: 90 // Remove from backups after 90 days
})

// Backups older than 90 days will exclude this user
// Achieved via backup restore process filtering
```

**Phase 7: Create Deletion Certificate**
```javascript
const certificate = {
  deletionId: `del_${userId}_${Date.now()}`,
  userId: userId,
  deletionDate: new Date(),
  legalBasis: 'GDPR Article 17',
  dataDeleted: [
    'profile', 'posts', 'messages', 'media', 'settings'
  ],
  dataRetained: [
    'financial_records (7 years)',
    'legal_records (active claim)'
  ],
  deletedBy: 'user_request',
  certificateIssued: new Date()
}

// Store certificate
await db.deletionCertificates.create(certificate)

// Send to user (if email available)
await sendDeletionCertificate(user.email, certificate)
```

#### 3. Send Confirmation
**Email Template**: `account_deleted.html`

**Subject**: "Your Valine Account Has Been Deleted"

**Content**:
```
Your Valine account has been permanently deleted.

Deletion Details:
• Deletion ID: del_abc123
• Deletion Date: November 5, 2025
• Data Deleted: Profile, posts, messages, media, settings
• Data Retained: Financial records (legal requirement - 7 years)

Your personal information has been removed from our systems.
Some data may remain in backups for up to 90 days.

If you change your mind, you can create a new account anytime,
but your previous data cannot be recovered.

Deletion Certificate attached.

Thank you for using Valine.
```

---

## Manual Deletion

### When Required
- Automated deletion fails
- User requests deletion but can't log in
- Legal/compliance order
- Account compromise requiring immediate deletion

### Prerequisites
- Legal/compliance approval
- User identity verified (for user-initiated requests)
- Incident ticket created

### Procedure

#### 1. Verify Authorization
```powershell
# Check approval
SELECT * FROM deletion_approvals
WHERE user_id = 'usr_abc123'
AND status = 'approved'
AND approved_by IS NOT NULL
```

#### 2. Run Manual Deletion Script
```powershell
# Execute on secure admin console
node scripts/manual-user-deletion.js \
  --user-id usr_abc123 \
  --legal-basis "GDPR Article 17" \
  --ticket-id "DEL-12345" \
  --admin-id admin_xyz \
  --skip-cooling-period

# Outputs:
# ✓ User data deleted
# ✓ Media files removed
# ✓ Retained data anonymized
# ✓ Deletion certificate generated
# ✓ Audit log created
```

#### 3. Verify Deletion
```powershell
# Verify user removed
psql $DATABASE_URL -c "SELECT * FROM users WHERE id = 'usr_abc123'"
# Should return 0 rows

# Verify no orphaned data
psql $DATABASE_URL -c "
SELECT 'posts' as table_name, COUNT(*) FROM posts WHERE author_id = 'usr_abc123'
UNION ALL
SELECT 'messages', COUNT(*) FROM messages WHERE sender_id = 'usr_abc123'
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles WHERE user_id = 'usr_abc123'
"
# All counts should be 0
```

#### 4. Document Completion
```javascript
// Update ticket
await supportTickets.update({
  where: { id: 'DEL-12345' },
  data: {
    status: 'completed',
    resolution: 'User data deleted successfully',
    deletionCertificateId: 'del_abc123',
    completedAt: new Date()
  }
})
```

---

## Troubleshooting

### Deletion Job Fails

**Check Status**:
```powershell
# Query job queue
redis-cli HGET "bull:user-deletion:jobs" "del_abc123"

# Check logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/valine-user-deletion \
  --filter-pattern "usr_abc123"
```

**Common Issues**:
1. **Foreign key constraint**: Orphaned data, fix references
2. **S3 access denied**: Check IAM permissions
3. **Database timeout**: Large account, increase timeout
4. **Active transactions**: Cannot delete, wait for completion

### User Requests Cancellation (During Cooling-Off)

**Endpoint**: `POST /api/users/reactivate`

**Request**:
```json
{
  "reactivationToken": "token_from_email"
}
```

**Actions**:
1. Verify token valid and not expired
2. Set `account_status = 'active'`
3. Clear `scheduled_deletion_at`
4. Send welcome back email
5. Log reactivation event

### Data Still Visible After Deletion

**Possible Causes**:
1. **CDN cache**: Purge CDN cache
2. **Search index**: Reindex elasticsearch
3. **Third-party cache**: Clear external caches

**Resolution**:
```powershell
# Purge CDN
aws cloudfront create-invalidation \
  --distribution-id E123ABC \
  --paths "/users/usr_abc123/*"

# Reindex search
Invoke-RestMethod -Uri "-X" -Method Delete
```

### Retained Data Concerns

**User Questions**: "Why is my data still showing in [X]?"

**Check What's Retained**:
```sql
-- Financial records
SELECT * FROM financial_transactions WHERE user_id = 'usr_abc123';

-- Anonymized records
SELECT * FROM support_tickets WHERE user_id = 'usr_abc123';
```

**Response**: Explain legal requirements for retention.

---

## Monitoring & Compliance

### Metrics to Track

**Grafana Queries**:
```
# Deletion requests per day
sum(rate(user_deletion_requests_total[24h]))

# Deletion completion time
histogram_quantile(0.95, user_deletion_duration_seconds)

# Failed deletions
sum(rate(user_deletion_failed_total[1h])) by (reason)

# Cooling-off cancellations
sum(rate(user_reactivation_total[24h]))
```

### Compliance Reporting

**Monthly Report**:
```sql
SELECT
  DATE_TRUNC('month', requested_at) AS month,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS completed,
  COUNT(*) FILTER (WHERE completed_at - requested_at <= INTERVAL '30 days') AS on_time,
  COUNT(*) FILTER (WHERE cancelled_at IS NOT NULL) AS cancelled,
  AVG(EXTRACT(EPOCH FROM (completed_at - requested_at))/86400) AS avg_days
FROM deletion_requests
WHERE requested_at >= DATE_TRUNC('month', NOW() - INTERVAL '12 months')
GROUP BY month
ORDER BY month DESC;
```

### Alert Thresholds

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Deletion Failed | Job failed 5 times | P1 | Manual intervention |
| Compliance Risk | Request >25 days old | P1 | Escalate to legal |
| High Deletion Rate | >100 deletions/day | P2 | Investigate |
| Orphaned Data | Data found after deletion | P1 | Immediate cleanup |

### Audit Trail

Every deletion logged with:
- Request timestamp
- User ID (anonymized after deletion)
- Deletion type (soft/hard/RTBF)
- Legal basis
- Completion timestamp
- Data retained (if any)
- Deletion certificate ID

---

## Security Considerations

### Access Control
- Only user or admin can initiate deletion
- Admin deletions require dual approval
- All deletions logged and audited

### Data Protection During Deletion
- Deletion jobs run in isolated workers
- Deleted data not logged or cached
- Secure deletion of encryption keys

### Third-Party Coordination
- CDN purge requests sent
- Analytics services notified
- Email service unsubscribes user
- Backup retention policies applied

---

## Related Documentation
- [Data Export Runbook](./data-export.md)
- [Privacy Policy](./privacy-policy.md)
- [Incident Response: Data Breach](../security/incident-response-data-breach.md)
- [GDPR Compliance Guide](./gdpr-compliance.md)

---

**Version**: 1.0  
**Review Schedule**: Quarterly and upon regulation changes  
**Compliance Last Reviewed**: 2025-11-05
