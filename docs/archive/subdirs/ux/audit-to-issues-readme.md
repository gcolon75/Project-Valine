# UX Audit to Issues Workflow

Quick reference guide for converting UX audit findings into tracked GitHub issues.

## Quick Commands

```powershell
# 1. Run UX audit
npm run ux:audit

# 2. Generate issue drafts, roadmap, and milestones
npm run ux:audit-to-issues -- --severity high,medium

# 3. Preview issues and milestones before creating (dry run)
npm run ux:audit-to-issues -- --severity high,medium --create-milestones --create --dry-run

# 4. Create GitHub milestones (requires gh CLI authentication)
npm run ux:audit-to-issues -- --severity high,medium --create-milestones

# 5. Create GitHub issues (requires gh CLI authentication)
npm run ux:audit-to-issues -- --severity high,medium --create

# 6. Create issues for specific category
npm run ux:audit-to-issues -- --category responsive --severity high --create
```

## Common Scenarios

### Scenario 1: Convert all high-severity findings to issues

```powershell
# Generate JSON file first (review before creating)
npm run ux:audit-to-issues -- --severity high --output high-priority.json

# Review the JSON
Get-Content high-priority.json | jq '.issues | length'

# Create issues
npm run ux:audit-to-issues -- --severity high --create
```

### Scenario 2: Focus on specific category (e.g., Responsive Design)

```powershell
# Responsive design issues only
npm run ux:audit-to-issues -- --category responsive --severity high --create

# Accessibility issues only
npm run ux:audit-to-issues -- --category accessibility --severity high,medium --create
```

### Scenario 3: Process in batches (rate limiting)

```powershell
# Create 10 issues at a time with 2-second delay
npm run ux:audit-to-issues -- --severity high --limit 10 --delay 2000 --create

# Process remaining in next batch
npm run ux:audit-to-issues -- --severity high --limit 10 --delay 2000 --create
```

### Scenario 4: Specific pages only

```powershell
# Marketing pages only
npm run ux:audit-to-issues -- --page "Home,Features,About" --create

# Dashboard and critical pages
npm run ux:audit-to-issues -- --page "Dashboard,Profile,Feed" --severity high --create
```

## Script Options

| Option | Description | Example |
|--------|-------------|---------|
| `--severity` | Filter by severity (comma-separated) | `--severity high,medium` |
| `--category` | Filter by category | `--category responsive,accessibility` |
| `--page` | Filter by page name | `--page Home,Dashboard` |
| `--output` | Output JSON file path | `--output my-issues.json` |
| `--roadmap` | Roadmap markdown file path | `--roadmap CUSTOM_ROADMAP.md` |
| `--create` | Create GitHub issues | `--create` |
| `--create-milestones` | Create GitHub milestones | `--create-milestones` |
| `--dry-run` | Preview without creating | `--dry-run` |
| `--limit` | Limit number of issues | `--limit 10` |
| `--delay` | Delay between API calls (ms) | `--delay 2000` |
| `--help` | Show help message | `--help` |

## Output Files

The script generates three output files:

### 1. Issue Payloads JSON (`ux-audit-issues.json`)

Complete GitHub issue definitions:

```json
{
  "metadata": {
    "generatedAt": "2025-11-05T18:48:00.000Z",
    "totalFindings": 114,
    "filteredFindings": 21,
    "issuesGenerated": 21,
    "filters": { ... }
  },
  "issues": [
    {
      "title": "[Responsive] No responsive breakpoints detected - AuditionDetail",
      "body": "**Category:** Responsive\n...",
      "labels": ["ux-audit", "high priority", "responsive"],
      "metadata": {
        "page": "AuditionDetail",
        "category": "Responsive",
        "severity": "High",
        "affectedFiles": ["src/pages/AuditionDetail.jsx"]
      }
    }
  ]
}
```

### 2. Roadmap Document (`UX_AUDIT_ROADMAP.md`)

Comprehensive sprint planning document with:
- Executive summary with issue counts by severity
- Issues organized by sprint (Sprint 1: High, Sprint 2: Medium)
- Project board column structure recommendations
- Sequencing and priority guidelines
- Labels and owner suggestions
- Success criteria

**Example structure:**
```markdown
# UX Audit Roadmap and Milestones

## Executive Summary
This roadmap addresses 81 UX issues...

### Overview
| Severity | Count | Sprint Assignment |
|----------|-------|-------------------|
| High     | 18    | Sprint 1          |
| Medium   | 63    | Sprint 2          |

## Milestones

### 🎯 Sprint 1: High Priority (UX Polish - Sprint 1)
**Due Date:** 2025-11-19

**Issues (18):**
#### Responsive (18)
- [ ] [Responsive] No responsive breakpoints detected - AuditionDetail
  - Files: src/pages/AuditionDetail.jsx
...

## Project Board Recommendations
...

## Sequencing Recommendations
...
```

### 3. Milestone Definitions (Created in GitHub)

When using `--create-milestones`, two milestones are created:

- **UX Polish - Sprint 1** (Due: 2 weeks)
  - High priority issues
  - Responsive design fixes
  - Critical accessibility improvements

- **UX Polish - Sprint 2** (Due: 4 weeks)
  - Medium priority issues
  - Design token migration
  - Visual hierarchy improvements

## Labels Applied

The script automatically applies these labels:

- `ux-audit` - All issues from the audit
- `high priority` - Critical/High severity findings
- `medium priority` - Medium severity findings
- `low priority` - Low severity findings
- `accessibility` - Accessibility issues
- `responsive` - Responsive design issues
- `design-tokens` - Color/spacing/visual hierarchy issues

**Note:** Create these labels in your repository before running the script with `--create`.

## Prerequisites

### For JSON Generation Only

- Node.js 14+
- UX audit files: `UX_AUDIT_FINDINGS.csv` and `UX_AUDIT_SUMMARY.json`

### For GitHub Issue Creation

All of the above, plus:
- GitHub CLI (`gh`) installed: https://cli.github.com/
- Authenticated with `gh auth login`
- Write access to the repository

## Workflow Integration

### Complete Workflow

```powershell
# Step 1: Run audit
npm run ux:audit

# Step 2: Review audit report
Get-Content UX_AUDIT_REPORT.md

# Step 3: Generate issue drafts, roadmap, and milestone definitions
npm run ux:audit-to-issues -- --severity high,medium

# Step 4: Review generated artifacts
Get-Content ux-audit-issues.json | jq '.metadata'
Get-Content UX_AUDIT_ROADMAP.md

# Step 5: Preview before creating (dry run)
npm run ux:audit-to-issues -- --severity high,medium --create-milestones --create --dry-run

# Step 6: Create milestones in GitHub
npm run ux:audit-to-issues -- --severity high,medium --create-milestones

# Step 7: Create issues in GitHub
npm run ux:audit-to-issues -- --severity high,medium --create --delay 2000

# Step 8: Organize in GitHub Projects
# (Manual: Add issues to project board, assign to milestones)

# Step 9: Track progress
gh issue list --label ux-audit --state open
gh issue list --milestone "UX Polish - Sprint 1" --state open
```

### CI/CD Integration

Add to `.github/workflows/ux-audit-to-issues.yml`:

```yaml
name: UX Audit to Issues

on:
  workflow_dispatch:
    inputs:
      severity:
        description: 'Severity levels (comma-separated)'
        required: false
        default: 'high'
      category:
        description: 'Category filter'
        required: false
        default: ''
      create:
        description: 'Create issues (true/false)'
        required: true
        default: 'false'

jobs:
  audit-to-issues:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run UX Audit
        run: npm run ux:audit
      
      - name: Generate Issue Drafts
        run: |
          ARGS="--severity ${{ github.event.inputs.severity }}"
          if [ -n "${{ github.event.inputs.category }}" ]; then
            ARGS="$ARGS --category ${{ github.event.inputs.category }}"
          fi
          if [ "${{ github.event.inputs.create }}" = "true" ]; then
            ARGS="$ARGS --create"
          fi
          npm run ux:audit-to-issues -- $ARGS
        env:
          GH_TOKEN: ${{ github.token }}
      
      - name: Upload Issue Drafts
        uses: actions/upload-artifact@v3
        with:
          name: ux-audit-issues
          path: ux-audit-issues.json
```

## Troubleshooting

### Error: UX_AUDIT_FINDINGS.csv not found

```powershell
# Run the audit first
npm run ux:audit
```

### Error: gh CLI not authenticated

```powershell
# Authenticate with GitHub
gh auth login

# Verify authentication
gh auth status
```

### Error: Rate limit exceeded

```powershell
# Check rate limit status
gh api rate_limit

# Use delays between requests
npm run ux:audit-to-issues -- --create --delay 2000

# Or create in smaller batches
npm run ux:audit-to-issues -- --create --limit 10
```

### Issues Created with Wrong Labels

```powershell
# Create labels in GitHub first
gh label create "ux-audit" --color F9E79F
gh label create "high priority" --color E74C3C
gh label create "medium priority" --color F39C12
gh label create "accessibility" --color 9B59B6
gh label create "responsive" --color 1ABC9C
gh label create "design-tokens" --color E67E22
```

### Duplicate Issues Created

```powershell
# Always check existing issues first
gh issue list --label ux-audit

# Use dry run to preview
npm run ux:audit-to-issues -- --create --dry-run

# Close duplicates
gh issue close <issue-number> --reason duplicate
```

## Best Practices

1. **Always dry run first**: Use `--dry-run` to preview before creating issues
2. **Start with high priority**: Focus on high-severity findings first
3. **Batch by category**: Group related issues together
4. **Review drafts**: Check the JSON output before creating issues
5. **Use labels**: Ensure labels exist before running with `--create`
6. **Rate limiting**: Use `--delay` to avoid hitting API limits
7. **Track progress**: Use GitHub Projects to organize and track issues

## Example Output

```
🔍 UX Audit to GitHub Issues Converter

📂 Loading audit findings...
   Found 114 total findings
   High: 21, Medium: 88, Low: 5

🔎 Filtering findings...
   21 findings match criteria

📊 Grouping findings...
   21 unique issues identified

📝 Generating issue payloads...
   Generated 21 issue payloads

💾 Saved issue payloads to: ux-audit-issues.json

🚀 Creating GitHub issues...

[1/21] Creating issue...
   [Responsive] No responsive breakpoints detected - AuditionDetail
✅ Created: https://github.com/owner/repo/issues/123

[2/21] Creating issue...
   [Responsive] No responsive breakpoints detected - Index
✅ Created: https://github.com/owner/repo/issues/124

...

📊 Summary:
   ✅ Successful: 21
   
✨ Done!
```

## Related Documentation

- [UX Audit Agent Guide](./UX_AUDIT_AGENT.md) - How to run the UX audit
- [UX Audit to Issues Guide](./UX_AUDIT_TO_ISSUES_GUIDE.md) - Detailed guide with templates
- [GitHub Issues Documentation](https://docs.github.com/en/issues) - GitHub Issues reference
- [GitHub CLI Manual](https://cli.github.com/manual/) - gh CLI reference

## Support

- For script issues: Check the troubleshooting section above
- For audit questions: See UX_AUDIT_AGENT.md
- For GitHub issues: See GitHub documentation
- For help: Create an issue in the repository

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-05  
**Maintainer:** Project Valine Team
