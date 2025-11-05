# Profile Links API Documentation

## Overview

The Profile Links API provides endpoints for managing user profile links in a normalized table structure. This replaces the previous JSON-based `socialLinks` field with a proper relational database structure for better querying, analytics, and management.

## Features

- **Normalized Storage**: Links are stored in a dedicated `profile_links` table
- **Type Safety**: Links are categorized by type (website, IMDB, showreel, other)
- **Validation**: Strict validation for URLs, labels, and link types
- **CRUD Operations**: Full create, read, update, and delete operations
- **Batch Updates**: Update multiple links in a single request via profile endpoint
- **Link Limits**: Maximum 20 links per profile to prevent abuse

## Endpoints

### 1. Get User Profile (with links)

Retrieve a user's profile including all profile links.

```http
GET /profiles/:userId
```

**Path Parameters:**
- `userId` (string, required): The unique identifier of the user

**Response (200 OK):**
```json
{
  "profile": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user_123",
    "vanityUrl": "johndoe",
    "headline": "Voice Actor - Classical & Contemporary",
    "title": "Senior Voice Actor",
    "bio": "Experienced voice actor...",
    "links": [
      {
        "id": "link_1",
        "userId": "user_123",
        "profileId": "profile_1",
        "label": "My Website",
        "url": "https://example.com",
        "type": "website",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
      },
      {
        "id": "link_2",
        "userId": "user_123",
        "profileId": "profile_1",
        "label": "IMDB Profile",
        "url": "https://imdb.com/name/nm1234567",
        "type": "imdb",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

**Error Responses:**
- `404 Not Found`: Profile not found
- `500 Internal Server Error`: Database error

---

### 2. Update User Profile (with links)

Update user profile fields including title, headline, and profile links.

```http
PATCH /profiles/:userId
```

**Path Parameters:**
- `userId` (string, required): The unique identifier of the user

**Request Body:**
```json
{
  "title": "Senior Voice Actor",
  "headline": "Award-winning voice actor",
  "links": [
    {
      "label": "My Website",
      "url": "https://example.com",
      "type": "website"
    },
    {
      "id": "existing_link_id",
      "label": "Updated IMDB",
      "url": "https://imdb.com/name/nm1234567",
      "type": "imdb"
    }
  ]
}
```

**Request Fields:**
- `title` (string, optional): Professional title (max 100 characters)
- `headline` (string, optional): Profile headline (max 200 characters)
- `links` (array, optional): Array of profile link objects
  - `id` (string, optional): Existing link ID for updates
  - `label` (string, required): Display label (1-40 characters)
  - `url` (string, required): URL (must be http/https, max 2048 characters)
  - `type` (string, required): Link type (website, imdb, showreel, other)

**Behavior:**
- Links with `id`: Updates existing link
- Links without `id`: Creates new link
- Existing links not in array: Deleted
- Maximum 20 links per profile

**Response (200 OK):**
```json
{
  "success": true,
  "profile": {
    "id": "profile_1",
    "userId": "user_123",
    "title": "Senior Voice Actor",
    "headline": "Award-winning voice actor",
    "links": [...]
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `404 Not Found`: Profile not found
- `500 Internal Server Error`: Database error

---

### 3. List Profile Links

Get all profile links for a user.

```http
GET /profiles/:userId/links
```

**Path Parameters:**
- `userId` (string, required): The unique identifier of the user

**Response (200 OK):**
```json
{
  "links": [
    {
      "id": "link_1",
      "userId": "user_123",
      "profileId": "profile_1",
      "label": "My Website",
      "url": "https://example.com",
      "type": "website",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `404 Not Found`: Profile not found
- `500 Internal Server Error`: Database error

---

### 4. Create Profile Link

Create a new profile link.

```http
POST /profiles/:userId/links
```

**Path Parameters:**
- `userId` (string, required): The unique identifier of the user

**Request Body:**
```json
{
  "label": "My Website",
  "url": "https://example.com",
  "type": "website"
}
```

**Request Fields:**
- `label` (string, required): Display label (1-40 characters)
- `url` (string, required): URL (must be http/https, max 2048 characters)
- `type` (string, required): Link type (website, imdb, showreel, other)

**Response (201 Created):**
```json
{
  "success": true,
  "link": {
    "id": "link_1",
    "userId": "user_123",
    "profileId": "profile_1",
    "label": "My Website",
    "url": "https://example.com",
    "type": "website",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error or max links exceeded
- `404 Not Found`: Profile not found
- `500 Internal Server Error`: Database error

---

### 5. Update Profile Link

Update an existing profile link.

```http
PATCH /profiles/:userId/links/:linkId
```

**Path Parameters:**
- `userId` (string, required): The unique identifier of the user
- `linkId` (string, required): The unique identifier of the link

**Request Body:**
```json
{
  "label": "Updated Label",
  "url": "https://newurl.com",
  "type": "showreel"
}
```

**Request Fields (all optional, at least one required):**
- `label` (string): Display label (1-40 characters)
- `url` (string): URL (must be http/https, max 2048 characters)
- `type` (string): Link type (website, imdb, showreel, other)

**Response (200 OK):**
```json
{
  "success": true,
  "link": {
    "id": "link_1",
    "userId": "user_123",
    "profileId": "profile_1",
    "label": "Updated Label",
    "url": "https://newurl.com",
    "type": "showreel",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-02T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error or no fields provided
- `404 Not Found`: Link not found or doesn't belong to user
- `500 Internal Server Error`: Database error

---

### 6. Delete Profile Link

Delete a profile link.

```http
DELETE /profiles/:userId/links/:linkId
```

**Path Parameters:**
- `userId` (string, required): The unique identifier of the user
- `linkId` (string, required): The unique identifier of the link

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Link deleted successfully"
}
```

**Error Responses:**
- `404 Not Found`: Link not found or doesn't belong to user
- `500 Internal Server Error`: Database error

---

## Validation Rules

### Label
- **Required**: Yes
- **Min Length**: 1 character
- **Max Length**: 40 characters
- **Sanitization**: Trimmed of leading/trailing whitespace

### URL
- **Required**: Yes
- **Format**: Valid URL
- **Protocol**: Must be `http://` or `https://`
- **Max Length**: 2048 characters
- **Examples**:
  - ✅ `https://example.com`
  - ✅ `http://example.com/path?query=value`
  - ❌ `ftp://example.com` (invalid protocol)
  - ❌ `example.com` (missing protocol)
  - ❌ `not-a-url` (invalid format)

### Type
- **Required**: Yes
- **Valid Values**: `website`, `imdb`, `showreel`, `other`
- **Case Sensitive**: Yes (lowercase only)

### Link Limit
- **Maximum**: 20 links per profile
- **Reason**: Prevent abuse and maintain performance

---

## Error Response Format

All error responses follow a standardized format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "fieldName",
      "additionalInfo": "..."
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `PROFILE_NOT_FOUND` | 404 | Profile does not exist |
| `LINK_NOT_FOUND` | 404 | Link does not exist or doesn't belong to user |
| `INVALID_LINK` | 400 | Link validation failed |
| `INVALID_LINKS` | 400 | Links array validation failed |
| `INVALID_LABEL` | 400 | Label validation failed |
| `INVALID_URL` | 400 | URL validation failed |
| `INVALID_TYPE` | 400 | Link type validation failed |
| `TOO_MANY_LINKS` | 400 | Maximum link limit exceeded |
| `NO_UPDATES` | 400 | No valid fields provided for update |
| `DATABASE_ERROR` | 500 | Database operation failed |

---

## Examples

### Example 1: Create a Complete Profile with Links

```javascript
const response = await fetch('/profiles/user_123', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Senior Voice Actor',
    headline: 'Award-winning voice actor specializing in animation',
    links: [
      {
        label: 'Personal Website',
        url: 'https://johndoe.com',
        type: 'website'
      },
      {
        label: 'IMDB Profile',
        url: 'https://imdb.com/name/nm1234567',
        type: 'imdb'
      },
      {
        label: 'Voice Reel',
        url: 'https://vimeo.com/123456789',
        type: 'showreel'
      }
    ]
  })
});

const data = await response.json();
```

### Example 2: Add a Single Link

```javascript
const response = await fetch('/profiles/user_123/links', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    label: 'LinkedIn Profile',
    url: 'https://linkedin.com/in/johndoe',
    type: 'other'
  })
});

const data = await response.json();
```

### Example 3: Update a Link

```javascript
const response = await fetch('/profiles/user_123/links/link_456', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    label: 'Updated Website',
    url: 'https://newsite.com'
  })
});

const data = await response.json();
```

### Example 4: Delete a Link

```javascript
const response = await fetch('/profiles/user_123/links/link_456', {
  method: 'DELETE'
});

const data = await response.json();
```

---

## Migration Guide

### From JSON socialLinks to Normalized Links

If you previously used the `socialLinks` JSON field, here's how to migrate:

**Old Format (JSON):**
```json
{
  "socialLinks": {
    "website": "https://example.com",
    "instagram": "https://instagram.com/user",
    "imdb": "https://imdb.com/name/nm123"
  }
}
```

**New Format (Normalized):**
```json
{
  "links": [
    {
      "label": "Website",
      "url": "https://example.com",
      "type": "website"
    },
    {
      "label": "Instagram",
      "url": "https://instagram.com/user",
      "type": "other"
    },
    {
      "label": "IMDB",
      "url": "https://imdb.com/name/nm123",
      "type": "imdb"
    }
  ]
}
```

**Benefits of Migration:**
- Better querying and analytics
- Support for multiple links of the same type
- Custom labels for each link
- Individual link management (update/delete specific links)
- Audit trail (created/updated timestamps)

---

## Database Schema

### Table: profile_links

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | Primary key |
| userId | UUID | No | Foreign key to users.id |
| profileId | UUID | No | Foreign key to profiles.id |
| label | TEXT | No | Display label (1-40 chars) |
| url | TEXT | No | Link URL |
| type | TEXT | No | Link type enum |
| createdAt | TIMESTAMP | No | Creation timestamp |
| updatedAt | TIMESTAMP | No | Last update timestamp |

**Indexes:**
- `profile_links_userId_idx` on `userId`
- `profile_links_profileId_idx` on `profileId`

**Foreign Keys:**
- `userId` → `users.id` (CASCADE DELETE)
- `profileId` → `profiles.id` (CASCADE DELETE)

---

## Best Practices

1. **Validation**: Always validate URLs and labels on the client side before submission
2. **Link Types**: Use appropriate types for better categorization
3. **Labels**: Use descriptive labels that make sense to users
4. **Batch Updates**: Use the profile PATCH endpoint for bulk link updates
5. **Error Handling**: Always check for and handle error responses
6. **Rate Limiting**: Implement rate limiting for link creation to prevent abuse
7. **Link Limits**: Inform users of the 20-link limit
8. **URL Normalization**: Consider normalizing URLs (e.g., removing trailing slashes)

---

## Support

For questions or issues with the Profile Links API, please:
1. Check this documentation
2. Review the validation rules
3. Test with the provided examples
4. Contact the backend team

**Last Updated**: 2025-11-05
**Version**: 1.0.0
