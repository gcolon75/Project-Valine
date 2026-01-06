# Build Prisma Lambda Layer (Windows/PowerShell)
# Creates layers/prisma-layer.zip with the Lambda-compatible Prisma client
# Usage: powershell -ExecutionPolicy Bypass -File scripts/build-prisma-layer.ps1
#
# This script supports both monorepo (hoisted node_modules) and standalone layouts.
# It runs `npx prisma generate` from the repository root to ensure the Linux
# binary (libquery_engine-rhel-openssl-3.0.x.so.node) is downloaded.
#
# The script searches for the generated Prisma client in:
#   1. serverless/node_modules/.prisma (standalone layout)
#   2. <repo-root>/node_modules/.prisma (hoisted/monorepo layout)

$ErrorActionPreference = "Stop"

Write-Host "========================================="
Write-Host "Building Prisma Lambda Layer"
Write-Host "========================================="

# Paths
$ScriptDir      = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerlessDir  = Split-Path -Parent $ScriptDir
$RepoRoot       = Split-Path -Parent $ServerlessDir
$LayerDir       = Join-Path $ServerlessDir "layers"
$BuildDir       = Join-Path $ServerlessDir ".layer-build"
$NodejsDir      = Join-Path $BuildDir "nodejs"
$NodeModulesDir = Join-Path $NodejsDir "node_modules"

$DstPrismaDir         = Join-Path $NodeModulesDir ".prisma"
$DstAtPrismaDir       = Join-Path $NodeModulesDir "@prisma"

# Clean previous artifacts
if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }
if (Test-Path (Join-Path $LayerDir "prisma-layer.zip")) { Remove-Item -Force (Join-Path $LayerDir "prisma-layer.zip") }
New-Item -ItemType Directory -Force -Path $NodeModulesDir | Out-Null

Write-Host ""
Write-Host "Step 1: Generate Prisma client from repo root"
Write-Host "----------------------------------------------"
Write-Host "Ensures the Linux binary (rhel-openssl-3.0.x) is downloaded."
Write-Host ""

# Run prisma generate from repo root
Push-Location $RepoRoot
try {
  Write-Host "Working directory: $RepoRoot"
  
  # Generate Prisma client with Linux binary target
  Write-Host "Running: npx prisma generate --schema serverless\prisma\schema.prisma"
  npx prisma generate --schema serverless\prisma\schema.prisma
  
  Write-Host "Prisma client generated."
} catch {
  Write-Host "ERROR: Failed to generate Prisma client: $_" -ForegroundColor Red
  Pop-Location
  exit 1
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Step 2: Locate generated Prisma client"
Write-Host "---------------------------------------"

# Detect where Prisma client was generated (repo root or serverless)
$SrcPrismaDir = $null
$SrcAtPrismaDir = $null

# Check repo root node_modules first (hoisted/monorepo layout)
$RepoRootPrismaDir = Join-Path $RepoRoot "node_modules\.prisma"
$RepoRootAtPrismaDir = Join-Path $RepoRoot "node_modules\@prisma"

if (Test-Path $RepoRootPrismaDir) {
  Write-Host "Found .prisma in repo root node_modules (hoisted layout)"
  $SrcPrismaDir = $RepoRootPrismaDir
  $SrcAtPrismaDir = $RepoRootAtPrismaDir
}

# Check serverless/node_modules (standalone layout)
$ServerlessPrismaDir = Join-Path $ServerlessDir "node_modules\.prisma"
$ServerlessAtPrismaDir = Join-Path $ServerlessDir "node_modules\@prisma"

if ($null -eq $SrcPrismaDir -and (Test-Path $ServerlessPrismaDir)) {
  Write-Host "Found .prisma in serverless node_modules (standalone layout)"
  $SrcPrismaDir = $ServerlessPrismaDir
  $SrcAtPrismaDir = $ServerlessAtPrismaDir
}

# Fail if not found
if ($null -eq $SrcPrismaDir -or -not (Test-Path $SrcPrismaDir)) {
  Write-Host ""
  Write-Host "ERROR: Prisma client not found!" -ForegroundColor Red
  Write-Host "Searched: repo root and serverless node_modules" -ForegroundColor Yellow
  Write-Host "Run 'npm ci' from repo root, then retry." -ForegroundColor Yellow
  Write-Host ""
  exit 1
}

Write-Host "Using: $SrcPrismaDir" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Verify Lambda binary"
Write-Host "-----------------------------"

# Verify Lambda binary exists
$LambdaBinary = Join-Path $SrcPrismaDir "client\libquery_engine-rhel-openssl-3.0.x.so.node"
if (-not (Test-Path $LambdaBinary)) { 
  Write-Host ""
  Write-Host "ERROR: Lambda binary not found!" -ForegroundColor Red
  Write-Host "Expected: $LambdaBinary" -ForegroundColor Yellow
  Write-Host "Check schema.prisma has binaryTargets = ['native', 'rhel-openssl-3.0.x']" -ForegroundColor Yellow
  Write-Host ""
  exit 1
}
Write-Host "Found Lambda binary: libquery_engine-rhel-openssl-3.0.x.so.node" -ForegroundColor Green
Write-Host ""

Write-Host "Step 4: Copy Prisma client files"
Write-Host "---------------------------------"

# Create destination directories
$DstPrismaClientDir = Join-Path $DstPrismaDir "client"
$DstAtPrismaClientDir = Join-Path $DstAtPrismaDir "client"
New-Item -ItemType Directory -Force -Path $DstPrismaClientDir | Out-Null
New-Item -ItemType Directory -Force -Path $DstAtPrismaClientDir | Out-Null

Write-Host "Copying .prisma/client..."
$SrcPrismaClientDir = Join-Path $SrcPrismaDir "client"

# Copy entire .prisma/client directory (includes all files and runtime)
Copy-Item -Path "$SrcPrismaClientDir\*" -Destination $DstPrismaClientDir -Recurse -Force

Write-Host "Copying @prisma/client..."
$SrcAtPrismaClientDir = Join-Path $SrcAtPrismaDir "client"

# Copy entire @prisma/client directory
Copy-Item -Path "$SrcAtPrismaClientDir\*" -Destination $DstAtPrismaClientDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Copy complete." -ForegroundColor Green
Write-Host ""

Write-Host "Step 5: Create layer zip"
Write-Host "-------------------------"

# Create layer zip
New-Item -ItemType Directory -Force -Path $LayerDir | Out-Null
$ZipPath = Join-Path $LayerDir "prisma-layer.zip"
Compress-Archive -Path $NodejsDir -DestinationPath $ZipPath -Force

# Verify the Lambda binary is inside the zip
Write-Host "Verifying Lambda binary in zip..."
$zipArchive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
$hasLambdaBinary = $zipArchive.Entries | Where-Object { $_.FullName -like "*libquery_engine-rhel-openssl-3.0.x.so.node" }
$zipArchive.Dispose()

if (-not $hasLambdaBinary) {
  Write-Host ""
  Write-Host "ERROR: Lambda binary not found in zip!" -ForegroundColor Red
  Write-Host ""
  exit 1
}

$zipSizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
Write-Host ""
Write-Host "========================================="
Write-Host "Build Complete"
Write-Host "========================================="
Write-Host "Created: $ZipPath"
Write-Host "Size: $zipSizeMB MB"
Write-Host "Lambda binary verified in zip."
Write-Host "========================================="

# Clean build directory
if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }