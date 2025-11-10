# Enhancement: Visual Diff Integration Pipeline

**Labels:** `enhancement`, `analyzer`, `visual-testing`  
**Dependency:** None

## Context

The orchestration analysis tool currently processes Playwright test results and accessibility reports, but lacks visual regression testing capabilities. Many UI bugs and unintended changes are only detectable through visual comparison (layout shifts, color changes, responsive breakpoints, etc.).

## Problem Statement

Current limitations:
- No visual baseline storage or comparison
- Cannot detect visual regressions automatically
- Manual screenshot review is time-consuming and error-prone
- No historical visual data for trend analysis
- Difficult to catch subtle UI changes (1-2px shifts, color variations)

This leads to:
- Undetected visual bugs reaching production
- Time wasted on manual visual QA
- Inconsistent UI across different viewports/browsers
- Difficulty reviewing design changes in PRs

## Rationale

Visual diff integration provides:
- **Automated visual regression detection**: Catch UI bugs before merge
- **Faster PR reviews**: Visual changes highlighted automatically
- **Design consistency**: Enforce visual standards across codebase
- **Historical tracking**: See how UI evolved over time
- **Multi-browser/viewport coverage**: Test responsive design

## Proposed Solution

Integrate visual diff capability using Percy, Chromatic, or self-hosted pixelmatch:

```javascript
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

async function compareScreenshots(baselinePath, currentPath) {
  const baseline = PNG.sync.read(await fs.readFile(baselinePath));
  const current = PNG.sync.read(await fs.readFile(currentPath));
  
  const { width, height } = baseline;
  const diff = new PNG({ width, height });
  
  const numDiffPixels = pixelmatch(
    baseline.data,
    current.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );
  
  const diffPercentage = (numDiffPixels / (width * height)) * 100;
  
  return {
    diffPixels: numDiffPixels,
    diffPercentage,
    diffImagePath: await saveDiffImage(diff),
    isDifferent: diffPercentage > 0.5
  };
}
```

## Acceptance Criteria

- [ ] Choose visual diff provider (Percy, Chromatic, or self-hosted)
- [ ] Implement screenshot extraction from Playwright artifacts
- [ ] Set up baseline image storage (S3, Git LFS, or service)
- [ ] Implement image comparison algorithm
- [ ] Generate visual diff report (HTML or Markdown)
- [ ] Add visual regression issues to consolidated report
- [ ] Support multiple viewports (mobile, tablet, desktop)
- [ ] Allow configurable diff threshold
- [ ] Include before/after images in PR comments
- [ ] Add approval workflow for intentional changes
- [ ] Support baseline updates via CLI
- [ ] Add visual diff results to gating logic
- [ ] Document setup and usage
- [ ] Include integration tests

## Example Usage

```bash
# Analyze with visual diff
node scripts/analyze-orchestration-run.mjs 123456 --visual-diff

# Update baselines
node scripts/analyze-orchestration-run.mjs 123456 --update-baselines

# Compare against specific baseline
node scripts/analyze-orchestration-run.mjs 123456 --baseline-ref main
```

## Technical Notes

### Storage Options
- **Percy**: Easy setup, hosted UI (paid)
- **Chromatic**: Storybook integration (paid)
- **S3 + CloudFront**: Full control, cost-effective
- **Git LFS**: Version controlled, simple

### Comparison Algorithms
- **pixelmatch**: Fast, anti-aliasing aware
- **resemble.js**: Ignores anti-aliasing
- **looks-same**: Browser-style comparison

## References

- Percy: https://percy.io/
- Chromatic: https://www.chromatic.com/
- pixelmatch: https://github.com/mapbox/pixelmatch
- Playwright Screenshots: https://playwright.dev/docs/screenshots

## Related Issues

- Enhancement #5: Flakiness storage (visual diffs can be flaky)
- Enhancement #8: PR comment templating

## Priority

**P3** - Nice to have for comprehensive QA, not critical.
