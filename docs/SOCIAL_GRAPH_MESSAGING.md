# Social Graph & Messaging System

## Overview

This document describes the social graph and messaging system implemented in Project Valine, which enables users to follow each other, block unwanted interactions, send direct messages (DMs), and receive notifications about social interactions.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Models](#data-models)
3. [Backend API Endpoints](#backend-api-endpoints)
4. [Frontend Services](#frontend-services)
5. [User Interface Components](#user-interface-components)
6. [Block Enforcement](#block-enforcement)
7. [Migration Guide](#migration-guide)
8. [Testing](#testing)
9. [Manual QA Checklist](#manual-qa-checklist)

---

## Architecture Overview

The social graph and messaging system consists of three main layers:

1. **Data Layer**: Prisma models for Follow, Block, MessageThread, DirectMessage, and extended Notification models
2. **API Layer**: Serverless handlers for follow/unfollow, block/unblock, DM threads, and notifications
3. **UI Layer**: React components and services for user interactions

### Key Features

- ✅ **Follow/Unfollow**: Users can follow and unfollow each other
- ✅ **Block/Unblock**: Users can block others to prevent interactions
- ✅ **Direct Messaging**: 1-to-1 DM threads with post forwarding support
- ✅ **Notifications**: FOLLOW and MESSAGE notification types with auto mark-as-read
- ✅ **Follower Counts**: Denormalized counts updated transactionally
- ✅ **Block Enforcement**: Blocks prevent follows, DMs, and filter user lists

---

## Data Models

### Follow Model

```prisma
model Follow {
  id          String   @id @default(cuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())

  follower    User     @relation("UserFollows", fields: [followerId], references: [id], onDelete: Cascade)
  following   User     @relation("UserFollowedBy", fields: [followingId], references: [id], onDelete: Cascade)

  @@unique([followerId, followingId])
  @@index([followerId])
  @@index([followingId])
  @@map("follows")
}
```

**Purpose**: Tracks follower relationships between users.

**Key Points**:
- Unique constraint on `[followerId, followingId]` prevents duplicate follows
- Cascade delete when user is deleted
- Indexed for efficient queries

### Block Model

```prisma
model Block {
  id        String   @id @default(cuid())
  blockerId String
  blockedId String
  createdAt DateTime @default(now())

  blocker   User     @relation("UserBlocks", fields: [blockerId], references: [id], onDelete: Cascade)
  blocked   User     @relation("UserBlockedBy", fields: [blockedId], references: [id], onDelete: Cascade)

  @@unique([blockerId, blockedId])
  @@index([blockerId])
  @@index([blockedId])
  @@map("blocks")
}
```

**Purpose**: Tracks block relationships between users.

**Key Points**:
- Unique constraint prevents duplicate blocks
- When blocking, all follow relationships are removed
- Block is directional (A blocks B doesn't mean B blocks A)

### MessageThread Model

```prisma
model MessageThread {
  id            String         @id @default(cuid())
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  userAId       String
  userBId       String

  userA         User           @relation("UserThreadA", fields: [userAId], references: [id], onDelete: Cascade)
  userB         User           @relation("UserThreadB", fields: [userBId], references: [id], onDelete: Cascade)
  messages      DirectMessage[]
  notifications Notification[]

  @@unique([userAId, userBId])
  @@index([userAId])
  @@index([userBId])
  @@index([updatedAt])
  @@map("message_threads")
}
```

**Purpose**: Represents a 1-to-1 conversation thread between two users.

**Key Points**:
- Unique constraint on `[userAId, userBId]` ensures one thread per pair
- User IDs are normalized (userAId < userBId) for consistent lookups
- `updatedAt` tracks last message time for sorting

### DirectMessage Model

```prisma
model DirectMessage {
  id              String        @id @default(cuid())
  threadId        String
  senderId        String
  body            String
  createdAt       DateTime      @default(now())
  readAt          DateTime?
  forwardedPostId String?

  thread          MessageThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  sender          User          @relation(fields: [senderId], references: [id], onDelete: Cascade)
  forwardedPost   Post?         @relation("forwardedPost", fields: [forwardedPostId], references: [id], onDelete: SetNull)

  @@index([threadId])
  @@index([senderId])
  @@index([createdAt])
  @@index([forwardedPostId])
  @@map("direct_messages")
}
```

**Purpose**: Individual messages within a thread.

**Key Points**:
- `readAt` timestamp for read receipts (marked when viewing thread)
- `forwardedPostId` enables sharing posts in DMs
- Body can be empty if forwarding a post
- SetNull on post deletion (keep message but clear reference)

### Extended Notification Model

```prisma
enum NotificationType {
  FOLLOW
  MESSAGE
  LIKE
  COMMENT
  MENTION
  REQUEST
  SYSTEM
}

model Notification {
  id               String            @id @default(uuid())
  type             String
  message          String
  recipientId      String
  triggererId      String?
  isRead           Boolean           @default(false)
  metadata         Json?
  createdAt        DateTime          @default(now())
  postId           String?
  messageThreadId  String?
  messageId        String?
  
  recipient        User              @relation("recipient", fields: [recipientId], references: [id], onDelete: Cascade)
  triggerer        User?             @relation("triggerer", fields: [triggererId], references: [id])
  messageThread    MessageThread?    @relation(fields: [messageThreadId], references: [id], onDelete: SetNull)
  directMessage    Message?          @relation(fields: [messageId], references: [id], onDelete: SetNull)

  @@index([recipientId, isRead])
  @@index([createdAt])
  @@index([type])
  @@index([messageThreadId])
  @@index([messageId])
  @@map("notifications")
}
```

**Purpose**: Tracks user notifications for various events.

**Key Points**:
- Added `messageThreadId` and `messageId` for DM notifications
- `FOLLOW` type for new followers
- `MESSAGE` type for new messages
- Auto mark-as-read when viewing notifications page

### Extended Profile Model

```prisma
model Profile {
  // ... existing fields ...
  followersCount      Int             @default(0)
  followingCount      Int             @default(0)
  // ... rest of model ...
}
```

**Purpose**: Denormalized follower counts for performance.

**Key Points**:
- Updated transactionally with Follow create/delete
- Provides O(1) count access instead of count queries
- Displayed on profile header

---

## Backend API Endpoints

### Follow/Unfollow Endpoints

#### POST /profiles/{profileId}/follow

Creates a follow relationship.

**Authentication**: Required

**Request Path Parameters**:
- `profileId` (string): Target user's profile ID

**Response**:
```json
{
  "isFollowing": true,
  "message": "Successfully followed user"
}
```

**Side Effects**:
- Creates `Follow` record
- Increments `followersCount` on target profile
- Increments `followingCount` on current user profile
- Creates `FOLLOW` notification for target user

**Error Cases**:
- 400: Cannot follow yourself
- 403: Cannot follow blocked user or user who blocked you
- 404: Profile not found

#### DELETE /profiles/{profileId}/follow

Removes a follow relationship.

**Authentication**: Required

**Request Path Parameters**:
- `profileId` (string): Target user's profile ID

**Response**:
```json
{
  "isFollowing": false,
  "message": "Successfully unfollowed user"
}
```

**Side Effects**:
- Deletes `Follow` record
- Decrements `followersCount` on target profile
- Decrements `followingCount` on current user profile

#### GET /profiles/{profileId}/followers

Lists followers of a profile.

**Authentication**: Optional (filters by blocks if authenticated)

**Request Path Parameters**:
- `profileId` (string): Profile ID

**Response**:
```json
{
  "items": [
    {
      "userId": "user-id",
      "username": "username",
      "displayName": "Display Name",
      "avatar": "avatar-url",
      "title": "Professional Title",
      "profileId": "profile-id",
      "vanityUrl": "vanity-url",
      "followedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 10
}
```

**Filtering**:
- Excludes users blocked by viewer or who blocked viewer
- Returns empty list if profile not found

#### GET /profiles/{profileId}/following

Lists users a profile is following.

**Authentication**: Optional (filters by blocks if authenticated)

**Request Path Parameters**:
- `profileId` (string): Profile ID

**Response**: Same format as followers endpoint

#### GET /me/followers

Lists current user's followers.

**Authentication**: Required

**Response**: Same format as followers endpoint

#### GET /me/following

Lists users current user is following.

**Authentication**: Required

**Response**: Same format as following endpoint

#### GET /profiles/{profileId}/status

Gets follow and block status with a profile.

**Authentication**: Required

**Request Path Parameters**:
- `profileId` (string): Profile ID

**Response**:
```json
{
  "isFollowing": true,
  "isFollowedBy": false,
  "isBlocked": false,
  "isBlockedBy": false
}
```

### Block/Unblock Endpoints

#### POST /profiles/{profileId}/block

Blocks a user.

**Authentication**: Required

**Request Path Parameters**:
- `profileId` (string): Target user's profile ID

**Response**:
```json
{
  "isBlocked": true,
  "message": "Successfully blocked user"
}
```

**Side Effects**:
- Creates `Block` record
- Removes all follow relationships between users (both directions)
- Updates follower counts accordingly
- No notification sent (privacy consideration)

**Error Cases**:
- 400: Cannot block yourself
- 404: Profile not found

#### DELETE /profiles/{profileId}/block

Unblocks a user.

**Authentication**: Required

**Request Path Parameters**:
- `profileId` (string): Target user's profile ID

**Response**:
```json
{
  "isBlocked": false,
  "message": "Successfully unblocked user"
}
```

#### GET /me/blocks

Lists users current user has blocked.

**Authentication**: Required

**Response**:
```json
{
  "items": [
    {
      "userId": "user-id",
      "username": "username",
      "displayName": "Display Name",
      "avatar": "avatar-url",
      "title": "Professional Title",
      "profileId": "profile-id",
      "vanityUrl": "vanity-url",
      "blockedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 5
}
```

### Direct Messaging Endpoints

#### GET /me/messages/threads

Lists DM threads for current user.

**Authentication**: Required

**Query Parameters**:
- `limit` (number, default: 50): Max threads to return
- `cursor` (string, optional): Pagination cursor

**Response**:
```json
{
  "items": [
    {
      "id": "thread-id",
      "otherUser": {
        "userId": "user-id",
        "username": "username",
        "displayName": "Display Name",
        "avatar": "avatar-url",
        "title": "Professional Title",
        "profileId": "profile-id",
        "vanityUrl": "vanity-url"
      },
      "lastMessage": {
        "id": "message-id",
        "body": "Last message text",
        "senderId": "sender-id",
        "createdAt": "2024-01-01T00:00:00Z",
        "readAt": "2024-01-01T00:05:00Z",
        "forwardedPost": null
      },
      "unreadCount": 2,
      "messageCount": 15,
      "updatedAt": "2024-01-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "nextCursor": "cursor-string",
  "hasMore": true
}
```

#### POST /me/messages/threads

Creates or gets existing DM thread with another user.

**Authentication**: Required

**Request Body**:
```json
{
  "recipientUserId": "user-id"
}
```

**Response**:
```json
{
  "id": "thread-id",
  "otherUser": {
    "userId": "user-id",
    "username": "username",
    "displayName": "Display Name",
    "avatar": "avatar-url",
    "title": "Professional Title",
    "profileId": "profile-id",
    "vanityUrl": "vanity-url"
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Status Codes**:
- 200: Existing thread returned
- 201: New thread created

**Error Cases**:
- 400: Cannot create thread with yourself, recipientUserId required
- 403: Cannot create thread with blocked user

#### GET /me/messages/threads/{threadId}

Gets messages in a DM thread.

**Authentication**: Required

**Request Path Parameters**:
- `threadId` (string): Thread ID

**Query Parameters**:
- `limit` (number, default: 50): Max messages to return
- `cursor` (string, optional): Pagination cursor

**Response**:
```json
{
  "thread": {
    "id": "thread-id",
    "otherUser": {
      "userId": "user-id",
      "username": "username",
      "displayName": "Display Name",
      "avatar": "avatar-url"
    }
  },
  "messages": [
    {
      "id": "message-id",
      "body": "Message text",
      "senderId": "sender-id",
      "createdAt": "2024-01-01T00:00:00Z",
      "readAt": null,
      "forwardedPost": {
        "id": "post-id",
        "content": "Post content",
        "media": ["url1", "url2"],
        "createdAt": "2024-01-01T00:00:00Z",
        "author": {
          "id": "author-id",
          "username": "author-username",
          "displayName": "Author Name",
          "avatar": "avatar-url"
        }
      }
    }
  ],
  "nextCursor": "cursor-string",
  "hasMore": false
}
```

**Side Effects**:
- Automatically marks unread messages as read
- Updates `readAt` timestamp for messages from other user

**Error Cases**:
- 403: Not authorized to view this thread
- 404: Thread not found

#### POST /me/messages/threads/{threadId}/messages

Sends a message in a DM thread.

**Authentication**: Required

**Request Path Parameters**:
- `threadId` (string): Thread ID

**Request Body**:
```json
{
  "body": "Message text",
  "forwardedPostId": "post-id"
}
```

**Note**: Either `body` or `forwardedPostId` is required. Body can be empty when forwarding a post.

**Response**:
```json
{
  "message": {
    "id": "message-id",
    "body": "Message text",
    "senderId": "sender-id",
    "createdAt": "2024-01-01T00:00:00Z",
    "readAt": null,
    "forwardedPost": null
  }
}
```

**Side Effects**:
- Updates thread `updatedAt` timestamp
- Creates `MESSAGE` notification for recipient

**Error Cases**:
- 400: Body or forwardedPostId required
- 403: Not authorized to send in this thread, or blocked user
- 404: Thread not found, post not found

### Notification Endpoints

Existing notification endpoints already support the new types:

- `GET /notifications` - Returns all notifications including FOLLOW and MESSAGE types
- `PATCH /notifications/{id}/read` - Marks individual notification as read
- `PATCH /notifications/read-all` - Marks all notifications as read
- `GET /unread-counts` - Returns counts for notifications and messages

---

## Frontend Services

### connectionService.js

Extended with new social graph functions:

```javascript
// Follow/unfollow by profile ID
followProfile(profileId)
unfollowProfile(profileId)

// Block/unblock by profile ID
blockProfile(profileId)
unblockProfile(profileId)

// Lists
getProfileFollowers(profileId)
getProfileFollowing(profileId)
getMyFollowers()
getMyFollowing()
getMyBlocks()

// Status
getProfileStatus(profileId) // Returns isFollowing, isFollowedBy, isBlocked, isBlockedBy
```

### messagesService.js

Extended with DM thread functions:

```javascript
// Thread management
getThreads(limit, cursor)
createThread(recipientUserId)
getThread(threadId, limit, cursor)

// Messaging
sendThreadMessage(threadId, body, forwardedPostId)
```

### notificationsService.js

Already has all needed functions:

```javascript
getNotifications(params)
markNotificationRead(id)
markAllNotificationsRead()
getUnreadCounts()
```

---

## User Interface Components

### Profile Page Updates

**Location**: `src/pages/Profile.jsx`

**New Features**:

1. **Follow Button**:
   - Uses `followProfile`/`unfollowProfile` based on profile ID
   - Shows "Follow" or "Following" state
   - Handles loading and error states

2. **Message Button**:
   - Creates/gets thread with `createThread`
   - Navigates to `/inbox/${threadId}`
   - Hidden if blocked or blocker

3. **Three-Dot Menu**:
   - Block/Unblock option with confirmation dialog
   - Future: Report User placeholder

4. **Clickable Follower/Following Counts**:
   - Opens `FollowersListModal` with appropriate type
   - Shows real-time counts from profile

5. **Blocked State**:
   - Shows "Blocked" pill when user is blocked
   - Hides Follow and Message buttons
   - Shows empty state for posts tab

### FollowersListModal Component

**Location**: `src/components/FollowersListModal.jsx`

**Props**:
```javascript
{
  isOpen: boolean,
  onClose: function,
  profileId: string,
  type: 'followers' | 'following',
  count: number
}
```

**Features**:
- Lists users with avatar, name, title
- Client-side search/filter by username or name
- Each user has Follow/Following button
- Scrollable list with proper empty states

### Inbox Page Updates

**Location**: `src/pages/Inbox.jsx`

**Changes**:
- Uses `getThreads()` instead of `getConversations()`
- Shows unread count badge (red bubble with number)
- Displays relative timestamps ("2m ago", "5h ago")
- Navigates to `/inbox/${threadId}` on click
- Empty state: "Start a conversation from someone's profile."

### Conversation Page Updates

**Location**: `src/pages/Conversation.jsx`

**Changes**:
- Fetches thread with `getThread(threadId)`
- Sends messages with `sendThreadMessage(threadId, body, forwardedPostId)`
- Shows forwarded post previews in messages:
  - Compact card with post content (truncated)
  - Author name
  - "Shared post" label
- Forwarded post preview in composer (removable)
- Textarea supports Enter to send, Shift+Enter for new line
- Header shows other user's avatar, name, and title
- Auto-marks messages as read on view

### PostCard Updates

**Location**: `src/components/PostCard.jsx`

**New Feature**:
- "Share via DM" menu item (MessageSquare icon)
- Creates thread with post author
- Navigates to conversation with forwarded post in state
- Shows loading state while creating thread

### Notifications Page Updates

**Location**: `src/pages/Notifications.jsx`

**New Features**:

1. **FOLLOW Notifications**:
   - Message: "@username started following you"
   - Click navigates to follower's profile
   - Shows triggerer's avatar

2. **MESSAGE Notifications**:
   - Message: "New message from @username"
   - Click navigates to `/inbox/${messageThreadId}`
   - Shows triggerer's avatar

3. **Auto Mark-as-Read**:
   - All notifications marked as read on page load
   - Updates unread badge counts

4. **Enhanced UI**:
   - Date grouping: "Today", "This week", "Earlier"
   - Unread indicators: bold text, green badge, blue highlight
   - Relative timestamps with `formatTime` utility

### NotificationBell Updates

**Location**: `src/components/NotificationBell.jsx`, `src/layouts/AppLayout.jsx`

**Changes**:
- Shows "99+" for counts > 99 (was "9+")
- Already polls `getUnreadCounts()` every 30 seconds
- Badge updates reactively when notifications marked as read

---

## Block Enforcement

Blocks are enforced throughout the system to prevent unwanted interactions:

### Backend Enforcement

1. **Follow Operations**:
   - Check for blocks before creating follow
   - Cannot follow if either user has blocked the other

2. **Message Thread Creation**:
   - Check for blocks before creating thread
   - Cannot create thread if either user has blocked the other

3. **Message Sending**:
   - Check for blocks before sending message
   - Cannot send if either user has blocked the other

4. **Follower/Following Lists**:
   - Filter out blocked users from lists
   - Applies to both blocker and blocked perspectives

### Frontend Enforcement

1. **Profile Page**:
   - Hide Follow and Message buttons if blocked
   - Show "Blocked" pill
   - Show empty state for posts (optional)

2. **FollowersListModal**:
   - Filter logic handled by backend
   - Follow button respects block status

3. **Thread Creation**:
   - Backend prevents creation
   - Frontend shows appropriate error message

### Block Behavior

| Action | Blocker (A blocks B) | Blocked (B experiences) |
|--------|---------------------|------------------------|
| Follow | Cannot follow B | Cannot follow A |
| Message | Cannot message B | Cannot message A |
| View Profile | Can view (optional) | Can view (optional) |
| See in Lists | B hidden from A's lists | A hidden from B's lists |
| Notifications | No notifications from B | No notifications from A |

---

## Migration Guide

### Database Migration

The Prisma schema changes require a database migration:

```bash
# In the serverless directory
cd serverless

# Ensure DATABASE_URL is set
export DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# Run migration
npx prisma migrate dev --name social_interactions

# Or for production
npx prisma migrate deploy
```

### Migration SQL Overview

The migration will:
1. Create `follows` table
2. Create `blocks` table
3. Create `message_threads` table
4. Create `direct_messages` table
5. Add `followersCount` and `followingCount` to `profiles` table
6. Add `messageThreadId` and `messageId` to `notifications` table
7. Add `forwardedPostId` to `messages` table (group conversations)
8. Create `NotificationType` enum

### Post-Migration Steps

1. **Initialize Counts** (optional):
   ```sql
   -- Update existing follower counts
   UPDATE profiles p
   SET followersCount = (
     SELECT COUNT(*) FROM follows f WHERE f.followingId = p.userId
   );
   
   UPDATE profiles p
   SET followingCount = (
     SELECT COUNT(*) FROM follows f WHERE f.followerId = p.userId
   );
   ```

2. **Deploy Backend**:
   - Deploy new handlers via Serverless Framework
   - New routes will be automatically configured

3. **Deploy Frontend**:
   - Build and deploy updated React application
   - No feature flags needed (graceful degradation built-in)

---

## Testing

### Utilities Tests

**Location**: `src/utils/__tests__/formatTime.test.js`

**Coverage**: 11 tests passing
- Relative time formatting (seconds, minutes, hours, days, weeks, months, years)
- Notification grouping by date

### Backend Integration Tests (TODO)

Recommended test coverage:

1. **Follow Flow**:
   - Create follow relationship
   - Verify counts updated
   - Verify notification created
   - Attempt duplicate follow (idempotent)

2. **Block Flow**:
   - Block user
   - Verify follows removed both directions
   - Verify counts updated
   - Attempt to follow blocked user (should fail)
   - Attempt to message blocked user (should fail)

3. **DM Thread Flow**:
   - Create thread
   - Send message
   - Verify notification created
   - Fetch thread and verify messages
   - Verify readAt updated on fetch

4. **Post Forwarding**:
   - Send message with forwardedPostId
   - Verify post data included in response
   - Send message with only forwardedPostId (no body)

### Frontend E2E Tests (TODO)

Recommended Playwright test scenarios:

1. **Profile Interactions**:
   - Click Follow button → verify button changes to "Following"
   - Click Message button → verify navigation to inbox
   - Block user → verify confirmation dialog → verify blocked state

2. **FollowersListModal**:
   - Open followers list → verify users displayed
   - Search for user → verify filtered results
   - Click Follow on user → verify button updates

3. **DM Conversation**:
   - Navigate to inbox → verify threads listed
   - Open thread → verify messages displayed
   - Send message → verify message appears
   - Forward post via PostCard → verify post preview in conversation

4. **Notifications**:
   - Trigger FOLLOW event → verify notification appears
   - Click notification → verify navigation to profile
   - Trigger MESSAGE event → verify notification appears
   - Click notification → verify navigation to inbox

---

## Manual QA Checklist

### Profile Follow/Block Features

- [ ] **Follow User**:
  - [ ] Click Follow button on another user's profile
  - [ ] Verify button changes to "Following"
  - [ ] Refresh page and verify button still shows "Following"
  - [ ] Verify follower count increased on target profile
  - [ ] Verify following count increased on own profile

- [ ] **Unfollow User**:
  - [ ] Click "Following" button
  - [ ] Verify button changes to "Follow"
  - [ ] Verify counts decremented

- [ ] **Block User**:
  - [ ] Click three-dot menu
  - [ ] Click "Block User"
  - [ ] Confirm in dialog
  - [ ] Verify "Blocked" pill shown
  - [ ] Verify Follow and Message buttons hidden
  - [ ] Verify user removed from followers/following lists

- [ ] **Unblock User**:
  - [ ] Click three-dot menu
  - [ ] Click "Unblock User"
  - [ ] Verify Follow and Message buttons appear

- [ ] **FollowersListModal**:
  - [ ] Click follower count
  - [ ] Verify modal opens with list
  - [ ] Search for a user
  - [ ] Follow a user from the list
  - [ ] Close modal

### Direct Messaging

- [ ] **Create Thread**:
  - [ ] Click Message button on profile
  - [ ] Verify navigation to inbox
  - [ ] Verify conversation opened with user

- [ ] **Send Message**:
  - [ ] Type message in composer
  - [ ] Press Enter to send
  - [ ] Verify message appears in conversation
  - [ ] Verify message appears in inbox thread list

- [ ] **Forward Post**:
  - [ ] Go to a post
  - [ ] Click three-dot menu
  - [ ] Click "Share via DM"
  - [ ] Verify navigation to conversation with author
  - [ ] Verify post preview shown in composer
  - [ ] Add optional message
  - [ ] Send
  - [ ] Verify post preview shown in conversation

- [ ] **Read Messages**:
  - [ ] Open thread with unread messages
  - [ ] Verify unread badge on thread list
  - [ ] Open thread
  - [ ] Verify unread badge clears
  - [ ] Verify messages marked as read

### Notifications

- [ ] **FOLLOW Notification**:
  - [ ] Have another user follow you
  - [ ] Verify notification appears in bell icon badge
  - [ ] Click bell icon
  - [ ] Verify FOLLOW notification listed
  - [ ] Click notification
  - [ ] Verify navigation to follower's profile

- [ ] **MESSAGE Notification**:
  - [ ] Have another user send you a message
  - [ ] Verify notification appears in bell icon badge
  - [ ] Click bell icon
  - [ ] Verify MESSAGE notification listed
  - [ ] Click notification
  - [ ] Verify navigation to inbox thread

- [ ] **Mark as Read**:
  - [ ] Open notifications page
  - [ ] Verify all notifications marked as read
  - [ ] Verify bell icon badge clears

### Block Enforcement

- [ ] **Cannot Follow Blocked User**:
  - [ ] Block a user
  - [ ] Attempt to follow them
  - [ ] Verify error message

- [ ] **Cannot Message Blocked User**:
  - [ ] Block a user
  - [ ] Attempt to create thread
  - [ ] Verify error message

- [ ] **Blocked User Cannot Follow**:
  - [ ] Have blocked user attempt to follow you
  - [ ] Verify they receive error

- [ ] **Blocked User Not in Lists**:
  - [ ] Block a user who follows you
  - [ ] Check followers list
  - [ ] Verify they're not in list

### Edge Cases

- [ ] **Self-Actions**:
  - [ ] Verify cannot follow yourself
  - [ ] Verify cannot message yourself
  - [ ] Verify cannot block yourself

- [ ] **Empty States**:
  - [ ] View inbox with no threads → verify empty state
  - [ ] View notifications with none → verify empty state
  - [ ] View followers/following with none → verify empty state

- [ ] **Idempotency**:
  - [ ] Follow same user twice → verify no error
  - [ ] Unfollow user not following → verify no error
  - [ ] Block already blocked user → verify no error

---

## Troubleshooting

### Common Issues

1. **Migration Fails**:
   - Ensure DATABASE_URL is correctly set
   - Check for existing conflicting data
   - Verify Prisma version compatibility

2. **Counts Out of Sync**:
   - Run count initialization SQL
   - Check for failed transactions
   - Verify no direct database modifications

3. **Notifications Not Appearing**:
   - Check notification creation in backend logs
   - Verify UnreadContext is polling
   - Check for JavaScript errors in console

4. **Block Not Preventing Actions**:
   - Verify block checks in all handlers
   - Check for cached data in frontend
   - Test with incognito/fresh session

### Debug Tips

1. **Backend Logs**:
   ```bash
   # Check Lambda logs
   aws logs tail /aws/lambda/pv-api-prod-followProfile --follow
   ```

2. **Database Queries**:
   ```sql
   -- Check follows
   SELECT * FROM follows WHERE followerId = 'user-id' OR followingId = 'user-id';
   
   -- Check blocks
   SELECT * FROM blocks WHERE blockerId = 'user-id' OR blockedId = 'user-id';
   
   -- Check threads
   SELECT * FROM message_threads WHERE "userAId" = 'user-id' OR "userBId" = 'user-id';
   ```

3. **Frontend Console**:
   - Check Network tab for API errors
   - Check Console for JavaScript errors
   - Verify localStorage/sessionStorage if using

---

## Future Enhancements

### Potential Features

1. **Group DMs**:
   - Extend MessageThread to support > 2 participants
   - Update UI to show multiple avatars
   - Handle read receipts for multiple users

2. **Rich Messages**:
   - Support for images, videos, voice notes
   - Reactions to messages (emoji)
   - Message editing and deletion

3. **Advanced Blocking**:
   - Mute users (hide posts but allow follows)
   - Temporary blocks (time-limited)
   - Block lists (import/export)

4. **Notification Preferences**:
   - Per-type notification settings
   - Email/push notification support
   - Notification bundling

5. **Analytics**:
   - Follow/unfollow rate tracking
   - Message engagement metrics
   - Popular forwarded posts

### Technical Debt

1. **Add Input Validation**:
   - UUID/CUID format validation for IDs
   - Better error messages

2. **Optimize Queries**:
   - Add composite indexes
   - Consider caching for counts
   - Batch operations where possible

3. **Improve Tests**:
   - Full backend integration test suite
   - E2E Playwright tests
   - Load testing for message throughput

4. **Documentation**:
   - API specification (OpenAPI/Swagger)
   - Sequence diagrams for flows
   - Video tutorials

---

## Support

For issues or questions:

1. Check this documentation first
2. Review error logs (backend and frontend)
3. Search existing GitHub issues
4. Create a new issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if UI-related
   - Error messages/logs

---

## Changelog

### v1.0.0 - Initial Release (2024-12-10)

- ✅ Follow/unfollow functionality
- ✅ Block/unblock functionality
- ✅ 1-to-1 DM threads with post forwarding
- ✅ FOLLOW and MESSAGE notifications
- ✅ Follower/following counts
- ✅ Block enforcement throughout
- ✅ Enhanced notifications UI with date grouping
- ✅ Comprehensive frontend components

---

## License

This feature is part of Project Valine and follows the project's license terms.
