#!/usr/bin/env bash
# Project Valine Backend Deployment Script (Unix/Linux/macOS)
#
# This script performs a safe, retryable deployment of the backend serverless
# functions with proper error handling.
#
# Features:
# - Node version verification
# - Automatic dependency installation
# - Preflight checks with serverless info
# - Retry logic for transient failures
# - Post-deployment environment audit
#
# Usage:
#   ./deploy-backend.sh [OPTIONS]
#
# Options:
#   --max-retries N    Maximum deployment retry attempts (default: 2)
#   --skip-audit       Skip post-deployment environment audit
#   --help             Show this help message

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Configuration
MAX_RETRIES=2
SKIP_AUDIT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --max-retries)
            MAX_RETRIES="$2"
            shift 2
            ;;
        --skip-audit)
            SKIP_AUDIT=true
            shift
            ;;
        --help)
            sed -n '2,/^$/p' "$0" | sed 's/^# //' | sed 's/^#//'
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVERLESS_DIR="$PROJECT_ROOT/serverless"

echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Project Valine Backend Deployment (Unix)${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Verify Node.js version
echo -e "${YELLOW}[1/6] Verifying Node.js version...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18 or higher.${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
MAJOR_VERSION=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')

echo -e "${GREEN}✓ Node.js version: $NODE_VERSION${NC}"

if [ "$MAJOR_VERSION" -lt 18 ]; then
    echo -e "${RED}✗ Node.js 18 or higher required. Found: $NODE_VERSION${NC}"
    exit 1
fi

# Step 2: Navigate to serverless directory
echo -e "${YELLOW}[2/6] Navigating to serverless directory...${NC}"
if [ ! -d "$SERVERLESS_DIR" ]; then
    echo -e "${RED}✗ Serverless directory not found: $SERVERLESS_DIR${NC}"
    exit 1
fi
cd "$SERVERLESS_DIR"
echo -e "${GREEN}✓ Changed directory to: $SERVERLESS_DIR${NC}"

# Step 3: Install dependencies if missing
echo -e "${YELLOW}[3/6] Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}  Installing dependencies (npm ci)...${NC}"
    if npm ci; then
        echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
    else
        echo -e "${YELLOW}  npm ci failed, trying npm install...${NC}"
        npm install
        echo -e "${GREEN}✓ Dependencies installed via npm install${NC}"
    fi
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Step 4: Preflight check with serverless info
echo -e "${YELLOW}[4/6] Running preflight check...${NC}"
if npx serverless info &> /tmp/sls-info.log; then
    echo -e "${GREEN}✓ Serverless preflight check passed${NC}"
    echo -e "${GRAY}  Current deployment info:${NC}"
    cat /tmp/sls-info.log | sed 's/^/  /' | sed "s/^/${GRAY}/" | sed "s/$/${NC}/"
else
    echo -e "${YELLOW}⚠ Preflight check failed (might be first deployment)${NC}"
fi

# Step 5: Deploy with retry logic
echo -e "${YELLOW}[5/6] Deploying serverless functions...${NC}"
deploy_success=false
attempt=0

while [ "$deploy_success" = false ] && [ "$attempt" -le "$MAX_RETRIES" ]; do
    attempt=$((attempt + 1))
    
    if [ "$attempt" -gt 1 ]; then
        echo -e "${CYAN}  Retry attempt $attempt of $MAX_RETRIES...${NC}"
        sleep 5
    fi
    
    echo -e "${CYAN}  Executing: npx serverless deploy${NC}"
    
    if npx serverless deploy --verbose; then
        deploy_success=true
        echo -e "${GREEN}✓ Deployment successful!${NC}"
    else
        exit_code=$?
        
        # Check for retryable conditions
        if [ "$attempt" -le "$MAX_RETRIES" ]; then
            echo -e "${YELLOW}  Deployment failed with exit code $exit_code. Will retry...${NC}"
        else
            echo -e "${RED}✗ Max retries exceeded. Deployment failed.${NC}"
            exit 1
        fi
    fi
done

# Step 6: Post-deployment audit
if [ "$SKIP_AUDIT" = false ]; then
    echo -e "${YELLOW}[6/6] Running post-deployment environment audit...${NC}"
    AUDIT_SCRIPT="$SCRIPT_DIR/audit-allowlist.ps1"
    
    if [ -f "$AUDIT_SCRIPT" ]; then
        if command -v pwsh &> /dev/null; then
            if pwsh "$AUDIT_SCRIPT"; then
                : # Success
            else
                echo -e "${YELLOW}⚠ Audit script failed${NC}"
                echo -e "${YELLOW}  You can run it manually: pwsh $AUDIT_SCRIPT${NC}"
            fi
        else
            echo -e "${YELLOW}⚠ PowerShell not found. Skipping audit.${NC}"
            echo -e "${YELLOW}  Install PowerShell or run audit manually: $AUDIT_SCRIPT${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Audit script not found at: $AUDIT_SCRIPT${NC}"
        echo -e "${YELLOW}  Skipping environment variable audit.${NC}"
    fi
else
    echo -e "${YELLOW}[6/6] Skipping post-deployment audit (--skip-audit flag set)${NC}"
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo -e "${GRAY}  1. Verify health endpoint: curl https://your-api/health${NC}"
echo -e "${GRAY}  2. Check allowlist fields in health response${NC}"
echo -e "${GRAY}  3. Test registration with allowed/blocked emails${NC}"
echo ""
