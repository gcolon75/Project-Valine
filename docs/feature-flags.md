# Feature Flags Reference

This document tracks **runtime feature flags** used in Project Valine / Joint.

Feature flags are primarily injected via **Vite environment variables** (e.g., `VITE_*`) and read in frontend code to enable/disable features without major code changes.

---

## 1. Environment / Build Flags

### 1.1 `VITE_ENVIRONMENT`

**Type:** `string`  
**Typical values:** `"development"`, `"staging"`, `"production"`

**Purpose:**

- Distinguish between dev, staging, and prod builds.
- Used to **gate analytics / metrics** so they only fire in production.

**Behavior:**

- If `VITE_ENVIRONMENT !== 'production'`:
  - Analytics helpers should **no-op** (do not send events).
- If `VITE_ENVIRONMENT === 'production'`:
  - Analytics helpers are allowed to send events.

**Where used:**

- Analytics / observability helpers (page views, media upload events, etc.).
- Files: `src/analytics/client.js`, `src/utils/observabilityClient.js`, `src/utils/performanceMonitor.js`

**Configuration:**

```powershell
# .env.development
VITE_ENVIRONMENT=development

# .env.production
VITE_ENVIRONMENT=production
```

---

## 2. UI / Feature Toggles

### 2.1 `VITE_ENABLE_PROFILE_MEDIA`

**Type:** `string` / boolean-like (`"true"` / `"false"`)  
**Default:** `"false"` (media disabled in the UI by default)

**Purpose:**

- Controls whether the **Profile Media** section appears in `ProfileEdit`.
- Allows iterating on media UX/flows without exposing partially built UI to all users.

**Behavior:**

- When `"true"`:
  - `ProfileEdit` sections array includes a **Media** tab (banner, reels, other attachments).
- When `"false"`:
  - Media tab is hidden, and the user only sees:
    - Basic Info
    - Experience
    - Education

**Where used:**

- `ProfileEdit.jsx` (or equivalent profile-edit page).

**Configuration:**

```powershell
# .env.local (development - enable media features)
VITE_ENABLE_PROFILE_MEDIA=true

# .env.production (production - disable until ready)
VITE_ENABLE_PROFILE_MEDIA=false
```

**Example usage:**

```javascript
// In ProfileEdit.jsx
const enableMedia = import.meta.env.VITE_ENABLE_PROFILE_MEDIA === 'true';

const sections = [
  { id: 'basic', label: 'Basic Info', icon: User },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'education', label: 'Education', icon: GraduationCap },
  ...(enableMedia ? [{ id: 'media', label: 'Media', icon: Film }] : [])
];
```

---

### 2.2 `VITE_ENABLE_EDUCATION`

**Type:** `string` / boolean-like  
**Default:** `"true"` (Education is stable and enabled by default)  
**Status:** ⚠️ Optional - only needed if you want to gate Education during initial rollout

**Purpose:**

- Temporarily allow enabling/disabling the **Education** section independently from Experience.
- Useful during phased rollout or A/B testing.

**Behavior:**

- When `"true"`:
  - Education section appears in `ProfileEdit` and is fully interactive.
- When `"false"`:
  - Education section is hidden (or shown as "Coming soon").

**Where used:**

- `ProfileEdit.jsx` when building the `sections` array and rendering the Education panel.

**Configuration:**

```powershell
# .env.local (development)
VITE_ENABLE_EDUCATION=true

# .env.production (production - if you want to hide it temporarily)
VITE_ENABLE_EDUCATION=false
```

**Example usage:**

```javascript
// In ProfileEdit.jsx
const enableEducation = import.meta.env.VITE_ENABLE_EDUCATION === 'true';

const sections = [
  { id: 'basic', label: 'Basic Info', icon: User },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  ...(enableEducation ? [{ id: 'education', label: 'Education', icon: GraduationCap }] : [])
];
```

**Note:** Currently, Education is NOT gated behind a feature flag in the implementation. This flag is documented for future use if needed.

---

### 2.3 `VITE_ENABLE_PROFILE_LINKS_API`

**Type:** `string` / boolean-like  
**Default:** `"true"` (API integration enabled)

**Purpose:**

- Controls whether profile links use the backend API or local state only.
- Allows frontend-first development before backend is ready.

**Behavior:**

- When `"true"`:
  - Profile links are saved to backend via `batchUpdateProfileLinks()` API call.
  - Links are loaded from backend on profile load.
- When `"false"`:
  - Profile links are only stored in local component state.
  - No API calls made (useful for demo/development).

**Where used:**

- `ProfileEdit.jsx` when saving profile changes.

**Configuration:**

```powershell
# .env.local (development with backend)
VITE_ENABLE_PROFILE_LINKS_API=true

# .env.local (development without backend)
VITE_ENABLE_PROFILE_LINKS_API=false
```

---

## 3. Backend Feature Flags

### 3.1 `OBSERVABILITY_ENABLED`

**Type:** `boolean` (environment variable, not Vite)  
**Default:** `"true"` in production, can be `"false"` in development

**Purpose:**

- Enable or disable observability/metrics collection on the backend.
- Controls logging, performance monitoring, and analytics on the server side.

**Behavior:**

- When `"true"`:
  - Observability events are logged and sent to monitoring systems.
- When `"false"`:
  - Observability is disabled (reduces noise in development).

**Where used:**

- Backend handlers (serverless functions).
- `serverless.yml` environment configuration.

**Configuration:**

```yaml
# serverless.yml
environment:
  OBSERVABILITY_ENABLED: ${env:OBSERVABILITY_ENABLED, "true"}
```

---

### 3.2 `ANALYTICS_ENABLED`

**Type:** `boolean` (environment variable)  
**Default:** `"false"` (analytics disabled by default)

**Purpose:**

- Enable or disable analytics event collection on the backend.
- Controls whether user events (page views, signups, etc.) are tracked.

**Behavior:**

- When `"true"`:
  - Analytics events are stored in database.
- When `"false"`:
  - Analytics events are ignored (not stored).

**Where used:**

- Backend analytics handler.
- `serverless.yml` environment configuration.

**Configuration:**

```yaml
# serverless.yml
environment:
  ANALYTICS_ENABLED: ${env:ANALYTICS_ENABLED, "false"}
```

---

### 3.3 `MODERATION_ENABLED`

**Type:** `boolean` (environment variable)  
**Default:** `"false"` (moderation disabled by default)

**Purpose:**

- Enable or disable content moderation features.
- Controls profanity filtering, content flagging, etc.

**Behavior:**

- When `"true"`:
  - Content is checked against moderation rules before being posted.
  - Profanity is blocked or flagged based on `PROFANITY_ACTION`.
- When `"false"`:
  - Content moderation is skipped (faster, but no filtering).

**Where used:**

- Backend post creation, comment handlers.
- `serverless.yml` environment configuration.

**Configuration:**

```yaml
# serverless.yml
environment:
  MODERATION_ENABLED: ${env:MODERATION_ENABLED, "false"}
```

---

## 4. Adding New Feature Flags

When introducing a new flag:

1. **Name** it with `VITE_` prefix for frontend visibility, e.g. `VITE_ENABLE_SOMETHING`.
   - Backend flags don't need the `VITE_` prefix.
2. **Document** it here:
   - Type
   - Default
   - Purpose
   - Behavior (what happens when true/false)
   - Where it is read in code.
3. **Update** environment configs:
   - `.env.local` (developer machine)
   - `.env.development` / `.env.staging` / `.env.production` (or build pipeline/env-vars).
4. **Guard** code with clear conditions, e.g.:

```javascript
const enableNewFeature = import.meta.env.VITE_ENABLE_NEW_FEATURE === 'true';
if (enableNewFeature) {
  // Render new UI
}
```

### Best Practices

1. **Use explicit string checks:** Always check `=== 'true'` not just truthiness, as env vars are strings.
   
   ```javascript
   // ✅ Good
   const enabled = import.meta.env.VITE_FEATURE === 'true';
   
   // ❌ Bad - Environment variables are always strings, so the string 'false' is truthy!
   const enabled = import.meta.env.VITE_FEATURE;
   ```

2. **Provide defaults:** Use fallback values so missing env vars don't break the app.
   
   ```javascript
   const enabled = import.meta.env.VITE_FEATURE === 'true' || false;
   ```

3. **Document behavior:** Make it clear what happens when the flag is on vs off.

4. **Test both states:** Ensure the app works correctly with flag both enabled and disabled.

5. **Remove old flags:** Once a feature is stable and enabled everywhere, remove the flag and the conditional code.

---

## 5. Operational Notes

### General Guidelines

1. **Do not hard-code feature flag values in components.**
   - Always read from `import.meta.env` or a centralized config.

2. **Do centralize flag evaluation where appropriate.**
   - Example: Create a `src/config/featureFlags.js` utility if the same flag is used in multiple places.
   
   ```javascript
   // src/config/featureFlags.js
   export const featureFlags = {
     enableMedia: import.meta.env.VITE_ENABLE_PROFILE_MEDIA === 'true',
     enableEducation: import.meta.env.VITE_ENABLE_EDUCATION === 'true',
     // ... other flags
   };
   ```

3. **Always consider: What happens when the flag is turned off again?**
   - Does the rest of the UI still behave gracefully?
   - Are there any broken links or missing data?

4. **Avoid nested flags:**
   - Don't create flags that depend on other flags (makes reasoning about state complex).
   - If you need complex logic, use a single flag with multiple possible values.

### Environment Files

Project Valine uses multiple environment files:

- `.env.local` - Developer-specific overrides (not committed)
- `.env.local.example` - Template for `.env.local` (committed)
- `.env.development` - Development build defaults
- `.env.staging` - Staging environment
- `.env.production` - Production environment

**Example `.env.local`:**

```powershell
# API
VITE_API_BASE_URL=http://localhost:3000

# Feature Flags
VITE_ENABLE_PROFILE_MEDIA=true
VITE_ENABLE_EDUCATION=true
VITE_ENABLE_PROFILE_LINKS_API=true

# Environment
VITE_ENVIRONMENT=development
```

---

## 6. Current Feature Flag Status

| Flag | Status | Default | Notes |
|------|--------|---------|-------|
| `VITE_ENVIRONMENT` | ✅ Active | `"production"` | Used for analytics gating |
| `VITE_ENABLE_PROFILE_MEDIA` | ✅ Active | `"false"` | Media section hidden by default |
| `VITE_ENABLE_EDUCATION` | 📝 Documented | `"true"` | Not currently gated, always enabled |
| `VITE_ENABLE_PROFILE_LINKS_API` | ✅ Active | `"true"` | Backend integration enabled |
| `OBSERVABILITY_ENABLED` (backend) | ✅ Active | `"true"` | Observability enabled in prod |
| `ANALYTICS_ENABLED` (backend) | ✅ Active | `"false"` | Analytics disabled by default |
| `MODERATION_ENABLED` (backend) | ✅ Active | `"false"` | Moderation disabled by default |

---

## 7. Future Considerations

### Potential New Flags

1. **`VITE_ENABLE_EXPERIENCE`** - If we want to gate Experience section during rollout
2. **`VITE_ENABLE_MESSAGING`** - For private messaging features
3. **`VITE_ENABLE_ADVANCED_SEARCH`** - For advanced search filters
4. **`VITE_ENABLE_DARK_MODE`** - To control dark mode availability
5. **`VITE_ENABLE_NOTIFICATIONS`** - To control notification system

### Flag Lifecycle

Feature flags should have a lifecycle:

1. **Introduction** - Flag created, feature hidden behind it
2. **Testing** - Feature tested in dev/staging with flag enabled
3. **Partial rollout** - Feature enabled for subset of users (if using percentage-based flags)
4. **Full rollout** - Feature enabled for everyone
5. **Stabilization** - Feature proven stable over time
6. **Flag removal** - Flag and conditional code removed, feature always enabled

**Example removal:**

```javascript
// Before (with flag)
const enableEducation = import.meta.env.VITE_ENABLE_EDUCATION === 'true';
const sections = [
  { id: 'basic', label: 'Basic Info', icon: User },
  ...(enableEducation ? [{ id: 'education', label: 'Education', icon: GraduationCap }] : [])
];

// After (flag removed, feature stable)
const sections = [
  { id: 'basic', label: 'Basic Info', icon: User },
  { id: 'education', label: 'Education', icon: GraduationCap }
];
```

---

## 8. Related Documentation

- [Environment Variable Checklist](./ENV_CHECKLIST.md) - Complete list of all environment variables
- [Deployment Guide](./DEPLOYMENT.md) - How to deploy with environment-specific configs
- [Education CRUD Spec](./profile-education-crud-spec.md) - Education feature specification

---

## 9. Troubleshooting

### Flag not working?

1. **Check `.env.local` file exists** and has the flag defined
2. **Restart dev server** after changing `.env` files (Vite requires restart)
3. **Check browser console** - Vite exposes `import.meta.env` in browser, you can log it
4. **Verify string comparison** - Use `=== 'true'` not just truthiness check
5. **Check build output** - In production builds, ensure env vars are injected correctly

### Flag value not updating?

1. **Clear browser cache** - Old service workers may cache old values
2. **Hard refresh** - Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. **Check build process** - Ensure `.env.production` is being used for production builds
4. **Verify environment** - Some hosting platforms require env vars to be set in their UI

---

**Last updated:** December 2024
