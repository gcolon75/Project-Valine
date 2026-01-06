# Project Valine - API Reference

**Version:** 1.0  
**Last Updated:** 2026-01-05  
**Base URL (Production):** https://wkndtj22ab.execute-api.us-west-2.amazonaws.com

---

## Table of Contents

1. [Authentication](#authentication)
2. [Auth Endpoints](#auth-endpoints)
3. [User Endpoints](#user-endpoints)
4. [Post Endpoints](#post-endpoints)
5. [Media Endpoints](#media-endpoints)
6. [Social Endpoints](#social-endpoints)
7. [Search Endpoints](#search-endpoints)
8. [Error Codes](#error-codes)
9. [Rate Limiting](#rate-limiting)

---

## Authentication

All API requests (except login/signup) require a valid JWT token passed via HttpOnly cookie.

**Cookie Name:** `jwt_token`  
**Token Type:** HS256 signed JWT  
**Expiry:** 7 days  
**Refresh:** Not supported (user must re-login after expiry)

**Example Authenticated Request:**
```powershell
# Cookie is automatically sent by browser
# For manual testing with curl/Invoke-WebRequest:
Invoke-WebRequest -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/users/me" `
  -Headers @{Cookie="jwt_token=<token>"} `
  -Method GET
```

---

## Auth Endpoints

### POST /auth/signup

**Description:** Register a new user account

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "johndoe",
  "displayName": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "normalizedEmail": "user@example.com",
    "username": "johndoe",
    "displayName": "John Doe",
    "emailVerified": false,
    "createdAt": "2026-01-05T23:00:00.000Z"
  }
}
```

**Errors:**
- `400 Bad Request` - Invalid email format, weak password, or username taken
- `409 Conflict` - Email already registered
- `403 Forbidden` - Email not on allowlist (if owner-only mode enabled)

**PowerShell Example:**
```powershell
$body = @{
  email = "user@example.com"
  password = "SecurePass123!"
  username = "johndoe"
  displayName = "John Doe"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/auth/signup" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

---

### POST /auth/login

**Description:** Authenticate user and receive JWT token

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe",
    "displayName": "John Doe",
    "avatarUrl": "https://valine-media-uploads.s3.amazonaws.com/avatars/...",
    "theme": "dark"
  }
}
```

**Set-Cookie Header:**
```
jwt_token=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Errors:**
- `401 Unauthorized` - Invalid email or password
- `403 Forbidden` - Account disabled or not verified (if verification required)

**PowerShell Example:**
```powershell
$body = @{
  email = "user@example.com"
  password = "SecurePass123!"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body `
  -SessionVariable session

# Session variable stores cookies for subsequent requests
```

---

### POST /auth/logout

**Description:** Invalidate JWT token and clear cookie

**Request:** No body required (authenticated)

**Response (200 OK):**
```json
{
  "message": "Logout successful"
}
```

**PowerShell Example:**
```powershell
Invoke-WebRequest -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/auth/logout" `
  -Method POST `
  -WebSession $session
```

---

### POST /auth/verify-email

**Description:** Verify user email address with token

**Request Body:**
```json
{
  "token": "abc123def456"
}
```

**Response (200 OK):**
```json
{
  "message": "Email verified successfully"
}
```

**Errors:**
- `400 Bad Request` - Invalid or expired token
- `404 Not Found` - Token not found

---

### POST /auth/forgot-password

**Description:** Request password reset email

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset email sent"
}
```

**Note:** Always returns 200 to prevent email enumeration attacks

---

### POST /auth/reset-password

**Description:** Reset password with token from email

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePass456!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset successful"
}
```

**Errors:**
- `400 Bad Request` - Invalid token or weak password
- `404 Not Found` - Token not found or expired (1 hour expiry)

---

## User Endpoints

### GET /users/me

**Description:** Get current authenticated user profile

**Request:** No body (authenticated)

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "username": "johndoe",
  "displayName": "John Doe",
  "bio": "Voice actor and creative professional",
  "title": "Senior Voice Actor",
  "location": "Los Angeles, CA",
  "avatarUrl": "https://valine-media-uploads.s3.amazonaws.com/avatars/...",
  "bannerUrl": "https://valine-media-uploads.s3.amazonaws.com/banners/...",
  "theme": "dark",
  "emailVerified": true,
  "isOnboarded": true,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-05T23:00:00.000Z"
}
```

**PowerShell Example:**
```powershell
Invoke-WebRequest -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/users/me" `
  -Method GET `
  -WebSession $session | Select -ExpandProperty Content | ConvertFrom-Json
```

---

### PATCH /users/me

**Description:** Update current user profile

**Request Body (partial update):**
```json
{
  "displayName": "John 'The Voice' Doe",
  "bio": "Award-winning voice actor specializing in animation and video games",
  "title": "Lead Voice Actor",
  "location": "Los Angeles, CA",
  "theme": "light"
}
```

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "displayName": "John 'The Voice' Doe",
    "bio": "Award-winning voice actor specializing in animation and video games",
    "title": "Lead Voice Actor",
    "location": "Los Angeles, CA",
    "theme": "light",
    "updatedAt": "2026-01-05T23:30:00.000Z"
  }
}
```

**Errors:**
- `400 Bad Request` - Invalid field values (e.g., bio too long)
- `401 Unauthorized` - Not authenticated

**PowerShell Example:**
```powershell
$body = @{
  displayName = "John 'The Voice' Doe"
  bio = "Award-winning voice actor"
  theme = "light"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/users/me" `
  -Method PATCH `
  -ContentType "application/json" `
  -Body $body `
  -WebSession $session
```

---

### GET /users/:username

**Description:** Get public user profile by username

**Request:** No body (public endpoint, no auth required)

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "johndoe",
  "displayName": "John Doe",
  "bio": "Voice actor and creative professional",
  "title": "Senior Voice Actor",
  "location": "Los Angeles, CA",
  "avatarUrl": "https://valine-media-uploads.s3.amazonaws.com/avatars/...",
  "bannerUrl": "https://valine-media-uploads.s3.amazonaws.com/banners/...",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "followerCount": 142,
  "followingCount": 89,
  "postCount": 37
}
```

**Note:** Email and sensitive fields are excluded from public profiles

**Errors:**
- `404 Not Found` - Username does not exist

**PowerShell Example:**
```powershell
Invoke-WebRequest -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/users/johndoe" `
  -Method GET | Select -ExpandProperty Content | ConvertFrom-Json
```

---

### GET /users/:username/posts

**Description:** Get posts by a specific user

**Query Parameters:**
- `limit` (optional): Number of posts to return (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "posts": [
    {
      "id": "post-uuid-1",
      "authorId": "550e8400-e29b-41d4-a716-446655440000",
      "content": "Just finished recording for a new game!",
      "mediaUrls": ["https://valine-media-uploads.s3.amazonaws.com/posts/..."],
      "visibility": "public",
      "createdAt": "2026-01-05T20:00:00.000Z",
      "likeCount": 42,
      "commentCount": 7
    }
  ],
  "total": 37,
  "limit": 20,
  "offset": 0
}
```

**PowerShell Example:**
```powershell
Invoke-WebRequest -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/users/johndoe/posts?limit=10" `
  -Method GET | Select -ExpandProperty Content | ConvertFrom-Json
```

---

## Post Endpoints

### POST /posts

**Description:** Create a new post

**Request Body:**
```json
{
  "content": "Excited to share my latest voice acting reel!",
  "mediaUrls": ["https://valine-media-uploads.s3.amazonaws.com/posts/reel.mp4"],
  "visibility": "public"
}
```

**Response (201 Created):**
```json
{
  "message": "Post created successfully",
  "post": {
    "id": "post-uuid",
    "authorId": "550e8400-e29b-41d4-a716-446655440000",
    "content": "Excited to share my latest voice acting reel!",
    "mediaUrls": ["https://valine-media-uploads.s3.amazonaws.com/posts/reel.mp4"],
    "visibility": "public",
    "createdAt": "2026-01-05T23:45:00.000Z",
    "likeCount": 0,
    "commentCount": 0
  }
}
```

**Errors:**
- `400 Bad Request` - Invalid content (empty, too long, etc.)
- `401 Unauthorized` - Not authenticated

---

### GET /posts/:postId

**Description:** Get a specific post by ID

**Response (200 OK):**
```json
{
  "id": "post-uuid",
  "authorId": "550e8400-e29b-41d4-a716-446655440000",
  "author": {
    "username": "johndoe",
    "displayName": "John Doe",
    "avatarUrl": "https://..."
  },
  "content": "Excited to share my latest voice acting reel!",
  "mediaUrls": ["https://valine-media-uploads.s3.amazonaws.com/posts/reel.mp4"],
  "visibility": "public",
  "createdAt": "2026-01-05T23:45:00.000Z",
  "likeCount": 15,
  "commentCount": 3,
  "isLikedByCurrentUser": true
}
```

**Errors:**
- `404 Not Found` - Post does not exist
- `403 Forbidden` - Post is private and current user is not authorized

---

### PATCH /posts/:postId

**Description:** Update a post (author only)

**Request Body:**
```json
{
  "content": "Updated: Excited to share my latest voice acting reel!",
  "visibility": "connections"
}
```

**Response (200 OK):**
```json
{
  "message": "Post updated successfully",
  "post": { ... }
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not the post author
- `404 Not Found` - Post does not exist

---

### DELETE /posts/:postId

**Description:** Delete a post (author only)

**Response (200 OK):**
```json
{
  "message": "Post deleted successfully"
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not the post author
- `404 Not Found` - Post does not exist

---

## Media Endpoints

### POST /media/upload

**Description:** Get presigned S3 URL for media upload

**Request Body:**
```json
{
  "fileName": "my-voice-reel.mp3",
  "fileType": "audio/mpeg",
  "fileSize": 5242880
}
```

**Response (200 OK):**
```json
{
  "uploadUrl": "https://valine-media-uploads.s3.amazonaws.com/...",
  "mediaId": "media-uuid",
  "expiresIn": 900
}
```

**Errors:**
- `400 Bad Request` - Invalid file type or size exceeds limit (50 MB)
- `401 Unauthorized` - Not authenticated

**Upload Flow:**
```powershell
# 1. Request presigned URL
$body = @{
  fileName = "reel.mp3"
  fileType = "audio/mpeg"
  fileSize = 5242880
} | ConvertTo-Json

$uploadResponse = Invoke-WebRequest -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/media/upload" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body `
  -WebSession $session | Select -ExpandProperty Content | ConvertFrom-Json

# 2. Upload file to S3 using presigned URL
Invoke-WebRequest -Uri $uploadResponse.uploadUrl `
  -Method PUT `
  -InFile "C:\path\to\reel.mp3" `
  -ContentType "audio/mpeg"

# 3. Confirm upload
$confirmBody = @{
  mediaId = $uploadResponse.mediaId
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/media/confirm" `
  -Method POST `
  -ContentType "application/json" `
  -Body $confirmBody `
  -WebSession $session
```

---

## Social Endpoints

### POST /social/follow/:userId

**Description:** Follow a user

**Response (200 OK):**
```json
{
  "message": "Successfully followed user",
  "follow": {
    "followerId": "550e8400-e29b-41d4-a716-446655440000",
    "followingId": "another-user-uuid",
    "createdAt": "2026-01-05T23:50:00.000Z"
  }
}
```

**Errors:**
- `400 Bad Request` - Already following this user
- `404 Not Found` - User does not exist

---

### DELETE /social/unfollow/:userId

**Description:** Unfollow a user

**Response (200 OK):**
```json
{
  "message": "Successfully unfollowed user"
}
```

---

### GET /social/followers

**Description:** Get current user's followers

**Query Parameters:**
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "followers": [
    {
      "id": "user-uuid",
      "username": "follower1",
      "displayName": "Follower One",
      "avatarUrl": "https://...",
      "followedAt": "2026-01-04T10:00:00.000Z"
    }
  ],
  "total": 142,
  "limit": 20,
  "offset": 0
}
```

---

## Search Endpoints

### GET /search/users

**Description:** Search for users by username or display name

**Query Parameters:**
- `q`: Search query (required)
- `limit` (optional): Number of results (default: 20, max: 100)

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": "user-uuid",
      "username": "johndoe",
      "displayName": "John Doe",
      "avatarUrl": "https://...",
      "title": "Voice Actor"
    }
  ],
  "total": 15,
  "query": "john"
}
```

**PowerShell Example:**
```powershell
$query = [System.Web.HttpUtility]::UrlEncode("john")
Invoke-WebRequest -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/search/users?q=$query" `
  -Method GET | Select -ExpandProperty Content | ConvertFrom-Json
```

---

## Error Codes

| HTTP Code | Meaning | Common Causes |
|-----------|---------|---------------|
| **400** | Bad Request | Invalid input, validation errors |
| **401** | Unauthorized | Missing or invalid JWT token |
| **403** | Forbidden | Insufficient permissions, not on allowlist |
| **404** | Not Found | Resource does not exist |
| **409** | Conflict | Duplicate resource (e.g., email already exists) |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Server-side error, check logs |
| **503** | Service Unavailable | Database connection issues, temporary outage |

**Error Response Format:**
```json
{
  "error": "Bad Request",
  "message": "Email is required",
  "code": "VALIDATION_ERROR"
}
```

---

## Rate Limiting

**API Gateway Limits:**
- **Requests per second:** 10,000 per account
- **Burst capacity:** 5,000 requests

**Per-user limits (enforced by application):**
- **POST /posts:** 100 posts per hour
- **POST /media/upload:** 50 uploads per hour
- **POST /auth/signup:** 5 attempts per IP per hour

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704495600
```

---

## Related Documentation

- **[Project Bible](./PROJECT_BIBLE.md)** - Complete master reference
- **[Architecture](./ARCHITECTURE.md)** - System architecture overview
- **[Deployment Bible](./DEPLOYMENT_BIBLE.md)** - Deployment procedures
- **[Operations](./OPERATIONS.md)** - Ops runbook and monitoring
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and fixes

---

**Last Updated:** 2026-01-05  
**Maintainer:** Project Valine Team  
**Status:** ✅ Current
