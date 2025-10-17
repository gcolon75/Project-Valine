# CHANGES.md Entry Template

Use this template when adding entries to CHANGES.md for UX improvements.

---

### [YYYY-MM-DD] - [Short Descriptive Title]

**Type:** [Layout | Copy | Accessibility | Performance | Interactive | Other]  
**Pages Affected:** [List pages or components affected]  
**Issue/Request:** [Link to issue or brief description of request]

**Changes:**
- [Specific change 1 - be concrete]
- [Specific change 2 - what was modified]
- [Specific change 3 - include technical details if relevant]

**Impact:**
- [Metric improvement, e.g., "+4% accessibility score"]
- [User benefit, e.g., "Easier form completion on mobile devices"]
- [Performance impact, e.g., "Reduced bundle size by 5KB"]

**PR:** #[PR number]  
**Reviewed by:** @[reviewer-username]

---

## Examples

### Example 1: Layout Improvement

```markdown
### [2025-10-17] - Profile Form Mobile Layout

**Type:** Layout  
**Pages Affected:** ProfileSetup, Profile Editor  
**Issue/Request:** #42 - Make profile form easier to use on mobile

**Changes:**
- Changed form layout from two-column to single-column on mobile (< 768px)
- Increased touch target size for buttons from 40px to 48px
- Added spacing between form fields for better visual separation
- Implemented responsive grid using Tailwind utilities

**Impact:**
- +4% mobile accessibility score (Lighthouse)
- Reduced form submission errors by 15% (user testing)
- Improved touch accuracy on small screens

**PR:** #123  
**Reviewed by:** @gcolon75
```

### Example 2: Copy Improvement

```markdown
### [2025-10-18] - Friendly Error Messages

**Type:** Copy  
**Pages Affected:** Login, Profile Setup, Scripts Create  
**Issue/Request:** Make error messages less technical and more helpful

**Changes:**
- Replaced "Authentication failed: 401" with "Email or password is incorrect. Please try again."
- Changed "Validation error: username required" to "Please choose a username for your profile."
- Updated "Network error: ECONNREFUSED" to "Can't reach the server. Check your connection and try again."
- Added help links to error messages where appropriate

**Impact:**
- Reduced support tickets related to error confusion by 30%
- Improved user satisfaction (from user feedback)
- Made error messages accessible to non-technical users

**PR:** #124  
**Reviewed by:** @gcolon75
```

### Example 3: Accessibility Enhancement

```markdown
### [2025-10-19] - Status Badge Contrast

**Type:** Accessibility  
**Pages Affected:** Scripts List, Auditions List, Dashboard  
**Issue/Request:** WCAG compliance - increase badge contrast

**Changes:**
- Updated badge colors to meet WCAG AA standards (4.5:1 contrast)
- Added border to badges for better visibility on varied backgrounds
- Implemented dark mode compatible color scheme
- Added ARIA labels to convey status information to screen readers

**Impact:**
- +8% accessibility score (Lighthouse)
- All badges now meet WCAG AA standards (previously only 60% compliant)
- Improved usability for users with color vision deficiency

**PR:** #125  
**Reviewed by:** @gcolon75
```

### Example 4: Interactive Improvement

```markdown
### [2025-10-20] - Loading States for Async Actions

**Type:** Interactive  
**Pages Affected:** All forms, Script Detail, Audition Detail  
**Issue/Request:** Add visual feedback during async operations

**Changes:**
- Added loading spinner to all submit buttons during form submission
- Disabled buttons while request is in progress to prevent double-submission
- Implemented skeleton loaders for content that loads asynchronously
- Added success/error toast notifications for completed actions

**Impact:**
- Reduced duplicate submissions by 85%
- Improved perceived performance (users know system is working)
- Better user experience with clear feedback

**PR:** #126  
**Reviewed by:** @gcolon75
```

### Example 5: Performance Optimization

```markdown
### [2025-10-21] - Image Lazy Loading

**Type:** Performance  
**Pages Affected:** Feed, Scripts List, Profile  
**Issue/Request:** Improve page load performance

**Changes:**
- Implemented lazy loading for images below the fold
- Added responsive image sizes with srcset attribute
- Optimized image formats (WebP with JPEG fallback)
- Reduced initial page load by deferring off-screen images

**Impact:**
- -25% initial page load time
- +12% performance score (Lighthouse)
- Reduced bandwidth usage by ~40% on image-heavy pages
- Improved LCP (Largest Contentful Paint) by 1.2s

**PR:** #127  
**Reviewed by:** @gcolon75
```

---

## Guidelines

### Be Specific
- Use concrete metrics when possible (percentages, scores, measurements)
- List exact files or components modified
- Include technical details that help other developers

### Be Concise
- Keep descriptions short but informative
- Use bullet points for readability
- Focus on what changed and why it matters

### Be Helpful
- Include links to issues, PRs, and related documentation
- Note any breaking changes or migration steps
- Document known limitations or follow-up work needed

### Types Reference

Choose the most appropriate type:
- **Layout** - Spacing, positioning, responsive design
- **Copy** - Text, labels, messages, help text
- **Accessibility** - ARIA, contrast, keyboard nav, screen readers
- **Performance** - Load time, bundle size, rendering
- **Interactive** - Hover states, animations, loading states
- **Other** - Anything that doesn't fit above categories

---

<!-- 
This template is maintained by the UX Designer Agent.
Location: .github/agents/templates/changes_template.md
Version: 1.0
Last Updated: 2025-10-17
-->
