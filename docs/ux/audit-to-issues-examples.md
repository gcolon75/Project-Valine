# UX Audit to Issues - Examples and Walkthroughs

This document provides concrete examples of using the UX Audit to Issues conversion tool.

## Table of Contents

1. [Quick Start Example](#quick-start-example)
2. [Real-World Scenarios](#real-world-scenarios)
3. [Generated Issue Examples](#generated-issue-examples)
4. [Advanced Use Cases](#advanced-use-cases)

## Quick Start Example

### Step 1: Run the UX Audit

```powershell
cd /home/runner/work/Project-Valine/Project-Valine
npm run ux:audit
```

**Expected Output:**
```
✅ UX Audit Complete!
📊 Generated 114 findings
   High: 21
   Medium: 88
   Low: 5
```

### Step 2: Preview High-Priority Findings

```powershell
npm run ux:audit-to-issues -- --severity high --limit 5
```

**Output:**
```
🔍 UX Audit to GitHub Issues Converter

📂 Loading audit findings...
   Found 114 total findings
   High: 21, Medium: 88, Low: 5

🔎 Filtering findings...
   5 findings match criteria

📊 Grouping findings...
   5 unique issues identified

📝 Generating issue payloads...
   Generated 5 issue payloads

💾 Saved issue payloads to: ux-audit-issues.json
```

### Step 3: Review Generated Issues

```powershell
Get-Content ux-audit-issues.json | jq '.issues[0] | {title, labels, metadata}'
```

**Output:**
```json
{
  "title": "[Responsive] No responsive breakpoints detected - AuditionDetail",
  "labels": [
    "ux-audit",
    "high priority",
    "responsive"
  ],
  "metadata": {
    "page": "AuditionDetail",
    "category": "Responsive",
    "severity": "High",
    "affectedFiles": [
      "src/pages/AuditionDetail.jsx"
    ]
  }
}
```

### Step 4: Dry Run (Preview Issue Creation)

```powershell
npm run ux:audit-to-issues -- --severity high --limit 5 --create --dry-run
```

**Output:**
```
🚀 Creating GitHub issues...

[1/5] Creating issue...
   [Responsive] No responsive breakpoints detected - AuditionDetail

📝 [DRY RUN] Would create issue:
   Title: [Responsive] No responsive breakpoints detected - AuditionDetail
   Labels: ux-audit, high priority, responsive

[2/5] Creating issue...
   [Responsive] No responsive breakpoints detected - Index

📝 [DRY RUN] Would create issue:
   Title: [Responsive] No responsive breakpoints detected - Index
   Labels: ux-audit, high priority, responsive

...

📊 Summary:
   ✅ Successful: 5

💡 This was a dry run. Use --create without --dry-run to actually create issues.
```

### Step 5: Create Issues (When Ready)

```powershell
npm run ux:audit-to-issues -- --severity high --create
```

**Note:** This requires GitHub CLI authentication (`gh auth login`)

## Real-World Scenarios

### Scenario 1: Sprint Planning - Create All High Priority Issues

**Goal:** Create all high-severity issues for sprint planning

```powershell
# Step 1: Generate and review
npm run ux:audit-to-issues -- --severity high --output sprint-issues.json

# Step 2: Review the count
Get-Content sprint-issues.json | jq '.metadata.issuesGenerated'
# Output: 21

# Step 3: Preview categories
Get-Content sprint-issues.json | jq '.issues | group_by(.metadata.category) | map({category: .[0].metadata.category, count: length})'
# Output: [
#   {"category": "Responsive", "count": 21}
# ]

# Step 4: Create issues with delay to avoid rate limits
npm run ux:audit-to-issues -- --severity high --create --delay 1500
```

**Result:** 21 high-priority issues created, all labeled correctly

---

### Scenario 2: Focused Sprint - Responsive Design Only

**Goal:** Create issues for responsive design improvements only

```powershell
# Step 1: Filter by category
npm run ux:audit-to-issues -- \
  --category responsive \
  --severity high \
  --output responsive-issues.json

# Step 2: Review affected pages
Get-Content responsive-issues.json | jq '.issues[].metadata.page' | sort | uniq

# Step 3: Create issues in batches
npm run ux:audit-to-issues -- \
  --category responsive \
  --severity high \
  --limit 10 \
  --create
```

**Result:** 10 responsive design issues created for immediate work

---

### Scenario 3: Accessibility Audit - Medium Priority

**Goal:** Create all medium-priority accessibility issues

```powershell
# Step 1: Generate accessibility issues
npm run ux:audit-to-issues -- \
  --category Accessibility \
  --severity medium \
  --output a11y-medium.json

# Step 2: Review issue types
cat a11y-medium.json | jq '.issues[].title' | Select-String -E "focus|H1|ARIA"

# Step 3: Create issues with specific prefix
npm run ux:audit-to-issues -- \
  --category Accessibility \
  --severity medium \
  --create \
  --delay 2000
```

**Result:** All medium-priority accessibility issues tracked

---

### Scenario 4: Page-Specific Improvements

**Goal:** Fix issues on specific critical pages (Dashboard, Profile, Feed)

```powershell
# Step 1: Generate issues for specific pages
npm run ux:audit-to-issues -- \
  --page "Dashboard,Profile,Feed" \
  --severity high,medium \
  --output critical-pages.json

# Step 2: Review what will be created
Get-Content critical-pages.json | jq '.issues | group_by(.metadata.page) | map({page: .[0].metadata.page, issues: length})'

# Step 3: Create issues
npm run ux:audit-to-issues -- \
  --page "Dashboard,Profile,Feed" \
  --severity high,medium \
  --create
```

**Result:** All issues for critical pages tracked

---

### Scenario 5: Incremental Rollout

**Goal:** Process issues in small batches to avoid overwhelming the team

```powershell
# Week 1: Responsive - High Priority (10 issues)
npm run ux:audit-to-issues -- \
  --category responsive \
  --severity high \
  --limit 10 \
  --create

# Week 2: Accessibility - High Priority (10 issues)
npm run ux:audit-to-issues -- \
  --category Accessibility \
  --severity high \
  --limit 10 \
  --create

# Week 3: Design Tokens - Medium Priority (15 issues)
npm run ux:audit-to-issues -- \
  --category "Color,Spacing" \
  --severity medium \
  --limit 15 \
  --create
```

**Result:** Gradual, manageable rollout of issues

## Generated Issue Examples

### Example 1: Responsive Design Issue

**Input Finding:**
```
Page: AuditionDetail
Category: Responsive
Severity: High
Issue: No responsive breakpoints detected
Evidence: Page does not use any Tailwind responsive modifiers
File: src/pages/AuditionDetail.jsx
```

**Generated GitHub Issue:**

```markdown
**Title:** [Responsive] No responsive breakpoints detected - AuditionDetail

**Labels:** ux-audit, high priority, responsive

**Body:**

**Category:** Responsive
**Severity:** High
**Affected File(s):** `src/pages/AuditionDetail.jsx`

## Description

No responsive breakpoints detected

## Current Behavior

Page does not use any Tailwind responsive modifiers

## Expected Behavior

Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices

## Reproduction Steps

1. Navigate to the AuditionDetail page
2. Resize browser window to mobile width (375px) or use DevTools device emulator
3. Observe the issue

## Suggested Fix

Add Tailwind responsive classes to main containers:

```jsx
// Before
<div className="flex gap-6 p-8">

// After  
<div className="flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-8">
```

Apply responsive classes to:
- Layout containers: `flex-col md:flex-row`
- Padding/margins: `p-4 md:p-6 lg:p-8`
- Gaps: `gap-4 md:gap-6`
- Typography: `text-base md:text-lg`

## Acceptance Criteria

- [ ] Page displays correctly on mobile (375px)
- [ ] Page displays correctly on tablet (768px)
- [ ] Page displays correctly on desktop (1280px+)
- [ ] No horizontal scrolling on any breakpoint
- [ ] Re-run UX audit to verify fix
- [ ] Visual regression test passes

## Additional Context

Generated from UX Deep Audit findings.
Severity: High
```

---

### Example 2: Accessibility - Focus States

**Input Finding:**
```
Page: Header
Category: Accessibility
Severity: High
Issue: Missing focus states
Evidence: No focus: or focus-visible: classes found
File: src/components/Header.jsx
```

**Generated GitHub Issue:**

```markdown
**Title:** [A11y] Missing focus states - Header

**Labels:** ux-audit, high priority, accessibility

**Body:**

**Category:** Accessibility
**Severity:** High
**Affected File(s):** `src/components/Header.jsx`

## Description

Missing focus states

## Current Behavior

No focus: or focus-visible: classes found

## Expected Behavior

Add focus states to interactive elements for keyboard navigation

## Reproduction Steps

1. Navigate to the Header page
2. Use keyboard navigation (Tab key) or screen reader
3. Observe the issue

## Suggested Fix

Add focus-visible styles to interactive elements:

```jsx
// Links
<a 
  href="..."
  className="focus-visible:outline-2 focus-visible:outline-primary-600 
             focus-visible:outline-offset-2 rounded"
>

// Buttons
<button 
  className="focus-visible:ring-2 focus-visible:ring-primary-600 
             focus-visible:ring-offset-2"
>
```

## Acceptance Criteria

- [ ] All interactive elements have focus-visible styles
- [ ] Focus indicators have 3:1 contrast ratio
- [ ] Keyboard navigation works correctly
- [ ] Test with Tab key navigation
- [ ] Verify with axe DevTools or Lighthouse
- [ ] Re-run UX audit to verify fix
- [ ] Visual regression test passes

## Additional Context

Generated from UX Deep Audit findings.
Severity: High
```

---

### Example 3: Design Tokens - Color

**Input Finding:**
```
Page: Home
Category: Color
Severity: Medium
Issue: Hardcoded color values detected
Evidence: Found 55 hardcoded hex color(s): #474747, #0CCE6B, #1a1a1a...
File: src/pages/Home.jsx
```

**Generated GitHub Issue:**

```markdown
**Title:** [Design] Hardcoded color values detected - Home

**Labels:** ux-audit, medium priority, design-tokens

**Body:**

**Category:** Color
**Severity:** Medium
**Affected File(s):** `src/pages/Home.jsx`

## Description

Hardcoded color values detected

## Current Behavior

Found 55 hardcoded hex color(s): #474747, #0CCE6B, #1a1a1a...

## Expected Behavior

Use design tokens or Tailwind color utilities instead of hardcoded values

## Reproduction Steps

1. Navigate to the Home page
2. Inspect the element styles and look for hardcoded color values
3. Observe the issue

## Suggested Fix

Replace hardcoded hex colors with Tailwind utilities:

```jsx
// Before
<div style={{ color: '#474747', backgroundColor: '#0CCE6B' }}>

// After
<div className="text-neutral-700 bg-primary-600">
```

Common mappings:
- `#474747` → `text-neutral-700`
- `#0CCE6B` → `text-primary-600` or `bg-primary-600`
- `#1a1a1a` → `text-neutral-900`

## Acceptance Criteria

- [ ] All hardcoded colors replaced
- [ ] Light mode appearance maintained
- [ ] Dark mode support verified
- [ ] Re-run UX audit to verify fix
- [ ] Visual regression test passes

## Additional Context

Generated from UX Deep Audit findings.
Severity: Medium
```

## Advanced Use Cases

### Use Case 1: Custom Filtering with jq

```powershell
# Generate all issues
npm run ux:audit-to-issues -- --severity high,medium --output all-issues.json

# Filter to only pages with multiple issues
Get-Content all-issues.json | jq '.issues | group_by(.metadata.page) | map(select(length > 2)) | .[]'

# Get total issues per category
Get-Content all-issues.json | jq '.issues | group_by(.metadata.category) | map({category: .[0].metadata.category, count: length})'

# Find issues affecting specific file patterns
Get-Content all-issues.json | jq '.issues[] | select(.metadata.affectedFiles[] | contains("components"))'
```

### Use Case 2: Integration with GitHub Projects

```powershell
# Create issues and capture URLs
npm run ux:audit-to-issues -- --severity high --create > issue-urls.txt

# Add issues to project (requires gh CLI project commands)
cat issue-urls.txt | Select-String "https://github.com" | while read url; do
  gh project item-add <project-id> --url "$url"
done
```

### Use Case 3: Batch Creation with Review Steps

```powershell
#!/bin/bash
# create-issues-reviewed.sh

# Generate issues
npm run ux:audit-to-issues -- --severity high --output review.json

echo "Review the issues in review.json"
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Create issues
npm run ux:audit-to-issues -- --severity high --create

echo "Issues created! Check GitHub for results."
```

### Use Case 4: Export to CSV for Review

```powershell
# Generate JSON
npm run ux:audit-to-issues -- --severity high,medium --output issues.json

# Convert to CSV (requires jq and csvkit)
Get-Content issues.json | jq -r '.issues[] | [.title, .metadata.category, .metadata.severity, .metadata.page] | @csv' > issues.csv

# Review in spreadsheet
open issues.csv
```

## Tips and Tricks

### Tip 1: Preview Titles Only

```powershell
npm run ux:audit-to-issues -- --severity high --output temp.json && \
Get-Content temp.json | jq -r '.issues[].title' && \
rm temp.json
```

### Tip 2: Count Issues Before Creating

```powershell
# Count by category
npm run ux:audit-to-issues -- --severity high --output temp.json && \
Get-Content temp.json | jq '.issues | group_by(.metadata.category) | map({category: .[0].metadata.category, count: length})' && \
rm temp.json
```

### Tip 3: Save Multiple Filtered Outputs

```powershell
# High priority responsive
npm run ux:audit-to-issues -- --category responsive --severity high --output high-responsive.json

# Medium priority accessibility
npm run ux:audit-to-issues -- --category Accessibility --severity medium --output medium-a11y.json

# All design token issues
npm run ux:audit-to-issues -- --category "Color,Spacing" --output design-tokens.json
```

### Tip 4: Validate Before Creating

```powershell
# Dry run with verbose output
npm run ux:audit-to-issues -- --create --dry-run | tee dry-run.log

# Review the log
Get-Content dry-run.log

# If satisfied, create for real
npm run ux:audit-to-issues -- --create
```

## Common Patterns

### Pattern 1: Sprint Cycle

```powershell
# Sprint planning (Week 0)
npm run ux:audit
npm run ux:audit-to-issues -- --severity high --output sprint-plan.json
Get-Content sprint-plan.json | jq '.metadata.issuesGenerated'

# Sprint start (Week 1)
npm run ux:audit-to-issues -- --severity high --create

# Sprint end (Week 2)
npm run ux:audit  # Re-run to verify fixes

# Sprint retrospective
git diff UX_AUDIT_SUMMARY.json  # Compare improvements
```

### Pattern 2: Continuous Improvement

```powershell
# Monthly audit
crontab -e
# Add: 0 0 1 * * cd /path/to/repo && npm run ux:audit

# Quarterly issue creation
# Review audit results
# Create issues for next quarter's priorities
npm run ux:audit-to-issues -- --severity high,medium --create
```

### Pattern 3: Feature Branch Workflow

```powershell
# Create branch for responsive fixes
git checkout -b fix/responsive-improvements

# Generate issues
npm run ux:audit-to-issues -- --category responsive --severity high --output responsive.json

# Fix issues one by one
# For each issue:
#   1. Fix the code
#   2. Test locally
#   3. Commit
#   4. Close issue via commit message: "Fixes #123"

# Verify improvements
npm run ux:audit
git diff UX_AUDIT_REPORT.md
```

## Troubleshooting Examples

### Problem: No Issues Generated

```powershell
$ npm run ux:audit-to-issues -- --severity critical
...
🔎 Filtering findings...
   0 findings match criteria
⚠️  No findings match the specified criteria.
```

**Solution:** Check available severities
```powershell
Get-Content UX_AUDIT_SUMMARY.json | jq '.summary'
# Output shows: high, medium, low (no "critical")

# Use correct severity
npm run ux:audit-to-issues -- --severity high
```

### Problem: Rate Limit Hit

```powershell
$ npm run ux:audit-to-issues -- --create
...
❌ Failed to create issue: [Responsive] ...
   Error: API rate limit exceeded
```

**Solution:** Add delays
```powershell
npm run ux:audit-to-issues -- --create --delay 3000 --limit 10
```

---

**Last Updated:** 2025-11-05  
**Version:** 1.0.0  
**Related:** [UX Audit Agent](UX_AUDIT_AGENT.md), [Conversion Guide](UX_AUDIT_TO_ISSUES_GUIDE.md), [Quick Reference](README_UX_AUDIT_TO_ISSUES.md)
