# Build Prisma Lambda Layer (Windows/PowerShell)
# Creates layers/prisma-layer.zip with the Lambda-compatible Prisma client
# Usage: powershell -ExecutionPolicy Bypass -File scripts/build-prisma-layer.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================="
Write-Host "Building Prisma Lambda Layer"
Write-Host "========================================="

# Paths
$ScriptDir      = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerlessDir  = Split-Path -Parent $ScriptDir
$LayerDir       = Join-Path $ServerlessDir "layers"
$BuildDir       = Join-Path $ServerlessDir ".layer-build"
$NodejsDir      = Join-Path $BuildDir "nodejs"
$NodeModulesDir = Join-Path $NodejsDir "node_modules"

$SrcPrismaDir         = Join-Path $ServerlessDir "node_modules\.prisma"
$SrcAtPrismaDir       = Join-Path $ServerlessDir "node_modules\@prisma"

$DstPrismaDir         = Join-Path $NodeModulesDir ".prisma"
$DstAtPrismaDir       = Join-Path $NodeModulesDir "@prisma"

# Clean previous artifacts
if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }
if (Test-Path (Join-Path $LayerDir "prisma-layer.zip")) { Remove-Item -Force (Join-Path $LayerDir "prisma-layer.zip") }
New-Item -ItemType Directory -Force -Path $NodeModulesDir | Out-Null

# Ensure deps and generate Prisma client (serverless/prisma/schema.prisma)
Push-Location $ServerlessDir
try {
  if (-not (Test-Path "node_modules\.bin\prisma")) {
    Write-Host "Installing dependencies in serverless/..."
    npm ci | Out-Null
  }
  Write-Host "Generating Prisma client..."
  npx prisma generate --schema=prisma\schema.prisma | Out-Null
} finally {
  Pop-Location
}

# Verify Lambda binary exists
$LambdaBinary = Join-Path $SrcPrismaDir "client\libquery_engine-rhel-openssl-3.0.x.so.node"
if (-not (Test-Path $LambdaBinary)) { throw "Lambda binary not found: $LambdaBinary" }

# Verify .prisma/client/default bundle exists (required by newer Prisma versions)
$DefaultBundle = Join-Path $SrcPrismaDir "client\default\index.js"
if (-not (Test-Path $DefaultBundle)) { 
  throw "Prisma client 'default' bundle not found: $DefaultBundle. Ensure Prisma is up-to-date and 'npx prisma generate' was run." 
}
Write-Host "Verified: .prisma/client/default/index.js exists"

# Copy entire .prisma directory (includes client and default bundle)
Write-Host "Copying .prisma directory (full)..."
Copy-Item -Recurse -Path $SrcPrismaDir -Destination $DstPrismaDir -Force

# Copy entire @prisma directory (includes client runtime)
Write-Host "Copying @prisma directory (full)..."
Copy-Item -Recurse -Path $SrcAtPrismaDir -Destination $DstAtPrismaDir -Force

# Verify default bundle copied successfully
$DstDefaultBundle = Join-Path $DstPrismaDir "client\default\index.js"
if (-not (Test-Path $DstDefaultBundle)) {
  throw "Failed to copy .prisma/client/default/index.js to build directory"
}
Write-Host "Verified: .prisma/client/default/index.js copied to build folder"

# Create layer zip
New-Item -ItemType Directory -Force -Path $LayerDir | Out-Null
$ZipPath = Join-Path $LayerDir "prisma-layer.zip"
Compress-Archive -Path $NodejsDir -DestinationPath $ZipPath -Force

# Report and clean
$zipSizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
Write-Host "Layer created: $ZipPath ($zipSizeMB MB)"
Write-Host "Contents include:"
Write-Host "  - .prisma/client/default/* (required for newer Prisma)"
Write-Host "  - .prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node"
Write-Host "  - @prisma/client/* runtime"
if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }