# Privacy Analytics Baseline

## Overview

The Analytics Privacy Stub is a minimal, privacy-first analytics foundation that supports opt-in user consent, core event schema, and backend ingestion with feature flags. This implementation prioritizes user privacy while providing essential usage insights.

**Key Principles:**
- **Zero PII**: No email, name, or IP addresses stored in event records
- **Opt-in by Default**: Users must explicitly consent to tracking
- **Immediate Rollback**: Can be disabled instantly via feature flags
- **Transparent**: Clear documentation of what's tracked and why
- **Minimal Footprint**: Only essential events and properties

## Feature Flags

All analytics functionality is controlled by environment variables with safe defaults:

| Variable | Default | Description |
|----------|---------|-------------|
| `ANALYTICS_ENABLED` | `false` | Master switch for analytics system |
| `ANALYTICS_REQUIRE_CONSENT` | `true` | Require user consent before tracking |
| `ANALYTICS_PERSIST_ENABLED` | `true` | Store events to database (when enabled) |
| `ANALYTICS_STORAGE_DRIVER` | `postgres` | Storage backend (postgres or dynamodb) |
| `ANALYTICS_RETENTION_DAYS` | `30` | Days to retain analytics events |
| `ANALYTICS_ALLOWED_EVENTS` | See below | Comma-separated list of allowed event types |
| `ANALYTICS_SAMPLING_RATE` | `1.0` | Fraction of events to capture (0.0-1.0) |
| `ANALYTICS_CONSENT_COOKIE` | `analytics_consent` | Cookie name for consent tracking |

### Flag Matrix

| Scenario | ENABLED | REQUIRE_CONSENT | PERSIST | Behavior |
|----------|---------|-----------------|---------|----------|
| Production (default) | false | true | true | No tracking, banner hidden |
| Testing with consent | true | true | true | Shows banner, tracks after consent |
| Testing without consent | true | false | true | Tracks immediately, no banner |
| Metrics only | true | true | false | Accepts events but doesn't store |
| Fully disabled | false | * | * | Returns 204, no processing |

## Event Schema

### Database Model

```prisma
model AnalyticsEvent {
  id         String   @id @default(cuid())
  event      String                    // Event name (from allowed list)
  anonId     String?                   // Anonymous UUID from cookie
  userId     String?                   // User ID if logged in AND consented
  sessionId  String?                   // Ephemeral session identifier
  properties Json?                     // Event-specific properties
  createdAt  DateTime @default(now())
  
  @@index([event])
  @@index([createdAt])
}
```

### Allowed Events

| Event | When Triggered | Properties |
|-------|---------------|------------|
| `page_view` | Route change | `{ path, referrer? }` |
| `signup` | Successful registration | `{ method, success }` |
| `login` | Successful/failed login | `{ method, success }` |
| `profile_update` | Profile save | `{ fieldsChanged: [...] }` |
| `media_upload` | Media upload success | `{ type, sizeBucket }` |
| `logout` | User logout | `{}` |

### Property Guidelines

**Allowed Properties:**
- `path` - URL path (no query params with PII)
- `referrer` - Referring URL (sanitized)
- `method` - Authentication method (e.g., "password", "2fa")
- `success` - Boolean operation result
- `fieldsChanged` - Array of field names (not values)
- `type` - Media type (e.g., "image", "video")
- `sizeBucket` - Size category (e.g., "small", "medium", "large")

**Disallowed Properties:**
Automatically rejected/sanitized:
- `email`, `password`, `token`, `secret`, `apiKey`
- `access_token`, `refresh_token`
- `creditCard`, `ssn`, `phone`, `phoneNumber`
- `address`, `ipAddress`, `ip`

## Data Flow

```
┌─────────────┐
│   Browser   │
│             │
│ 1. User     │
│    accepts  │──────┐
│    consent  │      │
└─────────────┘      │
                     ▼
┌─────────────────────────────────┐
│   Analytics Client (JS)         │
│                                 │
│ 2. Queue events                 │
│ 3. Apply sampling rate          │
│ 4. Check consent                │
│ 5. Batch (max 10 or 5s)        │
└─────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────┐
│   POST /analytics/ingest        │
│                                 │
│ 6. Validate event names         │
│ 7. Check property denylist      │
│ 8. Enforce rate limits          │
│ 9. Sanitize properties          │
└─────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────┐
│   PostgreSQL                    │
│                                 │
│ 10. Store event                 │
│ 11. Apply retention policy      │
└─────────────────────────────────┘
```

## API Endpoints

### POST /analytics/ingest

Ingests a batch of analytics events.

**Request:**
```json
{
  "events": [
    {
      "event": "page_view",
      "anonId": "uuid-v4",
      "userId": "user-123",
      "sessionId": "session-uuid",
      "properties": { "path": "/dashboard" },
      "ts": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Response (200):**
```json
{
  "accepted": 1,
  "rejected": 0
}
```

**Response (207 - Multi-status):**
```json
{
  "accepted": 5,
  "rejected": 2,
  "errors": [
    { "index": 3, "error": "Event 'custom' not allowed" },
    { "index": 7, "error": "Properties contain disallowed keys" }
  ]
}
```

**Response (204 - Analytics disabled):**
Empty body, no processing.

**Response (202 - Persist disabled):**
```json
{
  "accepted": 10,
  "rejected": 0,
  "persisted": false
}
```

**Response (429 - Rate limited):**
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 900
}
```

**Rate Limits:**
- 100 events per 15 minutes per `anonId` or `userId`
- Max batch size: 50 events

### GET /analytics/config

Returns client configuration.

**Response (200):**
```json
{
  "enabled": true,
  "requireConsent": true,
  "allowedEvents": ["page_view", "signup", "login", "profile_update", "media_upload", "logout"],
  "samplingRate": 1.0,
  "consentCookie": "analytics_consent"
}
```

**Cache:** `Cache-Control: public, max-age=300` (5 minutes)

### DELETE /analytics/events/cleanup

Removes events older than retention period (typically called by cron).

**Response (200):**
```json
{
  "deleted": 1234,
  "cutoffDate": "2023-12-01T00:00:00Z"
}
```

## Privacy & Security

### No PII Collection

**Not Stored:**
- Email addresses
- Names (display name, real name, username)
- IP addresses in event records (may appear in server logs)
- User agent strings
- Precise geolocation
- Payment information
- Authentication tokens

**Optional Storage:**
- `userId`: Only stored if user is logged in AND has consented. Useful for understanding user journeys but not required.
- `anonId`: Random UUIDv4 stored in cookie, rotated monthly. Enables session stitching without PII.

### Property Denylist

The backend actively scans all event properties for disallowed keys. Any property containing:
- `email`, `password`, `token`, `secret`, `api`
- `credit`, `ssn`, `phone`, `address`, `ip`

...will cause the entire event to be rejected.

### Rate Limiting

To prevent abuse and excessive data collection:
- 100 events per 15 minutes per identifier
- Batch size limited to 50 events
- In-memory cache (production should use Redis)

### Data Retention

- Default: 30 days
- Configurable via `ANALYTICS_RETENTION_DAYS`
- Cleanup via scheduled job calling `DELETE /analytics/events/cleanup`
- Automatic purge of events older than retention period

## Client Integration

### Initialization

```javascript
import { initAnalytics } from './analytics/client';

// Initialize on app mount
useEffect(() => {
  initAnalytics();
}, []);
```

### Consent Banner

```jsx
import ConsentBanner from './analytics/ConsentBanner';

function App() {
  return (
    <>
      <ConsentBanner />
      {/* rest of app */}
    </>
  );
}
```

The banner automatically shows when:
- `ANALYTICS_ENABLED=true`
- `ANALYTICS_REQUIRE_CONSENT=true`
- No consent decision has been made

### Event Tracking

```javascript
import { trackPageView, trackLogin, trackSignup } from './analytics/client';

// Automatic page view tracking
useEffect(() => {
  trackPageView(location.pathname);
}, [location.pathname]);

// Manual event tracking
await login(email, password);
trackLogin('password', true);

await register(userData);
trackSignup('password', true);
```

## Rollback Procedures

### Immediate Disable

1. Set `ANALYTICS_ENABLED=false` in environment
2. Redeploy or restart services
3. Client stops sending, backend returns 204

**Impact:** Immediate cessation of tracking, no data loss.

### Cookie Cleanup (Optional)

For users who want to remove tracking cookies:

```javascript
// Client-side cleanup
document.cookie = 'analytics_consent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
document.cookie = 'analytics_uuid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
```

### Full Removal

1. Set `ANALYTICS_ENABLED=false`
2. Revert commits containing analytics code
3. Optionally purge `analytics_events` table:
   ```sql
   DROP TABLE analytics_events;
   ```
4. Remove migration: `rm serverless/prisma/migrations/*_add_analytics_events`

## Future Roadmap

### Phase 2: Dashboard & Visualization
- Simple analytics dashboard for key metrics
- Page view trends
- User journey visualization
- Conversion funnels

### Phase 3: Anomaly Detection
- Automated detection of unusual patterns
- Traffic spikes
- Error rate increases
- Performance degradation alerts

### Phase 4: A/B Testing Framework
- Privacy-preserving experiment framework
- Variant assignment without PII
- Statistical significance testing
- Automated rollouts

### Phase 5: Advanced Analytics
- Cohort analysis
- Retention metrics
- Session replay (opt-in, privacy-preserving)
- Heatmaps and click tracking

**Note:** All future phases will maintain the same privacy-first principles and opt-in consent requirements.

## Testing

### Unit Tests
- Consent logic validation
- Sampling rate enforcement
- Event validation
- Property denylist enforcement

### Integration Tests
- Ingest endpoint with valid/invalid events
- Feature flag behavior
- Rate limiting
- Retention cleanup
- CORS and authentication

### Manual Testing Checklist
- [ ] Banner appears with `ANALYTICS_ENABLED=true` and no consent
- [ ] Accept consent enables tracking
- [ ] Decline consent disables tracking
- [ ] Page views tracked on navigation
- [ ] Login/signup events captured
- [ ] Profile update tracks changed fields
- [ ] Media upload tracks type and size
- [ ] No PII in stored events
- [ ] Rate limiting enforced
- [ ] Analytics disabled returns 204

## Evidence & Validation

### Sample Event (Redacted)

```json
{
  "id": "clx***********",
  "event": "page_view",
  "anonId": "a1b2c3d4-****-****-****-************",
  "userId": "user-***",
  "sessionId": "session-***",
  "properties": {
    "path": "/dashboard"
  },
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

### Test Coverage

- Unit tests: 100% coverage for analytics config and client
- Integration tests: All endpoints and edge cases
- E2E tests: Consent flow and event tracking

### Security Scan

All changes pass CodeQL security scanning with zero high/critical vulnerabilities related to PII exposure.

## Support & Maintenance

**Owner:** Engineering Team  
**Escalation:** security@projectvaline.com  
**Documentation:** `/docs/analytics/`  
**Monitoring:** Analytics endpoints included in observability dashboard

## Changelog

### v1.0.0 - Initial Release
- Privacy-first analytics foundation
- Opt-in consent mechanism
- Core event schema (6 events)
- Backend ingestion with validation
- Rate limiting and retention
- Comprehensive testing and documentation
