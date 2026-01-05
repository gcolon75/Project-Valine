# Profile & Settings API Documentation

This document details the new API endpoints for profile management, media handling, settings, and privacy controls in Project Valine.

## Base URL

```
https://your-api-gateway-url.amazonaws.com/{stage}
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Table of Contents

1. [Profile Endpoints](#profile-endpoints)
2. [Media Endpoints](#media-endpoints)
3. [Credits Endpoints](#credits-endpoints)
4. [Settings Endpoints](#settings-endpoints)
5. [Reel Request Endpoints](#reel-request-endpoints)
6. [Search Endpoints](#search-endpoints)

---

## Profile Endpoints

### Get Profile by Vanity URL

**GET** `/profiles/{vanityUrl}`

Get a public profile by its vanity URL. Privacy filtering is applied.

**Path Parameters:**
- `vanityUrl` (string, required) - The vanity URL of the profile

**Query Parameters:** None

**Response:**
```json
{
  "id": "uuid",
  "vanityUrl": "johndoe",
  "headline": "Actor & Director",
  "bio": "Professional actor with 10+ years experience",
  "roles": ["Actor", "Director"],
  "location": {
    "city": "Los Angeles",
    "state": "CA",
    "country": "USA"
  },
  "tags": ["action", "drama", "voice-acting"],
  "socialLinks": {
    "website": "https://example.com",
    "instagram": "johndoe",
    "imdb": "nm1234567"
  },
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "displayName": "John Doe",
    "avatar": "https://...",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "media": [...],
  "credits": [...],
  "counts": {
    "media": 10,
    "credits": 25
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T00:00:00Z"
}
```

### Get Profile by ID

**GET** `/profiles/id/{id}`

Get full profile details by ID (owner only).

**Auth Required:** Yes

**Path Parameters:**
- `id` (string, required) - The profile ID

**Response:** Same as vanity URL endpoint but includes all private fields.

### Create Profile

**POST** `/profiles`

Create a new profile for the authenticated user.

**Auth Required:** Yes

**Request Body:**
```json
{
  "vanityUrl": "johndoe",
  "headline": "Actor & Director",
  "bio": "Professional actor with 10+ years experience",
  "roles": ["Actor", "Director"],
  "location": {
    "city": "Los Angeles",
    "state": "CA",
    "country": "USA"
  },
  "tags": ["action", "drama"],
  "socialLinks": {
    "website": "https://example.com"
  }
}
```

**Response:** Profile object (201 Created)

### Update Profile

**PUT** `/profiles/id/{id}`

Update profile (owner only).

**Auth Required:** Yes

**Path Parameters:**
- `id` (string, required) - The profile ID

**Request Body:** Same fields as create, all optional.

**Response:** Updated profile object

### Delete Profile

**DELETE** `/profiles/id/{id}`

Delete profile (owner only). Cascades to media and credits.

**Auth Required:** Yes

**Path Parameters:**
- `id` (string, required) - The profile ID

**Response:**
```json
{
  "message": "Profile deleted successfully"
}
```

---

## Media Endpoints

### Get Upload URL

**POST** `/profiles/{id}/media/upload-url`

Generate a signed S3 upload URL and create placeholder media record.

**Auth Required:** Yes

**Path Parameters:**
- `id` (string, required) - The profile ID

**Request Body:**
```json
{
  "type": "video",
  "title": "Demo Reel 2024",
  "description": "My latest work",
  "privacy": "public",
  "contentType": "video/mp4"
}
```

**Fields:**
- `type` (string, required) - One of: "image", "video", "pdf"
- `title` (string, optional)
- `description` (string, optional)
- `privacy` (string, optional) - One of: "public", "on-request", "private" (default: "public")
- `contentType` (string, optional) - MIME type of the file. If not provided, defaults are: "image/jpeg" for images, "video/mp4" for videos, "application/pdf" for PDFs. When provided, must be one of: "image/jpeg", "image/png", "image/webp", "video/mp4", "application/pdf"

**Response:**
```json
{
  "mediaId": "uuid",
  "uploadUrl": "https://s3.amazonaws.com/...",
  "s3Key": "profiles/uuid/media/timestamp-uuid",
  "message": "Upload your file to the provided URL, then call /complete endpoint"
}
```

**Usage:**
1. Call this endpoint to get upload URL
2. Upload file directly to S3 using the provided URL (PUT request with matching Content-Type header)
3. Call the complete endpoint with the mediaId

**Important:** The `Content-Type` header used when uploading to S3 must match the `contentType` specified in the request (or the default if not specified). Mismatches will result in a 403 Forbidden error from S3.

### Complete Upload

**POST** `/profiles/{id}/media/complete`

Mark upload as complete and trigger processing.

**Auth Required:** Yes

**Path Parameters:**
- `id` (string, required) - The profile ID

**Request Body:**
```json
{
  "mediaId": "uuid",
  "width": 1920,
  "height": 1080,
  "fileSize": 1048576
}
```

**Response:**
```json
{
  "media": { ... },
  "message": "Upload marked as complete, processing started"
}
```

### Update Media

**PUT** `/media/{id}`

Update media metadata and privacy settings.

**Auth Required:** Yes

**Path Parameters:**
- `id` (string, required) - The media ID

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "privacy": "on-request"
}
```

**Response:** Updated media object

### Delete Media

**DELETE** `/media/{id}`

Delete media (owner only).

**Auth Required:** Yes

**Path Parameters:**
- `id` (string, required) - The media ID

**Response:**
```json
{
  "message": "Media deleted successfully"
}
```

### Get Access URL

**GET** `/media/{id}/access-url`

Get signed viewing URL with privacy checks.

**Auth Required:** Optional (required for on-request and private media)

**Path Parameters:**
- `id` (string, required) - The media ID

**Response:**
```json
{
  "viewUrl": "https://s3.amazonaws.com/...",
  "posterUrl": "https://s3.amazonaws.com/...",
  "expiresIn": 3600
}
```

**Privacy Rules:**
- Public media: Anyone can access
- On-request media: Requires approved request
- Private media: Owner only

---

## Credits Endpoints

### List Credits

**GET** `/profiles/{id}/credits`

List all credits for a profile.

**Path Parameters:**
- `id` (string, required) - The profile ID

**Response:**
```json
[
  {
    "id": "uuid",
    "profileId": "uuid",
    "title": "The Great Movie",
    "role": "Lead Actor",
    "company": "Big Studio",
    "year": 2024,
    "description": "Role description",
    "orderIndex": 0,
    "metadata": {},
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

### Create Credit

**POST** `/profiles/{id}/credits`

Add a new credit to profile (owner only).

**Auth Required:** Yes

**Path Parameters:**
- `id` (string, required) - The profile ID

**Request Body:**
```json
{
  "title": "The Great Movie",
  "role": "Lead Actor",
  "company": "Big Studio",
  "year": 2024,
  "description": "Role description",
  "orderIndex": 0,
  "metadata": {
    "genre": "Action",
    "awards": ["Best Actor"]
  }
}
```

**Fields:**
- `title` (string, required)
- `role` (string, required)
- `company` (string, optional)
- `year` (number, optional)
- `description` (string, optional)
- `orderIndex` (number, optional, default: 0)
- `metadata` (object, optional)

**Response:** Credit object (201 Created)

### Update Credit

**PUT** `/credits/{id}`

Update credit (owner only).

**Auth Required:** Yes

**Path Parameters:**
- `id` (string, required) - The credit ID

**Request Body:** Same fields as create, all optional

**Response:** Updated credit object

### Delete Credit

**DELETE** `/credits/{id}`

Delete credit (owner only).

**Auth Required:** Yes

**Path Parameters:**
- `id` (string, required) - The credit ID

**Response:**
```json
{
  "message": "Credit deleted successfully"
}
```

---

## Settings Endpoints

### Get Settings

**GET** `/settings`

Get user settings (authenticated).

**Auth Required:** Yes

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "notifications": {
    "email": true,
    "push": true,
    "reelRequests": true,
    "messages": true,
    "comments": true,
    "likes": true
  },
  "accountSecurity": {
    "twoFactorEnabled": false,
    "loginNotifications": true
  },
  "privacy": {
    "showActivity": true,
    "allowMessagesFrom": "everyone",
    "showOnlineStatus": true
  },
  "billing": null,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T00:00:00Z"
}
```

### Update Settings

**PUT** `/settings`

Update user settings (authenticated).

**Auth Required:** Yes

**Request Body:**
```json
{
  "notifications": {
    "email": false,
    "push": true
  },
  "privacy": {
    "allowMessagesFrom": "connections"
  }
}
```

**Response:** Updated settings object

### Export Account Data

**POST** `/account/export`

Generate account data export (GDPR compliance).

**Auth Required:** Yes

**Response:**
```json
{
  "user": { ... },
  "profile": { ... },
  "settings": { ... },
  "posts": [ ... ],
  "reels": [ ... ],
  "comments": [ ... ],
  "likes": [ ... ],
  "bookmarks": [ ... ],
  "connectionRequests": {
    "sent": [ ... ],
    "received": [ ... ]
  },
  "messages": [ ... ],
  "conversations": [ ... ],
  "notifications": [ ... ],
  "reelRequests": {
    "sent": [ ... ],
    "received": [ ... ]
  },
  "exportedAt": "2024-01-15T00:00:00Z"
}
```

### Delete Account

**DELETE** `/account`

Delete account (GDPR compliance).

**Auth Required:** Yes

**Request Body:**
```json
{
  "confirmPassword": "password123"
}
```

**Response:**
```json
{
  "message": "Account deleted successfully",
  "deletedAt": "2024-01-15T00:00:00Z"
}
```

---

## Reel Request Endpoints

### Create Reel Request

**POST** `/reels/{id}/request`

Request access to on-request media.

**Auth Required:** Yes

**Path Parameters:**
- `id` (string, required) - The media ID

**Request Body:**
```json
{
  "message": "I would love to see your work!"
}
```

**Response:**
```json
{
  "id": "uuid",
  "mediaId": "uuid",
  "requesterId": "uuid",
  "ownerId": "uuid",
  "status": "pending",
  "message": "I would love to see your work!",
  "requester": {
    "id": "uuid",
    "username": "viewer",
    "displayName": "Viewer Name",
    "avatar": "https://..."
  },
  "media": {
    "id": "uuid",
    "type": "video",
    "title": "Demo Reel",
    "posterS3Key": "..."
  },
  "createdAt": "2024-01-15T00:00:00Z",
  "updatedAt": "2024-01-15T00:00:00Z"
}
```

### List Reel Requests

**GET** `/reel-requests`

List reel requests (received or sent).

**Auth Required:** Yes

**Query Parameters:**
- `type` (string, optional) - "received" (default) or "sent"
- `status` (string, optional) - "pending", "approved", or "denied"

**Response:**
```json
[
  {
    "id": "uuid",
    "mediaId": "uuid",
    "requesterId": "uuid",
    "ownerId": "uuid",
    "status": "pending",
    "message": "Request message",
    "response": null,
    "requester": { ... },
    "owner": { ... },
    "media": { ... },
    "createdAt": "2024-01-15T00:00:00Z",
    "updatedAt": "2024-01-15T00:00:00Z"
  }
]
```

### Approve Reel Request

**POST** `/reel-requests/{id}/approve`

Approve a reel request (owner only).

**Auth Required:** Yes

**Path Parameters:**
- `id` (string, required) - The request ID

**Request Body:**
```json
{
  "response": "Thanks for your interest!"
}
```

**Response:** Updated request object with status "approved"

### Deny Reel Request

**POST** `/reel-requests/{id}/deny`

Deny a reel request (owner only).

**Auth Required:** Yes

**Path Parameters:**
- `id` (string, required) - The request ID

**Request Body:**
```json
{
  "response": "Sorry, not at this time."
}
```

**Response:** Updated request object with status "denied"

---

## Search Endpoints

### Search Profiles

**GET** `/search`

Search profiles by name, role, tags, or location.

**Query Parameters:**
- `query` (string, optional) - Text search in name, bio, tags
- `role` (string, optional) - Filter by role
- `location` (string, optional) - Filter by location
- `limit` (number, optional, default: 20) - Results per page
- `cursor` (string, optional) - Pagination cursor

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "vanityUrl": "johndoe",
      "headline": "Actor & Director",
      "bio": "...",
      "roles": ["Actor", "Director"],
      "location": { ... },
      "tags": [ ... ],
      "user": { ... },
      "counts": {
        "media": 10,
        "credits": 25
      }
    }
  ],
  "nextCursor": "uuid",
  "hasMore": true,
  "query": {
    "query": "actor",
    "role": null,
    "location": null
  }
}
```

### Search Users

**GET** `/search/users`

Search users by username or display name.

**Query Parameters:**
- `query` (string, required) - Search query
- `limit` (number, optional, default: 20)
- `cursor` (string, optional)

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "username": "johndoe",
      "displayName": "John Doe",
      "avatar": "https://...",
      "bio": "...",
      "role": "artist",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "nextCursor": "uuid",
  "hasMore": false
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message"
}
```

**Common Status Codes:**
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Server Error

---

## Testing Examples

### Create a Profile

```bash
curl -X POST https://api-url/profiles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vanityUrl": "johndoe",
    "headline": "Actor & Director",
    "roles": ["Actor", "Director"],
    "location": {"city": "Los Angeles", "state": "CA"}
  }'
```

### Upload Media

```bash
# Step 1: Get upload URL
RESPONSE=$(curl -X POST https://api-url/profiles/$PROFILE_ID/media/upload-url \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "video", "title": "Demo Reel"}')

UPLOAD_URL=$(echo $RESPONSE | jq -r '.uploadUrl')
MEDIA_ID=$(echo $RESPONSE | jq -r '.mediaId')

# Step 2: Upload file to S3
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: video/mp4" \
  --upload-file my-video.mp4

# Step 3: Mark upload complete
curl -X POST https://api-url/profiles/$PROFILE_ID/media/complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"mediaId\": \"$MEDIA_ID\", \"width\": 1920, \"height\": 1080}"
```

### Request Access to On-Request Media

```bash
curl -X POST https://api-url/reels/$MEDIA_ID/request \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Would love to see your work!"}'
```

### Search Profiles

```bash
curl "https://api-url/search?query=actor&role=Actor&limit=10"
```

---

## Privacy Model

### Profile Privacy Levels

1. **Public** - Visible to everyone
2. **Network** - Visible to connections only
3. **Private** - Not visible in search, requires direct link

### Media Privacy Levels

1. **Public** - Anyone can view
2. **On-Request** - Requires approved request
3. **Private** - Owner only

### Access Control Flow

```
User → Request → Notification → Owner → Approve/Deny → Access Granted/Denied
```

---

## Database Migrations

Before deploying, run migrations:

```bash
cd api
npx prisma migrate dev --name add_profile_settings_models
npx prisma generate
```

In production:

```bash
npx prisma migrate deploy
```

---

## S3 Configuration

Required S3 bucket setup:

1. Create bucket: `valine-media-uploads`
2. Enable versioning
3. Configure CORS:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["PUT", "POST", "GET"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
```

4. Set bucket policy for Lambda access
5. Configure CloudFront distribution for media delivery

---

## Environment Variables

Required environment variables:

```
DATABASE_URL=postgresql://...
MEDIA_BUCKET=valine-media-uploads
AWS_REGION=us-west-2
```

---

## Next Steps

1. Run database migrations
2. Configure S3 bucket
3. Set up CloudFront distribution
4. Implement background processing for video transcoding
5. Add rate limiting for request endpoints
6. Implement search indexing (Elasticsearch/OpenSearch)
7. Add audit logging for private media access
