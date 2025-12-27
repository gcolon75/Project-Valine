# Project-Valine System Handbook

**Last Updated:** 2025-12-09  
**Version:** 1.0  
**Purpose:** This handbook serves as the complete reference for Project-Valine's architecture, database schema, API endpoints, workflows, and troubleshooting procedures.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Dictionary](#database-dictionary)
3. [API Reference](#api-reference)
4. [Workflow Walkthroughs](#workflow-walkthroughs)
5. [Troubleshooting Runbooks](#troubleshooting-runbooks)
6. [Environment Configuration](#environment-configuration)
7. [Deployment Guide](#deployment-guide)

---

## Architecture Overview

### High-Level Architecture

Project-Valine is a modern serverless application with the following architecture:

```
┌─────────────┐
│   Frontend  │ (React + Vite SPA)
│  CloudFront │ → S3 Static Hosting
└──────┬──────┘
       │
       │ HTTPS/REST
       │
       ▼
┌─────────────────────┐
│   API Gateway       │ (AWS)
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │   Lambda     │ (Node.js Serverless Functions)
    │  Functions   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │   Prisma     │ (ORM)
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  Amazon RDS  │ (PostgreSQL)
    └──────────────┘

    ┌──────────────┐
    │  Amazon S3   │ (Media uploads)
    └──────────────┘
```

### Components

#### Frontend
- **Technology:** React 18 + Vite
- **Hosting:** AWS CloudFront + S3
- **State Management:** React Context + Custom Hooks
- **Routing:** React Router v6
- **Styling:** Tailwind CSS

#### Backend (Canonical)
- **Location:** `/serverless` directory
- **Framework:** Serverless Framework
- **Runtime:** Node.js 18+ on AWS Lambda
- **Database ORM:** Prisma
- **Authentication:** JWT-based with HttpOnly cookies (optional)

#### Legacy Express Server
- **Location:** `/server` directory
- **Status:** Development-only, NOT deployed to staging/production
- **Purpose:** Local testing and quick iteration
- **See:** `/server/README.md` for details

### Authentication Flows

#### Phase A: localStorage Tokens (Legacy)
```
1. User logs in → Backend returns JWT access + refresh tokens
2. Frontend stores tokens in localStorage
3. API requests include: Authorization: Bearer <token>
4. Token refresh on expiry via /auth/refresh
```

#### Phase C: HttpOnly Cookies (Recommended for Production)
```
1. User logs in → Backend sets HttpOnly cookies
2. Cookies auto-included in requests (withCredentials: true)
3. CSRF protection via X-CSRF-Token header
4. Auto refresh with token rotation
5. XSS protection (tokens not accessible to JavaScript)
```

**Environment Variables:**
- `VITE_ENABLE_AUTH=true` → Use HttpOnly cookies
- `VITE_ENABLE_AUTH=false` → Use localStorage

### Media Uploads

```
1. Frontend requests signed URL → POST /profiles/:id/media/upload
2. Backend generates S3 presigned URL
3. Frontend uploads directly to S3
4. Frontend confirms completion → POST /profiles/:id/media/complete
5. Backend creates Media record in database
```

---

## Database Dictionary

All tables use PostgreSQL. Primary schema location: `/api/prisma/schema.prisma`

### Core Tables

#### `users`

User accounts and authentication.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `username` | String | No | Unique username |
| `email` | String | No | User's email address |
| `normalizedEmail` | String | No | Lowercase email for lookups |
| `emailVerified` | Boolean | No | Email verification status (default: false) |
| `emailVerifiedAt` | DateTime | Yes | When email was verified |
| `passwordHash` | String | No | Bcrypt hashed password |
| `displayName` | String | Yes | Display name |
| `bio` | String | Yes | Short user bio |
| `avatar` | String | Yes | Avatar image URL |
| `name` | String | Yes | Full name |
| `role` | String | No | User role (default: "artist") |
| `status` | String | No | Account status (default: "active") |
| `theme` | String | Yes | Theme preference: "light", "dark", or null |
| `onboardingComplete` | Boolean | No | Onboarding completion flag |
| `twoFactorEnabled` | Boolean | No | 2FA enabled flag |
| `twoFactorSecret` | String | Yes | TOTP secret (encrypted) |
| `profileComplete` | Boolean | No | Profile completion flag |
| `createdAt` | DateTime | No | Account creation timestamp |
| `updatedAt` | DateTime | No | Last update timestamp |

**Relationships:**
- Has one `Profile`
- Has many `Post`, `Reel`, `ConnectionRequest`, `Notification`, `Session`, etc.

**Indexes:**
- `email`, `normalizedEmail`, `username`, `status`, `createdAt`

---

#### `profiles`

Extended user profile information.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `userId` | UUID | No | Foreign key → `users.id` (unique) |
| `vanityUrl` | String | No | Unique URL slug (e.g., "john-doe") |
| `title` | String | Yes | **Professional title** (e.g., "Lead Actor") |
| `headline` | String | Yes | **DEPRECATED** - Use `title` instead |
| `bio` | String | Yes | Extended bio |
| `roles` | String[] | No | Array of roles (e.g., ["Actor", "Director"]) |
| `tags` | String[] | No | Profile tags for search |
| `location` | JSON | Yes | Location object: `{ city, state, country }` |
| `privacy` | JSON | No | Privacy settings |
| `socialLinks` | JSON | Yes | **DEPRECATED** - Use `profile_links` table |
| `bannerUrl` | String | Yes | Profile banner image URL |
| `budgetMin` | Int | Yes | Minimum budget preference |
| `budgetMax` | Int | Yes | Maximum budget preference |
| `createdAt` | DateTime | No | Creation timestamp |
| `updatedAt` | DateTime | No | Last update timestamp |

**Relationships:**
- Belongs to one `User` (via `userId`)
- Has many `Education`, `Credit`, `Media`, `ProfileLink`

**Indexes:**
- `vanityUrl`, `userId`, `roles`, `tags`

---

#### `education`

Educational background entries.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `profileId` | UUID | No | Foreign key → `profiles.id` |
| `institution` | String | No | School/university name |
| `program` | String | No | **Canonical field** - Degree/program (e.g., "BFA in Theater") |
| `startYear` | Int | Yes | Start year (YYYY) |
| `endYear` | Int | Yes | End year (YYYY) or null if ongoing |
| `achievements` | String | Yes | Notable achievements/awards |
| `createdAt` | DateTime | No | Creation timestamp |
| `updatedAt` | DateTime | No | Last update timestamp |

**Relationships:**
- Belongs to one `Profile` (via `profileId`)
- Cascade delete when profile deleted

**Indexes:**
- `profileId`

---

#### `profile_links`

Social and external profile links (normalized schema).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `userId` | UUID | No | Foreign key → `users.id` |
| `profileId` | UUID | No | Foreign key → `profiles.id` |
| `label` | String | No | Display label (e.g., "IMDb", "LinkedIn") |
| `url` | String | No | Full URL (validated) |
| `type` | String | No | Link type (e.g., "social", "portfolio") |
| `position` | Int | No | Display order (default: 0) |
| `createdAt` | DateTime | No | Creation timestamp |
| `updatedAt` | DateTime | No | Last update timestamp |

**Relationships:**
- Belongs to one `User` and one `Profile`
- Cascade delete when profile deleted

**Indexes:**
- `userId`, `profileId`, `userId + position`

**Validation Rules:**
- URL must be valid HTTPS (or HTTP for localhost)
- Label max length: 50 characters
- Max 10 links per profile

---

#### `posts`

User-generated posts (text, images, videos).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `content` | String | No | Post content (text) |
| `media` | String[] | No | Array of media URLs (legacy) |
| `tags` | String[] | No | Post tags for search |
| `authorId` | UUID | No | Foreign key → `users.id` |
| `mediaId` | UUID | Yes | Foreign key → `media.id` |
| `visibility` | String | No | "PUBLIC" or "FOLLOWERS" (default: "PUBLIC") |
| `createdAt` | DateTime | No | Creation timestamp |
| `updatedAt` | DateTime | No | Last update timestamp |

**Relationships:**
- Belongs to one `User` (via `authorId`)
- Optionally belongs to one `Media` record

**Indexes:**
- `authorId`, `createdAt`, `tags`, `mediaId`

**Visibility Logic:**
- `PUBLIC`: Visible to all users (appears in Explore feed)
- `FOLLOWERS`: Only visible to followers (appears in personalized feed)

---

#### `connection_requests`

Follow/connection requests between users.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `senderId` | UUID | No | Foreign key → `users.id` (requester) |
| `receiverId` | UUID | No | Foreign key → `users.id` (target) |
| `status` | String | No | "pending", "accepted", or "rejected" |
| `message` | String | Yes | Optional message with request |
| `createdAt` | DateTime | No | Request timestamp |
| `updatedAt` | DateTime | No | Last status change timestamp |

**Relationships:**
- Belongs to `User` as sender and receiver

**Indexes:**
- `senderId`, `receiverId`, `status`
- Unique constraint on `(senderId, receiverId)` pair

**Status Flow:**
```
pending → accepted (user follows sender)
pending → rejected (request denied)
```

---

#### `media`

Uploaded media files (images, videos, audio).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `profileId` | UUID | No | Foreign key → `profiles.id` |
| `type` | String | No | "image", "video", "audio" |
| `s3Key` | String | No | S3 object key |
| `posterS3Key` | String | Yes | Thumbnail/poster S3 key |
| `title` | String | Yes | Media title |
| `description` | String | Yes | Media description |
| `duration` | Int | Yes | Duration in seconds (for video/audio) |
| `width` | Int | Yes | Width in pixels (for images/video) |
| `height` | Int | Yes | Height in pixels (for images/video) |
| `fileSize` | Int | Yes | File size in bytes |
| `privacy` | String | No | "public" or "private" (default: "public") |
| `processedStatus` | String | No | "pending", "processing", "complete", "failed" |
| `metadata` | JSON | Yes | Additional metadata |
| `createdAt` | DateTime | No | Upload timestamp |
| `updatedAt` | DateTime | No | Last update timestamp |

**Relationships:**
- Belongs to one `Profile`
- Can be referenced by `Post` records

**Indexes:**
- `profileId`, `type`, `privacy`, `processedStatus`, `createdAt`

---

#### `credits`

Professional credits (roles in productions).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `profileId` | UUID | No | Foreign key → `profiles.id` |
| `title` | String | No | Production title |
| `role` | String | No | Role in production |
| `company` | String | Yes | Production company |
| `year` | Int | Yes | Year (YYYY) |
| `description` | String | Yes | Additional details |
| `orderIndex` | Int | No | Display order (default: 0) |
| `metadata` | JSON | Yes | Additional metadata |
| `createdAt` | DateTime | No | Creation timestamp |
| `updatedAt` | DateTime | No | Last update timestamp |

**Indexes:**
- `profileId`, `year`, `profileId + orderIndex`

---

#### `sessions`

Active user sessions (for session tracking feature).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `userId` | UUID | No | Foreign key → `users.id` |
| `token` | String | No | Session token (unique) |
| `ipAddress` | String | Yes | Client IP address |
| `userAgent` | String | Yes | Client user agent |
| `expiresAt` | DateTime | No | Expiration timestamp |
| `lastActivity` | DateTime | No | Last activity timestamp |
| `createdAt` | DateTime | No | Creation timestamp |

**Indexes:**
- `userId`, `token`, `expiresAt`, `userId + expiresAt`

---

#### `refresh_tokens`

Refresh tokens for authentication.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | String | No | Primary key |
| `userId` | UUID | No | Foreign key → `users.id` |
| `jti` | String | No | JWT ID (unique) |
| `expiresAt` | DateTime | No | Expiration timestamp |
| `invalidatedAt` | DateTime | Yes | When token was invalidated (revoked) |
| `createdAt` | DateTime | No | Creation timestamp |
| `lastUsedAt` | DateTime | No | Last use timestamp |

**Indexes:**
- `jti`, `userId`, `userId + invalidatedAt`

---

#### `notifications`

User notifications.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `type` | String | No | Notification type (e.g., "follow", "like") |
| `message` | String | No | Notification message |
| `recipientId` | UUID | No | Foreign key → `users.id` |
| `triggererId` | UUID | Yes | Foreign key → `users.id` (who triggered) |
| `isRead` | Boolean | No | Read status (default: false) |
| `metadata` | JSON | Yes | Additional context |
| `createdAt` | DateTime | No | Creation timestamp |

**Indexes:**
- `recipientId + isRead`, `createdAt`, `type`

---

#### `user_settings`

User preferences and settings.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `userId` | UUID | No | Foreign key → `users.id` (unique) |
| `notifications` | JSON | No | Notification preferences |
| `accountSecurity` | JSON | No | Security settings |
| `privacy` | JSON | No | Privacy settings |
| `billing` | JSON | Yes | Billing information |
| `createdAt` | DateTime | No | Creation timestamp |
| `updatedAt` | DateTime | No | Last update timestamp |

---

### Supporting Tables

#### `conversations` & `conversation_participants`
Direct messaging system (conversation threads and participants).

#### `messages`
Individual messages within conversations.

#### `reels`
Short-form video content (TikTok-style).

#### `reel_requests`
Requests to use another user's media in a reel.

#### `comments`, `likes`, `bookmarks`
Engagement actions on reels.

#### `email_verification_tokens`
Tokens for email verification during registration.

#### `password_reset_tokens`
Tokens for password reset flow.

#### `two_factor_recovery_codes`
Backup codes for 2FA recovery.

#### `audit_logs`
Security audit trail for sensitive actions.

#### `analytics_events`
Event tracking for analytics.

#### `moderation_reports` & `moderation_actions`
Content moderation system.

---

## API Reference

**Base URL:**
- Local: `http://localhost:3001`
- Staging: `https://<api-id>.execute-api.us-west-2.amazonaws.com/dev`
- Production: `https://<api-id>.execute-api.us-west-2.amazonaws.com/prod`

**Authentication:** Most endpoints require `Authorization: Bearer <token>` header or HttpOnly cookies.

---

### Auth Endpoints

#### POST `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "displayName": "John Doe"
}
```

**Success Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "displayName": "John Doe",
    "emailVerified": false
  },
  "token": "jwt-access-token",
  "refreshToken": "jwt-refresh-token"
}
```

**Error Responses:**
- `400`: Validation error (weak password, invalid email)
- `403`: Registration disabled or email not allowlisted
- `409`: Username or email already exists

**Notes:**
- Registration can be disabled via `ENABLE_REGISTRATION=false`
- Email allowlist enforced via `ALLOWED_USER_EMAILS` env var

---

#### POST `/auth/login`

Authenticate user and get tokens.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "displayName": "John Doe",
    "emailVerified": true
  },
  "token": "jwt-access-token",
  "refreshToken": "jwt-refresh-token"
}
```

**Error Responses:**
- `401`: Invalid credentials
- `403`: Email not allowlisted (if allowlist enabled)
- `404`: User not found

---

#### POST `/auth/refresh`

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Success Response (200):**
```json
{
  "token": "new-jwt-access-token",
  "refreshToken": "new-jwt-refresh-token"
}
```

**Error Responses:**
- `401`: Invalid or expired refresh token

---

#### POST `/auth/logout`

Invalidate refresh token and log out.

**Headers:**
- `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

#### GET `/auth/me`

Get current authenticated user profile.

**Headers:**
- `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "id": "uuid",
  "username": "johndoe",
  "email": "john@example.com",
  "displayName": "John Doe",
  "avatar": "https://...",
  "theme": "light",
  "profile": {
    "id": "uuid",
    "vanityUrl": "john-doe",
    "title": "Lead Actor",
    "bio": "..."
  }
}
```

**Error Responses:**
- `401`: Not authenticated

---

### Profile Endpoints

#### GET `/profiles/:id`

Get profile by user ID.

**Parameters:**
- `id`: User UUID

**Success Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "vanityUrl": "john-doe",
  "title": "Lead Actor",
  "bio": "Professional actor...",
  "roles": ["Actor", "Voice Actor"],
  "tags": ["drama", "comedy"],
  "location": {
    "city": "Los Angeles",
    "state": "CA",
    "country": "USA"
  },
  "bannerUrl": "https://...",
  "socialLinks": null,
  "user": {
    "username": "johndoe",
    "displayName": "John Doe",
    "avatar": "https://..."
  }
}
```

**Error Responses:**
- `404`: Profile not found

---

#### GET `/profiles/vanity/:vanityUrl`

Get profile by vanity URL slug.

**Parameters:**
- `vanityUrl`: URL slug (e.g., "john-doe")

**Success Response (200):**
Same as GET `/profiles/:id`

---

#### PATCH `/profiles/:id`

Update profile (authenticated user only).

**Headers:**
- `Authorization: Bearer <token>`

**Request Body (partial):**
```json
{
  "title": "Senior Actor",
  "bio": "Updated bio...",
  "roles": ["Actor", "Director"],
  "location": {
    "city": "New York",
    "state": "NY"
  }
}
```

**Success Response (200):**
```json
{
  "id": "uuid",
  "title": "Senior Actor",
  "bio": "Updated bio...",
  ...
}
```

**Error Responses:**
- `401`: Not authenticated
- `403`: Not authorized (can only edit own profile)
- `404`: Profile not found

---

### Education Endpoints

#### GET `/profiles/:id/education`

Get all education entries for a profile.

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "institution": "Juilliard School",
    "program": "BFA in Drama",
    "startYear": 2015,
    "endYear": 2019,
    "achievements": "Dean's List",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

---

#### POST `/profiles/:id/education`

Add education entry.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "institution": "Juilliard School",
  "program": "BFA in Drama",
  "startYear": 2015,
  "endYear": 2019,
  "achievements": "Dean's List"
}
```

**Success Response (201):**
```json
{
  "id": "uuid",
  "institution": "Juilliard School",
  "program": "BFA in Drama",
  ...
}
```

**Error Responses:**
- `401`: Not authenticated
- `403`: Not authorized
- `400`: Validation error (missing required fields)

---

#### PATCH `/profiles/:profileId/education/:id`

Update education entry.

**Request Body (partial):**
```json
{
  "endYear": 2020,
  "achievements": "Summa Cum Laude"
}
```

**Success Response (200):**
Updated education object.

---

#### DELETE `/profiles/:profileId/education/:id`

Delete education entry.

**Success Response (204):**
No content.

---

### Post & Feed Endpoints

#### GET `/posts`

Get public posts (Explore feed).

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)

**Success Response (200):**
```json
{
  "posts": [
    {
      "id": "uuid",
      "content": "Check out my latest reel!",
      "media": ["https://..."],
      "tags": ["acting", "demo"],
      "visibility": "PUBLIC",
      "createdAt": "2024-01-01T00:00:00Z",
      "author": {
        "id": "uuid",
        "username": "johndoe",
        "displayName": "John Doe",
        "avatar": "https://..."
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

---

#### GET `/feed`

Get personalized feed (posts from followed users).

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `page`, `limit` (same as above)

**Success Response (200):**
Same structure as `/posts`, but includes FOLLOWERS-only posts from connections.

---

#### POST `/posts`

Create a new post.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "content": "Check out my latest reel!",
  "media": ["https://s3-url/media.jpg"],
  "tags": ["acting", "demo"],
  "visibility": "PUBLIC"
}
```

**Success Response (201):**
```json
{
  "id": "uuid",
  "content": "Check out my latest reel!",
  "media": ["https://..."],
  "tags": ["acting", "demo"],
  "visibility": "PUBLIC",
  "authorId": "uuid",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Error Responses:**
- `401`: Not authenticated
- `400`: Validation error (empty content, invalid visibility)

---

### Connection Endpoints

#### POST `/connections/request`

Send a follow/connection request.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "receiverId": "target-user-uuid",
  "message": "I'd love to connect!"
}
```

**Success Response (201):**
```json
{
  "id": "uuid",
  "senderId": "your-uuid",
  "receiverId": "target-user-uuid",
  "status": "pending",
  "message": "I'd love to connect!",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Error Responses:**
- `400`: Cannot send request to yourself
- `409`: Request already exists

---

#### GET `/connections/requests`

Get pending connection requests (received).

**Headers:**
- `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "requests": [
    {
      "id": "uuid",
      "status": "pending",
      "message": "I'd love to connect!",
      "createdAt": "2024-01-01T00:00:00Z",
      "sender": {
        "id": "uuid",
        "username": "janedoe",
        "displayName": "Jane Doe",
        "avatar": "https://..."
      }
    }
  ]
}
```

---

#### POST `/connections/:requestId/accept`

Accept a connection request.

**Success Response (200):**
```json
{
  "id": "uuid",
  "status": "accepted",
  ...
}
```

---

#### POST `/connections/:requestId/reject`

Reject a connection request.

**Success Response (200):**
```json
{
  "id": "uuid",
  "status": "rejected",
  ...
}
```

---

### Profile Links Endpoints

#### GET `/profiles/:id/links`

Get all profile links.

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "label": "IMDb",
    "url": "https://www.imdb.com/name/nm1234567/",
    "type": "social",
    "position": 0
  }
]
```

---

#### POST `/profiles/:id/links`

Add a profile link.

**Request Body:**
```json
{
  "label": "IMDb",
  "url": "https://www.imdb.com/name/nm1234567/",
  "type": "social"
}
```

**Success Response (201):**
Link object.

---

#### PATCH `/profiles/:profileId/links/:id`

Update a profile link.

**Request Body:**
```json
{
  "label": "Updated Label",
  "url": "https://new-url.com"
}
```

---

#### DELETE `/profiles/:profileId/links/:id`

Delete a profile link.

**Success Response (204):**
No content.

---

### Theme Preference Endpoints

#### GET `/auth/me/preferences`

Get user preferences (including theme).

**Headers:**
- `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "theme": "light"
}
```

---

#### PATCH `/auth/me/preferences`

Update user preferences.

**Request Body:**
```json
{
  "theme": "dark"
}
```

**Success Response (200):**
```json
{
  "theme": "dark"
}
```

**Valid theme values:** `"light"`, `"dark"`, or `null` (system default)

---

### Dashboard Stats Endpoints

#### GET `/dashboard/stats`

Get 7-day dashboard statistics.

**Headers:**
- `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "profileViews": 42,
  "engagement": 15,
  "newFollowers": 3,
  "period": "7d"
}
```

**Caching:**
- `Cache-Control: private, max-age=60`

**Definition of "engagement":**
- Likes + comments + bookmarks on user's content (last 7 days)

---

## Workflow Walkthroughs

### 1. Account Creation → Login → Profile View

#### Step 1: Create Account

```powershell
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "username": "johndoe", "email": "john@example.com", "password": "SecurePass123!", "displayName": "John Doe" }' -ContentType 'application/json'```

**Response:**
```json
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Step 2: Login (if not using registration token)

```powershell
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "email": "john@example.com", "password": "SecurePass123!" }' -ContentType 'application/json'```

#### Step 3: Get Own Profile

```powershell
Invoke-RestMethod -Uri "https://api.projectvaline.com/auth/me" -Method Get -Headers @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}```

**Expected Flow:**
1. User data returned from `/auth/me`
2. Frontend checks `user.profile` (should exist due to auto-creation)
3. If `profile.vanityUrl` exists → Navigate to `/profile/{vanityUrl}`

---

### 2. Edit Profile → Update Title → Verify Changes

#### Step 1: Get Current Profile

```powershell
Invoke-RestMethod -Uri "https://api.projectvaline.com/profiles/<user-id>" -Method Get -Headers @{
    "Authorization" = "Bearer <token>"
}```

#### Step 2: Update Profile Title

```powershell
Invoke-RestMethod -Uri "-X" -Method Patch -Headers @{
    "Authorization" = "Bearer <token>"
    "Content-Type" = "application/json"
} -Body '{ "title": "Senior Voice Actor" }' -ContentType 'application/json'```

#### Step 3: Verify Changes

```powershell
Invoke-RestMethod -Uri "https://api.projectvaline.com/profiles/<user-id>" -Method Get -Headers @{
    "Authorization" = "Bearer <token>"
}```

**Expected:**
- `profile.title` should now be `"Senior Voice Actor"`
- `profile.updatedAt` should be updated

---

### 3. Add Education → Verify Under Profile

#### Step 1: Add Education Entry

```powershell
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Authorization" = "Bearer <token>"
    "Content-Type" = "application/json"
} -Body '{ "institution": "Yale School of Drama", "program": "MFA in Acting", "startYear": 2018, "endYear": 2021, "achievements": "Outstanding Performance Award" }' -ContentType 'application/json'```

**Response:**
```json
{
  "id": "edu-uuid",
  "profileId": "profile-uuid",
  "institution": "Yale School of Drama",
  "program": "MFA in Acting",
  ...
}
```

#### Step 2: Verify Education on Profile

```powershell
Invoke-RestMethod -Uri "https://api.projectvaline.com/profiles/<profile-id>/education" -Method Get -Headers @{
    "Authorization" = "Bearer <token>"
}```

**Expected:**
- Array contains newly added education entry
- Ordered by `startYear` descending (most recent first)

---

### 4. Create Post → See on Dashboard → See on Profile → See in Explore

#### Step 1: Create Public Post

```powershell
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Authorization" = "Bearer <token>"
    "Content-Type" = "application/json"
} -Body '{ "content": "Just wrapped filming my latest project!", "tags": ["acting", "film"], "visibility": "PUBLIC" }' -ContentType 'application/json'```

**Response:**
```json
{
  "id": "post-uuid",
  "content": "Just wrapped filming my latest project!",
  "authorId": "user-uuid",
  "visibility": "PUBLIC",
  "createdAt": "2024-01-01T12:00:00Z"
}
```

#### Step 2: See Post on Dashboard (Own Feed)

Navigate to: `https://app.projectvaline.com/dashboard`

**API Call:**
```powershell
Invoke-RestMethod -Uri "https://api.projectvaline.com/feed" -Method Get -Headers @{
    "Authorization" = "Bearer <token>"
}```

**Expected:**
- Post appears in personalized feed
- Shows author info, content, tags

#### Step 3: See Post on Profile

Navigate to: `https://app.projectvaline.com/profile/{vanityUrl}`

**API Call:**
```powershell
Invoke-RestMethod -Uri "https://api.projectvaline.com/profiles/<user-id>/posts" -Method Get -Headers @{
    "Authorization" = "Bearer <token>"
}```

**Expected:**
- Post appears in user's post list

#### Step 4: See Post in Explore (Public Feed)

Navigate to: `https://app.projectvaline.com/explore`

**API Call:**
```powershell
Invoke-RestMethod -Uri "https://api.projectvaline.com/posts" -Method Get
```

**Expected:**
- Post appears because `visibility: "PUBLIC"`
- No auth token required for Explore

---

### 5. Search User → Send Follow Request → Accept → See Posts in Feed

#### Step 1: Search for User

```powershell
Invoke-RestMethod -Uri "https://api.projectvaline.com/search/users?q=janedoe" -Method Get -Headers @{
    "Authorization" = "Bearer <token>"
}```

**Response:**
```json
{
  "users": [
    {
      "id": "target-user-uuid",
      "username": "janedoe",
      "displayName": "Jane Doe",
      "avatar": "https://..."
    }
  ]
}
```

#### Step 2: Send Follow Request

```powershell
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Authorization" = "Bearer <token>"
    "Content-Type" = "application/json"
} -Body '{ "receiverId": "target-user-uuid", "message": "Love your work!" }' -ContentType 'application/json'```

**Response:**
```json
{
  "id": "request-uuid",
  "senderId": "your-uuid",
  "receiverId": "target-user-uuid",
  "status": "pending"
}
```

#### Step 3: Target User Accepts Request

(Jane Doe logs in and accepts)

```powershell
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Authorization" = "Bearer <jane-token>"
}```

**Response:**
```json
{
  "id": "request-uuid",
  "status": "accepted"
}
```

#### Step 4: See Jane's Posts in Your Feed

```powershell
Invoke-RestMethod -Uri "https://api.projectvaline.com/feed" -Method Get -Headers @{
    "Authorization" = "Bearer <your-token>"
}```

**Expected:**
- Jane's `FOLLOWERS` visibility posts now appear in your feed
- Jane's `PUBLIC` posts also appear

---

## Troubleshooting Runbooks

See dedicated troubleshooting guide: [docs/backend/troubleshooting-auth-profile-posts.md](./backend/troubleshooting-auth-profile-posts.md)

**Quick Reference Commands:**

### Check User Profile

```powershell
psql $DATABASE_URL -c "SELECT id, email, username, \"displayName\" FROM users WHERE email = 'ghawk075@gmail.com';"
```

### Check Profile Record

```powershell
psql $DATABASE_URL -c "SELECT * FROM profiles WHERE \"userId\" = '<user-id>';"
```

### Check Education Entries

```powershell
psql $DATABASE_URL -c "SELECT * FROM education WHERE \"profileId\" = '<profile-id>';"
```

### Check Posts

```powershell
psql $DATABASE_URL -c "SELECT id, content, visibility, \"authorId\", \"createdAt\" FROM posts WHERE \"authorId\" = '<user-id>' ORDER BY \"createdAt\" DESC LIMIT 10;"
```

### Check Lambda Logs (AWS)

```powershell
# Tail recent logs
aws logs tail /aws/lambda/pv-api-prod-<function-name> --since 5m

# Get function configuration
aws lambda get-function-configuration --function-name pv-api-prod-<function-name>
```

---

## Environment Configuration

See: [docs/ENV_CHECKLIST.md](./ENV_CHECKLIST.md) for complete environment variable reference.

**Key Variables:**

### Frontend (VITE_*)
- `VITE_API_BASE`: API Gateway URL (NOT CloudFront)
- `VITE_ENABLE_AUTH`: Enable HttpOnly cookie auth
- `VITE_ENABLE_REGISTRATION`: Show signup UI
- `VITE_ALLOWED_USER_EMAILS`: Client-side email allowlist

### Backend (Serverless/Lambda)
- `DATABASE_URL`: PostgreSQL connection string
- `AUTH_JWT_SECRET`: JWT signing secret (256-bit random)
- `ALLOWED_USER_EMAILS`: Server-side email allowlist (primary enforcement)
- `ENABLE_REGISTRATION`: Enable/disable registration endpoint
- `NODE_ENV`: `production` or `development`

---

## Deployment Guide

### Prerequisites
- AWS CLI configured
- Node.js 18+
- PostgreSQL database (RDS)

### Backend Deployment

```powershell
cd serverless
npm install
npx serverless deploy --stage prod
```

**Post-Deployment:**
1. Note API Gateway URL from output
2. Update frontend `VITE_API_BASE` environment variable
3. Run database migrations: `npx prisma migrate deploy`
4. Verify health endpoint: `Invoke-RestMethod -Uri "https://<api-url>/health"`

### Frontend Deployment

```powershell
# Build frontend
npm run build

# Deploy to S3
aws s3 sync dist/ s3://your-bucket-name/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id <dist-id> --paths "/*"
```

---

## Additional Resources

- [Backend Deployment Guide](./BACKEND-DEPLOYMENT.md)
- [Troubleshooting Runbook](./backend/troubleshooting-auth-profile-posts.md)
- [Environment Variables Checklist](./ENV_CHECKLIST.md)
- [Legacy Express Server README](../server/README.md)
- [API Documentation](../serverless/API_DOCUMENTATION.md)

---

**Questions or Issues?**

For production issues, check:
1. CloudWatch logs for Lambda functions
2. RDS database connectivity and query performance
3. API Gateway request/response logs
4. Frontend CloudFront access logs

For development issues:
- Use `VITE_DEBUG_API=true` for verbose frontend API logs
- Check `window.__diagnostics.summary()` in browser console
- Review serverless offline logs for local backend debugging
