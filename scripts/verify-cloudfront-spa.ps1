#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Verifies that the CloudFront distribution is configured correctly for SPA deep-link routing.

.DESCRIPTION
    Checks:
    1. A viewer-request CloudFront Function is attached (preferred SPA routing mechanism).
    2. Warns if legacy custom error responses (403/404 → /index.html) are still active
       — they should be removed in favour of the CloudFront Function.

    The correct SPA routing approach is:
      infra/cloudfront/functions/spaRewrite.js  (viewer-request CloudFront Function)

    NOT global 403/404 → /index.html custom error responses.

.PARAMETER DistributionId
    CloudFront distribution ID to check. Defaults to E16LPJDBIL5DEE.

.EXAMPLE
    ./scripts/verify-cloudfront-spa.ps1
    ./scripts/verify-cloudfront-spa.ps1 -DistributionId E16LPJDBIL5DEE
#>

param(
    [string]$DistributionId = "E16LPJDBIL5DEE"
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  CloudFront SPA Deep-Link Verification" -ForegroundColor Cyan
Write-Host "  Distribution: $DistributionId" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# ---------------------------------------------------------------------------
# Fetch distribution config
# ---------------------------------------------------------------------------
Write-Host "Fetching distribution config from AWS..." -ForegroundColor Gray

try {
    $configJson = aws cloudfront get-distribution-config --id $DistributionId 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAIL  Could not fetch distribution config." -ForegroundColor Red
        Write-Host "      AWS error: $configJson" -ForegroundColor Red
        Write-Host ""
        Write-Host "Ensure AWS CLI is configured and you have cloudfront:GetDistributionConfig permission." -ForegroundColor Yellow
        exit 1
    }
    $config = $configJson | ConvertFrom-Json
} catch {
    Write-Host "FAIL  Failed to parse distribution config: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$distributionConfig = $config.DistributionConfig

# ---------------------------------------------------------------------------
# Check 1: Viewer-request CloudFront Function attached
# ---------------------------------------------------------------------------
Write-Host "Check 1: Viewer-request CloudFront Function attached" -ForegroundColor White

$functionAttached = $false
$defaultCacheBehavior = $distributionConfig.DefaultCacheBehavior

if ($defaultCacheBehavior.FunctionAssociations -and
    $defaultCacheBehavior.FunctionAssociations.Items -and
    $defaultCacheBehavior.FunctionAssociations.Items.Count -gt 0) {

    foreach ($assoc in $defaultCacheBehavior.FunctionAssociations.Items) {
        if ($assoc.EventType -eq "viewer-request") {
            $functionAttached = $true
            Write-Host "  PASS  Viewer-request function attached: $($assoc.FunctionARN)" -ForegroundColor Green
        }
    }
}

if (-not $functionAttached) {
    Write-Host "  FAIL  No viewer-request CloudFront Function is attached to the default cache behavior." -ForegroundColor Red
    Write-Host "        Action required:" -ForegroundColor Yellow
    Write-Host "          1. Deploy the function: infra/cloudfront/functions/spaRewrite.js" -ForegroundColor Yellow
    Write-Host "          2. Associate it with distribution $DistributionId as a viewer-request function." -ForegroundColor Yellow
    Write-Host "          3. Re-run this script to verify." -ForegroundColor Yellow
    $allPassed = $false
}

# ---------------------------------------------------------------------------
# Check 2: Warn if legacy custom error responses (403/404 → /index.html) are active
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "Check 2: Legacy custom error responses (403/404 → /index.html) removed" -ForegroundColor White

$legacyErrorResponses = @()

if ($distributionConfig.CustomErrorResponses -and
    $distributionConfig.CustomErrorResponses.Items -and
    $distributionConfig.CustomErrorResponses.Items.Count -gt 0) {

    foreach ($resp in $distributionConfig.CustomErrorResponses.Items) {
        if (($resp.ErrorCode -eq 403 -or $resp.ErrorCode -eq 404) -and
            $resp.ResponsePagePath -eq "/index.html") {
            $legacyErrorResponses += $resp.ErrorCode
        }
    }
}

if ($legacyErrorResponses.Count -gt 0) {
    Write-Host "  WARN  Legacy custom error responses still active for: $($legacyErrorResponses -join ', ') → /index.html" -ForegroundColor Yellow
    Write-Host "        These should be REMOVED now that the CloudFront Function handles SPA routing." -ForegroundColor Yellow
    Write-Host "        Having both active is redundant and may cause unexpected behaviour." -ForegroundColor Yellow
    Write-Host "        Action: Remove the custom error responses from distribution $DistributionId." -ForegroundColor Yellow
} else {
    Write-Host "  PASS  No legacy custom error responses (403/404 → /index.html) detected." -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "  RESULT: PASS — SPA routing is correctly configured." -ForegroundColor Green
} else {
    Write-Host "  RESULT: FAIL — Manual action required (see above)." -ForegroundColor Red
}
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

if (-not $allPassed) {
    exit 1
}
exit 0
