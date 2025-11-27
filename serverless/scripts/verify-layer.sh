#!/bin/bash
set -e

FUNCTION_NAME="${1:-pv-api-prod-authStatus}"
REGION="${2:-us-west-2}"

echo "Verifying Prisma layer for function: $FUNCTION_NAME"

# Check if layer is attached
LAYERS=$(aws lambda get-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --query 'Layers[*].Arn' \
  --output text)

if [ -z "$LAYERS" ]; then
  echo "❌ No layers attached to function"
  exit 1
fi

echo "✓ Layers attached:"
echo "$LAYERS"

# Get the absolute path to the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVERLESS_DIR="${SCRIPT_DIR}/.."
LAYER_DIR="${SERVERLESS_DIR}/layers"

# Check if layer zip exists locally
if [ ! -f "${LAYER_DIR}/prisma-layer.zip" ]; then
  echo "❌ Layer artifact not found: ${LAYER_DIR}/prisma-layer.zip"
  echo "Run: npm run build:layer"
  exit 1
fi

echo "✓ Local layer artifact exists"
echo "✓ Size: $(du -h "${LAYER_DIR}/prisma-layer.zip" | cut -f1)"

# Check layer contents
echo ""
echo "Layer contents:"
unzip -l "${LAYER_DIR}/prisma-layer.zip" | grep -E "(prisma|\.node)" | head -20

echo ""
echo "✓ Verification complete"
