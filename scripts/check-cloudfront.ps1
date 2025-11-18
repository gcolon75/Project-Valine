# CloudFront Diagnostic Script
#
# Purpose: Check CloudFront distribution status, invalidations, and asset delivery
#
# Usage:
#   .\scripts\check-cloudfront.ps1 -DistributionId "E1234567890ABC" -BundlePath "/assets/index-yrgN6q4Q.js"
#   or use environment variables CLOUDFRONT_DISTRIBUTION_ID and BUNDLE_PATH

param(
    [string]$DistributionId = $env:CLOUDFRONT_DISTRIBUTION_ID,
    [string]$BundlePath = $env:BUNDLE_PATH,
    [string]$CloudFrontDomain = $env:CLOUDFRONT_DOMAIN,
    [string]$AwsProfile = $env:AWS_PROFILE
)

# Colors for output
function Write-Success { Write-Host $args[0] -ForegroundColor Green }
function Write-Info { Write-Host $args[0] -ForegroundColor Cyan }
function Write-Warning { Write-Host $args[0] -ForegroundColor Yellow }
function Write-Error { Write-Host $args[0] -ForegroundColor Red }

Write-Success "========================================"
Write-Success "CloudFront Diagnostic Script"
Write-Success "========================================"
Write-Host ""

# Validate parameters
if ([string]::IsNullOrWhiteSpace($DistributionId)) {
    Write-Error "Error: CloudFront distribution ID is required"
    Write-Host "Usage: .\check-cloudfront.ps1 -DistributionId <id> [-BundlePath <path>] [-CloudFrontDomain <domain>]"
    exit 1
}

Write-Success "✓ Distribution ID: $DistributionId"
if ($BundlePath) {
    Write-Info "Bundle path: $BundlePath"
}
if ($CloudFrontDomain) {
    Write-Info "CloudFront domain: $CloudFrontDomain"
}
Write-Host ""

# Build AWS CLI profile argument
$awsProfileArgs = @()
if (-not [string]::IsNullOrWhiteSpace($AwsProfile)) {
    $awsProfileArgs = @("--profile", $AwsProfile)
    Write-Info "Using AWS profile: $AwsProfile"
    Write-Host ""
}

# 1. Get distribution configuration
Write-Info "1. Distribution Configuration"
Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
try {
    $distConfig = aws cloudfront get-distribution --id $DistributionId @awsProfileArgs --output json 2>&1 | ConvertFrom-Json
    
    $status = $distConfig.Distribution.Status
    $domainName = $distConfig.Distribution.DomainName
    $enabled = $distConfig.Distribution.DistributionConfig.Enabled
    $webAclId = $distConfig.Distribution.DistributionConfig.WebACLId
    $customErrors = $distConfig.Distribution.DistributionConfig.CustomErrorResponses.Items
    
    Write-Success "Status: $status"
    Write-Info "Domain Name: $domainName"
    Write-Info "Enabled: $enabled"
    
    if ($webAclId) {
        Write-Warning "WAF WebACL ID: $webAclId"
        Write-Warning "⚠ WAF is attached - may block asset requests!"
    } else {
        Write-Success "✓ No WAF attached"
    }
    
    if ($customErrors -and $customErrors.Count -gt 0) {
        Write-Warning "Custom Error Responses:"
        foreach ($errorResponse in $customErrors) {
            Write-Warning "  $($errorResponse.ErrorCode) → $($errorResponse.ResponseCode) $($errorResponse.ResponsePagePath)"
        }
        Write-Warning "⚠ Custom error responses may mask real errors!"
    } else {
        Write-Success "✓ No custom error responses"
    }
    
    # Save domain for later use
    if (-not $CloudFrontDomain) {
        $CloudFrontDomain = $domainName
    }
} catch {
    Write-Error "Failed to get distribution configuration: $_"
}
Write-Host ""

# 2. List recent invalidations
Write-Info "2. Recent Invalidations (last 10)"
Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
try {
    $invalidations = aws cloudfront list-invalidations --distribution-id $DistributionId @awsProfileArgs --max-items 10 --output json 2>&1 | ConvertFrom-Json
    
    if ($invalidations.InvalidationList.Items) {
        foreach ($inv in $invalidations.InvalidationList.Items) {
            $invId = $inv.Id
            $invStatus = $inv.Status
            $invCreateTime = $inv.CreateTime
            Write-Info "  $invId - $invStatus (created: $invCreateTime)"
        }
    } else {
        Write-Info "  No recent invalidations"
    }
} catch {
    Write-Warning "Could not list invalidations: $_"
}
Write-Host ""

# 3. Test bundle delivery (if bundle path and domain provided)
if ($BundlePath -and $CloudFrontDomain) {
    Write-Info "3. Testing Bundle Delivery"
    Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    $bundleUrl = "https://$CloudFrontDomain$BundlePath"
    Write-Info "Testing: $bundleUrl"
    
    # HEAD request
    try {
        $headResponse = Invoke-WebRequest -Uri $bundleUrl -Method Head -UseBasicParsing -ErrorAction SilentlyContinue
        
        $statusCode = $headResponse.StatusCode
        $contentType = $headResponse.Headers['Content-Type']
        $cacheControl = $headResponse.Headers['Cache-Control']
        $xCache = $headResponse.Headers['X-Cache']
        
        Write-Success "Status Code: $statusCode"
        
        if ($contentType -match 'application/javascript') {
            Write-Success "✓ Content-Type: $contentType"
        } else {
            Write-Error "✗ Content-Type: $contentType (expected application/javascript)"
        }
        
        if ($cacheControl) {
            Write-Info "Cache-Control: $cacheControl"
        }
        
        if ($xCache) {
            Write-Info "X-Cache: $xCache"
        }
    } catch {
        Write-Error "HEAD request failed: $_"
        Write-Error "This may indicate a 403 (WAF block) or 404 (missing file)"
    }
    
    # GET first bytes
    Write-Host ""
    Write-Info "Fetching first 100 bytes..."
    try {
        $getResponse = Invoke-WebRequest -Uri $bundleUrl -UseBasicParsing -ErrorAction SilentlyContinue
        $firstBytes = $getResponse.Content.Substring(0, [Math]::Min(100, $getResponse.Content.Length))
        
        if ($firstBytes -match '^<!DOCTYPE|^<html') {
            Write-Error "✗ CRITICAL: Response starts with HTML!"
            Write-Error "First 100 bytes: $firstBytes"
            Write-Error "This indicates CloudFront is serving index.html instead of the JS bundle"
        } elseif ($firstBytes -match '^import |^export |^function |^var |^const |^let |^/\*|^//') {
            Write-Success "✓ Response appears to be JavaScript"
            Write-Info "First 100 bytes: $firstBytes"
        } else {
            Write-Warning "⚠ Response format unclear"
            Write-Info "First 100 bytes: $firstBytes"
        }
    } catch {
        Write-Error "GET request failed: $_"
    }
} else {
    Write-Warning "3. Skipping bundle delivery test (BundlePath or CloudFrontDomain not provided)"
}
Write-Host ""

# 4. Test other critical paths
Write-Info "4. Testing Critical Paths"
Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if ($CloudFrontDomain) {
    $criticalPaths = @('/index.html', '/theme-init.js', '/manifest.json')
    
    foreach ($path in $criticalPaths) {
        $url = "https://$CloudFrontDomain$path"
        try {
            $response = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -ErrorAction SilentlyContinue
            $statusCode = $response.StatusCode
            $contentType = $response.Headers['Content-Type']
            
            if ($statusCode -eq 200) {
                Write-Success "  ✓ $path - $statusCode ($contentType)"
            } else {
                Write-Warning "  ⚠ $path - $statusCode"
            }
        } catch {
            Write-Error "  ✗ $path - FAILED"
        }
    }
} else {
    Write-Warning "  Skipping (CloudFrontDomain not provided)"
}

Write-Host ""
Write-Success "========================================"
Write-Success "Diagnostic check completed"
Write-Success "========================================"
