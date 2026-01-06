# Project Valine API Contract

**Version:** 1.0.0  
**Base URL Format:** `https://{API_ID}.execute-api.{REGION}.amazonaws.com/{STAGE}`  
**Authentication:** JWT Bearer Token  
**Date:** 2025-11-04

---

## Authentication

All protected endpoints require:
```
Authorization: Bearer <jwt-token>
```

Get token via `/auth/register` or `/auth/login`.

---

## Response Format

### Success
```typescript
// Single item
{ field: value, ... }

// List with pagination
{
  items: Array<T>,
  nextCursor: string | null,
  hasMore: boolean
}
```

### Error
```typescript
{
  error: string
}
```

Status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 500 (Internal Server Error)

---

## Type Definitions

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar: string | null;
  bio?: string | null;
  role?: string;
  createdAt: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

interface Reel {
  id: string;
  videoUrl: string;
  thumbnail: string | null;
  caption: string | null;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
  };
  likes: number;
  comments: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: string;
}

interface Comment {
  id: string;
  text: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
  };
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  participants: Array<{
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
  }>;
  messageCount: number;
  createdAt: string;
}

interface Message {
  id: string;
  text: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
  };
  createdAt: string;
}

interface Notification {
  id: string;
  type: string; // 'like' | 'comment' | 'follow' | 'message'
  message: string;
  triggerer: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
  } | null;
  isRead: boolean;
  metadata: any;
  createdAt: string;
}

interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

---

## Endpoints

### Health & Meta

#### `GET /health`
**Auth:** None  
**Response:**
```typescript
{
  status: "ok",
  timestamp: number,
  service: string,
  version: string
}
```

#### `GET /meta`
**Auth:** None  
**Response:** API metadata with all endpoints

---

### Authentication

#### `POST /auth/register`
**Auth:** None  
**Body:**
```typescript
{
  email: string,
  password: string, // min 6 chars
  username: string,
  displayName: string
}
```
**Response:** `AuthResponse` (201)

#### `POST /auth/login`
**Auth:** None  
**Body:**
```typescript
{
  email: string,
  password: string
}
```
**Response:** `AuthResponse` (200)

#### `GET /auth/me`
**Auth:** Required  
**Response:**
```typescript
{
  user: User & {
    _count: {
      posts: number,
      reels: number,
      sentRequests: number,
      receivedRequests: number
    }
  }
}
```

---

### Reels

#### `GET /reels`
**Auth:** Optional (affects isLiked/isBookmarked)  
**Query:**
```typescript
{
  limit?: string, // default: "20", max: "100"
  cursor?: string
}
```
**Response:** `PaginatedResponse<Reel>` (200)

#### `POST /reels`
**Auth:** Required  
**Body:**
```typescript
{
  videoUrl: string,
  thumbnail?: string,
  caption?: string
}
```
**Response:** `Reel` (201)

#### `POST /reels/:id/like`
**Auth:** Required  
**Response:**
```typescript
{
  success: true,
  likes: number,
  isLiked: boolean
}
```

#### `POST /reels/:id/bookmark`
**Auth:** Required  
**Response:**
```typescript
{
  success: true,
  isBookmarked: boolean
}
```

#### `GET /reels/:id/comments`
**Auth:** None  
**Query:**
```typescript
{
  limit?: string, // default: "50"
  cursor?: string
}
```
**Response:** `PaginatedResponse<Comment>` with `comments` field (200)

#### `POST /reels/:id/comments`
**Auth:** Required  
**Body:**
```typescript
{
  text: string
}
```
**Response:**
```typescript
{
  comment: Comment
}
``` 
(201)

---

### Conversations & Messages

#### `GET /conversations`
**Auth:** Required  
**Query:**
```typescript
{
  limit?: string, // default: "20"
  cursor?: string
}
```
**Response:** `PaginatedResponse<Conversation>` (200)

#### `POST /conversations`
**Auth:** Required  
**Body:**
```typescript
{
  participantIds: string[], // array of user IDs
  title?: string
}
```
**Response:**
```typescript
{
  id: string,
  title: string | null,
  participants: Array<User>,
  createdAt: string
}
```
(201)

#### `GET /conversations/:id/messages`
**Auth:** Required  
**Query:**
```typescript
{
  limit?: string, // default: "50"
  cursor?: string
}
```
**Response:**
```typescript
{
  messages: Message[], // oldest first
  nextCursor: string | null,
  hasMore: boolean
}
```
(200)

#### `POST /conversations/:id/messages`
**Auth:** Required  
**Body:**
```typescript
{
  text: string
}
```
**Response:**
```typescript
{
  message: Message
}
```
(201)

---

### Notifications

#### `GET /notifications`
**Auth:** Required  
**Query:**
```typescript
{
  limit?: string, // default: "50"
  cursor?: string,
  unreadOnly?: "true" | "false"
}
```
**Response:**
```typescript
{
  notifications: Notification[],
  nextCursor: string | null,
  hasMore: boolean,
  unreadCount: number
}
```
(200)

#### `PATCH /notifications/:id/read`
**Auth:** Required  
**Response:**
```typescript
{
  notification: Notification,
  success: true
}
```
(200)

#### `PATCH /notifications/mark-all`
**Auth:** Required  
**Response:**
```typescript
{
  success: true,
  updated: number
}
```
(200)

---

### Users

#### `GET /users/:username`
**Auth:** None  
**Response:**
```typescript
User & {
  posts: Post[],
  _count: {
    posts: number
  }
}
```
(200)

#### `PUT /users/:id`
**Auth:** Required  
**Body:**
```typescript
{
  displayName?: string,
  bio?: string,
  avatar?: string
}
```
**Response:** `User` (200)

#### `POST /users` (Legacy - use /auth/register)
**Auth:** None  
**Body:**
```typescript
{
  username: string,
  email: string,
  displayName: string,
  bio?: string,
  avatar?: string,
  role?: string
}
```
**Response:** `User` (201)

---

### Posts (Legacy)

#### `GET /posts`
**Auth:** None  
**Query:**
```typescript
{
  limit?: string, // default: "20"
  cursor?: string
}
```
**Response:** `Post[]` (200)

#### `POST /posts`
**Auth:** None  
**Body:**
```typescript
{
  content: string,
  authorId: string,
  media?: string[]
}
```
**Response:**
```typescript
Post & {
  author: {
    id: string,
    username: string,
    displayName: string,
    avatar: string | null
  }
}
```
(201)

#### `GET /posts/:id`
**Auth:** None  
**Response:**
```typescript
Post & {
  author: {
    id: string,
    username: string,
    displayName: string,
    avatar: string | null
  }
}
```
(200)

---

### Connection Requests

#### `POST /connections/request`
**Auth:** Required  
**Body:**
```typescript
{
  receiverId: string,
  message?: string
}
```
**Response:** `ConnectionRequest` (201)

#### `GET /connections/requests`
**Auth:** Required  
**Query:**
```typescript
{
  userId?: string,
  type?: "sent" | "received"
}
```
**Response:** `ConnectionRequest[]` (200)

#### `POST /connections/requests/:id/approve`
**Auth:** Required  
**Response:** `ConnectionRequest` (200)

#### `POST /connections/requests/:id/reject`
**Auth:** Required  
**Response:** `ConnectionRequest` (200)

---

## CORS

All endpoints include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

---

## Pagination

All list endpoints support:
- `limit` query parameter (default varies, typically 20-50)
- `cursor` query parameter for next page
- Response includes `nextCursor` and `hasMore` boolean

Example:
```typescript
// First page
GET /reels?limit=20

// Response
{
  items: [...],
  nextCursor: "abc123",
  hasMore: true
}

// Next page
GET /reels?limit=20&cursor=abc123
```

---

## Error Handling

### Error Response Format
```typescript
{
  error: string
}
```

### Common Errors
- `400` - Missing required fields, invalid format
- `401` - Missing or invalid authentication token
- `403` - Not authorized to access resource
- `404` - Resource not found
- `409` - Resource already exists (e.g., duplicate email)
- `500` - Internal server error

### Example Error Responses
```json
{"error": "email, password, username, and displayName are required"}
{"error": "Unauthorized - No valid token provided"}
{"error": "User not found"}
{"error": "User with this email or username already exists"}
```

---

## Rate Limiting

Default AWS API Gateway limits:
- 10,000 requests per second
- 5,000 concurrent requests
- Burst capacity: 5,000

---

## Authentication Details

### JWT Token
- **Algorithm:** HS256
- **Expiration:** 7 days
- **Header:** `Authorization: Bearer <token>`
- **Obtain:** POST /auth/register or /auth/login
- **Verify:** GET /auth/me

### Token Usage
```typescript
// Register/Login response includes token
const { user, token } = await register(...);

// Use in subsequent requests
fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## Frontend Integration Example

```typescript
// API Client
class ValineAPI {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async register(data: RegisterData): Promise<AuthResponse> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginData): Promise<AuthResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async me(): Promise<{ user: User }> {
    return this.request('/auth/me');
  }

  // Reels
  async getReels(limit = 20, cursor?: string): Promise<PaginatedResponse<Reel>> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.append('cursor', cursor);
    return this.request(`/reels?${params}`);
  }

  async likeReel(reelId: string): Promise<{ success: boolean; likes: number }> {
    return this.request(`/reels/${reelId}/like`, { method: 'POST' });
  }

  // ... other methods
}

// Usage
const api = new ValineAPI(import.meta.env.VITE_API_BASE);

// Register
const { user, token } = await api.register({
  email: 'user@example.com',
  password: 'password123',
  username: 'username',
  displayName: 'Display Name',
});

// Set token for authenticated requests
api.setToken(token);

// Get current user
const { user: currentUser } = await api.me();

// Get reels
const { items: reels, nextCursor, hasMore } = await api.getReels(20);
```

---

## OpenAPI/Swagger (Partial)

```yaml
openapi: 3.0.0
info:
  title: Project Valine API
  version: 1.0.0
  description: Backend API for Project Valine

servers:
  - url: https://{apiId}.execute-api.us-west-2.amazonaws.com/dev
    description: Development server

security:
  - BearerAuth: []

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        username:
          type: string
        email:
          type: string
        displayName:
          type: string
        avatar:
          type: string
          nullable: true

    Reel:
      type: object
      properties:
        id:
          type: string
        videoUrl:
          type: string
        thumbnail:
          type: string
          nullable: true
        caption:
          type: string
          nullable: true
        author:
          $ref: '#/components/schemas/User'
        likes:
          type: integer
        comments:
          type: integer
        isLiked:
          type: boolean
        isBookmarked:
          type: boolean
        createdAt:
          type: string
          format: date-time

paths:
  /health:
    get:
      summary: Health check
      security: []
      responses:
        '200':
          description: OK

  /auth/register:
    post:
      summary: Register new user
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
                - username
                - displayName
              properties:
                email:
                  type: string
                password:
                  type: string
                username:
                  type: string
                displayName:
                  type: string
      responses:
        '201':
          description: User created

  # ... other endpoints
```

---

## Notes for Frontend Developers

1. **Base URL**: Set `VITE_API_BASE` in `.env` file
2. **Authentication**: Store JWT token securely (localStorage/sessionStorage)
3. **Error Handling**: Check for `error` field in response
4. **Pagination**: Use `nextCursor` and `hasMore` for infinite scroll
5. **Timestamps**: All dates in ISO 8601 format
6. **File Uploads**: Not yet implemented - use external service for now
7. **Real-time**: Not yet implemented - use polling for now

---

**Last Updated:** 2025-11-04  
**Contact:** GitHub Issues - gcolon75/Project-Valine
