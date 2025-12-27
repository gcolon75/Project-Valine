# Bundle Optimization Guide

Strategies for keeping JavaScript and CSS bundle sizes manageable in Project Valine.

## Current Budgets

| Asset Type | Budget | Current | Status |
|------------|--------|---------|--------|
| Total JavaScript | 300 KB | TBD | 📊 |
| Total CSS | 60 KB | TBD | 📊 |
| Largest JS file | 250 KB | TBD | 📊 |
| Largest CSS file | 50 KB | TBD | 📊 |

_Run `npm run build:analyze` to get current metrics_

## Why Bundle Size Matters

- **Load Time**: Smaller bundles = faster downloads
- **Parse Time**: Less JavaScript = faster execution
- **Mobile Users**: Limited bandwidth and data caps
- **SEO**: Page speed is a ranking factor
- **User Experience**: Faster sites have better engagement

**Rule of Thumb**: JavaScript budget for interactive sites should be < 200 KB compressed, < 600 KB uncompressed

## Analyzing Current Bundle

### Quick Analysis
```powershell
# Build and analyze
npm run build:analyze

# This runs:
# 1. npm run build
# 2. npm run perf:audit

# Output shows:
# - Total bundle size
# - Individual file sizes
# - Budget violations
```

### Detailed Analysis

#### Using Build Output
```powershell
npm run build

# Check dist/ directory
ls -lh dist/assets/

# Typical output:
# index-abc123.js    250 KB  (main bundle)
# vendor-def456.js   180 KB  (dependencies)
# style-ghi789.css    45 KB  (all styles)
```

#### Visualizing Bundle
```powershell
# For Vite (if rollup-plugin-visualizer is added)
npm install --save-dev rollup-plugin-visualizer

# Add to vite.config.js:
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ]
}

# Then build:
npm run build
# Opens interactive bundle visualization in browser
```

## Optimization Strategies

### 1. Code Splitting

**Goal**: Load only what's needed for current route

#### Route-Based Splitting
```jsx
// src/App.jsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// ❌ Import everything upfront (bloats initial bundle)
// import Dashboard from './pages/Dashboard';
// import Profile from './pages/Profile';

// ✅ Lazy load route components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

**Savings**: ~50-100 KB per route not loaded on initial page

#### Component-Based Splitting
```jsx
// For heavy components not always needed
const HeavyChart = lazy(() => import('./components/HeavyChart'));
const VideoPlayer = lazy(() => import('./components/VideoPlayer'));
const MarkdownEditor = lazy(() => import('./components/MarkdownEditor'));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>
      
      {showChart && (
        <Suspense fallback={<Skeleton />}>
          <HeavyChart data={data} />
        </Suspense>
      )}
    </div>
  );
}
```

**Savings**: ~20-50 KB per heavy component deferred

#### Library Code Splitting
```jsx
// Split large libraries into separate chunks
// Example: Date manipulation only on some pages

// ❌ Import at top level
// import { format, parseISO } from 'date-fns';

// ✅ Import dynamically when needed
async function formatDate(dateString) {
  const { format, parseISO } = await import('date-fns');
  return format(parseISO(dateString), 'MMM dd, yyyy');
}
```

### 2. Tree Shaking

**Goal**: Remove unused code from bundles

#### Import Specific Functions
```jsx
// ❌ Imports entire library (~100 KB)
import _ from 'lodash';
const result = _.debounce(fn, 300);

// ✅ Import only what's needed (~5 KB)
import debounce from 'lodash/debounce';
const result = debounce(fn, 300);

// ✅ Or use ES modules version (better for tree shaking)
import { debounce } from 'lodash-es';
```

#### Named Imports
```jsx
// ❌ Default import (may include extras)
import * as Icons from 'lucide-react';

// ✅ Named imports (only what's used)
import { Search, Menu, User, Bell } from 'lucide-react';
```

#### Check for ES Module Support
```json
// package.json
{
  "type": "module",  // ✅ Project uses ES modules
  "dependencies": {
    "some-lib": "^1.0.0"  // Check if lib has "module" field
  }
}
```

### 3. Dependency Optimization

#### Audit Dependencies
```powershell
# List all dependencies with sizes
npx vite-bundle-visualizer

# or
npm install --save-dev webpack-bundle-analyzer
```

#### Find Heavy Dependencies
```powershell
# Check what's taking up space
du -sh node_modules/* | sort -rh | head -20

# Common culprits:
# - moment.js (288 KB) → Use date-fns (13 KB) or day.js (7 KB)
# - lodash (71 KB) → Use lodash-es + tree shaking
# - Chart.js (90 KB) → Consider recharts or lighter alternative
```

#### Replace Heavy Libraries

**Date Libraries**:
```powershell
# ❌ moment.js (288 KB)
npm uninstall moment

# ✅ date-fns (13 KB with tree shaking)
npm install date-fns

# ✅ Or day.js (7 KB)
npm install dayjs
```

**Utility Libraries**:
```powershell
# ❌ lodash (71 KB)
# Use lodash-es instead (better tree shaking)
npm install lodash-es

# Or replace with native JS:
# _.map() → Array.map()
# _.filter() → Array.filter()
# _.debounce() → Custom or tiny debounce
```

**Animation Libraries**:
```powershell
# Current: framer-motion (large)
# Consider if all features are needed

# Lighter alternatives:
# - react-spring (lighter)
# - CSS animations (no JS)
```

#### Remove Unused Dependencies
```powershell
# Find unused dependencies
npx depcheck

# Remove them
npm uninstall unused-package-1 unused-package-2

# Check if package is only needed in dev
npm install --save-dev package-name
```

### 4. Dynamic Imports

**When to Use**:
- Features behind user actions (clicks, tabs)
- Admin-only features
- Heavy libraries (charts, editors)
- Polyfills for older browsers

**Example**:
```jsx
// Admin panel only for admins
function Dashboard() {
  const { isAdmin } = useAuth();
  const [AdminPanel, setAdminPanel] = useState(null);
  
  useEffect(() => {
    if (isAdmin) {
      import('./components/AdminPanel').then(module => {
        setAdminPanel(() => module.default);
      });
    }
  }, [isAdmin]);
  
  return (
    <div>
      {/* Regular dashboard */}
      {AdminPanel && <AdminPanel />}
    </div>
  );
}
```

### 5. CSS Optimization

#### Tailwind Purging
```js
// tailwind.config.js (already configured)
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  // Only includes used utility classes
};
```

**Verification**:
```powershell
# Build and check CSS size
npm run build
ls -lh dist/assets/*.css

# Should be < 60 KB
```

#### Component CSS
```jsx
// ❌ Global CSS that can't be tree-shaken
import './styles.css';

// ✅ CSS Modules (scoped + tree-shakeable)
import styles from './Component.module.css';

// ✅ Or styled-components / emotion (CSS-in-JS)
import styled from 'styled-components';
```

#### Critical CSS
```jsx
// Inline critical styles in index.html
<style>
  /* Above-the-fold styles only */
  .hero { /* ... */ }
</style>

<!-- Load rest later -->
<link rel="stylesheet" href="style.css" media="print" onload="this.media='all'" />
```

### 6. Build Configuration

#### Vite Optimization
```js
// vite.config.js
export default {
  build: {
    // Split vendor code
    rollupOptions: {
      output: {
        manualChunks: {
          // Group React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Group UI libraries
          'ui-vendor': ['framer-motion', 'react-hot-toast'],
          // Separate large libraries
          'sanity': ['@sanity/client'],
        },
      },
    },
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 250, // KB
  },
};
```

#### Compression
```js
// Add gzip/brotli compression
import viteCompression from 'vite-plugin-compression';

export default {
  plugins: [
    viteCompression({
      algorithm: 'brotli',
      ext: '.br',
    }),
  ],
};
```

### 7. Asset Optimization

#### Images
```powershell
# Already have script
npm run optimize:images

# Converts images to WebP
# Reduces size by ~30%
```

#### Icons
```jsx
// ❌ Import all icons
import * as Icons from 'lucide-react';

// ✅ Import only used icons
import { Menu, User, Settings } from 'lucide-react';

// ✅ Or use icon font/sprite (if many icons)
```

#### Fonts
```html
<!-- Load only needed font weights -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">

<!-- Not all weights: wght@100;200;300;400;500;600;700;800;900 -->
```

## Monitoring Bundle Size

### In CI/CD
The `bundle-analysis.yml` workflow runs on every PR:

1. Builds the application
2. Analyzes bundle sizes
3. Compares against budgets
4. Fails if budgets exceeded
5. Posts results to PR

**Viewing Results**:
- Check PR comment for summary
- Download artifacts for detailed breakdown
- Review job summary in Actions tab

### Manual Checks
```powershell
# Before making changes
npm run build:analyze > before.txt

# Make your changes

# After changes
npm run build:analyze > after.txt

# Compare
diff before.txt after.txt
```

### Setting Up Alerts
```yaml
# In bundle-analysis.yml (already configured)
# Fails if:
# - Total JS > 300 KB
# - Total CSS > 60 KB
# - Largest JS > 250 KB
# - Largest CSS > 50 KB
```

## Best Practices

### Code Review Checklist
- [ ] New dependencies justified and documented
- [ ] Heavy libraries split or lazy loaded
- [ ] No accidental imports of entire libraries
- [ ] Images optimized (WebP/AVIF)
- [ ] New routes use lazy loading
- [ ] Bundle analysis shows acceptable size
- [ ] No console.logs in production code

### Development Guidelines

**DO**:
- ✅ Use lazy loading for routes
- ✅ Import specific functions, not entire libraries
- ✅ Check bundle impact of new dependencies
- ✅ Optimize images before committing
- ✅ Use code splitting for heavy components
- ✅ Prefer lighter alternatives when possible

**DON'T**:
- ❌ Import entire libraries (lodash, moment, etc.)
- ❌ Add dependencies without checking size
- ❌ Leave console.logs in production code
- ❌ Commit large unoptimized images
- ❌ Import components that aren't used
- ❌ Inline large data (move to API)

### Periodic Maintenance
```powershell
# Monthly:
# 1. Check for outdated dependencies
npm outdated

# 2. Update dependencies (test thoroughly!)
npm update

# 3. Remove unused dependencies
npx depcheck

# 4. Analyze bundle
npm run build:analyze

# 5. Check for duplicate dependencies
npm dedupe
```

## Common Issues

### Issue: Bundle Size Exceeds Budget

**Diagnose**:
```powershell
npm run build:analyze
# Look for largest files
```

**Common Causes**:
1. New heavy dependency
2. Not using lazy loading
3. Importing entire libraries
4. Large data inline in code

**Solutions**:
1. Review new dependencies (use lighter alternatives)
2. Add lazy loading for routes/components
3. Import specific functions only
4. Move data to API or separate JSON files

### Issue: Vendor Bundle Too Large

**Diagnose**:
```powershell
# Check what's in vendor bundle
npm run build
# Look at vendor-*.js size
```

**Solution**:
```js
// vite.config.js - Split vendor further
manualChunks: {
  'react-core': ['react', 'react-dom'],
  'react-router': ['react-router-dom'],
  'ui-libs': ['framer-motion', 'react-hot-toast'],
  'sanity': ['@sanity/client'],
}
```

### Issue: Duplicate Dependencies

**Diagnose**:
```powershell
npm ls <package-name>
# Shows all versions installed
```

**Solution**:
```powershell
# Deduplicate
npm dedupe

# Or force single version in package.json
"resolutions": {
  "package-name": "1.2.3"
}
```

## Advanced Techniques

### Prefetching
```jsx
// Prefetch next likely route
import { Link } from 'react-router-dom';

<Link 
  to="/dashboard" 
  onMouseEnter={() => import('./pages/Dashboard')}
>
  Dashboard
</Link>
```

### Service Workers
```js
// Cache assets for offline use
// Reduces perceived load time
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);
```

### HTTP/2 Server Push
```
// Server configuration (not applicable for static hosting)
Link: </app.js>; rel=preload; as=script
Link: </style.css>; rel=preload; as=style
```

## Resources

### Tools
- **Vite Bundle Visualizer**: npm install -D rollup-plugin-visualizer
- **Bundle Buddy**: bundle-buddy.com (analyze webpack/rollup)
- **Bundlephobia**: bundlephobia.com (check package sizes)
- **webpack-bundle-analyzer**: For webpack projects

### Articles
- **Web.dev - Reduce JavaScript Payloads**: web.dev/reduce-javascript-payloads-with-code-splitting/
- **Vite Code Splitting**: vitejs.dev/guide/features.html#code-splitting
- **React Code Splitting**: react.dev/reference/react/lazy

### Benchmarks
- **Bundle Size Benchmarks**: bundlephobia.com
- **npm Package Size**: packagephobia.com

---

## Project Valine Specifics

### Current Dependencies Analysis
```powershell
# Run to get current state
npm run build:analyze
```

### Identified Opportunities
1. **Route splitting**: Not all routes use lazy loading
2. **Library imports**: Some full library imports detected
3. **Image optimization**: Run `npm run optimize:images` on new images
4. **Vendor splitting**: Could split further for better caching

### Action Items
- [ ] Audit all dependencies for size (use bundlephobia.com)
- [ ] Implement lazy loading for all routes
- [ ] Replace moment.js if used (use date-fns)
- [ ] Ensure all images use WebP/AVIF
- [ ] Set up automated bundle size tracking

---

**Last Updated**: 2025-11-05  
**Maintained By**: Operational Readiness Team
