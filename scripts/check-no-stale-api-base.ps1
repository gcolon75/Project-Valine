#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Check for stale or incorrect API base references in the repository

.DESCRIPTION
    This script scans the repository for:
    1. Old/stale API base URL (wkndtj22ab.execute-api.us-west-2.amazonaws.com)
    2. Hardcoded execute-api URLs in /docs that don't match .deploy/last-api-base.txt
    3. Incorrect environment variable names (VITE_API_BASE_URL instead of VITE_API_BASE)
    
    Fails if any issues are found, making this suitable for CI/CD pipelines.

.PARAMETER FixMode
    If specified, attempts to auto-fix issues where possible (not yet implemented)

.EXAMPLE
    .\scripts\check-no-stale-api-base.ps1
    Checks for stale API base references and exits with code 1 if found

.EXAMPLE
    # In CI/CD pipeline
    .\scripts\check-no-stale-api-base.ps1
    if ($LASTEXITCODE -ne 0) { exit 1 }

.NOTES
    Exit codes:
    0 = Success (no stale references found)
    1 = Error (stale references found or check failed)
    
    This script should be run before releasing to production.
#>

param(
    [switch]$FixMode = $false
)

$ErrorActionPreference = "Stop"

# Output functions
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Ok { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red }

# Get repository root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Stale API Base Reference Check          " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

$issuesFound = 0

# Check 1: Scan for old wknd API base
Write-Info "Check 1: Scanning for old API base references (wkndtj22ab)..."
$oldApiBase = "wkndtj22ab.execute-api.us-west-2.amazonaws.com"

# Search in relevant files (exclude archive, node_modules, .git)
$searchPaths = @(
    "docs/*.md",
    "scripts/*.ps1",
    "scripts/*.js",
    "scripts/*.sh",
    "*.md",
    ".env.production"
)

$foundMatches = @()
foreach ($pattern in $searchPaths) {
    $fullPattern = Join-Path $RepoRoot $pattern
    $files = Get-ChildItem -Path $fullPattern -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        # Skip if file is in archive
        if ($file.FullName -match "\\archive\\") {
            continue
        }
        
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if ($content -match $oldApiBase) {
            $foundMatches += $file.FullName
            Write-Err "Found old API base in: $($file.FullName)"
            $issuesFound++
        }
    }
}

if ($foundMatches.Count -eq 0) {
    Write-Ok "No old wknd API base references found in active files"
} else {
    Write-Err "Found $($foundMatches.Count) file(s) with old API base"
}

Write-Host ""

# Check 2: Verify docs use placeholders or match .deploy/last-api-base.txt
Write-Info "Check 2: Checking for hardcoded API bases in /docs..."

$correctApiBase = $null
$apiBaseFile = Join-Path $RepoRoot ".deploy\last-api-base.txt"
if (Test-Path $apiBaseFile) {
    $correctApiBase = (Get-Content $apiBaseFile -Raw).Trim()
    Write-Info "Expected API base from .deploy/last-api-base.txt: $correctApiBase"
} else {
    Write-Warn ".deploy/last-api-base.txt not found - skipping hardcoded API check"
}

if ($correctApiBase) {
    # Search for hardcoded execute-api URLs in /docs
    $docsPath = Join-Path $RepoRoot "docs"
    if (Test-Path $docsPath) {
        $docFiles = Get-ChildItem -Path $docsPath -Filter "*.md" -Recurse | Where-Object { 
            $_.FullName -notmatch "\\archive\\" 
        }
        
        $hardcodedIssues = @()
        foreach ($file in $docFiles) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            
            # Find all execute-api URLs
            $executeApiMatches = [regex]::Matches($content, "https://([a-z0-9]+)\.execute-api\.us-west-2\.amazonaws\.com")
            
            foreach ($match in $executeApiMatches) {
                $foundUrl = $match.Value
                
                # Check if it's a placeholder pattern (with angle brackets or description)
                $isPlaceholder = $content -match "https://<[^>]+>\.execute-api" -or 
                                 $content -match "\{api-id\}" -or
                                 $content -match "<api-id>" -or
                                 $foundUrl -match "example" -or
                                 $foundUrl -match "your-api"
                
                if (-not $isPlaceholder -and $foundUrl -ne $correctApiBase) {
                    $hardcodedIssues += "$($file.Name): $foundUrl"
                    Write-Err "Hardcoded incorrect API base in $($file.Name): $foundUrl"
                    $issuesFound++
                }
            }
        }
        
        if ($hardcodedIssues.Count -eq 0) {
            Write-Ok "No hardcoded incorrect API bases found in /docs"
        } else {
            Write-Err "Found $($hardcodedIssues.Count) hardcoded incorrect API base(s)"
        }
    }
}

Write-Host ""

# Check 3: Check for wrong environment variable name
Write-Info "Check 3: Checking for incorrect env var name (should be VITE_API_BASE)..."

$wrongVarName = "VITE_API_BASE_URL"
$correctVarName = "VITE_API_BASE"

$wrongVarMatches = @()
foreach ($pattern in $searchPaths) {
    $fullPattern = Join-Path $RepoRoot $pattern
    $files = Get-ChildItem -Path $fullPattern -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        # Skip if file is in archive
        if ($file.FullName -match "\\archive\\") {
            continue
        }
        
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if ($content -match $wrongVarName) {
            $wrongVarMatches += $file.FullName
            Write-Err "Found incorrect variable name in: $($file.FullName)"
            $issuesFound++
        }
    }
}

if ($wrongVarMatches.Count -eq 0) {
    Write-Ok "No incorrect VITE_API_BASE_URL usage found"
} else {
    Write-Err "Found $($wrongVarMatches.Count) file(s) using VITE_API_BASE_URL instead of $correctVarName"
}

Write-Host ""

# Summary
Write-Host "=============================================" -ForegroundColor Cyan
if ($issuesFound -eq 0) {
    Write-Host "   All Checks Passed                       " -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host ""
    Write-Ok "No stale API base references found"
    Write-Host ""
    exit 0
} else {
    Write-Host "   Checks Failed                           " -ForegroundColor Red
    Write-Host "=============================================" -ForegroundColor Red
    Write-Host ""
    Write-Err "Found $issuesFound issue(s)"
    Write-Host ""
    Write-Info "Action required:"
    Write-Info "  1. Update references to use correct API base from .deploy/last-api-base.txt"
    Write-Info "  2. Use VITE_API_BASE instead of VITE_API_BASE_URL"
    Write-Info "  3. Replace hardcoded API bases with source-of-truth references"
    Write-Host ""
    exit 1
}
