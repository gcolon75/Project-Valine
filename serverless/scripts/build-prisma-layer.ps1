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

# Verify default.js exists (Prisma 6.x uses default.js file, not default/index.js folder)
$DefaultJs = Join-Path $SrcPrismaDir "client\default.js"
if (-not (Test-Path $DefaultJs)) { 
  throw "Prisma client 'default.js' not found: $DefaultJs. Ensure Prisma 6.x is installed and 'npx prisma generate' was run." 
}
Write-Host "Verified: .prisma/client/default.js exists (Prisma 6.x structure)"

# Create destination directories
$DstPrismaClientDir = Join-Path $DstPrismaDir "client"
$DstAtPrismaClientDir = Join-Path $DstAtPrismaDir "client"
New-Item -ItemType Directory -Force -Path $DstPrismaClientDir | Out-Null
New-Item -ItemType Directory -Force -Path $DstAtPrismaClientDir | Out-Null

# Copy .prisma/client files (Prisma 6.x structure)
Write-Host "Copying .prisma/client files (Prisma 6.x)..."
$SrcPrismaClientDir = Join-Path $SrcPrismaDir "client"

# Copy JS files
Get-ChildItem -Path $SrcPrismaClientDir -Filter "*.js" -File | ForEach-Object { Copy-Item $_.FullName -Destination $DstPrismaClientDir }
# Copy TypeScript declaration files
Get-ChildItem -Path $SrcPrismaClientDir -Filter "*.d.ts" -File | ForEach-Object { Copy-Item $_.FullName -Destination $DstPrismaClientDir }
# Copy package.json if exists
$PkgJson = Join-Path $SrcPrismaClientDir "package.json"
if (Test-Path $PkgJson) { Copy-Item $PkgJson -Destination $DstPrismaClientDir }
# Copy schema.prisma if exists
$SchemaPrisma = Join-Path $SrcPrismaClientDir "schema.prisma"
if (Test-Path $SchemaPrisma) { Copy-Item $SchemaPrisma -Destination $DstPrismaClientDir }
# Copy Lambda binary
Copy-Item $LambdaBinary -Destination $DstPrismaClientDir
# Copy runtime directory if exists
$RuntimeDir = Join-Path $SrcPrismaClientDir "runtime"
if (Test-Path $RuntimeDir) { 
  Copy-Item -Recurse -Path $RuntimeDir -Destination $DstPrismaClientDir -Force 
}

# Copy @prisma/client files
Write-Host "Copying @prisma/client files..."
$SrcAtPrismaClientDir = Join-Path $SrcAtPrismaDir "client"
# Copy JS files
Get-ChildItem -Path $SrcAtPrismaClientDir -Filter "*.js" -File -ErrorAction SilentlyContinue | ForEach-Object { Copy-Item $_.FullName -Destination $DstAtPrismaClientDir }
# Copy TypeScript declaration files
Get-ChildItem -Path $SrcAtPrismaClientDir -Filter "*.d.ts" -File -ErrorAction SilentlyContinue | ForEach-Object { Copy-Item $_.FullName -Destination $DstAtPrismaClientDir }
# Copy package.json
$AtPkgJson = Join-Path $SrcAtPrismaClientDir "package.json"
if (Test-Path $AtPkgJson) { Copy-Item $AtPkgJson -Destination $DstAtPrismaClientDir }
# Copy LICENSE if exists
$License = Join-Path $SrcAtPrismaClientDir "LICENSE"
if (Test-Path $License) { Copy-Item $License -Destination $DstAtPrismaClientDir }
# Copy README.md if exists
$Readme = Join-Path $SrcAtPrismaClientDir "README.md"
if (Test-Path $Readme) { Copy-Item $Readme -Destination $DstAtPrismaClientDir }
# Copy runtime directory (exclude WASM files)
$AtRuntimeDir = Join-Path $SrcAtPrismaClientDir "runtime"
if (Test-Path $AtRuntimeDir) { 
  $DstAtRuntimeDir = Join-Path $DstAtPrismaClientDir "runtime"
  New-Item -ItemType Directory -Force -Path $DstAtRuntimeDir | Out-Null
  # Use -inotlike for case-insensitive WASM exclusion
  Get-ChildItem -Path $AtRuntimeDir -Recurse -File | Where-Object { $_.Name -inotlike "*wasm*" } | ForEach-Object {
    # Use Resolve-Path and relative path calculation for proper cross-platform handling
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
  throw "Failed to copy .prisma/client/default.js to build directory"
}
Write-Host "Verified: .prisma/client/default.js copied to build folder"

# Create layer zip
New-Item -ItemType Directory -Force -Path $LayerDir | Out-Null
$ZipPath = Join-Path $LayerDir "prisma-layer.zip"
Compress-Archive -Path $NodejsDir -DestinationPath $ZipPath -Force

# Report and clean
$zipSizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
Write-Host "Layer created: $ZipPath ($zipSizeMB MB)"
Write-Host "Contents include:"
Write-Host "  - .prisma/client/*.js (including default.js for Prisma 6.x)"
Write-Host "  - .prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node"
Write-Host "  - @prisma/client/* runtime"
if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }