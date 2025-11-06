# Privacy Data Export Runbook

## Overview
Operational procedures for GDPR/CCPA-compliant user data export requests in Project Valine.

**Last Updated**: 2025-11-05  
**Owner**: Privacy & Compliance Team  
**Compliance**: GDPR Article 15, CCPA Section 1798.100  
**Severity**: P2 (Legal requirement, 30-day response deadline)

---

## Table of Contents
- [Legal Requirements](#legal-requirements)
- [User Self-Service Export](#user-self-service-export)
- [Data Scope](#data-scope)
- [Export Format](#export-format)
- [Manual Export Process](#manual-export-process)
- [Troubleshooting](#troubleshooting)
- [Monitoring & Compliance](#monitoring--compliance)

---

## Legal Requirements

### GDPR (European Union)
- **Article 15**: Right of access by the data subject
- **Response Time**: 30 days (extendable to 60 days in complex cases)
- **Format**: Machine-readable, commonly used format
- **Free of Charge**: First request free, subsequent requests may incur reasonable fee

### CCPA (California, USA)
- **Section 1798.100**: Right to know what personal information is collected
- **Response Time**: 45 days (extendable to 90 days)
- **Format**: Portable and readily usable format
- **Frequency**: Max 2 requests per 12-month period

### Supported Data Subject Rights
- ✅ Right to access (data export)
- ✅ Right to portability (machine-readable format)
- ✅ Right to information (what data we collect and why)
- See [data-deletion.md](./data-deletion.md) for right to erasure

---

## User Self-Service Export

### Flow Overview
1. User requests data export from account settings
2. System generates comprehensive data archive
3. User receives download link via email
4. Link valid for 72 hours
5. User downloads encrypted ZIP archive

### User Interface Flow

#### 1. Navigate to Privacy Settings
**URL**: `/settings/privacy`

**UI Display**:
```
Privacy & Data Controls
=======================

Download Your Data
------------------
Request a copy of your data in machine-readable format.
This includes all your personal information, posts, messages,
and activity on Valine.

[ Request Data Export ]

Your export will be ready within 24 hours and available for 72 hours.
```

#### 2. User Clicks "Request Data Export"

**Endpoint**: `POST /api/users/me/data-export`

**Request**:
```json
{
  "password": "CurrentP@ssw0rd!",
  "includeDeleted": false
}
```

**Validation**:
- User authenticated
- Password verified (security confirmation)
- Rate limit: 2 requests per 30 days
- Previous export must be completed or expired

**Response** (202 Accepted):
```json
{
  "success": true,
  "requestId": "export_abc123",
  "estimatedCompletionTime": "2025-11-06T00:00:00Z",
  "message": "Your data export has been queued. You'll receive an email when it's ready."
}
```

#### 3. System Processes Export (Background Job)

**Job Queue**:
```javascript
// Add to background job queue
await queue.add('data-export', {
  userId: user.id,
  requestId: exportRequest.id,
  includeDeleted: false,
  requestedAt: new Date()
}, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 60000 // 1 minute
  }
})
```

**Processing Steps**:
1. Collect user data from all tables
2. Generate JSON files per data category
3. Create manifest file
4. Compress into encrypted ZIP
5. Upload to secure storage (S3 with expiration)
6. Generate time-limited download link
7. Send notification email

#### 4. User Receives Email

**Template**: `data_export_ready.html`

**Subject**: "Your Valine Data Export is Ready"

**Content**:
```
Your data export is ready to download.

Download Link: https://valine.app/data-exports/abc123

This link expires in 72 hours (on November 8, 2025 at 11:59 PM UTC).

The export includes:
- Profile information
- Posts and comments
- Messages and conversations
- Media files
- Activity logs
- Account settings

For your security, the ZIP file is password-protected.
Password: [shown in email or sent separately]

If you did not request this export, please contact support immediately.
```

#### 5. User Downloads Export

**Endpoint**: `GET /api/data-exports/:exportId/download`

**Validation**:
- User authenticated and owns export
- Export not expired (72 hours)
- Export not already downloaded >5 times

**Response**:
- File: `valine_data_export_{username}_{date}.zip`
- Size: Varies (typically 10-500 MB)
- Password-protected ZIP
- Content-Type: `application/zip`

---

## Data Scope

### Personal Information Included

#### 1. Account Information
**File**: `account.json`

```json
{
  "userId": "usr_abc123",
  "username": "johndoe",
  "email": "john@example.com",
  "displayName": "John Doe",
  "role": "artist",
  "accountCreated": "2024-01-15T10:30:00Z",
  "lastLogin": "2025-11-05T22:00:00Z",
  "emailVerified": true,
  "twoFactorEnabled": true,
  "theme": "dark"
}
```

#### 2. Profile Information
**File**: `profile.json`

```json
{
  "vanityUrl": "johndoe",
  "headline": "Actor & Voice Artist",
  "bio": "Professional actor with 10 years of experience...",
  "roles": ["Actor", "Voice Artist"],
  "location": {
    "city": "Los Angeles",
    "state": "CA",
    "country": "USA"
  },
  "privacy": {
    "visibility": "public",
    "showEmail": false
  },
  "socialLinks": {
    "website": "https://johndoe.com",
    "instagram": "johndoeactor"
  },
  "profileLinks": [
    {
      "platform": "imdb",
      "url": "https://imdb.com/name/nm1234567",
      "displayOrder": 0
    }
  ]
}
```

#### 3. Content
**File**: `content.json`

```json
{
  "posts": [
    {
      "id": "post_123",
      "content": "Excited about my new role!",
      "media": ["https://cdn.valine.app/img1.jpg"],
      "createdAt": "2025-10-01T15:00:00Z",
      "likes": 42,
      "comments": 5
    }
  ],
  "reels": [
    {
      "id": "reel_456",
      "videoUrl": "https://cdn.valine.app/reel1.mp4",
      "caption": "Behind the scenes",
      "createdAt": "2025-09-15T12:00:00Z"
    }
  ],
  "comments": [
    {
      "id": "comment_789",
      "reelId": "reel_999",
      "text": "Amazing work!",
      "createdAt": "2025-08-20T14:30:00Z"
    }
  ]
}
```

#### 4. Messages
**File**: `messages.json`

```json
{
  "conversations": [
    {
      "conversationId": "conv_123",
      "participants": ["usr_abc123", "usr_def456"],
      "title": "Project Discussion",
      "messages": [
        {
          "id": "msg_001",
          "senderId": "usr_abc123",
          "text": "Hi, interested in the audition?",
          "sentAt": "2025-07-10T10:00:00Z"
        }
      ]
    }
  ]
}
```

#### 5. Activity Logs
**File**: `activity.json`

```json
{
  "logins": [
    {
      "timestamp": "2025-11-05T22:00:00Z",
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "location": "Los Angeles, CA"
    }
  ],
  "actions": [
    {
      "action": "profile_updated",
      "timestamp": "2025-10-15T14:00:00Z",
      "changes": ["headline", "bio"]
    }
  ]
}
```

#### 6. Media Files
**Directory**: `media/`

```
media/
├── profile/
│   ├── avatar.jpg
│   └── headshot.jpg
├── reels/
│   ├── reel_001.mp4
│   └── reel_002.mp4
└── posts/
    ├── post_image_001.jpg
    └── post_image_002.jpg
```

#### 7. Settings & Preferences
**File**: `settings.json`

```json
{
  "notifications": {
    "email": true,
    "push": false,
    "reelRequests": true
  },
  "privacy": {
    "showActivity": true,
    "allowMessagesFrom": "everyone"
  },
  "security": {
    "twoFactorEnabled": true,
    "loginNotifications": true
  }
}
```

#### 8. Connections & Relationships
**File**: `connections.json`

```json
{
  "connectionRequests": {
    "sent": [
      {
        "recipientId": "usr_def456",
        "status": "accepted",
        "sentAt": "2025-06-01T10:00:00Z"
      }
    ],
    "received": [
      {
        "senderId": "usr_ghi789",
        "status": "pending",
        "receivedAt": "2025-08-15T12:00:00Z"
      }
    ]
  }
}
```

#### 9. Manifest
**File**: `manifest.json`

```json
{
  "exportId": "export_abc123",
  "userId": "usr_abc123",
  "username": "johndoe",
  "exportedAt": "2025-11-05T23:00:00Z",
  "dataVersion": "1.0",
  "files": [
    { "name": "account.json", "size": 1024 },
    { "name": "profile.json", "size": 2048 },
    { "name": "content.json", "size": 51200 },
    { "name": "messages.json", "size": 204800 },
    { "name": "activity.json", "size": 8192 },
    { "name": "settings.json", "size": 512 },
    { "name": "connections.json", "size": 4096 }
  ],
  "mediaFiles": {
    "count": 25,
    "totalSize": 157286400
  },
  "compliance": {
    "gdpr": true,
    "ccpa": true
  }
}
```

### Data NOT Included
- ❌ Derived analytics/aggregations
- ❌ System-generated metadata (internal IDs, indexes)
- ❌ Temporary data (caches, sessions)
- ❌ Data of other users (except as referenced in your content)
- ❌ Deleted data (unless explicitly requested and retention policy allows)

---

## Export Format

### Archive Structure
```
valine_data_export_johndoe_20251105.zip
├── manifest.json
├── account.json
├── profile.json
├── content.json
├── messages.json
├── activity.json
├── settings.json
├── connections.json
└── media/
    ├── profile/
    ├── reels/
    └── posts/
```

### File Format Standards
- **Primary Format**: JSON (UTF-8 encoding)
- **Date Format**: ISO 8601 (e.g., `2025-11-05T23:00:00Z`)
- **Media**: Original file formats (JPEG, PNG, MP4, etc.)
- **Compression**: ZIP with password protection
- **Encryption**: AES-256

### Password Protection
```javascript
// Generate secure random password
const exportPassword = crypto.randomBytes(16).toString('base64')

// Include in email (or send separately)
// User must enter password to extract ZIP
```

---

## Manual Export Process

### When Required
- Automated export fails repeatedly
- User requests specific data not in standard export
- Legal/compliance request with special requirements
- Large accounts (>10GB) requiring custom handling

### Prerequisites
- Support ticket created
- User identity verified
- Compliance officer approval (for non-standard requests)

### Procedure

#### 1. Create Manual Export Request
```bash
# Run on secure admin console
node scripts/create-manual-export.js \
  --user-id usr_abc123 \
  --ticket SUP-45678 \
  --include-deleted true \
  --format json \
  --admin-id admin_xyz
```

#### 2. Extract Data
```sql
-- Account data
COPY (
  SELECT json_build_object(
    'userId', id,
    'username', username,
    'email', email,
    'displayName', display_name,
    'accountCreated', created_at,
    'lastLogin', updated_at
  )
  FROM users WHERE id = 'usr_abc123'
) TO '/tmp/account.json';

-- Profile data
COPY (
  SELECT json_build_object(
    'vanityUrl', vanity_url,
    'headline', headline,
    'bio', bio,
    'roles', roles,
    'location', location
  )
  FROM profiles WHERE user_id = 'usr_abc123'
) TO '/tmp/profile.json';

-- Continue for all data categories...
```

#### 3. Package Export
```bash
# Create archive
zip -r -e export_usr_abc123.zip \
  account.json \
  profile.json \
  content.json \
  messages.json \
  media/

# Upload to secure storage
aws s3 cp export_usr_abc123.zip \
  s3://valine-exports/usr_abc123/ \
  --expires "$(date -d '+72 hours' --iso-8601)" \
  --storage-class STANDARD_IA
```

#### 4. Notify User
Send download link via support ticket response.

---

## Troubleshooting

### Export Request Fails

**Check Job Status**:
```bash
# Query job queue
await queue.getJob('data-export', exportRequest.id)

# Check logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/valine-data-export \
  --filter-pattern "export_abc123"
```

**Common Issues**:
1. **Database timeout**: Large account, increase timeout
2. **S3 upload failed**: Check IAM permissions
3. **Memory limit**: Use streaming for large datasets

### Download Link Expired

**Regenerate Link**:
```javascript
// Endpoint: POST /api/data-exports/:exportId/regenerate-link
// Validates export still in storage, generates new signed URL
```

**Or Manual**:
```bash
aws s3 presign \
  s3://valine-exports/usr_abc123/export.zip \
  --expires-in 259200 # 72 hours
```

### ZIP File Corrupted

**Verify Integrity**:
```bash
# Check ZIP file
unzip -t export.zip

# Regenerate if corrupted
node scripts/regenerate-export.js --export-id export_abc123
```

### Password Not Working

**Reset Password**:
```javascript
// Admin endpoint: POST /api/admin/data-exports/:exportId/reset-password
// Generates new password, emails user
```

---

## Monitoring & Compliance

### Metrics to Track

**Grafana Queries**:
```
# Export requests per day
sum(rate(data_export_requests_total[24h]))

# Average export size
avg(data_export_size_bytes)

# Export completion time
histogram_quantile(0.95, data_export_duration_seconds)

# Compliance: Requests fulfilled within 30 days
(exports_completed_30d / exports_requested_30d) * 100
```

### Compliance Reporting

**Monthly Report** (required for GDPR/CCPA):
```sql
SELECT
  DATE_TRUNC('month', requested_at) AS month,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS completed,
  COUNT(*) FILTER (WHERE completed_at - requested_at <= INTERVAL '30 days') AS on_time,
  AVG(EXTRACT(EPOCH FROM (completed_at - requested_at))/86400) AS avg_days
FROM data_export_requests
WHERE requested_at >= DATE_TRUNC('month', NOW() - INTERVAL '12 months')
GROUP BY month
ORDER BY month DESC;
```

### Alert Thresholds

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Export Delayed | >24 hours pending | P2 | Investigate queue |
| High Failure Rate | >10% failures | P2 | Check system health |
| Compliance Risk | Request >25 days old | P1 | Escalate to legal |
| Storage Full | >80% capacity | P2 | Increase storage |

### Audit Trail

Every export logged with:
- Request timestamp
- User ID
- Completion timestamp
- File size
- Download count
- Expiration date
- Legal basis (GDPR/CCPA/support)

```sql
-- Audit log entry
INSERT INTO audit_logs (
  event, user_id, metadata, created_at
) VALUES (
  'DATA_EXPORT_COMPLETED',
  'usr_abc123',
  jsonb_build_object(
    'exportId', 'export_abc123',
    'fileSize', 157286400,
    'legalBasis', 'GDPR Article 15',
    'completionTime', 3600
  ),
  NOW()
);
```

---

## Security Considerations

### Data Protection
- **Encryption**: AES-256 for ZIP files
- **Password**: 16-byte random, communicated securely
- **Storage**: S3 with encryption at rest (SSE-S3)
- **Expiration**: Automatic deletion after 72 hours
- **Access Control**: Only requestor can download

### Privacy Controls
- **Redaction**: Other users' personal data minimized
- **Anonymization**: IP addresses partially masked in logs
- **Consent**: Export only includes data user has rights to

### Rate Limiting
- **Per User**: 2 requests per 30 days
- **Global**: 100 concurrent exports maximum

---

## Related Documentation
- [Data Deletion Runbook](./data-deletion.md)
- [Privacy Policy](./privacy-policy.md)
- [Incident Response: Data Breach](../security/incident-response-data-breach.md)
- [GDPR Compliance Guide](./gdpr-compliance.md)

---

**Version**: 1.0  
**Review Schedule**: Quarterly and upon regulation changes  
**Compliance Last Reviewed**: 2025-11-05
