#!/bin/bash
# Integration test runner for backend deployment validation
# Runs all backend integration tests against staging database
#
# Usage:
#   export DATABASE_URL="postgresql://..."
#   export API_URL="http://localhost:5000" or staging URL
#   ./run-integration-tests.sh [--verbose]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER_DIR="$PROJECT_ROOT/server"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_DIR="${LOG_DIR:-/tmp}"
TEST_LOG="$LOG_DIR/integration_tests_$TIMESTAMP.log"
REPORT_FILE="$LOG_DIR/integration_test_report_$TIMESTAMP.md"

# Parse arguments
VERBOSE=false
for arg in "$@"; do
    case $arg in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [--verbose]"
            echo ""
            echo "Options:"
            echo "  --verbose, -v    Show detailed test output"
            echo "  --help           Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  DATABASE_URL    PostgreSQL connection string"
            echo "  API_URL         API base URL for integration tests"
            exit 0
            ;;
    esac
done

# Helper functions
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$TEST_LOG"
}

header() {
    echo "" | tee -a "$TEST_LOG"
    echo "=========================================" | tee -a "$TEST_LOG"
    echo -e "${BLUE}$*${NC}" | tee -a "$TEST_LOG"
    echo "=========================================" | tee -a "$TEST_LOG"
}

success() {
    echo -e "${GREEN}✓${NC} $*" | tee -a "$TEST_LOG"
}

error() {
    echo -e "${RED}✗${NC} $*" | tee -a "$TEST_LOG"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $*" | tee -a "$TEST_LOG"
}

# Check prerequisites
check_prerequisites() {
    header "Checking Prerequisites"
    
    if [ -z "$DATABASE_URL" ]; then
        warn "DATABASE_URL not set - some tests may fail"
    else
        success "DATABASE_URL is configured"
    fi
    
    if [ -z "$API_URL" ]; then
        warn "API_URL not set - using default http://localhost:5000"
        export API_URL="http://localhost:5000"
    else
        success "API_URL is configured: $API_URL"
    fi
    
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    success "Node.js $(node --version) detected"
    
    if [ ! -d "$SERVER_DIR" ]; then
        error "Server directory not found: $SERVER_DIR"
        exit 1
    fi
    success "Server directory found"
}

# Install dependencies
install_dependencies() {
    header "Installing Test Dependencies"
    
    cd "$SERVER_DIR"
    
    log "Installing server dependencies..."
    if npm install >> "$TEST_LOG" 2>&1; then
        success "Dependencies installed"
    else
        error "Failed to install dependencies"
        cat "$TEST_LOG"
        exit 1
    fi
    
    # Install vitest if not present
    cd "$PROJECT_ROOT"
    if ! npm list vitest &> /dev/null; then
        log "Installing vitest..."
        npm install --save-dev vitest >> "$TEST_LOG" 2>&1
    fi
}

# Run tests
run_tests() {
    header "Running Integration Tests"
    
    cd "$PROJECT_ROOT"
    
    log "Test configuration:"
    log "  API_URL: $API_URL"
    log "  DATABASE_URL: ${DATABASE_URL:0:30}..." # Show partial for security
    log ""
    
    # Run vitest on server tests
    if [ "$VERBOSE" = true ]; then
        log "Running tests in verbose mode..."
        if npx vitest run server/src/**/__tests__/**/*.test.js 2>&1 | tee -a "$TEST_LOG"; then
            TEST_EXIT_CODE=0
        else
            TEST_EXIT_CODE=$?
        fi
    else
        log "Running tests..."
        if npx vitest run server/src/**/__tests__/**/*.test.js >> "$TEST_LOG" 2>&1; then
            TEST_EXIT_CODE=0
        else
            TEST_EXIT_CODE=$?
        fi
    fi
    
    return $TEST_EXIT_CODE
}

# Parse test results
parse_test_results() {
    header "Parsing Test Results"
    
    # Extract test summary from log
    local test_summary=$(grep -A 10 "Test Files\|Tests\|Duration" "$TEST_LOG" 2>/dev/null || echo "No summary found")
    
    echo "$test_summary"
    
    # Count passed/failed
    local passed_count=$(grep -o "✓" "$TEST_LOG" 2>/dev/null | wc -l)
    local failed_count=$(grep -o "✗" "$TEST_LOG" 2>/dev/null | wc -l)
    
    log ""
    log "Summary:"
    log "  Passed: $passed_count"
    log "  Failed: $failed_count"
    
    # Show failed tests
    if [ "$failed_count" -gt 0 ]; then
        warn "Failed tests:"
        grep -A 5 "FAIL\|✗" "$TEST_LOG" | tee -a "$TEST_LOG"
    fi
}

# Generate report
generate_report() {
    header "Generating Test Report"
    
    local exit_code=$1
    
    cat > "$REPORT_FILE" <<EOF
# Backend Integration Test Report

**Date:** $(date +'%Y-%m-%d %H:%M:%S')  
**API URL:** $API_URL  
**Exit Code:** $exit_code

---

## Test Summary

\`\`\`
$(grep -A 10 "Test Files\|Tests\|Duration" "$TEST_LOG" 2>/dev/null || echo "Test summary not available")
\`\`\`

## Test Results by Suite

### Preferences API Tests
\`\`\`
$(grep -A 20 "preferences.test.js" "$TEST_LOG" 2>/dev/null | head -25 || echo "Not run")
\`\`\`

### Profile API Tests
\`\`\`
$(grep -A 20 "profiles.test.js" "$TEST_LOG" 2>/dev/null | head -25 || echo "Not run")
\`\`\`

### Profile Links API Tests
\`\`\`
$(grep -A 20 "profile-links.test.js" "$TEST_LOG" 2>/dev/null | head -25 || echo "Not run")
\`\`\`

### Dashboard API Tests
\`\`\`
$(grep -A 20 "dashboard.test.js" "$TEST_LOG" 2>/dev/null | head -25 || echo "Not run")
\`\`\`

## Failed Tests

EOF
    
    if [ "$exit_code" -ne 0 ]; then
        cat >> "$REPORT_FILE" <<EOF
⚠️ **Some tests failed**

\`\`\`
$(grep -B 2 -A 10 "FAIL\|✗" "$TEST_LOG" 2>/dev/null | head -50 || echo "No failure details available")
\`\`\`

### Recommendations

- Review failed test details above
- Check if failures are related to migration changes
- Verify database schema is up to date
- Ensure API endpoints are accessible
- Check for authentication/authorization issues

EOF
    else
        cat >> "$REPORT_FILE" <<EOF
✅ **All tests passed**

No failures detected.

EOF
    fi
    
    cat >> "$REPORT_FILE" <<EOF

## Full Test Log

Complete test output is available at: \`$TEST_LOG\`

---

**Report generated:** $(date +'%Y-%m-%d %H:%M:%S')  
**Next steps:** Review failures (if any) and verify functionality manually

EOF
    
    log "Report generated: $REPORT_FILE"
    
    # Display report
    echo ""
    cat "$REPORT_FILE"
}

# Main execution
main() {
    log "Starting integration test suite..."
    log "Log file: $TEST_LOG"
    
    check_prerequisites
    install_dependencies
    
    if run_tests; then
        success "All integration tests passed!"
        parse_test_results
        generate_report 0
        exit 0
    else
        EXIT_CODE=$?
        warn "Some integration tests failed"
        parse_test_results
        generate_report $EXIT_CODE
        exit $EXIT_CODE
    fi
}

# Run main
main
