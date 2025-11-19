# Assert HTTP Headers Script (Windows PowerShell 5.1 compatible)
# ASCII-only output for maximum compatibility
#
# Validates that critical security and caching headers are present
#
# Usage:
#   .\scripts\assert-headers.ps1 -Domain example.com
#   .\scripts\assert-headers.ps1 -Domain example.com -Bundle "/assets/index-xyz.js"
#   .\scripts\assert-headers.ps1 -Domain example.com -Strict
#
# Notes:
# - Uses ASCII characters only (no emoji/unicode)
# - Windows PowerShell 5.1 safe
# - Accepts both application/javascript and text/javascript but warns about text/javascript

param(
    [string]$Domain,
    [string]$Bundle,
    [switch]$Strict,
    [switch]$ShowDetails,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

if ($Help) {
    Write-Host ""
    Write-Host "Assert HTTP Headers Script" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\scripts\assert-headers.ps1 -Domain example.com"
    Write-Host "  .\scripts\assert-headers.ps1 -Domain example.com -Bundle ""/assets/index-xyz.js"""
    Write-Host "  .\scripts\assert-headers.ps1 -Domain example.com -Strict"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Domain <domain>    Domain to check (required)"
    Write-Host "  -Bundle <path>      Bundle path to check (optional)"
    Write-Host "  -Strict             Exit with error if any header is missing"
    Write-Host "  -ShowDetails        Show detailed output"
    Write-Host "  -Help               Show this help message"
    Write-Host ""
    exit 0
}

if ([string]::IsNullOrEmpty($Domain)) {
    Write-Host ""
    Write-Host "Error: -Domain is required" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\scripts\assert-headers.ps1 -Domain example.com"
    Write-Host "  .\scripts\assert-headers.ps1 -Help"
    Write-Host ""
    exit 1
}

function Write-Success { param($msg) Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Fail    { param($msg) Write-Host "[FAIL]  $msg" -ForegroundColor Red }
function Write-Warn    { param($msg) Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Info    { param($msg) Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Write-Detail  { param($msg) if ($ShowDetails) { Write-Host "        $msg" -ForegroundColor Gray } }

# Ensure domain has protocol
if ($Domain -notmatch '^https?://') {
    $Domain = "https://$Domain"
}

Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "HTTP Headers Assertion Tool (PowerShell)" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host ""
Write-Host "Domain: $Domain"
if ($Bundle) { Write-Host "Bundle: $Bundle" }
Write-Host ("Mode:   " + $(if ($Strict) { "STRICT" } else { "NORMAL" }))
Write-Host ""

$allPassed = $true

# Helper function to check header
function Test-Header {
    param(
        [string]$Url,
        [string]$HeaderName,
        [bool]$Required,
        [string]$ExpectedValue = ""
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Head -UseBasicParsing -ErrorAction Stop
        $headerValue = $response.Headers[$HeaderName]
        
        if ($headerValue) {
            if ([string]::IsNullOrEmpty($ExpectedValue)) {
                Write-Success "$HeaderName : $headerValue"
            } else {
                if ($headerValue -match $ExpectedValue) {
                    Write-Success "$HeaderName : $headerValue"
                } else {
                    Write-Warn "$HeaderName : $headerValue"
                    Write-Detail "Expected: $ExpectedValue"
                    if ($Required) {
                        $script:allPassed = $false
                    }
                }
            }
        } else {
            if ($Required) {
                Write-Fail "$HeaderName : MISSING"
                $script:allPassed = $false
            } else {
                Write-Warn "$HeaderName : MISSING (optional)"
            }
        }
    } catch {
        Write-Fail "Failed to fetch headers from ${Url}: $_"
        $script:allPassed = $false
        return $false
    }
    
    return $true
}

# Test index.html headers
Write-Info "Testing index.html headers..."
$indexUrl = $Domain
if (-not (Test-Header -Url $indexUrl -HeaderName "Content-Type" -Required $true -ExpectedValue "text/html")) {
    Write-Host ""
    exit 1
}
Test-Header -Url $indexUrl -HeaderName "Cache-Control" -Required $true -ExpectedValue "no-cache"
Test-Header -Url $indexUrl -HeaderName "X-Content-Type-Options" -Required $true -ExpectedValue "nosniff"
Test-Header -Url $indexUrl -HeaderName "X-Frame-Options" -Required $true -ExpectedValue "(DENY|SAMEORIGIN)"
Write-Host ""

# Test bundle headers if bundle path provided
if ($Bundle) {
    Write-Info "Testing bundle headers..."
    $bundleUrl = $Domain.TrimEnd('/') + $Bundle
    
    if (-not (Test-Header -Url $bundleUrl -HeaderName "Content-Type" -Required $true)) {
        Write-Host ""
        exit 1
    }
    
    # Check if content-type is application/javascript or text/javascript
    try {
        $response = Invoke-WebRequest -Uri $bundleUrl -Method Head -UseBasicParsing -ErrorAction Stop
        $contentType = $response.Headers["Content-Type"]
        
        if ($contentType -match "application/javascript") {
            Write-Success "Content-Type: $contentType (preferred)"
        } elseif ($contentType -match "text/javascript") {
            Write-Warn "Content-Type: $contentType (prefer application/javascript)"
            Write-Detail "Both are valid, but application/javascript is the modern standard"
        } else {
            Write-Fail "Content-Type: $contentType (expected JavaScript MIME type)"
            $allPassed = $false
        }
    } catch {
        Write-Fail "Failed to check bundle Content-Type: $_"
        $allPassed = $false
    }
    
    Test-Header -Url $bundleUrl -HeaderName "Cache-Control" -Required $true -ExpectedValue "immutable"
    Write-Host ""
}

# Security headers
Write-Info "Testing security headers..."
Test-Header -Url $indexUrl -HeaderName "Strict-Transport-Security" -Required $true -ExpectedValue "max-age="
Test-Header -Url $indexUrl -HeaderName "Referrer-Policy" -Required $false
Test-Header -Url $indexUrl -HeaderName "Permissions-Policy" -Required $false
Write-Host ""

# CloudFront headers (optional)
Write-Info "Testing CloudFront headers (if applicable)..."
Test-Header -Url $indexUrl -HeaderName "X-Cache" -Required $false
Test-Header -Url $indexUrl -HeaderName "X-Amz-Cf-Id" -Required $false
Test-Header -Url $indexUrl -HeaderName "X-Amz-Cf-Pop" -Required $false
Write-Host ""

# Summary
Write-Host ("=" * 60) -ForegroundColor Cyan
if ($allPassed) {
    Write-Success "All required headers present"
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host ""
    exit 0
} else {
    Write-Fail "Some required headers are missing"
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host ""
    
    if ($Strict) {
        Write-Warn "Fix these issues and try again"
        exit 1
    } else {
        Write-Warn "Run with -Strict to enforce all checks"
        exit 0
    }
}
