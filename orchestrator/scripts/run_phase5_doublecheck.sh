#!/usr/bin/env bash
#
# Phase 5 Double-Check (Red-Team) Agent Runner
#
# This script runs the Phase 5 Double-Check Agent to verify primary validation
# results with independent secondary checks.
#
# Usage:
#   ./run_phase5_doublecheck.sh <primary_report.json> [config.json]
#

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default configuration
DEFAULT_CONFIG="${SCRIPT_DIR}/doublecheck_config.json"

# Parse arguments
PRIMARY_REPORT="${1:-}"
CONFIG_FILE="${2:-${DEFAULT_CONFIG}}"

# Validate arguments
if [[ -z "${PRIMARY_REPORT}" ]]; then
    echo -e "${RED}Error: Primary report path is required${NC}"
    echo ""
    echo "Usage: $0 <primary_report.json> [config.json]"
    echo ""
    echo "Example:"
    echo "  $0 ./validation_evidence/validation_report_*.json"
    echo "  $0 ./validation_evidence/validation_report_*.json ./my_config.json"
    exit 1
fi

if [[ ! -f "${PRIMARY_REPORT}" ]]; then
    echo -e "${RED}Error: Primary report not found: ${PRIMARY_REPORT}${NC}"
    exit 1
fi

# Check if config file exists, create from example if not
if [[ ! -f "${CONFIG_FILE}" ]]; then
    if [[ -f "${SCRIPT_DIR}/doublecheck_config.example.json" ]]; then
        echo -e "${YELLOW}Warning: Config file not found, using example${NC}"
        CONFIG_FILE="${SCRIPT_DIR}/doublecheck_config.example.json"
    else
        echo -e "${RED}Error: Config file not found: ${CONFIG_FILE}${NC}"
        echo "Please create a config file based on doublecheck_config.example.json"
        exit 1
    fi
fi

# Banner
echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Phase 5 Double-Check (Red-Team) Agent               ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Display configuration
echo -e "${GREEN}Configuration:${NC}"
echo "  Primary Report: ${PRIMARY_REPORT}"
echo "  Config File:    ${CONFIG_FILE}"
echo ""

# Check prerequisites
echo -e "${GREEN}Checking prerequisites...${NC}"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 is required but not installed${NC}"
    exit 1
fi
echo "  ✓ Python 3 is installed"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${YELLOW}Warning: AWS CLI not found (optional for some checks)${NC}"
else
    echo "  ✓ AWS CLI is installed"
fi

# Check GitHub CLI
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}Warning: GitHub CLI not found (optional for some checks)${NC}"
else
    echo "  ✓ GitHub CLI is installed"
fi

echo ""

# Check environment variables
echo -e "${GREEN}Checking environment variables...${NC}"

if [[ -z "${STAGING_GITHUB_TOKEN:-}" ]]; then
    echo -e "${YELLOW}Warning: STAGING_GITHUB_TOKEN not set${NC}"
else
    echo "  ✓ STAGING_GITHUB_TOKEN is set"
fi

if [[ -z "${AWS_REGION:-}" ]] && [[ -z "${AWS_DEFAULT_REGION:-}" ]]; then
    echo -e "${YELLOW}Warning: AWS_REGION not set (will use config default)${NC}"
else
    echo "  ✓ AWS_REGION is set"
fi

echo ""

# Confirm execution
echo -e "${YELLOW}This script will:${NC}"
echo "  1. Load primary validation report"
echo "  2. Run independent secondary verification checks"
echo "  3. Compare primary and secondary results"
echo "  4. Attempt safe remediation for discrepancies"
echo "  5. Generate double-check matrix and report"
echo ""

read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo -e "${GREEN}Running Phase 5 Double-Check Agent...${NC}"
echo ""

# Create output directory
OUTPUT_DIR="./doublecheck_evidence"
mkdir -p "${OUTPUT_DIR}"

# Run the agent
python3 "${SCRIPT_DIR}/phase5_doublecheck_agent.py" \
    --primary-report "${PRIMARY_REPORT}" \
    --config "${CONFIG_FILE}" \
    --output-dir "${OUTPUT_DIR}"

EXIT_CODE=$?

echo ""
if [[ ${EXIT_CODE} -eq 0 ]]; then
    echo -e "${GREEN}✓ Phase 5 Double-Check completed successfully${NC}"
    echo ""
    echo "Reports generated in: ${OUTPUT_DIR}"
    echo ""
    echo "Next steps:"
    echo "  1. Review the double-check matrix JSON"
    echo "  2. Review the markdown report"
    echo "  3. Address any inconsistencies found"
    echo "  4. Update main validation report if needed"
else
    echo -e "${RED}✗ Phase 5 Double-Check failed${NC}"
    echo ""
    echo "Check the logs above for details"
fi

exit ${EXIT_CODE}
