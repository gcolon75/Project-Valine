# API Integration Guide - Project Valine

Quick reference for integrating with the Project Valine API.

## Quick Start

### 1. Configure Environment
```powershell
# Copy example file
cp .env.local.example .env.local

# Edit .env.local
VITE_API_BASE=http://localhost:3001
VITE_ENABLE_AUTH=false
```

### 2. Start Development
```powershell
# Install dependencies
npm ci

# Start dev server
npm run dev

# In another terminal, start backend (if available)
cd server && npm run dev
```

### 3. Check API Connection
Open browser console:
```javascript
// View diagnostics
window.__diagnostics.summary()

// Should show API calls or fallback usage
```

---

## API Client Usage

### Basic Requests

```javascript
import apiClient from './services/api';

// GET request
const { data } = await apiClient.get('/reels');

// POST request
const { data } = await apiClient.post('/posts', {
  content: 'Hello world!'
});

// PUT request
const { data } = await apiClient.put('/users/123', {
  displayName: 'New Name'
});

// DELETE request
await apiClient.delete('/posts/123');
```

### With Auth Token
Auth tokens are automatically included:
```javascript
// Token is stored in localStorage
localStorage.setItem('auth_token', 'jwt-token-here');

// All requests now include: Authorization: Bearer jwt-token-here
await apiClient.get('/auth/me');
```

### Error Handling
```javascript
try {
  const { data } = await apiClient.get('/posts/123');
  console.log(data);
} catch (error) {
  if (error.response) {
    // API returned error
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
  } else if (error.code === 'ERR_NETWORK') {
    // Network error
    console.error('Network error - API unavailable');
  } else {
    // Other error
    console.error('Error:', error.message);
  }
}
```

---

## Service Layer Pattern

Always use service functions instead of direct API calls:

### Creating a Service
```javascript
// src/services/postsService.js
import apiClient from './api';

export const getPosts = async (limit = 20) => {
  const { data } = await apiClient.get('/posts', { params: { limit } });
  return data;
};

export const likePost = async (postId) => {
  const { data } = await apiClient.post(`/posts/${postId}/like`);
  return data;
};
```

### Using in Components
```javascript
import { getPosts, likePost } from '../services/postsService';

function PostsList() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    getPosts(20).then(setPosts);
  }, []);

  const handleLike = async (postId) => {
    await likePost(postId);
  };

  return <div>{/* Render posts */}</div>;
}
```

---

## Optimistic Updates

Use for instant UI feedback:

```javascript
import { optimisticUpdate } from '../hooks/useOptimisticUpdate';

const handleLike = async (postId) => {
  await optimisticUpdate(
    // 1. Optimistic update (runs immediately)
    () => setPosts(posts.map(p => 
      p.id === postId ? { ...p, liked: true, likes: p.likes + 1 } : p
    )),
    // 2. API call (runs in background)
    () => likePost(postId),
    // 3. Rollback (if API fails)
    () => setPosts(posts.map(p => 
      p.id === postId ? { ...p, liked: false, likes: p.likes - 1 } : p
    )),
    // 4. Context for debugging
    'PostsList.likePost'
  );
};
```

---

## API Fallback Pattern

Gracefully handle API unavailability:

```javascript
import { useApiFallback } from '../hooks/useApiFallback';
import { getReels } from '../services/reelsService';

const FALLBACK_REELS = [/* mock data */];

function ReelsFeed() {
  const { data: reels, loading, error, usingFallback } = useApiFallback(
    () => getReels(20),
    FALLBACK_REELS,
    {
      diagnosticContext: 'ReelsFeed',
      immediate: true
    }
  );

  if (loading) return <Loading />;
  
  return (
    <div>
      {usingFallback && <Banner>Using offline data</Banner>}
      {reels.map(reel => <ReelCard key={reel.id} reel={reel} />)}
    </div>
  );
}
```

---

## Real-time Updates

### Polling Pattern
```javascript
import { usePolling } from '../hooks/usePolling';

function NotificationBell() {
  const [count, setCount] = useState(0);

  usePolling(
    async () => {
      const { data } = await apiClient.get('/unread-counts');
      setCount(data.notifications);
    },
    30000, // Poll every 30 seconds
    { immediate: true }
  );

  return <Bell badge={count} />;
}
```

### Using UnreadContext
```javascript
import { useUnread } from '../context/UnreadContext';

function NotificationBell() {
  const { unreadCounts, markNotificationsRead } = useUnread();

  return (
    <button onClick={markNotificationsRead}>
      Notifications
      {unreadCounts.notifications > 0 && (
        <Badge>{unreadCounts.notifications}</Badge>
      )}
    </button>
  );
}
```

---

## Authentication

### Login Flow
```javascript
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { login, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      setError('Login failed');
    }
  };

  return <form onSubmit={handleSubmit}>{/* form */}</form>;
}
```

### Dev Bypass (Development Only)
```javascript
const { devLogin } = useAuth();

// Only available when VITE_ENABLE_AUTH=false
if (devLogin) {
  devLogin(); // Instant login for testing
}
```

### Protected Routes
```jsx
// Already configured in routes/App.jsx
<Route element={<Protected><Dashboard /></Protected>} />
```

---

## Testing with MSW

MSW is automatically configured for tests:

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

test('fetches and displays posts', async () => {
  render(<PostsList />);

  await waitFor(() => {
    expect(screen.getByText('Test Post')).toBeInTheDocument();
  });
});

test('handles API error', async () => {
  // Override handler for this test
  server.use(
    http.get('http://localhost:4000/posts', () => {
      return HttpResponse.json(
        { error: 'Server error' },
        { status: 500 }
      );
    })
  );

  render(<PostsList />);

  await waitFor(() => {
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });
});
```

---

## Debugging

### Check API Connection
```javascript
// Browser console
window.__diagnostics.summary()

// Output:
// {
//   totalEntries: 5,
//   byContext: {
//     'Reels.getReels': 2,
//     'Posts.likePost': 3
//   },
//   fallbackUsageCount: 2,
//   offlineEvents: 0
// }
```

### View Failed Requests
```javascript
window.__diagnostics.get().filter(d => d.fallbackUsed)
```

### Test API Manually
```javascript
import apiClient from './services/api';

// Test in browser console
apiClient.get('/health').then(console.log);
```

---

## Common Issues

### Issue: API calls failing with CORS error
**Solution:** Backend needs to allow the frontend origin
```javascript
// Backend CORS config
app.use(cors({ 
  origin: 'http://localhost:5173',
  credentials: true 
}));
```

### Issue: Auth token not included
**Solution:** Check localStorage
```javascript
// Should return your token
localStorage.getItem('auth_token')

// If null, login again
```

### Issue: Fallback data showing
**Solution:** Check API_BASE and backend status
```javascript
console.log('API Base:', import.meta.env.VITE_API_BASE);

// Test connection
fetch(import.meta.env.VITE_API_BASE + '/health')
  .then(r => r.json())
  .then(console.log);
```

---

## Best Practices

### ✅ DO
- Use service layer for all API calls
- Handle errors gracefully
- Provide loading states
- Use optimistic updates for mutations
- Log diagnostics in development
- Test with MSW
- Use fallback data

### ❌ DON'T
- Import `apiClient` directly in components
- Ignore error states
- Make API calls in render
- Store sensitive data in localStorage
- Commit `.env` files
- Skip loading states
- Assume API is always available

---

## Quick Reference

### Environment Variables
```env
VITE_API_BASE=http://localhost:3001    # Required
VITE_ENABLE_AUTH=false                 # Optional (default: false)
```

### Key Imports
```javascript
// API client
import apiClient from './services/api';

// Hooks
import { useApiFallback } from './hooks/useApiFallback';
import { useOptimisticUpdate } from './hooks/useOptimisticUpdate';
import { usePolling } from './hooks/usePolling';

// Context
import { useAuth } from './context/AuthContext';
import { useUnread } from './context/UnreadContext';
import { useFeed } from './context/FeedContext';
```

### API Endpoints
```
Auth:       /auth/login, /auth/register, /auth/me, /auth/logout
Reels:      /reels, /reels/:id, /reels/:id/like, /reels/:id/bookmark
Posts:      /posts, /posts/:id/like, /posts/:id/bookmark
Users:      /users/:username
Messages:   /messages
Notifications: /notifications, /unread-counts
Health:     /health
```

---

For complete details, see `logs/agent/FRONTEND_API_INTEGRATION_COMPLETE.md`
