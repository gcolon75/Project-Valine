# UX Audit Agent — Real Examples & Use Cases

This document shows real examples from the Project Valine audit, demonstrating what the agent catches and how to fix it.

## Example 1: Missing Responsive Breakpoints

### What the Agent Found
```
Page: AuditionDetail
Category: Responsive
Severity: High
Issue: No responsive breakpoints detected
Evidence: Page does not use any Tailwind responsive modifiers
```

### Why This Matters
Without responsive breakpoints, the layout won't adapt to different screen sizes. Mobile users (< 768px) will see desktop layouts that are hard to use.

### The Problem (Before)
```jsx
// src/pages/AuditionDetail.jsx
<div className="w-full p-4">
  <h1 className="text-3xl font-bold mb-4">Audition Details</h1>
  <div className="grid grid-cols-3 gap-4">
    <div>Column 1</div>
    <div>Column 2</div>
    <div>Column 3</div>
  </div>
</div>
```

**Issue:** 3-column grid on mobile = tiny unreadable columns

### The Solution (After)
```jsx
// Add responsive modifiers
<div className="w-full p-4 sm:p-6 md:p-8">
  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Audition Details</h1>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <div>Column 1</div>
    <div>Column 2</div>
    <div>Column 3</div>
  </div>
</div>
```

**Result:**
- Mobile: 1 column, readable
- Tablet: 2 columns, good use of space
- Desktop: 3 columns, optimal layout

---

## Example 2: Missing Focus States (Accessibility)

### What the Agent Found
```
Page: Dashboard
Category: Accessibility
Severity: Medium
Issue: Missing focus states
Evidence: No focus: or focus-visible: classes found
```

### Why This Matters
Users navigating with keyboard (Tab key) can't see which element is focused. This is a WCAG violation and makes the site unusable for keyboard-only users.

### The Problem (Before)
```jsx
// No focus indicator
<button className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-hover">
  Submit
</button>
```

**Issue:** When user presses Tab, button receives focus but there's no visual indicator.

### The Solution (After)
```jsx
// Add focus-visible for keyboard focus
<button className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
  Submit
</button>
```

**Result:**
- Mouse users: No outline (clean look)
- Keyboard users: Clear blue ring around focused element
- WCAG compliant

---

## Example 3: Hardcoded Colors (Maintainability)

### What the Agent Found
```
Page: About
Category: Color
Severity: Medium
Issue: Hardcoded color values detected
Evidence: Found 41 hardcoded hex color(s): #1a1a1a, #474747...
```

### Why This Matters
Hardcoded colors break theming, make dark mode inconsistent, and are hard to maintain when brand colors change.

### The Problem (Before)
```jsx
// Hardcoded hex colors
<div className="bg-white text-[#1a1a1a] border-[#e5e5e5]">
  <h2 className="text-[#474747]">About Us</h2>
  <p className="text-[#666666]">Description</p>
</div>
```

**Issues:**
- Won't work in dark mode
- Brand color changes require finding/replacing everywhere
- Inconsistent with design system

### The Solution (After)
```jsx
// Use Tailwind color utilities and dark mode
<div className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-700">
  <h2 className="text-neutral-700 dark:text-neutral-300">About Us</h2>
  <p className="text-neutral-600 dark:text-neutral-400">Description</p>
</div>
```

**Result:**
- Automatic dark mode support
- Consistent with design system
- Easy to update (change Tailwind config once)

---

## Example 4: Missing Alt Text (Accessibility)

### What the Agent Found
```
Page: Home
Category: Accessibility
Severity: High
Issue: Images without alt text
Evidence: Found 3 image(s) without alt attributes
```

### Why This Matters
Screen readers can't describe images without alt text. This excludes blind users and hurts SEO.

### The Problem (Before)
```jsx
// No alt text
<img src="/hero-image.jpg" className="w-full h-auto" />
```

**Issue:** Screen reader says "image" with no context

### The Solution (After)
```jsx
// Descriptive alt text
<img 
  src="/hero-image.jpg" 
  alt="Voice actors collaborating in a modern recording studio"
  className="w-full h-auto" 
/>
```

**Result:**
- Screen readers provide context
- SEO benefits from descriptive text
- WCAG compliant

---

## Example 5: Pure White Backgrounds (Visual Design)

### What the Agent Found
```
Page: Home
Category: Color
Severity: High
Issue: Excessive use of pure white backgrounds
Evidence: Found 12 instances of bg-white
Recommendation: Replace with layered surface tokens
```

### Why This Matters
Large pure white areas cause glare and eye strain. Subtle off-white tones are more comfortable and add depth.

### The Problem (Before)
```jsx
// Pure white everywhere
<div className="bg-white">
  <div className="bg-white border border-gray-200 p-6 rounded-lg">
    <h3>Card Title</h3>
    <p>Card content</p>
  </div>
</div>
```

**Issues:**
- Harsh glare, especially in bright environments
- No visual hierarchy (everything same brightness)
- Lacks depth and sophistication

### The Solution (After)
```jsx
// Layered surfaces with subtle differences
<div className="bg-neutral-50 dark:bg-neutral-950">
  <div className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-700/50 p-6 rounded-lg shadow-sm">
    <h3>Card Title</h3>
    <p>Card content</p>
  </div>
</div>
```

**Result:**
- Reduced eye strain
- Clear visual hierarchy (card "lifts" from page)
- Professional, polished appearance
- Works in both light and dark mode

---

## Example 6: Missing H1 Headings (SEO)

### What the Agent Found
```
Page: Dashboard
Category: Accessibility
Severity: Medium
Issue: Missing H1 heading
Evidence: No H1 heading found on page
```

### Why This Matters
Search engines use H1 for page topics. Screen readers use heading structure for navigation. Missing H1 is bad for both SEO and accessibility.

### The Problem (Before)
```jsx
// No H1, just a div with large text
<div className="text-3xl font-bold mb-4">
  Your Dashboard
</div>
```

**Issues:**
- Search engines don't understand page topic
- Screen readers can't navigate by headings
- Poor semantic structure

### The Solution (After)
```jsx
// Proper semantic H1
<h1 className="text-3xl font-bold mb-4">
  Your Dashboard
</h1>

{/* Use H2 for sections */}
<h2 className="text-2xl font-semibold mb-3">Recent Activity</h2>
<h2 className="text-2xl font-semibold mb-3">Your Projects</h2>
```

**Result:**
- Better SEO ranking
- Screen reader navigation works
- Proper document outline
- Only one H1 per page, H2-H6 for structure

---

## Example 7: Icon Buttons Without Labels

### What the Agent Found
```
Page: Profile
Category: Accessibility
Severity: High
Issue: Button with icon but no accessible label
Evidence: Button contains only an icon without aria-label
```

### Why This Matters
Icon-only buttons are invisible to screen readers. Users with vision impairments don't know what the button does.

### The Problem (Before)
```jsx
// Icon button with no label
<button className="p-2 hover:bg-neutral-100 rounded">
  <X className="w-5 h-5" />
</button>
```

**Issue:** Screen reader says "button" with no indication of purpose

### The Solution (After)
```jsx
// Add aria-label for screen readers
<button 
  className="p-2 hover:bg-neutral-100 rounded"
  aria-label="Close modal"
>
  <X className="w-5 h-5" />
</button>

// Or use a tooltip library that includes aria-describedby
<TooltipButton tooltip="Close" aria-label="Close modal">
  <X className="w-5 h-5" />
</TooltipButton>
```

**Result:**
- Screen readers announce "Close modal button"
- Keyboard navigation works
- WCAG compliant

---

## Example 8: Inline Spacing Styles

### What the Agent Found
```
Page: AuthCallback
Category: Spacing
Severity: Medium
Issue: Inline spacing styles detected
Evidence: Found 1 inline style(s) with hardcoded spacing
```

### Why This Matters
Inline styles are hard to maintain, override Tailwind's spacing scale, and make the design inconsistent.

### The Problem (Before)
```jsx
// Hardcoded inline spacing
<div style={{ padding: '18px', marginBottom: '12px' }}>
  Content
</div>
```

**Issues:**
- Doesn't match Tailwind's 4px spacing scale
- Can't be changed with Tailwind config
- Inconsistent with rest of application

### The Solution (After)
```jsx
// Use Tailwind spacing utilities
<div className="p-4 mb-3">
  Content
</div>

// Or if 18px is truly needed, use Tailwind arbitrary values
<div className="p-[1.125rem] mb-3">
  Content
</div>
```

**Result:**
- Consistent spacing scale
- Easy to change globally
- Responsive modifiers work (sm:p-6, etc.)

---

## Example 9: Multiple Competing CTAs

### What the Agent Found
```
Page: Home
Category: Visual Hierarchy
Severity: Medium
Issue: Multiple competing CTAs
Evidence: Found 5 CTA instances
Recommendation: Limit to 1-2 primary CTAs per section
```

### Why This Matters
Too many CTAs causes decision paralysis. Users don't know which action is most important.

### The Problem (Before)
```jsx
// Too many primary CTAs
<div className="hero">
  <button className="bg-brand text-white px-6 py-3">Get Started</button>
  <button className="bg-brand text-white px-6 py-3">Sign Up Free</button>
  <button className="bg-brand text-white px-6 py-3">Learn More</button>
  <button className="bg-brand text-white px-6 py-3">Try Demo</button>
</div>
```

**Issue:** Which one should user click? All look equally important.

### The Solution (After)
```jsx
// Clear hierarchy: one primary, one secondary, rest as links
<div className="hero">
  {/* Primary CTA */}
  <button className="bg-brand text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-hover">
    Get Started
  </button>
  
  {/* Secondary CTA */}
  <button className="border-2 border-brand text-brand px-6 py-3 rounded-lg font-semibold hover:bg-brand/10">
    Try Demo
  </button>
  
  {/* Tertiary actions as text links */}
  <a href="/learn-more" className="text-neutral-600 hover:text-brand underline">
    Learn more
  </a>
</div>
```

**Result:**
- Clear primary action (solid button)
- Clear secondary option (outline button)
- Additional info accessible but not competing

---

## Example 10: Fixed Widths on Mobile

### What the Agent Found
```
Page: Profile
Category: Responsive
Severity: Medium
Issue: Fixed width values detected
Evidence: Found 3 fixed width value(s)
```

### Why This Matters
Fixed pixel widths don't adapt to screen size, causing horizontal scroll or cut-off content on mobile.

### The Problem (Before)
```jsx
// Fixed width breaks on mobile
<div className="w-[600px] mx-auto">
  <p>Profile information...</p>
</div>
```

**Issue:** On mobile (375px wide), content is cut off or forces horizontal scroll

### The Solution (After)
```jsx
// Responsive width with max constraint
<div className="w-full max-w-2xl mx-auto px-4">
  <p>Profile information...</p>
</div>
```

**Result:**
- Mobile: Full width with padding (safe area)
- Desktop: Constrained to 42rem (672px) for readability
- No horizontal scroll

---

## Common Patterns to Avoid

### ❌ Don't: Hardcode Everything
```jsx
<div style={{ 
  backgroundColor: '#ffffff',
  padding: '16px',
  marginBottom: '24px',
  color: '#333333'
}}>
```

### ✅ Do: Use Tailwind Utilities
```jsx
<div className="bg-white dark:bg-neutral-900 p-4 mb-6 text-neutral-800 dark:text-neutral-200">
```

---

### ❌ Don't: Ignore Mobile
```jsx
<div className="grid grid-cols-4 gap-8 p-12">
```

### ✅ Do: Think Mobile First
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 p-4 md:p-12">
```

---

### ❌ Don't: Skip Accessibility
```jsx
<button>
  <TrashIcon />
</button>
```

### ✅ Do: Add Labels and Focus States
```jsx
<button 
  aria-label="Delete item"
  className="... focus-visible:ring-2 focus-visible:ring-brand"
>
  <TrashIcon />
</button>
```

---

## Testing Your Fixes

### 1. Responsive Design
```powershell
# Open browser dev tools
# Toggle device toolbar (Ctrl/Cmd + Shift + M)
# Test at: 375px, 768px, 1280px
```

### 2. Accessibility
```powershell
# Keyboard navigation
# Press Tab to move through interactive elements
# Ensure visible focus indicators

# Screen reader (macOS)
# Enable VoiceOver (Cmd + F5)
# Navigate with VO keys
```

### 3. Color Contrast
```powershell
# Browser dev tools
# Inspect element
# Check contrast ratio in Styles panel
# Aim for 4.5:1 minimum
```

### 4. Re-run Audit
```powershell
npm run ux:audit

# Compare before/after
git diff UX_AUDIT_FINDINGS.csv
```

---

## Summary

The UX Audit Agent catches common issues that are easy to fix but often overlooked:

1. **Responsive Design** → Add breakpoint modifiers
2. **Accessibility** → Add labels, focus states, semantic HTML
3. **Color Consistency** → Use Tailwind utilities, not hex codes
4. **Visual Hierarchy** → Prioritize CTAs, use proper headings
5. **Maintainability** → Avoid inline styles, use design system

**Every fix makes the app more usable, accessible, and maintainable.**

Run `npm run ux:audit` regularly to catch issues early!
