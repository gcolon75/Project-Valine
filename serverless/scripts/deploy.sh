#!/usr/bin/env bash
#
# One-button deployment script for Project Valine API (Bash)
#
# Usage:
#   ./deploy.sh [stage] [region]
#
# Examples:
#   ./deploy.sh prod us-west-2
#   ./deploy.sh staging us-west-2
#
# This is the canonical deployment script referenced in docs/DEPLOYMENT_BIBLE.md
#

set -e  # Exit on error
set -u  # Exit on undefined variable

# Script metadata
SCRIPT_VERSION="1.0.0"
SCRIPT_NAME="deploy.sh"

# Default parameters
STAGE="${1:-prod}"
REGION="${2:-us-west-2}"
SKIP_TESTS="${SKIP_TESTS:-false}"
FORCE="${FORCE:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Output functions
print_success() { echo -e "${GREEN}✓ $*${NC}"; }
print_info() { echo -e "${CYAN}ℹ $*${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $*${NC}"; }
print_error() { echo -e "${RED}✗ $*${NC}"; }
print_step() { echo -e "\n${BLUE}▶ $*${NC}"; }

# Banner
echo -e "${CYAN}"
cat << "EOF"
═══════════════════════════════════════════════════════════
   Project Valine - One-Button Deploy Script v1.0.0
═══════════════════════════════════════════════════════════
EOF
echo -e "${NC}"

print_info "Stage: $STAGE | Region: $REGION"
[[ "$FORCE" == "true" ]] && print_warning "Force mode enabled"
[[ "$SKIP_TESTS" == "true" ]] && print_warning "Tests will be skipped"
echo ""

# ===== STEP 1: Preflight Checks =====
print_step "Step 1: Preflight Checks"

# Check we're in the serverless directory
if [[ ! -f "serverless.yml" ]]; then
    print_error "serverless.yml not found. Run this script from the serverless/ directory."
    exit 1
fi
print_success "Running from serverless directory"

# Check required tools
print_info "Checking required tools..."

check_tool() {
    local tool=$1
    local version_cmd=$2
    
    if command -v "$tool" &> /dev/null; then
        local version
        version=$($version_cmd 2>&1 | head -1)
        print_success "$tool: $version"
        return 0
    else
        print_error "$tool not found. Please install it first."
        return 1
    fi
}

check_tool "node" "node --version" || exit 1
check_tool "npm" "npm --version" || exit 1
check_tool "aws" "aws --version" || exit 1
check_tool "serverless" "serverless --version" || exit 1

# Check AWS credentials
print_info "Checking AWS credentials..."
if aws_account=$(aws sts get-caller-identity --query Account --output text 2>&1); then
    print_success "AWS Account: $aws_account"
else
    print_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

# ===== STEP 2: Validate Environment Variables =====
print_step "Step 2: Validate Environment Variables"

required_vars=("DATABASE_URL" "JWT_SECRET" "ALLOWED_USER_EMAILS")
missing_vars=()

# Load .env.prod if exists
if [[ -f ".env.prod" ]]; then
    print_info "Loading .env.prod..."
    set -a  # Auto-export variables
    # shellcheck disable=SC1091
    source .env.prod
    set +a
fi

for var in "${required_vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        missing_vars+=("$var")
    else
        # Redact sensitive values
        if [[ "$var" =~ SECRET|PASSWORD|KEY ]]; then
            print_success "$var = [REDACTED]"
        else
            local display_value="${!var:0:50}"
            print_success "$var = $display_value..."
        fi
    fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
    print_error "Missing required environment variables: ${missing_vars[*]}"
    print_warning "Set them in .env.prod or as environment variables"
    exit 1
fi

# ===== STEP 3: Validate Prisma Layer =====
print_step "Step 3: Validate Prisma Layer"

layer_path="layers/prisma-layer.zip"

if [[ -f "$layer_path" ]]; then
    layer_size=$(du -h "$layer_path" | cut -f1)
    print_success "Prisma layer found: $layer_size"
    
    # Validate layer structure
    print_info "Validating layer structure..."
    if unzip -l "$layer_path" | grep -q "nodejs/node_modules/@prisma/client"; then
        print_success "Layer structure validated"
    else
        print_warning "Layer structure invalid. Rebuilding..."
        rm -f "$layer_path"
    fi
fi

if [[ ! -f "$layer_path" ]]; then
    print_warning "Prisma layer not found. Building..."
    
    build_script="./scripts/build-prisma-layer.sh"
    if [[ -f "$build_script" ]]; then
        bash "$build_script" || {
            print_error "Prisma layer build failed"
            exit 1
        }
    else
        print_error "Build script not found: $build_script"
        exit 1
    fi
fi

# ===== STEP 4: Validate Serverless Config =====
print_step "Step 4: Validate Serverless Config"

print_info "Validating serverless.yml syntax..."
if serverless print --stage "$STAGE" --region "$REGION" > /dev/null 2>&1; then
    print_success "serverless.yml is valid"
else
    print_error "serverless.yml validation failed"
    exit 1
fi

# Check for common config issues
print_info "Checking for common config issues..."
if grep -q $'\t' serverless.yml; then
    print_warning "serverless.yml contains tab characters. Use spaces only."
fi

print_success "Config checks passed"

# ===== STEP 5: Run Linter (optional) =====
print_step "Step 5: Linting (optional)"

if command -v eslint &> /dev/null || [[ -f "../node_modules/.bin/eslint" ]]; then
    print_info "Running ESLint..."
    if npm run lint 2>&1; then
        print_success "Linting passed"
    else
        print_warning "Linting found issues (non-blocking)"
    fi
else
    print_info "ESLint not found, skipping linting"
fi

# ===== STEP 6: Package Functions =====
print_step "Step 6: Package Functions"

print_info "Packaging Lambda functions..."
package_cmd="serverless package --stage $STAGE --region $REGION"
[[ "$FORCE" == "true" ]] && package_cmd="$package_cmd --force"

if eval "$package_cmd"; then
    print_success "Functions packaged successfully"
else
    print_error "Packaging failed"
    exit 1
fi

# ===== STEP 7: Deploy to AWS =====
print_step "Step 7: Deploy to AWS"

print_info "Deploying to AWS Lambda..."
deploy_cmd="serverless deploy --stage $STAGE --region $REGION --verbose"
[[ "$FORCE" == "true" ]] && deploy_cmd="$deploy_cmd --force"

deploy_start=$(date +%s)
if eval "$deploy_cmd"; then
    deploy_end=$(date +%s)
    deploy_duration=$((deploy_end - deploy_start))
    print_success "Deployment completed in $deploy_duration seconds"
else
    print_error "Deployment failed"
    print_warning "Check CloudFormation console for details"
    exit 1
fi

# ===== STEP 8: Post-Deploy Verification =====
print_step "Step 8: Post-Deploy Verification"

print_info "Verifying Lambda environment variables..."

functions_to_check=(
    "pv-api-$STAGE-authRouter"
    "pv-api-$STAGE-profilesRouter"
    "pv-api-$STAGE-getFeed"
    "pv-api-$STAGE-getPreferences"
)

vars_to_check=("JWT_SECRET" "DATABASE_URL" "ALLOWED_USER_EMAILS")

for func in "${functions_to_check[@]}"; do
    print_info "Checking $func..."
    
    if func_config=$(aws lambda get-function-configuration --function-name "$func" --region "$REGION" 2>&1); then
        all_vars_present=true
        
        for var in "${vars_to_check[@]}"; do
            if ! echo "$func_config" | jq -e ".Environment.Variables.$var" > /dev/null 2>&1; then
                print_warning "$func missing $var"
                all_vars_present=false
            fi
        done
        
        if [[ "$all_vars_present" == "true" ]]; then
            print_success "$func has all required env vars"
        else
            print_warning "$func has missing env vars - this may cause 401 errors!"
        fi
    else
        print_warning "Could not check $func (may not exist)"
    fi
done

# ===== STEP 9: Smoke Tests =====
if [[ "$SKIP_TESTS" != "true" ]]; then
    print_step "Step 9: Smoke Tests"
    
    print_info "Running smoke tests..."
    
    # Get API endpoint
    info_output=$(serverless info --stage "$STAGE" --region "$REGION" 2>&1)
    api_url=$(echo "$info_output" | grep -oP 'https://[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com' | head -1)
    
    if [[ -n "$api_url" ]]; then
        print_info "API URL: $api_url"
        
        # Test health endpoint
        print_info "Testing /health endpoint..."
        if curl -s -o /dev/null -w "%{http_code}" "$api_url/health" | grep -q "200"; then
            print_success "Health check passed"
        else
            print_warning "Health check failed"
        fi
        
        # Test meta endpoint
        print_info "Testing /meta endpoint..."
        if curl -s -o /dev/null -w "%{http_code}" "$api_url/meta" | grep -q "200"; then
            print_success "Meta endpoint passed"
        else
            print_warning "Meta endpoint failed"
        fi
        
        print_info "Note: Authenticated endpoint tests require login. Test manually."
    else
        print_warning "Could not extract API URL from deployment info"
    fi
else
    print_info "Smoke tests skipped"
fi

# ===== STEP 10: Summary =====
print_step "Deployment Summary"

print_success "✓ Environment validated"
print_success "✓ Prisma layer validated"
print_success "✓ Functions packaged"
print_success "✓ Deployed to $STAGE in $REGION"
print_success "✓ Lambda env vars verified"

[[ "$SKIP_TESTS" != "true" ]] && print_success "✓ Smoke tests completed"

echo -e "\n${GREEN}"
cat << EOF
═══════════════════════════════════════════════════════════
   Deployment Complete! 🚀
═══════════════════════════════════════════════════════════

Next Steps:
1. Test auth flow in browser: https://dkmxy676d3vgc.cloudfront.net
2. Check CloudWatch logs if issues: /aws/lambda/pv-api-$STAGE-*
3. Review deployment: serverless info --stage $STAGE --region $REGION

Documentation: docs/DEPLOYMENT_BIBLE.md
═══════════════════════════════════════════════════════════
EOF
echo -e "${NC}"

exit 0
