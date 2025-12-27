# Sentry Integration Guide

**Version:** 1.0.0  
**Last Updated:** 2025-11-03  

---

## Overview

Sentry provides real-time error tracking and performance monitoring for Project Valine. This guide covers frontend integration, configuration, and best practices.

## Installation

### 1. Install Dependencies

```powershell
npm install --save @sentry/react @sentry/tracing
```

### 2. Get Sentry DSN

1. Create account at https://sentry.io
2. Create new project (React)
3. Copy the DSN (Data Source Name)
4. Add to `.env.local`:

```powershell
VITE_SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/789012
VITE_SENTRY_ENVIRONMENT=production
```

## Configuration

### Basic Setup

Create `src/utils/sentry.js`:

```javascript
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

export function initSentry() {
  // Only initialize in production
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
      
      // Performance Monitoring
      integrations: [
        new BrowserTracing({
          // React Router integration
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            React.useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes
          ),
        }),
      ],
      
      // Sample rate for performance monitoring
      tracesSampleRate: 0.1, // 10% of transactions
      
      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || 'unknown',
      
      // PII Scrubbing (see below)
      beforeSend: scrubPII,
    });
  }
}

// PII Scrubbing function
function scrubPII(event, hint) {
  // Remove email addresses
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
  }
  
  // Scrub email from error messages
  if (event.message) {
    event.message = event.message.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '[EMAIL_REDACTED]'
    );
  }
  
  // Scrub request data
  if (event.request && event.request.data) {
    const data = event.request.data;
    if (typeof data === 'object') {
      delete data.email;
      delete data.password;
      delete data.phone;
    }
  }
  
  return event;
}
```

### Initialize in App

Update `src/main.jsx`:

```javascript
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { initSentry } from "./utils/sentry";

// Initialize Sentry BEFORE React
initSentry();

import App from "./routes/App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

### Wrap App with Sentry

Update `src/routes/App.jsx`:

```javascript
import * as Sentry from "@sentry/react";
import { Routes, Route } from "react-router-dom";

// Wrap routes with Sentry profiler
const SentryRoutes = Sentry.withSentryRouting(Routes);

export default function App() {
  return (
    <SentryRoutes>
      <Route path="/" element={<HomePage />} />
      {/* ... other routes */}
    </SentryRoutes>
  );
}
```

## Usage

### Automatic Error Capture

Sentry automatically captures:
- Unhandled exceptions
- Unhandled promise rejections
- Console errors (configurable)

### Manual Error Capture

```javascript
import * as Sentry from "@sentry/react";

// Capture exception
try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error);
  // Still handle error normally
  toast.error("Something went wrong");
}

// Capture message
Sentry.captureMessage("Something suspicious happened", "warning");
```

### Add Context

```javascript
// Set user context (NO PII!)
Sentry.setUser({
  id: user.id,
  username: user.username,
  // DO NOT include: email, phone, real name
});

// Set tags for filtering
Sentry.setTag("page", "dashboard");
Sentry.setTag("feature", "posts");

// Set extra context
Sentry.setContext("post", {
  postId: post.id,
  postType: post.type,
});

// Add breadcrumb
Sentry.addBreadcrumb({
  category: "ui.click",
  message: "User clicked like button",
  level: "info",
});
```

### Error Boundaries

Create `src/components/ErrorBoundary.jsx`:

```javascript
import * as Sentry from "@sentry/react";

const ErrorBoundary = Sentry.ErrorBoundary;

export default function AppErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
          <div className="max-w-md p-8 bg-white dark:bg-neutral-900 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Something went wrong
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              We've been notified and are working on a fix.
            </p>
            <button
              onClick={resetError}
              className="w-full bg-[#0CCE6B] text-white py-2 px-4 rounded-lg hover:bg-[#0BBE60]"
            >
              Try again
            </button>
          </div>
        </div>
      )}
      onError={(error, errorInfo) => {
        console.error("Error boundary caught:", error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

Use in app:

```javascript
import AppErrorBoundary from "./components/ErrorBoundary";

<AppErrorBoundary>
  <App />
</AppErrorBoundary>
```

## Performance Monitoring

### Transaction Tracking

```javascript
// Manual transaction
const transaction = Sentry.startTransaction({
  name: "loadUserDashboard",
  op: "pageload",
});

try {
  await loadUserData();
  await loadPosts();
  transaction.setStatus("ok");
} catch (error) {
  transaction.setStatus("error");
  throw error;
} finally {
  transaction.finish();
}
```

### Custom Spans

```javascript
const transaction = Sentry.getCurrentHub().getScope().getTransaction();

if (transaction) {
  const span = transaction.startChild({
    op: "api.call",
    description: "Fetch posts from API",
  });
  
  try {
    const posts = await fetchPosts();
    span.setStatus("ok");
    return posts;
  } catch (error) {
    span.setStatus("error");
    throw error;
  } finally {
    span.finish();
  }
}
```

## PII Scrubbing

### What to Scrub

**Always Remove:**
- Email addresses
- Passwords
- Phone numbers
- Full names
- Credit card numbers
- IP addresses (usually)
- Social security numbers
- Any other personally identifiable information

**Safe to Include:**
- User IDs (UUIDs)
- Usernames (if not email-based)
- Error messages (sanitized)
- URLs (without query params containing PII)
- Stack traces
- Performance metrics

### Scrubbing Implementation

```javascript
function scrubPII(event) {
  // Remove user PII
  if (event.user) {
    const { email, ip_address, ...safeUser } = event.user;
    event.user = safeUser;
  }
  
  // Scrub error messages
  if (event.message) {
    event.message = scrubString(event.message);
  }
  
  // Scrub exception values
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map(ex => ({
      ...ex,
      value: scrubString(ex.value),
    }));
  }
  
  // Scrub breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(crumb => ({
      ...crumb,
      message: scrubString(crumb.message),
      data: scrubObject(crumb.data),
    }));
  }
  
  // Scrub request data
  if (event.request) {
    event.request.url = scrubUrl(event.request.url);
    event.request.query_string = scrubQueryString(event.request.query_string);
    event.request.data = scrubObject(event.request.data);
  }
  
  return event;
}

function scrubString(str) {
  if (!str) return str;
  
  // Remove emails
  str = str.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[EMAIL]'
  );
  
  // Remove phone numbers (US format)
  str = str.replace(
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    '[PHONE]'
  );
  
  // Remove credit cards
  str = str.replace(
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
    '[CC]'
  );
  
  return str;
}

function scrubObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveKeys = [
    'password', 'email', 'phone', 'ssn', 
    'creditCard', 'cvv', 'pin', 'secret'
  ];
  
  const scrubbed = { ...obj };
  
  for (const key of Object.keys(scrubbed)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      scrubbed[key] = '[REDACTED]';
    } else if (typeof scrubbed[key] === 'object') {
      scrubbed[key] = scrubObject(scrubbed[key]);
    }
  }
  
  return scrubbed;
}

function scrubUrl(url) {
  if (!url) return url;
  
  try {
    const urlObj = new URL(url);
    // Remove sensitive query params
    ['email', 'token', 'apiKey'].forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });
    return urlObj.toString();
  } catch {
    return url;
  }
}
```

## Best Practices

### 1. Environment-Specific Configuration

```javascript
const SENTRY_CONFIG = {
  development: {
    enabled: false, // Don't send errors in dev
    debug: true,
    tracesSampleRate: 1.0,
  },
  staging: {
    enabled: true,
    debug: false,
    tracesSampleRate: 0.5,
  },
  production: {
    enabled: true,
    debug: false,
    tracesSampleRate: 0.1,
  },
};

const config = SENTRY_CONFIG[import.meta.env.MODE] || SENTRY_CONFIG.production;

if (config.enabled) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    debug: config.debug,
    tracesSampleRate: config.tracesSampleRate,
    // ...
  });
}
```

### 2. Filter Noise

```javascript
Sentry.init({
  // ...
  ignoreErrors: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
    
    // Network errors (often user connectivity issues)
    'Network Error',
    'Failed to fetch',
    'NetworkError',
    
    // Ad blockers
    'adsbygoogle',
    
    // Common non-critical errors
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],
  
  denyUrls: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
  ],
});
```

### 3. Release Tracking

```javascript
// In vite.config.js
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(
      process.env.npm_package_version
    ),
    'import.meta.env.VITE_COMMIT_SHA': JSON.stringify(
      process.env.GITHUB_SHA?.substring(0, 7) || 'dev'
    ),
  },
});

// In Sentry config
Sentry.init({
  release: `valine@${import.meta.env.VITE_APP_VERSION}`,
  dist: import.meta.env.VITE_COMMIT_SHA,
});
```

### 4. Source Maps

Upload source maps for better stack traces:

```powershell
# Install Sentry CLI
npm install --save-dev @sentry/cli

# Configure in package.json
{
  "scripts": {
    "build": "vite build",
    "build:sentry": "vite build && sentry-cli sourcemaps upload --org ORG --project PROJECT ./dist"
  }
}

# Or use Vite plugin
npm install --save-dev @sentry/vite-plugin
```

```javascript
// vite.config.js
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  build: {
    sourcemap: true, // Enable source maps
  },
  plugins: [
    sentryVitePlugin({
      org: "your-org",
      project: "valine",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

## Monitoring & Alerts

### Sentry Dashboard

Key metrics to monitor:
- **Error Rate** - Errors per minute
- **Affected Users** - Unique users experiencing errors
- **Error Types** - Most common error categories
- **Performance** - Transaction duration percentiles

### Alert Rules

Create alerts for:
1. **High Error Rate**
   - Condition: > 50 errors in 5 minutes
   - Action: Slack/email notification

2. **New Error Type**
   - Condition: First seen error
   - Action: Slack notification

3. **Performance Regression**
   - Condition: P95 latency > 3 seconds
   - Action: Email notification

### Integration with Slack

1. Go to Sentry Settings → Integrations
2. Install Slack integration
3. Configure channel for alerts
4. Set up alert rules to post to Slack

## Troubleshooting

### Sentry Not Capturing Errors

```javascript
// Test Sentry is working
import * as Sentry from "@sentry/react";

// Capture test error
Sentry.captureException(new Error("Test error from Project Valine"));

// Check console for Sentry initialization
console.log("Sentry initialized:", Sentry.getCurrentHub().getClient() !== undefined);
```

### Too Many Events

Reduce sample rate:

```javascript
Sentry.init({
  tracesSampleRate: 0.05, // Only 5% of transactions
  
  // Or sample based on condition
  tracesSampler: (samplingContext) => {
    // High-priority transactions
    if (samplingContext.transactionContext.name === "checkout") {
      return 1.0; // 100%
    }
    
    // Everything else
    return 0.1; // 10%
  },
});
```

### Missing Context

Ensure context is set before errors occur:

```javascript
// Early in app initialization
useEffect(() => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      username: user.username,
    });
  }
}, [user]);
```

## Cost Optimization

### Free Tier Limits
- 5,000 errors/month
- 10,000 performance units/month
- 1 user

### Optimize Usage
1. **Filter noise** (see Best Practices)
2. **Reduce sample rate** for performance monitoring
3. **Set quotas** per project
4. **Archive old issues** regularly

## Resources

- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/react/
- **Performance Monitoring:** https://docs.sentry.io/platforms/javascript/performance/
- **PII Scrubbing:** https://docs.sentry.io/platforms/javascript/data-management/sensitive-data/
- **Source Maps:** https://docs.sentry.io/platforms/javascript/sourcemaps/

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-03  
**Next Review:** 2025-12-03
