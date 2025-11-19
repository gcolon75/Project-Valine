<#
Simplified diagnostic for SPA white screen issues (Windows PowerShell friendly)

Usage:
  .\scripts\diagnose-white-screen.ps1 -Domain dkmxy676d3vgc.cloudfront.net -BundlePath /assets/index-ByXUK-Kj.js
  .\scripts\diagnose-white-screen.ps1 -Domain dkmxy676d3vgc.cloudfront.net   # attempts auto-detect from dist\index.html
#>

param(
  [Parameter(Mandatory = $true)][string]$Domain,
  [Parameter(Mandatory = $false)][string]$BundlePath
)

$ErrorActionPreference = 'Stop'

function HeadRequest {
  param([string]$Path)
  try {
    $u = "https://$Domain$Path"
    if ($u -notmatch '\?') { $u += "?diag=$(Get-Random)" }
    $resp = Invoke-WebRequest -Uri $u -Method Head -UseBasicParsing -ErrorAction Stop
    [PSCustomObject]@{
      Path = $Path
      StatusCode = $resp.StatusCode
      ContentType = ($resp.Headers['Content-Type'] -join ',')
      Cache = ($resp.Headers['Cache-Control'] -join ',')
      XCache = ($resp.Headers['x-cache'] -join ',')
    }
  } catch {
    [PSCustomObject]@{ Path=$Path; StatusCode=0; ContentType=''; Cache=''; XCache=''; Error=$_.Exception.Message }
  }
}

function GetFirstLine {
  param([string]$Path)
  try {
    $u = "https://$Domain$Path"
    if ($u -notmatch '\?') { $u += "?diag=$(Get-Random)" }
    $resp = Invoke-WebRequest -Uri $u -UseBasicParsing -ErrorAction Stop
    ($resp.Content -split "`n")[0].Trim()
  } catch {
    ""
  }
}

# Auto-detect bundle if not provided
if (-not $BundlePath) {
  $idx = Join-Path (Get-Location) 'dist\index.html'
  if (Test-Path $idx) {
    $html = Get-Content $idx -Raw
    $m = Select-String -InputObject $html -Pattern 'assets/index-[A-Za-z0-9_-]+\.js' -AllMatches
    if ($m.Matches.Count -gt 0) {
      $BundlePath = '/' + $m.Matches[0].Value.TrimStart('/')
      Write-Host "Auto-detected bundle: $BundlePath" -ForegroundColor Green
    } else {
      Write-Host "Could not detect bundle in dist/index.html" -ForegroundColor Yellow
    }
  } else {
    Write-Host "dist/index.html not found; skipping auto-detect." -ForegroundColor Yellow
  }
}

$routes = @('/', '/join', '/login', '/feed', '/about', '/settings')
$ok = $true

Write-Host "=== ROUTE CHECKS ===" -ForegroundColor Cyan
foreach ($rPath in $routes) {
  $r = HeadRequest $rPath
  $html = $r.ContentType.ToLower().Contains('text/html')
  Write-Host "[ROUTE] $($r.Path) -> $($r.StatusCode) $($r.ContentType) X-Cache=$($r.XCache)"
  if ($r.StatusCode -ne 200 -or -not $html) {
    Write-Host "  ❌ Expected 200 + text/html" -ForegroundColor Red
    $ok = $false
  } else {
    Write-Host "  ✓ OK" -ForegroundColor Green
  }
}

Write-Host "`n=== MISSING ASSET ===" -ForegroundColor Cyan
$miss = HeadRequest '/assets/__nonexistent__.js'
Write-Host "[ASSET-404] /assets/__nonexistent__.js -> $($miss.StatusCode) $($miss.ContentType)"
if ($miss.StatusCode -ne 404) {
  Write-Host "  ❌ Expected 404" -ForegroundColor Red
  $ok = $false
} else {
  Write-Host "  ✓ OK" -ForegroundColor Green
}

if ($BundlePath) {
  Write-Host "`n=== BUNDLE ===" -ForegroundColor Cyan
  $b = HeadRequest $BundlePath
  Write-Host "[BUNDLE-HEAD] $BundlePath -> $($b.StatusCode) $($b.ContentType) Cache='$($b.Cache)'"
  $mimeOk = $b.ContentType.ToLower().Contains('javascript')
  $cacheOk = $b.Cache.ToLower().Contains('immutable')
  if ($b.StatusCode -ne 200 -or -not $mimeOk -or -not $cacheOk) {
    Write-Host "  ❌ Bundle head mismatch" -ForegroundColor Red
    $ok = $false
  } else {
    Write-Host "  ✓ Head OK" -ForegroundColor Green
  }
  $first = GetFirstLine $BundlePath
  Write-Host "[BUNDLE-FIRST] $($first.Substring(0, [Math]::Min(80, $first.Length)))"
  if ($first.StartsWith('<')) {
    Write-Host "  ❌ Looks like HTML" -ForegroundColor Red
    $ok = $false
  } else {
    Write-Host "  ✓ Content OK" -ForegroundColor Green
  }
} else {
  Write-Host "`nNo bundle provided; skipping bundle checks." -ForegroundColor Yellow
}

if (-not $ok) {
  Write-Host "`nDiagnosis failed. See docs/white-screen-runbook.md" -ForegroundColor Red
  exit 1
}

Write-Host "`n✅ All checks passed" -ForegroundColor Green
exit 0