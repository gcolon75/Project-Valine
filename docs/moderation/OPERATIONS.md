# Moderation Operations Guide

## Daily Operations

### Reviewing New Reports

#### 1. List Open Reports
```bash
GET /reports?status=open&limit=50
```

**Response:**
```json
{
  "items": [
    {
      "id": "report-789",
      "reporterId": "user-123",
      "targetType": "profile",
      "targetId": "profile-456",
      "category": "spam",
      "description": "User is posting spam links",
      "evidenceUrls": ["https://..."],
      "status": "open",
      "severity": 1,
      "createdAt": "2024-11-12T10:30:00Z",
      "actions": []
    }
  ],
  "pagination": {
    "limit": 50,
    "hasMore": false,
    "nextCursor": null
  }
}
```

#### 2. Review Report Details
```bash
GET /reports/{id}
```

#### 3. Take Action
```bash
POST /moderation/decision
{
  "reportId": "report-789",
  "action": "remove",  # allow | warn | remove | ban
  "reason": "Confirmed spam, content removed"
}
```

### Filtering Reports

#### By Status
```bash
GET /reports?status=open        # New reports
GET /reports?status=reviewed    # Pending action
GET /reports?status=actioned    # Completed
GET /reports?status=dismissed   # False positives
```

#### By Category
```bash
GET /reports?category=spam
GET /reports?category=abuse
GET /reports?category=unsafe_link
```

#### By Target Type
```bash
GET /reports?targetType=profile
GET /reports?targetType=post
GET /reports?targetType=comment
```

#### Combining Filters
```bash
GET /reports?status=open&category=abuse&limit=20
```

## Handling False Positives

### Scenario: Legitimate Content Blocked

**User report:** "My profile update was blocked but it's not offensive"

#### 1. Review the Content
Check the moderation report:
```bash
GET /reports?targetType=profile&targetId={profileId}
```

Look for auto-generated reports with `reporterId` matching the profile owner.

#### 2. Identify the Issue
Common causes:
- Word in profanity list has legitimate uses (e.g., "ass" in "assistant")
- URL domain not in allowlist (strict mode)
- False positive from normalization

#### 3. Take Corrective Action

**Option A: Allow This Instance**
```bash
POST /moderation/decision
{
  "reportId": "report-789",
  "action": "allow",
  "reason": "False positive - legitimate use of 'assistant'"
}
```

**Option B: Update Rules**
1. Remove word from profanity list
2. Add domain to allowlist
3. Adjust strict mode settings
4. See [RULES.md](./RULES.md) for configuration

#### 4. Communicate with User
Inform user that:
- Their content has been reviewed and approved
- They can retry their update
- Rules have been adjusted if applicable

### Preventing Future False Positives

1. **Monitor Auto-Generated Reports**
   - Review reports where `reporterId` = `targetId`
   - These indicate content blocked by automatic scanning

2. **Tune Word Boundaries**
   - Current implementation uses `\b` regex boundaries
   - Consider context-aware matching (future enhancement)

3. **Use Warn Mode During Tuning**
   ```bash
   PROFANITY_ACTION=warn  # Allow content but create reports
   ```

4. **Maintain Allowlist**
   - Regularly review blocked domains
   - Add legitimate sites to allowlist

## Responding to Incidents

### Spam Attack

**Symptoms:**
- Multiple reports of spam content
- Same user or pattern across reports

**Response:**
1. Review all reports from/about the user
2. Take immediate action:
   ```bash
   POST /moderation/decision
   {
     "reportId": "report-X",
     "action": "remove",
     "reason": "Spam attack - content removed"
   }
   ```
3. Consider temporary ban (manual process, not automated)
4. Update URL blocklist if spam contains specific domains
5. Review rate limits if spam reports are overwhelming

### Coordinated Abuse

**Symptoms:**
- Multiple users reporting same target
- Same category and similar descriptions

**Response:**
1. Investigate the target content
2. Determine if reports are legitimate or coordinated false reports
3. Take action on target if abuse confirmed:
   ```bash
   POST /moderation/decision
   {
     "reportId": "report-X",
     "action": "remove",
     "reason": "Abuse confirmed by multiple reports"
   }
   ```
4. If false reports (brigading):
   - Dismiss reports
   - Document the incident
   - Consider implementing duplicate detection (future)

### Privacy Breach (Doxxing)

**Symptoms:**
- Report category: `privacy`
- Description mentions personal information

**Response:**
1. **URGENT**: Review immediately
2. Verify if PII is publicly posted
3. Take swift action:
   ```bash
   POST /moderation/decision
   {
     "reportId": "report-X",
     "action": "remove",
     "reason": "Privacy violation - PII removed immediately"
   }
   ```
4. TODO: Implement actual content redaction (currently manual)
5. Document for legal/compliance team
6. Contact affected user if possible

## Exporting Reports and Actions

### Generate Report Summary
```bash
# Get all reports from last 7 days
GET /reports?limit=100

# Filter for specific time range (app-level filtering needed)
# Consider implementing date range filters
```

### Audit Trail Export
Current reports include full action history:
```json
{
  "id": "report-789",
  "actions": [
    {
      "id": "action-123",
      "action": "reviewed",
      "reason": "Investigating",
      "actorId": "admin-456",
      "createdAt": "2024-11-12T10:00:00Z"
    },
    {
      "id": "action-124",
      "action": "remove",
      "reason": "Spam confirmed",
      "actorId": "admin-456",
      "createdAt": "2024-11-12T10:05:00Z"
    }
  ]
}
```

**For bulk export:** Use database query or implement export endpoint (future)

## Temporarily Relaxing Strict Mode

### When to Relax
- Too many false positives
- Legitimate use case blocked
- User complaints increasing

### How to Relax

#### Option 1: Switch to Warn Mode
```bash
# .env or deployment config
PROFANITY_ACTION=warn
```
**Effect:** Content is allowed but reports are still generated

#### Option 2: Disable Strict Mode
```bash
MODERATION_STRICT_MODE=false
```
**Effect:** Only blocklisted domains are rejected, not allowlist-only

#### Option 3: Expand Allowlist
```bash
URL_ALLOWED_DOMAINS=imdb.com,youtube.com,...,newdomain.com
```

#### Option 4: Temporarily Disable
```bash
MODERATION_ENABLED=false
```
**Effect:** No scanning, all content allowed

### Re-Enabling Strict Mode
1. Review reports generated during relaxed period
2. Update rules based on findings
3. Test in staging
4. Re-enable:
   ```bash
   MODERATION_ENABLED=true
   PROFANITY_ACTION=block
   MODERATION_STRICT_MODE=true
   ```

## Discord Alert Management

### Alert Types

#### New Report Alert
- **Trigger:** User creates report
- **Color:** Based on severity (gray/yellow/orange/red)
- **Fields:** Reporter ID (redacted), Target, Category, Severity

#### Admin Action Alert
- **Trigger:** Admin takes decision
- **Color:** Based on action (green=allow, red=ban)
- **Fields:** Action, Actor ID, Report ID, Reason

### Configuring Alerts

```bash
# Enable alerts
MODERATION_ALERTS_ENABLED=true
MODERATION_ALERT_CHANNEL_ID=https://discord.com/api/webhooks/...
```

### Disabling Alerts
```bash
MODERATION_ALERTS_ENABLED=false
```

### Testing Alerts
1. Create a test report
2. Take a decision on the report
3. Verify alerts appear in Discord channel

## Monitoring and Metrics

### Health Check
```bash
GET /moderation/health
```

**Metrics to track:**
- Total open reports
- Reports by category
- Average time to resolution
- Action distribution (allow/warn/remove/ban)
- False positive rate

### Recommended Dashboard Queries

```sql
-- Reports by category (last 7 days)
SELECT category, COUNT(*) as count
FROM moderation_reports
WHERE "createdAt" > NOW() - INTERVAL '7 days'
GROUP BY category;

-- Average time to resolution
SELECT AVG("updatedAt" - "createdAt") as avg_resolution_time
FROM moderation_reports
WHERE status IN ('actioned', 'dismissed');

-- Action distribution
SELECT action, COUNT(*) as count
FROM moderation_actions
WHERE "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY action;

-- Top reporters
SELECT "reporterId", COUNT(*) as report_count
FROM moderation_reports
WHERE "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY "reporterId"
ORDER BY report_count DESC
LIMIT 10;
```

## Escalation Procedures

### When to Escalate

1. **Legal Concerns**
   - Child safety issues
   - Threats of violence
   - Privacy law violations

2. **Technical Issues**
   - Moderation system outage
   - High volume of reports (>100/hour)
   - False positive epidemic

3. **Policy Questions**
   - Unclear if content violates policy
   - New type of abuse not covered by rules
   - Community backlash to moderation decisions

### Escalation Contacts
- **Legal**: (Define contact)
- **Engineering**: (Define contact)
- **Community Manager**: (Define contact)
- **Security**: (Define contact)

## Best Practices

1. **Review Daily**: Check open reports at least once per day
2. **Respond Quickly**: High-severity reports within 1 hour
3. **Be Consistent**: Apply rules uniformly
4. **Document Decisions**: Always include reason in actions
5. **Communicate**: Update users when taking action on their content
6. **Learn**: Review weekly trends and adjust rules
7. **Audit**: Monthly review of actions for quality assurance

## Troubleshooting

### Reports Not Appearing
- Check `REPORTS_ENABLED=true`
- Verify user is authenticated
- Check rate limit headers in response

### Scanning Not Working
- Verify `MODERATION_ENABLED=true`
- Check profanity list is loaded
- Review logs for errors

### Discord Alerts Not Sending
- Verify `MODERATION_ALERTS_ENABLED=true`
- Check `MODERATION_ALERT_CHANNEL_ID` is valid webhook URL
- Test webhook URL directly with curl
- Review application logs for Discord errors

### Admin Can't Access Reports
- Verify user ID is in `ADMIN_ROLE_IDS`
- Check comma-separated format: `id1,id2,id3`
- Verify authentication token is valid
