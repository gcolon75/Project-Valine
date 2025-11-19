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
#   .\scripts\guard-cloudfront-config.ps1 -DistributionId "E1234567890ABC" -Strict -ShowDetails
#
# Notes:
# - ASCII-only output (Windows PowerShell 5.1 safe)
# - Handles missing/null JSON sections gracefully

param(
    [Parameter(Mandatory = $true)]
    [string]$DistributionId,

    [switch]$Strict,   # Fail on warnings
    [switch]$ShowDetails   # Show extra details
)

$ErrorActionPreference = "Stop"

function Write-Success { param($msg) Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Fail    { param($msg) Write-Host "[FAIL]  $msg" -ForegroundColor Red }
function Write-Warn    { param($msg) Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Info    { param($msg) Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Write-Detail  { param($msg) if ($ShowDetails) { Write-Host "        $msg" -ForegroundColor Gray } }

$passed = $true
$warnings = 0

Write-Host ""
Write-Host "CloudFront Configuration Safety Guard" -ForegroundColor Cyan
Write-Host ""
Write-Host ("=" * 60)
Write-Host "Distribution ID: $DistributionId"
Write-Host ("=" * 60)
Write-Host ""

# Ensure AWS CLI exists
try {
    $null = aws --version 2>$null
} catch {
    Write-Fail "AWS CLI not found. Please install and configure AWS CLI."
    exit 1
}

# Fetch distribution config
Write-Info "Fetching distribution configuration..."
try {
    $raw = aws cloudfront get-distribution-config --id $DistributionId --output json 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($raw)) {
        Write-Fail "Failed to fetch distribution config"
        if (-not [string]::IsNullOrWhiteSpace($raw)) { Write-Detail $raw }
        exit 1
    }

    $config = $raw | ConvertFrom-Json
    $distConfig = $config.DistributionConfig

    if (-not $distConfig) {
        Write-Fail "Invalid distribution config received (no DistributionConfig node)"
        exit 1
    }

    Write-Success "Distribution config retrieved"
    Write-Host ""
} catch {
    Write-Fail ("Error fetching distribution config: {0}" -f $_.Exception.Message)
    exit 1
}

# Check 1: DefaultRootObject
Write-Info "Checking DefaultRootObject..."
$defaultRootObject = $distConfig.DefaultRootObject

if ($defaultRootObject -eq "index.html") {
    Write-Success "DefaultRootObject is 'index.html'"
} elseif ([string]::IsNullOrEmpty($defaultRootObject)) {
    Write-Warn "DefaultRootObject is not set (should be 'index.html')"
    $warnings++
    if ($Strict) { $passed = $false }
} else {
    Write-Fail ("DefaultRootObject is '{0}' (should be 'index.html')" -f $defaultRootObject)
    $passed = $false
}
Write-Host ""

# Check 2: Default Cache Behavior - Viewer Request Function
Write-Info "Checking default cache behavior for viewer-request function..."
$defaultBehavior = $distConfig.DefaultCacheBehavior
if (-not $defaultBehavior) {
    Write-Fail "No DefaultCacheBehavior found"
    $passed = $false
    Write-Host ""
    goto Summary
}

$fa = $defaultBehavior.FunctionAssociations
$hasViewerRequest = $false
$spaNameLikely = $false
$attachedArns = @()

if ($fa -and $fa.Quantity -gt 0 -and $fa.Items) {
    foreach ($item in $fa.Items) {
        if ($item.EventType -eq "viewer-request") {
            $hasViewerRequest = $true
            $arn = $item.FunctionARN
            if ($arn) { $attachedArns += $arn }
            if ($arn -match 'function/spaRewrite$' -or $arn -match '(?i)spa.*rewrite|rewrite.*spa') {
                $spaNameLikely = $true
            }
        }
    }
}

if ($hasViewerRequest) {
    Write-Success "Viewer-request function attached on DefaultCacheBehavior"
    if ($attachedArns.Count -gt 0) {
        foreach ($a in $attachedArns) { Write-Detail ("Function ARN: {0}" -f $a) }
    }
    if (-not $spaNameLikely) {
        Write-Warn "Viewer-request function is present but does not look like 'spaRewrite' by name/ARN"
        $warnings++
        if ($Strict) { $passed = $false }
    }
} else {
    Write-Fail "No viewer-request function attached (SPA deep links will fail)"
    Write-Info "Expected: CloudFront Function for SPA path rewriting"
    Write-Info "Fix: Run .\scripts\cloudfront-associate-spa-function.ps1"
    $passed = $false
}
Write-Host ""

# Check 3: CustomErrorResponses
Write-Info "Checking CustomErrorResponses..."
$cer = $distConfig.CustomErrorResponses
$problematic = @()

if ($cer -and $cer.Quantity -gt 0 -and $cer.Items) {
    Write-Detail ("CustomErrorResponses count: {0}" -f $cer.Quantity)
    foreach ($resp in $cer.Items) {
        $errorCode   = $resp.ErrorCode
        $responsePage= $resp.ResponsePagePath
        $responseCode= $resp.ResponseCode
        Write-Detail ("Error {0} -> {1} (status {2})" -f $errorCode, $responsePage, $responseCode)

        if (($errorCode -eq 403 -or $errorCode -eq 404) -and $responsePage -eq "/index.html") {
            $problematic += $resp
        }
    }

    if ($problematic.Count -gt 0) {
        Write-Warn "Found 403/404 mapped to /index.html (masks real errors; prefer viewer-request function)"
        $warnings++
        if ($Strict) { $passed = $false }
    } else {
        Write-Success "No problematic CustomErrorResponses detected"
    }
} else {
    Write-Success "No CustomErrorResponses configured (good for SPA routing)"
}
Write-Host ""

# Check 4: Origin Configuration
Write-Info "Checking origin configuration..."
$origins = $distConfig.Origins
if ($origins -and $origins.Quantity -gt 0 -and $origins.Items) {
    $primaryOrigin = $origins.Items[0]
    $originPath = $primaryOrigin.OriginPath
    $domainName = $primaryOrigin.DomainName

    Write-Detail ("Origin domain: {0}" -f $domainName)
    Write-Detail ("Origin path: '{0}'" -f $originPath)

    if ([string]::IsNullOrEmpty($originPath)) {
        Write-Success "OriginPath is empty (assets served from bucket root)"
    } else {
        Write-Warn ("OriginPath is '{0}' (usually should be empty)" -f $originPath)
        Write-Info "Ensure assets are deployed to bucket root, not a subdirectory"
        $warnings++
        if ($Strict) { $passed = $false }
    }
} else {
    Write-Fail "No origins configured"
    $passed = $false
}
Write-Host ""

# Check 5: Cache behavior for /assets/*
Write-Info "Checking cache behavior for /assets/*..."
$cb = $distConfig.CacheBehaviors
$assetsBehaviorFound = $false
$assetsPatternText = $null

if ($cb -and $cb.Quantity -gt 0 -and $cb.Items) {
    foreach ($beh in $cb.Items) {
        $pattern = $beh.PathPattern
        if ($pattern -eq "/assets/*" -or $pattern -like "*assets*") {
            $assetsBehaviorFound = $true
            $assetsPatternText = $pattern
            break
        }
    }
}

if ($assetsBehaviorFound) {
    Write-Success ("Found dedicated cache behavior: {0}" -f $assetsPatternText)
    Write-Detail "Consider long TTL and immutable caching for assets."
} else {
    Write-Warn "No dedicated cache behavior for /assets/*"
    Write-Info "Recommendation: Add a cache behavior for /assets/* with longer TTL and immutable caching."
    $warnings++
    if ($Strict) { $passed = $false }
}
Write-Host ""

:Summary
# Summary
Write-Host ("=" * 60)
Write-Host ""

if ($passed -and ($warnings -eq 0 -or -not $Strict)) {
    if ($warnings -gt 0) {
        Write-Host "[STATUS] PASSED with warnings ($warnings)" -ForegroundColor Yellow
        Write-Host ""
        Write-Success "Configuration is safe for deployment (with recommendations)."
        Write-Host ""
        Write-Info "Recommended follow-ups:"
        Write-Host "  - Review warnings above and address when convenient."
        Write-Host "  - Test routes/assets with: .\scripts\diagnose-white-screen.ps1"
    } else {
        Write-Host "[STATUS] PASSED" -ForegroundColor Green
        Write-Host ""
        Write-Success "Configuration looks good."
    }
    exit 0
} else {
    Write-Host "[STATUS] FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Fail "Configuration has issues that must be fixed."
    Write-Host ""
    Write-Info "Required fixes:"
    Write-Host "  1) Ensure viewer-request function 'spaRewrite' is attached on DefaultCacheBehavior."
    Write-Host "  2) Set DefaultRootObject to 'index.html'."
    Write-Host "  3) Remove 403/404 -> /index.html error response mappings."
    Write-Host ""
    Write-Info "Docs:"
    Write-Host "  - docs/white-screen-runbook.md"
    Write-Host "  - scripts/cloudfront-associate-spa-function.ps1"
    exit 1
}