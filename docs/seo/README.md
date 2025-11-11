# SEO & Discoverability Documentation

## Overview

This document describes the SEO and discoverability implementation for Project Valine. The implementation provides a production-grade SEO baseline for marketing pages without affecting backend instrumentation.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Metadata Configuration](#metadata-configuration)
- [Components](#components)
- [Build Process](#build-process)
- [Testing](#testing)
- [Deployment Checklist](#deployment-checklist)
- [Rollback Plan](#rollback-plan)
- [Future Roadmap](#future-roadmap)

## Features

### ✅ Implemented

1. **Meta Tags & Social Sharing**
   - Dynamic title and description per route
   - OpenGraph tags for social media sharing
   - Twitter Card support
   - Canonical URLs to prevent duplicate content

2. **Structured Data (JSON-LD)**
   - Organization schema
   - WebSite schema with search action
   - BreadcrumbList for navigation sections

3. **Sitemap & Robots**
   - Auto-generated `sitemap.xml` during build
   - Environment-aware `robots.txt`
   - Proper indexing rules for public/private content

4. **Favicons & App Icons**
   - Multiple favicon sizes (16x16, 32x32)
   - Apple touch icon (180x180)
   - Android Chrome icons (192x192, 512x512)
   - Web app manifest

5. **SEO Audit**
   - Automated Lighthouse-style SEO checks
   - Pre/post score comparison
   - Markdown and JSON reporting

## Architecture

### Directory Structure

```
src/seo/
├── metaConfig.js          # Route metadata configuration
├── MetaInjector.jsx       # Dynamic meta tag injection component
├── StructuredData.jsx     # JSON-LD structured data component
└── __tests__/             # Unit tests

scripts/seo/
├── build-sitemap.mjs      # Sitemap generation script
├── build-robots.mjs       # Robots.txt generation script
├── generate-og-image.mjs  # Social preview image generator
├── generate-favicons.mjs  # Favicon set generator
├── lighthouse-report.mjs  # SEO audit script
└── __tests__/             # Script tests

public/
├── manifest.json          # Web app manifest
├── og-default.png         # Default OpenGraph image
├── favicon-*.png          # Favicon set
└── apple-touch-icon.png   # iOS icon

docs/seo/
└── README.md             # This file
```

### Data Flow

```
Route Change
    ↓
MetaInjector (useEffect)
    ↓
getMetadataForRoute()
    ↓
Update document.title, meta tags, canonical
    ↓
StructuredData (useEffect)
    ↓
Inject JSON-LD scripts
```

## Metadata Configuration

### Route Metadata Matrix

| Route | Indexed? | Title | Description Length | Canonical |
|-------|----------|-------|-------------------|-----------|
| `/` | ✓ | Project Valine — Artists & Seekers Unite | 151 chars | `https://projectvaline.com` |
| `/join` | ✓ | Project Valine — Join Now | 131 chars | `https://projectvaline.com/join` |
| `/#features` | ✓ | Project Valine — Features | 150 chars | `https://projectvaline.com/#features` |
| `/#about` | ✓ | Project Valine — About Us | 144 chars | `https://projectvaline.com/#about` |
| `/#faq` | ✓ | Project Valine — FAQ | 140 chars | `https://projectvaline.com/#faq` |
| `/login` | ✗ | Project Valine — Log In | 97 chars | `https://projectvaline.com/login` |
| `/signup-page` | ✗ | Project Valine — Sign Up | 101 chars | `https://projectvaline.com/signup-page` |
| `/onboarding` | ✗ | Project Valine — Get Started | 117 chars | `https://projectvaline.com/onboarding` |

**Title Guidelines:**
- Pattern: `Project Valine — <Descriptor>`
- Max 60 characters
- All titles currently < 60 chars ✓

**Description Guidelines:**
- 50-160 characters optimal
- All descriptions meet criteria ✓

### Structured Data Examples

#### Organization Schema
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Project Valine",
  "url": "https://projectvaline.com",
  "logo": "https://projectvaline.com/assets/logo.png"
}
```

#### WebSite Schema
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Project Valine",
  "url": "https://projectvaline.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://projectvaline.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

#### BreadcrumbList Schema (Example)
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://projectvaline.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Features",
      "item": "https://projectvaline.com/#features"
    }
  ]
}
```

## Components

### MetaInjector

**Purpose:** Dynamically inject SEO meta tags based on current route

**Usage:**
```jsx
import MetaInjector from './seo/MetaInjector';

// In MarketingLayout
<MetaInjector />
```

**Injected Tags:**
- `<title>`
- `<meta name="description">`
- `<meta name="robots">`
- `<link rel="canonical">`
- OpenGraph: `og:type`, `og:url`, `og:title`, `og:description`, `og:image`, `og:site_name`
- Twitter: `twitter:card`, `twitter:site`, `twitter:title`, `twitter:description`, `twitter:image`

### StructuredData

**Purpose:** Inject JSON-LD structured data for search engines

**Usage:**
```jsx
import StructuredData from './seo/StructuredData';

// In MarketingLayout
<StructuredData />
```

**Schemas:**
- Organization
- WebSite
- BreadcrumbList (conditional based on route)

**Size Limit:** All JSON-LD combined < 5KB ✓

## Build Process

### Build Scripts

1. **Pre-build**: Generate assets
   ```bash
   npm run seo:generate
   ```
   - Creates OG image from hero image
   - Generates favicon set from logo

2. **Build**: Standard Vite build
   ```bash
   vite build
   ```

3. **Post-build**: Generate SEO files
   ```bash
   npm run seo:build
   ```
   - Creates `dist/sitemap.xml`
   - Creates `dist/robots.txt`

### Full Build Command
```bash
npm run build
```
This runs: `seo:generate` → `vite build` → `seo:build`

### Environment Variables

- `VITE_SEO_ENABLED`: Toggle SEO features (default: `true`)
- `VITE_SITE_DOMAIN`: Site domain for canonical URLs (default: `https://projectvaline.com`)
- `VITE_IS_STAGING`: Set to `'true'` for staging environment
- `NODE_ENV`: Environment mode (`production`, `staging`, etc.)

## Testing

### Unit Tests

Run all SEO tests:
```bash
npm test -- src/seo scripts/seo --run
```

**Coverage:**
- Metadata configuration validation
- MetaInjector tag injection
- StructuredData JSON-LD generation
- Sitemap XML structure
- Robots.txt formatting

**Total Tests:** 54 tests across 5 test files

### SEO Audit

Run automated SEO audit:
```bash
# Start dev server first
npm run dev

# In another terminal
npm run seo:audit
```

**Outputs:**
- `seo-report.json`: Machine-readable audit results
- `seo-report.md`: Human-readable markdown report

**Checks:**
- Title tag (< 60 chars)
- Meta description (50-160 chars)
- Canonical link presence
- Viewport meta tag
- OpenGraph tags
- Twitter Card tags
- Structured data (JSON-LD)
- Single H1 tag
- HTML lang attribute
- Web manifest

**Target Score:** ≥ 90/100

### Manual Validation

1. **Sitemap Validator**
   - https://www.xml-sitemaps.com/validate-xml-sitemap.html
   - Upload `dist/sitemap.xml`

2. **Robots.txt Tester**
   - Google Search Console > robots.txt Tester
   - Or: https://support.google.com/webmasters/answer/6062598

3. **Structured Data Testing**
   - https://search.google.com/test/rich-results
   - Test production URL or paste JSON-LD

4. **OpenGraph Preview**
   - Facebook: https://developers.facebook.com/tools/debug/
   - Twitter: https://cards-dev.twitter.com/validator
   - LinkedIn: https://www.linkedin.com/post-inspector/

## Deployment Checklist

### Pre-Deployment

- [ ] Update `VITE_SITE_DOMAIN` in `.env.production`
- [ ] Update Twitter handle in `src/seo/metaConfig.js`
- [ ] Add social media URLs to Organization schema
- [ ] Verify all tests pass: `npm test -- src/seo scripts/seo --run`
- [ ] Run build: `npm run build`
- [ ] Verify `dist/sitemap.xml` exists and is valid
- [ ] Verify `dist/robots.txt` exists and has correct rules
- [ ] Run SEO audit: `npm run seo:audit` (requires local server)

### Post-Deployment

- [ ] Submit sitemap to Google Search Console
  - https://search.google.com/search-console
  - Sitemaps → Add new sitemap → `https://yourdomain.com/sitemap.xml`
- [ ] Submit sitemap to Bing Webmaster Tools
  - https://www.bing.com/webmasters
- [ ] Test robots.txt: `https://yourdomain.com/robots.txt`
- [ ] Test manifest: `https://yourdomain.com/manifest.json`
- [ ] Validate structured data on live URL
- [ ] Test social sharing preview
- [ ] Monitor Google Search Console for indexing

### Staging Environment

For staging deployments, set:
```bash
VITE_IS_STAGING=true
```

This will:
- Generate restrictive `robots.txt` (Disallow: /)
- Prevent search engine indexing
- Still include sitemap reference for testing

## Rollback Plan

### Option 1: Feature Flag

Disable SEO components without code changes:

1. Set environment variable:
   ```bash
   VITE_SEO_ENABLED=false
   ```

2. Rebuild and redeploy
   ```bash
   npm run build
   ```

**Effect:** MetaInjector and StructuredData will return `null`, no meta tags injected

### Option 2: Remove Sitemap/Robots

1. Delete from build output:
   ```bash
   rm dist/sitemap.xml dist/robots.txt
   ```

2. Or exclude from deployment

### Option 3: Full Revert

```bash
git revert <commit-hash>
```

Then rebuild and redeploy.

## Future Roadmap

### Phase 2: Internationalization (i18n)

- [ ] Add `hreflang` tags for multi-language support
- [ ] Localized metadata configurations
- [ ] Language-specific sitemaps

**Files to Update:**
- `src/seo/metaConfig.js` - Add locale parameter
- `src/seo/MetaInjector.jsx` - Inject hreflang tags
- `scripts/seo/build-sitemap.mjs` - Generate per-locale sitemaps

**Example hreflang:**
```html
<link rel="alternate" hreflang="en" href="https://projectvaline.com/" />
<link rel="alternate" hreflang="es" href="https://projectvaline.com/es/" />
```

### Phase 3: Dynamic OG Images

- [ ] Per-page OG image generation
- [ ] User-generated content preview images
- [ ] Dynamic text overlay on images

**Tools:**
- Puppeteer or Playwright for screenshots
- Sharp for image manipulation
- CDN caching for generated images

### Phase 4: Advanced Structured Data

- [ ] Product schema for premium features
- [ ] Review/Rating schema for testimonials
- [ ] Event schema for webinars/launches
- [ ] VideoObject schema for demo videos

### Phase 5: Performance Optimization

- [ ] Lazy-load non-critical schemas
- [ ] CDN for static assets (OG images, favicons)
- [ ] HTTP/2 Server Push for critical assets
- [ ] Preload/prefetch for key resources

### Phase 6: Server-Side Rendering (SSR)

If SEO performance requires:
- [ ] Migrate to Next.js or similar SSR framework
- [ ] Server-side meta tag rendering
- [ ] Improved First Contentful Paint (FCP)

### Phase 7: Analytics Integration

**Not in scope for this phase** - will be added later:
- [ ] Google Analytics 4
- [ ] Google Tag Manager
- [ ] Search Console API integration
- [ ] Performance monitoring

## Troubleshooting

### Sitemap not generated

**Symptom:** `dist/sitemap.xml` missing after build

**Solutions:**
1. Check postbuild script ran: `npm run seo:build`
2. Verify output directory exists: `mkdir -p dist`
3. Check for script errors in build logs

### Robots.txt blocking production

**Symptom:** All pages disallowed in production

**Solution:** Verify environment variables
```bash
# Should NOT be set in production
VITE_IS_STAGING=false
NODE_ENV=production
```

### Meta tags not updating

**Symptom:** Same meta tags on all pages

**Solutions:**
1. Verify MetaInjector is in component tree
2. Check browser DevTools > Elements > `<head>`
3. Hard refresh (Ctrl+Shift+R)
4. Verify `VITE_SEO_ENABLED` is not `false`

### Structured data validation errors

**Symptom:** Rich results test shows errors

**Solutions:**
1. Check JSON syntax in browser console
2. Verify all required schema.org fields present
3. Test locally: View page source > Find `<script type="application/ld+json">`
4. Validate JSON manually: https://jsonlint.com/

### Low Lighthouse score

**Target:** ≥ 90/100

**Common issues:**
- Missing canonical link → Check MetaInjector integration
- No structured data → Check StructuredData component
- Multiple H1 tags → Review landing page structure
- Missing meta description → Verify route in metaConfig.js

## Support

For issues or questions:
1. Check this documentation
2. Review test files for examples
3. Check component source code comments
4. File an issue in the project repository

## References

- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Schema.org Documentation](https://schema.org/)
- [OpenGraph Protocol](https://ogp.me/)
- [Twitter Cards Guide](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [robots.txt Specification](https://developers.google.com/search/docs/advanced/robots/intro)
- [Sitemap Protocol](https://www.sitemaps.org/protocol.html)
