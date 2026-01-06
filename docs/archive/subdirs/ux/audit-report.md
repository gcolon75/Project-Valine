# UX Deep Audit Report
**Project Valine** — Comprehensive Design & UX Analysis

**Date:** 2025-11-04
**Pages Analyzed:** 37
**Components Analyzed:** 27
**Total Findings:** 114

## Executive Summary

Project Valine demonstrates a solid foundation with modern React architecture, Tailwind CSS styling, and dark mode support. However, there are opportunities to enhance visual consistency, accessibility, and user experience.

**Key Findings:**
- 🔴 21 High-priority issues (accessibility, critical UX)
- 🟡 88 Medium-priority issues (consistency, polish)
- 🟢 5 Low-priority issues (optimization, refinement)

**Top Recommendations:**
1. **Enhance Accessibility:** Add alt text to images, ARIA labels to icon-only buttons, and ensure proper focus states
2. **Refine Light Mode:** Replace pure white backgrounds with layered surface tokens to reduce glare and add depth
3. **Improve Consistency:** Standardize spacing scale, typography sizes, and component patterns across pages

## Findings by Category

| Category | High | Medium | Low | Total |
|----------|------|--------|-----|-------|
| Spacing | 0 | 5 | 2 | 7 |
| Color | 0 | 17 | 0 | 17 |
| Accessibility | 0 | 65 | 0 | 65 |
| Responsive | 21 | 0 | 0 | 21 |
| Visual Hierarchy | 0 | 1 | 3 | 4 |

## Per-Page Audit

### About

- **File:** `src/pages/About.jsx`
- **Type:** marketing
- **Route:** about-us
- **Findings:** 3

#### Issues Found:

**🟡 Medium Priority:**
- **Hardcoded color values detected**: Use design tokens or Tailwind color utilities instead of hardcoded values
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

**🟢 Low Priority:**
- Excessive spacing detected

### AuditionDetail

- **File:** `src/pages/AuditionDetail.jsx`
- **Type:** app
- **Route:** /auditiondetail
- **Findings:** 3

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Missing H1 heading**: Add a descriptive H1 heading for proper semantic structure and SEO
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### Index

- **File:** `src/pages/Auditions/Index.jsx`
- **Type:** app
- **Route:** /index
- **Findings:** 2

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### New

- **File:** `src/pages/Auditions/New.jsx`
- **Type:** app
- **Route:** /new
- **Findings:** 1

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

### Show

- **File:** `src/pages/Auditions/Show.jsx`
- **Type:** app
- **Route:** /show
- **Findings:** 3

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Inline spacing styles detected**: Use Tailwind spacing utilities instead of inline styles for consistency
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### Auditions

- **File:** `src/pages/Auditions.jsx`
- **Type:** app
- **Route:** /auditions
- **Findings:** 3

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Missing H1 heading**: Add a descriptive H1 heading for proper semantic structure and SEO
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### AuthCallback

- **File:** `src/pages/AuthCallback.jsx`
- **Type:** app
- **Route:** /authcallback
- **Findings:** 4

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Inline spacing styles detected**: Use Tailwind spacing utilities instead of inline styles for consistency
- **Missing H1 heading**: Add a descriptive H1 heading for proper semantic structure and SEO
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### Bookmarks

- **File:** `src/pages/Bookmarks.jsx`
- **Type:** app
- **Route:** bookmarks
- **Findings:** 2

#### Issues Found:

**🟡 Medium Priority:**
- **Missing H1 heading**: Add a descriptive H1 heading for proper semantic structure and SEO
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### Dashboard

- **File:** `src/pages/Dashboard.jsx`
- **Type:** app
- **Route:** dashboard
- **Findings:** 3

#### Issues Found:

**🟡 Medium Priority:**
- **Hardcoded color values detected**: Use design tokens or Tailwind color utilities instead of hardcoded values
- **Missing H1 heading**: Add a descriptive H1 heading for proper semantic structure and SEO
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### Discover

- **File:** `src/pages/Discover.jsx`
- **Type:** app
- **Route:** discover
- **Findings:** 2

#### Issues Found:

**🟡 Medium Priority:**
- **Hardcoded color values detected**: Use design tokens or Tailwind color utilities instead of hardcoded values
- **Missing H1 heading**: Add a descriptive H1 heading for proper semantic structure and SEO

### Features

- **File:** `src/pages/Features.jsx`
- **Type:** marketing
- **Route:** features
- **Findings:** 3

#### Issues Found:

**🟡 Medium Priority:**
- **Hardcoded color values detected**: Use design tokens or Tailwind color utilities instead of hardcoded values
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

**🟢 Low Priority:**
- Too many different text sizes

### Feed

- **File:** `src/pages/Feed.jsx`
- **Type:** app
- **Route:** feed
- **Findings:** 3

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Missing H1 heading**: Add a descriptive H1 heading for proper semantic structure and SEO
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### Forbidden

- **File:** `src/pages/Forbidden.jsx`
- **Type:** error
- **Route:** /forbidden
- **Findings:** 3

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Inline spacing styles detected**: Use Tailwind spacing utilities instead of inline styles for consistency
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### Home

- **File:** `src/pages/Home.jsx`
- **Type:** marketing
- **Route:** /
- **Findings:** 5

#### Issues Found:

**🟡 Medium Priority:**
- **Hardcoded color values detected**: Use design tokens or Tailwind color utilities instead of hardcoded values
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation
- **Multiple competing CTAs**: Limit to 1-2 primary CTAs per section to avoid decision paralysis

**🟢 Low Priority:**
- Excessive spacing detected
- Too many different text sizes

### Inbox

- **File:** `src/pages/Inbox.jsx`
- **Type:** app
- **Route:** inbox
- **Findings:** 2

#### Issues Found:

**🟡 Medium Priority:**
- **Missing H1 heading**: Add a descriptive H1 heading for proper semantic structure and SEO
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### Join

- **File:** `src/pages/Join.jsx`
- **Type:** marketing
- **Route:** join
- **Findings:** 1

#### Issues Found:

**🟡 Medium Priority:**
- **Hardcoded color values detected**: Use design tokens or Tailwind color utilities instead of hardcoded values

### Login

- **File:** `src/pages/Login.jsx`
- **Type:** marketing
- **Route:** login
- **Findings:** 1

#### Issues Found:

**🟡 Medium Priority:**
- **Hardcoded color values detected**: Use design tokens or Tailwind color utilities instead of hardcoded values

### Messages

- **File:** `src/pages/Messages.jsx`
- **Type:** app
- **Route:** /messages
- **Findings:** 2

#### Issues Found:

**🟡 Medium Priority:**
- **Hardcoded color values detected**: Use design tokens or Tailwind color utilities instead of hardcoded values
- **Missing H1 heading**: Add a descriptive H1 heading for proper semantic structure and SEO

### NewAudition

- **File:** `src/pages/NewAudition.jsx`
- **Type:** app
- **Route:** /newaudition
- **Findings:** 3

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Missing H1 heading**: Add a descriptive H1 heading for proper semantic structure and SEO
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### NewScript

- **File:** `src/pages/NewScript.jsx`
- **Type:** app
- **Route:** /newscript
- **Findings:** 3

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Missing H1 heading**: Add a descriptive H1 heading for proper semantic structure and SEO
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### NotFound

- **File:** `src/pages/NotFound.jsx`
- **Type:** error
- **Route:** *
- **Findings:** 2

#### Issues Found:

**🟡 Medium Priority:**
- **Hardcoded color values detected**: Use design tokens or Tailwind color utilities instead of hardcoded values
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### Notifications

- **File:** `src/pages/Notifications.jsx`
- **Type:** app
- **Route:** notifications
- **Findings:** 4

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Hardcoded color values detected**: Use design tokens or Tailwind color utilities instead of hardcoded values
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

**🟢 Low Priority:**
- Too many different text sizes

### Post

- **File:** `src/pages/Post.jsx`
- **Type:** app
- **Route:** post
- **Findings:** 1

#### Issues Found:

**🟡 Medium Priority:**
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### PostScript

- **File:** `src/pages/PostScript.jsx`
- **Type:** app
- **Route:** post
- **Findings:** 3

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Missing H1 heading**: Add a descriptive H1 heading for proper semantic structure and SEO
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### Profile

- **File:** `src/pages/Profile.jsx`
- **Type:** app
- **Route:** profile/:id?
- **Findings:** 2

#### Issues Found:

**🟡 Medium Priority:**
- **Hardcoded color values detected**: Use design tokens or Tailwind color utilities instead of hardcoded values
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### ProfileEdit

- **File:** `src/pages/ProfileEdit.jsx`
- **Type:** app
- **Route:** /profileedit
- **Findings:** 1

#### Issues Found:

**🟡 Medium Priority:**
- **Hardcoded color values detected**: Use design tokens or Tailwind color utilities instead of hardcoded values

### ProfileSetup

- **File:** `src/pages/ProfileSetup.jsx`
- **Type:** app
- **Route:** setup
- **Findings:** 0

✅ No major issues found.

### Reels

- **File:** `src/pages/Reels.jsx`
- **Type:** app
- **Route:** reels
- **Findings:** 3

#### Issues Found:

**🟡 Medium Priority:**
- **Hardcoded color values detected**: Use design tokens or Tailwind color utilities instead of hardcoded values
- **Missing H1 heading**: Add a descriptive H1 heading for proper semantic structure and SEO
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### Requests

- **File:** `src/pages/Requests.jsx`
- **Type:** app
- **Route:** requests
- **Findings:** 3

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Hardcoded color values detected**: Use design tokens or Tailwind color utilities instead of hardcoded values
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### ScriptDetail

- **File:** `src/pages/ScriptDetail.jsx`
- **Type:** app
- **Route:** /scriptdetail
- **Findings:** 3

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Missing H1 heading**: Add a descriptive H1 heading for proper semantic structure and SEO
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### Index

- **File:** `src/pages/Scripts/Index.jsx`
- **Type:** app
- **Route:** /index
- **Findings:** 2

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### New

- **File:** `src/pages/Scripts/New.jsx`
- **Type:** app
- **Route:** /new
- **Findings:** 1

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

### Show

- **File:** `src/pages/Scripts/Show.jsx`
- **Type:** app
- **Route:** /show
- **Findings:** 2

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### Scripts

- **File:** `src/pages/Scripts.jsx`
- **Type:** app
- **Route:** /scripts
- **Findings:** 3

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Missing H1 heading**: Add a descriptive H1 heading for proper semantic structure and SEO
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### Settings

- **File:** `src/pages/Settings.jsx`
- **Type:** app
- **Route:** settings
- **Findings:** 2

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Hardcoded color values detected**: Use design tokens or Tailwind color utilities instead of hardcoded values

### SkeletonTest

- **File:** `src/pages/SkeletonTest.jsx`
- **Type:** app
- **Route:** /skeletontest
- **Findings:** 2

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

### Trending

- **File:** `src/pages/Trending.jsx`
- **Type:** app
- **Route:** /trending
- **Findings:** 3

#### Issues Found:

**🔴 High Priority:**
- **No responsive breakpoints detected**
  - Category: Responsive
  - Evidence: Page does not use any Tailwind responsive modifiers
  - Recommendation: Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

**🟡 Medium Priority:**
- **Missing H1 heading**: Add a descriptive H1 heading for proper semantic structure and SEO
- **Missing focus states**: Add focus states to interactive elements for keyboard navigation

## Global Component Audit

### Header Component

**Files:** `src/components/Header.jsx`, `src/layouts/AppLayout.jsx`, `src/layouts/MarketingLayout.jsx`

**Observations:**
- Marketing and App headers have different implementations
- Good use of glassmorphism effect with backdrop-blur
- Fixed positioning with proper z-index

**Recommendations:**
- Consider unifying header behavior across marketing and app
- Ensure consistent brand presentation
- Add smooth scroll-based header behavior for better UX

### Navigation Components

**Files:** `src/components/NavBar.jsx`

**Observations:**
- Modern icon-based navigation in app layout
- Badge system for notifications
- Responsive behavior with hidden labels on mobile

**Recommendations:**
- Add bottom navigation bar for mobile (iOS/Android pattern)
- Consider sticky navigation on scroll
- Ensure touch targets meet 44x44px minimum size

### Card Components

**Files:** `src/components/Card.jsx`, `src/components/PostCard.jsx`

**Observations:**
- Cards use border and subtle background
- Consistent border-radius of 12-14px

**Recommendations:**
- Add subtle shadow for depth: `shadow-sm` or `shadow-md`
- Consider hover states for interactive cards
- Use consistent card padding (e.g., p-4 or p-6)

### Button Components

**Observations:**
- Brand gradient buttons on marketing pages
- Icon buttons in app navigation

**Recommendations:**
- Create standardized Button component with variants (primary, secondary, ghost)
- Ensure 44-48px minimum height for touch targets
- Add loading states for async actions
- Include disabled state styling

## Global Theme Audit

### Current Theme Implementation

**Files:** `src/styles/theme.css`, `tailwind.config.js`, `src/components/ThemeToggle.jsx`

**Light Mode Analysis:**

**Strengths:**
- Already implements layered surface system with reduced glare
- Uses `--bg: #fafbfc` instead of pure white (#ffffff)
- Softer borders with low opacity: `rgba(11, 20, 32, 0.08)`
- Good separation between card-bg and page bg

**Opportunities:**
- Some pages still use `bg-white` directly instead of theme variables
- Add more elevation levels for deeper visual hierarchy
- Consider adding subtle shadows to cards and elevated surfaces

**Dark Mode Analysis:**

**Strengths:**
- True dark background: `--bg: #0a0a0a`
- Proper contrast with text: `--text: #f3f4f6`
- Subtle card backgrounds with borders

**Opportunities:**
- Ensure all components respect theme variables
- Test dark mode on all pages (some may default to light)
- Add dark mode specific imagery where needed

### Recommended Surface Token System

```css
/* Light Mode Surfaces */
:root[data-theme="light"] {
  --surface-0: #fafbfc;  /* Page background */
  --surface-1: #f4f6f8;  /* Sunken areas, wells */
  --surface-2: #ffffff;  /* Cards, elevated content */
  --surface-3: #ffffff;  /* Modals, popovers (with shadow) */
  
  --border-subtle: rgba(15, 23, 42, 0.06);
  --border-default: rgba(15, 23, 42, 0.10);
  
  --shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.04);
  --shadow-md: 0 2px 8px rgba(16, 24, 40, 0.08);
  --shadow-lg: 0 4px 16px rgba(16, 24, 40, 0.12);
}

/* Dark Mode Surfaces */
:root {
  --surface-0: #0a0a0a;  /* Page background */
  --surface-1: #141414;  /* Sunken areas */
  --surface-2: rgba(23, 23, 23, 0.40);  /* Cards */
  --surface-3: rgba(23, 23, 23, 0.90);  /* Modals */
}
```

### Theme Migration Strategy

1. **Audit all pages** for hardcoded `bg-white`, `bg-black`
2. **Replace with theme variables** or theme-aware classes
3. **Test both themes** on all pages and states
4. **Add ThemeToggle** to settings page if not present
5. **Persist user preference** in localStorage
6. **Default to light mode** with opt-in dark mode

## Prioritized Action List

### High Priority (Implement First)

1. **Accessibility Audit Fixes** (Branch: `fix/accessibility-improvements`)
   - Add alt text to all images
   - Add ARIA labels to icon-only buttons
   - Ensure focus states on all interactive elements
   - Verify keyboard navigation works on all pages
   - Effort: Medium (2-3 days)
   - Impact: High (WCAG compliance, SEO, screen readers)

2. **Light Mode Polish** (Branch: `feat/light-mode-polish`)
   - Replace remaining `bg-white` with surface tokens
   - Add subtle shadows to cards and elevated elements
   - Implement depth through layered surfaces
   - Test all marketing pages in light mode
   - Effort: Small (1-2 days)
   - Impact: High (reduced glare, professional appearance)

3. **Responsive Design Fixes** (Branch: `fix/responsive-improvements`)
   - Add responsive breakpoints to pages lacking them
   - Replace fixed widths with responsive utilities
   - Test on mobile (375px), tablet (768px), desktop (1280px)
   - Add bottom navigation for mobile app
   - Effort: Medium (2-3 days)
   - Impact: High (mobile users, cross-device consistency)

### Medium Priority (Next Sprint)

4. **Design System Consolidation** (Branch: `feat/design-system`)
   - Create unified Button component with variants
   - Standardize Card component props and styling
   - Unify Header across marketing and app
   - Document spacing scale and usage
   - Effort: Large (4-5 days)
   - Impact: Medium (maintainability, consistency)

5. **CTA Optimization** (Branch: `feat/cta-optimization`)
   - Reduce CTA count on marketing pages to 1-2 per section
   - Improve CTA hierarchy (primary vs secondary)
   - A/B test CTA placement and copy
   - Effort: Small (1 day)
   - Impact: Medium (conversion rate)

### Low Priority (Future Enhancements)

6. **Typography Scale Refinement** (Branch: `feat/typography-scale`)
   - Reduce number of text size variations
   - Implement consistent line-height scale
   - Document typography usage guidelines
   - Effort: Small (1 day)
   - Impact: Low (visual refinement)

## Recommended Design Token Changes

### Tailwind Config Extensions

Add these to `tailwind.config.js` under `theme.extend`:

```javascript
// Enhanced color tokens
colors: {
  surface: {
    0: '#fafbfc',  // Light mode page bg
    1: '#f4f6f8',  // Light mode sunken areas
    2: '#ffffff',  // Light mode elevated
  },
},

// Consistent spacing scale (already good, but ensure usage)
spacing: {
  // Use: 1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 32
  // Avoid: 5, 7, 9, 10, 11, etc.
},

// Typography scale
fontSize: {
  'xs': ['0.75rem', { lineHeight: '1rem' }],
  'sm': ['0.875rem', { lineHeight: '1.25rem' }],
  'base': ['1rem', { lineHeight: '1.5rem' }],
  'lg': ['1.125rem', { lineHeight: '1.75rem' }],
  'xl': ['1.25rem', { lineHeight: '1.75rem' }],
  '2xl': ['1.5rem', { lineHeight: '2rem' }],
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
},

// Shadow system for depth
boxShadow: {
  'sm': '0 1px 2px rgba(16, 24, 40, 0.04)',
  'md': '0 2px 8px rgba(16, 24, 40, 0.08)',
  'lg': '0 4px 16px rgba(16, 24, 40, 0.12)',
  'xl': '0 8px 24px rgba(16, 24, 40, 0.16)',
},
```

### Example Component Refactors

**Before:**
```jsx
<div className="bg-white border border-gray-200 rounded-lg p-4">
  <h2 className="text-xl font-bold">Title</h2>
  <p className="text-gray-600">Content</p>
</div>
```

**After:**
```jsx
<div className="bg-surface-2 border border-neutral-200/50 dark:border-neutral-700/50 rounded-lg p-6 shadow-sm">
  <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Title</h2>
  <p className="text-neutral-600 dark:text-neutral-400 mt-2">Content</p>
</div>
```

**Benefits:**
- Uses surface tokens instead of pure white
- Adds subtle shadow for depth
- Proper dark mode support
- Consistent spacing scale
- Better contrast with low-opacity borders

