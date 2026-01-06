# Build Prisma Lambda Layer (Windows/PowerShell)
# Creates layers/prisma-layer.zip with the Lambda-compatible Prisma client
# Usage: powershell -ExecutionPolicy Bypass -File scripts/build-prisma-layer.ps1
#
# IMPORTANT: This script supports both monorepo (hoisted node_modules) and standalone layouts.
# It runs `npm ci` and `npx prisma generate` from the repository root to ensure the Linux
# binary (libquery_engine-rhel-openssl-3.0.x.so.node) is downloaded and available.
#
# The script searches for the generated Prisma client in:
#   1. serverless/node_modules/.prisma (standalone layout)
#   2. <repo-root>/node_modules/.prisma (hoisted/monorepo layout)
#
# If the Prisma client is not found in either location, the script fails with a clear error.

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
Write-Host "Step 1: Install dependencies and generate Prisma client from repo root"
Write-Host "-----------------------------------------------------------------------"
Write-Host "This ensures the Linux binary (rhel-openssl-3.0.x) is downloaded."
Write-Host ""

# Run npm ci and prisma generate from repo root
# This is critical for monorepo/hoisted layouts where node_modules is at the root
Push-Location $RepoRoot
try {
  Write-Host "Working directory: $RepoRoot"
  
  # Install dependencies if needed
  if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies at repo root..."
    npm ci
  } else {
    Write-Host "Dependencies already installed at repo root."
  }
  
  # Generate Prisma client with Linux binary target
  Write-Host "Generating Prisma client (with rhel-openssl-3.0.x binary)..."
  npx prisma generate --schema=serverless/prisma/schema.prisma
  
  Write-Host "Prisma client generated successfully."
} catch {
  Write-Host "ERROR: Failed to generate Prisma client from repo root: $_" -ForegroundColor Red
  Pop-Location
  exit 1
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Step 2: Locate generated Prisma client"
Write-Host "---------------------------------------"
Write-Host "Searching in both serverless/node_modules and repo-root/node_modules..."
Write-Host ""

# Detect where Prisma client was generated (serverless or repo root)
$SrcPrismaDir = $null
$SrcAtPrismaDir = $null

# Check serverless/node_modules first (standalone layout)
$ServerlessPrismaDir = Join-Path $ServerlessDir "node_modules\.prisma"
$ServerlessAtPrismaDir = Join-Path $ServerlessDir "node_modules\@prisma"

if (Test-Path $ServerlessPrismaDir) {
  Write-Host "Found .prisma in serverless/node_modules/.prisma (standalone layout)"
  $SrcPrismaDir = $ServerlessPrismaDir
  $SrcAtPrismaDir = $ServerlessAtPrismaDir
}

# Check repo root node_modules (hoisted/monorepo layout)
$RepoRootPrismaDir = Join-Path $RepoRoot "node_modules\.prisma"
$RepoRootAtPrismaDir = Join-Path $RepoRoot "node_modules\@prisma"

if ($null -eq $SrcPrismaDir -and (Test-Path $RepoRootPrismaDir)) {
  Write-Host "Found .prisma in repo-root/node_modules/.prisma (hoisted/monorepo layout)"
  $SrcPrismaDir = $RepoRootPrismaDir
  $SrcAtPrismaDir = $RepoRootAtPrismaDir
}

# Fail if Prisma client not found in either location
if ($null -eq $SrcPrismaDir -or -not (Test-Path $SrcPrismaDir)) {
  Write-Host ""
  Write-Host "ERROR: Prisma client not found!" -ForegroundColor Red
  Write-Host ""
  Write-Host "Searched locations:" -ForegroundColor Yellow
  Write-Host "  1. serverless/node_modules/.prisma" -ForegroundColor Yellow
  Write-Host "  2. <repo-root>/node_modules/.prisma" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Resolution:" -ForegroundColor Yellow
  Write-Host "  1. Ensure you have run 'npm ci' in the repo root" -ForegroundColor Yellow
  Write-Host "  2. Ensure 'npx prisma generate --schema=serverless/prisma/schema.prisma' completed successfully" -ForegroundColor Yellow
  Write-Host "  3. Check that serverless/prisma/schema.prisma has binaryTargets = ['native', 'rhel-openssl-3.0.x']" -ForegroundColor Yellow
  Write-Host ""
  exit 1
}

Write-Host "Using Prisma client from: $SrcPrismaDir" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Verify Lambda binary and essential files"
Write-Host "--------------------------------------------------"
Write-Host ""

# Verify Lambda binary exists
$LambdaBinary = Join-Path $SrcPrismaDir "client\libquery_engine-rhel-openssl-3.0.x.so.node"
if (-not (Test-Path $LambdaBinary)) { 
  Write-Host ""
  Write-Host "ERROR: Lambda binary not found!" -ForegroundColor Red
  Write-Host ""
  Write-Host "Expected location: $LambdaBinary" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Resolution:" -ForegroundColor Yellow
  Write-Host "  1. Check serverless/prisma/schema.prisma has: binaryTargets = ['native', 'rhel-openssl-3.0.x']" -ForegroundColor Yellow
  Write-Host "  2. Run 'npx prisma generate --schema=serverless/prisma/schema.prisma' from repo root" -ForegroundColor Yellow
  Write-Host "  3. If on Windows and the binary doesn't download, use Docker:" -ForegroundColor Yellow
  Write-Host "     docker run --rm -v `${PWD}:/app -w /app node:20-bullseye bash -c 'npm ci && npx prisma generate --schema=serverless/prisma/schema.prisma'" -ForegroundColor Yellow
  Write-Host ""
  exit 1
}
Write-Host "✓ Found Lambda binary: libquery_engine-rhel-openssl-3.0.x.so.node" -ForegroundColor Green

# Verify default.js exists (Prisma 6.x uses default.js file, not default/index.js folder)
$DefaultJs = Join-Path $SrcPrismaDir "client\default.js"
if (-not (Test-Path $DefaultJs)) { 
  Write-Host ""
  Write-Host "ERROR: Prisma client 'default.js' not found!" -ForegroundColor Red
  Write-Host ""
  Write-Host "Expected location: $DefaultJs" -ForegroundColor Yellow
  Write-Host "This indicates Prisma 6.x is not installed or generation failed." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Resolution:" -ForegroundColor Yellow
  Write-Host "  1. Ensure Prisma 6.x is installed: npm list prisma @prisma/client" -ForegroundColor Yellow
  Write-Host "  2. Run 'npx prisma generate --schema=serverless/prisma/schema.prisma' from repo root" -ForegroundColor Yellow
  Write-Host ""
  exit 1
}
Write-Host "✓ Found Prisma 6.x client structure (default.js exists)" -ForegroundColor Green
Write-Host ""

Write-Host "Step 4: Copy Prisma client files to layer build directory"
Write-Host "----------------------------------------------------------"
Write-Host ""

# Create destination directories
$DstPrismaClientDir = Join-Path $DstPrismaDir "client"
$DstAtPrismaClientDir = Join-Path $DstAtPrismaDir "client"
New-Item -ItemType Directory -Force -Path $DstPrismaClientDir | Out-Null
New-Item -ItemType Directory -Force -Path $DstAtPrismaClientDir | Out-Null

# Copy .prisma/client files (Prisma 6.x structure) - MINIMAL CONTENTS ONLY
Write-Host "Copying .prisma/client files (Prisma 6.x - minimal)..."
$SrcPrismaClientDir = Join-Path $SrcPrismaDir "client"

# Copy ONLY essential JS files (exclude .map files)
Get-ChildItem -Path $SrcPrismaClientDir -Filter "*.js" -File | 
  Where-Object { $_.Name -notlike "*.map" } | 
  ForEach-Object { Copy-Item $_.FullName -Destination $DstPrismaClientDir }

# Copy TypeScript declaration files (needed for type resolution)
Get-ChildItem -Path $SrcPrismaClientDir -Filter "*.d.ts" -File | ForEach-Object { Copy-Item $_.FullName -Destination $DstPrismaClientDir }

# Copy package.json only (skip README, LICENSE)
$PkgJson = Join-Path $SrcPrismaClientDir "package.json"
if (Test-Path $PkgJson) { Copy-Item $PkgJson -Destination $DstPrismaClientDir }

# Copy schema.prisma if exists
$SchemaPrisma = Join-Path $SrcPrismaClientDir "schema.prisma"
if (Test-Path $SchemaPrisma) { Copy-Item $SchemaPrisma -Destination $DstPrismaClientDir }

# Copy ONLY the Linux x64 OpenSSL 3 engine (Lambda runtime)
Copy-Item $LambdaBinary -Destination $DstPrismaClientDir
Write-Host "✓ Copied libquery_engine-rhel-openssl-3.0.x.so.node" -ForegroundColor Green

# Copy runtime directory but exclude tests, docs, and non-essential files
$RuntimeDir = Join-Path $SrcPrismaClientDir "runtime"
if (Test-Path $RuntimeDir) { 
  $DstRuntimeDir = Join-Path $DstPrismaClientDir "runtime"
  New-Item -ItemType Directory -Force -Path $DstRuntimeDir | Out-Null
  Get-ChildItem -Path $RuntimeDir -Recurse -File | 
    Where-Object { 
      $_.Name -notlike "*.map" -and 
      $_.Name -notlike "README*" -and 
      $_.Name -notlike "LICENSE*" -and
      $_.FullName -notlike "*\tests\*" -and
      $_.FullName -notlike "*\test\*" -and
      $_.FullName -notlike "*\docs\*" -and
      $_.FullName -notlike "*\.cache\*"
    } | 
    ForEach-Object {
      $RelPath = $_.FullName.Replace($RuntimeDir, "").TrimStart("\", "/")
      $DestPath = Join-Path $DstRuntimeDir $RelPath
      $DestDir = Split-Path $DestPath -Parent
      if (-not (Test-Path $DestDir)) { New-Item -ItemType Directory -Force -Path $DestDir | Out-Null }
      Copy-Item $_.FullName -Destination $DestPath
    }
}

# Copy @prisma/client files - MINIMAL CONTENTS ONLY
Write-Host "Copying @prisma/client files (minimal)..."
$SrcAtPrismaClientDir = Join-Path $SrcAtPrismaDir "client"

# Copy ONLY essential JS files (exclude .map files)
Get-ChildItem -Path $SrcAtPrismaClientDir -Filter "*.js" -File -ErrorAction SilentlyContinue | 
  Where-Object { $_.Name -notlike "*.map" } |
  ForEach-Object { Copy-Item $_.FullName -Destination $DstAtPrismaClientDir }

# Copy TypeScript declaration files
Get-ChildItem -Path $SrcAtPrismaClientDir -Filter "*.d.ts" -File -ErrorAction SilentlyContinue | ForEach-Object { Copy-Item $_.FullName -Destination $DstAtPrismaClientDir }

# Copy package.json ONLY (skip README, LICENSE)
$AtPkgJson = Join-Path $SrcAtPrismaClientDir "package.json"
if (Test-Path $AtPkgJson) { Copy-Item $AtPkgJson -Destination $DstAtPrismaClientDir }

# Copy runtime directory (exclude WASM, tests, docs, maps, README, LICENSE)
$AtRuntimeDir = Join-Path $SrcAtPrismaClientDir "runtime"
if (Test-Path $AtRuntimeDir) { 
  $DstAtRuntimeDir = Join-Path $DstAtPrismaClientDir "runtime"
  New-Item -ItemType Directory -Force -Path $DstAtRuntimeDir | Out-Null
  Get-ChildItem -Path $AtRuntimeDir -Recurse -File | 
    Where-Object { 
      $_.Name -inotlike "*wasm*" -and 
      $_.Name -notlike "*.map" -and 
      $_.Name -notlike "README*" -and 
      $_.Name -notlike "LICENSE*" -and
      $_.FullName -notlike "*\tests\*" -and
      $_.FullName -notlike "*\test\*" -and
      $_.FullName -notlike "*\docs\*" -and
      $_.FullName -notlike "*\.cache\*"
    } | 
    ForEach-Object {
      $RelPath = $_.FullName.Replace($AtRuntimeDir, "").TrimStart("\", "/")
      $DestPath = Join-Path $DstAtRuntimeDir $RelPath
      $DestDir = Split-Path $DestPath -Parent
      if (-not (Test-Path $DestDir)) { New-Item -ItemType Directory -Force -Path $DestDir | Out-Null }
      Copy-Item $_.FullName -Destination $DestPath
    }
}

# Verify default.js copied successfully
$DstDefaultJs = Join-Path $DstPrismaClientDir "default.js"
if (-not (Test-Path $DstDefaultJs)) {
  Write-Host ""
  Write-Host "ERROR: Failed to copy .prisma/client/default.js to build directory" -ForegroundColor Red
  Write-Host ""
  exit 1
}
Write-Host "✓ Verified .prisma/client/default.js copied successfully" -ForegroundColor Green
Write-Host ""

# Calculate total uncompressed size and validate
Write-Host ""
Write-Host "========================================="
Write-Host "Validating layer size..."
Write-Host "========================================="
$TotalBytes = (Get-ChildItem -Path $BuildDir -Recurse -File | Measure-Object -Property Length -Sum).Sum
$TotalMB = [math]::Round($TotalBytes / 1MB, 2)
$MaxAllowedMB = 150

Write-Host "Total uncompressed layer size: $TotalMB MB"
if ($TotalMB -gt $MaxAllowedMB) {
  throw "Layer size ($TotalMB MB) exceeds maximum allowed ($MaxAllowedMB MB). Reduce layer contents."
}
Write-Host "Size validation passed (< $MaxAllowedMB MB)"
Write-Host ""

# Create layer zip
New-Item -ItemType Directory -Force -Path $LayerDir | Out-Null
$ZipPath = Join-Path $LayerDir "prisma-layer.zip"
Compress-Archive -Path $NodejsDir -DestinationPath $ZipPath -Force

# Report and clean
$zipSizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
Write-Host "========================================="
Write-Host "Layer Build Complete"
Write-Host "========================================="
Write-Host "Layer created: $ZipPath"
Write-Host "Compressed size: $zipSizeMB MB"
Write-Host "Uncompressed size: $TotalMB MB (validated < $MaxAllowedMB MB)"
Write-Host ""
Write-Host "Minimal contents include:"
Write-Host "  - .prisma/client/*.js (essential files only, no .map)"
Write-Host "  - .prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node (Lambda binary)"
Write-Host "  - @prisma/client/runtime/** (minimal, no WASM/tests/docs/README/LICENSE)"
Write-Host ""
Write-Host "Excluded from layer:"
Write-Host "  - README.md, LICENSE files"
Write-Host "  - Source maps (*.map)"
Write-Host "  - Tests, docs, cache directories"
Write-Host "  - Non-Lambda platform binaries"
Write-Host "========================================="
if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }