# Moderation MVP - Overview and Setup

## Table of Contents
- [Overview](#overview)
- [Threat Model](#threat-model)
- [Terminology](#terminology)
- [Feature Flags](#feature-flags)
- [Environment Configuration](#environment-configuration)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Privacy Considerations](#privacy-considerations)

## Overview

The Moderation MVP provides a minimal, production-credible baseline for content safety and user reporting. It focuses on preventing obviously unsafe content from being saved and providing a simple, rate-limited reporting flow that users can trigger.

### Key Features
- **Text Safety**: Profanity detection with word boundaries and normalization
- **URL Safety**: Protocol and domain validation with allow/block lists
- **User Reports**: Rate-limited endpoint for users to report content
- **Admin Interface**: Endpoints for reviewing and acting on reports
- **Discord Alerts**: Optional webhook notifications for moderation events
- **Feature Flags**: All features can be toggled independently for safe rollback

### Scope Limitations
- ✅ Text and URL safety only
- ❌ No ML models or AI-based moderation
- ❌ No external moderation APIs
- ❌ No image or video content moderation
- ❌ No automated actions (admin review required)

## Threat Model

### Threats Addressed
1. **Profane Content**: Users attempting to post offensive language in public-facing fields
2. **Malicious URLs**: JavaScript injection, data URLs, and phishing links
3. **Abuse and Spam**: Users posting unwanted or harmful content
4. **Privacy Violations**: Users sharing others' personal information

### Mitigation Strategies
- **Block Mode**: Prevents content from being saved when violations are detected
- **Warn Mode**: Allows content but creates a moderation report for review
- **Rate Limiting**: Prevents report spam and abuse
- **Admin Review**: Human oversight for all moderation actions

### Out of Scope
- Advanced evasion techniques (leetspeak, homoglyphs)
- Image-based profanity or NSFW detection
- User behavior analysis and pattern detection
- Automated bans or account suspensions

## Terminology

- **Report**: A user-submitted flag indicating potentially problematic content
- **Category**: Classification of the report (spam, abuse, unsafe_link, profanity, privacy, other)
- **Severity**: Numeric score (0-3) indicating urgency:
  - 0: Info
  - 1: Low (spam, profanity)
  - 2: Medium (unsafe_link, privacy)
  - 3: High (abuse)
- **Action**: Admin decision on a report (allow, warn, remove, ban)
- **Status**: Report lifecycle state (open, reviewed, actioned, dismissed)

## Feature Flags

All moderation features are controlled by environment variables:

| Flag | Default | Description |
|------|---------|-------------|
| `MODERATION_ENABLED` | `false` | Enable content scanning on save operations |
| `REPORTS_ENABLED` | `true` | Enable user reporting endpoints |
| `MODERATION_STRICT_MODE` | `false` | Enforce allowlist-only for domains |
| `MODERATION_ALERTS_ENABLED` | `false` | Send Discord notifications |

### Rollback Strategy
1. Set `MODERATION_ENABLED=false` to disable scanning immediately
2. Set `REPORTS_ENABLED=false` to hide reporting endpoints
3. Set `MODERATION_ALERTS_ENABLED=false` to stop Discord notifications
4. Database tables remain for historical tracking

## Environment Configuration

### Required Variables
```bash
# Core Feature Flags
MODERATION_ENABLED=false
REPORTS_ENABLED=true

# Admin Access
ADMIN_ROLE_IDS=user-id-1,user-id-2  # Comma-separated admin user IDs
```

### Optional Variables
```bash
# Moderation Behavior
MODERATION_STRICT_MODE=false
MODERATION_ALERTS_ENABLED=false
PROFANITY_ACTION=block  # block | warn

# Discord Integration
MODERATION_ALERT_CHANNEL_ID=https://discord.com/api/webhooks/...

# Rate Limiting
REPORTS_MAX_PER_HOUR=5
REPORTS_MAX_PER_DAY=20
REPORTS_IP_MAX_PER_HOUR=10

# URL Safety Rules
URL_ALLOWED_DOMAINS=imdb.com,youtube.com,vimeo.com,linkedin.com,github.com
URL_BLOCKED_DOMAINS=malware.com,phishing.test
URL_ALLOWED_PROTOCOLS=http:https:mailto:

# Custom Profanity List (optional)
PROFANITY_LIST_PATH=/path/to/custom/list.txt

# Report Categories
REPORT_CATEGORY_ALLOWLIST=spam,abuse,unsafe_link,profanity,privacy,other
```

## Quick Start

### 1. Enable Moderation
```bash
# In .env or deployment config
MODERATION_ENABLED=true
PROFANITY_ACTION=block
ADMIN_ROLE_IDS=your-admin-user-id
```

### 2. Test Content Scanning
Try updating a profile with profanity:
```bash
curl -X PUT /profiles/id/123 \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"headline": "Shitty actor looking for work"}'
```

Expected response (422):
```json
{
  "code": "MODERATION_BLOCKED",
  "message": "Content blocked by moderation rules",
  "fields": [
    {
      "name": "headline",
      "reason": "Contains profane language: shit"
    }
  ]
}
```

### 3. Create a Report
```bash
curl -X POST /reports \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "targetType": "profile",
    "targetId": "profile-456",
    "category": "spam",
    "description": "User is posting spam links"
  }'
```

### 4. Review Reports (Admin)
```bash
curl -X GET '/reports?status=open' \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 5. Take Action (Admin)
```bash
curl -X POST /moderation/decision \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "reportId": "report-789",
    "action": "remove",
    "reason": "Confirmed spam"
  }'
```

## Architecture

### Content Scanning Flow
```
User updates profile
    ↓
[MODERATION_ENABLED check]
    ↓
Scan text fields for profanity
Scan URLs for safety
    ↓
[Issues found?]
    ↓ Yes
[PROFANITY_ACTION check]
    ↓
Block (422) or Warn (save + report)
```

### Scanning Integration Points
- Profile updates: `PUT /profiles/id/:id`
  - Scanned fields: `displayName`, `headline`, `bio`, `socialLinks`
- Profile links: validated in profile update payload
  - Scanned: `label`, `url`

### Adding Scanning to New Endpoints
```javascript
import { isModerationEnabled, scanProfilePayload } from '../utils/moderation.js';

if (isModerationEnabled()) {
  const scanResult = scanProfilePayload(payload);
  
  if (!scanResult.ok) {
    // Handle based on PROFANITY_ACTION
  }
}
```

## Privacy Considerations

### PII Redaction
All logs redact personally identifiable information:
- User IDs: Show first 6 + last 4 chars (`123456***abc4`)
- Emails: Not logged in moderation context
- IP addresses: Used for rate limiting only, not stored in reports

### Data Retention
- Reports are kept indefinitely for audit trail
- No automatic deletion
- Admins can export data via standard endpoints

### Access Control
- Report creation: Authenticated users only
- Report listing: Admin users only (via `ADMIN_ROLE_IDS`)
- No PII leakage in responses (reporter email, IP, etc.)

### Audit Logging
All moderation actions are logged with:
- Action type and timestamp
- Actor ID (redacted in logs)
- Report ID
- No sensitive user data

## Discord Alert Setup (Optional)

1. Create a Discord webhook:
   - Server Settings → Integrations → Webhooks → New Webhook
   - Copy webhook URL

2. Configure environment:
   ```bash
   MODERATION_ALERTS_ENABLED=true
   MODERATION_ALERT_CHANNEL_ID=https://discord.com/api/webhooks/...
   ```

3. Test alerts by creating a report or taking an admin action

### Alert Format
- **New Report**: 🚨 Yellow/Orange/Red embed based on severity
- **Admin Action**: ⚖️ Colored by action type (green=allow, red=ban)

## Next Steps

- Review [RULES.md](./RULES.md) for profanity list and URL configuration
- Review [OPERATIONS.md](./OPERATIONS.md) for day-to-day workflows
- Update `ADMIN_ROLE_IDS` with production admin user IDs
- Configure Discord webhook for production monitoring
