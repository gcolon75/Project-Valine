<!-- ARCHIVED DOCUMENT -->
<!-- Original location: docs/PHASE_02_IMPLEMENTATION.md -->
<!-- Archived on: 2025-11-04 -->
<!-- Reason: Historical AI agent summary -->
<!-- This document is kept for historical reference only -->

---

# Phase 02: API Client Integration - Implementation Guide

## Overview
This document describes the Phase 02 implementation of API client integration with fallback mechanisms, MSW mocks, and feature-flag-based API mode switching.

## Implementation Status
✅ **Complete** - All acceptance criteria met, 137 tests passing

## Architecture

### API Client (`src/api/client.js`)
The API client is built on Axios with the following features:

- **Base URL**: Configurable via `VITE_API_BASE` environment variable
- **Timeout**: 8000ms (8 seconds)
- **Retry Logic**: Exponential backoff with jitter
  - Max retries: 3
  - Retryable errors: Network errors, 408, 429, 500, 502, 503, 504
  - Max delay: 10 seconds with jitter to prevent thundering herd
- **Authentication**: Automatic Bearer token attachment from localStorage
- **401 Handling**: Dispatches `auth:unauthorized` event for AuthProvider
- **Credentials**: Configurable via `VITE_API_USE_CREDENTIALS`

### Fallback Mechanism (`src/hooks/useApiFallback.js`)
The `useApiFallback` hook provides graceful degradation:

```javascript
const { data, loading, error, refetch, usingFallback } = useApiFallback(
  () => apiCall(),
  FALLBACK_DATA,
  { diagnosticContext: 'ComponentName.apiCall' }
);
```

**Behavior:**
- When `VITE_API_INTEGRATION=true`: Attempts API call, falls back on network/5xx errors
- When `VITE_API_INTEGRATION=false`: Uses fallback data immediately
- Logs failures to diagnostic file for debugging

### Feature Flags

#### VITE_API_INTEGRATION
**Purpose**: Controls whether to attempt real API calls or use mocks
**Values**:
- `true`: Enable API integration with graceful fallback
- `false`: Use mock/fallback data only (default)

#### VITE_API_USE_CREDENTIALS
**Purpose**: Controls `withCredentials` for cookie-based authentication
**Values**:
- `true`: Enable credentials for HTTP-only cookies
- `false`: Use Bearer token auth (default)

#### VITE_USE_MSW
**Purpose**: Enable Mock Service Worker in browser for development
**Values**:
- `true`: Enable MSW for development without backend
- `false`: Normal mode (default)

## MSW Mock Handlers (`src/mocks/handlers.js`)

### Endpoints Mocked (28 total)

**Authentication (4)**
- POST /auth/login
- POST /auth/register
- GET /auth/me
- POST /auth/logout

**Reels (6)**
- GET /reels
- GET /reels/:id
- POST /reels/:id/like
- POST /reels/:id/bookmark
- GET /reels/:id/comments
- POST /reels/:id/comments

**Posts (4)**
- GET /posts
- POST /posts
- POST /posts/:id/like
- POST /posts/:id/bookmark

**Users (1)**
- GET /users/:username

**Conversations (4)**
- GET /conversations
- POST /conversations
- GET /conversations/:id/messages
- POST /conversations/:id/messages

**Messages (2 - legacy)**
- GET /messages
- POST /messages

**Notifications (3)**
- GET /notifications
- PATCH /notifications/:id/read
- PATCH /notifications/mark-all

**Utility (2)**
- GET /unread-counts
- GET /health

### Browser Mode (`src/mocks/browser.js`)
For development without a backend:

```javascript
import { startMSW } from './mocks/browser';

if (import.meta.env.VITE_USE_MSW === 'true') {
  await startMSW();
}
```

## Pages Wired to API

### Reels (`src/pages/Reels.jsx`)
- **Endpoint**: GET /reels
- **Service**: `reelsService.getReels(limit, cursor)`
- **Features**: Like, bookmark, comments, pagination
- **Fallback**: Static FALLBACK_REELS array

### Dashboard (`src/pages/Dashboard.jsx`)
- **Endpoint**: GET /posts
- **Service**: `postService.getPosts()`
- **Features**: Create post, like, bookmark, comments
- **Fallback**: FeedContext with local state

### Profile (`src/pages/Profile.jsx`)
- **Endpoint**: GET /users/:username
- **Service**: `userService.getUserProfile(username)`
- **Features**: View profile, edit profile, connections
- **Fallback**: Empty or cached profile data

### Messages (`src/pages/Messages.jsx`)
- **Endpoints**: GET /conversations, GET /conversations/:id/messages
- **Service**: `messagesService`
- **Features**: List conversations, send messages
- **Fallback**: Empty conversations list

### Notifications (`src/pages/Notifications.jsx`)
- **Endpoint**: GET /notifications
- **Service**: `notificationsService.getNotifications()`
- **Features**: List, mark as read, mark all as read
- **Fallback**: Empty notifications list

## Environment Configuration

### Development
```bash
# With local backend
VITE_API_BASE=http://localhost:3001
VITE_API_INTEGRATION=true

# Without backend (mocks only)
VITE_API_INTEGRATION=false
```

### Production
```bash
VITE_API_BASE=https://api.valine.com
VITE_API_INTEGRATION=true
VITE_API_USE_CREDENTIALS=true  # If using cookies
```

## Testing

### Test Coverage
- **Total Tests**: 137
- **Test Files**: 14
- **New Tests**: 13 API client tests
- **Pass Rate**: 100%

### Test Files
- `src/__tests__/api-client.test.js` - API client configuration and behavior
- `src/hooks/__tests__/useApiFallback.test.js` - Fallback hook logic
- `src/services/__tests__/api.test.js` - Retry logic and timeouts
- Service-specific tests for all API services

### Running Tests
```bash
npm test                # Run all tests
npm test -- --ui        # Run with UI
npm test -- --coverage  # Run with coverage report
```

## Diagnostics

### Fallback Logging
Location: `logs/agent/frontend-api-fallback.json`

When API calls fail, the fallback mechanism logs:
```json
{
  "timestamp": "2025-11-04T01:43:00.000Z",
  "context": "Reels.getReels",
  "error": "Network Error",
  "errorCode": "ERR_NETWORK",
  "fallbackUsed": true,
  "online": true
}
```

### Phase Report
Location: `logs/agent/frontend-phase-02-report.json`

Complete implementation report including:
- Configuration details
- Feature flags documentation
- MSW handlers list
- Test results
- Sample API requests
- Acceptance criteria status

## Backend Integration

### Backend Status
✅ Backend Phase 02 complete (28 endpoints implemented)

### Documentation
- `serverless/API_DOCUMENTATION.md` - Complete API reference
- `BACKEND_DEPLOYMENT_INSTRUCTIONS.md` - Deployment guide
- `logs/agent/backend-phase-02-completion.json` - Backend completion report

### API Base URL
Format: `https://{API_ID}.execute-api.{REGION}.amazonaws.com/{STAGE}`

Example: `https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev`

### Authentication
- Type: JWT Bearer Token
- Obtain via: POST /auth/login or POST /auth/register
- Expires: 7 days
- Header: `Authorization: Bearer <token>`

## Rollback Procedure

If issues arise, rollback to mock mode:

1. Set `VITE_API_INTEGRATION=false` in environment
2. Restart application
3. All pages will use fallback/mock data
4. No API calls will be attempted
5. Application continues to function normally

## Troubleshooting

### API Not Responding
**Symptom**: Pages show fallback data instead of real data
**Check**:
1. Verify `VITE_API_BASE` is set correctly
2. Verify `VITE_API_INTEGRATION=true`
3. Check network connectivity
4. Check browser console for API errors
5. Check `logs/agent/frontend-api-fallback.json` for logged errors

### 401 Errors
**Symptom**: Unauthorized errors on protected endpoints
**Solution**:
1. User must be logged in
2. Check token exists in localStorage (`auth_token`)
3. Token may be expired - re-authenticate

### CORS Errors
**Symptom**: CORS policy blocking requests
**Solution**:
1. Backend must have CORS enabled
2. Check backend CORS configuration
3. Verify `VITE_API_USE_CREDENTIALS` matches backend requirements

## Next Steps

1. **Deploy frontend** with `VITE_API_BASE` configured
2. **Test with real backend** to verify integration
3. **Monitor diagnostics** for API failures
4. **Phase 03**: Continue with additional features

## References

- Problem Statement: Phase 02 API integration requirements
- Backend Completion: `logs/agent/backend-phase-02-completion.json`
- API Documentation: `serverless/API_DOCUMENTATION.md`
- Environment Example: `.env.example`
