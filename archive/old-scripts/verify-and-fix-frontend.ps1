<#
.SYNOPSIS
  Verify S3/CloudFront front-end assets and optionally fix common MIME/cache issues and invalidate CloudFront.

.DESCRIPTION
  Read-only checks by default. Use -Fix to re-upload four critical files (index.html, manifest.json,
  theme-init.js, assets/index-CDu5HbqS.js) from the current working directory to S3 (makes sure you
  run -Fix from the frontend build directory). Use -Invalidate to create a CloudFront invalidation after -Fix.
#>

param(
    [Parameter(Mandatory=$true)][string]$Bucket,
    [Parameter(Mandatory=$true)][string]$DistId,
    [switch]$Fix,
    [switch]$Invalidate,
    [switch]$TailLogs,
    [string]$LambdaName = '/aws/lambda/pv-api-prod-observability'
)

function Check-CommandExists {
    param([string]$cmd)
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Error "Command '$cmd' not found. Install it or add to PATH (aws CLI required)."
        exit 1
    }
}

# Ensure aws exists
Check-CommandExists -cmd 'aws'

Write-Host "`n== CloudFront - latest invalidations =="
try {
    $invListJson = aws cloudfront list-invalidations --distribution-id $DistId --output json 2>&1
    $invList = $invListJson | ConvertFrom-Json
    if ($invList.InvalidationList.Items) {
        $invList.InvalidationList.Items | Select-Object Id, CreateTime, Status | Format-Table -AutoSize
    } else {
        Write-Host "No invalidations found."
    }
} catch {
    Write-Warning "Could not list invalidations: $($_.Exception.Message)"
}

# Files to check
$files = @{
    'index.html' = 'text/html';
    'assets/index-CDu5HbqS.js' = 'application/javascript';
    'theme-init.js' = 'application/javascript';
    'manifest.json' = 'application/json';
}

Write-Host "`n== S3 metadata checks =="
foreach ($key in $files.Keys) {
    Write-Host "`nChecking s3://$Bucket/$key ..."
    try {
        $headJson = aws s3api head-object --bucket $Bucket --key $key --region us-west-1 --output json 2>&1
        $head = $headJson | ConvertFrom-Json
        Write-Host "  ContentType: $($head.ContentType)"
        Write-Host "  CacheControl: $($head.CacheControl)"
    } catch {
        Write-Warning ("  HEAD failed for {0}. Object may not exist or permission denied. Error: {1}" -f $key, $($_.Exception.Message))
    }
}

# Verify index.html content and module tag
Write-Host "`n== Checking index.html contents on S3 =="
try {
    $indexHtml = aws s3 cp "s3://$Bucket/index.html" - --region us-west-1 2>$null
    if ($indexHtml) {
        $indexPreview = $indexHtml -split "`n" | Select-Object -First 40
        Write-Host "First 40 lines of index.html (from S3):"
        $indexPreview | ForEach-Object { Write-Host "  $_" }
        if ($indexHtml -match 'type="module"\s+src="\/assets\/index-.*\.js"') {
            Write-Host "`nindex.html has a proper module tag."
        } else {
            Write-Warning "index.html MAY be malformed: module tag not found or not matching expected pattern. Look for stray 'C:\' or 'cd ' in script tags."
        }
    } else {
        Write-Warning "Could not download index.html from S3."
    }
} catch {
    Write-Warning ("Error downloading index.html: {0}" -f $($_.Exception.Message))
}

# CloudFront HEAD + first line fetch for the main bundle
$cfDomain = 'dkmxy676d3vgc.cloudfront.net'
$bundlePath = "/assets/index-CDu5HbqS.js"

Write-Host "`n== CloudFront checks (no-cache fetch) =="
try {
    Write-Host "HEAD request to https://$cfDomain$bundlePath"
    $headResp = Invoke-WebRequest -Uri "https://$cfDomain$bundlePath" -Method Head -Headers @{ 'Cache-Control' = 'no-cache' } -UseBasicParsing -ErrorAction Stop
    Write-Host "  StatusCode: $($headResp.StatusCode)"
    Write-Host "  Content-Type: $($headResp.Headers['content-type'])"
} catch {
    Write-Warning ("HEAD request failed: {0}" -f $($_.Exception.Message))
}

try {
    Write-Host "`nGET first line (should be JS, not HTML):"
    $firstLine = (Invoke-WebRequest -Uri "https://$cfDomain$bundlePath" -Headers @{ 'Cache-Control' = 'no-cache' } -UseBasicParsing -ErrorAction Stop).Content.Split("`n")[0]
    Write-Host "  $firstLine"
    if ($firstLine.Trim().StartsWith("<")) {
        Write-Warning "  First line starts with '<' — CloudFront is serving HTML for the bundle. Re-check S3 metadata or re-upload files."
    } else {
        Write-Host "  First line looks like JS. Good."
    }
} catch {
    Write-Warning ("GET failed or timed out: {0}" -f $($_.Exception.Message))
}

# Validate manifest.json
Write-Host "`n== manifest.json validation =="
try {
    $manifestRaw = aws s3 cp "s3://$Bucket/manifest.json" - --region us-west-1 2>$null
    try {
        $manifestRaw | ConvertFrom-Json | Out-Null
        Write-Host "manifest.json is valid JSON."
    } catch {
        Write-Warning "manifest.json is NOT valid JSON (or contains HTML). Content (first 6 lines):"
        ($manifestRaw -split "`n")[0..5] | ForEach-Object { Write-Host "  $_" }
    }
} catch {
    Write-Warning ("Could not fetch manifest.json: {0}" -f $($_.Exception.Message))
}

# Optionally re-upload files with correct content-types
if ($Fix) {
    Write-Host "`n== Re-uploading files with correct Content-Type and Cache-Control =="
    foreach ($k in $files.Keys) {
        $localPath = Join-Path (Get-Location) $k
        if (-Not (Test-Path $localPath)) {
            Write-Warning ("Local file missing: {0} — skipping re-upload. Make sure you run this from your frontend build directory." -f $localPath)
            continue
        }
        $ctype = $files[$k]
        $cacheCtrl = if ($k -eq 'index.html') { "no-cache, must-revalidate" } else { "public, max-age=31536000, immutable" }
        Write-Host ("Uploading {0} -> s3://{1}/{2} as {3} (CacheControl: {4})" -f $localPath, $Bucket, $k, $ctype, $cacheCtrl)
        try {
            aws s3 cp $localPath "s3://$Bucket/$k" --region us-west-1 --content-type $ctype --cache-control $cacheCtrl --metadata-directive REPLACE | Out-Null
            Write-Host "  Uploaded."
        } catch {
            Write-Warning ("  Upload failed for {0}: {1}" -f $k, $($_.Exception.Message))
        }
    }
}

# Optionally create an invalidation
if ($Invalidate) {
    Write-Host "`n== Creating CloudFront invalidation for /* =="
    try {
        $inv = aws cloudfront create-invalidation --distribution-id $DistId --paths "/*" --output json 2>&1 | ConvertFrom-Json
        Write-Host ("Created invalidation: {0} Status: {1}" -f $inv.Invalidation.Id, $inv.Invalidation.Status)
    } catch {
        Write-Warning ("Could not create invalidation: {0}" -f $($_.Exception.Message))
    }
}

# Optionally tail CloudWatch logs for observability lambda
if ($TailLogs) {
    Check-CommandExists -cmd 'aws'
    Write-Host "`n== Tailing CloudWatch logs for $LambdaName (Ctrl+C to stop) =="
    try {
        aws logs tail $LambdaName --since 10m --follow --region us-west-2
    } catch {
        Write-Warning ("aws logs tail failed: {0}" -f $($_.Exception.Message))
    }
}

Write-Host "`n== Done. Review warnings above and re-run with -Fix -Invalidate if you uploaded files. ==`n"
