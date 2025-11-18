#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Creates, publishes, and associates CloudFront Function for SPA routing

.DESCRIPTION
    This script automates the deployment of the spa-rewrite CloudFront Function:
    - Creates function if it doesn't exist
    - Publishes function to LIVE stage if needed
    - Associates function to Default Cache Behavior (viewer-request event)
    - Optionally adds or removes 404 fallback to /index.html
    - Handles JSON updates without BOM issues

.PARAMETER DistributionId
    CloudFront distribution ID (required)

.PARAMETER FunctionName
    CloudFront function name (default: spaRewrite)

.PARAMETER FunctionFile
    Path to function source file (default: infra/cloudfront/functions/spa-rewrite.js)

.PARAMETER Add404Fallback
    Add 404 → /index.html custom error response (temporary fallback)

.PARAMETER Remove404Fallback
    Remove 404 custom error response

.PARAMETER DryRun
    Show what would be done without making changes

.EXAMPLE
    .\scripts\cloudfront-associate-spa-function.ps1 -DistributionId E16LPJDBIL5DEE

.EXAMPLE
    .\scripts\cloudfront-associate-spa-function.ps1 -DistributionId E16LPJDBIL5DEE -Add404Fallback

.EXAMPLE
    .\scripts\cloudfront-associate-spa-function.ps1 -DistributionId E16LPJDBIL5DEE -DryRun
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$DistributionId,
    
    [Parameter(Mandatory = $false)]
    [string]$FunctionName = "spaRewrite",
    
    [Parameter(Mandatory = $false)]
    [string]$FunctionFile = "infra/cloudfront/functions/spa-rewrite.js",
    
    [Parameter(Mandatory = $false)]
    [switch]$Add404Fallback,
    
    [Parameter(Mandatory = $false)]
    [switch]$Remove404Fallback,
    
    [Parameter(Mandatory = $false)]
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "=== CloudFront Function Association Script ===" -ForegroundColor Cyan
Write-Host "Distribution: $DistributionId" -ForegroundColor White
Write-Host "Function Name: $FunctionName" -ForegroundColor White
Write-Host "Function File: $FunctionFile" -ForegroundColor White
if ($DryRun) {
    Write-Host "DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
}
Write-Host ""

# Verify AWS CLI is available
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✓ AWS CLI: $awsVersion" -ForegroundColor Green
} catch {
    Write-Error "AWS CLI not found. Please install AWS CLI and configure credentials."
    exit 1
}

# Verify function file exists
if (-not (Test-Path $FunctionFile)) {
    Write-Error "Function file not found: $FunctionFile"
    exit 1
}
Write-Host "✓ Function file exists: $FunctionFile" -ForegroundColor Green

# Step 1: Check if function exists
Write-Host "`n--- Step 1: Check CloudFront Function ---" -ForegroundColor Cyan
try {
    $functionJson = aws cloudfront describe-function --name $FunctionName --stage LIVE 2>&1 | Out-String
    $functionExists = $LASTEXITCODE -eq 0
    
    if ($functionExists) {
        $functionData = $functionJson | ConvertFrom-Json
        $functionArn = $functionData.FunctionSummary.FunctionMetadata.FunctionARN
        $functionStage = $functionData.FunctionSummary.FunctionMetadata.Stage
        Write-Host "✓ Function exists: $FunctionName" -ForegroundColor Green
        Write-Host "  ARN: $functionArn" -ForegroundColor Gray
        Write-Host "  Stage: $functionStage" -ForegroundColor Gray
    }
} catch {
    $functionExists = $false
}

# Step 2: Create function if it doesn't exist
if (-not $functionExists) {
    Write-Host "`n--- Step 2: Create CloudFront Function ---" -ForegroundColor Cyan
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would create function: $FunctionName" -ForegroundColor Yellow
    } else {
        try {
            $createResult = aws cloudfront create-function `
                --name $FunctionName `
                --function-config "Comment=SPA routing fallback for Project Valine,Runtime=cloudfront-js-1.0" `
                --function-code "fileb://$FunctionFile" `
                | ConvertFrom-Json
            
            $etag = $createResult.ETag
            Write-Host "✓ Function created: $FunctionName" -ForegroundColor Green
            Write-Host "  ETag: $etag" -ForegroundColor Gray
            
            # Publish to LIVE
            Write-Host "`n--- Step 2b: Publish Function to LIVE ---" -ForegroundColor Cyan
            $publishResult = aws cloudfront publish-function `
                --name $FunctionName `
                --if-match $etag `
                | ConvertFrom-Json
            
            $functionArn = $publishResult.FunctionSummary.FunctionMetadata.FunctionARN
            Write-Host "✓ Function published to LIVE" -ForegroundColor Green
            Write-Host "  ARN: $functionArn" -ForegroundColor Gray
        } catch {
            Write-Error "Failed to create/publish function: $_"
            exit 1
        }
    }
} else {
    # Function exists, check if it's published to LIVE
    if ($functionStage -ne "LIVE") {
        Write-Host "`n--- Step 2c: Publish Function to LIVE ---" -ForegroundColor Cyan
        if ($DryRun) {
            Write-Host "[DRY RUN] Would publish function to LIVE" -ForegroundColor Yellow
        } else {
            try {
                $etag = $functionData.ETag
                $publishResult = aws cloudfront publish-function `
                    --name $FunctionName `
                    --if-match $etag `
                    | ConvertFrom-Json
                
                $functionArn = $publishResult.FunctionSummary.FunctionMetadata.FunctionARN
                Write-Host "✓ Function published to LIVE" -ForegroundColor Green
                Write-Host "  ARN: $functionArn" -ForegroundColor Gray
            } catch {
                Write-Error "Failed to publish function: $_"
                exit 1
            }
        }
    }
}

# Verify we have a valid LIVE ARN
if (-not $functionArn) {
    Write-Error "Failed to retrieve LIVE function ARN"
    exit 1
}

# Step 3: Get distribution config
Write-Host "`n--- Step 3: Get Distribution Configuration ---" -ForegroundColor Cyan
try {
    $distConfigJson = aws cloudfront get-distribution-config --id $DistributionId | ConvertFrom-Json
    $distConfig = $distConfigJson.DistributionConfig
    $etag = $distConfigJson.ETag
    Write-Host "✓ Distribution config retrieved" -ForegroundColor Green
    Write-Host "  ETag: $etag" -ForegroundColor Gray
} catch {
    Write-Error "Failed to get distribution config: $_"
    exit 1
}

# Step 4: Update function association
Write-Host "`n--- Step 4: Update Function Association ---" -ForegroundColor Cyan

# Check current function associations
$currentAssociations = $distConfig.DefaultCacheBehavior.FunctionAssociations
if ($currentAssociations.Quantity -gt 0) {
    Write-Host "Current function associations:" -ForegroundColor Gray
    foreach ($assoc in $currentAssociations.Items) {
        Write-Host "  - $($assoc.FunctionARN) ($($assoc.EventType))" -ForegroundColor Gray
    }
}

# Update function association
$distConfig.DefaultCacheBehavior.FunctionAssociations = @{
    Quantity = 1
    Items = @(
        @{
            FunctionARN = $functionArn
            EventType = "viewer-request"
        }
    )
}

Write-Host "✓ Updated function association to:" -ForegroundColor Green
Write-Host "  ARN: $functionArn" -ForegroundColor Gray
Write-Host "  Event: viewer-request" -ForegroundColor Gray

# Step 5: Handle 404 fallback if requested
if ($Add404Fallback -or $Remove404Fallback) {
    Write-Host "`n--- Step 5: Update Custom Error Responses ---" -ForegroundColor Cyan
    
    if ($Add404Fallback) {
        Write-Host "Adding 404 → /index.html fallback (ResponseCode: 200, TTL: 0)" -ForegroundColor Yellow
        Write-Host "WARNING: This is a temporary fallback. Prefer using the CloudFront Function." -ForegroundColor Yellow
        
        $distConfig.CustomErrorResponses = @{
            Quantity = 1
            Items = @(
                @{
                    ErrorCode = 404
                    ResponsePagePath = "/index.html"
                    ResponseCode = "200"
                    ErrorCachingMinTTL = 0
                }
            )
        }
    }
    
    if ($Remove404Fallback) {
        Write-Host "Removing 404 custom error response" -ForegroundColor Green
        $distConfig.CustomErrorResponses = @{
            Quantity = 0
        }
    }
}

# Step 6: Write updated config without BOM
Write-Host "`n--- Step 6: Update Distribution ---" -ForegroundColor Cyan

$tempConfigFile = [System.IO.Path]::GetTempFileName() + ".json"

if ($DryRun) {
    Write-Host "[DRY RUN] Would update distribution with:" -ForegroundColor Yellow
    Write-Host "  Function ARN: $functionArn" -ForegroundColor Yellow
    Write-Host "  Event Type: viewer-request" -ForegroundColor Yellow
    if ($Add404Fallback) {
        Write-Host "  404 Fallback: ADDED" -ForegroundColor Yellow
    }
    if ($Remove404Fallback) {
        Write-Host "  404 Fallback: REMOVED" -ForegroundColor Yellow
    }
} else {
    try {
        # Write JSON without BOM using explicit UTF8 encoding
        $jsonContent = $distConfig | ConvertTo-Json -Depth 20 -Compress:$false
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($tempConfigFile, $jsonContent, $utf8NoBom)
        
        Write-Host "Writing config to temp file: $tempConfigFile" -ForegroundColor Gray
        
        # Update distribution
        $updateResult = aws cloudfront update-distribution `
            --id $DistributionId `
            --if-match $etag `
            --distribution-config "file://$tempConfigFile" `
            | ConvertFrom-Json
        
        Write-Host "✓ Distribution updated successfully" -ForegroundColor Green
        Write-Host "  Status: $($updateResult.Distribution.Status)" -ForegroundColor Gray
        Write-Host "  DomainName: $($updateResult.Distribution.DomainName)" -ForegroundColor Gray
        
        # Clean up temp file
        Remove-Item $tempConfigFile -ErrorAction SilentlyContinue
        
    } catch {
        Write-Error "Failed to update distribution: $_"
        Remove-Item $tempConfigFile -ErrorAction SilentlyContinue
        exit 1
    }
}

Write-Host "`n=== SUCCESS ===" -ForegroundColor Green
Write-Host "CloudFront Function '$FunctionName' has been associated with distribution '$DistributionId'" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait for distribution status to become 'Deployed' (typically 5-15 minutes)" -ForegroundColor White
Write-Host "2. Test SPA routing:" -ForegroundColor White
Write-Host "   curl -I https://<your-domain>/join" -ForegroundColor Gray
Write-Host "   (should return 200 with content-type: text/html)" -ForegroundColor Gray
Write-Host "3. Test asset delivery:" -ForegroundColor White
Write-Host "   curl -I https://<your-domain>/assets/nonexistent.js" -ForegroundColor Gray
Write-Host "   (should return 404, not 200)" -ForegroundColor Gray
Write-Host ""
