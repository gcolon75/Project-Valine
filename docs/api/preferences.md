# User Preferences API

API endpoints for managing user preferences including theme settings.

## Endpoints

### GET /preferences/:userId

Get user preferences for a specific user.

**Parameters:**
- `userId` (path) - User ID

**Response:** `200 OK`
```json
{
  "preferences": {
    "theme": "light"
  }
}
```

**Possible theme values:**
- `"light"` - Light theme
- `"dark"` - Dark theme
- `null` - Use system default

**Example Request:**
```bash
curl -X GET http://localhost:5000/preferences/user_123 \
  -H "Authorization: Bearer dev-token"
```

---

### PATCH /preferences/:userId

Update user preferences.

**Parameters:**
- `userId` (path) - User ID

**Request Body:**
```json
{
  "theme": "dark"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "preferences": {
    "theme": "dark"
  }
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

**Example Request:**
```bash
curl -X PATCH http://localhost:5000/preferences/user_123 \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{"theme": "dark"}'
```

---

## Integration with Frontend

### Migrating from localStorage

If you previously stored theme preferences in `localStorage`, you can migrate them on user login:

```javascript
// On successful login
const storedTheme = localStorage.getItem('theme')
if (storedTheme && ['light', 'dark'].includes(storedTheme)) {
  // Sync to backend
  await fetch(`/preferences/${userId}`, {
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
const response = await fetch(`/preferences/${userId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

const { preferences } = await response.json()
const theme = preferences.theme || 'light' // Default to light if null
```

### Updating Preferences

```javascript
// Update theme preference
const response = await fetch(`/preferences/${userId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ theme: 'dark' })
})

const { preferences } = await response.json()
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

**Test GET:**
```bash
curl -X GET http://localhost:5000/preferences/user_123 \
  -H "Authorization: Bearer dev-token"
```

**Test PATCH with valid theme:**
```bash
curl -X PATCH http://localhost:5000/preferences/user_123 \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{"theme": "dark"}'
```

**Test PATCH with invalid theme (should return 400):**
```bash
curl -X PATCH http://localhost:5000/preferences/user_123 \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{"theme": "invalid"}'
```

### Contract Tests

Contract tests are located in `server/src/routes/__tests__/preferences.test.js`

Run tests:
```bash
cd server
npm test -- preferences.test.js
```

---

## Notes

- The `theme` field is nullable to allow users to default to system theme
- No authentication middleware is implemented yet - add when auth is ready
- Frontend should handle `null` theme by detecting system preference
- Consider adding rate limiting for frequent preference updates
- Theme preference is per-user, not per-device
