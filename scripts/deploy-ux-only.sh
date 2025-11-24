#!/bin/bash
set -e

echo "========================================="
echo "UX-Only Deployment (Frontend Changes)"
echo "========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
error() {
  echo -e "${RED}❌ Error: $1${NC}"
  exit 1
}

warn() {
  echo -e "${YELLOW}⚠️  Warning: $1${NC}"
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

# Validate required environment variables
echo ""
echo "🔍 Validating environment..."

# Check VITE_API_BASE
if [ -z "$VITE_API_BASE" ]; then
  error "VITE_API_BASE not set"
fi
echo "   VITE_API_BASE: $VITE_API_BASE"

# Security check: Dev bypass must be disabled
if [ "$VITE_DEV_BYPASS_AUTH" = "true" ]; then
  error "VITE_DEV_BYPASS_AUTH cannot be enabled in production"
fi
if [ "$VITE_ENABLE_DEV_BYPASS" = "true" ]; then
  error "VITE_ENABLE_DEV_BYPASS cannot be enabled in production"
fi
success "Dev bypass is disabled"

# Check S3 bucket
if [ -z "$S3_BUCKET" ]; then
  error "S3_BUCKET not set"
fi
echo "   S3_BUCKET: $S3_BUCKET"

# Check CloudFront distribution
if [ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
  error "CLOUDFRONT_DISTRIBUTION_ID not set"
fi
echo "   CLOUDFRONT_DISTRIBUTION_ID: $CLOUDFRONT_DISTRIBUTION_ID"

# Check AWS credentials
if ! aws sts get-caller-identity > /dev/null 2>&1; then
  error "AWS credentials not configured or invalid"
fi
success "AWS credentials valid"

echo ""
echo "========================================="
echo "📦 Building frontend..."
echo "========================================="

# Set production mode
export NODE_ENV=production
export ALLOW_API_BASE_DNS_FAILURE=true

# Run build
npm run build

if [ $? -ne 0 ]; then
  error "Build failed"
fi
success "Build completed"

# Verify dist directory exists
if [ ! -d "dist" ]; then
  error "dist directory not found after build"
fi

# Check for index.html
if [ ! -f "dist/index.html" ]; then
  error "dist/index.html not found"
fi

echo ""
echo "========================================="
echo "☁️  Uploading to S3..."
echo "========================================="

# Upload all assets with caching (except HTML)
echo "Uploading static assets..."
aws s3 sync dist s3://$S3_BUCKET \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html" \
  --exclude "*.json" \
  --exclude "robots.txt" \
  --exclude "sitemap.xml"

# Upload HTML files without caching
echo "Uploading HTML files..."
aws s3 sync dist s3://$S3_BUCKET \
  --exclude "*" \
  --include "*.html" \
  --cache-control "no-cache, no-store, must-revalidate"

# Upload manifest/config files with short cache
echo "Uploading config files..."
aws s3 sync dist s3://$S3_BUCKET \
  --exclude "*" \
  --include "*.json" \
  --include "robots.txt" \
  --include "sitemap.xml" \
  --cache-control "public, max-age=300"

success "Upload completed"

echo ""
echo "========================================="
echo "🔄 Invalidating CloudFront cache..."
echo "========================================="

# Create invalidation
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "   Invalidation ID: $INVALIDATION_ID"

# Wait for invalidation to complete (optional, can be skipped)
echo "   Waiting for invalidation to complete..."
aws cloudfront wait invalidation-completed \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --id $INVALIDATION_ID 2>/dev/null || warn "Invalidation still in progress"

success "Cache invalidation complete"

echo ""
echo "========================================="
echo "✅ UX deployment complete!"
echo "========================================="
echo ""
echo "Deployment summary:"
echo "  - S3 Bucket: $S3_BUCKET"
echo "  - CloudFront: $CLOUDFRONT_DISTRIBUTION_ID"
echo "  - API Base: $VITE_API_BASE"
echo ""
echo "Post-deployment verification:"
echo "  1. Visit your site in incognito mode"
echo "  2. Check browser console for errors"
echo "  3. Test login flow"
echo "  4. Verify mobile responsiveness"
echo ""
echo "If issues occur, rollback with:"
echo "  git checkout PREVIOUS_COMMIT"
echo "  ./scripts/deploy-ux-only.sh"
echo ""
