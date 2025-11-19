// public/theme-init.js
// Instant theme initialization to prevent flash
// This script runs before React hydration to set the correct theme
// Also includes client-side error instrumentation for debugging

(function () {
  try {
    // Force light mode for marketing routes before hydration to prevent flicker
    var marketingRoutes = ['/', '/about-us', '/features', '/join', '/signup', '/login'];
    var isMarketingRoute = marketingRoutes.indexOf(window.location.pathname) !== -1;
    
    var t;
    if (isMarketingRoute) {
      // Always force light mode for marketing pages
      t = 'light';
    } else {
      // Use saved theme or default to light for app pages
      t = localStorage.getItem('theme');
      if (!t) t = 'light';
    }

    var root = document.documentElement;
    root.classList.toggle('dark', t === 'dark');
    root.setAttribute('data-theme', t);

    // Keep the mobile browser UI in sync
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#181D21' : '#10B981');
  } catch (e) {
    // Fail silently for theme init
  }

  // ============================================================================
  // Client-Side Error Instrumentation
  // ============================================================================
  
  // Error batching and rate limiting
  var errorBatch = [];
  var errorCount = 0;
  var batchTimer = null;
  var lastBatchTime = Date.now();
  
  // Configuration
  var MAX_ERRORS_PER_BATCH = 5;
  var BATCH_INTERVAL_MS = 30000; // 30 seconds
  var MAX_ERRORS_PER_WINDOW = 10; // Max 10 errors per 30s window
  
  // Get API base from environment or use current origin
  var getApiBase = function() {
    // Check for VITE_API_BASE meta tag (injected by Vite)
    var apiBaseMeta = document.querySelector('meta[name="api-base"]');
    if (apiBaseMeta) {
      return apiBaseMeta.getAttribute('content');
    }
    
    // Fallback: construct from current location
    // In production, this should point to your API Gateway
    var origin = window.location.origin;
    
    // If on CloudFront, use the API Gateway URL
    if (origin.includes('cloudfront.net')) {
      // This will be set by environment variable during build
      return '{{VITE_API_BASE}}'; // Placeholder - should be replaced by build
    }
    
    return origin; // Fallback to same origin
  };
  
  var sendErrorBatch = function() {
    if (errorBatch.length === 0) return;
    
    var apiBase = getApiBase();
    var errors = errorBatch.slice(0, MAX_ERRORS_PER_BATCH);
    errorBatch = errorBatch.slice(MAX_ERRORS_PER_BATCH);
    
    // Don't send if API base looks like a placeholder
    if (!apiBase || apiBase.includes('{{')) {
      console.warn('[Error Instrumentation] API base not configured, errors not sent');
      return;
    }
    
    var payload = {
      source: 'client',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      errors: errors
    };
    
    try {
      // Use sendBeacon for reliability (doesn't block page unload)
      if (navigator.sendBeacon) {
        var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(apiBase + '/internal/observability/log', blob);
      } else {
        // Fallback to fetch
        fetch(apiBase + '/internal/observability/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
          keepalive: true
        }).catch(function() {
          // Silently fail - don't want error reporting to cause more errors
        });
      }
    } catch (e) {
      // Silently fail
    }
    
    lastBatchTime = Date.now();
  };
  
  var queueError = function(errorData) {
    // Rate limiting
    var now = Date.now();
    if (now - lastBatchTime < BATCH_INTERVAL_MS) {
      if (errorCount >= MAX_ERRORS_PER_WINDOW) {
        return; // Drop error if we've hit the limit
      }
    } else {
      // Reset counter for new window
      errorCount = 0;
    }
    
    errorCount++;
    errorBatch.push(errorData);
    
    // Send immediately if batch is full
    if (errorBatch.length >= MAX_ERRORS_PER_BATCH) {
      if (batchTimer) clearTimeout(batchTimer);
      sendErrorBatch();
    } else {
      // Schedule batch send
      if (batchTimer) clearTimeout(batchTimer);
      batchTimer = setTimeout(sendErrorBatch, 5000); // Send after 5 seconds
    }
  };
  
  // Global error handler
  window.addEventListener('error', function(event) {
    var errorData = {
      type: 'error',
      message: event.message || 'Unknown error',
      filename: event.filename || '',
      lineno: event.lineno || 0,
      colno: event.colno || 0,
      stack: event.error && event.error.stack ? event.error.stack : '',
      timestamp: Date.now()
    };
    
    queueError(errorData);
  });
  
  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', function(event) {
    var errorData = {
      type: 'unhandledrejection',
      message: event.reason && event.reason.message ? event.reason.message : String(event.reason),
      stack: event.reason && event.reason.stack ? event.reason.stack : '',
      timestamp: Date.now()
    };
    
    queueError(errorData);
  });
  
  // Send any remaining errors before page unload
  window.addEventListener('beforeunload', function() {
    if (errorBatch.length > 0) {
      sendErrorBatch();
    }
  });
  
  // Expose API for React components to manually log errors
  window.__errorInstrumentation = {
    logError: function(error, context) {
      var errorData = {
        type: 'manual',
        message: error.message || String(error),
        stack: error.stack || '',
        context: context || {},
        timestamp: Date.now()
      };
      queueError(errorData);
    }
  };

  // ============================================================================
  // Boot Watchdog - Detect if app fails to mount
  // ============================================================================
  
  var BOOT_TIMEOUT_MS = 8000; // 8 seconds
  var bootTimer = null;
  var appMounted = false;

  // API for app to signal successful mount
  window.__appMounted = function() {
    appMounted = true;
    if (bootTimer) {
      clearTimeout(bootTimer);
      bootTimer = null;
    }
    console.log('[Boot Watchdog] ✅ App mounted successfully');
  };

  // Start boot watchdog
  bootTimer = setTimeout(function() {
    if (!appMounted) {
      console.error('[Boot Watchdog] ⚠️ App failed to mount within ' + BOOT_TIMEOUT_MS + 'ms');
      console.error('[Boot Watchdog] Common causes:');
      console.error('  1. JavaScript bundle failed to load (check Network tab for 404s)');
      console.error('  2. Module returned HTML instead of JavaScript (MIME type issue)');
      console.error('  3. Cached broken bundle (try hard refresh: Ctrl+Shift+R)');
      console.error('  4. JavaScript syntax error in bundle');
      console.error('[Boot Watchdog] Environment:');
      console.error('  - URL:', window.location.href);
      console.error('  - User Agent:', navigator.userAgent);
      
      // Try to detect the bundle name from the page
      var scripts = document.querySelectorAll('script[type="module"]');
      if (scripts.length > 0) {
        console.error('  - Module scripts found:', scripts.length);
        for (var i = 0; i < scripts.length; i++) {
          console.error('    - ' + scripts[i].src);
        }
      } else {
        console.error('  - No module scripts found (build may be corrupted)');
      }

      // Show overlay with helpful message
      showBootFailureOverlay();
    }
  }, BOOT_TIMEOUT_MS);

  function showBootFailureOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'boot-failure-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    
    var content = document.createElement('div');
    content.style.cssText = 'background:white;border-radius:8px;padding:32px;max-width:500px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);';
    content.innerHTML = 
      '<div style="text-align:center;">' +
      '<svg style="margin:0 auto 16px;width:48px;height:48px;color:#ef4444;" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>' +
      '</svg>' +
      '<h1 style="font-size:24px;font-weight:bold;color:#111;margin-bottom:8px;">Failed to Load</h1>' +
      '<p style="color:#666;margin-bottom:24px;">The app is taking longer than expected to start. This might be due to:</p>' +
      '<ul style="text-align:left;color:#666;margin-bottom:24px;padding-left:20px;">' +
      '<li>Network connectivity issues</li>' +
      '<li>Cached outdated files</li>' +
      '<li>Browser extension conflicts</li>' +
      '</ul>' +
      '<button id="boot-retry-btn" style="background:#10b981;color:white;padding:12px 24px;border:none;border-radius:6px;font-weight:500;cursor:pointer;margin-right:8px;">Retry</button>' +
      '<button id="boot-clear-cache-btn" style="background:#6b7280;color:white;padding:12px 24px;border:none;border-radius:6px;font-weight:500;cursor:pointer;">Clear Cache & Retry</button>' +
      '</div>';
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    document.getElementById('boot-retry-btn').onclick = function() {
      window.location.reload();
    };

    document.getElementById('boot-clear-cache-btn').onclick = function() {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn('Failed to clear storage:', e);
      }
      window.location.reload(true);
    };
  }
})();
