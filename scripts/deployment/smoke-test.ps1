param(
  [string]$ApiBase = "https://ce73w43mga.execute-api.us-west-2.amazonaws.com",
  [string]$FrontendUrl = "https://dkmxy676d3vgc.cloudfront.net"
)

$passed = 0
$total = 4

function Test-Endpoint {
  param([string]$Label, [string]$Url, [int[]]$ExpectedCodes)
  try {
    $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    $code = $response.StatusCode
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    if (-not $code) { $code = 0 }
  }
  if ($ExpectedCodes -contains $code) {
    Write-Host "  ✅ PASS  $Label  (HTTP $code)"
    return $true
  } else {
    Write-Host "  ❌ FAIL  $Label  (HTTP $code, expected $($ExpectedCodes -join ' or '))"
    return $false
  }
}

Write-Host ""
Write-Host "========================================="
Write-Host "  Project Valine — Smoke Test Checklist"
Write-Host "========================================="
Write-Host ""

if (Test-Endpoint "Health check"           "$ApiBase/health"   @(200))       { $passed++ }
if (Test-Endpoint "Auth/me (401 expected)" "$ApiBase/auth/me"  @(401))       { $passed++ }
if (Test-Endpoint "Posts endpoint"         "$ApiBase/posts"    @(200, 401))  { $passed++ }
if (Test-Endpoint "CloudFront frontend"    $FrontendUrl        @(200))       { $passed++ }

Write-Host ""
Write-Host "-----------------------------------------"
Write-Host "  Result: $passed/$total checks passed"
Write-Host "-----------------------------------------"

if ($passed -eq $total) {
  Write-Host "  ✅ ALL CHECKS PASSED — safe to deploy" -ForegroundColor Green
  exit 0
} else {
  Write-Host "  ❌ SOME CHECKS FAILED — do NOT deploy" -ForegroundColor Red
  exit 1
}
