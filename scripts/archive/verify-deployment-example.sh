#!/usr/bin/env bash
# Example script demonstrating how to use verify-deployment.sh
# This shows different usage scenarios

set -e

# Colors for output
BLUE='\033[0;34m'
NC='\033[0m'

print_example() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Example $1: $2${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERIFY_SCRIPT="$SCRIPT_DIR/verify-deployment.sh"

if [ ! -f "$VERIFY_SCRIPT" ]; then
  echo "Error: verify-deployment.sh not found at $VERIFY_SCRIPT"
  exit 1
fi

print_example "1" "Verify GitHub repository structure only (no credentials needed)"
echo "Command:"
echo "  $VERIFY_SCRIPT --skip-aws --skip-discord"
echo ""
echo "This will check:"
echo "  • Workflow file exists"
echo "  • .env.example files are properly configured"
echo ""
read -p "Press Enter to run this example..."
echo ""
"$VERIFY_SCRIPT" --skip-aws --skip-discord
echo ""
read -p "Press Enter to continue to the next example..."

print_example "2" "Verify frontend and API only (no AWS credentials)"
echo "Command:"
echo "  $VERIFY_SCRIPT \\"
echo "    --frontend-url YOUR_CLOUDFRONT_DOMAIN \\"
echo "    --api-base YOUR_API_URL \\"
echo "    --skip-aws \\"
echo "    --skip-discord"
echo ""
echo "This example will use placeholder URLs to demonstrate the checks."
echo "Replace with your actual URLs to test your deployment."
echo ""
read -p "Press Enter to run this example with placeholder URLs..."
echo ""
"$VERIFY_SCRIPT" \
  --frontend-url "d1234567890.cloudfront.net" \
  --api-base "https://example123.execute-api.us-west-2.amazonaws.com" \
  --skip-aws \
  --skip-discord || true
echo ""
read -p "Press Enter to continue to the next example..."

print_example "3" "Verify everything with AWS credentials"
echo "Command:"
echo "  $VERIFY_SCRIPT \\"
echo "    --s3-bucket YOUR_S3_BUCKET \\"
echo "    --cloudfront-id YOUR_DISTRIBUTION_ID \\"
echo "    --api-base YOUR_API_URL \\"
echo "    --discord-webhook-url YOUR_WEBHOOK_URL \\"
echo "    --discord-bot-token YOUR_BOT_TOKEN \\"
echo "    --discord-channel-id YOUR_CHANNEL_ID"
echo ""
echo "This example requires:"
echo "  • AWS credentials configured (aws configure)"
echo "  • Valid S3 bucket name"
echo "  • Valid CloudFront distribution ID"
echo "  • Valid Discord webhook URL"
echo "  • Valid Discord bot token"
echo "  • Valid Discord channel ID"
echo ""
echo "⚠ This example is skipped because it requires real credentials."
echo "   Use the command above with your actual values to run a full verification."
echo ""
read -p "Press Enter to continue to the next example..."

print_example "4" "Verify Discord integration only"
echo "Command:"
echo "  $VERIFY_SCRIPT \\"
echo "    --discord-webhook-url 'https://discord.com/api/webhooks/123/abc' \\"
echo "    --discord-bot-token 'YOUR_TOKEN' \\"
echo "    --discord-channel-id '1234567890' \\"
echo "    --skip-aws"
echo ""
echo "This example will test Discord webhook and bot functionality."
echo "⚠ Skipped because it requires real Discord credentials."
echo ""
read -p "Press Enter to continue to the next example..."

print_example "5" "Using environment variables"
echo "You can also use environment variables instead of command-line arguments:"
echo ""
echo "export FRONTEND_URL='your-cloudfront-domain.cloudfront.net'"
echo "export API_BASE='https://your-api.execute-api.us-west-2.amazonaws.com'"
echo "export S3_BUCKET='your-s3-bucket'"
echo "export CLOUDFRONT_ID='E1234567890ABC'"
echo "export DISCORD_WEBHOOK_URL='https://discord.com/api/webhooks/...'"
echo "export DISCORD_BOT_TOKEN='your-bot-token'"
echo "export DISCORD_CHANNEL_ID='1234567890'"
echo ""
echo "Then run: $VERIFY_SCRIPT"
echo ""
echo "⚠ This example demonstrates the concept only."
echo ""
read -p "Press Enter to continue..."

print_example "6" "Integration with CI/CD"
echo "Add to your .github/workflows/client-deploy.yml:"
echo ""
echo "jobs:"
echo "  deploy:"
echo "    steps:"
echo "      # ... your deployment steps ..."
echo ""
echo "      - name: Verify Deployment"
echo "        run: |"
echo "          ./scripts/verify-deployment.sh \\"
echo "            --s3-bucket \${{ secrets.S3_BUCKET }} \\"
echo "            --cloudfront-id \${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \\"
echo "            --api-base \${{ secrets.VITE_API_BASE }} \\"
echo "            --discord-webhook-url \${{ secrets.DISCORD_DEPLOY_WEBHOOK }}"
echo ""
echo "      - name: Notify on Failure"
echo "        if: failure()"
echo "        run: |"
echo "          # Send notification"
echo ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Examples complete!"
echo ""
echo "For more information, see scripts/VERIFICATION_GUIDE.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
