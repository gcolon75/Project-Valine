# User Preferences API

API endpoints for managing user preferences including theme settings.

## Endpoints

### GET /api/me/preferences

Get the authenticated user's preferences including theme.

**Authentication:** Required (Bearer token)

**Response:** `200 OK`
```json
{
  "theme": "light"
}
```

**Possible theme values:**
- `"light"` - Light theme
- `"dark"` - Dark theme
- `null` - Use system default

**Error Response:** `401 Unauthorized`
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "details": {
      "hint": "Include Authorization header with Bearer token"
    }
  }
}
```

**Example Request:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/me/preferences" -Method Get -Headers @{
    "Authorization" = "Bearer YOUR_TOKEN"
}```

---

### PATCH /api/me/preferences

Update the authenticated user's preferences.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "theme": "dark"
}
```

**Response:** `200 OK`
```json
{
  "theme": "dark"
}
```

**Error Response:** `400 Bad Request`
```json
{
  "error": {
    "code": "INVALID_THEME",
    "message": "Theme must be \"light\" or \"dark\"",
    "details": {
      "field": "theme",
      "value": "invalid",
      "allowedValues": ["light", "dark"]
    }
  }
}
```

**Error Response:** `401 Unauthorized`
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "details": {
      "hint": "Include Authorization header with Bearer token"
    }
  }
}
```

**Example Request:**
```powershell
Invoke-RestMethod -Uri "-X" -Method Patch -Headers @{
    "Authorization" = "Bearer YOUR_TOKEN"
    "Content-Type" = "application/json"
} -Body '{"theme": "dark"}' -ContentType 'application/json'```

---

## Integration with Frontend

### Migrating from localStorage

If you previously stored theme preferences in `localStorage`, you can migrate them on user login:

```javascript
// On successful login
const storedTheme = localStorage.getItem('theme')
if (storedTheme && ['light', 'dark'].includes(storedTheme)) {
  // Sync to backend
  await fetch('/api/me/preferences', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ theme: storedTheme })
  })
  
  // Optional: Clear localStorage after successful sync
  localStorage.removeItem('theme')
}
```

### Reading Preferences

```javascript
// Fetch user preferences
const response = await fetch('/api/me/preferences', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

if (response.ok) {
  const { theme } = await response.json()
  const currentTheme = theme || 'light' // Default to light if null
  // Apply theme to UI
} else if (response.status === 401) {
  // User not authenticated, redirect to login
}
```

### Updating Preferences

```javascript
// Update theme preference
const response = await fetch('/api/me/preferences', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ theme: 'dark' })
})

if (response.ok) {
  const { theme } = await response.json()
  // Theme updated successfully
} else if (response.status === 400) {
  const { error } = await response.json()
  console.error('Invalid theme value:', error.message)
}
```

---

## Database Schema

The theme preference is stored in the `users` table:

```sql
ALTER TABLE "users" ADD COLUMN "theme" TEXT;
```

**Migration:** `20251105004900_add_user_theme_preference`

**Field Details:**
- **Type:** `TEXT` (nullable)
- **Values:** `'light'`, `'dark'`, or `NULL`
- **Default:** `NULL` (use system default)
- **Index:** None required (low cardinality)

---

## Rollback Plan

See [migration rollback documentation](../../api/prisma/migrations/20251105004900_add_user_theme_preference/ROLLBACK.md) for detailed rollback steps.

**Quick rollback:**
```sql
ALTER TABLE "users" DROP COLUMN IF EXISTS "theme";
```

---

## Testing

### Manual Testing with curl

**Test GET without authentication (should return 401):**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/me/preferences" -Method Get
```

**Test GET with authentication:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/me/preferences" -Method Get -Headers @{
    "Authorization" = "Bearer dev-token"
}```

**Test PATCH with valid theme:**
```powershell
Invoke-RestMethod -Uri "-X" -Method Patch -Headers @{
    "Authorization" = "Bearer dev-token"
    "Content-Type" = "application/json"
} -Body '{"theme": "dark"}' -ContentType 'application/json'```

**Test PATCH with invalid theme (should return 400):**
```powershell
Invoke-RestMethod -Uri "-X" -Method Patch -Headers @{
    "Authorization" = "Bearer dev-token"
    "Content-Type" = "application/json"
} -Body '{"theme": "invalid"}' -ContentType 'application/json'```

**Test PATCH without authentication (should return 401):**
```powershell
Invoke-RestMethod -Uri "-X" -Method Patch -Headers @{
    "Content-Type" = "application/json"
} -Body '{"theme": "light"}' -ContentType 'application/json'```

**Test PATCH to clear theme (set to null):**
```powershell
Invoke-RestMethod -Uri "-X" -Method Patch -Headers @{
    "Authorization" = "Bearer dev-token"
    "Content-Type" = "application/json"
} -Body '{"theme": null}' -ContentType 'application/json'```

### Contract Tests

Contract tests are located in `server/src/routes/__tests__/preferences.test.js`

Run tests:
```powershell
cd server
npm test -- preferences.test.js
```

---

## Security

- **Authentication Required:** All endpoints require a valid Bearer token
- **User Isolation:** Users can only access and modify their own preferences
- **Input Validation:** Theme values are strictly validated (only "light", "dark", or null)
- **Error Messages:** Standardized error format without leaking sensitive information

---

## Notes

- The `theme` field is nullable to allow users to default to system theme
- Authentication is enforced via Bearer token middleware
- Frontend should handle `null` theme by detecting system preference
- Consider adding rate limiting for frequent preference updates
- Theme preference is per-user, not per-device
- Marketing pages remain light-only; theme applies post-login in app areas
