// public/theme-init.js
// Instant theme initialization to prevent flash
// This script runs before React hydration to set the correct theme

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
    // Fail silently
  }
})();
