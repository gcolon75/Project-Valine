# Regression & A11y Sweep - Quick Execution Guide

## ⚡ Quick Start (5 minutes)

```bash
# 1. Install Playwright browsers (one-time, ~5 min)
npx playwright install chromium webkit firefox --with-deps

# 2. Run the full sweep (~20-30 min)
./tests/e2e/run-regression-sweep.sh

# 3. View results
npx playwright show-report playwright-report
```

## 📊 What Gets Tested

### Accessibility (WCAG AA)
- ✅ All marketing pages
- ✅ All auth flows (login, signup, 2FA, reset, verify)
- ✅ Dashboard and authenticated pages
- ✅ Settings and profile pages
- ✅ Complete onboarding wizard

### Visual Regression
- ✅ Key components (Header, Button, Card)
- ✅ Full pages across 3 browsers
- ✅ Responsive layouts
- ✅ Dark mode variants

### Security (CSP & XSS)
- ✅ Inline script/style detection
- ✅ Event handler audit
- ✅ DOMPurify usage
- ✅ XSS payload testing

### Error Handling
- ✅ Expired tokens
- ✅ Wrong 2FA codes
- ✅ Rate limiting
- ✅ Network errors
- ✅ Concurrent requests

## 📁 Where to Find Results

```
playwright-report/index.html           # 👈 START HERE (interactive UI)
REGRESSION_SWEEP_REPORT.md             # Executive summary
test-results/
  ├── accessibility/results.json       # A11y violations
  ├── visual-regression/               # Screenshot diffs
  ├── csp-compliance/results.json      # Security findings
  └── negative-flows/results.json      # Error handling results
```

## 🎯 Priority Actions

After running tests, check for:

1. **P0 (Critical) - Fix Immediately**
   - Critical WCAG violations (accessibility blockers)
   - Security vulnerabilities (XSS, CSP violations)

2. **P1 (High) - Fix This Sprint**
   - Serious accessibility issues
   - Visual regressions in production
   - Error handling gaps

3. **P2 (Medium) - Backlog**
   - Moderate accessibility improvements
   - Minor visual differences
   - Edge case handling

## 🔧 Troubleshooting

### Browsers Won't Install
```bash
# Try installing one at a time
npx playwright install chromium
npx playwright install webkit
npx playwright install firefox
```

### Tests Fail Due to Server Not Running
```bash
# Start dev server manually in separate terminal
npm run dev

# Then run tests with existing server
PW_BASE_URL=http://localhost:3000 npx playwright test
```

### Visual Diffs After Intentional Changes
```bash
# Update baseline snapshots
npx playwright test --update-snapshots
```

## 📝 Generating Reports

### After Test Execution

```bash
# Generate consolidated markdown report
node scripts/generate-regression-report.mjs

# View the report
cat REGRESSION_SWEEP_REPORT.md
```

## 🚀 CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run Regression Sweep
  run: ./tests/e2e/run-regression-sweep.sh

- name: Upload Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: |
      playwright-report/
      test-results/
      REGRESSION_SWEEP_REPORT.md
```

## 📚 Documentation

- **Comprehensive Guide:** `tests/e2e/REGRESSION_SWEEP_README.md`
- **Deliverables Summary:** `REGRESSION_SWEEP_DELIVERABLES.md`
- **Task Requirements:** See PR description

## 🎬 What Happens During Execution

```
1. ✅ Build verification         (~2 min)
2. ✅ Unit tests                 (~1 min)
3. 🚀 Start dev server           (~10 sec)
4. 📊 Accessibility tests        (~5 min)
5. 📸 Visual regression tests    (~8 min)
6. 🔒 CSP compliance tests       (~3 min)
7. ❌ Negative flow tests        (~5 min)
8. ✨ Generate reports           (~30 sec)
9. 🧹 Cleanup                    (~5 sec)

Total: ~25-30 minutes
```

## 🎯 Expected Results

### Green (Pass) Scenarios
- All critical accessibility violations = 0
- No XSS vulnerabilities
- Error handling works correctly
- Visual changes match expectations

### Yellow (Review) Scenarios
- Minor accessibility improvements needed
- Intentional visual changes (update snapshots)
- CSP recommendations (informational)

### Red (Action Required) Scenarios
- Critical accessibility violations > 0
- Security vulnerabilities found
- Visual regressions not explained
- Error handling broken

## 💡 Tips

1. **First Run:** Use `--update-snapshots` to create baselines
2. **Fast Iteration:** Run specific test files during development
3. **Debugging:** Use `--headed` and `--debug` flags
4. **CI:** Set `workers: 1` for better stability

## 🆘 Need Help?

1. Check `tests/e2e/REGRESSION_SWEEP_README.md`
2. Review test output logs
3. Inspect `playwright-report/index.html` for details
4. Check individual test files for inline comments

---

**Quick Reference Card**

| Command | Purpose |
|---------|---------|
| `./tests/e2e/run-regression-sweep.sh` | Run everything |
| `npx playwright test tests/e2e/accessibility-sweep.spec.ts` | A11y only |
| `npx playwright test tests/e2e/visual-regression.spec.ts` | Visual only |
| `npx playwright test --headed` | See browser |
| `npx playwright test --debug` | Step through |
| `npx playwright show-report` | View results |
| `node scripts/generate-regression-report.mjs` | Generate report |

**Last Updated:** 2025-11-06  
**Task ID:** fe-post-merge-regression-and-a11y-sweep-155-185
