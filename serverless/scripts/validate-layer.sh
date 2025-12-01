#!/bin/bash
# Validate Prisma Lambda Layer before deployment
# Usage: ./scripts/validate-layer.sh [path/to/prisma-layer.zip]
# 
# This script verifies that the layer zip contains:
# - .prisma/client/default/ directory (required by newer Prisma versions)
# - libquery_engine-rhel-openssl-3.0.x.so.node (Lambda runtime binary)
#
# Call this optionally before `serverless deploy` to catch issues early.

set -e

# Get the absolute path to the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVERLESS_DIR="${SCRIPT_DIR}/.."
LAYER_ZIP="${1:-${SERVERLESS_DIR}/layers/prisma-layer.zip}"

echo "========================================="
echo "Validating Prisma Lambda Layer"
echo "========================================="

# Check if zip exists
if [ ! -f "$LAYER_ZIP" ]; then
  echo "❌ Layer zip not found: $LAYER_ZIP"
  echo "Run: npm run build:layer or ./scripts/build-prisma-layer.sh"
  exit 1
fi

echo "✓ Layer zip exists: $LAYER_ZIP"
echo "  Size: $(du -h "$LAYER_ZIP" | cut -f1)"

# Check for .prisma/client/default directory
echo ""
echo "Checking for .prisma/client/default..."
if unzip -l "$LAYER_ZIP" | grep -q "\.prisma/client/default/"; then
  echo "✓ .prisma/client/default/ directory found"
  
  # List files in default directory
  echo "  Contents:"
  unzip -l "$LAYER_ZIP" | grep "\.prisma/client/default/" | head -10
else
  echo "❌ MISSING: .prisma/client/default/ directory not found in layer"
  echo ""
  echo "This is required by newer Prisma versions. The layer will fail with:"
  echo "  Error: Cannot find module '.prisma/client/default'"
  echo ""
  echo "Rebuild the layer with the updated build script:"
  echo "  powershell -ExecutionPolicy Bypass -File scripts/build-prisma-layer.ps1"
  exit 1
fi

# Check for Lambda binary
echo ""
echo "Checking for Lambda query engine binary..."
if unzip -l "$LAYER_ZIP" | grep -q "libquery_engine-rhel-openssl-3.0.x.so.node"; then
  echo "✓ libquery_engine-rhel-openssl-3.0.x.so.node found"
  
  # Show binary location
  echo "  Location:"
  unzip -l "$LAYER_ZIP" | grep "libquery_engine-rhel-openssl-3.0.x.so.node"
else
  echo "❌ MISSING: libquery_engine-rhel-openssl-3.0.x.so.node not found"
  echo ""
  echo "This binary is required for Prisma to work on AWS Lambda (Amazon Linux 2)."
  echo "Ensure schema.prisma has the correct binaryTargets:"
  echo '  binaryTargets = ["native", "rhel-openssl-3.0.x"]'
  echo ""
  echo "Then regenerate and rebuild:"
  echo "  npx prisma generate --schema=prisma/schema.prisma"
  echo "  powershell -ExecutionPolicy Bypass -File scripts/build-prisma-layer.ps1"
  exit 1
fi

# Check for @prisma/client
echo ""
echo "Checking for @prisma/client runtime..."
if unzip -l "$LAYER_ZIP" | grep -q "@prisma/client"; then
  echo "✓ @prisma/client runtime found"
else
  echo "❌ MISSING: @prisma/client directory not found"
  exit 1
fi

echo ""
echo "========================================="
echo "✓ Layer validation PASSED"
echo "========================================="
echo ""
echo "Layer is ready for deployment. Run:"
echo "  npx serverless deploy --stage prod --region us-west-2"
