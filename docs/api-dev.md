# Project Valine - Dev API Contract Documentation

**Status:** ⚠️ **BLOCKED** - Awaiting dev backend deployment  
**Generated:** 2025-11-04  
**Agent:** Backend Integration Agent - Phase 02B

---

## ⚠️ Important Notice

This documentation is based on the **implemented backend code** (PR #146) but **has not been verified against a live dev environment** because the backend deployment is currently failing.

**Blocker:** Missing `DATABASE_URL` environment variable in GitHub Actions deployment.

**To proceed:**
1. Configure DATABASE_URL in GitHub Secrets
2. Deploy backend via: https://github.com/gcolon75/Project-Valine/actions/workflows/backend-deploy.yml
3. Update this document with live verification results

---

## Base URL

**Expected Dev URL:** `https://{API_ID}.execute-api.us-west-2.amazonaws.com/dev`

**Status:** Not yet deployed

**Production URL:** `https://{API_ID}.execute-api.us-west-2.amazonaws.com/prod`

---

## Authentication

### Auth Scheme
- **Type:** JWT Bearer Token
- **Header:** `Authorization: Bearer {token}`
- **Token Lifetime:** 7 days
- **Algorithm:** HS256

### Obtaining a Token

**Option 1: Register a new user**
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123",
  "username": "johndoe",
  "displayName": "John Doe"
}

Response:
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Option 2: Login with existing credentials**
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123"
}

Response:
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## CORS Configuration

**Expected Headers:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

**⚠️ Not yet verified** - Requires live API to confirm

---

## Endpoints

### Health & Meta

#### GET /health
Check API health status.

**Auth:** Not required  
**Query Params:** None

**Expected Response (200):**
```json
{
  "status": "ok",
  "timestamp": 1699000000000,
  "service": "Project Valine API",
  "version": "1.0.0"
}
```

**curl Example:**
```bash
curl https://API_BASE/health
```

---

#### GET /meta
Get API metadata and available endpoints.

**Auth:** Not required  
**Query Params:** None

**Expected Response (200):**
```json
{
  "service": "Project Valine API",
  "version": "1.0.0",
  "stage": "dev",
  "endpoints": [...]
}
```

**curl Example:**
```bash
curl https://API_BASE/meta
```

---

### Authentication

#### POST /auth/register
Register a new user account.

**Auth:** Not required  
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "username": "johndoe",
  "displayName": "John Doe"
}
```

**Expected Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "user@example.com",
    "displayName": "John Doe",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=johndoe",
    "createdAt": "2024-11-04T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (400):**
```json
{
  "error": "Email already exists"
}
```

**curl Example:**
```bash
curl -X POST https://API_BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "username": "testuser",
    "displayName": "Test User"
  }'
```

---

#### POST /auth/login
Login with email and password.

**Auth:** Not required  
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Expected Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "user@example.com",
    "displayName": "John Doe",
    "avatar": "https://...",
    "createdAt": "2024-11-04T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401):**
```json
{
  "error": "Invalid credentials"
}
```

**curl Example:**
```bash
curl -X POST https://API_BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

---

#### GET /auth/me
Get current authenticated user profile.

**Auth:** Required (Bearer token)  
**Query Params:** None

**Expected Response (200):**
```json
{
  "id": "uuid",
  "username": "johndoe",
  "email": "user@example.com",
  "displayName": "John Doe",
  "avatar": "https://...",
  "bio": "User bio text",
  "createdAt": "2024-11-04T00:00:00.000Z"
}
```

**Error Response (401):**
```json
{
  "error": "Unauthorized"
}
```

**curl Example:**
```bash
curl https://API_BASE/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Reels

#### GET /reels
List reels with pagination.

**Auth:** Optional (required for isLiked, isBookmarked flags)  
**Query Params:**
- `limit` (optional): Number of items (default: 20, max: 100)
- `cursor` (optional): Pagination cursor from previous response

**Expected Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "content": "Reel content text",
      "media": ["https://..."],
      "authorId": "uuid",
      "author": {
        "id": "uuid",
        "username": "johndoe",
        "displayName": "John Doe",
        "avatar": "https://..."
      },
      "createdAt": "2024-11-04T00:00:00.000Z",
      "likesCount": 42,
      "commentsCount": 10,
      "isLiked": false,
      "isBookmarked": false
    }
  ],
  "nextCursor": "uuid-or-null",
  "hasMore": true
}
```

**curl Example:**
```bash
curl "https://API_BASE/reels?limit=20"

# With authentication
curl "https://API_BASE/reels?limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

#### POST /reels
Create a new reel.

**Auth:** Required  
**Request Body:**
```json
{
  "content": "My awesome reel content",
  "media": ["https://example.com/video.mp4"]
}
```

**Expected Response (201):**
```json
{
  "id": "uuid",
  "content": "My awesome reel content",
  "media": ["https://example.com/video.mp4"],
  "authorId": "uuid",
  "createdAt": "2024-11-04T00:00:00.000Z"
}
```

**curl Example:**
```bash
curl -X POST https://API_BASE/reels \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Check out this amazing moment!",
    "media": ["https://example.com/video.mp4"]
  }'
```

---

#### POST /reels/:id/like
Toggle like on a reel.

**Auth:** Required  
**Path Params:** `id` - Reel ID  
**Request Body:** Empty

**Expected Response (200):**
```json
{
  "liked": true,
  "likesCount": 43
}
```

**curl Example:**
```bash
curl -X POST https://API_BASE/reels/REEL_ID/like \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

#### POST /reels/:id/bookmark
Toggle bookmark on a reel.

**Auth:** Required  
**Path Params:** `id` - Reel ID  
**Request Body:** Empty

**Expected Response (200):**
```json
{
  "bookmarked": true
}
```

**curl Example:**
```bash
curl -X POST https://API_BASE/reels/REEL_ID/bookmark \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

#### GET /reels/:id/comments
Get comments for a reel.

**Auth:** Not required  
**Path Params:** `id` - Reel ID  
**Query Params:**
- `limit` (optional): Number of comments (default: 20)
- `cursor` (optional): Pagination cursor

**Expected Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "content": "Great reel!",
      "authorId": "uuid",
      "author": {
        "id": "uuid",
        "username": "commenter",
        "displayName": "Commenter Name",
        "avatar": "https://..."
      },
      "createdAt": "2024-11-04T00:00:00.000Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

**curl Example:**
```bash
curl "https://API_BASE/reels/REEL_ID/comments?limit=20"
```

---

#### POST /reels/:id/comments
Add a comment to a reel.

**Auth:** Required  
**Path Params:** `id` - Reel ID  
**Request Body:**
```json
{
  "content": "Great content!"
}
```

**Expected Response (201):**
```json
{
  "id": "uuid",
  "content": "Great content!",
  "authorId": "uuid",
  "reelId": "uuid",
  "createdAt": "2024-11-04T00:00:00.000Z"
}
```

**curl Example:**
```bash
curl -X POST https://API_BASE/reels/REEL_ID/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Amazing work!"}'
```

---

### Posts (Legacy)

#### GET /posts
List posts with pagination.

**Auth:** Not required  
**Query Params:**
- `limit` (optional): Number of items (default: 20)
- `cursor` (optional): Pagination cursor

**Expected Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "content": "Post content",
      "media": ["https://..."],
      "authorId": "uuid",
      "author": {...},
      "createdAt": "2024-11-04T00:00:00.000Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

---

#### POST /posts
Create a new post.

**Auth:** Not required  
**Request Body:**
```json
{
  "content": "Post content",
  "media": ["https://..."],
  "authorId": "uuid"
}
```

**Expected Response (201):**
```json
{
  "id": "uuid",
  "content": "Post content",
  "media": ["https://..."],
  "authorId": "uuid",
  "createdAt": "2024-11-04T00:00:00.000Z"
}
```

---

#### GET /posts/:id
Get a single post by ID.

**Auth:** Not required  
**Path Params:** `id` - Post ID

**Expected Response (200):**
```json
{
  "id": "uuid",
  "content": "Post content",
  "media": ["https://..."],
  "authorId": "uuid",
  "author": {...},
  "createdAt": "2024-11-04T00:00:00.000Z"
}
```

---

### Conversations & Messages

#### GET /conversations
List user's conversations.

**Auth:** Required  
**Query Params:**
- `limit` (optional): Number of conversations (default: 20)
- `cursor` (optional): Pagination cursor

**Expected Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "participants": [...],
      "lastMessage": {...},
      "createdAt": "2024-11-04T00:00:00.000Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

---

#### POST /conversations
Create a new conversation.

**Auth:** Required  
**Request Body:**
```json
{
  "participantIds": ["uuid1", "uuid2"]
}
```

**Expected Response (201):**
```json
{
  "id": "uuid",
  "participants": [...],
  "createdAt": "2024-11-04T00:00:00.000Z"
}
```

---

#### GET /conversations/:id/messages
Get messages in a conversation.

**Auth:** Required  
**Path Params:** `id` - Conversation ID  
**Query Params:**
- `limit` (optional): Number of messages (default: 50)
- `cursor` (optional): Pagination cursor

**Expected Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "content": "Message text",
      "senderId": "uuid",
      "conversationId": "uuid",
      "createdAt": "2024-11-04T00:00:00.000Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

---

#### POST /conversations/:id/messages
Send a message in a conversation.

**Auth:** Required  
**Path Params:** `id` - Conversation ID  
**Request Body:**
```json
{
  "content": "Hello!"
}
```

**Expected Response (201):**
```json
{
  "id": "uuid",
  "content": "Hello!",
  "senderId": "uuid",
  "conversationId": "uuid",
  "createdAt": "2024-11-04T00:00:00.000Z"
}
```

---

### Notifications

#### GET /notifications
List user notifications.

**Auth:** Required  
**Query Params:**
- `limit` (optional): Number of notifications (default: 20)
- `cursor` (optional): Pagination cursor

**Expected Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "type": "like",
      "recipientId": "uuid",
      "actorId": "uuid",
      "actor": {...},
      "metadata": {},
      "isRead": false,
      "createdAt": "2024-11-04T00:00:00.000Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

---

#### PATCH /notifications/:id/read
Mark a notification as read.

**Auth:** Required  
**Path Params:** `id` - Notification ID  
**Request Body:** Empty

**Expected Response (200):**
```json
{
  "success": true
}
```

---

#### PATCH /notifications/mark-all
Mark all notifications as read.

**Auth:** Required  
**Request Body:** Empty

**Expected Response (200):**
```json
{
  "success": true,
  "count": 15
}
```

---

### Connection Requests

#### POST /connections/request
Send a connection request.

**Auth:** Not required (should be required in production)  
**Request Body:**
```json
{
  "senderId": "uuid",
  "receiverId": "uuid",
  "message": "Let's connect!"
}
```

**Expected Response (201):**
```json
{
  "id": "uuid",
  "senderId": "uuid",
  "receiverId": "uuid",
  "status": "pending",
  "message": "Let's connect!",
  "createdAt": "2024-11-04T00:00:00.000Z"
}
```

---

#### GET /connections/requests
List connection requests.

**Auth:** Not required (should be required in production)  
**Query Params:**
- `userId`: User ID to filter requests
- `type`: "sent" or "received"

**Expected Response (200):**
```json
[
  {
    "id": "uuid",
    "senderId": "uuid",
    "sender": {...},
    "receiverId": "uuid",
    "receiver": {...},
    "status": "pending",
    "message": "Let's connect!",
    "createdAt": "2024-11-04T00:00:00.000Z"
  }
]
```

---

#### POST /connections/requests/:id/approve
Approve a connection request.

**Auth:** Not required (should be required in production)  
**Path Params:** `id` - Request ID  
**Request Body:** Empty

**Expected Response (200):**
```json
{
  "id": "uuid",
  "status": "accepted",
  "updatedAt": "2024-11-04T00:00:00.000Z"
}
```

---

#### POST /connections/requests/:id/reject
Reject a connection request.

**Auth:** Not required (should be required in production)  
**Path Params:** `id` - Request ID  
**Request Body:** Empty

**Expected Response (200):**
```json
{
  "id": "uuid",
  "status": "rejected",
  "updatedAt": "2024-11-04T00:00:00.000Z"
}
```

---

### Users

#### POST /users
Create a user (legacy, use /auth/register instead).

**Auth:** Not required  
**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "displayName": "John Doe",
  "bio": "User bio",
  "avatar": "https://..."
}
```

**Expected Response (201):**
```json
{
  "id": "uuid",
  "username": "johndoe",
  "email": "john@example.com",
  "displayName": "John Doe",
  "bio": "User bio",
  "avatar": "https://...",
  "createdAt": "2024-11-04T00:00:00.000Z"
}
```

---

#### GET /users/:username
Get user by username.

**Auth:** Not required  
**Path Params:** `username` - Username

**Expected Response (200):**
```json
{
  "id": "uuid",
  "username": "johndoe",
  "email": "john@example.com",
  "displayName": "John Doe",
  "bio": "User bio",
  "avatar": "https://...",
  "createdAt": "2024-11-04T00:00:00.000Z"
}
```

---

#### PUT /users/:id
Update user profile.

**Auth:** Not required (should be required in production)  
**Path Params:** `id` - User ID  
**Request Body:**
```json
{
  "displayName": "New Name",
  "bio": "New bio",
  "avatar": "https://new-avatar.com/image.jpg"
}
```

**Expected Response (200):**
```json
{
  "id": "uuid",
  "username": "johndoe",
  "email": "john@example.com",
  "displayName": "New Name",
  "bio": "New bio",
  "avatar": "https://new-avatar.com/image.jpg",
  "updatedAt": "2024-11-04T00:00:00.000Z"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid token)
- `404` - Not Found
- `500` - Internal Server Error

---

## Pagination

All list endpoints use cursor-based pagination:

**Request:**
```
GET /endpoint?limit=20&cursor=uuid
```

**Response:**
```json
{
  "items": [...],
  "nextCursor": "uuid-or-null",
  "hasMore": true
}
```

**To get next page:**
```
GET /endpoint?limit=20&cursor=<nextCursor-from-previous-response>
```

---

## Rate Limiting

**Expected:** AWS API Gateway default rate limits
- 10,000 requests per second per region
- 5,000 burst capacity

⚠️ **Not yet verified** - Requires live API to confirm

---

## Testing the API

### Quick Start

1. **Get API_BASE URL** (after deployment):
   ```bash
   # Will be in format:
   https://abc123.execute-api.us-west-2.amazonaws.com/dev
   ```

2. **Health Check:**
   ```bash
   curl $API_BASE/health
   ```

3. **Register a Test User:**
   ```bash
   curl -X POST $API_BASE/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "testpass123",
       "username": "testuser",
       "displayName": "Test User"
     }'
   ```

4. **Save Token:**
   ```bash
   TOKEN="<token-from-register-response>"
   ```

5. **Test Authenticated Endpoint:**
   ```bash
   curl $API_BASE/auth/me \
     -H "Authorization: Bearer $TOKEN"
   ```

---

## Frontend Integration

### Environment Configuration

Create `.env` file:
```bash
VITE_API_BASE=https://your-api-id.execute-api.us-west-2.amazonaws.com/dev
```

### API Client Example

```javascript
const API_BASE = import.meta.env.VITE_API_BASE;

// Helper function
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('authToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Usage examples
const user = await apiRequest('/auth/me');
const reels = await apiRequest('/reels?limit=20');
```

---

## Next Steps

Once the dev backend is deployed:

1. ✅ Verify all 28 endpoints respond correctly
2. ✅ Confirm CORS headers are present
3. ✅ Test authentication flow end-to-end
4. ✅ Measure response times
5. ✅ Test pagination on list endpoints
6. ✅ Verify error responses
7. ✅ Update this document with actual results
8. ✅ Create issues for any discrepancies

---

## References

- [Backend Implementation PR #146](https://github.com/gcolon75/Project-Valine/pull/146)
- [Deployment Guide](../DEPLOYMENT.md)
- [Backend Phase 02 Summary](../BACKEND_PHASE_02_SUMMARY.md)
- [Serverless Configuration](../serverless/serverless.yml)
- [Full API Documentation](../serverless/API_DOCUMENTATION.md)

---

**Last Updated:** 2025-11-04  
**Status:** Awaiting deployment  
**Contact:** See GitHub Issues for deployment blockers
