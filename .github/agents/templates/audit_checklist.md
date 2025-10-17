# UX Audit Checklist

Use this checklist when auditing UX changes before opening a PR.

---

## Pre-Implementation Checklist

Before making changes:

- [ ] Understand the user pain point or request
- [ ] Review existing code and patterns
- [ ] Identify affected components/pages
- [ ] Check if similar patterns exist elsewhere
- [ ] Estimate effort (< 4 hours for agent work)

---

## Design Review Checklist

Before implementing:

- [ ] Proposed solution addresses the root problem
- [ ] Solution is minimal and focused
- [ ] Alternatives considered and documented
- [ ] Design is consistent with existing UI patterns
- [ ] Responsive behavior planned for all breakpoints
- [ ] Accessibility considerations identified

---

## Implementation Checklist

While coding:

### Code Quality
- [ ] Changes are minimal (only what's necessary)
- [ ] Follows existing code patterns and conventions
- [ ] Uses existing Tailwind utilities before custom CSS
- [ ] No new dependencies added (unless justified)
- [ ] Comments added for complex logic
- [ ] No console.log or debug code left behind

### Accessibility
- [ ] Labels associated with form inputs (htmlFor/id)
- [ ] ARIA labels added where appropriate
- [ ] Heading hierarchy maintained (h1 → h2 → h3)
- [ ] Focus indicators visible and styled
- [ ] Color not the only indicator of state
- [ ] Alt text for images
- [ ] Skip-to-content link (if page structure changed)

### Responsive Design
- [ ] Tested at 320px (mobile)
- [ ] Tested at 768px (tablet)
- [ ] Tested at 1024px (desktop)
- [ ] Tested at 1920px (large desktop)
- [ ] No horizontal scrolling on mobile
- [ ] Touch targets >= 48x48px on mobile
- [ ] Text readable without zooming

### Interactive States
- [ ] Hover states defined
- [ ] Active/pressed states defined
- [ ] Focus states visible
- [ ] Disabled states styled appropriately
- [ ] Loading states implemented (for async actions)
- [ ] Error states handled gracefully

---

## Testing Checklist

### Browser Testing
- [ ] Chrome (latest version)
- [ ] Firefox (latest version)
- [ ] Safari (latest version)
- [ ] Edge (if applicable)

### Device Testing
- [ ] Physical mobile device OR device emulation
- [ ] Tablet size (landscape and portrait)
- [ ] Desktop with different resolutions

### Accessibility Testing

#### Keyboard Navigation
- [ ] All interactive elements reachable with Tab
- [ ] Tab order is logical
- [ ] Focus indicators clearly visible
- [ ] Enter/Space activate buttons
- [ ] Escape closes modals/dialogs (if applicable)
- [ ] Arrow keys work in menus/lists (if applicable)

#### Screen Reader Testing
- [ ] NVDA (Windows) OR
- [ ] JAWS (Windows) OR
- [ ] VoiceOver (Mac/iOS)
- [ ] Labels announced correctly
- [ ] Form errors announced
- [ ] Dynamic content changes announced (if applicable)

#### Color Contrast
- [ ] Normal text: 4.5:1 minimum (WCAG AA)
- [ ] Large text (18pt+ or 14pt+ bold): 3:1 minimum
- [ ] Interactive elements: 3:1 minimum
- [ ] Tested with Chrome DevTools contrast checker

#### Other Accessibility
- [ ] Zoom to 200% - content still usable
- [ ] Windows High Contrast mode (if applicable)
- [ ] Reduced motion respected (if animations added)

### Functional Testing
- [ ] Form submission works
- [ ] Validation triggers correctly
- [ ] Error messages display properly
- [ ] Success messages display properly
- [ ] Navigation works as expected
- [ ] Data persists correctly

### Build and Tests
- [ ] `npm run build` succeeds
- [ ] No new ESLint warnings
- [ ] No console errors or warnings
- [ ] Existing tests pass
- [ ] New tests added for new behavior (if applicable)

---

## Performance Audit Checklist

### Lighthouse Audit
Run Lighthouse and capture scores:

- [ ] Performance: ____ / 100 (before) → ____ / 100 (after)
- [ ] Accessibility: ____ / 100 (before) → ____ / 100 (after)
- [ ] Best Practices: ____ / 100 (before) → ____ / 100 (after)
- [ ] SEO: ____ / 100 (before) → ____ / 100 (after)

**Acceptance:** No regression > 5% in any category

### Core Web Vitals
- [ ] LCP (Largest Contentful Paint) < 2.5s
- [ ] FID (First Input Delay) < 100ms
- [ ] CLS (Cumulative Layout Shift) < 0.1

### Bundle Size
- [ ] Check `npm run build` output
- [ ] Note bundle size before: ____ KB
- [ ] Note bundle size after: ____ KB
- [ ] Change: +/- ____ KB (+/- ____%)

**Acceptance:** Bundle increase < 10% or justified

### Images and Assets
- [ ] Images optimized (WebP with fallback if needed)
- [ ] Images lazy-loaded (if below fold)
- [ ] Responsive images with srcset (if applicable)
- [ ] SVGs optimized (SVGO or similar)

---

## Documentation Checklist

### Code Documentation
- [ ] Complex logic has comments
- [ ] PropTypes/TypeScript types defined (if applicable)
- [ ] Component usage documented (if new component)

### CHANGES.md Entry
- [ ] Date added [YYYY-MM-DD]
- [ ] Type specified (Layout/Copy/Accessibility/Performance/Interactive)
- [ ] Pages affected listed
- [ ] Changes described concretely
- [ ] Impact quantified (metrics or user benefit)
- [ ] PR number will be added

### README Updates (if applicable)
- [ ] Screenshots updated (if UI changed significantly)
- [ ] Instructions updated (if user-facing change)
- [ ] Links verified

---

## PR Preparation Checklist

### Evidence Collection
- [ ] Before screenshot captured
- [ ] After screenshot captured
- [ ] Lighthouse results captured (before/after)
- [ ] Accessibility audit results captured
- [ ] Browser testing results documented

### PR Description
- [ ] Problem statement clear
- [ ] Solution explained
- [ ] Changes listed with checkboxes
- [ ] Design artifacts included
- [ ] Audit results included
- [ ] Testing checklist completed
- [ ] Files changed section accurate

### Git Hygiene
- [ ] Commits are focused and logical
- [ ] Commit messages follow convention (`ux: <description>`)
- [ ] No unrelated changes included
- [ ] No debug/temp files committed
- [ ] No merge conflicts

### Final Checks
- [ ] CHANGES.md updated
- [ ] README updated (if needed)
- [ ] Branch pushed to origin
- [ ] PR opened with full description
- [ ] Reviewer assigned (@gcolon75)
- [ ] Self-review completed (review your own PR)

---

## Post-PR Checklist

After opening PR:

- [ ] CI/CD checks passing
- [ ] No merge conflicts
- [ ] Preview deployment works (if available)
- [ ] Responded to reviewer feedback
- [ ] Made requested changes
- [ ] Re-tested after changes
- [ ] Updated PR description if scope changed

After merge:

- [ ] Verified deployment to staging/production
- [ ] Monitored for issues
- [ ] Updated any related issues
- [ ] Documented lessons learned (if applicable)

---

## Common Issues and Fixes

### Accessibility Issues

**Issue:** Focus not visible  
**Fix:** Ensure `focus:ring-*` or custom focus styles applied

**Issue:** Color contrast too low  
**Fix:** Use darker/lighter shades, check with Chrome DevTools

**Issue:** Form labels not associated  
**Fix:** Add `htmlFor` to label and `id` to input (must match)

### Performance Issues

**Issue:** Bundle size increased significantly  
**Fix:** Lazy-load components, split code, review dependencies

**Issue:** Layout shift on page load  
**Fix:** Set explicit width/height on images, reserve space for dynamic content

### Responsive Issues

**Issue:** Horizontal scroll on mobile  
**Fix:** Use `max-w-full` and `overflow-hidden` where appropriate

**Issue:** Text too small on mobile  
**Fix:** Use responsive text sizes (`text-sm md:text-base`)

**Issue:** Touch targets too small  
**Fix:** Increase to at least 48x48px (use `p-3` or larger)

---

## Tools and Resources

### Testing Tools
- **Chrome DevTools**: Lighthouse, Accessibility audit, Device emulation
- **Firefox DevTools**: Accessibility inspector
- **axe DevTools**: Browser extension for accessibility
- **WAVE**: Browser extension for accessibility
- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/

### Lighthouse CLI
```bash
npm install -g lighthouse
lighthouse http://localhost:3000/profile-setup --view
```

### Quick Accessibility Test
```bash
# Install axe-cli
npm install -g axe-cli

# Run audit
axe http://localhost:3000/profile-setup
```

### Performance Test
```bash
# Build and preview
npm run build
npm run preview

# Check bundle size
ls -lh dist/assets/
```

---

## Severity Guidelines

Use these guidelines to prioritize issues:

### Critical (Must Fix Before Merge)
- ❌ Breaks existing functionality
- ❌ WCAG Level A violations (keyboard trap, missing alt text)
- ❌ Console errors in production
- ❌ Build fails

### High (Should Fix Before Merge)
- ⚠️ WCAG Level AA violations (contrast < 4.5:1)
- ⚠️ Performance regression > 10%
- ⚠️ Major responsive issues
- ⚠️ Keyboard navigation broken

### Medium (Fix if Time Permits, or in Follow-up)
- 💡 WCAG Level AAA considerations
- 💡 Minor responsive tweaks
- 💡 Performance optimization opportunities
- 💡 Code quality improvements

### Low (Nice to Have)
- ✨ Visual polish
- ✨ Animation enhancements
- ✨ Additional browser support (older versions)

---

*This checklist is maintained by the UX Designer Agent.*  
*Location: .github/agents/templates/audit_checklist.md*  
*Version: 1.0*  
*Last Updated: 2025-10-17*

**How to use:**
1. Print or keep this checklist open while working
2. Check off items as you complete them
3. Include completed checklist in PR description
4. Use as a final review before requesting review
