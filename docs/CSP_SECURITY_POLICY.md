# Content Security Policy (CSP) and Security Documentation

## Overview
This document outlines the Content Security Policy implementation, anti-XSS measures, and security best practices for Project Valine's frontend application.

## Content Security Policy

### Current CSP Configuration
The application follows CSP best practices to prevent XSS attacks and unauthorized resource loading.

#### Recommended CSP Header
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.projectvaline.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

### CSP Directives Explained

- **default-src 'self'**: Only allow resources from the same origin by default
- **script-src 'self'**: Only load JavaScript from the same origin (no inline scripts)
- **style-src 'self' 'unsafe-inline' https://fonts.googleapis.com**: 
  - Allow styles from same origin and Google Fonts
  - `'unsafe-inline'` is required for CSS-in-JS libraries (consider removing in future with nonces)
- **font-src 'self' https://fonts.gstatic.com**: Allow fonts from same origin and Google Fonts CDN
- **img-src 'self' data: https:**: Allow images from same origin, data URIs, and HTTPS sources
- **connect-src 'self' https://api.projectvaline.com**: Restrict API calls to same origin and backend API
- **frame-ancestors 'none'**: Prevent embedding in iframes (clickjacking protection)
- **base-uri 'self'**: Restrict base tag to same origin
- **form-action 'self'**: Only allow form submissions to same origin

### External Resources

#### Allowed External Assets
1. **Google Fonts**
   - Font files: `https://fonts.gstatic.com`
   - Stylesheets: `https://fonts.googleapis.com`
   - Purpose: Inter font family
   - Security: Served over HTTPS, integrity verified

2. **User-uploaded Images**
   - Source: Same-origin uploads or CDN (configure as needed)
   - Validation: File type and size checked client-side
   - Processing: EXIF metadata stripped, images resized
   - Storage: Recommend using signed URLs with expiration

#### Blocked Resources
- No third-party analytics scripts (avoid tracking pixels)
- No external JavaScript libraries from CDNs (bundle locally)
- No inline event handlers or JavaScript
- No `eval()` or `Function()` constructor

## Anti-XSS Measures

### Input Sanitization

#### DOMPurify Integration
All user-generated content is sanitized using DOMPurify before rendering.

**Utility Functions** (`src/utils/sanitize.js`):
- `sanitizeText(text)`: Strips all HTML tags (for plain text fields)
- `sanitizeHtml(html)`: Allows safe HTML tags only (for rich text)
- `sanitizeUrl(url)`: Validates and sanitizes URLs (http/https/mailto only)
- `sanitizeLinkText(text)`: Sanitizes and truncates link labels
- `sanitizeObject(obj, textFields, urlFields)`: Batch sanitization

#### Fields Requiring Sanitization
1. **User Profile**
   - Display name (text)
   - Headline (text)
   - Bio (text or limited HTML)
   - Location (text)
   - Agency name (text)

2. **External Links**
   - Link labels (text)
   - Link URLs (URL validation)

3. **User-Generated Content**
   - Post content (text or limited HTML)
   - Comments (text)
   - Messages (text)

### Output Encoding

#### React's Built-in Protection
React automatically escapes content rendered as text:
```jsx
// Safe - content is automatically escaped
<div>{userContent}</div>
```

#### Unsafe Patterns to Avoid
```jsx
// NEVER use dangerouslySetInnerHTML without sanitization
<div dangerouslySetInnerHTML={{ __html: userContent }} /> // ❌ Unsafe

// Always sanitize first
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userContent) }} /> // ✅ Safe
```

### Link Safety

#### External Links
All external links use `rel="noopener noreferrer"` to prevent:
- Window.opener exploitation
- Referer header leakage

```jsx
<a href={url} target="_blank" rel="noopener noreferrer">
  {text}
</a>
```

#### URL Validation
URLs are validated before rendering:
```javascript
// Only allow safe protocols
const allowedProtocols = ['http:', 'https:', 'mailto:'];
const parsed = new URL(url);
if (!allowedProtocols.includes(parsed.protocol)) {
  // Reject unsafe URL
}
```

## Inline Script Removal

### Theme Initialization
**Before (CSP violation)**:
```html
<script>
  // Inline theme code
</script>
```

**After (CSP compliant)**:
```html
<script src="/theme-init.js"></script>
```

The theme initialization script has been extracted to `/public/theme-init.js` to comply with CSP.

### No Inline Event Handlers
All event handlers are attached via React's synthetic event system:
```jsx
// ❌ Avoid
<button onclick="handleClick()">Click</button>

// ✅ Use
<button onClick={handleClick}>Click</button>
```

## Authentication & Session Security

### Token Storage
- **Access tokens**: Stored in `localStorage` (short-lived, 15 minutes)
- **Refresh tokens**: Stored in HTTP-only cookies (if using cookie-based auth)
- Never store sensitive tokens in `localStorage` for long-term use

### CSRF Protection
For cookie-based authentication:
1. Backend issues CSRF token in cookie or response header
2. Frontend includes token in request headers (`X-CSRF-Token`)
3. API client automatically attaches token from `localStorage` or cookie

```javascript
// API client includes CSRF token if available
const csrfToken = localStorage.getItem('csrf_token');
if (csrfToken) {
  headers['X-CSRF-Token'] = csrfToken;
}
```

### Session Rotation
- User re-authenticates after password change
- "Sign out everywhere" on sensitive actions
- Token expiry handled gracefully with re-auth prompt

## Image Upload Security

### Client-Side Validation
1. **File Type Whitelist**: Only JPEG, PNG, WebP
2. **File Size Limit**: 5MB maximum
3. **EXIF Stripping**: Metadata removed during processing
4. **Image Resizing**: Normalized to 800x800px

### Upload Flow
```javascript
1. User selects/drops image
2. Validate file type and size
3. Read image with FileReader
4. Process with Canvas API (strips EXIF)
5. Convert to blob (JPEG with 0.9 quality)
6. Upload processed blob to server
```

### Server-Side Validation (Backend)
- Re-validate file type (magic bytes)
- Scan for malware (if needed)
- Store with non-guessable filenames
- Serve from separate domain/CDN (not main app domain)

## Form Security

### Input Validation
All forms include:
- Client-side validation with clear error messages
- Field-level error states with ARIA attributes
- Prevention of multiple submissions
- Network error handling with retry

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Optional: Special characters

### Email Validation
- Format validation with regex
- Server-side verification (email verification link)
- Rate limiting on email sends

## API Client Security

### Request Configuration
```javascript
// src/services/api.js
apiClient.interceptors.request.use((config) => {
  // Attach auth token
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Attach CSRF token (if cookie-based)
  const csrfToken = localStorage.getItem('csrf_token');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  
  return config;
});
```

### Error Handling
- 401 Unauthorized: Trigger re-authentication
- 403 Forbidden: Clear session, redirect to login
- 429 Rate Limited: Show user-friendly message, implement backoff
- Network errors: Show offline indicator, enable retry

### Retry Logic
- Exponential backoff with jitter
- Max 3 retries for idempotent requests
- No retry for 401, 403, 400 errors

## Browser Compatibility

### Tested Browsers
- ✅ Chrome/Chromium (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest, including iOS)
- ✅ Edge (latest)

### Polyfills Included
- None required for modern browsers
- App targets ES2020+ (no IE11 support)

### Safari/iOS Specific
- Touch target size: Minimum 44x44px
- File upload: Works with native picker and drag-drop
- Viewport meta tag: Prevents zoom on input focus

## Security Headers (Backend)

Recommended HTTP headers for backend to set:

```
Content-Security-Policy: [see above]
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Vulnerability Scanning

### Development
- @axe-core/react: Integrated for runtime a11y checks
- DOMPurify: Sanitizes all user-generated HTML
- ESLint security plugin (optional): Add for static analysis

### CI/CD
- Run `npm audit` on every build
- Playwright tests include security scenarios
- Axe checks in automated testing

## Incident Response

### If XSS Vulnerability Discovered
1. Immediately sanitize affected input/output
2. Deploy patch to production ASAP
3. Notify users if data was compromised
4. Review and update sanitization utilities
5. Add regression test

### Reporting Security Issues
Email: security@projectvaline.com
- Do not open public GitHub issues for security bugs
- Allow 90 days for patch before public disclosure

## Future Improvements

### Planned Enhancements
1. **CSP Nonces**: Remove `'unsafe-inline'` from style-src using nonces
2. **Subresource Integrity**: Add SRI hashes for external resources
3. **Rate Limiting UI**: Visual feedback for rate-limited actions
4. **2FA Support**: Add two-factor authentication flows
5. **Security Audit**: Third-party penetration testing

### Monitoring
- Log CSP violations to monitoring service
- Track authentication failures
- Monitor for suspicious activity patterns

## References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [CSP Documentation (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)

---

**Last Updated**: 2025-11-06  
**Version**: 1.0  
**Maintainer**: Frontend Team
