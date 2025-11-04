# Project Valine API Documentation

## Base URL

**Development:** `https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev`

Replace `YOUR-API-ID` with your actual API Gateway ID after deployment.

## Authentication

The API uses JWT (JSON Web Token) Bearer authentication for protected endpoints.

### Headers
```
Authorization: Bearer <your-jwt-token>
```

### Obtaining a Token
Get a token by calling `/auth/register` or `/auth/login`. The token is valid for 7 days.

---

## Endpoints

### Health & Metadata

#### GET /health
Check API health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1699000000000,
  "service": "Project Valine API",
  "version": "1.0.0"
}
```

**Example:**
```bash
curl https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/health
```

---

#### GET /meta
Get API metadata and available endpoints.

**Response:**
```json
{
  "service": "Project Valine API",
  "version": "1.0.0",
  "stage": "dev",
  "endpoints": [...],
  "authentication": {...},
  "pagination": {...}
}
```

**Example:**
```bash
curl https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/meta
```

---

### Authentication

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "username": "johndoe",
  "displayName": "John Doe"
}
```

**Response (201):**
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

**Example:**
```bash
curl -X POST https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword",
    "username": "johndoe",
    "displayName": "John Doe"
  }'
```

---

#### POST /auth/login
Login with existing credentials.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "user@example.com",
    "displayName": "John Doe",
    "avatar": "https://...",
    "role": "artist",
    "createdAt": "2024-11-04T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Example:**
```bash
curl -X POST https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword"
  }'
```

---

#### GET /auth/me
Get current authenticated user's profile.

**Headers:** `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "user@example.com",
    "displayName": "John Doe",
    "avatar": "https://...",
    "bio": "Artist and creator",
    "role": "artist",
    "createdAt": "2024-11-04T00:00:00.000Z",
    "_count": {
      "posts": 10,
      "reels": 5,
      "sentRequests": 3,
      "receivedRequests": 2
    }
  }
}
```

**Example:**
```bash
curl https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Reels

#### GET /reels
List reels with pagination.

**Query Parameters:**
- `limit` (optional): Number of items (default: 20, max: 100)
- `cursor` (optional): Cursor for pagination

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "videoUrl": "https://s3.../video.mp4",
      "thumbnail": "https://s3.../thumbnail.jpg",
      "caption": "Check out my latest performance!",
      "author": {
        "id": "uuid",
        "username": "johndoe",
        "displayName": "John Doe",
        "avatar": "https://..."
      },
      "likes": 42,
      "comments": 10,
      "isLiked": false,
      "isBookmarked": false,
      "createdAt": "2024-11-04T00:00:00.000Z"
    }
  ],
  "nextCursor": "uuid-or-null",
  "hasMore": true
}
```

**Example:**
```bash
curl "https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/reels?limit=20"
```

---

#### POST /reels
Create a new reel.

**Headers:** `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "videoUrl": "https://s3.amazonaws.com/.../video.mp4",
  "thumbnail": "https://s3.amazonaws.com/.../thumbnail.jpg",
  "caption": "My latest performance!"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "videoUrl": "https://s3.../video.mp4",
  "thumbnail": "https://s3.../thumbnail.jpg",
  "caption": "My latest performance!",
  "author": {...},
  "likes": 0,
  "comments": 0,
  "isLiked": false,
  "isBookmarked": false,
  "createdAt": "2024-11-04T00:00:00.000Z"
}
```

**Example:**
```bash
curl -X POST https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/reels \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://example.com/video.mp4",
    "thumbnail": "https://example.com/thumb.jpg",
    "caption": "My latest performance!"
  }'
```

---

#### POST /reels/:id/like
Toggle like on a reel (like if not liked, unlike if already liked).

**Headers:** `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "success": true,
  "likes": 43,
  "isLiked": true
}
```

**Example:**
```bash
curl -X POST https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/reels/REEL_ID/like \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### POST /reels/:id/bookmark
Toggle bookmark on a reel.

**Headers:** `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "success": true,
  "isBookmarked": true
}
```

**Example:**
```bash
curl -X POST https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/reels/REEL_ID/bookmark \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### GET /reels/:id/comments
Get comments for a reel.

**Query Parameters:**
- `limit` (optional): Number of comments (default: 50)
- `cursor` (optional): Cursor for pagination

**Response (200):**
```json
{
  "comments": [
    {
      "id": "uuid",
      "text": "Amazing performance!",
      "author": {
        "id": "uuid",
        "username": "janedoe",
        "displayName": "Jane Doe",
        "avatar": "https://..."
      },
      "createdAt": "2024-11-04T00:00:00.000Z"
    }
  ],
  "nextCursor": "uuid-or-null",
  "hasMore": false
}
```

**Example:**
```bash
curl "https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/reels/REEL_ID/comments?limit=50"
```

---

#### POST /reels/:id/comments
Add a comment to a reel.

**Headers:** `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "text": "Amazing performance!"
}
```

**Response (201):**
```json
{
  "comment": {
    "id": "uuid",
    "text": "Amazing performance!",
    "author": {...},
    "createdAt": "2024-11-04T00:00:00.000Z"
  }
}
```

**Example:**
```bash
curl -X POST https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/reels/REEL_ID/comments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Amazing performance!"}'
```

---

### Conversations & Messages

#### GET /conversations
List user's conversations.

**Headers:** `Authorization: Bearer <token>` (required)

**Query Parameters:**
- `limit` (optional): Number of conversations (default: 20)
- `cursor` (optional): Cursor for pagination

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Chat with Jane",
      "lastMessage": "Hey, how are you?",
      "lastMessageAt": "2024-11-04T00:00:00.000Z",
      "participants": [
        {
          "id": "uuid",
          "username": "janedoe",
          "displayName": "Jane Doe",
          "avatar": "https://..."
        }
      ],
      "messageCount": 15,
      "createdAt": "2024-11-03T00:00:00.000Z"
    }
  ],
  "nextCursor": "uuid-or-null",
  "hasMore": false
}
```

**Example:**
```bash
curl https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### POST /conversations
Create a new conversation.

**Headers:** `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "participantIds": ["user-uuid-1", "user-uuid-2"],
  "title": "Project Discussion"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "title": "Project Discussion",
  "participants": [...],
  "createdAt": "2024-11-04T00:00:00.000Z"
}
```

**Example:**
```bash
curl -X POST https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "participantIds": ["user-uuid-1"],
    "title": "Project Discussion"
  }'
```

---

#### GET /conversations/:id/messages
Get messages in a conversation.

**Headers:** `Authorization: Bearer <token>` (required)

**Query Parameters:**
- `limit` (optional): Number of messages (default: 50)
- `cursor` (optional): Cursor for pagination

**Response (200):**
```json
{
  "messages": [
    {
      "id": "uuid",
      "text": "Hey, how are you?",
      "sender": {
        "id": "uuid",
        "username": "janedoe",
        "displayName": "Jane Doe",
        "avatar": "https://..."
      },
      "createdAt": "2024-11-04T00:00:00.000Z"
    }
  ],
  "nextCursor": "uuid-or-null",
  "hasMore": false
}
```

**Example:**
```bash
curl "https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/conversations/CONV_ID/messages?limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### POST /conversations/:id/messages
Send a message in a conversation.

**Headers:** `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "text": "Hey, how are you?"
}
```

**Response (201):**
```json
{
  "message": {
    "id": "uuid",
    "text": "Hey, how are you?",
    "sender": {...},
    "createdAt": "2024-11-04T00:00:00.000Z"
  }
}
```

**Example:**
```bash
curl -X POST https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/conversations/CONV_ID/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hey, how are you?"}'
```

---

### Notifications

#### GET /notifications
List user's notifications.

**Headers:** `Authorization: Bearer <token>` (required)

**Query Parameters:**
- `limit` (optional): Number of notifications (default: 50)
- `cursor` (optional): Cursor for pagination
- `unreadOnly` (optional): `true` to only show unread notifications

**Response (200):**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "like",
      "message": "janedoe liked your reel",
      "triggerer": {
        "id": "uuid",
        "username": "janedoe",
        "displayName": "Jane Doe",
        "avatar": "https://..."
      },
      "isRead": false,
      "metadata": {"reelId": "uuid"},
      "createdAt": "2024-11-04T00:00:00.000Z"
    }
  ],
  "nextCursor": "uuid-or-null",
  "hasMore": false,
  "unreadCount": 5
}
```

**Example:**
```bash
curl "https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/notifications?unreadOnly=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### PATCH /notifications/:id/read
Mark a notification as read.

**Headers:** `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "notification": {...},
  "success": true
}
```

**Example:**
```bash
curl -X PATCH https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/notifications/NOTIF_ID/read \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### PATCH /notifications/mark-all
Mark all notifications as read.

**Headers:** `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "success": true,
  "updated": 5
}
```

**Example:**
```bash
curl -X PATCH https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev/notifications/mark-all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

### Common Status Codes
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Not authorized to access resource
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Server error

---

## Pagination

All list endpoints support cursor-based pagination:

**Query Parameters:**
- `limit`: Number of items to return (default varies by endpoint, typically 20-50)
- `cursor`: Cursor from previous response's `nextCursor`

**Response Structure:**
```json
{
  "items": [...],
  "nextCursor": "uuid-or-null",
  "hasMore": true
}
```

**Example Pagination Flow:**
```bash
# First page
curl "https://YOUR-API/dev/reels?limit=20"

# Response includes: {"items": [...], "nextCursor": "abc123", "hasMore": true}

# Next page
curl "https://YOUR-API/dev/reels?limit=20&cursor=abc123"
```

---

## Rate Limiting

Rate limiting is handled by AWS API Gateway:
- Default: 10,000 requests per second
- Burst: 5,000 concurrent requests

---

## CORS

CORS is enabled for all origins (`*`) in development. Configure appropriately for production.

**Headers Returned:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

---

## Development Tips

### Setting Your API Base URL

After deployment, update your frontend's `.env` file:

```env
VITE_API_BASE=https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev
```

### Testing with curl

Save your token in an environment variable:

```bash
export API_BASE="https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev"
export TOKEN="your-jwt-token-here"

# Then use in requests
curl "$API_BASE/auth/me" -H "Authorization: Bearer $TOKEN"
```

### Mock Data

For development, you can create mock data:

```bash
# Register test users
curl -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","username":"testuser","displayName":"Test User"}'
```

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/gcolon75/Project-Valine/issues
- Documentation: See repository README
