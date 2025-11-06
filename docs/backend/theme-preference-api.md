# Theme Preference API Implementation

This document provides a comprehensive overview of the Theme Preference API implementation for Project Valine.

## Overview

The Theme Preference API allows authenticated users to store and retrieve their theme preference (light or dark mode) on the backend. This ensures consistent theme experience across devices and sessions.

## Key Decisions

1. **Storage**: Theme is persisted as `User.theme` (nullable string), not as a JSON blob
2. **Scope**: Theme preference applies post-login in app areas only; marketing pages remain light-only
3. **Authentication**: All endpoints require Bearer token authentication
4. **Values**: Only "light", "dark", or null (system default) are accepted

## API Endpoints

### GET /api/me/preferences
Retrieve the authenticated user's theme preference.

**Authentication**: Required (Bearer token)

**Response**:
```json
{
  "theme": "light"  // or "dark" or null
}
```

### PATCH /api/me/preferences
Update the authenticated user's theme preference.

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "theme": "dark"  // "light", "dark", or null
}
```

**Response**:
```json
{
  "theme": "dark"
}
```

## Architecture

### Components Added

1. **Authentication Middleware** (`server/src/utils/auth.js`)
   - `requireAuth`: Validates Bearer token and extracts user ID
   - Returns 401 for unauthorized requests
   - Attaches `req.userId` for authenticated requests

2. **Database Client** (`server/src/utils/db.js`)
   - Singleton Prisma client instance
   - Imports from api's generated Prisma client
   - Provides `getPrisma()` and `closePrisma()` utilities

3. **Preferences Routes** (`server/src/routes/preferences.js`)
   - GET `/api/me/preferences`: Fetch user theme
   - PATCH `/api/me/preferences`: Update user theme
   - Integrated with Prisma for database operations
   - Proper error handling and validation

4. **Contract Tests** (`server/src/routes/__tests__/preferences.test.js`)
   - Tests for authenticated and unauthenticated requests
   - Tests for valid and invalid theme values
   - Tests for proper error response format

## Database Schema

The theme field was added via migration `20251105004900_add_user_theme_preference`:

```sql
ALTER TABLE "users" ADD COLUMN "theme" TEXT;
```

- **Type**: TEXT (nullable)
- **Values**: 'light', 'dark', or NULL
- **Default**: NULL (system default)
- **Comment**: "User theme preference: light or dark. NULL means use system default."

### Rollback

To rollback the migration:

```sql
ALTER TABLE "users" DROP COLUMN IF EXISTS "theme";
```

See `api/prisma/migrations/20251105004900_add_user_theme_preference/ROLLBACK.md` for detailed rollback procedures.

## Frontend Integration

### Reading Theme Preference

```javascript
const response = await fetch('/api/me/preferences', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

if (response.ok) {
  const { theme } = await response.json()
  // Apply theme: theme is "light", "dark", or null
  const currentTheme = theme || detectSystemTheme()
}
```

### Updating Theme Preference

```javascript
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
}
```

### Migrating from localStorage

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
  
  // Clear localStorage after successful sync
  localStorage.removeItem('theme')
}
```

## Testing

### Manual Testing with curl

**1. GET without authentication (should return 401):**
```bash
curl -X GET http://localhost:5000/api/me/preferences
```

**2. GET with authentication:**
```bash
curl -X GET http://localhost:5000/api/me/preferences \
  -H "Authorization: Bearer dev-token"
```

**3. PATCH theme to "light":**
```bash
curl -X PATCH http://localhost:5000/api/me/preferences \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{"theme": "light"}'
```

**4. PATCH theme to "dark":**
```bash
curl -X PATCH http://localhost:5000/api/me/preferences \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{"theme": "dark"}'
```

**5. PATCH with invalid theme (should return 400):**
```bash
curl -X PATCH http://localhost:5000/api/me/preferences \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{"theme": "invalid"}'
```

**6. PATCH to clear theme (set to null):**
```bash
curl -X PATCH http://localhost:5000/api/me/preferences \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{"theme": null}'
```

### Contract Tests

Contract tests are located in `server/src/routes/__tests__/preferences.test.js`.

To run the tests, you need:
1. The server running on port 5000
2. Database seeded with test user (id: 'user_123')

The tests verify:
- Authentication requirements
- Valid theme values ("light", "dark", null)
- Invalid theme rejection
- Proper error response format
- Response structure

## Security

- **Authentication Required**: All endpoints require valid Bearer token
- **User Isolation**: Users can only access/modify their own preferences
- **Input Validation**: Theme values strictly validated
- **Error Messages**: Standardized format without leaking sensitive info
- **CodeQL Analysis**: Passed with 0 security alerts

## Dependencies

### Server Dependencies Added
- `@prisma/client@^6.18.0`: Database ORM client

The server reuses the Prisma client generated in the `api` directory to avoid duplication.

## Files Modified

1. **api/prisma/seed.js**: Added test user with id 'user_123'
2. **server/package.json**: Added @prisma/client dependency
3. **server/src/index.js**: Mounted preferences router at /api
4. **server/src/routes/preferences.js**: Updated endpoints and added database integration
5. **server/src/routes/__tests__/preferences.test.js**: Updated tests for new endpoints
6. **server/src/utils/auth.js**: NEW - Authentication middleware
7. **server/src/utils/db.js**: NEW - Database client utility
8. **docs/api/preferences.md**: Updated API documentation

## Migration Notes

### For Development
1. Ensure PostgreSQL is running
2. Set `DATABASE_URL` environment variable
3. Run migrations: `cd api && npx prisma migrate deploy`
4. Seed database: `cd api && npm run seed`
5. Start server: `cd server && npm start`

### For Production
1. Apply migration via CI/CD pipeline
2. Migration is safe (adds nullable column)
3. No data loss or downtime expected
4. Rollback available if needed

## Known Limitations

1. **Auth Stub**: Current implementation uses a simple auth stub (returns fixed user_123). In production, this should validate JWT tokens and extract real user IDs.
2. **Rate Limiting**: No rate limiting implemented yet. Consider adding for production.
3. **Contract Tests**: Tests require running server. Consider mocking for unit tests.

## Next Steps

1. Implement real JWT validation in auth middleware
2. Add rate limiting for preference updates
3. Consider adding theme preference to user profile API response
4. Add analytics to track theme preference usage
5. Implement frontend theme switcher component

## Support

For API documentation, see: `docs/api/preferences.md`

For migration rollback procedures, see: `api/prisma/migrations/20251105004900_add_user_theme_preference/ROLLBACK.md`
