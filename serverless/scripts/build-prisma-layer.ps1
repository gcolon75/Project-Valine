# Build Prisma Lambda Layer for Windows
# This script creates a fresh Prisma layer with the Linux binary for AWS Lambda
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts/build-prisma-layer.ps1

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Building Prisma Lambda Layer" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Get script and directory paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerlessDir = Split-Path -Parent $ScriptDir
$LayerDir = Join-Path $ServerlessDir "layers"
$BuildDir = Join-Path $ServerlessDir ".layer-build"

# Clean up any existing build
Write-Host ""
Write-Host "Cleaning up previous build artifacts..." -ForegroundColor Cyan
if (Test-Path $BuildDir) {
    Remove-Item -Recurse -Force $BuildDir
}
if (Test-Path (Join-Path $LayerDir "nodejs")) {
    Remove-Item -Recurse -Force (Join-Path $LayerDir "nodejs")
}
if (Test-Path (Join-Path $LayerDir "prisma-layer.zip")) {
    Remove-Item -Force (Join-Path $LayerDir "prisma-layer.zip")
}
New-Item -ItemType Directory -Force -Path (Join-Path $BuildDir "nodejs/node_modules") | Out-Null
Write-Host "✓ Cleaned up previous build artifacts" -ForegroundColor Green

# Change to serverless directory
Push-Location $ServerlessDir

try {
    # Ensure prisma is installed
    if (-not (Test-Path "node_modules/.bin/prisma")) {
        Write-Host ""
        Write-Host "Installing dependencies in serverless/..." -ForegroundColor Cyan
        npm ci
        if ($LASTEXITCODE -ne 0) {
            throw "npm ci failed"
        }
    }

    # Generate Prisma client with Lambda binaries
    Write-Host ""
    Write-Host "Generating Prisma client with Lambda binaries..." -ForegroundColor Cyan
    npx prisma generate --schema=prisma/schema.prisma
    if ($LASTEXITCODE -ne 0) {
        throw "Prisma generate failed"
    }
    Write-Host "✓ Prisma client generated" -ForegroundColor Green

    # Copy Prisma client files to layer build directory
    Write-Host ""
    Write-Host "Copying Prisma client to layer build directory..." -ForegroundColor Cyan
    
    $PrismaClientBuildDir = Join-Path $BuildDir "nodejs/node_modules/.prisma/client"
    $AtPrismaClientBuildDir = Join-Path $BuildDir "nodejs/node_modules/@prisma/client"
    New-Item -ItemType Directory -Force -Path $PrismaClientBuildDir | Out-Null
    New-Item -ItemType Directory -Force -Path $AtPrismaClientBuildDir | Out-Null

    # Copy generated client files
    $SourcePrismaClient = "node_modules/.prisma/client"
    Get-ChildItem -Path $SourcePrismaClient -Filter "*.js" -ErrorAction SilentlyContinue | Copy-Item -Destination $PrismaClientBuildDir -Force
    Get-ChildItem -Path $SourcePrismaClient -Filter "*.d.ts" -ErrorAction SilentlyContinue | Copy-Item -Destination $PrismaClientBuildDir -Force
    if (Test-Path (Join-Path $SourcePrismaClient "package.json")) {
        Copy-Item -Path (Join-Path $SourcePrismaClient "package.json") -Destination $PrismaClientBuildDir -Force
    }
    if (Test-Path (Join-Path $SourcePrismaClient "schema.prisma")) {
        Copy-Item -Path (Join-Path $SourcePrismaClient "schema.prisma") -Destination $PrismaClientBuildDir -Force
    }

    # Copy ONLY the Lambda binary (rhel)
    Write-Host "Copying Lambda binary (rhel-openssl-3.0.x)..." -ForegroundColor Cyan
    $LambdaBinary = Join-Path $SourcePrismaClient "libquery_engine-rhel-openssl-3.0.x.so.node"
    if (-not (Test-Path $LambdaBinary)) {
        throw "Lambda binary not found: $LambdaBinary"
    }
    Copy-Item -Path $LambdaBinary -Destination $PrismaClientBuildDir -Force

    # Copy @prisma/client runtime
    Write-Host "Copying @prisma/client runtime..." -ForegroundColor Cyan
    $SourceAtPrismaClient = "node_modules/@prisma/client"
    
    if (Test-Path (Join-Path $SourceAtPrismaClient "package.json")) {
        Copy-Item -Path (Join-Path $SourceAtPrismaClient "package.json") -Destination $AtPrismaClientBuildDir -Force
    }
    Get-ChildItem -Path $SourceAtPrismaClient -Filter "*.js" -ErrorAction SilentlyContinue | Copy-Item -Destination $AtPrismaClientBuildDir -Force
    Get-ChildItem -Path $SourceAtPrismaClient -Filter "*.d.ts" -ErrorAction SilentlyContinue | Copy-Item -Destination $AtPrismaClientBuildDir -Force
    if (Test-Path (Join-Path $SourceAtPrismaClient "LICENSE")) {
        Copy-Item -Path (Join-Path $SourceAtPrismaClient "LICENSE") -Destination $AtPrismaClientBuildDir -Force
    }
    if (Test-Path (Join-Path $SourceAtPrismaClient "README.md")) {
        Copy-Item -Path (Join-Path $SourceAtPrismaClient "README.md") -Destination $AtPrismaClientBuildDir -Force
    }

    # Copy runtime directory excluding WASM files
    $RuntimeSource = Join-Path $SourceAtPrismaClient "runtime"
    $RuntimeDest = Join-Path $AtPrismaClientBuildDir "runtime"
    if (Test-Path $RuntimeSource) {
        New-Item -ItemType Directory -Force -Path $RuntimeDest | Out-Null
        Get-ChildItem -Path $RuntimeSource -Recurse | Where-Object { $_.Name -notlike "*wasm*" } | ForEach-Object {
            $RelativePath = $_.FullName.Substring($RuntimeSource.Length + 1)
            $DestPath = Join-Path $RuntimeDest $RelativePath
            if ($_.PSIsContainer) {
                New-Item -ItemType Directory -Force -Path $DestPath | Out-Null
            } else {
                $ParentDir = Split-Path -Parent $DestPath
                if (-not (Test-Path $ParentDir)) {
                    New-Item -ItemType Directory -Force -Path $ParentDir | Out-Null
                }
                Copy-Item -Path $_.FullName -Destination $DestPath -Force
            }
        }
    }

    Write-Host "✓ Layer optimized - only Lambda runtime (rhel) binary included" -ForegroundColor Green

    # Verify the Lambda binary is present
    Write-Host ""
    Write-Host "Verifying Lambda binary is present..." -ForegroundColor Cyan
    $BinaryPath = Join-Path $PrismaClientBuildDir "libquery_engine-rhel-openssl-3.0.x.so.node"
    if (Test-Path $BinaryPath) {
        $BinarySize = [math]::Round((Get-Item $BinaryPath).Length / 1MB, 2)
        Write-Host "✓ Lambda binary found: libquery_engine-rhel-openssl-3.0.x.so.node" -ForegroundColor Green
        Write-Host "  Size: ${BinarySize} MB" -ForegroundColor Gray
    } else {
        throw "Lambda binary not found: $BinaryPath"
    }

    # Create the layer zip file
    Write-Host ""
    Write-Host "Creating layer zip file..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Force -Path $LayerDir | Out-Null
    
    $ZipPath = Join-Path $LayerDir "prisma-layer.zip"
    $NodejsDir = Join-Path $BuildDir "nodejs"
    
    # Use Compress-Archive to create the zip
    Push-Location $BuildDir
    try {
        Compress-Archive -Path "nodejs" -DestinationPath $ZipPath -Force
    } finally {
        Pop-Location
    }

    # Get the zip file size
    $ZipSize = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)

    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "✓ Prisma layer built successfully!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Layer location: $ZipPath" -ForegroundColor White
    Write-Host "Layer size: ${ZipSize} MB" -ForegroundColor White
    Write-Host ""
    Write-Host "The layer includes:" -ForegroundColor White
    Write-Host "  - @prisma/client (JS client library)" -ForegroundColor Gray
    Write-Host "  - .prisma/client (generated client)" -ForegroundColor Gray
    Write-Host "  - libquery_engine-rhel-openssl-3.0.x.so.node (Lambda runtime binary)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠  Note: This file is NOT committed to git (it's ${ZipSize} MB)" -ForegroundColor Yellow
    Write-Host "   It's excluded via .gitignore and must be rebuilt before deployment" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Deploy with: npx serverless deploy --stage prod --region us-west-2" -ForegroundColor White
    Write-Host "  2. The layer is automatically included via serverless.yml" -ForegroundColor White
    Write-Host ""

    # Verify layer contents
    Write-Host "Layer structure (sample):" -ForegroundColor Cyan
    try {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = $null
        try {
            $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
            $zip.Entries | Where-Object { $_.FullName -match "(prisma|\.node)" } | Select-Object -First 10 | ForEach-Object {
                Write-Host "  $($_.FullName)" -ForegroundColor Gray
            }
        } finally {
            if ($null -ne $zip) {
                $zip.Dispose()
            }
        }
    } catch {
        Write-Host "  (Could not read zip contents)" -ForegroundColor Yellow
    }
    Write-Host ""

} catch {
    Write-Host "✗ Build failed: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
    # Clean up build directory
    if (Test-Path $BuildDir) {
        Remove-Item -Recurse -Force $BuildDir
    }
}
