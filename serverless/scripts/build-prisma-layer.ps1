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

$SrcPrismaClientDir   = Join-Path $ServerlessDir "node_modules\.prisma\client"
$SrcAtPrismaClientDir = Join-Path $ServerlessDir "node_modules\@prisma\client"

$DstPrismaClientDir   = Join-Path $NodeModulesDir ".prisma\client"
$DstAtPrismaClientDir = Join-Path $NodeModulesDir "@prisma\client"

# Clean previous artifacts
if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }
if (Test-Path (Join-Path $LayerDir "prisma-layer.zip")) { Remove-Item -Force (Join-Path $LayerDir "prisma-layer.zip") }
New-Item -ItemType Directory -Force -Path $DstPrismaClientDir | Out-Null
New-Item -ItemType Directory -Force -Path $DstAtPrismaClientDir | Out-Null

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
$LambdaBinary = Join-Path $SrcPrismaClientDir "libquery_engine-rhel-openssl-3.0.x.so.node"
if (-not (Test-Path $LambdaBinary)) { throw "Lambda binary not found: $LambdaBinary" }

# Copy generated client (minimal files)
Copy-Item -Path (Join-Path $SrcPrismaClientDir "index.js")      -Destination $DstPrismaClientDir -Force
Copy-Item -Path (Join-Path $SrcPrismaClientDir "index.d.ts")    -Destination $DstPrismaClientDir -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $SrcPrismaClientDir "package.json")  -Destination $DstPrismaClientDir -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $SrcPrismaClientDir "schema.prisma") -Destination $DstPrismaClientDir -Force -ErrorAction SilentlyContinue
Copy-Item -Path $LambdaBinary                                   -Destination $DstPrismaClientDir -Force

# Copy @prisma/client runtime (JS only)
Copy-Item -Path (Join-Path $SrcAtPrismaClientDir "package.json") -Destination $DstAtPrismaClientDir -Force
Get-ChildItem -Path $SrcAtPrismaClientDir -Filter "*.js" -File | ForEach-Object {
  Copy-Item -Path $_.FullName -Destination $DstAtPrismaClientDir -Force
}
if (Test-Path (Join-Path $SrcAtPrismaClientDir "runtime")) {
  Copy-Item -Recurse -Path (Join-Path $SrcAtPrismaClientDir "runtime") -Destination (Join-Path $DstAtPrismaClientDir "runtime") -Force
}

# Create layer zip
New-Item -ItemType Directory -Force -Path $LayerDir | Out-Null
$ZipPath = Join-Path $LayerDir "prisma-layer.zip"
Compress-Archive -Path $NodejsDir -DestinationPath $ZipPath -Force

# Report and clean
$zipSizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
Write-Host "Layer created: $ZipPath ($zipSizeMB MB)"
if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }