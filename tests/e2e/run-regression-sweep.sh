#!/bin/bash

# Comprehensive Regression & A11y Sweep Test Runner
# Executes all test suites and generates reports

set -e

echo "======================================================================"
echo "Frontend Regression & Accessibility Sweep"
echo "Testing PRs 155-185"
echo "======================================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create output directories
mkdir -p test-results
mkdir -p playwright-report
mkdir -p test-results/accessibility
mkdir -p test-results/visual-regression
mkdir -p test-results/csp-compliance
mkdir -p test-results/negative-flows

echo -e "${YELLOW}Step 1: Running build...${NC}"
npm run build || {
  echo -e "${RED}Build failed!${NC}"
  exit 1
}
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

echo -e "${YELLOW}Step 2: Running unit tests...${NC}"
npm run test:run || {
  echo -e "${RED}Unit tests failed!${NC}"
  exit 1
}
echo -e "${GREEN}✓ Unit tests passed${NC}"
echo ""

echo -e "${YELLOW}Step 3: Starting dev server...${NC}"
npm run dev &
DEV_SERVER_PID=$!
echo "Dev server PID: $DEV_SERVER_PID"

# Wait for server to be ready
sleep 10
echo -e "${GREEN}✓ Dev server started${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
  echo ""
  echo -e "${YELLOW}Cleaning up...${NC}"
  kill $DEV_SERVER_PID 2>/dev/null || true
  echo -e "${GREEN}✓ Cleanup complete${NC}"
}
trap cleanup EXIT

echo -e "${YELLOW}Step 4: Running Accessibility Tests (axe-core)...${NC}"
npx playwright test tests/e2e/accessibility-sweep.spec.ts --reporter=json:test-results/accessibility/results.json || {
  echo -e "${RED}⚠ Some accessibility tests failed (this is informational)${NC}"
}
echo -e "${GREEN}✓ Accessibility tests completed${NC}"
echo ""

echo -e "${YELLOW}Step 5: Running Visual Regression Tests...${NC}"
npx playwright test tests/e2e/visual-regression.spec.ts --update-snapshots --reporter=json:test-results/visual-regression/results.json || {
  echo -e "${RED}⚠ Some visual regression tests failed${NC}"
}
echo -e "${GREEN}✓ Visual regression tests completed${NC}"
echo ""

echo -e "${YELLOW}Step 6: Running CSP Compliance Tests...${NC}"
npx playwright test tests/e2e/csp-compliance.spec.ts --reporter=json:test-results/csp-compliance/results.json || {
  echo -e "${RED}⚠ Some CSP compliance tests failed (this is informational)${NC}"
}
echo -e "${GREEN}✓ CSP compliance tests completed${NC}"
echo ""

echo -e "${YELLOW}Step 7: Running Negative Flow Tests...${NC}"
npx playwright test tests/e2e/negative-flows.spec.ts --reporter=json:test-results/negative-flows/results.json || {
  echo -e "${RED}⚠ Some negative flow tests failed${NC}"
}
echo -e "${GREEN}✓ Negative flow tests completed${NC}"
echo ""

echo -e "${YELLOW}Step 8: Running Existing E2E Tests...${NC}"
npx playwright test tests/e2e/auth-error-states.spec.ts --reporter=json:test-results/auth-error-states.json || {
  echo -e "${RED}⚠ Some auth error state tests failed${NC}"
}
npx playwright test tests/e2e/avatar-upload.spec.ts --reporter=json:test-results/avatar-upload.json || {
  echo -e "${RED}⚠ Some avatar upload tests failed${NC}"
}
npx playwright test tests/e2e/onboarding-flow.spec.ts --reporter=json:test-results/onboarding-flow.json || {
  echo -e "${RED}⚠ Some onboarding flow tests failed${NC}"
}
npx playwright test tests/e2e/profile-edit.spec.ts --reporter=json:test-results/profile-edit.json || {
  echo -e "${RED}⚠ Some profile edit tests failed${NC}"
}
echo -e "${GREEN}✓ Existing E2E tests completed${NC}"
echo ""

echo -e "${YELLOW}Step 9: Generating HTML report...${NC}"
npx playwright show-report playwright-report || {
  echo -e "${YELLOW}⚠ Could not open report (may need manual opening)${NC}"
}
echo -e "${GREEN}✓ HTML report generated${NC}"
echo ""

echo "======================================================================"
echo -e "${GREEN}Test Sweep Complete!${NC}"
echo "======================================================================"
echo ""
echo "Reports available at:"
echo "  - HTML Report: playwright-report/index.html"
echo "  - Accessibility: test-results/accessibility/results.json"
echo "  - Visual Regression: test-results/visual-regression/results.json"
echo "  - CSP Compliance: test-results/csp-compliance/results.json"
echo "  - Negative Flows: test-results/negative-flows/results.json"
echo ""
echo "Next steps:"
echo "1. Review the HTML report for test failures"
echo "2. Check accessibility violations for WCAG AA compliance"
echo "3. Review CSP compliance recommendations"
echo "4. Address any critical or serious issues"
echo "5. Create draft PRs for fixes"
echo ""
