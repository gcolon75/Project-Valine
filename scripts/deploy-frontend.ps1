# Frontend Deployment Script with Asset Retention
# 
# Purpose: Deploy frontend build to S3 with proper MIME types and retain previous bundles
# 
# Usage:
#   .\scripts\deploy-frontend.ps1 -S3Bucket "bucket-name" -CloudFrontDistributionId "E1234567890ABC"
#   or use environment variables S3_BUCKET and CLOUDFRONT_DISTRIBUTION_ID
#
# Features:
# - Builds frontend (npm ci && npm run build)
# - Parses dist/index.html for module script and stylesheet
# - Uploads with correct Content-Type & Cache-Control
# - Retains previous JS/CSS bundles for RETENTION_DAYS (default 7)
# - Prunes bundles older than retention period
# - Optional CloudFront invalidation
# - Generates deploy-report.json

param(
    [string]$S3Bucket = $env:S3_BUCKET,
    [string]$CloudFrontDistributionId = $env:CLOUDFRONT_DISTRIBUTION_ID,
    [string]$DistDir = "dist",
    [int]$RetentionDays = 7,
    [switch]$SkipBuild,
    [switch]$SkipInvalidation,
    [string]$AwsProfile = $env:AWS_PROFILE
)

# Colors for output
function Write-Success { Write-Host $args[0] -ForegroundColor Green }
function Write-Info { Write-Host $args[0] -ForegroundColor Cyan }
function Write-Warning { Write-Host $args[0] -ForegroundColor Yellow }
function Write-Error { Write-Host $args[0] -ForegroundColor Red }

Write-Success "========================================"
Write-Success "Frontend Deployment Script"
Write-Success "========================================"
Write-Info "Retention Policy: $RetentionDays days"
Write-Host ""

# Validate required parameters
if ([string]::IsNullOrWhiteSpace($S3Bucket)) {
    Write-Error "Error: S3 bucket name is required"
    Write-Host "Usage: .\deploy-frontend.ps1 -S3Bucket <bucket-name> [-CloudFrontDistributionId <id>]"
    Write-Host "   or: Set environment variables S3_BUCKET and CLOUDFRONT_DISTRIBUTION_ID"
    exit 1
}

Write-Success "✓ S3 Bucket: $S3Bucket"
if (-not [string]::IsNullOrWhiteSpace($CloudFrontDistributionId)) {
    Write-Success "✓ CloudFront Distribution: $CloudFrontDistributionId"
} else {
    Write-Warning "⚠ No CloudFront distribution ID (invalidation will be skipped)"
}
Write-Host ""

# Build AWS CLI profile argument
$awsProfileArgs = @()
if (-not [string]::IsNullOrWhiteSpace($AwsProfile)) {
    $awsProfileArgs = @("--profile", $AwsProfile)
    Write-Info "Using AWS profile: $AwsProfile"
}

# Step 1: Build frontend (unless skipped)
if (-not $SkipBuild) {
    Write-Info "Step 1: Building frontend..."
    
    # Check if node_modules exists, if not run npm ci
    if (-not (Test-Path "node_modules")) {
        Write-Info "Installing dependencies..."
        npm ci
        if ($LASTEXITCODE -ne 0) {
            Write-Error "npm ci failed"
            exit 1
        }
    }
    
    # Build
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed"
        exit 1
    }
    Write-Success "✓ Build completed"
} else {
    Write-Warning "⚠ Skipping build (--SkipBuild flag set)"
}

# Verify dist directory exists
if (-not (Test-Path $DistDir)) {
    Write-Error "Error: $DistDir directory not found"
    exit 1
}

# Step 2: Parse dist/index.html for bundle names
Write-Info "Step 2: Parsing index.html for bundles..."
$indexHtmlPath = Join-Path $DistDir "index.html"
if (-not (Test-Path $indexHtmlPath)) {
    Write-Error "Error: index.html not found in $DistDir"
    exit 1
}

$indexHtml = Get-Content $indexHtmlPath -Raw

# Extract module script src
$moduleScriptMatch = [regex]::Match($indexHtml, '<script\s+type="module"[^>]+src="([^"]+)"')
if (-not $moduleScriptMatch.Success) {
    Write-Error "Error: Could not find module script in index.html"
    exit 1
}
$moduleBundle = $moduleScriptMatch.Groups[1].Value
Write-Success "✓ Module bundle: $moduleBundle"

# Extract stylesheet href
$stylesheetMatch = [regex]::Match($indexHtml, '<link\s+rel="stylesheet"[^>]+href="([^"]+)"')
$mainCss = if ($stylesheetMatch.Success) { $stylesheetMatch.Groups[1].Value } else { "" }
if ($mainCss) {
    Write-Success "✓ Main CSS: $mainCss"
}

# Step 3: List existing bundles in S3 for retention management
Write-Info "Step 3: Checking existing bundles in S3..."
$existingBundles = @()
try {
    $s3ListOutput = aws s3api list-objects-v2 --bucket $S3Bucket --prefix "assets/index-" @awsProfileArgs --output json 2>&1
    if ($LASTEXITCODE -eq 0) {
        $s3Objects = $s3ListOutput | ConvertFrom-Json
        if ($s3Objects.Contents) {
            $existingBundles = $s3Objects.Contents | ForEach-Object {
                @{
                    Key = $_.Key
                    LastModified = [DateTime]::Parse($_.LastModified)
                }
            }
            Write-Info "Found $($existingBundles.Count) existing bundle(s) in S3"
        }
    }
} catch {
    Write-Warning "⚠ Could not list existing bundles: $_"
}

# Step 4: Upload files with correct Content-Type and Cache-Control
Write-Info "Step 4: Uploading files to S3..."

# Define content type mappings
$contentTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.js' = 'application/javascript; charset=utf-8'
    '.css' = 'text/css; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.png' = 'image/png'
    '.jpg' = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.svg' = 'image/svg+xml'
    '.ico' = 'image/x-icon'
    '.webp' = 'image/webp'
    '.woff' = 'font/woff'
    '.woff2' = 'font/woff2'
    '.ttf' = 'font/ttf'
    '.xml' = 'application/xml'
    '.txt' = 'text/plain'
}

# Upload files
Get-ChildItem -Path $DistDir -Recurse -File | ForEach-Object {
    $file = $_
    $relativePath = $file.FullName.Substring((Resolve-Path $DistDir).Path.Length + 1).Replace('\', '/')
    $s3Key = $relativePath
    
    # Determine content type
    $ext = $file.Extension.ToLower()
    $contentType = if ($contentTypes.ContainsKey($ext)) { $contentTypes[$ext] } else { 'application/octet-stream' }
    
    # Determine cache control
    $cacheControl = if ($ext -eq '.html') {
        'no-cache, no-store, must-revalidate'
    } elseif ($ext -eq '.json' -and $file.Name -eq 'manifest.json') {
        'public, max-age=300'
    } elseif ($ext -eq '.js' -or $ext -eq '.css') {
        'public, max-age=31536000, immutable'
    } else {
        'public, max-age=31536000, immutable'
    }
    
    # Upload
    $uploadArgs = @(
        "s3api", "put-object",
        "--bucket", $S3Bucket,
        "--key", $s3Key,
        "--body", $file.FullName,
        "--content-type", $contentType,
        "--cache-control", $cacheControl
    ) + $awsProfileArgs
    
    aws @uploadArgs | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Info "  ✓ $s3Key ($contentType, $cacheControl)"
    } else {
        Write-Error "  ✗ Failed to upload $s3Key"
    }
}

Write-Success "✓ Upload completed"

# Step 5: Prune old bundles
Write-Info "Step 5: Pruning old bundles (retention: $RetentionDays days)..."
$cutoffDate = (Get-Date).AddDays(-$RetentionDays)
$currentBundleKey = $moduleBundle.TrimStart('/')
$prunedBundles = @()

foreach ($bundle in $existingBundles) {
    $bundleKey = $bundle.Key
    $bundleAge = $bundle.LastModified
    
    # Don't delete the current bundle
    if ($bundleKey -eq $currentBundleKey) {
        Write-Info "  → Keeping current bundle: $bundleKey"
        continue
    }
    
    # Delete if older than retention period
    if ($bundleAge -lt $cutoffDate) {
        Write-Warning "  ✗ Deleting old bundle: $bundleKey (age: $([int]((Get-Date) - $bundleAge).TotalDays) days)"
        aws s3api delete-object --bucket $S3Bucket --key $bundleKey @awsProfileArgs | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $prunedBundles += $bundleKey
        }
    } else {
        Write-Info "  → Keeping bundle: $bundleKey (age: $([int]((Get-Date) - $bundleAge).TotalDays) days)"
    }
}

if ($prunedBundles.Count -gt 0) {
    Write-Success "✓ Pruned $($prunedBundles.Count) old bundle(s)"
} else {
    Write-Info "No bundles to prune"
}

# Step 6: Invalidate CloudFront (optional)
if (-not $SkipInvalidation -and -not [string]::IsNullOrWhiteSpace($CloudFrontDistributionId)) {
    Write-Info "Step 6: Invalidating CloudFront cache..."
    
    # Invalidate critical paths
    $pathsToInvalidate = @('/index.html', '/theme-init.js', $moduleBundle)
    if ($mainCss) {
        $pathsToInvalidate += $mainCss
    }
    
    $invalidationPaths = $pathsToInvalidate -join ' '
    $invalidationArgs = @(
        "cloudfront", "create-invalidation",
        "--distribution-id", $CloudFrontDistributionId,
        "--paths"
    ) + $pathsToInvalidate + $awsProfileArgs
    
    aws @invalidationArgs | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ CloudFront invalidation created for: $invalidationPaths"
    } else {
        Write-Error "✗ CloudFront invalidation failed"
    }
} else {
    Write-Warning "⚠ Skipping CloudFront invalidation"
}

# Step 7: Generate deployment report
Write-Info "Step 7: Generating deployment report..."
$report = @{
    timestamp = (Get-Date).ToString("o")
    s3Bucket = $S3Bucket
    moduleBundle = $moduleBundle
    mainCss = $mainCss
    prunedBundles = $prunedBundles
    retentionDays = $RetentionDays
    cloudFrontDistribution = $CloudFrontDistributionId
} | ConvertTo-Json -Depth 10

$reportPath = "deploy-report.json"
$report | Out-File -FilePath $reportPath -Encoding UTF8
Write-Success "✓ Deployment report: $reportPath"

Write-Host ""
Write-Success "========================================"
Write-Success "Deployment completed successfully!"
Write-Success "========================================"
Write-Info "Module bundle: $moduleBundle"
if ($mainCss) {
    Write-Info "Main CSS: $mainCss"
}
Write-Info "Pruned bundles: $($prunedBundles.Count)"
