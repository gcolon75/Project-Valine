#!/bin/bash
# Comprehensive fix script for Discord slash commands in staging
# This script orchestrates the complete fix process

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Discord Slash Commands Fix for Staging                  ║"
echo "║   Project Valine                                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the orchestrator directory
if [ ! -f "app/handlers/discord_handler.py" ]; then
    print_error "Please run this script from the orchestrator directory"
    echo "  cd orchestrator && ./fix_staging_slash_commands.sh"
    exit 1
fi

echo "This script will:"
echo "  1. Validate bot credentials and guild membership"
echo "  2. Register missing slash commands (guild-based, instant visibility)"
echo "  3. Verify /debug-last command registration"
echo "  4. Check AWS SSM parameters"
echo "  5. Generate validation evidence"
echo ""

# Prompt for credentials
print_info "Step 1: Gathering credentials"
echo ""
read -p "Enter Discord Application ID (STAGING_DISCORD_APPLICATION_ID): " APP_ID
read -s -p "Enter Discord Bot Token (STAGING_DISCORD_BOT_TOKEN): " BOT_TOKEN
echo ""
read -p "Enter Staging Guild (Server) ID: " GUILD_ID
echo ""

if [ -z "$APP_ID" ] || [ -z "$BOT_TOKEN" ] || [ -z "$GUILD_ID" ]; then
    print_error "All fields are required"
    exit 1
fi

# Check if Python and requests are available
print_info "Step 2: Checking dependencies"
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    print_error "Python 3 is required but not found"
    exit 1
fi

# Determine python command
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

# Check if requests library is available
if ! $PYTHON_CMD -c "import requests" 2>/dev/null; then
    print_warning "requests library not found, installing..."
    pip install requests || {
        print_error "Failed to install requests library"
        exit 1
    }
fi

print_success "Dependencies OK"
echo ""

# Run validation script
print_info "Step 3: Running validation and registration"
echo ""

cd scripts

$PYTHON_CMD validate_discord_slash_commands.py full \
    --app-id "$APP_ID" \
    --bot-token "$BOT_TOKEN" \
    --guild-id "$GUILD_ID" \
    --register || {
    print_error "Validation failed. Check output above for details."
    exit 1
}

echo ""
print_success "Commands registered successfully!"
echo ""

# Check AWS SSM parameters if AWS CLI is available
if command -v aws &> /dev/null; then
    print_info "Step 4: Checking AWS SSM parameters"
    echo ""
    
    AWS_REGION="us-west-2"
    
    # Check ENABLE_DEBUG_CMD
    DEBUG_CMD=$(aws ssm get-parameter --name "/valine/staging/ENABLE_DEBUG_CMD" --region $AWS_REGION --query "Parameter.Value" --output text 2>/dev/null || echo "NOT_SET")
    
    if [ "$DEBUG_CMD" = "true" ]; then
        print_success "ENABLE_DEBUG_CMD = true"
    elif [ "$DEBUG_CMD" = "NOT_SET" ]; then
        print_warning "ENABLE_DEBUG_CMD not set"
        echo "  To enable: aws ssm put-parameter --name '/valine/staging/ENABLE_DEBUG_CMD' --value 'true' --type String --overwrite --region us-west-2"
    else
        print_warning "ENABLE_DEBUG_CMD = $DEBUG_CMD (should be 'true')"
        echo "  To enable: aws ssm put-parameter --name '/valine/staging/ENABLE_DEBUG_CMD' --value 'true' --type String --overwrite --region us-west-2"
    fi
    
    # Check ENABLE_ALERTS
    ALERTS=$(aws ssm get-parameter --name "/valine/staging/ENABLE_ALERTS" --region $AWS_REGION --query "Parameter.Value" --output text 2>/dev/null || echo "NOT_SET")
    
    if [ "$ALERTS" = "false" ]; then
        print_success "ENABLE_ALERTS = false (safe default)"
    elif [ "$ALERTS" = "NOT_SET" ]; then
        print_success "ENABLE_ALERTS not set (will default to false)"
    else
        print_warning "ENABLE_ALERTS = $ALERTS"
    fi
    
    # Check ALERT_CHANNEL_ID
    ALERT_CH=$(aws ssm get-parameter --name "/valine/staging/ALERT_CHANNEL_ID" --region $AWS_REGION --query "Parameter.Value" --output text 2>/dev/null || echo "NOT_SET")
    
    if [ "$ALERT_CH" = "1428102811832553554" ]; then
        print_success "ALERT_CHANNEL_ID = 1428102811832553554"
    elif [ "$ALERT_CH" = "NOT_SET" ]; then
        print_warning "ALERT_CHANNEL_ID not set"
        echo "  To set: aws ssm put-parameter --name '/valine/staging/ALERT_CHANNEL_ID' --value '1428102811832553554' --type String --overwrite --region us-west-2"
    else
        print_info "ALERT_CHANNEL_ID = $ALERT_CH"
    fi
    
    echo ""
else
    print_warning "AWS CLI not found, skipping SSM parameter checks"
    echo ""
fi

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   ✅ Fix Complete!                                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
print_info "Next Steps:"
echo ""
echo "1. Go to your Discord staging server"
echo "2. Type /debug-last (should appear in autocomplete)"
echo "3. Execute the command and verify:"
echo "   • Response is ephemeral (only you see it)"
echo "   • Secrets are redacted (***abcd format)"
echo "   • Shows trace ID, command, duration, steps"
echo ""
echo "4. If /debug-last returns 'disabled', enable it:"
echo "   aws ssm put-parameter --name '/valine/staging/ENABLE_DEBUG_CMD' \\"
echo "     --value 'true' --type String --overwrite --region us-west-2"
echo ""
echo "5. Validation evidence saved in: ./validation_evidence/"
echo ""
print_info "For troubleshooting, see: ../SLASH_COMMANDS_FIX_GUIDE.md"
echo ""
