#!/bin/bash
# Deployment script for Project Valine Orchestrator

set -e

echo "🚀 Project Valine Orchestrator Deployment Script"
echo "================================================"
echo ""

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo "❌ AWS SAM CLI is not installed."
    echo "Please install it: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials are not configured."
    echo "Please configure AWS CLI: aws configure"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Check if samconfig.toml exists
if [ ! -f "samconfig.toml" ]; then
    echo "⚠️  samconfig.toml not found"
    echo "Please configure samconfig.toml with your secrets before deploying"
    echo "See .env.example for required configuration"
    exit 1
fi

# Prompt for deployment stage
read -p "Enter deployment stage (dev/prod) [dev]: " STAGE
STAGE=${STAGE:-dev}

echo ""
echo "📦 Building SAM application..."
sam build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "✅ Build successful"
echo ""

# Deploy based on stage
if [ "$STAGE" = "prod" ]; then
    echo "🚀 Deploying to production..."
    sam deploy --config-env prod
else
    echo "🚀 Deploying to development..."
    sam deploy
fi

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo ""

# Get stack outputs
echo "📊 Stack Outputs:"
aws cloudformation describe-stacks \
    --stack-name valine-orchestrator \
    --query 'Stacks[0].Outputs' \
    --output table

echo ""
echo "📋 Next Steps:"
echo "1. Copy the DiscordWebhookUrl and set it as your Discord Interactions Endpoint"
echo "2. Copy the GitHubWebhookUrl and configure it in your GitHub repository webhook settings"
echo "3. Register Discord slash commands (see INTEGRATION_GUIDE.md)"
echo "4. Test the integration by creating an issue with the 'ready' label"
echo ""
echo "📚 For detailed instructions, see:"
echo "   - README.md"
echo "   - INTEGRATION_GUIDE.md"
echo ""
