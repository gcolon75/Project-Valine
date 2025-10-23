#!/bin/bash
# Generate deployment stamp file to force cache-busting on every SAM deploy
# This ensures Lambda gets fresh artifacts instead of reusing cached S3 packages

set -e

# Navigate to the orchestrator directory (script may be run from anywhere)
cd "$(dirname "$0")/.."

# Generate timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Get build ID from GitHub Actions or generate a UUID
BUILD_ID="${GITHUB_RUN_ID:-$(uuidgen 2>/dev/null || echo "local-build")}"

# Get commit SHA from GitHub Actions or git
COMMIT_SHA="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo "unknown")}"

# Create the deploy stamp file inside app/
cat > app/.deploy-stamp << EOF
# Deployment Stamp - Forces cache-busting on SAM deploy
# Generated: ${TIMESTAMP}
Build ID: ${BUILD_ID}
Commit SHA: ${COMMIT_SHA}
EOF

echo "✓ Generated app/.deploy-stamp"
echo "  Timestamp: ${TIMESTAMP}"
echo "  Build ID: ${BUILD_ID}"
echo "  Commit SHA: ${COMMIT_SHA}"
