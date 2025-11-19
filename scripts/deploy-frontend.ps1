<#
Deploy Frontend Script (Windows PowerShell 5.1 compatible)

Usage:
  .\scripts\deploy-frontend.ps1 -Bucket valine-frontend-prod -DistributionId E16LPJDBIL5DEE
Optional:
  -SkipBuild       (skips npm build / SRI steps if already built)
  -RetentionDays 7 (change retention window)
  -DryRun          (show intended actions only)
  -InvalidateAll   (use "/*" instead of targeted invalidation)
  -RepairHeaders   (repair metadata for existing hashed bundles in S3)
  -Profile myAwsProfile (AWS CLI --profile usage)
#>

param(
  [Parameter(Mandatory = $true)][string]$Bucket,
  [Parameter(Mandatory = $true)][string]$DistributionId,
  [int]$RetentionDays = 7,
  [switch]$SkipBuild,
  [switch]$DryRun,
  [switch]$InvalidateAll,
  [switch]$RepairHeaders,
  [string]$Profile
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg)  { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Warn($msg)  { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)   { Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Success($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }

function Run-Cmd($cmd, $failMessage) {
  Write-Info $cmd
  $exit = 0
  cmd /c $cmd
  $exit = $LASTEXITCODE
  if ($exit -ne 0) {
    throw "$failMessage (exit $exit)"
  }
}

# Resolve AWS CLI profile flag
$ProfileFlag = ""
if ($Profile) { $ProfileFlag = "--profile $Profile" }

# 1. Build + SRI (unless skipped)
if (-not $SkipBuild) {
  Write-Info "Running build + SRI generation"
  if (-not $DryRun) {
    Run-Cmd "npm run build:sri" "Build/SRI failed"
    Run-Cmd "npm run verify:sri" "SRI verification failed"
  } else {
    Write-Info "DryRun: would run 'npm run build:sri' and 'npm run verify:sri'"
  }
} else {
  Write-Warn "Skipping build (SkipBuild specified)"
}

$DistDir = Join-Path (Get-Location) "dist"
if (-not (Test-Path $DistDir)) {
  Write-Err "Dist directory not found: $DistDir"
  exit 1
}

# 2. Extract current main JS bundle & CSS from index.html
$IndexPath = Join-Path $DistDir "index.html"
if (-not (Test-Path $IndexPath)) {
  Write-Err "index.html not found at $IndexPath"
  exit 1
}

$indexHtml = Get-Content -Path $IndexPath -Raw
$bundleMatch = Select-String -InputObject $indexHtml -Pattern '/assets/index-[A-Za-z0-9_-]+\.js' -AllMatches
$cssMatch    = Select-String -InputObject $indexHtml -Pattern '/assets/index-[A-Za-z0-9_-]+\.css' -AllMatches

if ($bundleMatch.Matches.Count -eq 0) {
  Write-Err "No JS bundle match found in index.html"
  exit 1
}
$MainJs = $bundleMatch.Matches[0].Value
Write-Info "Main JS bundle: $MainJs"

if ($cssMatch.Matches.Count -eq 0) {
  Write-Warn "No CSS bundle found (continuing)"
  $MainCss = $null
} else {
  $MainCss = $cssMatch.Matches[0].Value
  Write-Info "Main CSS bundle: $MainCss"
}

# 3. Upload dist files
Write-Info "Uploading dist files to s3://$Bucket"
# Content-Type mapping helper
function Get-ContentType($file) {
  $ext = ([System.IO.Path]::GetExtension($file)).ToLower()
  switch ($ext) {
    ".html" { "text/html; charset=utf-8" }
    ".js"   { "application/javascript; charset=utf-8" }
    ".css"  { "text/css; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".txt"  { "text/plain; charset=utf-8" }
    ".svg"  { "image/svg+xml" }
    ".png"  { "image/png" }
    ".jpg"  { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".webp" { "image/webp" }
    ".ico"  { "image/x-icon" }
    default { "binary/octet-stream" }
  }
}

# Cache-Control rules:
# index.html: no-cache
# hashed assets: immutable
# others: public,max-age=3600
function Get-CacheControl($file) {
  $name = [System.IO.Path]::GetFileName($file)
  if ($name -eq "index.html") { return "no-cache, must-revalidate" }
  if ($name -match 'index-[A-Za-z0-9_-]+\.(js|css)') { return "public, max-age=31536000, immutable" }
  return "public, max-age=3600"
}

$uploads = Get-ChildItem -Path $DistDir -Recurse -File
foreach ($f in $uploads) {
  # Relative file path from dist\
  $rel = $f.FullName.Substring($DistDir.Length).TrimStart('\','/')
  # Normalize to forward slashes for S3 keys
  $key = ($rel -replace '\\','/')

  $ct = Get-ContentType $f.FullName
  $cc = Get-CacheControl $key
  Write-Info ("Upload: {0}  CT={1}  CC={2}" -f $key, $ct, $cc)

  if ($DryRun) {
    Write-Info "DryRun: would upload $key"
  } else {
    aws s3api put-object `
      --bucket $Bucket `
      --key "$key" `
      --body "$($f.FullName)" `
      --content-type "$ct" `
      --cache-control "$cc" `
      $ProfileFlag | Out-Null
  }
}

# Retention (ensure current set uses normalized forward-slash keys)
$currentSet = @()
$currentSet += ($MainJs.TrimStart('/'))
if ($MainCss) { $currentSet += ($MainCss.TrimStart('/')) }
# Normalize current set too (defensive)
$currentSet = $currentSet | ForEach-Object { $_ -replace '\\','/' }

# Safety guard: verify current bundle exists in S3 before pruning
Write-Info "Verifying current bundle exists in S3..."
$mainJsKey = $MainJs.TrimStart('/')
try {
  if (-not $DryRun) {
    $headResult = aws s3api head-object --bucket $Bucket --key "$mainJsKey" $ProfileFlag 2>&1
    if ($LASTEXITCODE -ne 0) {
      Write-Err "Current main JS bundle not found in S3: $mainJsKey"
      Write-Err "Aborting pruning to avoid deleting wrong bundles"
      Write-Err "This may indicate a mismatch between dist/index.html and S3 state"
      exit 1
    }
    Write-Success "Current bundle verified in S3: $mainJsKey"
  } else {
    Write-Info "DryRun: would verify bundle existence"
  }
} catch {
  Write-Err "Failed to verify current bundle: $_"
  exit 1
}

# 4. Retention Pruning (exclude current main bundles)
Write-Info "Retention pruning (older than $RetentionDays days)"
$cutoff = (Get-Date).AddDays(-$RetentionDays)
$allBundles = aws s3api list-objects-v2 --bucket $Bucket --prefix assets/index- --query "Contents[].{Key:Key,LastModified:LastModified}" --output json $ProfileFlag | ConvertFrom-Json

if ($null -eq $allBundles) {
  Write-Warn "No bundles returned from S3 listing"
  $allBundles = @()
}

$currentSet = @()
$currentSet += ($MainJs.TrimStart('/'))
if ($MainCss) { $currentSet += ($MainCss.TrimStart('/')) }

$pruneList = @()
foreach ($b in $allBundles) {
  $lm = Get-Date $b.LastModified
  $key = $b.Key
  if ($currentSet -contains $key) { continue }
  if ($lm -lt $cutoff) { $pruneList += $key }
}

if ($pruneList.Count -gt 0) {
  Write-Info "Prunable bundles (excluding current):"
  $pruneList | ForEach-Object { Write-Host "  $_" }
  if (-not $DryRun) {
    foreach ($p in $pruneList) {
      Write-Info "Deleting old bundle: $p"
      aws s3api delete-object --bucket $Bucket --key "$p" $ProfileFlag | Out-Null
    }
  } else {
    Write-Info "DryRun: skipping deletion"
  }
} else {
  Write-Info "No bundles eligible for pruning"
}

# Optional: Repair headers for existing bundles
if ($RepairHeaders) {
  Write-Info "RepairHeaders mode: fixing metadata for existing hashed bundles"
  $repairList = aws s3api list-objects-v2 --bucket $Bucket --prefix assets/index- --query "Contents[].Key" --output json $ProfileFlag | ConvertFrom-Json
  
  if ($null -eq $repairList) {
    Write-Warn "No bundles found to repair"
  } else {
    foreach ($key in $repairList) {
      if ($key -match 'index-[A-Za-z0-9_-]+\.(js|css)$') {
        $ext = $key.Substring($key.LastIndexOf('.'))
        $ct = if ($ext -eq ".js") { "application/javascript; charset=utf-8" } else { "text/css; charset=utf-8" }
        $cc = "public, max-age=31536000, immutable"
        
        Write-Info "Repairing: $key -> CT=$ct, CC=$cc"
        if (-not $DryRun) {
          aws s3api copy-object `
            --bucket $Bucket `
            --copy-source "$Bucket/$key" `
            --key "$key" `
            --content-type "$ct" `
            --cache-control "$cc" `
            --metadata-directive REPLACE `
            $ProfileFlag | Out-Null
        } else {
          Write-Info "DryRun: would repair $key"
        }
      }
    }
    Write-Success "Header repair complete"
  }
  Write-Host ""
}

# 5. CloudFront invalidation
Write-Info "Creating CloudFront invalidation"
$paths = @("/index.html", $MainJs)
if ($MainCss) { $paths += $MainCss }
$paths += "/theme-init.js"

if ($InvalidateAll) {
  Write-Warn "InvalidateAll specified: invalidating /* (expensive)"
  $paths = @("/*")
}

Write-Info "Paths to invalidate:"
$paths | ForEach-Object { Write-Host "  $_" }

if (-not $DryRun) {
  $pathsJson = ($paths | ForEach-Object { '"' + $_ + '"' }) -join ", "
  $invPayload = "{""Paths"":{""Quantity"":$($paths.Count),""Items"":[ $pathsJson ]},""CallerReference"":""deploy-$(Get-Random)""}"
  $tmpFile = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllText($tmpFile, $invPayload, (New-Object System.Text.UTF8Encoding($false)))

  aws cloudfront create-invalidation `
    --distribution-id $DistributionId `
    --invalidation-batch "file://$tmpFile" `
    $ProfileFlag | Out-Null

  Remove-Item $tmpFile -ErrorAction SilentlyContinue
  Write-Info "Invalidation created."
} else {
  Write-Info "DryRun: skipping invalidation"
}

Write-Info "Deploy complete."
exit 0