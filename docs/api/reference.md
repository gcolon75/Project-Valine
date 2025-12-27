# Project Valine - API Reference

Complete reference for the Project Valine serverless backend API.

## Base URL

The API base URL depends on your deployment stage:

- **Development**: `https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev`
- **Staging**: `https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/staging`
- **Production**: `https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/prod`

## Authentication

🚧 **Coming Soon**: JWT-based authentication

Currently, all endpoints are public for development purposes.

## Response Format

All successful responses return JSON with appropriate HTTP status codes:

- `200 OK` - Successful GET request
- `201 Created` - Successful POST request that creates a resource
- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error responses include a message:
```json
{
  "error": "Error description"
}
```

## Endpoints

### Health & Status

#### Health Check

Check if the API is operational.

```http
GET /health
```

**Response:**
```json
{
  "ok": true,
  "status": "healthy"
}
```

#### Hello World

Simple test endpoint.

```http
GET /hello
```

**Response:**
```json
{
  "message": "Project Valine API is alive ✨"
}
```

---

### Users

#### Create User

Create a new user account.

```http
POST /users
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "displayName": "John Doe",
  "bio": "Voice actor specializing in character voices",
  "avatar": "https://example.com/avatar.jpg"
}
```

**Required Fields:**
- `username` (string) - Unique username
- `email` (string) - Unique email address
- `displayName` (string) - Display name

**Optional Fields:**
- `bio` (string) - User biography
- `avatar` (string) - Avatar image URL

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "johndoe",
  "email": "john@example.com",
  "displayName": "John Doe",
  "bio": "Voice actor specializing in character voices",
  "avatar": "https://example.com/avatar.jpg",
  "role": "artist",
  "createdAt": "2025-10-29T12:00:00.000Z",
  "updatedAt": "2025-10-29T12:00:00.000Z"
}
```

**Errors:**
- `400` - Missing required fields
- `500` - Database error (e.g., duplicate username/email)

---

#### Get User Profile

Retrieve a user's profile and recent posts.

```http
GET /users/{username}
```

**Path Parameters:**
- `username` (string) - Username to retrieve

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "johndoe",
  "email": "john@example.com",
  "displayName": "John Doe",
  "bio": "Voice actor specializing in character voices",
  "avatar": "https://example.com/avatar.jpg",
  "role": "artist",
  "createdAt": "2025-10-29T12:00:00.000Z",
  "updatedAt": "2025-10-29T12:00:00.000Z",
  "posts": [
    {
      "id": "post-uuid",
      "content": "Check out my latest demo reel!",
      "media": ["https://example.com/reel.mp4"],
      "createdAt": "2025-10-29T13:00:00.000Z"
    }
  ],
  "_count": {
    "posts": 15
  }
}
```

**Errors:**
- `400` - Username not provided
- `404` - User not found
- `500` - Server error

---

#### Update User

Update user profile information.

```http
PUT /users/{id}
Content-Type: application/json
```

**Path Parameters:**
- `id` (string) - User ID (UUID)

**Request Body:**
```json
{
  "displayName": "John Q. Doe",
  "bio": "Award-winning voice actor",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

**All fields are optional:**
- `displayName` (string)
- `bio` (string)
- `avatar` (string)

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "johndoe",
  "displayName": "John Q. Doe",
  "bio": "Award-winning voice actor",
  "avatar": "https://example.com/new-avatar.jpg",
  "updatedAt": "2025-10-29T14:00:00.000Z"
}
```

**Errors:**
- `400` - Invalid user ID
- `500` - Server error

---

### Posts

#### Create Post

Create a new post.

```http
POST /posts
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Excited to share my latest project!",
  "media": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  "authorId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Required Fields:**
- `content` (string) - Post content (text)
- `authorId` (string) - Author's user ID

**Optional Fields:**
- `media` (array of strings) - Media URLs (images, videos, audio)

**Response (201 Created):**
```json
{
  "id": "post-uuid",
  "content": "Excited to share my latest project!",
  "media": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  "authorId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2025-10-29T15:00:00.000Z",
  "author": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "displayName": "John Doe",
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

**Errors:**
- `400` - Missing content or authorId
- `500` - Server error

---

#### List Posts

Retrieve a feed of posts.

```http
GET /posts?limit=20&cursor=post-uuid
```

**Query Parameters:**
- `limit` (number, optional) - Number of posts to return (default: 20)
- `cursor` (string, optional) - Cursor for pagination (post ID)

**Response (200 OK):**
```json
[
  {
    "id": "post-uuid-1",
    "content": "First post content",
    "media": [],
    "createdAt": "2025-10-29T15:00:00.000Z",
    "author": {
      "id": "author-id",
      "username": "johndoe",
      "displayName": "John Doe",
      "avatar": "https://example.com/avatar.jpg"
    }
  },
  {
    "id": "post-uuid-2",
    "content": "Second post content",
    "media": ["https://example.com/image.jpg"],
    "createdAt": "2025-10-29T14:00:00.000Z",
    "author": {
      "id": "author-id-2",
      "username": "janedoe",
      "displayName": "Jane Doe",
      "avatar": "https://example.com/avatar2.jpg"
    }
  }
]
```

**Pagination:**
To get the next page, use the ID of the last post as the cursor:
```http
GET /posts?limit=20&cursor=post-uuid-2
```

**Errors:**
- `500` - Server error

---

### Connections

#### Send Connection Request

Send a connection request to another user.

```http
POST /connections/request
Content-Type: application/json
```

**Request Body:**
```json
{
  "senderId": "550e8400-e29b-41d4-a716-446655440000",
  "receiverId": "660e8400-e29b-41d4-a716-446655440001",
  "message": "Hi! I'd love to collaborate on your next project."
}
```

**Required Fields:**
- `senderId` (string) - Sender's user ID
- `receiverId` (string) - Receiver's user ID

**Optional Fields:**
- `message` (string) - Personal message with the request

**Response (201 Created):**
```json
{
  "id": "request-uuid",
  "senderId": "550e8400-e29b-41d4-a716-446655440000",
  "receiverId": "660e8400-e29b-41d4-a716-446655440001",
  "status": "pending",
  "message": "Hi! I'd love to collaborate on your next project.",
  "createdAt": "2025-10-29T16:00:00.000Z",
  "sender": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "displayName": "John Doe",
    "avatar": "https://example.com/avatar.jpg"
  },
  "receiver": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "username": "janedoe",
    "displayName": "Jane Doe",
    "avatar": "https://example.com/avatar2.jpg"
  }
}
```

**Errors:**
- `400` - Missing senderId or receiverId
- `500` - Server error (e.g., duplicate request)

---

#### List Connection Requests

Get pending connection requests for a user.

```http
GET /connections/requests?userId=user-uuid
```

**Query Parameters:**
- `userId` (string, required) - User ID to get requests for

**Response (200 OK):**
```json
[
  {
    "id": "request-uuid",
    "senderId": "sender-id",
    "receiverId": "receiver-id",
    "status": "pending",
    "message": "Let's connect!",
    "createdAt": "2025-10-29T16:00:00.000Z",
    "sender": {
      "id": "sender-id",
      "username": "johndoe",
      "displayName": "John Doe",
      "avatar": "https://example.com/avatar.jpg",
      "bio": "Voice actor"
    }
  }
]
```

**Errors:**
- `400` - userId not provided
- `500` - Server error

---

#### Approve Connection Request

Accept a pending connection request.

```http
POST /connections/requests/{id}/approve
```

**Path Parameters:**
- `id` (string) - Connection request ID

**Response (200 OK):**
```json
{
  "id": "request-uuid",
  "senderId": "sender-id",
  "receiverId": "receiver-id",
  "status": "accepted",
  "message": "Let's connect!",
  "createdAt": "2025-10-29T16:00:00.000Z"
}
```

**Errors:**
- `400` - Request ID not provided
- `404` - Request not found
- `500` - Server error

---

#### Reject Connection Request

Reject a pending connection request.

```http
POST /connections/requests/{id}/reject
```

**Path Parameters:**
- `id` (string) - Connection request ID

**Response (200 OK):**
```json
{
  "id": "request-uuid",
  "senderId": "sender-id",
  "receiverId": "receiver-id",
  "status": "rejected",
  "message": "Let's connect!",
  "createdAt": "2025-10-29T16:00:00.000Z"
}
```

**Errors:**
- `400` - Request ID not provided
- `404` - Request not found
- `500` - Server error

---

## CORS

All endpoints support CORS with the following headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

**Production Recommendation:** Restrict `Access-Control-Allow-Origin` to your frontend domain.

## Rate Limiting

🚧 **Coming Soon**: Rate limiting is not currently implemented but is planned for production.

Recommended limits:
- General endpoints: 100 requests/minute per IP
- Create endpoints: 20 requests/minute per IP

## Error Handling

All errors follow this format:

```json
{
  "error": "Descriptive error message"
}
```

Common HTTP status codes:
- `400` - Bad request (validation error)
- `401` - Unauthorized (coming soon with auth)
- `403` - Forbidden (coming soon with auth)
- `404` - Not found
- `429` - Too many requests (coming soon with rate limiting)
- `500` - Internal server error

## Testing

### Using cURL

```powershell
# Health check
Invoke-RestMethod -Uri "https://api-url/health" -Method Get

# Create user
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
    "Content-Type" = "application/json"
} -Body '{"username":"test","email":"test@example.com","displayName":"Test User"}' -ContentType 'application/json'
```

### Using the Test Script

```powershell
$env:API_BASE = "https://your-api-url.amazonaws.com/dev"
./scripts/deployment/test-endpoints.sh
```

## Database Schema

The API uses Prisma ORM with the following models:

### User
- `id` (UUID) - Primary key
- `username` (String) - Unique
- `email` (String) - Unique
- `displayName` (String)
- `bio` (String, optional)
- `avatar` (String, optional)
- `role` (String) - Default: "artist"
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### Post
- `id` (UUID) - Primary key
- `content` (Text)
- `media` (String[])
- `authorId` (UUID) - Foreign key to User
- `createdAt` (DateTime)

### ConnectionRequest
- `id` (UUID) - Primary key
- `senderId` (UUID) - Foreign key to User
- `receiverId` (UUID) - Foreign key to User
- `status` (String) - "pending", "accepted", "rejected"
- `message` (String, optional)
- `createdAt` (DateTime)

See [api/prisma/schema.prisma](api/prisma/schema.prisma) for complete schema.

## Performance

### Cold Starts

Lambda cold starts typically take 1-3 seconds for the first request.

**Mitigation strategies:**
- Use provisioned concurrency for production
- Keep dependencies minimal
- Use Prisma Data Proxy for connection pooling

### Database Connections

Prisma creates a connection pool. For serverless environments:
- Use `connection_limit=1` in DATABASE_URL
- Consider Prisma Data Proxy for connection pooling
- Monitor active connections

## Monitoring

View Lambda logs:

```powershell
cd serverless
npx serverless logs -f getUser --stage dev --tail
```

CloudWatch metrics are available in AWS Console:
- Invocation count
- Error count
- Duration
- Throttles

## Security

### Current Security Measures
- HTTPS only (enforced by API Gateway)
- Input validation in handlers
- Prisma SQL injection protection

### Planned Security Features
- JWT authentication
- Rate limiting
- Request signing
- API keys for third-party integrations

### Security Best Practices
1. Never expose `DATABASE_URL` in frontend
2. Use environment variables for secrets
3. Implement authentication before production
4. Restrict CORS in production
5. Monitor for suspicious activity
6. Regular security audits

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for API changes and version history.

## Support

- [Deployment Guide](../deployment/overview.md)
- [Quick Start](../quickstart/README.md)
- [GitHub Issues](https://github.com/gcolon75/Project-Valine/issues)
- [Contributing Guidelines](CONTRIBUTING.md)

---

Last Updated: October 29, 2025
