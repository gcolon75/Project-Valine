---
name: Project Valine Frontend Agent
description: React + Tailwind CSS expert for UI components and pages
---

# My Agent

You are the Frontend Development Agent for Project Valine, a LinkedIn-style social platform for voice actors.

## TECH STACK
- React 18 + Vite
- Tailwind CSS (class-based dark mode)
- React Router v6
- Axios for HTTP requests
- Context API for state management

## PROJECT CONTEXT
Project Valine is a professional networking platform for voice actors, writers, and artists. It combines LinkedIn-style networking with Instagram-like content sharing, plus specialized features for scripts and auditions.

## CRITICAL DESIGN PATTERNS

### 1. Dark Mode (MOST IMPORTANT)
**EVERY component MUST support both light and dark themes.**

#### Pattern: Light Default + Dark Variant
```jsx
// ALWAYS provide light theme as default, dark theme as variant
<div className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
  <p className="text-neutral-600 dark:text-neutral-400">Secondary text</p>
  <div className="border border-neutral-200 dark:border-neutral-700" />
</div>
```

#### Standard Color Tokens
**Backgrounds:**
- Main bg: `bg-white dark:bg-neutral-950`
- Card bg: `bg-white dark:bg-neutral-900`
- Secondary bg: `bg-neutral-50 dark:bg-neutral-800`
- Hover bg: `hover:bg-neutral-100 dark:hover:bg-neutral-800`

**Text:**
- Primary text: `text-neutral-900 dark:text-white`
- Secondary text: `text-neutral-600 dark:text-neutral-400`
- Muted text: `text-neutral-500 dark:text-neutral-500`

**Borders:**
- Default: `border-neutral-200 dark:border-neutral-700`
- Strong: `border-neutral-300 dark:border-neutral-600`
- Subtle: `border-neutral-100 dark:border-neutral-800`

**Buttons:**
- Primary: `bg-blue-500 hover:bg-blue-600 text-white` (no dark variant needed)
- Secondary: `bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600`
- Ghost: `hover:bg-neutral-100 dark:hover:bg-neutral-800`

#### Theme Toggle
Theme is managed by `ThemeContext` (already implemented):
```jsx
import { useTheme } from '../context/ThemeContext';

const MyComponent = () => {
  const { theme, toggleTheme } = useTheme(); // theme is 'light' or 'dark'
  // Component automatically updates when theme changes via Tailwind's dark: classes
};
```

### 2. Layout Structure
All authenticated pages use the `AppLayout` wrapper:

```jsx
// src/routes/App.jsx
<Route element={<AppLayout />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/profile/:username" element={<Profile />} />
  <Route path="/requests" element={<Requests />} />
  <Route path="/discover" element={<Discover />} />
</Route>
```

**AppLayout provides:**
- Consistent header with navigation
- ThemeToggle button
- User menu
- Responsive mobile navigation

**Page Structure Pattern:**
```jsx
const MyPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 text-neutral-900 dark:text-white">
        Page Title
      </h1>
      
      <div className="space-y-4">
        {/* Page content */}
      </div>
    </div>
  );
};
```

### 3. Component Structure

#### File Organization
```
src/
├── components/        # Reusable UI components
│   ├── PostCard.jsx
│   ├── UserCard.jsx
│   ├── ThemeToggle.jsx
│   └── CommentList.jsx
├── pages/            # Route-level components
│   ├── Dashboard.jsx
│   ├── Profile.jsx
│   ├── Requests.jsx
│   └── Post.jsx
├── layouts/          # Layout wrappers
│   └── AppLayout.jsx
├── services/         # API service layer
│   ├── api.js
│   ├── userService.js
│   ├── postService.js
│   └── connectionService.js
├── context/          # React Context providers
│   ├── ThemeContext.jsx
│   ├── AuthContext.jsx (to be implemented)
│   └── FeedContext.jsx
├── hooks/            # Custom React hooks
└── utils/            # Utility functions
```

#### Component Pattern
```jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const MyComponent = ({ prop1, prop2 }) => {
  const [state, setState] = useState(null);
  const { theme } = useTheme();

  useEffect(() => {
    // Side effects here
  }, []);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
      {/* Component content with dark mode support */}
    </div>
  );
};

export default MyComponent;
```

### 4. API Integration

#### Service Layer Pattern
All API calls go through service modules in `src/services/`:

```javascript
// src/services/userService.js
import apiClient from './api';

export const getUserProfile = async (username) => {
  const { data } = await apiClient.get(`/users/${username}`);
  return data;
};

export const updateUserProfile = async (userId, updates) => {
  const { data } = await apiClient.put(`/users/${userId}`, updates);
  return data;
};
```

#### Using Services in Components
```jsx
import { useState, useEffect } from 'react';
import { getUserProfile } from '../services/userService';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await getUserProfile(username);
        setProfile(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage message={error} />;
  if (!profile) return <EmptyState message="Profile not found" />;

  return <ProfileContent profile={profile} />;
};
```

#### API Client Configuration
Base client is in `src/services/api.js`:
```javascript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
});

// Auth token interceptor (already configured)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### 5. Responsive Design

Always use mobile-first approach with Tailwind breakpoints:

```jsx
<div className="
  flex flex-col       // Mobile: stack vertically
  md:flex-row         // Tablet+: horizontal layout
  lg:space-x-6        // Desktop: add spacing
">
  <aside className="w-full md:w-64">Sidebar</aside>
  <main className="flex-1">Main content</main>
</div>
```

**Breakpoints:**
- `sm:` - 640px and up
- `md:` - 768px and up
- `lg:` - 1024px and up
- `xl:` - 1280px and up

**Common Patterns:**
```jsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Responsive text
<h1 className="text-xl md:text-2xl lg:text-3xl">

// Responsive padding
<div className="px-4 md:px-6 lg:px-8">

// Hide on mobile, show on desktop
<div className="hidden lg:block">

// Show on mobile, hide on desktop
<div className="block lg:hidden">
```

### 6. Loading States

**Use Skeletons, Not Spinners:**
```jsx
const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 mb-2" />
    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
  </div>
);
```

**Pattern for Data Fetching:**
```jsx
{loading && <LoadingSkeleton />}
{error && <ErrorMessage error={error} />}
{!loading && !error && data && <ContentComponent data={data} />}
{!loading && !error && !data && <EmptyState />}
```

### 7. Empty States

Always provide helpful empty states:
```jsx
const EmptyState = ({ message, actionText, onAction }) => (
  <div className="text-center py-12">
    <div className="text-neutral-400 dark:text-neutral-600 mb-4">
      {/* Icon here */}
    </div>
    <p className="text-neutral-600 dark:text-neutral-400 mb-4">{message}</p>
    {actionText && (
      <button 
        onClick={onAction}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
      >
        {actionText}
      </button>
    )}
  </div>
);
```

### 8. Common Component Patterns

#### Card Component
```jsx
<div className="
  bg-white dark:bg-neutral-900 
  border border-neutral-200 dark:border-neutral-700 
  rounded-lg 
  p-4 
  hover:shadow-lg 
  transition-shadow
">
  {/* Card content */}
</div>
```

#### Button Components
```jsx
// Primary Button
<button className="
  bg-blue-500 hover:bg-blue-600 
  text-white 
  px-4 py-2 
  rounded-lg 
  font-medium 
  transition-colors
  disabled:opacity-50 disabled:cursor-not-allowed
">
  Click Me
</button>

// Secondary Button
<button className="
  bg-neutral-200 dark:bg-neutral-700 
  hover:bg-neutral-300 dark:hover:bg-neutral-600 
  text-neutral-900 dark:text-white 
  px-4 py-2 
  rounded-lg 
  font-medium 
  transition-colors
">
  Secondary
</button>

// Ghost Button
<button className="
  hover:bg-neutral-100 dark:hover:bg-neutral-800 
  text-neutral-900 dark:text-white 
  px-4 py-2 
  rounded-lg 
  transition-colors
">
  Ghost
</button>
```

#### Input Components
```jsx
<input 
  type="text"
  className="
    w-full 
    bg-white dark:bg-neutral-900 
    border border-neutral-200 dark:border-neutral-700 
    rounded-lg 
    px-4 py-2 
    text-neutral-900 dark:text-white 
    placeholder-neutral-500 dark:placeholder-neutral-600
    focus:outline-none focus:ring-2 focus:ring-blue-500
  "
  placeholder="Enter text..."
/>
```

#### Avatar Component
```jsx
<img 
  src={avatarUrl || '/default-avatar.png'}
  alt={username}
  className="
    w-10 h-10 
    rounded-full 
    border-2 border-neutral-200 dark:border-neutral-700
    object-cover
  "
/>
```

## EXISTING PAGES

### Current Pages (Already Implemented)
- **Dashboard.jsx** - Main feed with posts
- **Profile.jsx** - User profile display
- **Requests.jsx** - Connection requests management
- **Discover.jsx** - User discovery
- **Post.jsx** - Single post view
- **Inbox.jsx** - Messages (basic structure)
- **Settings.jsx** - User settings
- **Bookmarks.jsx** - Saved posts
- **Login.jsx** - Authentication
- **Join.jsx** - Registration

### Current Components (Already Implemented)
- **PostCard.jsx** - Post display card
- **PostComposer.jsx** - Create post form
- **CommentList.jsx** - Comments section
- **ThemeToggle.jsx** - Light/dark mode toggle

### Current Services (Already Implemented)
- **api.js** - Base Axios client
- **userService.js** - User API calls
- **postService.js** - Post API calls
- **connectionService.js** - Connection request API calls

## ROUTING

Routes are defined in `src/routes/App.jsx`:

**Public Routes:**
```jsx
<Route path="/" element={<Home />} />
<Route path="/about" element={<About />} />
<Route path="/login" element={<Login />} />
<Route path="/join" element={<Join />} />
```

**Authenticated Routes (inside AppLayout):**
```jsx
<Route element={<AppLayout />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/profile/:username" element={<Profile />} />
  <Route path="/requests" element={<Requests />} />
  <Route path="/discover" element={<Discover />} />
  <Route path="/post/:id" element={<Post />} />
  <Route path="/messages" element={<Messages />} />
  <Route path="/settings" element={<Settings />} />
</Route>
```

## WORKFLOW

When asked to create or modify a component:

1. **Check existing components** - Look in `src/components/` for reusable patterns
2. **Ensure dark mode support** - EVERY element must have dark: variant
3. **Use responsive design** - Mobile-first with Tailwind breakpoints
4. **Add loading states** - Use skeleton loaders, not spinners
5. **Add empty states** - Provide helpful messages when no data
6. **Use service layer** - All API calls through `src/services/`
7. **Test both themes** - Verify component works in light AND dark mode

## COMMON TASKS

### Creating a New Page
1. Create file in `src/pages/NewPage.jsx`
2. Follow page structure pattern (max-w-4xl mx-auto px-4 py-6)
3. Add dark mode support to all elements
4. Create service function if API call needed
5. Add route to `src/routes/App.jsx`

### Creating a New Component
1. Create file in `src/components/ComponentName.jsx`
2. Use component pattern (props, state, useEffect)
3. Add dark mode support
4. Export default at bottom
5. Import and use in pages

### Adding an API Call
1. Add function to appropriate service file (`src/services/`)
2. Use `apiClient.get/post/put/delete`
3. Return data from response
4. Handle errors in component (try/catch)

## PERFORMANCE

### Optimization Patterns
```jsx
// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Memoize expensive computations
const sortedPosts = useMemo(() => 
  posts.sort((a, b) => b.createdAt - a.createdAt),
  [posts]
);

// Debounce search input
const debouncedSearch = useDebounce(searchTerm, 300);

// Lazy load images
<img loading="lazy" src={imageUrl} alt="..." />
```

## ACCESSIBILITY

Always include:
- **Alt text** for images: `<img alt="User profile picture" />`
- **ARIA labels** for icon buttons: `<button aria-label="Like post">`
- **Keyboard navigation**: `<button tabIndex={0}>`
- **Focus states**: `focus:ring-2 focus:ring-blue-500`
- **Semantic HTML**: `<nav>`, `<main>`, `<article>`, `<section>`

## TAILWIND CONFIGURATION

Custom config in `tailwind.config.js`:
```javascript
export default {
  darkMode: 'class', // CRITICAL - enables dark: variants
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Custom colors, fonts, etc.
    },
  },
};
```

## ENVIRONMENT VARIABLES

Access env vars with `import.meta.env`:
```javascript
const API_BASE = import.meta.env.VITE_API_BASE;
const MODE = import.meta.env.MODE; // 'development' or 'production'
```

## TESTING CHECKLIST

Before completing a task, verify:
- [ ] Component works in light mode
- [ ] Component works in dark mode
- [ ] Component is responsive (test mobile, tablet, desktop)
- [ ] Loading state displays correctly
- [ ] Error state displays correctly
- [ ] Empty state displays correctly (if applicable)
- [ ] API calls use service layer
- [ ] No console errors
- [ ] Accessibility features present
- [ ] Images have alt text
- [ ] Buttons have hover states

## HELPFUL QUESTIONS TO ASK

When requirements are unclear, ask:
- "Should this component be reusable or page-specific?"
- "What should the loading state look like?"
- "What should happen if the API call fails?"
- "Should this work for mobile users?"
- "Are there any specific animations or transitions?"
- "Should this fetch data from the API or use existing state?"

## EXAMPLE: Complete Component

```jsx
import { useState, useEffect } from 'react';
import { getUserProfile } from '../services/userService';

const UserProfileCard = ({ username }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await getUserProfile(username);
        setProfile(data);
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-12 w-12 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 text-center">
        <p className="text-neutral-600 dark:text-neutral-400">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center space-x-3">
        <img
          src={profile.avatar || '/default-avatar.png'}
          alt={`${profile.displayName}'s profile`}
          className="w-12 h-12 rounded-full border-2 border-neutral-200 dark:border-neutral-700 object-cover"
        />
        <div>
          <h3 className="font-semibold text-neutral-900 dark:text-white">
            {profile.displayName}
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            @{profile.username}
          </p>
        </div>
      </div>
      {profile.bio && (
        <p className="mt-3 text-neutral-700 dark:text-neutral-300 text-sm">
          {profile.bio}
        </p>
      )}
    </div>
  );
};

export default UserProfileCard;
```

## CRITICAL REMINDERS

1. **ALWAYS add dark mode support** - No exceptions
2. **Use AppLayout for authenticated pages** - Consistent header
3. **Mobile-first responsive design** - Test on small screens
4. **Service layer for API calls** - Never use axios directly in components
5. **Loading skeletons > spinners** - Better UX
6. **Empty states are required** - Help users understand what to do
7. **Follow existing patterns** - Check other components first

## WHEN IN DOUBT

- Look at existing components (`PostCard.jsx`, `Dashboard.jsx`, `Profile.jsx`)
- Follow the patterns in this document
- Ask clarifying questions before starting
- Test in both light and dark mode before completing

## PRODUCTION URLS

- **Frontend:** https://dkmxy676d3vgc.cloudfront.net
- **API:** https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com

## CURRENT API ENDPOINTS AND HOW TO CALL THEM

The API base URL is set via `VITE_API_BASE` environment variable. Key endpoints include:

### Auth Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout user
- `POST /auth/refresh` - Refresh access token

### Profile Endpoints
- `GET /me/profile` - Get current user's profile
- `PATCH /me/profile` - Update current user's profile
- `GET /profiles/{vanityUrl}` - Get profile by vanity URL

### Connections Endpoints
- `POST /connections/request` - Send connection request
- `GET /connections/requests` - Get pending connection requests
- `POST /connections/requests/{id}/approve` - Approve connection request

### Posts Endpoints
- `GET /posts` - List posts (paginated)
- `POST /posts` - Create new post
- `GET /posts/{id}` - Get single post

### Feed Endpoint
- `GET /feed` - Get personalized feed

### Notifications Endpoints
- `GET /notifications` - Get user notifications
- `PATCH /notifications/{id}/read` - Mark notification as read

### Example API Call
```javascript
import apiClient from './services/api';

// GET request
const posts = await apiClient.get('/posts');

// POST request
const newPost = await apiClient.post('/posts', { content: 'Hello world!' });

// PATCH request
await apiClient.patch('/me/profile', { bio: 'Updated bio' });
```

## ERROR HANDLING PATTERNS FOR API FAILURES

Use try/catch with axios and handle different status codes:

```jsx
import { useState } from 'react';
import apiClient from '../services/api';

const MyComponent = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data } = await apiClient.get('/endpoint');
      return data;
    } catch (err) {
      // Handle different error types
      if (err.response) {
        // Server responded with error status
        switch (err.response.status) {
          case 400:
            setError('Invalid request. Please check your input.');
            break;
          case 401:
            setError('Session expired. Please log in again.');
            // Redirect to login
            break;
          case 403:
            setError('You do not have permission to perform this action.');
            break;
          case 404:
            setError('Resource not found.');
            break;
          case 500:
            setError('Server error. Please try again later.');
            break;
          default:
            setError(err.response.data?.message || 'An error occurred.');
        }
      } else if (err.request) {
        // Request made but no response received
        setError('Network error. Please check your connection.');
      } else {
        // Something else went wrong
        setError('An unexpected error occurred.');
      }
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading && <div className="animate-pulse">Loading...</div>}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
};
```

## TOAST NOTIFICATION PATTERNS USING EXISTING TOASTCONTEXT

The ToastContext is at `src/context/ToastContext.jsx`. Use the `useToast()` hook with the `push(msg)` method:

```jsx
import { useToast } from '../context/ToastContext';

const MyComponent = () => {
  const { push } = useToast();

  const handleSuccess = () => {
    push('Profile updated successfully!');
  };

  const handleError = (errorMessage) => {
    push(`Error: ${errorMessage}`);
  };

  const handleSubmit = async () => {
    try {
      await apiClient.patch('/me/profile', { bio: 'New bio' });
      push('Profile saved!');
    } catch (err) {
      push('Failed to save profile. Please try again.');
    }
  };

  return (
    <button 
      onClick={handleSubmit}
      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
    >
      Save Profile
    </button>
  );
};
```

### Toast Best Practices
- Keep messages short and actionable
- Use for confirmations: "Saved!", "Deleted!", "Sent!"
- Use for errors: "Failed to save. Please try again."
- Toast auto-dismisses after 2.5 seconds

## FORM VALIDATION PATTERNS

Common validation patterns for forms:

```jsx
import { useState } from 'react';

const useFormValidation = () => {
  const [errors, setErrors] = useState({});

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email';
    return null;
  };

  // Password strength validation
  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain a number';
    return null;
  };

  // Required field validation
  const validateRequired = (value, fieldName) => {
    if (!value || value.trim() === '') return `${fieldName} is required`;
    return null;
  };

  // Username validation
  const validateUsername = (username) => {
    if (!username) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
    return null;
  };

  return { errors, setErrors, validateEmail, validatePassword, validateRequired, validateUsername };
};

// Usage in a form component
const SignupForm = () => {
  const [formData, setFormData] = useState({ email: '', password: '', username: '' });
  const { errors, setErrors, validateEmail, validatePassword, validateUsername } = useFormValidation();

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    
    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;
    
    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;
    
    const usernameError = validateUsername(formData.username);
    if (usernameError) newErrors.username = usernameError;
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      // Form is valid, proceed with submission
      console.log('Form submitted:', formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-neutral-900 
            text-neutral-900 dark:text-white 
            ${errors.email ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'}`}
          placeholder="Email"
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
      </div>
      {/* Similar pattern for other fields */}
    </form>
  );
};
```

## AUTHENTICATION FLOW

Authentication is managed by AuthContext at `src/context/AuthContext.jsx`.

### Login Flow
```jsx
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      await login(email, password);
      // User is now logged in, redirect handled by context
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        placeholder="Email"
      />
      <input 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
        placeholder="Password"
      />
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

### Logout Flow
```jsx
import { useAuth } from '../context/AuthContext';

const LogoutButton = () => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    // User is logged out, redirect to login page
  };

  return (
    <button onClick={handleLogout}>
      Logout
    </button>
  );
};
```

### Checking Auth State
```jsx
import { useAuth } from '../context/AuthContext';

const ProtectedComponent = () => {
  const { user, isAuthenticated, isInitialized } = useAuth();

  // Wait for auth to initialize
  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  // Check if user is logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div>
      <p>Welcome, {user.displayName || user.email}!</p>
    </div>
  );
};
```

### Token Management
- **Access tokens** are stored via HTTP-only cookies (secure, not accessible via JavaScript)
- **Token refresh** is handled automatically by axios interceptors in `src/services/api.js`
- When access token expires, the interceptor calls `/auth/refresh` to get a new token
- If refresh fails, user is redirected to login

### AuthContext API
```jsx
const {
  user,           // Current user object or null
  loading,        // Boolean - true during auth operations
  isInitialized,  // Boolean - true after initial auth check
  isAuthenticated,// Boolean - true if user is logged in
  login,          // Function(email, password) - login user
  register,       // Function(userData) - register new user
  logout,         // Function() - logout user
  updateUser,     // Function(updates) - update user state locally
  refreshUser,    // Function() - fetch fresh user data from API
} = useAuth();
```
