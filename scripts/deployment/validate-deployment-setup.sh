#!/bin/bash
# Validation script for deployment infrastructure
# Verifies all scripts, dependencies, and configurations are in place
#
# Usage:
#   ./validate-deployment-setup.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNED=0

# Helper functions
pass() {
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    echo -e "${GREEN}✓${NC} $*"
}

fail() {
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    echo -e "${RED}✗${NC} $*"
}

warn() {
    CHECKS_WARNED=$((CHECKS_WARNED + 1))
    echo -e "${YELLOW}⚠${NC} $*"
}

header() {
    echo ""
    echo "========================================="
    echo -e "${BLUE}$*${NC}"
    echo "========================================="
}

# Check scripts exist
check_scripts() {
    header "Checking Deployment Scripts"
    
    local scripts=(
        "deploy-migrations.sh"
        "smoke-test-staging.sh"
        "run-integration-tests.sh"
        "monitor-deployment.sh"
        "MIGRATION_RUNBOOK.md"
        "USAGE_EXAMPLES.md"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$SCRIPT_DIR/$script" ]; then
            pass "Found: $script"
        else
            fail "Missing: $script"
        fi
    done
}

# Check script permissions
check_permissions() {
    header "Checking Script Permissions"
    
    local scripts=(
        "deploy-migrations.sh"
        "smoke-test-staging.sh"
        "run-integration-tests.sh"
        "monitor-deployment.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -x "$SCRIPT_DIR/$script" ]; then
            pass "Executable: $script"
        else
            fail "Not executable: $script (run: chmod +x $script)"
        fi
    done
}

# Check script syntax
check_syntax() {
    header "Checking Script Syntax"
    
    local scripts=(
        "deploy-migrations.sh"
        "smoke-test-staging.sh"
        "run-integration-tests.sh"
        "monitor-deployment.sh"
    )
    
    for script in "${scripts[@]}"; do
        if bash -n "$SCRIPT_DIR/$script" 2>/dev/null; then
            pass "Valid syntax: $script"
        else
            fail "Syntax error: $script"
        fi
    done
}

# Check dependencies
check_dependencies() {
    header "Checking System Dependencies"
    
    # Node.js
    if command -v node &> /dev/null; then
        pass "Node.js installed: $(node --version)"
    else
        fail "Node.js not installed"
    fi
    
    # npm
    if command -v npm &> /dev/null; then
        pass "npm installed: $(npm --version)"
    else
        fail "npm not installed"
    fi
    
    # curl
    if command -v curl &> /dev/null; then
        pass "curl installed: $(curl --version | head -n1)"
    else
        warn "curl not installed (optional for smoke tests)"
    fi
    
    # psql
    if command -v psql &> /dev/null; then
        pass "psql installed: $(psql --version)"
    else
        warn "psql not installed (optional for DB checks)"
    fi
    
    # jq
    if command -v jq &> /dev/null; then
        pass "jq installed: $(jq --version)"
    else
        warn "jq not installed (optional for JSON parsing)"
    fi
}

# Check Prisma setup
check_prisma() {
    header "Checking Prisma Setup"
    
    local api_dir="$PROJECT_ROOT/api"
    
    if [ -f "$api_dir/prisma/schema.prisma" ]; then
        pass "Prisma schema found"
    else
        fail "Prisma schema not found at $api_dir/prisma/schema.prisma"
    fi
    
    if [ -d "$api_dir/prisma/migrations" ]; then
        local migration_count=$(ls -1 "$api_dir/prisma/migrations" | grep -E "^[0-9]" | wc -l)
        pass "Found $migration_count Prisma migrations"
    else
        fail "Migrations directory not found"
    fi
    
    if [ -f "$api_dir/scripts/migrate-social-links.js" ]; then
        pass "Legacy migration script found"
    else
        fail "Legacy migration script not found"
    fi
    
    if [ -f "$api_dir/package.json" ]; then
        if grep -q "migrate:social-links" "$api_dir/package.json"; then
            pass "Migration scripts configured in package.json"
        else
            fail "Migration scripts not configured in package.json"
        fi
    fi
}

# Check server setup
check_server() {
    header "Checking Server Setup"
    
    local server_dir="$PROJECT_ROOT/server"
    
    if [ -f "$server_dir/src/index.js" ]; then
        pass "Server entry point found"
    else
        fail "Server entry point not found"
    fi
    
    if [ -d "$server_dir/src/routes/__tests__" ]; then
        local test_count=$(find "$server_dir/src" -name "*.test.js" | wc -l)
        pass "Found $test_count integration tests"
    else
        fail "Test directory not found"
    fi
    
    if [ -f "$server_dir/package.json" ]; then
        if grep -q "test:server" "$server_dir/package.json"; then
            pass "test:server script configured"
        else
            fail "test:server script not configured"
        fi
    fi
}

# Check vitest setup
check_vitest() {
    header "Checking Vitest Setup"
    
    if [ -f "$PROJECT_ROOT/vitest.config.js" ]; then
        pass "Vitest config found"
    else
        warn "Vitest config not found (may use defaults)"
    fi
    
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        if grep -q "vitest" "$PROJECT_ROOT/package.json"; then
            pass "Vitest installed in root package.json"
        else
            warn "Vitest may need to be installed"
        fi
    fi
}

# Check documentation
check_documentation() {
    header "Checking Documentation"
    
    local docs=(
        "MIGRATION_RUNBOOK.md"
        "USAGE_EXAMPLES.md"
        "README.md"
    )
    
    for doc in "${docs[@]}"; do
        if [ -f "$SCRIPT_DIR/$doc" ]; then
            local lines=$(wc -l < "$SCRIPT_DIR/$doc")
            pass "Found: $doc ($lines lines)"
        else
            fail "Missing: $doc"
        fi
    done
}

# Test script help options
test_help_options() {
    header "Testing Script Help Options"
    
    if "$SCRIPT_DIR/deploy-migrations.sh" --help &> /dev/null; then
        pass "deploy-migrations.sh --help works"
    else
        fail "deploy-migrations.sh --help failed"
    fi
    
    if "$SCRIPT_DIR/run-integration-tests.sh" --help &> /dev/null; then
        pass "run-integration-tests.sh --help works"
    else
        fail "run-integration-tests.sh --help failed"
    fi
    
    if "$SCRIPT_DIR/monitor-deployment.sh" --help &> /dev/null; then
        pass "monitor-deployment.sh --help works"
    else
        fail "monitor-deployment.sh --help failed"
    fi
}

# Check environment variables documentation
check_env_vars() {
    header "Checking Environment Variables Documentation"
    
    local required_vars=("DATABASE_URL" "API_BASE" "API_URL")
    
    for var in "${required_vars[@]}"; do
        if grep -q "$var" "$SCRIPT_DIR/README.md" 2>/dev/null; then
            pass "Documented: $var"
        else
            warn "Not documented in README: $var"
        fi
    done
}

# Summary
print_summary() {
    header "Validation Summary"
    
    echo ""
    echo "Total Checks: $((CHECKS_PASSED + CHECKS_FAILED + CHECKS_WARNED))"
    echo -e "${GREEN}Passed: $CHECKS_PASSED${NC}"
    echo -e "${YELLOW}Warnings: $CHECKS_WARNED${NC}"
    echo -e "${RED}Failed: $CHECKS_FAILED${NC}"
    echo ""
    
    if [ $CHECKS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All critical checks passed!${NC}"
        echo ""
        echo "Deployment infrastructure is ready to use."
        echo ""
        echo "Next steps:"
        echo "1. Review MIGRATION_RUNBOOK.md for detailed procedures"
        echo "2. Review USAGE_EXAMPLES.md for practical examples"
        echo "3. Set required environment variables (DATABASE_URL, API_BASE)"
        echo "4. Run ./deploy-migrations.sh --dry-run to test"
        return 0
    else
        echo -e "${RED}✗ Some checks failed${NC}"
        echo ""
        echo "Please fix the failed checks before proceeding."
        echo "Review the output above for specific issues."
        return 1
    fi
}

# Main execution
main() {
    echo "========================================="
    echo "Deployment Infrastructure Validation"
    echo "========================================="
    echo "Project: Project Valine"
    echo "Script Dir: $SCRIPT_DIR"
    echo ""
    
    check_scripts
    check_permissions
    check_syntax
    check_dependencies
    check_prisma
    check_server
    check_vitest
    check_documentation
    test_help_options
    check_env_vars
    
    print_summary
}

# Run
main
exit $?
