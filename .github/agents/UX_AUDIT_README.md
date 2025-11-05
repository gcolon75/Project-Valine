# UX Deep Audit — How to Run Locally and in GitHub

This repo includes a UX Deep Audit Agent that scans the codebase for:
- Accessibility (WCAG), ARIA labels, focus states
- Responsive design (breakpoints, fixed widths)
- Color and theme usage (hardcoded colors, surface tokens)
- Spacing and hierarchy consistency
- Generates actionable recommendations

Outputs (created at repo root):
- `UX_AUDIT_REPORT.md` — human-readable, executive summary + per-page findings
- `UX_AUDIT_FINDINGS.csv` — import into Jira/Linear/Asana for triage
- `UX_AUDIT_SUMMARY.json` — machine-readable counts and metadata

## Local usage

```bash
# Install
npm ci

# Run the audit (writes the 3 files to the repository root)
npm run ux:audit

# View report
open UX_AUDIT_REPORT.md
# or
cat UX_AUDIT_REPORT.md
```

Troubleshooting:
- Ensure Node 18+ is installed: `node -v`
- Script location: `scripts/ux-audit-agent.mjs` (executable via npm script)
- If you see “Pages directory not found,” confirm `src/pages/` exists and files are `.jsx`

## GitHub CI integration (pull requests)

A ready-to-use workflow is provided at `.github/workflows/ux-audit.yml`:
- Runs `npm run ux:audit` on each PR
- Uploads the report, CSV, and JSON as build artifacts
- Comments a short summary on the PR
- Optional gate: fail the job when High findings exceed `UX_AUDIT_MAX_HIGH`

Configure threshold by editing the workflow env:
```yaml
env:
  UX_AUDIT_MAX_HIGH: 0  # fail the job if any High findings are present
```

## Triage: Convert audit findings into GitHub issues

If you’ve enabled the audit-to-issues converter (see the PR that added it), run the converter against the CSV/JSON to draft issues:
```bash
# Example usage (adjust to your actual script or npm alias)
node scripts/ux-audit-to-issues.mjs --input UX_AUDIT_FINDINGS.csv --severity high --dry-run
# Then, to create:
node scripts/ux-audit-to-issues.mjs --input UX_AUDIT_FINDINGS.csv --severity high
```

Tips:
- Start with High severity findings
- Label issues by category (Accessibility, Responsive, Color, Spacing, Hierarchy)
- Group similar issues (e.g., repeated “missing focus states”) into a single actionable ticket per component/page

## Suggested branches for fixes

- `fix/accessibility-improvements` — alt text, ARIA, focus states, keyboard navigation
- `feat/light-mode-polish` — replace `bg-white` with surface tokens, subtle shadows
- `fix/responsive-improvements` — add breakpoints, remove fixed widths, mobile testing
- `feat/design-system` — standardize Button/Card, unify headers, document spacing/typography

## Re-run and track improvements

After fixes, re-run locally or push a PR to re-trigger CI:
```bash
npm run ux:audit
```
Compare the new `UX_AUDIT_REPORT.md` and `UX_AUDIT_SUMMARY.json` to measure progress.

## FAQ

- Q: Does the agent modify code?
  - A: No. It’s analysis-only; it generates reports and suggestions.
- Q: Can it fail CI?
  - A: Yes, if you set a strict `UX_AUDIT_MAX_HIGH` threshold in the workflow.
- Q: Where do I change the heuristics?
  - A: Edit `scripts/ux-audit-agent.mjs` — spacing, color, accessibility, responsive, and hierarchy checks are well-commented.
