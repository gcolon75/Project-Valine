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
})();
