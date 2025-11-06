# Profile Links & Headline Backend Integration TODO

## Overview
This document outlines the backend integration requirements for the Profile Edit UI feature that includes headline editing and normalized external links management.

## Status
🚧 **Frontend Complete - Backend Pending**

The frontend UI has been implemented with optimistic updates and client-side validation. Backend integration is required to persist changes.

## Feature Flag
```bash
# Set this environment variable to enable backend API calls
VITE_ENABLE_PROFILE_LINKS_API=true
```

When enabled, the frontend will call the backend API instead of only updating local state.

## Expected API Endpoints

### 1. Update Profile Headline
**Endpoint:** `PATCH /api/profiles/:userId`

**Request Body:**
```json
{
  "headline": "Voice & stage actor — classical & contemporary"
}
```

**Validation Rules:**
- headline: string, max 100 characters, optional
- Should sanitize for XSS prevention

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "user-123",
    "headline": "Voice & stage actor — classical & contemporary",
    "updatedAt": "2025-11-05T03:00:00Z"
  }
}
```

**Error Responses:**
- 400: Validation error (e.g., headline too long)
- 401: Unauthorized
- 404: User not found

---

### 2. Get Profile Links
**Endpoint:** `GET /api/profiles/:userId/links`

**Response:**
```json
{
  "success": true,
  "links": [
    {
      "id": "link-1",
      "userId": "user-123",
      "label": "My Portfolio",
      "url": "https://example.com",
      "type": "Website",
      "order": 0,
      "createdAt": "2025-11-05T03:00:00Z",
      "updatedAt": "2025-11-05T03:00:00Z"
    },
    {
      "id": "link-2",
      "userId": "user-123",
      "label": "IMDb",
      "url": "https://imdb.com/name/nm123456",
      "type": "IMDb",
      "order": 1,
      "createdAt": "2025-11-05T03:00:00Z",
      "updatedAt": "2025-11-05T03:00:00Z"
    }
  ]
}
```

---

### 3. Update Profile Links (Bulk)
**Endpoint:** `PUT /api/profiles/:userId/links`

**Request Body:**
```json
{
  "links": [
    {
      "label": "My Portfolio",
      "url": "https://example.com",
      "type": "Website"
    },
    {
      "label": "IMDb",
      "url": "https://imdb.com/name/nm123456",
      "type": "IMDb"
    }
  ]
}
```

**Validation Rules:**
- Maximum 10 links per user
- label: required, string, max 50 characters
- url: required, string, max 2048 characters, must be valid URL with http/https protocol
- type: optional, string, max 30 characters
- Order is determined by array index

**Response:**
```json
{
  "success": true,
  "links": [
    {
      "id": "link-1",
      "userId": "user-123",
      "label": "My Portfolio",
      "url": "https://example.com",
      "type": "Website",
      "order": 0,
      "createdAt": "2025-11-05T03:00:00Z",
      "updatedAt": "2025-11-05T03:00:00Z"
    }
  ]
}
```

**Error Responses:**
- 400: Validation error (e.g., invalid URL format, too many links)
- 401: Unauthorized
- 404: User not found

---

## Database Schema

### profile_links Table
```sql
CREATE TABLE profile_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  type VARCHAR(30),
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_url CHECK (url ~ '^https?://'),
  CONSTRAINT unique_user_order UNIQUE(user_id, "order")
);

CREATE INDEX idx_profile_links_user_id ON profile_links(user_id);
CREATE INDEX idx_profile_links_user_order ON profile_links(user_id, "order");
```

### users Table Update
Add `headline` column if not exists:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS headline VARCHAR(100);
```

---

## Security Considerations

### URL Validation
- ✅ **Protocol Restriction**: Only http:// and https:// protocols are allowed
- ✅ **XSS Prevention**: URLs are validated and sanitized on both client and server
- ⚠️ **Server-Side Validation Required**: Backend must re-validate all URLs

### Input Sanitization
- Headline: sanitize for HTML/script tags
- Label: sanitize for HTML/script tags
- URL: validate protocol and format
- Type: sanitize for HTML/script tags

### Rate Limiting
Recommend rate limiting profile updates:
- 10 updates per user per hour
- 100 link updates per user per day

---

## Frontend Implementation Details

### Files Modified
1. `src/pages/ProfileEdit.jsx`
   - Added ProfileLinksEditor component
   - Added optimistic updates with toast notifications
   - Added headline validation (max 100 chars)
   - Added feature flag support

2. `src/components/ProfileLinksEditor.jsx` (NEW)
   - Dynamic link editor with add/remove/reorder
   - Client-side validation matching server rules
   - Accessibility support (ARIA labels, focus management)
   - Drag-and-drop reordering

3. `src/utils/urlValidation.js` (NEW)
   - URL validation utilities
   - Protocol checking (http/https only)
   - Length validation
   - Format validation

### Service Layer Integration Points

Update `src/services/userService.js`:

```javascript
// Add these functions when backend is ready

export const updateProfileHeadline = async (userId, headline) => {
  const { data } = await apiClient.patch(`/profiles/${userId}`, { headline });
  return data;
};

export const getProfileLinks = async (userId) => {
  const { data } = await apiClient.get(`/profiles/${userId}/links`);
  return data;
};

export const updateProfileLinks = async (userId, links) => {
  const { data } = await apiClient.put(`/profiles/${userId}/links`, { links });
  return data;
};
```

Update `src/pages/ProfileEdit.jsx` handleSave function:

```javascript
const handleSave = async () => {
  try {
    // ... existing validation ...
    
    const toastId = toast.loading('Saving profile changes...');
    
    // When backend is ready, uncomment:
    if (BACKEND_LINKS_ENABLED) {
      // Update headline
      await updateProfileHeadline(user.id, formData.headline);
      
      // Update links
      await updateProfileLinks(user.id, formData.profileLinks);
    }
    
    // Update local context
    updateUser(formData);
    
    toast.success('Profile saved!', { id: toastId });
    navigate(`/profile/${user.username}`);
  } catch (error) {
    // ... error handling ...
  }
};
```

---

## Testing Requirements

### Backend Tests Required
1. **Headline validation tests**
   - Max length enforcement (100 chars)
   - XSS/HTML sanitization
   - Empty/null handling

2. **Link validation tests**
   - URL protocol validation (http/https only)
   - URL length validation (max 2048 chars)
   - Label validation (required, max 50 chars)
   - Type validation (optional, max 30 chars)
   - Maximum links enforcement (10 max)

3. **Link order tests**
   - Bulk update maintains order
   - Order uniqueness constraint
   - Reordering functionality

4. **Authorization tests**
   - Users can only update their own links
   - Proper 401/403 responses

5. **Integration tests**
   - Full profile update flow
   - Link CRUD operations
   - Concurrent update handling

### Frontend Tests (Already Included)
See `src/components/__tests__/ProfileLinksEditor.test.jsx` and `src/utils/__tests__/urlValidation.test.js`

---

## Migration Plan

### Phase 1: Database Migration
1. Create `profile_links` table
2. Add `headline` column to `users` table
3. Run migration script

### Phase 2: Data Migration (if needed)
If users already have external links in old format:
```sql
-- Example migration from old externalLinks JSON field to normalized table
INSERT INTO profile_links (user_id, label, url, type, "order")
SELECT 
  id as user_id,
  'Website' as label,
  external_links->>'website' as url,
  'Website' as type,
  0 as "order"
FROM users
WHERE external_links->>'website' IS NOT NULL;
```

### Phase 3: API Implementation
1. Implement GET /api/profiles/:userId/links
2. Implement PUT /api/profiles/:userId/links
3. Update PATCH /api/profiles/:userId to handle headline
4. Add validation layer
5. Add tests

### Phase 4: Frontend Integration
1. Set VITE_ENABLE_PROFILE_LINKS_API=true
2. Deploy and test in staging
3. Monitor for errors
4. Deploy to production

---

## Rollback Plan

If issues arise after deployment:
1. Set VITE_ENABLE_PROFILE_LINKS_API=false
2. Frontend will continue to work with local state only
3. Fix backend issues
4. Re-enable when stable

---

## Success Criteria

- ✅ Users can edit profile headline (max 100 chars)
- ✅ Users can add/remove/reorder external links
- ✅ Client-side validation prevents invalid URLs
- ✅ Server-side validation enforces security rules
- ✅ Profile changes persist across sessions
- ✅ Optimistic updates provide instant feedback
- ✅ Error handling shows clear messages
- ✅ Accessibility requirements met (WCAG 2.1 AA)

---

## Questions for Backend Team

1. Should we support link icons/favicons in the database?
2. Should links be publicly visible or have privacy settings?
3. Should we track link click analytics?
4. Should we implement link verification/validation (checking if URL is reachable)?
5. Should we have a moderation system for external links?

---

## References

- Backend Agent Implementation: `BACKEND_AGENT_IMPLEMENTATION.md`
- Profile Schema: `PROFILE_SCHEMA.json`
- API Documentation: TBD (to be created by backend team)

---

**Last Updated:** 2025-11-05  
**Status:** Awaiting backend implementation  
**Frontend PR:** TBD  
**Backend PR:** TBD
