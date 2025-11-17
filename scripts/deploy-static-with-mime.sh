#!/bin/bash

##############################################################################
# Deploy static assets to S3 with correct MIME types and CloudFront invalidation
#
# Usage:
#   ./scripts/deploy-static-with-mime.sh [s3-bucket-name] [cloudfront-distribution-id]
#
# Environment Variables (optional):
#   S3_BUCKET - S3 bucket name for static assets
#   CLOUDFRONT_DISTRIBUTION_ID - CloudFront distribution ID
#   AWS_PROFILE - AWS CLI profile to use
#
# Example:
#   S3_BUCKET=my-frontend-bucket CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC ./scripts/deploy-static-with-mime.sh
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get parameters
S3_BUCKET="${1:-${S3_BUCKET}}"
CLOUDFRONT_DISTRIBUTION_ID="${2:-${CLOUDFRONT_DISTRIBUTION_ID}}"
DIST_DIR="dist"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Static Asset Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Validate required parameters
if [ -z "$S3_BUCKET" ]; then
  echo -e "${RED}Error: S3 bucket name is required${NC}"
  echo "Usage: $0 <s3-bucket-name> [cloudfront-distribution-id]"
  echo "   or: S3_BUCKET=<bucket> CLOUDFRONT_DISTRIBUTION_ID=<id> $0"
  exit 1
fi

if [ ! -d "$DIST_DIR" ]; then
  echo -e "${RED}Error: dist directory not found. Run 'npm run build' first.${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} S3 Bucket: ${S3_BUCKET}"
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
  echo -e "${GREEN}✓${NC} CloudFront Distribution: ${CLOUDFRONT_DISTRIBUTION_ID}"
else
  echo -e "${YELLOW}⚠${NC}  No CloudFront distribution ID provided (invalidation will be skipped)"
fi
echo ""

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo -e "${RED}Error: AWS CLI is not installed${NC}"
  echo "Install it from: https://aws.amazon.com/cli/"
  exit 1
fi

# Set AWS profile if provided
if [ -n "$AWS_PROFILE" ]; then
  echo -e "${GREEN}✓${NC} Using AWS profile: ${AWS_PROFILE}"
  export AWS_PROFILE
fi

echo -e "\n${GREEN}Step 1: Uploading index.html with no-cache header${NC}"
aws s3 cp "${DIST_DIR}/index.html" "s3://${S3_BUCKET}/index.html" \
  --content-type "text/html; charset=utf-8" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --metadata-directive REPLACE

echo -e "${GREEN}Step 2: Uploading JavaScript files with immutable cache${NC}"
find "${DIST_DIR}" -name "*.js" -type f | while read file; do
  relative_path="${file#${DIST_DIR}/}"
  echo "  Uploading: ${relative_path}"
  aws s3 cp "${file}" "s3://${S3_BUCKET}/${relative_path}" \
    --content-type "application/javascript; charset=utf-8" \
    --cache-control "public, max-age=31536000, immutable" \
    --metadata-directive REPLACE
done

echo -e "${GREEN}Step 3: Uploading source maps${NC}"
find "${DIST_DIR}" -name "*.js.map" -type f | while read file; do
  relative_path="${file#${DIST_DIR}/}"
  echo "  Uploading: ${relative_path}"
  aws s3 cp "${file}" "s3://${S3_BUCKET}/${relative_path}" \
    --content-type "application/json" \
    --cache-control "public, max-age=31536000, immutable" \
    --metadata-directive REPLACE
done

echo -e "${GREEN}Step 4: Uploading CSS files with immutable cache${NC}"
find "${DIST_DIR}" -name "*.css" -type f | while read file; do
  relative_path="${file#${DIST_DIR}/}"
  echo "  Uploading: ${relative_path}"
  aws s3 cp "${file}" "s3://${S3_BUCKET}/${relative_path}" \
    --content-type "text/css; charset=utf-8" \
    --cache-control "public, max-age=31536000, immutable" \
    --metadata-directive REPLACE
done

echo -e "${GREEN}Step 5: Uploading images and other assets${NC}"
# PNG files
find "${DIST_DIR}" -name "*.png" -type f | while read file; do
  relative_path="${file#${DIST_DIR}/}"
  aws s3 cp "${file}" "s3://${S3_BUCKET}/${relative_path}" \
    --content-type "image/png" \
    --cache-control "public, max-age=31536000" \
    --metadata-directive REPLACE
done

# SVG files
find "${DIST_DIR}" -name "*.svg" -type f | while read file; do
  relative_path="${file#${DIST_DIR}/}"
  aws s3 cp "${file}" "s3://${S3_BUCKET}/${relative_path}" \
    --content-type "image/svg+xml" \
    --cache-control "public, max-age=31536000" \
    --metadata-directive REPLACE
done

# JSON files (manifest, etc.)
find "${DIST_DIR}" -name "*.json" -type f | while read file; do
  relative_path="${file#${DIST_DIR}/}"
  aws s3 cp "${file}" "s3://${S3_BUCKET}/${relative_path}" \
    --content-type "application/json; charset=utf-8" \
    --cache-control "public, max-age=86400" \
    --metadata-directive REPLACE
done

echo -e "${GREEN}Step 6: Uploading remaining files${NC}"
# Upload everything else that wasn't already uploaded
aws s3 sync "${DIST_DIR}" "s3://${S3_BUCKET}/" \
  --exclude "*.js" \
  --exclude "*.js.map" \
  --exclude "*.css" \
  --exclude "*.png" \
  --exclude "*.svg" \
  --exclude "*.json" \
  --exclude "index.html" \
  --delete

# CloudFront invalidation
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
  echo -e "\n${GREEN}Step 7: Creating CloudFront invalidation${NC}"
  INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)
  
  echo -e "${GREEN}✓${NC} CloudFront invalidation created: ${INVALIDATION_ID}"
  echo -e "  You can check status with:"
  echo -e "  aws cloudfront get-invalidation --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --id ${INVALIDATION_ID}"
else
  echo -e "\n${YELLOW}Step 7: Skipping CloudFront invalidation (no distribution ID provided)${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Bucket: s3://${S3_BUCKET}"
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
  echo -e "CloudFront invalidation in progress..."
  echo -e "${YELLOW}Note: It may take 5-15 minutes for CloudFront to propagate changes.${NC}"
fi
echo ""
