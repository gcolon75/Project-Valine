#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Get the current production API base URL

.DESCRIPTION
    This script retrieves the production API base URL using the following priority:
    1. Query AWS Serverless stack info (if AWS CLI available and authenticated)
    2. Read from .deploy/last-api-base.txt (if exists)
    3. Fall back to .env.production VITE_API_BASE value
    
    Returns a single line with the API base URL (e.g., https://ce73w43mga.execute-api.us-west-2.amazonaws.com)

.PARAMETER Source
    Specify source: 'aws', 'file', 'env', or 'auto' (default: auto)

.EXAMPLE
    .\scripts\get-api-base.ps1
    Returns: https://ce73w43mga.execute-api.us-west-2.amazonaws.com

.EXAMPLE
    $apiBase = .\scripts\get-api-base.ps1
    Write-Host "Current API base: $apiBase"

.NOTES
    Exit codes:
    0 = Success (API base found and returned)
    1 = Error (API base not found or error occurred)
#>

param(
    [ValidateSet('auto', 'aws', 'file', 'env')]
    [string]$Source = 'auto'
)

$ErrorActionPreference = "Stop"

# Get repository root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

function Get-ApiBaseFromAws {
    try {
        # Check if AWS CLI is available
        $awsVersion = aws --version 2>&1
        if ($LASTEXITCODE -ne 0) {
            return $null
        }
        
        # Try to get serverless info
        Push-Location (Join-Path $RepoRoot "serverless")
        try {
            $output = npx serverless@3 info --stage prod --region us-west-2 2>&1
            if ($LASTEXITCODE -eq 0) {
                # Parse output for API Gateway endpoint
                $match = $output | Select-String -Pattern "https://([a-z0-9]+)\.execute-api\.us-west-2\.amazonaws\.com"
                if ($match) {
                    return $match.Matches[0].Value
                }
            }
        } finally {
            Pop-Location
        }
    } catch {
        # Silently fail and try next method
    }
    return $null
}

function Get-ApiBaseFromFile {
    $filePath = Join-Path $RepoRoot ".deploy\last-api-base.txt"
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        $apiBase = $content.Trim()
        if ($apiBase -match "^https://[a-z0-9]+\.execute-api\.us-west-2\.amazonaws\.com$") {
            return $apiBase
        }
    }
    return $null
}

function Get-ApiBaseFromEnv {
    $envPath = Join-Path $RepoRoot ".env.production"
    if (Test-Path $envPath) {
        $content = Get-Content $envPath
        foreach ($line in $content) {
            if ($line -match "^VITE_API_BASE=(.+)$") {
                $apiBase = $matches[1].Trim()
                if ($apiBase -match "^https://[a-z0-9]+\.execute-api\.us-west-2\.amazonaws\.com$") {
                    return $apiBase
                }
            }
        }
    }
    return $null
}

# Main logic
$apiBase = $null

switch ($Source) {
    'aws' {
        $apiBase = Get-ApiBaseFromAws
        if (-not $apiBase) {
            Write-Error "Failed to get API base from AWS"
            exit 1
        }
    }
    'file' {
        $apiBase = Get-ApiBaseFromFile
        if (-not $apiBase) {
            Write-Error "Failed to get API base from .deploy/last-api-base.txt"
            exit 1
        }
    }
    'env' {
        $apiBase = Get-ApiBaseFromEnv
        if (-not $apiBase) {
            Write-Error "Failed to get API base from .env.production"
            exit 1
        }
    }
    'auto' {
        # Try all sources in order
        $apiBase = Get-ApiBaseFromAws
        if (-not $apiBase) {
            $apiBase = Get-ApiBaseFromFile
        }
        if (-not $apiBase) {
            $apiBase = Get-ApiBaseFromEnv
        }
        if (-not $apiBase) {
            Write-Error "Failed to get API base from any source (AWS, file, or env)"
            exit 1
        }
    }
}

# Output the API base (single line, no extra formatting)
Write-Output $apiBase
exit 0
