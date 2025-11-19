# White Screen Hardening - Visual Guide

## User Experience Flow

### Scenario 1: Normal Operation
```
User visits app
    ↓
Page loads
    ↓
React app mounts successfully
    ↓
window.__appMounted() called
    ↓
Boot watchdog timer cancelled
    ↓
✅ App displays normally
```

### Scenario 2: Mount Failure (Boot Watchdog Triggers)
```
User visits app
    ↓
Page loads
    ↓
React app FAILS to mount (JS error, bundle 404, etc.)
    ↓
8 seconds pass...
    ↓
Boot watchdog detects failure
    ↓
Console logs diagnostic info:
  - Common causes checklist
  - Current URL
  - User agent
  - Module scripts detected
    ↓
Overlay appears with:
  ┌─────────────────────────────────────┐
  │           ⚠️  Failed to Load        │
  │                                     │
  │  The app is taking longer than     │
  │  expected to start. This might     │
  │  be due to:                        │
  │                                     │
  │  • Network connectivity issues     │
  │  • Cached outdated files           │
  │  • Browser extension conflicts     │
  │                                     │
  │  [ Retry ]  [ Clear Cache & Retry ]│
  └─────────────────────────────────────┘
```

### Scenario 3: React Component Error (ErrorBoundary Catches)
```
User navigates to page
    ↓
Component throws error during render
    ↓
ErrorBoundary catches error
    ↓
Error logged to window.__errorInstrumentation
    ↓
Friendly UI displays:
  ┌─────────────────────────────────────┐
  │          ⚠️  Oops! Something        │
  │            went wrong               │
  │                                     │
  │  We've encountered an unexpected   │
  │  error. Don't worry, our team has  │
  │  been notified.                    │
  │                                     │
  │  [ Try Again ]    [ Reload ]       │
  │                                     │
  │  Clear cache & reload              │
  │  ← Back to Home                    │
  └─────────────────────────────────────┘
```

## ErrorBoundary UI (Enhanced)

### Before This PR
- Try Again button
- Reload Page button
- Back to Home link

### After This PR
- Try Again button
- Reload button (renamed from "Reload Page")
- **NEW: Clear cache & reload** link (for stubborn cache issues)
- Back to Home link

## Boot Watchdog Overlay (New)

### Visual Layout
```
╔═══════════════════════════════════════════╗
║  White background, centered on screen     ║
║  ┌───────────────────────────────────┐   ║
║  │                                   │   ║
║  │          🔺 Warning Icon          │   ║
║  │        (Red triangle)             │   ║
║  │                                   │   ║
║  │    Failed to Load                 │   ║
║  │    (24px bold)                    │   ║
║  │                                   │   ║
║  │  The app is taking longer than    │   ║
║  │  expected to start. This might    │   ║
║  │  be due to:                       │   ║
║  │                                   │   ║
║  │  • Network connectivity issues    │   ║
║  │  • Cached outdated files          │   ║
║  │  • Browser extension conflicts    │   ║
║  │                                   │   ║
║  │  ┌────────┐  ┌──────────────────┐ │   ║
║  │  │ Retry  │  │ Clear Cache &    │ │   ║
║  │  │(Green) │  │ Retry (Gray)     │ │   ║
║  │  └────────┘  └──────────────────┘ │   ║
║  │                                   │   ║
║  └───────────────────────────────────┘   ║
║                                           ║
║  Dark overlay (90% opacity) behind        ║
╚═══════════════════════════════════════════╝
```

### Console Output
When boot watchdog triggers:
```
[Boot Watchdog] ⚠️ App failed to mount within 8000ms
[Boot Watchdog] Common causes:
  1. JavaScript bundle failed to load (check Network tab for 404s)
  2. Module returned HTML instead of JavaScript (MIME type issue)
  3. Cached broken bundle (try hard refresh: Ctrl+Shift+R)
  4. JavaScript syntax error in bundle
[Boot Watchdog] Environment:
  - URL: https://app.valine.com/feed
  - User Agent: Mozilla/5.0 ...
  - Module scripts found: 1
    - /assets/index-CbfjFmR9.js
```

## Diagnostic Script Output

### Success Case
```bash
$ node scripts/diagnose-white-screen.js --domain app.valine.com

🔍 White Screen Diagnostic Tool

==================================================
Domain: app.valine.com
==================================================

📍 Testing SPA routes...
✅ / → 200 HTML
✅ /join → 200 HTML
✅ /login → 200 HTML
✅ /feed → 200 HTML
✅ /about → 200 HTML
✅ /settings → 200 HTML

🚫 Testing 404 handling...
✅ 404 test → 404 (correct)

📦 Testing JavaScript bundle...
✅ Bundle checks → OK

==================================================

📊 Results: 8 passed, 0 failed

✅ All checks passed! ✨
```

### Failure Case
```bash
$ node scripts/diagnose-white-screen.js --domain broken.valine.com

🔍 White Screen Diagnostic Tool

==================================================
Domain: broken.valine.com
==================================================

📍 Testing SPA routes...
✅ / → 200 HTML
❌ /join → 404 (expected 200)
❌ /login → 404 (expected 200)
✅ /feed → 200 HTML
✅ /about → 200 HTML
✅ /settings → 200 HTML

🚫 Testing 404 handling...
✅ 404 test → 404 (correct)

📦 Testing JavaScript bundle...
❌ Bundle → Wrong MIME type (HTML instead of JS): text/html

==================================================

📊 Results: 5 passed, 3 failed

❌ 3 check(s) failed. Review the errors above.

💡 Common fixes:
  - Deploy with correct MIME types (scripts/deploy-static-with-mime.sh)
  - Attach SPA rewrite function to CloudFront viewer-request
  - Invalidate CloudFront cache (aws cloudfront create-invalidation)
  - Verify S3 bucket policy allows public read
```

## CloudFront Guard Output

### Success Case
```powershell
PS> .\scripts\guard-cloudfront-config.ps1 -DistributionId "E1234567890ABC"

🔒 CloudFront Configuration Safety Guard

============================================================
Distribution ID: E1234567890ABC
============================================================

ℹ️  Fetching distribution configuration...
✅ Distribution config retrieved

ℹ️  Checking DefaultRootObject...
✅ DefaultRootObject is 'index.html' ✓

ℹ️  Checking default cache behavior for viewer-request function...
✅ Viewer-request function attached ✓

ℹ️  Checking CustomErrorResponses...
✅ No CustomErrorResponses configured (good - using viewer-request function)

ℹ️  Checking origin configuration...
✅ OriginPath is empty (assets served from bucket root) ✓

ℹ️  Checking cache behavior for assets...
✅ Found dedicated cache behavior for assets ✓

============================================================

📊 Status: ✅ PASSED

✅ Configuration looks good! ✨
```

### Failure Case
```powershell
PS> .\scripts\guard-cloudfront-config.ps1 -DistributionId "E1234567890ABC"

🔒 CloudFront Configuration Safety Guard

============================================================
Distribution ID: E1234567890ABC
============================================================

ℹ️  Fetching distribution configuration...
✅ Distribution config retrieved

ℹ️  Checking DefaultRootObject...
✅ DefaultRootObject is 'index.html' ✓

ℹ️  Checking default cache behavior for viewer-request function...
❌ No viewer-request function attached (SPA deep links will fail)
  Expected: CloudFront Function for SPA path rewriting
  Fix: Run .\scripts\cloudfront-associate-spa-function.ps1

ℹ️  Checking CustomErrorResponses...
⚠️  CustomErrorResponses are configured (2 rules)
⚠️  Found 403/404 → /index.html error mappings (should use viewer-request function instead)
  These mappings can mask real errors and cause confusion
  Recommendation: Remove error mappings and rely on viewer-request function

============================================================

📊 Status: ❌ FAILED

❌ Configuration has issues that need to be fixed

🔧 Required fixes:
  1. Ensure viewer-request function is attached for SPA routing
  2. Set DefaultRootObject to 'index.html'
  3. Remove 403/404 → /index.html error response mappings

📚 Documentation:
  - See docs/white-screen-runbook.md for detailed guidance
  - Run: .\scripts\cloudfront-associate-spa-function.ps1
```

## Comparison: Before vs After

### Before This PR

**User sees white screen:**
- No feedback
- No recovery options
- Must contact support or manually clear cache

**Operator investigation:**
1. Check user report
2. Manually test routes
3. Check S3 bucket
4. Check CloudFront config
5. Check browser console (if user provides screenshot)
6. Trial and error fixes
**Time: 30-60 minutes**

### After This PR

**User sees white screen:**
- Boot watchdog shows overlay in 8 seconds
- Two clear recovery options: Retry / Clear Cache & Retry
- Or ErrorBoundary shows with "Clear cache & reload" option

**Operator investigation:**
1. Run: `node scripts/diagnose-white-screen.js --domain app.valine.com`
2. Review output (5-10 seconds)
3. Apply recommended fix
4. Verify with same script
**Time: 2-5 minutes**

## Integration with Existing Tools

### Error Instrumentation
Boot watchdog and ErrorBoundary integrate with existing `window.__errorInstrumentation`:
- Errors are batched and sent to `/internal/observability/log`
- Logged to CloudWatch for monitoring
- Rate-limited to prevent spam

### Performance Monitoring
Boot watchdog respects existing performance monitoring:
- Doesn't interfere with `window.__performanceMonitor`
- Provides additional diagnostic context
- Complements existing Core Web Vitals tracking

### Theme System
Boot watchdog overlay respects theme:
- Uses system CSS variables where available
- Inline styles for reliability (in case CSS fails to load)
- Accessible color contrast maintained

---

**Visual Guide Version:** 1.0  
**Last Updated:** 2024-11-18
