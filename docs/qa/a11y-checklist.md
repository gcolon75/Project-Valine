# Accessibility Checklist

This checklist helps ensure Project Valine meets WCAG 2.1 Level AA accessibility standards.

## Quick Reference

- ✅ **Must Have**: Required for WCAG AA compliance
- 🎯 **Recommended**: Best practices for better accessibility
- 🔧 **Tool**: Can be checked with automated tools

---

## Semantic HTML & Structure

### Headings
- ✅ Use proper heading hierarchy (h1 → h2 → h3, no skipping)
- ✅ One h1 per page describing main content
- ✅ Headings describe content that follows
- 🔧 Run axe-core to detect heading issues

### Landmarks
- ✅ Use semantic elements: `<header>`, `<nav>`, `<main>`, `<footer>`, `<aside>`
- ✅ One `<main>` element per page
- ✅ Skip-to-content link for keyboard users
- 🎯 Use `<section>` with `aria-label` for distinct regions

### Lists
- ✅ Use `<ul>`, `<ol>`, `<dl>` for list content
- ✅ Navigation menus should be in `<nav>` elements
- 🎯 Breadcrumbs in `<nav>` with `aria-label="Breadcrumb"`

---

## Keyboard Navigation

### Focus Management
- ✅ All interactive elements are keyboard accessible (Tab, Enter, Space)
- ✅ Visible focus indicators on all focusable elements
- ✅ Logical tab order (matches visual order)
- ✅ No keyboard traps (can Tab out of all components)
- 🎯 Custom focus styles that match brand

**Test**: Navigate entire site using only keyboard

### Interactive Elements
- ✅ Buttons: Use `<button>` element, activated by Enter/Space
- ✅ Links: Use `<a>` element, activated by Enter
- ✅ Forms: All controls accessible via keyboard
- ✅ Modals: Focus trapped within modal, Escape key closes
- ✅ Dropdowns: Arrow keys navigate, Enter selects

**Common Issues**:
```jsx
// ❌ Bad: div with onClick
<div onClick={handleClick}>Click me</div>

// ✅ Good: button element
<button onClick={handleClick}>Click me</button>

// ✅ Good: div with proper ARIA and keyboard support
<div role="button" tabIndex={0} onClick={handleClick} onKeyPress={handleKeyPress}>
  Click me
</div>
```

---

## Images & Media

### Images
- ✅ All `<img>` have `alt` attributes
- ✅ Decorative images: `alt=""`
- ✅ Informative images: Describe content/function
- ✅ Complex images (charts, diagrams): Detailed description in caption or adjacent text
- 🔧 Axe-core detects missing alt text

**Examples**:
```jsx
// ✅ Informative
<img src="profile.jpg" alt="Sarah Johnson, Software Engineer" />

// ✅ Decorative
<img src="divider.png" alt="" />

// ✅ Functional (link/button)
<button>
  <img src="search.svg" alt="Search" />
</button>
```

### Icons
- ✅ Icon-only buttons have `aria-label`
- ✅ Decorative icons: `aria-hidden="true"`
- ✅ Informative icons: Include text alternative

**Examples**:
```jsx
// ✅ Icon button with label
<button aria-label="Close dialog">
  <XIcon aria-hidden="true" />
</button>

// ✅ Icon with visible text
<button>
  <SaveIcon aria-hidden="true" />
  <span>Save</span>
</button>
```

### Video/Audio
- ✅ Captions for videos
- ✅ Transcripts for audio content
- ✅ Audio descriptions for important visual info
- ✅ Media controls keyboard accessible

---

## Forms & Inputs

### Labels
- ✅ Every input has an associated `<label>`
- ✅ Labels are visible (not placeholder-only)
- ✅ Labels describe the purpose clearly
- 🔧 Axe-core detects missing labels

**Examples**:
```jsx
// ✅ Explicit label
<label htmlFor="email">Email address</label>
<input id="email" type="email" />

// ✅ Implicit label
<label>
  Email address
  <input type="email" />
</label>

// ✅ Aria-label when visual label not possible
<input type="search" aria-label="Search scripts" />
```

### Form Validation
- ✅ Error messages clearly associated with inputs
- ✅ Use `aria-describedby` for error messages
- ✅ Use `aria-invalid="true"` on invalid inputs
- ✅ Don't rely on color alone to indicate errors
- ✅ Provide clear instructions before form

**Example**:
```jsx
<label htmlFor="username">Username</label>
<input
  id="username"
  type="text"
  aria-describedby={error ? "username-error" : undefined}
  aria-invalid={error ? "true" : "false"}
/>
{error && (
  <span id="username-error" role="alert">
    Username must be at least 3 characters
  </span>
)}
```

### Required Fields
- ✅ Mark required fields clearly (not just with `*`)
- ✅ Use `required` attribute on inputs
- ✅ Include "required" in label text or `aria-label`

---

## Color & Contrast

### Color Contrast
- ✅ Normal text: 4.5:1 contrast ratio minimum
- ✅ Large text (18pt+ or 14pt+ bold): 3:1 contrast ratio
- ✅ UI components and graphics: 3:1 contrast ratio
- 🔧 Use browser DevTools or WebAIM Contrast Checker

### Color Usage
- ✅ Don't use color alone to convey information
- ✅ Supplement color with icons, text, or patterns
- ✅ Error states: Use icons + text + color
- ✅ Links: Underline or other visual indicator besides color

**Examples**:
```jsx
// ❌ Color only
<span className="text-red-500">Error</span>

// ✅ Color + icon + text
<span className="text-red-500">
  <AlertIcon aria-hidden="true" />
  Error: Invalid email format
</span>
```

---

## ARIA (Accessible Rich Internet Applications)

### When to Use ARIA
- 🎯 **Rule 1**: Use semantic HTML first
- 🎯 **Rule 2**: Don't override native semantics
- 🎯 **Rule 3**: All interactive ARIA controls must be keyboard accessible
- 🎯 **Rule 4**: Don't use `role="presentation"` or `aria-hidden="true"` on focusable elements
- 🎯 **Rule 5**: All interactive elements must have an accessible name

### Common ARIA Attributes

#### Roles
```jsx
// For custom components
<div role="button" tabIndex={0}>Custom Button</div>
<div role="alert">Error message</div>
<div role="dialog" aria-modal="true">Modal content</div>
<nav aria-label="Main navigation">...</nav>
```

#### States
```jsx
<button aria-pressed={isPressed}>Toggle</button>
<button aria-expanded={isOpen}>Menu</button>
<input aria-invalid={hasError} />
<div aria-hidden={!isVisible}>Content</div>
```

#### Properties
```jsx
<button aria-label="Close dialog">×</button>
<input aria-describedby="help-text" />
<div aria-labelledby="dialog-title">...</div>
<button aria-haspopup="menu">Options</button>
```

### Live Regions
```jsx
// Announce status messages
<div role="status" aria-live="polite">
  Profile updated successfully
</div>

// Announce urgent messages
<div role="alert" aria-live="assertive">
  Connection lost. Reconnecting...
</div>
```

---

## Dynamic Content

### Loading States
- ✅ Loading spinners: Include text alternative
- ✅ Use `aria-live` regions for status updates
- ✅ Indicate progress for long operations

**Example**:
```jsx
{isLoading && (
  <div role="status" aria-live="polite">
    <Spinner aria-hidden="true" />
    <span className="sr-only">Loading content...</span>
  </div>
)}
```

### Modals & Dialogs
- ✅ Focus moves to modal on open
- ✅ Focus trapped within modal
- ✅ Focus returns to trigger on close
- ✅ Escape key closes modal
- ✅ Use `role="dialog"` and `aria-modal="true"`
- ✅ Modal has accessible name via `aria-labelledby`

### Notifications & Alerts
- ✅ Use `role="alert"` for important messages
- ✅ Use `role="status"` for status updates
- ✅ Non-urgent: `aria-live="polite"`
- ✅ Urgent: `aria-live="assertive"`

---

## Mobile & Touch

### Touch Targets
- ✅ Minimum 44x44 CSS pixels for touch targets
- ✅ Adequate spacing between interactive elements
- 🎯 48x48 pixels recommended

### Zoom & Scaling
- ✅ Don't disable pinch-to-zoom
- ✅ Content reflows at 200% zoom
- ✅ No horizontal scrolling at 320px width

---

## Testing Checklist

### Automated Testing
- [ ] Run axe-core accessibility audit workflow
- [ ] Check Lighthouse accessibility score (target: ≥ 90)
- [ ] Use browser DevTools accessibility inspector
- [ ] Validate HTML (semantic structure)

### Manual Testing
- [ ] **Keyboard only**: Navigate entire site without mouse
- [ ] **Screen reader**: Test with NVDA (Windows) or VoiceOver (Mac)
- [ ] **Zoom**: Test at 200% browser zoom
- [ ] **Mobile**: Test on actual mobile devices
- [ ] **Color blindness**: Use color blindness simulators
- [ ] **High contrast mode**: Test in Windows High Contrast mode

### Screen Reader Testing
**VoiceOver (Mac)**:
- Turn on: Cmd + F5
- Navigate: Ctrl + Option + Arrow keys
- Interact: Ctrl + Option + Space

**NVDA (Windows)**:
- Download: Free from nvaccess.org
- Navigate: Arrow keys
- Read all: Insert + Down arrow
- Interact: Enter

### Per-Page Checklist
- [ ] Page has descriptive `<title>`
- [ ] One h1 describing main content
- [ ] Proper heading hierarchy
- [ ] All images have alt text
- [ ] Forms have labels
- [ ] Focus visible on all interactive elements
- [ ] Keyboard accessible
- [ ] Color contrast meets WCAG AA
- [ ] No content only accessible with mouse

---

## Common Violations & Fixes

### Missing Alt Text
**Violation**: Images without alt attributes

**Fix**:
```jsx
// Before
<img src="logo.png" />

// After
<img src="logo.png" alt="Project Valine" />
```

### Low Contrast
**Violation**: Text doesn't meet 4.5:1 contrast ratio

**Fix**: Update colors in Tailwind config
```js
// Use darker shades or increase opacity
text-gray-600 → text-gray-700
bg-opacity-50 → bg-opacity-70
```

### Missing Form Labels
**Violation**: Input without associated label

**Fix**:
```jsx
// Before
<input type="text" placeholder="Search" />

// After
<label htmlFor="search">Search</label>
<input id="search" type="text" placeholder="Search" />
```

### Button Without Accessible Name
**Violation**: Icon button without label

**Fix**:
```jsx
// Before
<button><XIcon /></button>

// After
<button aria-label="Close">
  <XIcon aria-hidden="true" />
</button>
```

### Keyboard Trap
**Violation**: Can't Tab out of modal or component

**Fix**: Implement focus trap with Escape key exit
```jsx
// Use a library like focus-trap-react or implement:
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [onClose]);
```

---

## Resources

### Tools
- **Axe DevTools**: Browser extension for accessibility testing
- **WAVE**: Web accessibility evaluation tool
- **Lighthouse**: Built into Chrome DevTools
- **Color Contrast Checker**: webaim.org/resources/contrastchecker/
- **NVDA Screen Reader**: nvaccess.org (Windows, free)
- **VoiceOver**: Built into macOS and iOS

### Guidelines
- **WCAG 2.1**: w3.org/WAI/WCAG21/quickref/
- **WAI-ARIA**: w3.org/WAI/ARIA/apg/
- **MDN Accessibility**: developer.mozilla.org/en-US/docs/Web/Accessibility

### Learning
- **WebAIM**: webaim.org
- **A11y Project**: a11yproject.com
- **Deque University**: dequeuniversity.com

---

## Integrating with Development

### Pre-commit Hook
Consider adding accessibility checks to pre-commit hooks:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test && npm run a11y-check"
    }
  }
}
```

### Component Development
When creating new components:

1. Start with semantic HTML
2. Add keyboard support
3. Include ARIA attributes as needed
4. Test with keyboard only
5. Test with screen reader
6. Run axe-core audit
7. Check color contrast

### Pull Request Checklist
- [ ] Accessibility audit workflow passes
- [ ] Manually tested with keyboard
- [ ] Checked color contrast
- [ ] Verified focus states visible
- [ ] Tested in both light and dark mode

---

## Project Valine Specific

### Pages Audited by CI
- Home (`/`)
- Features (`/features`)
- About (`/about-us`)
- Login (`/login`)
- Join (`/join`)

### Common Issues in Codebase
Based on UX audit findings:

1. **65 Medium accessibility issues identified**
   - Missing alt text on images
   - Missing ARIA labels on icon buttons
   - Inconsistent focus states
   - Form inputs without labels

2. **Priority fixes**:
   - Add alt text to all images
   - Add ARIA labels to icon-only buttons
   - Ensure focus states on all interactive elements
   - Verify keyboard navigation on all pages

---

**Last Updated**: 2025-11-05  
**Maintained By**: Operational Readiness Team
