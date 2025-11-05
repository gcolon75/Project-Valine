# Lighthouse Performance Guide

Guide to understanding and improving Lighthouse performance scores for Project Valine.

## Overview

Lighthouse is an automated tool for improving web app quality. It audits:
- **Performance**: Load speed and runtime performance
- **Accessibility**: WCAG compliance
- **Best Practices**: Modern web development standards
- **SEO**: Search engine optimization
- **Progressive Web App**: PWA criteria (if applicable)

## Performance Budgets

Our CI enforces the following performance budgets for marketing pages:

| Metric | Budget | Description |
|--------|--------|-------------|
| **Performance Score** | ≥ 80/100 | Overall performance rating |
| **FCP** | ≤ 2.0s | First Contentful Paint - First content rendered |
| **LCP** | ≤ 3.0s | Largest Contentful Paint - Main content visible |
| **CLS** | ≤ 0.1 | Cumulative Layout Shift - Visual stability |
| **TBT** | ≤ 300ms | Total Blocking Time - Interactivity |
| **Speed Index** | ≤ 3.0s | How quickly content is visually populated |

## Core Web Vitals

Google's Core Web Vitals are key metrics for user experience:

### Largest Contentful Paint (LCP)
**Measures**: Loading performance  
**Good**: ≤ 2.5s | **Needs Improvement**: 2.5-4.0s | **Poor**: > 4.0s

**Common Issues**:
- Large images not optimized
- Render-blocking JavaScript or CSS
- Slow server response times
- Client-side rendering delays

**Fixes**:
```jsx
// ✅ Optimize images
<img 
  src="hero.webp" 
  alt="Hero"
  loading="lazy"
  width={800}
  height={600}
/>

// ✅ Preload critical resources
<link rel="preload" href="hero.jpg" as="image" />

// ✅ Use responsive images
<img
  src="small.jpg"
  srcSet="small.jpg 400w, medium.jpg 800w, large.jpg 1200w"
  sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
  alt="Responsive"
/>
```

### First Input Delay (FID) / Total Blocking Time (TBT)
**Measures**: Interactivity  
**Good FID**: ≤ 100ms | **Needs Improvement**: 100-300ms | **Poor**: > 300ms

**Common Issues**:
- Large JavaScript bundles
- Long-running JavaScript tasks
- Heavy third-party scripts

**Fixes**:
```js
// ✅ Code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));

// ✅ Break up long tasks
async function processLargeData(data) {
  for (let i = 0; i < data.length; i++) {
    await processItem(data[i]);
    
    // Yield to browser every 50 items
    if (i % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}

// ✅ Defer non-critical JavaScript
<script src="analytics.js" defer></script>
```

### Cumulative Layout Shift (CLS)
**Measures**: Visual stability  
**Good**: ≤ 0.1 | **Needs Improvement**: 0.1-0.25 | **Poor**: > 0.25

**Common Issues**:
- Images without dimensions
- Ads or embeds without reserved space
- Web fonts causing FOIT/FOUT
- Dynamically injected content

**Fixes**:
```jsx
// ✅ Always set image dimensions
<img src="avatar.jpg" width={100} height={100} alt="Avatar" />

// ✅ Reserve space for dynamic content
<div className="min-h-[200px]">
  {loading ? <Skeleton /> : <Content />}
</div>

// ✅ Font loading strategy
<link
  rel="preload"
  href="/fonts/inter.woff2"
  as="font"
  type="font/woff2"
  crossOrigin="anonymous"
/>
```

## Optimization Strategies

### 1. Image Optimization

**Current script**: `npm run optimize:images`

**Best Practices**:
```bash
# Convert to modern formats
# WebP: 25-35% smaller than JPEG
# AVIF: 20% smaller than WebP (newer)

# Use the existing script or manual conversion
npm run optimize:images

# Or manual with sharp
npx sharp input.jpg -o output.webp
```

**In Components**:
```jsx
// ✅ Use modern formats with fallbacks
<picture>
  <source srcSet="image.avif" type="image/avif" />
  <source srcSet="image.webp" type="image/webp" />
  <img src="image.jpg" alt="Fallback" />
</picture>

// ✅ Lazy load below-the-fold images
<img src="image.jpg" loading="lazy" alt="Below fold" />

// ✅ Use appropriate sizes
// Don't serve 2000px image when 400px is displayed
```

**Image Checklist**:
- [ ] Use WebP or AVIF format
- [ ] Compress images (80-85% quality)
- [ ] Set explicit width and height
- [ ] Use lazy loading for below-the-fold
- [ ] Use responsive images (srcSet)
- [ ] Optimize SVGs (remove metadata)

### 2. JavaScript Optimization

**Bundle Analysis**: `npm run build:analyze`

**Strategies**:

#### Code Splitting
```jsx
// ✅ Route-based splitting
const routes = [
  {
    path: '/dashboard',
    component: lazy(() => import('./pages/Dashboard'))
  },
  {
    path: '/profile',
    component: lazy(() => import('./pages/Profile'))
  }
];

// ✅ Component-based splitting
const HeavyChart = lazy(() => import('./components/HeavyChart'));

// ✅ Conditional loading
if (user.isAdmin) {
  const AdminPanel = await import('./components/AdminPanel');
}
```

#### Tree Shaking
```js
// ❌ Imports everything
import _ from 'lodash';

// ✅ Import only what's needed
import debounce from 'lodash/debounce';

// ✅ Or use ES modules
import { debounce } from 'lodash-es';
```

#### Remove Unused Code
```bash
# Check for unused dependencies
npx depcheck

# Analyze bundle
npm run build:analyze

# Remove unused imports
# (ESLint can help with this)
```

### 3. CSS Optimization

**Tailwind Purging** (already configured):
```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'], // Purges unused styles
  // ...
};
```

**Critical CSS**:
```html
<!-- Inline critical CSS in <head> -->
<style>
  /* Above-the-fold styles */
  .hero { /* ... */ }
</style>

<!-- Load rest async -->
<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
```

### 4. Font Optimization

**Current Setup**: Check for web fonts in use

**Best Practices**:
```html
<!-- Preload critical fonts -->
<link
  rel="preload"
  href="/fonts/inter-regular.woff2"
  as="font"
  type="font/woff2"
  crossOrigin="anonymous"
/>

<!-- Use font-display: swap -->
<style>
  @font-face {
    font-family: 'Inter';
    font-display: swap; /* Show fallback while loading */
    src: url('/fonts/inter-regular.woff2') format('woff2');
  }
</style>
```

**Subsetting**:
```bash
# Include only needed characters
# Example for English + common symbols
pyftsubset font.ttf \
  --output-file=font-subset.woff2 \
  --flavor=woff2 \
  --unicodes=U+0020-007E,U+00A0-00FF
```

### 5. Render Optimization

**Server-Side Rendering (SSR)** considerations:
```jsx
// If using SSR, ensure critical content renders first
// Current: Vite SPA (client-side rendering)

// Consider SSR with Vite SSR or Next.js for:
// - Faster FCP/LCP
// - Better SEO
// - Improved perceived performance
```

**Resource Hints**:
```html
<!-- DNS prefetch for external domains -->
<link rel="dns-prefetch" href="https://api.example.com" />

<!-- Preconnect for critical resources -->
<link rel="preconnect" href="https://fonts.googleapis.com" />

<!-- Prefetch next page -->
<link rel="prefetch" href="/dashboard" />
```

### 6. Caching Strategy

**Vite Build Output** (automatically configured):
```
dist/
  assets/
    app.[hash].js      # Cache: immutable (1 year)
    vendor.[hash].js   # Cache: immutable (1 year)
    style.[hash].css   # Cache: immutable (1 year)
  index.html          # Cache: no-cache (always validate)
```

**Service Worker** (if implementing PWA):
```js
// Cache static assets
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

// Cache API calls
workbox.routing.registerRoute(
  /\/api\//,
  new workbox.strategies.NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);
```

## Running Lighthouse Locally

### Via Chrome DevTools
1. Open Chrome DevTools (F12)
2. Go to "Lighthouse" tab
3. Select categories to audit
4. Choose device (Mobile/Desktop)
5. Click "Analyze page load"

### Via CLI
```bash
# Install Lighthouse globally
npm install -g lighthouse

# Run audit
lighthouse https://localhost:4173 --view

# With custom config
lighthouse https://localhost:4173 \
  --preset=desktop \
  --output=html \
  --output-path=./lighthouse-report.html
```

### Via CI Workflow
```bash
# Trigger manual run
gh workflow run lighthouse-ci.yml

# Or wait for scheduled run (Wednesdays 9 AM UTC)
```

## Interpreting Results

### Performance Score Breakdown
- **0-49**: ❌ Poor (Red)
- **50-89**: 🟡 Needs Improvement (Orange)
- **90-100**: ✅ Good (Green)

### Score Weighting
- **FCP**: 10%
- **Speed Index**: 10%
- **LCP**: 25%
- **TTI**: 10%
- **TBT**: 30%
- **CLS**: 15%

### Opportunities
Lighthouse suggests specific improvements with estimated savings:

**Example**:
- Properly size images: Save 0.5s
- Eliminate render-blocking resources: Save 0.8s
- Enable text compression: Save 0.3s

**Action**: Focus on items with highest savings first

### Diagnostics
Additional information to help understand performance:

- Minimize main-thread work
- Reduce JavaScript execution time
- Avoid enormous network payloads
- Keep request counts low

## Common Issues & Solutions

### Issue: Low Performance Score (< 80)

**Check**:
1. Bundle size (run `npm run build:analyze`)
2. Image sizes and formats
3. Third-party scripts
4. Render-blocking resources

**Solutions**:
1. Implement code splitting
2. Optimize/compress images
3. Defer non-critical scripts
4. Use async/defer on script tags

### Issue: High LCP (> 3.0s)

**Check**:
1. Size of largest content element (usually hero image)
2. Server response time
3. Render-blocking resources

**Solutions**:
1. Optimize and compress largest image
2. Use WebP/AVIF format
3. Preload critical resources
4. Consider CDN for static assets

### Issue: High CLS (> 0.1)

**Check**:
1. Images without dimensions
2. Dynamic content insertion
3. Web font loading

**Solutions**:
1. Set width/height on all images
2. Reserve space for dynamic content
3. Use `font-display: swap`
4. Avoid inserting content above existing content

### Issue: High TBT (> 300ms)

**Check**:
1. Large JavaScript bundles
2. Long-running tasks on main thread
3. Heavy third-party scripts

**Solutions**:
1. Split and lazy load JavaScript
2. Break up long tasks
3. Review and remove unnecessary third-party scripts
4. Use web workers for heavy computation

## Performance Monitoring

### Lighthouse CI in PR Workflow
Every PR automatically runs Lighthouse CI on:
- Home page (`/`)
- Features page (`/features`)
- About page (`/about-us`)
- Login page (`/login`)
- Join page (`/join`)

**Viewing Results**:
1. Check PR comments for summary
2. Download full report from workflow artifacts
3. Review job summary in Actions tab

### Performance Budgets Enforcement
The workflow fails if:
- Performance score < 80
- Any Core Web Vital exceeds budget
- Specific metrics exceed thresholds

**When to Update Budgets**:
- Feature requires heavier assets
- Trade-off accepted for functionality
- Document reason in PR

### Tracking Over Time
```bash
# Store results for comparison
# Consider integrating with:
# - Lighthouse CI Server
# - Performance monitoring service (e.g., SpeedCurve)
# - Custom dashboard
```

## Best Practices

### For Development
1. **Test early**: Run Lighthouse during development
2. **Profile before optimizing**: Use Chrome DevTools Performance tab
3. **Measure impact**: Run Lighthouse before and after changes
4. **Focus on user experience**: Metrics are proxies for UX

### For Code Review
1. Check Lighthouse CI results in PR
2. Question large bundle size increases
3. Verify images are optimized
4. Ensure lazy loading where appropriate

### For Production
1. Monitor Core Web Vitals with Real User Monitoring (RUM)
2. Set up alerts for performance regressions
3. Review Lighthouse scores regularly
4. Keep performance budgets up to date

## Resources

### Tools
- **Lighthouse CI**: github.com/GoogleChrome/lighthouse-ci
- **Web Vitals Extension**: Chrome Web Store
- **PageSpeed Insights**: pagespeed.web.dev
- **WebPageTest**: webpagetest.org

### Documentation
- **Lighthouse Scoring**: web.dev/performance-scoring/
- **Core Web Vitals**: web.dev/vitals/
- **Web Performance**: developer.mozilla.org/en-US/docs/Web/Performance

### Learning
- **web.dev**: web.dev/learn/
- **Lighthouse Docs**: developers.google.com/web/tools/lighthouse

---

## Project Valine Metrics

### Current Baseline
(To be updated after first Lighthouse CI run)

| Page | Performance | FCP | LCP | CLS | TBT |
|------|-------------|-----|-----|-----|-----|
| Home | TBD | TBD | TBD | TBD | TBD |
| Features | TBD | TBD | TBD | TBD | TBD |
| About | TBD | TBD | TBD | TBD | TBD |
| Login | TBD | TBD | TBD | TBD | TBD |
| Join | TBD | TBD | TBD | TBD | TBD |

### Target Goals
- Performance: ≥ 90 (stretch goal from ≥ 80)
- All Core Web Vitals in "Good" range
- Bundle size < 250 KB (currently ~300 KB budget)

---

**Last Updated**: 2025-11-05  
**Maintained By**: Operational Readiness Team
