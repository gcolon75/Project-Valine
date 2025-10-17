# UX Designer Agent - Example Walkthrough

This document demonstrates how the UX Designer Agent handles a real request using the ProfileSetup page as an example.

## Example Request

**Owner:** "Agent: UX Designer, please add helpful placeholder text to the profile setup form fields to guide users on what to enter."

---

## Agent Response

### Step 1: Intake

**Request Analysis:**
- Current state: Form fields have no placeholder text or examples
- Target: Add helpful, non-obtrusive placeholder text to guide users
- Scope: ProfileSetup page (`src/pages/ProfileSetup.jsx`)

**Concrete Changes:**
1. Add placeholder text to all form fields in ProfileSetup
2. Use clear, helpful examples that guide without being prescriptive
3. Ensure placeholders don't interfere with screen readers (use placeholder attribute correctly)

**Acceptance Criteria:**
- ✅ All form fields have helpful placeholder text
- ✅ Examples are relevant and clear
- ✅ Placeholders don't replace labels (labels remain visible)
- ✅ Screen reader accessibility maintained
- ✅ Build and tests pass

**Estimated Effort:** 20-30 minutes

**No clarifying questions needed** - this is a straightforward enhancement.

---

### Step 2: Design Proposal

**Proposed Placeholder Text:**

| Field | Current | Proposed Placeholder |
|-------|---------|---------------------|
| Display Name | (none) | e.g., Jane Smith |
| Pronouns | (none) | e.g., she/her, they/them |
| Location | (none) | e.g., Los Angeles, CA |
| Bio | (none) | Tell us about yourself and your work... |
| LinkedIn | https://linkedin.com/in/your-profile | https://linkedin.com/in/yourname |
| Discipline (Artist) | (none) | e.g., Voice Actor, Animator, Writer |
| Skills (Artist) | (none) | e.g., Character voices, Animation, Comedy |
| Union Status | (none) | e.g., SAG-AFTRA, Non-union |
| Title (Observer) | (none) | e.g., Creative Director, Producer |
| Company (Observer) | (none) | e.g., Your Company Name |
| Interests (Observer) | (none) | e.g., Animation, Voice Acting, Podcasts |
| Budget Range | (none) | e.g., $500-$2000 per project |
| Showreel | (none) | e.g., https://yourwebsite.com |

**Visual Representation:**

Before:
```
┌────────────────────────────────────┐
│ Display Name *                     │
│ ┌────────────────────────────────┐ │
│ │                                │ │  ← Empty, no guidance
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

After:
```
┌────────────────────────────────────┐
│ Display Name *                     │
│ ┌────────────────────────────────┐ │
│ │ e.g., Jane Smith               │ │  ← Helpful example
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

**Design Rationale:**
- Use "e.g.," prefix to clearly indicate this is an example
- Keep examples short and realistic
- Avoid prescriptive examples that might bias user input
- Use industry-standard format (e.g., "she/her" for pronouns)

---

### Step 3: Implementation

**Branch:** `ux/profile-placeholders`

**Files Modified:**
- `src/pages/ProfileSetup.jsx` - Added placeholder text to all form inputs

**Code Changes (excerpt):**

```jsx
// Before
<input
  type="text"
  name="displayName"
  id="displayName"
  required
  value={form.displayName}
  onChange={handleChange}
  className="w-full rounded-md bg-neutral-900 border border-neutral-700 p-2..."
/>

// After
<input
  type="text"
  name="displayName"
  id="displayName"
  required
  value={form.displayName}
  onChange={handleChange}
  placeholder="e.g., Jane Smith"
  className="w-full rounded-md bg-neutral-900 border border-neutral-700 p-2..."
/>
```

**Testing:**
- ✅ Form still submits correctly
- ✅ Placeholders disappear when user types
- ✅ Labels remain visible (WCAG requirement)
- ✅ Screen readers announce labels, not placeholders
- ✅ Build completes successfully

**CHANGES.md Entry:**
```markdown
### [2025-10-17] - Profile Setup Placeholder Text

**Type:** Copy  
**Pages Affected:** ProfileSetup  
**Issue/Request:** Add helpful guidance for profile form fields

**Changes:**
- Added placeholder text to all 13 form fields in ProfileSetup
- Used "e.g.," prefix to clearly indicate examples
- Ensured placeholders don't replace accessible labels
- Tailored examples for artist vs observer roles

**Impact:**
- Improved user guidance during profile creation
- Reduced ambiguity about expected input format
- Maintained accessibility standards (labels remain)

**PR:** #XXX  
**Reviewed by:** @gcolon75
```

---

### Step 4: Audit Results

**Lighthouse Audit (ProfileSetup page):**

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Performance | 98 | 98 | 0% |
| Accessibility | 95 | 95 | 0% |
| Best Practices | 100 | 100 | 0% |
| SEO | 100 | 100 | 0% |

**Notes:**
- No performance impact (text-only change)
- Accessibility maintained (labels still present and visible)
- No bundle size change

**Accessibility Checks:**

✅ **No issues introduced:**
- Labels remain visible (WCAG 2.1 Level AA requirement)
- Placeholder text uses `placeholder` attribute correctly
- Color contrast unchanged (placeholders inherit neutral-500, 6.8:1 ratio)
- Screen readers announce labels, then read placeholder if field is empty
- Tab order and keyboard navigation unaffected

✅ **Manual Testing:**
- NVDA (Windows): Announces label first, then placeholder
- JAWS (Windows): Announces label, indicates placeholder available
- VoiceOver (Mac): Announces label and placeholder correctly

**Responsive Testing:**

✅ **All breakpoints tested:**
- Mobile (320px): Placeholders truncate appropriately
- Tablet (768px): Full placeholder text visible
- Desktop (1920px): No layout shift

---

### Step 5: PR Created

**PR #XXX: `ux: add helpful placeholder text to profile setup form`**

**Description:**
```markdown
## UX Improvement: Profile Setup Placeholder Text

### Problem
Users filling out the profile setup form don't have clear guidance on what format 
or type of information to enter in each field. This can lead to hesitation and 
incomplete profiles.

### Solution
Added helpful placeholder text to all 13 form fields with realistic examples 
prefixed with "e.g.," to clearly indicate they are examples, not requirements.

### Changes Made
- [x] Added placeholders to common fields (name, pronouns, location, bio, LinkedIn)
- [x] Added placeholders to artist-specific fields (discipline, skills, union status)
- [x] Added placeholders to observer-specific fields (title, company, interests, budget, showreel)
- [x] Updated CHANGES.md with entry for this improvement

### Design Artifacts

#### Before
[Screenshot showing empty form fields with no guidance]

#### After
[Screenshot showing form fields with helpful placeholder examples]

### Audit Results
(See full results in Step 4 above)

- No accessibility regressions
- No performance impact
- Maintained WCAG 2.1 Level AA compliance

### Files Changed
- `src/pages/ProfileSetup.jsx` - Added placeholder text to 13 form inputs
- `CHANGES.md` - Added entry for this UX improvement

### Testing Checklist
- [x] Tested on Chrome, Firefox, Safari
- [x] Tested on mobile (320px), tablet (768px), desktop (1920px)
- [x] Screen reader testing (NVDA, JAWS, VoiceOver)
- [x] Keyboard navigation verified
- [x] Form submission works correctly
- [x] Build passes

### Additional Notes
This is a low-risk, high-value change that improves user experience without 
modifying any logic or breaking existing functionality.
```

**Commit Message:**
```
ux: add helpful placeholder text to profile setup form

- Add placeholder examples to all 13 form fields
- Use "e.g.," prefix to indicate examples
- Maintain accessibility (labels still visible)
- Tailor examples for artist vs observer roles
- No performance or accessibility impact

Improves user guidance during profile creation.
```

---

### Step 6: Iteration (Example Feedback)

**Reviewer Feedback:**
> "The placeholder for 'Bio' could be more specific. Can we give examples of what makes a good bio?"

**Agent Response:**

Updated bio placeholder from:
```jsx
placeholder="Tell us about yourself and your work..."
```

To:
```jsx
placeholder="Share your background, experience, and what you're passionate about (2-3 sentences)"
```

**Reasoning:**
- More specific guidance on length
- Suggests structure (background, experience, passion)
- Still leaves room for creativity

**Updated commit:**
```
ux: improve bio placeholder specificity

- Changed bio placeholder to suggest structure and length
- Helps users write better, more complete bios
```

---

## Summary

This walkthrough demonstrates:
1. ✅ Clear intake and scoping
2. ✅ Thoughtful design with rationale
3. ✅ Minimal, focused implementation
4. ✅ Comprehensive testing and audits
5. ✅ Well-documented PR with evidence
6. ✅ Responsive to feedback

**Total time:** ~30 minutes including testing and documentation

**Impact:**
- Improved user experience (clearer guidance)
- No accessibility regressions
- No performance impact
- Easy to review and approve

---

## How This Aligns with Agent Definition

| Agent Requirement | How This Example Meets It |
|-------------------|---------------------------|
| Small, safe changes | Only added placeholder attributes - no logic changes |
| Tests and documentation | Updated CHANGES.md, tested across browsers/devices |
| Accessibility checks | Verified WCAG compliance, screen reader testing |
| Performance checks | Ran Lighthouse, confirmed no regressions |
| Before/after evidence | Provided visual examples and audit results |
| Iterative refinement | Responded to feedback and updated accordingly |

---

*This example is maintained by the UX Designer Agent.*  
*Location: .github/agents/EXAMPLE_WALKTHROUGH.md*  
*Version: 1.0*  
*Last Updated: 2025-10-17*
