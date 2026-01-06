# Post-Deploy Smoke Test Script
# Tests critical endpoints after deployment to verify the API is functional
# Usage: powershell -ExecutionPolicy Bypass -File scripts/post-deploy-smoke-test.ps1 -ApiUrl <url> [-Stage <stage>]
#
# Compatible with PowerShell 5.1+ (Windows PowerShell and PowerShell Core)

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiUrl,
    
    [string]$Stage = "prod"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Post-Deploy Smoke Tests" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API URL: $ApiUrl"
Write-Host "Stage:   $Stage"
Write-Host ""

$TestsPassed = 0
$TestsFailed = 0

# Helper function to test an endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    Write-Host "  URL: $Url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method $Method -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host "  ✓ PASS - Status: $($response.StatusCode)" -ForegroundColor Green
            $script:TestsPassed++
            return $true
        } else {
            Write-Host "  ✗ FAIL - Expected: $ExpectedStatus, Got: $($response.StatusCode)" -ForegroundColor Red
            $script:TestsFailed++
            return $false
        }
    } catch {
        # Check if this is an HTTP error response
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            if ($statusCode -eq $ExpectedStatus) {
                Write-Host "  ✓ PASS - Status: $statusCode (via exception)" -ForegroundColor Green
                $script:TestsPassed++
                return $true
            } else {
                Write-Host "  ✗ FAIL - Expected: $ExpectedStatus, Got: $statusCode" -ForegroundColor Red
                Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
                $script:TestsFailed++
                return $false
            }
        } else {
            Write-Host "  ✗ FAIL - Request failed: $($_.Exception.Message)" -ForegroundColor Red
            $script:TestsFailed++
            return $false
        }
    }
    
    Write-Host ""
}

# Normalize API URL (remove trailing slash)
$ApiUrl = $ApiUrl.TrimEnd('/')

Write-Host "Running smoke tests..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Health endpoint
Test-Endpoint -Name "Health Check" -Url "$ApiUrl/health" -Method "GET" -ExpectedStatus 200

# Test 2: Meta endpoint
Test-Endpoint -Name "Meta Endpoint" -Url "$ApiUrl/meta" -Method "GET" -ExpectedStatus 200

# Summary
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Smoke Test Results" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Passed: $TestsPassed" -ForegroundColor Green
Write-Host "Failed: $TestsFailed" -ForegroundColor Red
Write-Host ""

if ($TestsFailed -gt 0) {
    Write-Host "❌ SMOKE TESTS FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "Some endpoints are not responding as expected." -ForegroundColor Red
    Write-Host "Check CloudWatch logs for details:" -ForegroundColor Yellow
    Write-Host "  aws logs tail /aws/lambda/pv-api-$Stage-health --follow" -ForegroundColor Gray
    Write-Host ""
    exit 1
} else {
    Write-Host "✅ ALL SMOKE TESTS PASSED" -ForegroundColor Green
    Write-Host ""
    Write-Host "The API is responding correctly to basic health checks." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Test authentication in browser: https://dkmxy676d3vgc.cloudfront.net" -ForegroundColor Gray
    Write-Host "  2. Run: cd serverless && .\scripts\audit-lambda-env.ps1 -Stage $Stage" -ForegroundColor Gray
    Write-Host "  3. Check for 401 errors in CloudWatch logs" -ForegroundColor Gray
    Write-Host ""
    exit 0
}
