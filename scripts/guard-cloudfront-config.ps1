# CloudFront Configuration Safety Guard
#
# Verifies CloudFront distribution configuration for safe SPA deployment:
# - Default behavior has spaRewrite on viewer-request
# - No CustomErrorResponses map 403/404 to /index.html (should use function instead)
# - DefaultRootObject is index.html
# - OriginPath is empty (assets served from bucket root)
#
# Usage:
#   .\scripts\guard-cloudfront-config.ps1 -DistributionId "E1234567890ABC"
#   .\scripts\guard-cloudfront-config.ps1 -DistributionId "E1234567890ABC" -Strict

param(
    [Parameter(Mandatory=$true)]
    [string]$DistributionId,
    
    [switch]$Strict,  # Fail on warnings
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Warn { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-VerboseMsg { param($msg) if ($Verbose) { Write-Host "   $msg" -ForegroundColor Gray } }

$passed = $true
$warnings = 0

Write-Host ""
Write-Host "🔒 CloudFront Configuration Safety Guard" -ForegroundColor Cyan
Write-Host ""
Write-Host ("=" * 60)
Write-Host "Distribution ID: $DistributionId"
Write-Host ("=" * 60)
Write-Host ""

# Fetch distribution config
Write-Info "Fetching distribution configuration..."
try {
    $output = aws cloudfront get-distribution-config --id $DistributionId 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Failed to fetch distribution config"
        Write-Host "  Error: $output"
        exit 1
    }
    
    $config = $output | ConvertFrom-Json
    $distConfig = $config.DistributionConfig
    
    if (-not $distConfig) {
        Write-Fail "Invalid distribution config received"
        exit 1
    }
    
    Write-Success "Distribution config retrieved"
    Write-Host ""
} catch {
    Write-Fail "Error fetching distribution config: $($_.Exception.Message)"
    exit 1
}

# Check 1: DefaultRootObject
Write-Info "Checking DefaultRootObject..."
$defaultRootObject = $distConfig.DefaultRootObject

if ($defaultRootObject -eq "index.html") {
    Write-Success "DefaultRootObject is 'index.html' ✓"
} elseif ([string]::IsNullOrEmpty($defaultRootObject)) {
    Write-Warn "DefaultRootObject is not set (should be 'index.html')"
    $warnings++
    if ($Strict) { $passed = $false }
} else {
    Write-Fail "DefaultRootObject is '$defaultRootObject' (should be 'index.html')"
    $passed = $false
}
Write-Host ""

# Check 2: Default Cache Behavior - Viewer Request Function
Write-Info "Checking default cache behavior for viewer-request function..."
$defaultBehavior = $distConfig.DefaultCacheBehavior

if (-not $defaultBehavior) {
    Write-Fail "No default cache behavior found"
    $passed = $false
    exit 1
}

$functionAssociations = $defaultBehavior.FunctionAssociations.Items
$viewerRequestFunctions = $functionAssociations | Where-Object { $_.EventType -eq "viewer-request" }

if ($viewerRequestFunctions) {
    Write-Success "Viewer-request function attached ✓"
    foreach ($func in $viewerRequestFunctions) {
        $funcArn = $func.FunctionARN
        Write-VerboseMsg "  Function ARN: $funcArn"
        
        # Check if it's likely the SPA rewrite function
        if ($funcArn -like "*spa*" -or $funcArn -like "*rewrite*") {
            Write-VerboseMsg "  Appears to be SPA rewrite function"
        }
    }
} else {
    Write-Fail "No viewer-request function attached (SPA deep links will fail)"
    Write-Host "  Expected: CloudFront Function for SPA path rewriting"
    Write-Host "  Fix: Run .\scripts\cloudfront-associate-spa-function.ps1"
    $passed = $false
}
Write-Host ""

# Check 3: CustomErrorResponses
Write-Info "Checking CustomErrorResponses..."
$errorResponses = $distConfig.CustomErrorResponses.Items

if ($errorResponses -and $errorResponses.Count -gt 0) {
    Write-Warn "CustomErrorResponses are configured ($($errorResponses.Count) rules)"
    
    $problematic = @()
    
    foreach ($response in $errorResponses) {
        $errorCode = $response.ErrorCode
        $responsePage = $response.ResponsePagePath
        $responseCode = $response.ResponseCode
        
        Write-VerboseMsg "  $errorCode → $responsePage (status: $responseCode)"
        
        # Check for 403/404 mapping to index.html
        if (($errorCode -eq 403 -or $errorCode -eq 404) -and $responsePage -eq "/index.html") {
            $problematic += $response
        }
    }
    
    if ($problematic.Count -gt 0) {
        Write-Warn "Found 403/404 → /index.html error mappings (should use viewer-request function instead)"
        Write-Host "  These mappings can mask real errors and cause confusion"
        Write-Host "  Recommendation: Remove error mappings and rely on viewer-request function"
        $warnings++
        if ($Strict) { $passed = $false }
    } else {
        Write-Success "No problematic error response mappings found"
    }
} else {
    Write-Success "No CustomErrorResponses configured (good - using viewer-request function)"
}
Write-Host ""

# Check 4: Origin Configuration
Write-Info "Checking origin configuration..."
$origins = $distConfig.Origins.Items

if ($origins -and $origins.Count -gt 0) {
    $primaryOrigin = $origins[0]
    $originPath = $primaryOrigin.OriginPath
    $domainName = $primaryOrigin.DomainName
    
    Write-VerboseMsg "  Origin domain: $domainName"
    Write-VerboseMsg "  Origin path: '$originPath'"
    
    if ([string]::IsNullOrEmpty($originPath)) {
        Write-Success "OriginPath is empty (assets served from bucket root) ✓"
    } else {
        Write-Warn "OriginPath is '$originPath' (usually should be empty)"
        Write-Host "  Ensure assets are deployed to bucket root, not a subdirectory"
        $warnings++
    }
} else {
    Write-Fail "No origins configured"
    $passed = $false
}
Write-Host ""

# Check 5: Cache behavior for /assets/*
Write-Info "Checking cache behavior for assets..."
$cacheBehaviors = $distConfig.CacheBehaviors.Items
$assetsPattern = $cacheBehaviors | Where-Object { $_.PathPattern -like "*assets*" -or $_.PathPattern -eq "/assets/*" }

if ($assetsPattern) {
    Write-Success "Found dedicated cache behavior for assets ✓"
    Write-VerboseMsg "  Pattern: $($assetsPattern.PathPattern)"
} else {
    Write-Warn "No dedicated cache behavior for /assets/* path"
    Write-Host "  Consider adding a cache behavior for /assets/* with longer TTL"
    $warnings++
}
Write-Host ""

# Summary
Write-Host ("=" * 60)
Write-Host ""

if ($passed -and ($warnings -eq 0 -or -not $Strict)) {
    if ($warnings -gt 0) {
        Write-Host "📊 Status: " -NoNewline
        Write-Host "PASSED " -ForegroundColor Green -NoNewline
        Write-Host "with $warnings warning(s)" -ForegroundColor Yellow
        Write-Host ""
        Write-Success "Configuration is safe for deployment (with minor recommendations)"
        Write-Host ""
        Write-Host "💡 Recommended actions:" -ForegroundColor Yellow
        Write-Host "  - Review warnings above and consider addressing them"
        Write-Host "  - Test deployment with: .\scripts\diagnose-white-screen.ps1"
    } else {
        Write-Host "📊 Status: " -NoNewline
        Write-Success "PASSED"
        Write-Host ""
        Write-Success "Configuration looks good! ✨"
    }
    exit 0
} else {
    Write-Host "📊 Status: " -NoNewline
    Write-Fail "FAILED"
    Write-Host ""
    Write-Fail "Configuration has issues that need to be fixed"
    Write-Host ""
    Write-Host "🔧 Required fixes:" -ForegroundColor Red
    Write-Host "  1. Ensure viewer-request function is attached for SPA routing"
    Write-Host "  2. Set DefaultRootObject to 'index.html'"
    Write-Host "  3. Remove 403/404 → /index.html error response mappings"
    Write-Host ""
    Write-Host "📚 Documentation:" -ForegroundColor Yellow
    Write-Host "  - See docs/white-screen-runbook.md for detailed guidance"
    Write-Host "  - Run: .\scripts\cloudfront-associate-spa-function.ps1"
    exit 1
}
