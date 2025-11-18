<<<<<<< HEAD
﻿function handler(event) {
  var req = event.request;
  var uri = req.uri;
  if (uri.startsWith('/api/') || uri.startsWith('/assets/') || uri === '/favicon.ico') return req;
  if (uri.indexOf('.') !== -1) return req;
=======
/**
 * CloudFront Function: SPA Rewrite
 * 
 * Purpose: Rewrite extension-less paths to /index.html for single-page app routing
 * while preserving actual file requests.
 * 
 * This function enables deep-link route handling for the SPA without global error masking.
 * 
 * Behavior:
 * - Skips rewrite for /api/*, /assets/*, and /favicon.ico
 * - Skips rewrite for any path containing a dot (assumes file with extension)
 * - Rewrites all other paths to /index.html
 * 
 * Examples:
 *   /about → /index.html (SPA route)
 *   /users/123 → /index.html (SPA route)
 *   /join → /index.html (SPA route)
 *   /assets/index-yrgN6q4Q.js → unchanged (asset)
 *   /theme-init.js → unchanged (has extension)
 *   /manifest.json → unchanged (has extension)
 *   /api/posts → unchanged (API path)
 *   /favicon.ico → unchanged (favicon)
 * 
 * Future exclusions (commented for now):
 * - /.well-known/* (for security.txt, etc.)
 */

function handler(event) {
  var req = event.request;
  var uri = req.uri;
  
  // Skip API paths
  if (uri.startsWith('/api/')) return req;
  
  // Skip assets directory
  if (uri.startsWith('/assets/')) return req;
  
  // Skip favicon
  if (uri === '/favicon.ico') return req;
  
  // Future: Skip well-known paths
  // if (uri.startsWith('/.well-known/')) return req;
  
  // If URI contains a dot, treat as file (has extension)
  if (uri.indexOf('.') !== -1) return req;
  
  // Rewrite to index.html for SPA routing
>>>>>>> 386ca05ae08d7f2b844367784e7352d6ec29297a
  req.uri = '/index.html';
  return req;
}
