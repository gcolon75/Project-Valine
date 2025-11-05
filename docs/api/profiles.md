# User Profiles API

API endpoints for managing user profile information including title, headline, and social links.

## Endpoints

### GET /profiles/:userId

Get user profile information.

**Parameters:**
- `userId` (path) - User ID

**Response:** `200 OK`
```json
{
  "profile": {
    "userId": "user_123",
    "vanityUrl": "demo-user",
    "headline": "Voice Actor - Classical & Contemporary",
    "title": "Senior Voice Actor",
    "bio": "Experienced voice actor specializing in character work.",
    "socialLinks": {
      "website": "https://example.com",
      "instagram": "https://instagram.com/demouser",
      "imdb": "https://imdb.com/name/nm1234567",
      "linkedin": "https://linkedin.com/in/demouser",
      "showreel": "https://example.com/reel"
    }
  }
}
```

**Example Request:**
```bash
curl -X GET http://localhost:5000/profiles/user_123 \
  -H "Authorization: Bearer dev-token"
```

---

### PATCH /profiles/:userId

Update user profile information.

**Parameters:**
- `userId` (path) - User ID

**Request Body:**
```json
{
  "title": "Senior Voice Actor & Coach",
  "headline": "Award-winning voice actor specializing in animation",
  "socialLinks": {
    "website": "https://mywebsite.com",
    "instagram": "https://instagram.com/myhandle",
    "imdb": "https://imdb.com/name/nm7654321",
    "linkedin": "https://linkedin.com/in/myprofile",
    "showreel": "https://vimeo.com/myreel"
  }
}
```

**Field Constraints:**
- `title`: 0-100 characters (optional)
- `headline`: 0-200 characters (optional)
- `socialLinks`: Object with optional keys
  - Valid keys: `website`, `instagram`, `imdb`, `linkedin`, `showreel`
  - All URLs must use `http://` or `https://` protocol
  - Maximum URL length: 2048 characters

**Response:** `200 OK`
```json
{
  "success": true,
  "profile": {
    "userId": "user_123",
    "title": "Senior Voice Actor & Coach",
    "headline": "Award-winning voice actor specializing in animation",
    "socialLinks": {
      "website": "https://mywebsite.com",
      "instagram": "https://instagram.com/myhandle",
      "imdb": "https://imdb.com/name/nm7654321",
      "linkedin": "https://linkedin.com/in/myprofile",
      "showreel": "https://vimeo.com/myreel"
    }
  }
}
```

**Error Responses:**

Invalid title length (400):
```json
{
  "error": {
    "code": "INVALID_TITLE",
    "message": "title must not exceed 100 characters",
    "details": {
      "field": "title",
      "value": "..."
    }
  }
}
```

Invalid URL protocol (400):
```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "URL protocol must be http or https",
    "details": {
      "field": "socialLinks.website",
      "value": "ftp://example.com"
    }
  }
}
```

Invalid social link key (400):
```json
{
  "error": {
    "code": "INVALID_SOCIAL_LINK_KEY",
    "message": "Invalid social link key: twitter",
    "details": {
      "field": "socialLinks.twitter",
      "validKeys": ["website", "instagram", "imdb", "linkedin", "showreel"]
    }
  }
}
```

**Example Request:**
```bash
curl -X PATCH http://localhost:5000/profiles/user_123 \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Voice Actor",
    "socialLinks": {
      "website": "https://example.com",
      "imdb": "https://imdb.com/name/nm1234567"
    }
  }'
```

---

## Social Links

### Supported Platforms

The API supports the following social link types:

| Key | Platform | Example URL |
|-----|----------|-------------|
| `website` | Personal website | `https://yourname.com` |
| `instagram` | Instagram | `https://instagram.com/username` |
| `imdb` | IMDb | `https://imdb.com/name/nm1234567` |
| `linkedin` | LinkedIn | `https://linkedin.com/in/username` |
| `showreel` | Showreel/Demo reel | `https://vimeo.com/123456789` |

### URL Validation Rules

1. **Protocol**: Only `http://` or `https://` are allowed
2. **Length**: Maximum 2048 characters
3. **Format**: Must be a valid URL
4. **Optional**: Empty or null values are allowed (removes the link)

### Examples of Valid URLs

```json
{
  "website": "https://www.mywebsite.com",
  "instagram": "https://www.instagram.com/myhandle",
  "imdb": "https://www.imdb.com/name/nm1234567",
  "linkedin": "https://www.linkedin.com/in/myprofile",
  "showreel": "https://vimeo.com/123456789"
}
```

### Examples of Invalid URLs

```json
{
  "website": "ftp://example.com",  // ❌ Invalid protocol
  "instagram": "myhandle",  // ❌ Not a URL
  "imdb": "http://",  // ❌ Incomplete URL
  "tiktok": "https://tiktok.com/@user"  // ❌ Unsupported key
}
```

---

## Integration with Frontend

### Fetching Profile Data

```javascript
// Fetch user profile
const response = await fetch(`/profiles/${userId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

const { profile } = await response.json()
```

### Updating Profile

```javascript
// Update profile with validation
const updateProfile = async (userId, updates) => {
  const response = await fetch(`/profiles/${userId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  })
  
  if (!response.ok) {
    const { error } = await response.json()
    throw new Error(error.message)
  }
  
  return response.json()
}

// Example usage
try {
  await updateProfile('user_123', {
    title: 'Senior Voice Actor',
    socialLinks: {
      website: 'https://mysite.com',
      imdb: 'https://imdb.com/name/nm1234567'
    }
  })
} catch (error) {
  console.error('Profile update failed:', error.message)
}
```

### Removing Social Links

To remove a social link, set it to `null` or empty string:

```javascript
await updateProfile('user_123', {
  socialLinks: {
    website: null,  // Removes website link
    instagram: ''   // Also removes instagram link
  }
})
```

---

## Database Schema

### Profile Table

```sql
ALTER TABLE "profiles" ADD COLUMN "title" TEXT;
```

**Migration:** `20251105005100_add_profile_title`

**Field Details:**
- `title`: Professional title or designation (nullable)
- `headline`: Professional headline (nullable, max 200 chars recommended)
- `socialLinks`: JSON object with platform-specific URLs (nullable)

### socialLinks JSON Structure

```typescript
interface SocialLinks {
  website?: string;
  instagram?: string;
  imdb?: string;
  linkedin?: string;
  showreel?: string;
}
```

---

## Security Considerations

### URL Validation

All URLs are validated to ensure:
1. Valid URL format
2. Only HTTP/HTTPS protocols
3. Reasonable length limits
4. No XSS vectors

### Input Sanitization

All string inputs are sanitized:
- Trimmed of leading/trailing whitespace
- Length validation enforced
- Special characters handled safely

### Recommendations

1. **Rate Limiting**: Add rate limits to prevent abuse
2. **Authentication**: Verify user owns profile before updates
3. **Content Policy**: Consider adding content moderation for links
4. **Analytics**: Track link clicks for user insights

---

## Testing

### Manual Testing with curl

**Test GET:**
```bash
curl -X GET http://localhost:5000/profiles/user_123
```

**Test PATCH with valid data:**
```bash
curl -X PATCH http://localhost:5000/profiles/user_123 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Voice Actor",
    "socialLinks": {
      "website": "https://example.com"
    }
  }'
```

**Test PATCH with invalid URL (should return 400):**
```bash
curl -X PATCH http://localhost:5000/profiles/user_123 \
  -H "Content-Type: application/json" \
  -d '{
    "socialLinks": {
      "website": "ftp://example.com"
    }
  }'
```

**Test PATCH with invalid key (should return 400):**
```bash
curl -X PATCH http://localhost:5000/profiles/user_123 \
  -H "Content-Type: application/json" \
  -d '{
    "socialLinks": {
      "twitter": "https://twitter.com/user"
    }
  }'
```

### Contract Tests

Contract tests are located in `server/src/routes/__tests__/profiles.test.js`

Run tests:
```bash
cd server
npm test -- profiles.test.js
```

---

## Rollback Plan

See [migration rollback documentation](../../api/prisma/migrations/20251105005100_add_profile_title/ROLLBACK.md) for detailed rollback steps.

**Quick rollback:**
```sql
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "title";
```

**Note:** The `socialLinks` field already exists and should not be removed during rollback.

---

## Coordination with Frontend

### Frontend Requirements

The frontend should:
1. Display profile title and headline
2. Show social link icons/buttons
3. Provide edit UI for title, headline, and links
4. Validate URLs client-side before submission
5. Handle error responses gracefully
6. Show loading states during updates

### Sequencing

1. **Backend (this PR)**: Deploy profile endpoints with validation
2. **Frontend PR**: Implement UI for editing profile fields
3. **Testing**: Verify end-to-end profile editing flow
4. **Release**: Deploy together or backend-first (safe)

---

## Future Enhancements

Potential future improvements:
1. Add more social platforms (TikTok, YouTube, etc.)
2. Link verification (check if URL is accessible)
3. Link preview generation
4. Click tracking and analytics
5. Custom link ordering
6. Link privacy settings (public/private per link)
