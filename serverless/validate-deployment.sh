#!/bin/bash
# Deployment Validation Script
# Validates the serverless configuration before deployment
#
# Usage: ./validate-deployment.sh

set -e

echo "========================================="
echo "Serverless Deployment Validation"
echo "========================================="

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "${SCRIPT_DIR}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Track validation status
VALIDATION_PASSED=true

echo ""
echo "1. Checking required files..."
if [ -f "serverless.yml" ]; then
    check_pass "serverless.yml exists"
else
    check_fail "serverless.yml not found"
    VALIDATION_PASSED=false
fi

if [ -f "layers/prisma-layer.zip" ]; then
    check_pass "Prisma layer exists"
    LAYER_SIZE=$(du -h layers/prisma-layer.zip | cut -f1)
    echo "   Layer size: ${LAYER_SIZE}"
else
    check_fail "Prisma layer not found at layers/prisma-layer.zip"
    echo "   Run: ./build-prisma-layer.sh"
    VALIDATION_PASSED=false
fi

if [ -f "package.json" ]; then
    check_pass "package.json exists"
else
    check_fail "package.json not found"
    VALIDATION_PASSED=false
fi

echo ""
echo "2. Checking dependencies..."
if [ -d "node_modules" ]; then
    check_pass "node_modules directory exists"
    
    # Check for critical dependencies
    if [ -f "node_modules/serverless/package.json" ]; then
        check_pass "serverless is installed"
    else
        check_fail "serverless not installed - run: npm ci"
        VALIDATION_PASSED=false
    fi
    
    if [ -f "node_modules/serverless-esbuild/package.json" ]; then
        check_pass "serverless-esbuild is installed"
    else
        check_fail "serverless-esbuild not installed - run: npm ci"
        VALIDATION_PASSED=false
    fi
else
    check_fail "node_modules not found - run: npm ci"
    VALIDATION_PASSED=false
fi

echo ""
echo "3. Checking environment variables..."
# Check if DATABASE_URL is set (not validating the actual value)
if [ -n "${DATABASE_URL}" ]; then
    check_pass "DATABASE_URL is set"
else
    check_warn "DATABASE_URL not set (required for deployment)"
    echo "   Set with: export DATABASE_URL='postgresql://...'"
fi

if [ -n "${JWT_SECRET}" ]; then
    check_pass "JWT_SECRET is set"
else
    check_warn "JWT_SECRET not set (required for deployment)"
    echo "   Set with: export JWT_SECRET='your-secret-here'"
fi

# Check allowlist configuration
ALLOWED_EMAILS="${ALLOWED_USER_EMAILS:-ghawk075@gmail.com,valinejustin@gmail.com}"
check_pass "ALLOWED_USER_EMAILS: ${ALLOWED_EMAILS}"

ENABLE_REG="${ENABLE_REGISTRATION:-false}"
if [ "${ENABLE_REG}" = "false" ]; then
    check_pass "ENABLE_REGISTRATION: ${ENABLE_REG} (allowlist active)"
else
    check_warn "ENABLE_REGISTRATION: ${ENABLE_REG} (public registration enabled)"
fi

echo ""
echo "4. Validating serverless.yml syntax..."
if ! command -v npx &> /dev/null; then
    check_fail "npx not found"
    VALIDATION_PASSED=false
else
    # Set minimal env vars for validation
    export DATABASE_URL="${DATABASE_URL:-postgresql://dummy:dummy@localhost:5432/dummy}"
    export JWT_SECRET="${JWT_SECRET:-dummy-secret}"
    
    if npx serverless print --stage prod --region us-west-2 > /tmp/serverless-resolved.yml 2>/dev/null; then
        check_pass "serverless.yml is valid"
        
        # Check for malformed handlers
        if grep -q '\\n' /tmp/serverless-resolved.yml; then
            check_fail "Found malformed handlers with literal \\n"
            echo "   Handlers with \\n:"
            grep '\\n' /tmp/serverless-resolved.yml | head -5
            VALIDATION_PASSED=false
        else
            check_pass "No malformed handlers found"
        fi
        
        # Verify handler files exist
        echo ""
        echo "5. Checking handler files..."
        MISSING_HANDLERS=0
        
        # Extract unique handler files
        HANDLER_FILES=$(grep -oP 'handler:\s+\K[^ ]+' /tmp/serverless-resolved.yml | sed 's/\.[^.]*$//' | sort -u)
        
        for handler_path in $HANDLER_FILES; do
            # Convert handler path to file path (e.g., src/handlers/auth.register -> src/handlers/auth.js)
            file_path="${handler_path%.*}.js"
            
            if [ -f "${file_path}" ]; then
                check_pass "${file_path}"
            else
                check_fail "${file_path} not found"
                MISSING_HANDLERS=$((MISSING_HANDLERS + 1))
                VALIDATION_PASSED=false
            fi
        done
        
        if [ $MISSING_HANDLERS -eq 0 ]; then
            check_pass "All handler files exist"
        fi
        
        rm -f /tmp/serverless-resolved.yml
    else
        check_fail "serverless.yml validation failed"
        echo "   Run: npx serverless print --stage prod --region us-west-2"
        VALIDATION_PASSED=false
    fi
fi

echo ""
echo "6. Checking Prisma layer contents..."
if [ -f "layers/prisma-layer.zip" ]; then
    # Check for the Lambda binary
    if unzip -l layers/prisma-layer.zip | grep -q "libquery_engine-rhel-openssl-3.0.x.so.node"; then
        check_pass "Lambda binary (rhel-openssl-3.0.x) present in layer"
    else
        check_fail "Lambda binary not found in layer"
        echo "   Run: ./build-prisma-layer.sh"
        VALIDATION_PASSED=false
    fi
    
    # Check for unnecessary Debian binary (should not be in layer)
    if unzip -l layers/prisma-layer.zip | grep -q "libquery_engine-debian-openssl"; then
        check_warn "Layer contains Debian binary (not needed for Lambda)"
        echo "   Rebuild layer: ./build-prisma-layer.sh"
    fi
fi

echo ""
echo "========================================="
if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}✓ Validation PASSED${NC}"
    echo "========================================="
    echo ""
    echo "Ready to deploy!"
    echo ""
    echo "Deployment commands:"
    echo "  # Set environment variables (if not already set):"
    echo "  export DATABASE_URL='postgresql://user:pass@host:port/db'"
    echo "  export JWT_SECRET='your-jwt-secret'"
    echo ""
    echo "  # Deploy:"
    echo "  npx serverless deploy --stage prod --region us-west-2"
    echo ""
    echo "  # Or with verbose output:"
    echo "  npx serverless deploy --stage prod --region us-west-2 --verbose"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Validation FAILED${NC}"
    echo "========================================="
    echo ""
    echo "Please fix the issues above before deploying."
    echo ""
    exit 1
fi
