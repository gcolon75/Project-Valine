#!/bin/bash
# Build Prisma Lambda Layer
# This script creates a fresh Prisma layer with the Linux binary for AWS Lambda
#
# Usage: ./scripts/build-prisma-layer.sh

set -e

echo "========================================="
echo "Building Prisma Lambda Layer"
echo "========================================="

# Get the absolute path to the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVERLESS_DIR="${SCRIPT_DIR}/.."
LAYER_DIR="${SERVERLESS_DIR}/layers"
BUILD_DIR="${SERVERLESS_DIR}/.layer-build"

# Clean up any existing build
echo ""
echo "Cleaning up previous build artifacts..."
rm -rf "${BUILD_DIR}"
rm -rf "${LAYER_DIR}/nodejs"
rm -f "${LAYER_DIR}/prisma-layer.zip}"
mkdir -p "${BUILD_DIR}/nodejs/node_modules"

# Generate Prisma client in the serverless directory with Lambda binaries
echo ""
echo "Generating Prisma client with Lambda binaries..."
cd "${SERVERLESS_DIR}"

# Ensure prisma is installed
if [ ! -f "node_modules/.bin/prisma" ]; then
    echo "Installing dependencies in serverless/..."
    npm ci
fi

# Generate the client with both native (for local dev) and rhel (for Lambda) binaries
npx prisma generate --schema=prisma/schema.prisma

# Copy only the necessary Prisma client files to the layer build directory
echo ""
echo "Copying Prisma client to layer build directory..."
mkdir -p "${BUILD_DIR}/nodejs/node_modules/.prisma/client"
mkdir -p "${BUILD_DIR}/nodejs/node_modules/@prisma/client"

# Copy generated client (only what's needed for Lambda)
cp -r node_modules/.prisma/client/*.js "${BUILD_DIR}/nodejs/node_modules/.prisma/client/" 2>/dev/null || true
cp -r node_modules/.prisma/client/*.d.ts "${BUILD_DIR}/nodejs/node_modules/.prisma/client/" 2>/dev/null || true
cp -r node_modules/.prisma/client/package.json "${BUILD_DIR}/nodejs/node_modules/.prisma/client/" 2>/dev/null || true
cp -r node_modules/.prisma/client/schema.prisma "${BUILD_DIR}/nodejs/node_modules/.prisma/client/" 2>/dev/null || true
cp -r node_modules/.prisma/client/default.js "${BUILD_DIR}/nodejs/node_modules/.prisma/client/" 2>/dev/null || true
cp -r node_modules/.prisma/client/runtime "${BUILD_DIR}/nodejs/node_modules/.prisma/client/" 2>/dev/null || true

# Copy ONLY the Lambda binary (rhel)
echo "Copying Lambda binary (rhel-openssl-3.0.x)..."
cp node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node \
   "${BUILD_DIR}/nodejs/node_modules/.prisma/client/"

# Copy @prisma/client runtime (excluding WASM and extra engines)
echo "Copying @prisma/client runtime..."
cp node_modules/@prisma/client/package.json "${BUILD_DIR}/nodejs/node_modules/@prisma/client/"
cp node_modules/@prisma/client/*.js "${BUILD_DIR}/nodejs/node_modules/@prisma/client/" 2>/dev/null || true
cp node_modules/@prisma/client/*.d.ts "${BUILD_DIR}/nodejs/node_modules/@prisma/client/" 2>/dev/null || true
cp node_modules/@prisma/client/LICENSE "${BUILD_DIR}/nodejs/node_modules/@prisma/client/" 2>/dev/null || true
cp node_modules/@prisma/client/README.md "${BUILD_DIR}/nodejs/node_modules/@prisma/client/" 2>/dev/null || true
cp -r node_modules/@prisma/client/runtime "${BUILD_DIR}/nodejs/node_modules/@prisma/client/" 2>/dev/null || true

# Remove any WASM files that might have slipped through
find "${BUILD_DIR}/nodejs/node_modules/@prisma/client/runtime" -name "*wasm*" -delete 2>/dev/null || true
find "${BUILD_DIR}/nodejs/node_modules/.prisma/client/runtime" -name "*wasm*" -delete 2>/dev/null || true

echo "✓ Layer optimized - only Lambda runtime (rhel) binary included"

# Verify the Lambda binary is present
echo ""
echo "Verifying Lambda binary is present..."
if [ -f "${BUILD_DIR}/nodejs/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node" ]; then
    echo "✓ Lambda binary found: libquery_engine-rhel-openssl-3.0.x.so.node"
    BINARY_SIZE=$(du -h "${BUILD_DIR}/nodejs/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node" | cut -f1)
    echo "  Size: ${BINARY_SIZE}"
else
    echo "✗ ERROR: Lambda binary not found!"
    echo "  Expected: ${BUILD_DIR}/nodejs/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node"
    exit 1
fi

# Create the layer zip file
echo ""
echo "Creating layer zip file..."
mkdir -p "${LAYER_DIR}"
cd "${BUILD_DIR}"
zip -r -q "${LAYER_DIR}/prisma-layer.zip" nodejs/

# Get the zip file size
ZIP_SIZE=$(du -h "${LAYER_DIR}/prisma-layer.zip" | cut -f1)

echo ""
echo "========================================="
echo "✓ Prisma layer built successfully!"
echo "========================================="
echo "Layer location: ${LAYER_DIR}/prisma-layer.zip"
echo "Layer size: ${ZIP_SIZE}"
echo ""
echo "The layer includes:"
echo "  - @prisma/client (JS client library)"
echo "  - .prisma/client (generated client)"
echo "  - libquery_engine-rhel-openssl-3.0.x.so.node (Lambda runtime binary)"
echo ""
echo "⚠  Note: This file is NOT committed to git (it's ${ZIP_SIZE})"
echo "   It's excluded via .gitignore and must be rebuilt before deployment"
echo ""
echo "Next steps:"
echo "  1. Deploy with: npx serverless deploy --stage prod --region us-west-2"
echo "  2. The layer is automatically included via serverless.yml"
echo ""

# Clean up build directory
rm -rf "${BUILD_DIR}"