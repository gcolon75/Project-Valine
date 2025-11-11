# Analytics Event Schema - Phase 9

**Project Valine - Privacy-Respecting Analytics**

**Last Updated:** 2025-11-11  
**Status:** Draft  
**Owner:** Product Team

---

## Overview

This document defines the event schema for Project Valine's privacy-respecting analytics system. All analytics are opt-in and do not track personally identifiable information (PII).

---

## Privacy Principles

1. **Opt-In Only** - Users must explicitly consent
2. **No PII** - No email, names, IP addresses, or identifiable data
3. **Anonymous IDs** - Random session IDs only
4. **Local Storage** - Consent stored in browser localStorage
5. **No Third-Party Tracking** - Self-hosted or privacy-first providers only

---

## Event Schema

### Base Event Structure

```typescript
interface AnalyticsEvent {
  event: string;              // Event name (e.g., 'page_view')
  timestamp: string;          // ISO 8601 timestamp
  sessionId: string;          // Random session ID (not user ID)
  properties: Record<string, any>;  // Event-specific properties
  metadata: {
    userAgent: string;        // Browser info (anonymized)
    viewport: {width: number, height: number};
    locale: string;           // Language preference
    theme: 'light' | 'dark';  // Theme setting
  };
}
```

---

## Core Events

### 1. Page View

**Event Name:** `page_view`

**When:** User navigates to a page

**Properties:**
```typescript
{
  page: string;               // Page path (e.g., '/dashboard')
  referrer: string;           // Previous page (internal only)
  duration: number;           // Time on previous page (ms)
}
```

**Example:**
```json
{
  "event": "page_view",
  "timestamp": "2025-11-11T22:30:00Z",
  "sessionId": "anon_abc123xyz",
  "properties": {
    "page": "/dashboard",
    "referrer": "/login",
    "duration": 4500
  }
}
```

---

### 2. User Signup

**Event Name:** `signup`

**When:** User completes registration

**Properties:**
```typescript
{
  method: 'email' | 'social';  // Signup method
  emailVerified: boolean;      // Email verification status
  completedOnboarding: boolean; // Onboarding wizard completion
}
```

**Example:**
```json
{
  "event": "signup",
  "timestamp": "2025-11-11T22:35:00Z",
  "sessionId": "anon_abc123xyz",
  "properties": {
    "method": "email",
    "emailVerified": false,
    "completedOnboarding": false
  }
}
```

---

### 3. Media Upload

**Event Name:** `media_upload`

**When:** User uploads media (profile photo, video, etc.)

**Properties:**
```typescript
{
  mediaType: 'image' | 'video' | 'audio';
  fileSize: number;            // Bytes
  duration: number;            // Upload time (ms)
  success: boolean;            // Upload success
}
```

**Example:**
```json
{
  "event": "media_upload",
  "timestamp": "2025-11-11T22:40:00Z",
  "sessionId": "anon_abc123xyz",
  "properties": {
    "mediaType": "image",
    "fileSize": 245760,
    "duration": 1200,
    "success": true
  }
}
```

---

### 4. Profile Completion

**Event Name:** `profile_completed`

**When:** User completes onboarding wizard

**Properties:**
```typescript
{
  steps: number;               // Total steps in wizard
  timeSpent: number;           // Total time (ms)
  profilePhotoAdded: boolean;  // Profile photo uploaded
  bioAdded: boolean;           // Bio text added
  linksAdded: number;          // Number of social links
}
```

---

### 5. Content Interaction

**Event Name:** `content_interaction`

**When:** User interacts with content (like, comment, share)

**Properties:**
```typescript
{
  action: 'like' | 'comment' | 'share' | 'bookmark';
  contentType: 'post' | 'reel' | 'profile';
}
```

---

### 6. Search

**Event Name:** `search`

**When:** User performs a search

**Properties:**
```typescript
{
  category: 'profiles' | 'users' | 'content';
  resultsCount: number;        // Number of results
  hasResults: boolean;         // Results found
}
```

**Note:** Search queries are NOT tracked to protect privacy.

---

### 7. Feature Usage

**Event Name:** `feature_used`

**When:** User uses a specific feature

**Properties:**
```typescript
{
  feature: string;             // Feature name (e.g., '2fa_enabled')
  action: string;              // Action taken (e.g., 'enabled', 'disabled')
}
```

---

### 8. Error Encountered

**Event Name:** `error_encountered`

**When:** User encounters an error

**Properties:**
```typescript
{
  errorType: 'network' | 'validation' | 'server' | 'unknown';
  page: string;                // Page where error occurred
  recovered: boolean;          // User recovered from error
}
```

**Note:** Error messages are NOT tracked to avoid leaking sensitive info.

---

## Consent Management

### Consent Event

**Event Name:** `consent_changed`

**When:** User changes analytics consent

**Properties:**
```typescript
{
  consent: 'granted' | 'denied';
  timestamp: string;
}
```

### localStorage Schema

```typescript
interface AnalyticsConsent {
  consent: 'granted' | 'denied' | 'pending';
  timestamp: string;
  version: string;  // Consent policy version
}
```

**Storage Key:** `valine_analytics_consent`

---

## Implementation

### Client-Side Tracking

```javascript
// window.__analytics interface
window.__analytics = {
  track(event, properties) {
    // Check consent
    const consent = localStorage.getItem('valine_analytics_consent');
    if (!consent || JSON.parse(consent).consent !== 'granted') {
      return; // Do not track
    }
    
    // Build event
    const analyticsEvent = {
      event,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      properties,
      metadata: getMetadata()
    };
    
    // Send to backend (if ANALYTICS_ENABLED flag is true)
    if (import.meta.env.VITE_ANALYTICS_ENABLED === 'true') {
      sendToBackend(analyticsEvent);
    } else {
      // Store locally for debugging
      console.log('[Analytics]', analyticsEvent);
    }
  },
  
  getEvents() {
    return events; // For debugging
  }
};
```

### Backend Storage

**Option 1: CloudWatch Logs**
- Log events to CloudWatch
- Query with CloudWatch Insights
- Free tier: 5GB/month

**Option 2: DynamoDB**
- Store events in DynamoDB table
- TTL: 90 days
- Query with DynamoDB queries

**Option 3: S3 + Athena**
- Write events to S3 (JSON lines)
- Query with AWS Athena
- Cost-effective for large volumes

---

## Privacy Compliance

### GDPR Compliance

- ✅ Opt-in consent required
- ✅ No PII tracked
- ✅ Right to withdraw consent
- ✅ Data retention policy (90 days)
- ✅ Data export available (if requested)

### CCPA Compliance

- ✅ Do Not Track honored
- ✅ Opt-out mechanism available
- ✅ No sale of personal information

---

## Rollback Plan

**To disable analytics:**
```bash
# Set feature flag
export ANALYTICS_ENABLED=false

# Clear frontend env
VITE_ANALYTICS_ENABLED=false

# Redeploy
npm run build
serverless deploy --stage prod
```

---

## References

- [Privacy Policy](../privacy/PRIVACY_POLICY.md)
- [GDPR Compliance](../privacy/GDPR_COMPLIANCE.md)
- [Analytics Guide](../guides/analytics.md)

---

**Version:** 1.0  
**Next Review:** After Phase 9 implementation
