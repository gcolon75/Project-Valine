# Deploy static assets to S3 with correct MIME types and CloudFront invalidation
# PowerShell version
#
# Usage:
#   .\scripts\deploy-static-with-mime.ps1 -S3Bucket "bucket-name" -CloudFrontDistributionId "E1234567890ABC"
#
# Or using environment variables:
#   $env:S3_BUCKET="bucket-name"
#   $env:CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"
#   .\scripts\deploy-static-with-mime.ps1

param(
    [string]$S3Bucket = $env:S3_BUCKET,
    [string]$CloudFrontDistributionId = $env:CLOUDFRONT_DISTRIBUTION_ID,
    [string]$DistDir = "dist",
    [string]$AwsProfile = $env:AWS_PROFILE
)

# Colors for output
function Write-Success { Write-Host $args[0] -ForegroundColor Green }
function Write-Info { Write-Host $args[0] -ForegroundColor Cyan }
function Write-Warning { Write-Host $args[0] -ForegroundColor Yellow }
function Write-Error { Write-Host $args[0] -ForegroundColor Red }

Write-Success "========================================"
Write-Success "Static Asset Deployment Script (PowerShell)"
Write-Success "========================================"

# Validate required parameters
if ([string]::IsNullOrWhiteSpace($S3Bucket)) {
    Write-Error "Error: S3 bucket name is required"
    Write-Host "Usage: .\deploy-static-with-mime.ps1 -S3Bucket <bucket-name> [-CloudFrontDistributionId <id>]"
    Write-Host "   or: Set environment variables S3_BUCKET and CLOUDFRONT_DISTRIBUTION_ID"
    exit 1
}

if (-not (Test-Path $DistDir)) {
    Write-Error "Error: $DistDir directory not found. Run 'npm run build' first."
    exit 1
}

Write-Success "✓ S3 Bucket: $S3Bucket"
if (-not [string]::IsNullOrWhiteSpace($CloudFrontDistributionId)) {
    Write-Success "✓ CloudFront Distribution: $CloudFrontDistributionId"
} else {
    Write-Warning "⚠ No CloudFront distribution ID provided (invalidation will be skipped)"
}
Write-Host ""

# Check AWS CLI is installed
try {
    aws --version | Out-Null
} catch {
    Write-Error "Error: AWS CLI is not installed"
    Write-Host "Install it from: https://aws.amazon.com/cli/"
    exit 1
}

# Set AWS profile if provided
if (-not [string]::IsNullOrWhiteSpace($AwsProfile)) {
    Write-Success "✓ Using AWS profile: $AwsProfile"
    $env:AWS_PROFILE = $AwsProfile
}

Write-Info "`nStep 1: Uploading index.html with no-cache header"
aws s3 cp "$DistDir\index.html" "s3://$S3Bucket/index.html" `
    --content-type "text/html; charset=utf-8" `
    --cache-control "no-cache, no-store, must-revalidate" `
    --metadata-directive REPLACE

Write-Info "Step 2: Uploading JavaScript files with immutable cache"
Get-ChildItem -Path $DistDir -Recurse -Filter "*.js" | ForEach-Object {
    $relativePath = $_.FullName.Substring((Get-Item $DistDir).FullName.Length + 1).Replace('\', '/')
    Write-Host "  Uploading: $relativePath"
    aws s3 cp $_.FullName "s3://$S3Bucket/$relativePath" `
        --content-type "application/javascript; charset=utf-8" `
        --cache-control "public, max-age=31536000, immutable" `
        --metadata-directive REPLACE
}

Write-Info "Step 3: Uploading source maps"
Get-ChildItem -Path $DistDir -Recurse -Filter "*.js.map" | ForEach-Object {
    $relativePath = $_.FullName.Substring((Get-Item $DistDir).FullName.Length + 1).Replace('\', '/')
    Write-Host "  Uploading: $relativePath"
    aws s3 cp $_.FullName "s3://$S3Bucket/$relativePath" `
        --content-type "application/json" `
        --cache-control "public, max-age=31536000, immutable" `
        --metadata-directive REPLACE
}

Write-Info "Step 4: Uploading CSS files with immutable cache"
Get-ChildItem -Path $DistDir -Recurse -Filter "*.css" | ForEach-Object {
    $relativePath = $_.FullName.Substring((Get-Item $DistDir).FullName.Length + 1).Replace('\', '/')
    Write-Host "  Uploading: $relativePath"
    aws s3 cp $_.FullName "s3://$S3Bucket/$relativePath" `
        --content-type "text/css; charset=utf-8" `
        --cache-control "public, max-age=31536000, immutable" `
        --metadata-directive REPLACE
}

Write-Info "Step 5: Uploading images and other assets"

# PNG files
Get-ChildItem -Path $DistDir -Recurse -Filter "*.png" | ForEach-Object {
    $relativePath = $_.FullName.Substring((Get-Item $DistDir).FullName.Length + 1).Replace('\', '/')
    aws s3 cp $_.FullName "s3://$S3Bucket/$relativePath" `
        --content-type "image/png" `
        --cache-control "public, max-age=31536000" `
        --metadata-directive REPLACE
}

# SVG files
Get-ChildItem -Path $DistDir -Recurse -Filter "*.svg" | ForEach-Object {
    $relativePath = $_.FullName.Substring((Get-Item $DistDir).FullName.Length + 1).Replace('\', '/')
    aws s3 cp $_.FullName "s3://$S3Bucket/$relativePath" `
        --content-type "image/svg+xml" `
        --cache-control "public, max-age=31536000" `
        --metadata-directive REPLACE
}

# JSON files
Get-ChildItem -Path $DistDir -Recurse -Filter "*.json" | ForEach-Object {
    $relativePath = $_.FullName.Substring((Get-Item $DistDir).FullName.Length + 1).Replace('\', '/')
    aws s3 cp $_.FullName "s3://$S3Bucket/$relativePath" `
        --content-type "application/json; charset=utf-8" `
        --cache-control "public, max-age=86400" `
        --metadata-directive REPLACE
}

Write-Info "Step 6: Uploading remaining files"
aws s3 sync $DistDir "s3://$S3Bucket/" `
    --exclude "*.js" `
    --exclude "*.js.map" `
    --exclude "*.css" `
    --exclude "*.png" `
    --exclude "*.svg" `
    --exclude "*.json" `
    --exclude "index.html" `
    --delete

# CloudFront invalidation
if (-not [string]::IsNullOrWhiteSpace($CloudFrontDistributionId)) {
    Write-Info "`nStep 7: Creating CloudFront invalidation"
    $invalidationId = aws cloudfront create-invalidation `
        --distribution-id $CloudFrontDistributionId `
        --paths "/*" `
        --query 'Invalidation.Id' `
        --output text
    
    Write-Success "✓ CloudFront invalidation created: $invalidationId"
    Write-Host "  You can check status with:"
    Write-Host "  aws cloudfront get-invalidation --distribution-id $CloudFrontDistributionId --id $invalidationId"
} else {
    Write-Warning "`nStep 7: Skipping CloudFront invalidation (no distribution ID provided)"
}

Write-Success "`n========================================"
Write-Success "✓ Deployment Complete!"
Write-Success "========================================"
Write-Host "Bucket: s3://$S3Bucket"
if (-not [string]::IsNullOrWhiteSpace($CloudFrontDistributionId)) {
    Write-Host "CloudFront invalidation in progress..."
    Write-Warning "Note: It may take 5-15 minutes for CloudFront to propagate changes."
}
Write-Host ""
