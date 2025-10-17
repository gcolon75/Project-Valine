# UX Improvement PR Template

Use this template when opening a PR for UX improvements.

---

## UX Improvement: [Title]

### Problem
[Brief description of the UX issue being addressed. What pain point does this solve?]

### Solution
[Explanation of the design approach and implementation. Why this approach?]

### Changes Made
- [ ] Updated [component/page] with [specific change]
- [ ] Improved [accessibility/performance/copy] by [specific improvement]
- [ ] Added [tests/documentation] for [feature]
- [ ] Updated CHANGES.md with entry for this improvement

### Design Artifacts

#### Before
[Screenshot or description of current state]

#### After
[Screenshot or description of improved state]

#### Wireframe/Mockup (if applicable)
[Link to Figma or inline image/ASCII wireframe]

### Audit Results

#### Lighthouse Scores

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Performance | XX | XX | +/-X% |
| Accessibility | XX | XX | +/-X% |
| Best Practices | XX | XX | +/-X% |
| SEO | XX | XX | +/-X% |

**Performance Notes:**
- [Any performance optimizations made]
- [Bundle size impact: +X KB or -X KB]

#### Accessibility Findings

**Improvements Made:**
- ✅ [Specific accessibility improvement 1]
- ✅ [Specific accessibility improvement 2]
- ✅ [Specific accessibility improvement 3]

**Remaining Issues:**
- ⚠️ [Medium-priority issue, if any - explain why not addressed]
- ⚠️ [Another medium-priority issue, if any]

**Critical Issues:**
- ❌ [None remaining] OR [List critical issues found and fixed]

#### Testing Checklist

**Browsers:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (if applicable)

**Responsive Design:**
- [ ] Mobile (320px - 767px)
- [ ] Tablet (768px - 1023px)
- [ ] Desktop (1024px+)
- [ ] Large desktop (1920px+)

**Accessibility:**
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Screen reader compatibility (NVDA/JAWS/VoiceOver)
- [ ] Color contrast meets WCAG AA (4.5:1 normal text, 3:1 large text)
- [ ] Focus indicators visible
- [ ] ARIA labels present and correct

**Functionality:**
- [ ] All existing tests pass
- [ ] New tests added for new behavior
- [ ] No console errors or warnings
- [ ] Form validation works (if applicable)
- [ ] Interactive states work (hover, active, disabled)

### Files Changed

**Modified:**
- `src/pages/[Page].jsx` - [Brief description of changes]
- `src/components/[Component].jsx` - [Brief description of changes]
- `src/styles/[file].css` - [Brief description of changes]

**Added:**
- `src/components/[NewComponent].jsx` - [Description if new component added]

**Documentation:**
- `CHANGES.md` - Added entry for this UX improvement
- `README.md` - [Updated if necessary]

### Implementation Notes

**Code Changes:**
- [Note about any significant code patterns used]
- [Explanation of any complex logic]
- [Rationale for technical decisions]

**Design Decisions:**
- [Why this layout vs alternatives]
- [Color/typography choices]
- [Responsive breakpoint decisions]

**Future Improvements:**
- [ ] [Potential enhancement 1]
- [ ] [Potential enhancement 2]

### Breaking Changes
- [ ] No breaking changes
- OR
- [ ] Breaking change: [Description and migration path]

### Dependencies
- [ ] No new dependencies added
- OR
- [ ] Added: [package@version] - [Reason for addition]

### Rollback Plan
[How to revert this change if issues arise in production]

### Additional Notes
[Any caveats, known limitations, or follow-up items]

---

**Related Issues:** Closes #[issue number]  
**Related PRs:** Related to #[PR number]

**Checklist:**
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass locally
- [ ] No new warnings
- [ ] CHANGES.md updated
- [ ] Screenshots attached
- [ ] Audit results included

**Reviewer Notes:**
@[reviewer-username] Please pay special attention to:
- [Specific aspect to review]
- [Another aspect to review]

---

<!-- 
This template is maintained by the UX Designer Agent.
Location: .github/agents/templates/pr_template.md
Version: 1.0
Last Updated: 2025-10-17
-->
