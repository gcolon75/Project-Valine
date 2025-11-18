/**
 * CloudFront Function: SPA Rewrite
 * 
 * Purpose: Rewrite extension-less paths to /index.html for single-page app routing
 * while preserving actual file requests (JS, CSS, images, etc.)
 * 
 * Behavior:
 * - If URI has no file extension (no '.' in last path segment) AND
 * - Does not start with '/api/', THEN
 * - Rewrite to /index.html
 * - Otherwise, pass through unchanged
 * 
 * Examples:
 *   /about → /index.html
 *   /users/123 → /index.html
 *   /assets/index-yrgN6q4Q.js → unchanged (has extension)
 *   /theme-init.js → unchanged (has extension)
 *   /manifest.json → unchanged (has extension)
 *   /api/posts → unchanged (API path)
 */

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  
  // Skip API requests
  if (uri.startsWith('/api/')) {
    return request;
  }
  
  // Get the last segment of the path
  var segments = uri.split('/');
  var lastSegment = segments[segments.length - 1];
  
  // Check if the last segment has a file extension (contains a dot)
  var hasExtension = lastSegment.indexOf('.') !== -1;
  
  // If no extension, rewrite to index.html for SPA routing
  if (!hasExtension) {
    request.uri = '/index.html';
  }
  
  return request;
}

// Export for testing (Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { handler };
}

function handler(event) {
  var req = event.request;
  var uri = req.uri;

  // Do not rewrite API, assets, or favicon
  if (uri.startsWith('/api/') || uri.startsWith('/assets/') || uri === '/favicon.ico') {
    return req;
  }

  // If URI contains a dot, treat as a file request (do not rewrite)
  if (uri.indexOf('.') !== -1) {
    return req;
  }

  // Rewrite extension-less routes to SPA shell
  req.uri = '/index.html';
  return req;
}