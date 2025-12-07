# Validate Prisma Layer Attachment
# Ensures no function has duplicate layers and verifies layer size
# Usage: powershell -ExecutionPolicy Bypass -File scripts/validate-layers.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================="
Write-Host "Validating Prisma Layer Attachment"
Write-Host "========================================="

# Paths
$ScriptDir      = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerlessDir  = Split-Path -Parent $ScriptDir
$ServerlessPath = Join-Path $ServerlessDir ".serverless"
$CfTemplatePath = Join-Path $ServerlessPath "cloudformation-template-update-stack.json"
$LayerZipPath   = Join-Path $ServerlessDir "layers\prisma-layer.zip"

# Check if CloudFormation template exists (must run 'serverless package' first)
if (-not (Test-Path $CfTemplatePath)) {
    Write-Host "ERROR: CloudFormation template not found at:"
    Write-Host "  $CfTemplatePath"
    Write-Host ""
    Write-Host "Run 'npx serverless package --stage prod --region us-west-2' first"
    exit 1
}

# Load CloudFormation template
Write-Host "Loading CloudFormation template..."
try {
    $cf = Get-Content $CfTemplatePath -Raw | ConvertFrom-Json
} catch {
    Write-Host "ERROR: Failed to parse CloudFormation template:"
    Write-Host "  $($_.Exception.Message)"
    Write-Host ""
    Write-Host "The template may be malformed. Try running 'serverless package' again."
    exit 1
}

# Functions to check (including previously failing ones)
$functionsToCheck = @(
    "HealthLambdaFunction",
    "MetaLambdaFunction",
    "AuthDiagLambdaFunction",
    "ListEducationLambdaFunction",
    "CreateEducationLambdaFunction",
    "UpdateEducationLambdaFunction",
    "DeleteEducationLambdaFunction",
    "RegisterLambdaFunction",
    "LoginLambdaFunction",
    "MeLambdaFunction"
)

Write-Host ""
Write-Host "Layer Attachment Report:"
Write-Host "========================"
Write-Host ""

$hasErrors = $false

foreach ($funcName in $functionsToCheck) {
    if ($cf.Resources.PSObject.Properties.Name -contains $funcName) {
        $func = $cf.Resources.$funcName
        $layers = $func.Properties.Layers
        
        if ($null -eq $layers) {
            $layerCount = 0
        } elseif ($layers -is [System.Array]) {
            $layerCount = $layers.Count
        } else {
            $layerCount = 1
        }
        
        $status = "OK"
        if ($layerCount -gt 1) {
            $status = "ERROR (duplicate layers)"
            $hasErrors = $true
        }
        
        Write-Host ("  {0,-40} Layers: {1}  {2}" -f $funcName, $layerCount, $status)
    } else {
        Write-Host ("  {0,-40} NOT FOUND in template" -f $funcName)
    }
}

Write-Host ""
Write-Host "Layer Size Report:"
Write-Host "=================="
Write-Host ""

# Check Prisma layer size
if (Test-Path $LayerZipPath) {
    $layerSizeMB = [math]::Round((Get-Item $LayerZipPath).Length / 1MB, 2)
    Write-Host "  Prisma Layer (compressed):   $layerSizeMB MB"
    
    # Estimate uncompressed size
    # Prisma layers typically have a 2-3x compression ratio (mostly JS and one native binary)
    # Using 2.5x as a conservative estimate for validation
    $estimatedUncompressedMB = [math]::Round($layerSizeMB * 2.5, 2)
    Write-Host "  Estimated uncompressed:      ~$estimatedUncompressedMB MB"
    
    if ($estimatedUncompressedMB -gt 150) {
        Write-Host "  WARNING: Layer may exceed 150MB uncompressed limit"
        $hasErrors = $true
    } else {
        Write-Host "  Status:                       OK (< 150 MB)"
    }
} else {
    Write-Host "  WARNING: Prisma layer zip not found at $LayerZipPath"
    Write-Host "  Run '.\scripts\build-prisma-layer.ps1' to build the layer"
}

Write-Host ""
Write-Host "Function Package Sizes (Top 10):"
Write-Host "================================="
Write-Host ""

# List function package sizes
$functionZips = Get-ChildItem (Join-Path $ServerlessPath "*.zip") | 
    Where-Object { $_.Name -ne "pv-api.zip" } |
    Sort-Object Length -Descending |
    Select-Object -First 10

foreach ($zip in $functionZips) {
    $sizeKB = [math]::Round($zip.Length / 1KB, 2)
    Write-Host ("  {0,-50} {1,10} KB" -f $zip.Name, $sizeKB)
}

Write-Host ""
Write-Host "========================================="
if ($hasErrors) {
    Write-Host "VALIDATION FAILED"
    Write-Host "Fix the issues above and re-run validation"
    exit 1
} else {
    Write-Host "VALIDATION PASSED"
    Write-Host "All functions have 0 or 1 layer attached"
    Write-Host "Layer size is within acceptable limits"
}
Write-Host "========================================="
