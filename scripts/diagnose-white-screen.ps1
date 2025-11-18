# White Screen Diagnostic Script (PowerShell)
#
# Performs comprehensive checks to diagnose white screen issues:
# - CloudFront route tests for representative extension-less paths
# - Asset 404 test
# - Bundle HEAD + first-byte checks (MIME type, cache headers)
# - Optional S3 metadata checks if AWS credentials present
#
# Usage:
#   .\scripts\diagnose-white-screen.ps1 -Domain "example.com"
#   .\scripts\diagnose-white-screen.ps1 -Domain "example.com" -Bucket "my-bucket" -DistributionId "E123"

param(
    [Parameter(Mandatory=$true)]
    [string]$Domain,
    
    [string]$Bucket,
    [string]$DistributionId,
    [switch]$Verbose
)

# Test paths (extension-less SPA routes)
$testPaths = @(
    "/",
    "/join",
    "/login",
    "/feed",
    "/about",
    "/settings"
)

# Expected to 404
$expected404Path = "/this-should-not-exist-404-test.js"

$passCount = 0
$failCount = 0

function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "❌ $msg" -ForegroundColor Red; $script:failCount++ }
function Write-Warn { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-VerboseMsg { param($msg) if ($Verbose) { Write-Host "   $msg" -ForegroundColor Gray } }

function Test-SpaRoute {
    param([string]$domain, [string]$path)
    
    $url = "https://$domain$path"
    Write-VerboseMsg "Testing $url"
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing -TimeoutSec 10
        
        if ($response.StatusCode -eq 200) {
            $contentType = $response.Headers["Content-Type"]
            
            if ($contentType -like "*text/html*") {
                Write-Success "$path → 200 HTML"
                $script:passCount++
                return $true
            } else {
                Write-Fail "$path → 200 but wrong content-type: $contentType"
                return $false
            }
        } else {
            Write-Fail "$path → $($response.StatusCode) (expected 200)"
            return $false
        }
    } catch {
        Write-Fail "$path → Error: $($_.Exception.Message)"
        return $false
    }
}

function Test-404Path {
    param([string]$domain, [string]$path)
    
    $url = "https://$domain$path"
    Write-VerboseMsg "Testing 404 path $url"
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
        $statusCode = $response.StatusCode
    } catch {
        # PowerShell throws on non-2xx status codes
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        } else {
            Write-Fail "404 test → Error: $($_.Exception.Message)"
            return $false
        }
    }
    
    if ($statusCode -eq 404 -or $statusCode -eq 403) {
        Write-Success "404 test → $statusCode (correct)"
        $script:passCount++
        return $true
    } else {
        Write-Fail "404 test → $statusCode (expected 404)"
        return $false
    }
}

function Get-BundleUrl {
    param([string]$domain)
    
    try {
        $response = Invoke-WebRequest -Uri "https://$domain/" -Method Get -UseBasicParsing -TimeoutSec 10
        $html = $response.Content
        
        # Look for module script
        if ($html -match '<script[^>]+type=["\']module["\'][^>]+src=["\']([^"\']+)["\']') {
            $bundlePath = $matches[1]
            Write-VerboseMsg "Found bundle: $bundlePath"
            return $bundlePath
        }
        
        Write-Warn "Could not extract bundle URL from index.html"
        return $null
    } catch {
        Write-Fail "Failed to fetch index.html: $($_.Exception.Message)"
        return $null
    }
}

function Test-Bundle {
    param([string]$domain, [string]$bundlePath)
    
    $url = "https://$domain$bundlePath"
    Write-VerboseMsg "Testing bundle $url"
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -TimeoutSec 10
        
        if ($response.StatusCode -ne 200) {
            Write-Fail "Bundle → $($response.StatusCode) (expected 200)"
            return $false
        }
        
        $contentType = $response.Headers["Content-Type"]
        $cacheControl = $response.Headers["Cache-Control"]
        
        $bundleOk = $true
        
        # Check MIME type
        if ($contentType -like "*application/javascript*" -or $contentType -like "*text/javascript*") {
            Write-VerboseMsg "Bundle MIME type: $contentType ✓"
        } elseif ($contentType -like "*text/html*") {
            Write-Fail "Bundle → Wrong MIME type (HTML instead of JS): $contentType"
            $bundleOk = $false
        } else {
            Write-Warn "Bundle → Unexpected MIME type: $contentType"
        }
        
        # Check cache headers
        if ($cacheControl -like "*immutable*" -or $cacheControl -like "*max-age*") {
            Write-VerboseMsg "Bundle cache-control: $cacheControl ✓"
        } else {
            Write-Warn "Bundle → Missing immutable cache: $cacheControl"
        }
        
        if ($bundleOk) {
            Write-Success "Bundle checks → OK"
            $script:passCount++
        }
        
        return $bundleOk
    } catch {
        Write-Fail "Bundle test → Error: $($_.Exception.Message)"
        return $false
    }
}

function Test-S3Metadata {
    param([string]$bucket, [string]$key)
    
    if (-not $bucket) {
        Write-Info "S3 checks skipped (no bucket specified)"
        return $true
    }
    
    Write-VerboseMsg "Checking S3 metadata for s3://$bucket/$key"
    
    try {
        $output = aws s3api head-object --bucket $bucket --key $key 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Info "S3 metadata check → Skipped (AWS CLI not available or no permissions)"
            return $true
        }
        
        $metadata = $output | ConvertFrom-Json
        $contentType = $metadata.ContentType
        $cacheControl = $metadata.CacheControl
        
        Write-VerboseMsg "S3 ContentType: $contentType"
        Write-VerboseMsg "S3 CacheControl: $cacheControl"
        
        if ($key -like "*.js" -and $contentType -notlike "*javascript*") {
            Write-Fail "S3 metadata → Wrong ContentType for ${key}: $contentType"
            return $false
        }
        
        Write-Success "S3 metadata → OK"
        $script:passCount++
        return $true
    } catch {
        Write-Info "S3 metadata check → Skipped (AWS CLI not available or no permissions)"
        return $true
    }
}

function Test-CloudFrontFunction {
    param([string]$distributionId)
    
    if (-not $distributionId) {
        Write-Info "CloudFront function check skipped (no distribution ID)"
        return $true
    }
    
    Write-VerboseMsg "Checking CloudFront distribution $distributionId"
    
    try {
        $output = aws cloudfront get-distribution-config --id $distributionId 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Info "CloudFront check → Skipped (AWS CLI not available or no permissions)"
            return $true
        }
        
        $config = $output | ConvertFrom-Json
        $defaultBehavior = $config.DistributionConfig.DefaultCacheBehavior
        
        if (-not $defaultBehavior) {
            Write-Fail "CloudFront config → Could not find default behavior"
            return $false
        }
        
        # Check for viewer-request function
        $functionAssociations = $defaultBehavior.FunctionAssociations.Items
        $hasViewerRequest = $functionAssociations | Where-Object { $_.EventType -eq "viewer-request" }
        
        if ($hasViewerRequest) {
            Write-Success "CloudFront → viewer-request function attached ✓"
            $script:passCount++
        } else {
            Write-Fail "CloudFront → No viewer-request function (SPA routing may fail)"
            return $false
        }
        
        # Check for error responses
        $errorResponses = $config.DistributionConfig.CustomErrorResponses.Items
        $has404Mapping = $errorResponses | Where-Object { 
            $_.ErrorCode -eq 404 -and $_.ResponsePagePath -eq "/index.html" 
        }
        
        if ($has404Mapping) {
            Write-Warn "CloudFront → Warning: 404→/index.html error mapping active (should use function instead)"
        }
        
        return $true
    } catch {
        Write-Info "CloudFront check → Skipped (AWS CLI not available or no permissions)"
        return $true
    }
}

# Main execution
Write-Host ""
Write-Host "🔍 White Screen Diagnostic Tool" -ForegroundColor Cyan
Write-Host ""
Write-Host ("=" * 50)
Write-Host "Domain: $Domain"
if ($Bucket) { Write-Host "Bucket: $Bucket" }
if ($DistributionId) { Write-Host "Distribution: $DistributionId" }
Write-Host ("=" * 50)
Write-Host ""

# Test 1: SPA Routes
Write-Host "📍 Testing SPA routes..." -ForegroundColor Yellow
foreach ($path in $testPaths) {
    Test-SpaRoute -domain $Domain -path $path
}
Write-Host ""

# Test 2: 404 Path
Write-Host "🚫 Testing 404 handling..." -ForegroundColor Yellow
Test-404Path -domain $Domain -path $expected404Path
Write-Host ""

# Test 3: Bundle
Write-Host "📦 Testing JavaScript bundle..." -ForegroundColor Yellow
$bundlePath = Get-BundleUrl -domain $Domain
if ($bundlePath) {
    Test-Bundle -domain $Domain -bundlePath $bundlePath
    
    # Test 4: S3 Metadata (if bucket specified)
    if ($Bucket) {
        Write-Host ""
        Write-Host "☁️  Testing S3 metadata..." -ForegroundColor Yellow
        $s3Key = $bundlePath.TrimStart('/')
        Test-S3Metadata -bucket $Bucket -key $s3Key
    }
}
Write-Host ""

# Test 5: CloudFront Configuration
if ($DistributionId) {
    Write-Host "🌐 Testing CloudFront configuration..." -ForegroundColor Yellow
    Test-CloudFrontFunction -distributionId $DistributionId
    Write-Host ""
}

# Summary
Write-Host ("=" * 50)
Write-Host ""
Write-Host "📊 Results: $passCount passed, $failCount failed" -ForegroundColor Cyan
Write-Host ""

if ($failCount -eq 0) {
    Write-Success "All checks passed! ✨"
    exit 0
} else {
    Write-Fail "$failCount check(s) failed. Review the errors above."
    Write-Host ""
    Write-Host "💡 Common fixes:" -ForegroundColor Yellow
    Write-Host "  - Deploy with correct MIME types (.\scripts\deploy-static-with-mime.ps1)"
    Write-Host "  - Attach SPA rewrite function to CloudFront viewer-request"
    Write-Host "  - Invalidate CloudFront cache (aws cloudfront create-invalidation)"
    Write-Host "  - Verify S3 bucket policy allows public read"
    exit 1
}
