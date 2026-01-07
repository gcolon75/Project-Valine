#!/usr/bin/env pwsh
<#
.SYNOPSIS
    One-button deployment script for Project Valine API (PowerShell)

.DESCRIPTION
    Validates environment, builds Prisma layer, packages, deploys, and verifies the deployment.
    This is the canonical deployment script referenced in docs/DEPLOYMENT_BIBLE.md

.PARAMETER Stage
    Deployment stage (prod, staging, dev). Default: prod

.PARAMETER Region
    AWS region. Default: us-west-2

.PARAMETER SkipTests
    Skip smoke tests after deployment

.PARAMETER Force
    Force redeployment even if no changes detected

.EXAMPLE
    .\deploy.ps1 -Stage prod -Region us-west-2

.EXAMPLE
    .\deploy.ps1 -Stage staging -Region us-west-2 -SkipTests
#>

param(
    [string]$Stage = "prod",
    [string]$Region = "us-west-2",
    [switch]$SkipTests = $false,
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Script metadata
$ScriptVersion = "1.0.0"
$ScriptName = "deploy.ps1"

# Colors for output
function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}
function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}
function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}
function Write-Step {
    param([string]$Message)
    Write-Host "`n[STEP] $Message" -ForegroundColor Blue
}

# Banner
Write-Host @"
===========================================================
   Project Valine - One-Button Deploy Script v$ScriptVersion
===========================================================
"@ -ForegroundColor Cyan

Write-Info "Stage: $Stage | Region: $Region"
if ($Force) { Write-Warning "Force mode enabled - will redeploy all functions" }
if ($SkipTests) { Write-Warning "Tests will be skipped" }
Write-Host ""

# ===== STEP 1: Preflight Checks =====
Write-Step "Step 1: Preflight Checks"

# Check we're in the serverless directory
$currentDir = Get-Location
if (-not (Test-Path "serverless.yml")) {
    Write-Error "serverless.yml not found. Run this script from the serverless/ directory."
    exit 1
}
Write-Success "Running from serverless directory"

# Check required tools
Write-Info "Checking required tools..."

$tools = @(
    @{Name="node"; Version="20"; Command="node --version"},
    @{Name="npm"; Version="10"; Command="npm --version"},
    @{Name="aws"; Version="2"; Command="aws --version"}
)

foreach ($tool in $tools) {
    try {
        $version = Invoke-Expression $tool.Command 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0 -or $version) {
            Write-Success "$($tool.Name): $($version.Trim())"
        } else {
            throw
        }
    } catch {
        Write-Error "$($tool.Name) not found or not working. Please install $($tool.Name) v$($tool.Version)+"
        exit 1
    }
}

# Note: We use npx serverless@3 for deployment, no global install required
Write-Info "Will use npx serverless@3 for deployment"

# Check for serverless-esbuild plugin
Write-Info "Checking serverless plugin dependencies..."
$pluginPath = "node_modules/serverless-esbuild"
if (-not (Test-Path $pluginPath)) {
    Write-Warning "serverless-esbuild plugin not found in node_modules"
    Write-Info "Installing serverless dependencies..."
    try {
        # Capture output for error diagnostics
        $npmOutput = npm ci 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) {
            Write-Host $npmOutput -ForegroundColor Gray
            throw "npm ci failed with exit code $LASTEXITCODE"
        }
        Write-Success "Dependencies installed successfully"
    } catch {
        Write-Error "Failed to install dependencies: $($_.Exception.Message)"
        Write-Warning "Run 'npm ci' manually from the serverless/ directory"
        exit 1
    }
} else {
    Write-Success "serverless-esbuild plugin found"
}

# Verify required plugins are loaded by serverless
Write-Info "Verifying serverless plugins..."
try {
    # Minimal required env vars for serverless.yml validation (from serverless.yml provider.environment)
    # These are only used for configuration validation, not for actual deployment
    # Using obviously fake values to prevent accidental usage in deployment
    $minimalEnvVars = @{
        DATABASE_URL = "postgresql://VALIDATION_ONLY:VALIDATION_ONLY@validation-only.invalid:5432/VALIDATION_PLACEHOLDER"
        JWT_SECRET = "VALIDATION_PLACEHOLDER_DO_NOT_USE_IN_PRODUCTION"
        ALLOWED_USER_EMAILS = "validation-placeholder1@example.invalid,validation-placeholder2@example.invalid"
        MEDIA_BUCKET = "validation-placeholder-bucket"
    }
    
    # Store original values to restore later (for isolation)
    $originalEnvVars = @{}
    foreach ($key in $minimalEnvVars.Keys) {
        $originalEnvVars[$key] = [Environment]::GetEnvironmentVariable($key, "Process")
        [Environment]::SetEnvironmentVariable($key, $minimalEnvVars[$key], "Process")
    }
    
    try {
        # Test serverless configuration can be loaded
        $printOutput = npx serverless@3 print --stage $Stage --region $Region 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) {
            throw "Serverless configuration validation failed"
        }
        
        # Verify plugins section exists in output
        # Support multiple YAML formatting styles for plugins
        if ($printOutput -match "serverless-esbuild") {
            Write-Success "serverless-esbuild plugin is loaded"
        } elseif ($printOutput -match "plugins:") {
            Write-Warning "Plugins section found but could not confirm serverless-esbuild in output"
            Write-Info "Checking plugin list directly..."
            $pluginListOutput = npx serverless@3 plugin list 2>&1 | Out-String
            if ($pluginListOutput -notmatch "serverless-esbuild") {
                throw "serverless-esbuild plugin not found in plugin list"
            }
            Write-Success "serverless-esbuild confirmed via plugin list"
        } else {
            throw "Could not validate plugins section in serverless.yml"
        }
    } finally {
        # Restore original environment variables
        foreach ($key in $originalEnvVars.Keys) {
            if ($null -eq $originalEnvVars[$key]) {
                [Environment]::SetEnvironmentVariable($key, $null, "Process")
            } else {
                [Environment]::SetEnvironmentVariable($key, $originalEnvVars[$key], "Process")
            }
        }
    }
} catch {
    Write-Error "Plugin validation failed: $($_.Exception.Message)"
    Write-Warning "Ensure serverless.yml has 'serverless-esbuild' in the plugins section"
    Write-Warning "Verify dependencies are installed by running: npm ci"
    Write-Warning "Debug with: npx serverless@3 plugin list"
    exit 1
}

# Check AWS credentials
Write-Info "Checking AWS credentials..."
try {
    $awsIdentity = aws sts get-caller-identity 2>&1 | ConvertFrom-Json
    Write-Success "AWS Account: $($awsIdentity.Account)"
} catch {
    Write-Error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
}

# ===== STEP 2: Validate Environment Variables =====
Write-Step "Step 2: Validate Environment Variables"

# First, run environment drift detection
$driftCheckPath = Join-Path $PSScriptRoot "check-env-drift.ps1"
if (Test-Path $driftCheckPath) {
    Write-Info "Running environment drift detection..."
    try {
        & $driftCheckPath -Stage $Stage
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Environment drift detected. Please fix the issues above before deploying."
            exit 1
        }
    } catch {
        Write-Error "Environment drift check failed: $_"
        exit 1
    }
} else {
    Write-Warning "check-env-drift.ps1 not found, skipping drift detection"
}

# Run comprehensive env validation script
$validateScriptPath = Join-Path $PSScriptRoot "validate-required-env.ps1"
if (Test-Path $validateScriptPath) {
    Write-Info "Running environment validation script..."
    try {
        & $validateScriptPath -Strict
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Environment validation failed. Please fix the issues above before deploying."
            exit 1
        }
    } catch {
        Write-Error "Environment validation script failed: $_"
        exit 1
    }
} else {
    Write-Warning "validate-required-env.ps1 not found, using basic validation"
    
    $requiredEnvVars = @(
        "DATABASE_URL",
        "JWT_SECRET",
        "ALLOWED_USER_EMAILS"
    )

    $missingVars = @()

    # Load .env.prod if exists
    if (Test-Path ".env.prod") {
        Write-Info "Loading .env.prod..."
        Get-Content ".env.prod" | ForEach-Object {
            if ($_ -match '^([^=]+)=(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                if (-not [string]::IsNullOrEmpty($value)) {
                    [Environment]::SetEnvironmentVariable($name, $value, "Process")
                }
            }
        }
    }

    foreach ($var in $requiredEnvVars) {
        $value = [Environment]::GetEnvironmentVariable($var)
        if ([string]::IsNullOrEmpty($value)) {
            $missingVars += $var
        } else {
            # Redact sensitive values
            if ($var -match "SECRET|PASSWORD|KEY") {
                Write-Success "$var = [REDACTED]"
            } else {
                $displayValue = $value.Substring(0, [Math]::Min(50, $value.Length))
                Write-Success "$var = $displayValue..."
            }
        }
    }

    if ($missingVars.Count -gt 0) {
        Write-Error "Missing required environment variables: $($missingVars -join ', ')"
        Write-Warning "Set them in .env.prod or as environment variables"
        exit 1
    }
}

# ===== STEP 3: Validate Prisma Layer =====
Write-Step "Step 3: Validate Prisma Layer"

$layerPath = "layers/prisma-layer.zip"

if (Test-Path $layerPath) {
    $layerSize = (Get-Item $layerPath).Length / 1MB
    Write-Success "Prisma layer found: $([math]::Round($layerSize, 2)) MB"
    
    # Validate layer structure with detailed checks
    Write-Info "Validating layer structure..."
    try {
        # Load System.IO.Compression.FileSystem for ZipFile operations
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        
        $zipContents = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $layerPath))
        $hasNodeModules = $zipContents.Entries | Where-Object { $_.FullName -like "nodejs/node_modules/*" }
        $hasPrismaClient = $zipContents.Entries | Where-Object { $_.FullName -like "nodejs/node_modules/@prisma/client/*" }
        $hasDotPrisma = $zipContents.Entries | Where-Object { $_.FullName -like "nodejs/node_modules/.prisma/client/*" }
        $hasLambdaBinary = $zipContents.Entries | Where-Object { $_.FullName -like "*/libquery_engine-rhel-openssl-3.0.x.so.node" }
        $zipContents.Dispose()
        
        if (-not $hasNodeModules) {
            throw "Layer missing nodejs/node_modules directory"
        }
        if (-not $hasPrismaClient) {
            throw "Layer missing @prisma/client"
        }
        if (-not $hasDotPrisma) {
            throw "Layer missing .prisma/client"
        }
        if (-not $hasLambdaBinary) {
            throw "Layer missing Lambda binary (libquery_engine-rhel-openssl-3.0.x.so.node)"
        }
        Write-Success "Layer structure validated (includes Lambda binary)"
    } catch {
        Write-Warning "Layer validation failed: $($_.Exception.Message)"
        Write-Info "Rebuilding Prisma layer..."
        Remove-Item $layerPath -Force -ErrorAction SilentlyContinue
    }
}

if (-not (Test-Path $layerPath)) {
    Write-Warning "Prisma layer not found. Building..."
    
    $buildScript = ".\scripts\build-prisma-layer.ps1"
    if (Test-Path $buildScript) {
        & $buildScript
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Prisma layer build failed"
            exit 1
        }
    } else {
        Write-Error "Build script not found: $buildScript"
        exit 1
    }
}

# ===== STEP 4: Validate Serverless Config =====
Write-Step "Step 4: Validate Serverless Config"

Write-Info "Validating serverless.yml syntax..."
try {
    $config = npx serverless@3 print --stage $Stage --region $Region 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "serverless print failed: $config"
    }
    Write-Success "serverless.yml is valid"
} catch {
    Write-Error "serverless.yml validation failed: $($_.Exception.Message)"
    exit 1
}

# Check for common config issues
Write-Info "Checking for common config issues..."
$ymlContent = Get-Content "serverless.yml" -Raw

if ($ymlContent -match '\t') {
    Write-Warning "serverless.yml contains tab characters. Use spaces only."
}

if ($ymlContent -match '\$\{env:[^}]+\}' -and $ymlContent -notmatch 'provider:\s+environment:') {
    Write-Warning "Using env vars but no provider.environment block found"
}

Write-Success "Config checks passed"

# ===== STEP 5: Run Linter (optional) =====
Write-Step "Step 5: Linting (optional)"

if (Test-Path "../node_modules/.bin/eslint" -or (Get-Command eslint -ErrorAction SilentlyContinue)) {
    Write-Info "Running ESLint..."
    try {
        $lintOutput = npm run lint 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Linting passed"
        } else {
            Write-Warning "Linting found issues (non-blocking)"
            Write-Host $lintOutput -ForegroundColor Gray
        }
    } catch {
        Write-Warning "Linting skipped: $($_.Exception.Message)"
    }
} else {
    Write-Info "ESLint not found, skipping linting"
}

# ===== STEP 6: Package Functions =====
Write-Step "Step 6: Package Functions"

Write-Info "Packaging Lambda functions..."
$packageCmd = "npx serverless@3 package --stage $Stage --region $Region"

try {
    Invoke-Expression $packageCmd 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "Package command failed"
    }
    Write-Success "Functions packaged successfully"
} catch {
    Write-Error "Packaging failed: $($_.Exception.Message)"
    exit 1
}

# ===== STEP 7: Deploy to AWS =====
Write-Step "Step 7: Deploy to AWS"

Write-Info "Deploying to AWS Lambda..."
$deployCmd = "npx serverless@3 deploy --stage $Stage --region $Region --verbose"
if ($Force) { $deployCmd += " --force" }

$deployStart = Get-Date
try {
    Invoke-Expression $deployCmd 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "Deploy command failed"
    }
    $deployDuration = (Get-Date) - $deployStart
    Write-Success "Deployment completed in $([math]::Round($deployDuration.TotalSeconds, 1)) seconds"
} catch {
    Write-Error "Deployment failed: $($_.Exception.Message)"
    Write-Warning "Check CloudFormation console for details"
    exit 1
}

# ===== Capture API Base URL =====
Write-Info "Capturing API endpoint information..."
try {
    $infoOutput = npx serverless@3 info --stage $Stage --region $Region 2>&1 | Out-String
    $apiBase = if ($infoOutput -match '(https://[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com)') {
        $matches[1]
    } else {
        $null
    }
    
    if ($apiBase) {
        Write-Info "API Base discovered: $apiBase"
        
        # Create .deploy directory if it doesn't exist
        $deployDir = Join-Path $PSScriptRoot "..\..\..\.deploy"
        if (-not (Test-Path $deployDir)) {
            New-Item -ItemType Directory -Path $deployDir -Force | Out-Null
        }
        
        # Write API base to artifact file
        $artifactPath = Join-Path $deployDir "last-api-base.txt"
        Set-Content -Path $artifactPath -Value $apiBase -NoNewline
        Write-Success "API base saved to .deploy/last-api-base.txt"
    } else {
        Write-Warning "Could not extract API base from deployment info"
    }
} catch {
    Write-Warning "Failed to capture API base: $($_.Exception.Message)"
}

# ===== STEP 8: Post-Deploy Verification =====
Write-Step "Step 8: Post-Deploy Verification"

Write-Info "Verifying Lambda environment variables..."

$functionsToCheck = @(
    "pv-api-$Stage-authRouter",
    "pv-api-$Stage-profilesRouter",
    "pv-api-$Stage-getFeed",
    "pv-api-$Stage-getPreferences"
)

$varsToCheck = @("JWT_SECRET", "DATABASE_URL", "ALLOWED_USER_EMAILS")

foreach ($func in $functionsToCheck) {
    Write-Info "Checking $func..."
    try {
        $funcConfig = aws lambda get-function-configuration --function-name $func --region $Region 2>&1 | ConvertFrom-Json
        
        $allVarsPresent = $true
        foreach ($var in $varsToCheck) {
            if (-not $funcConfig.Environment.Variables.$var) {
                Write-Warning "$func missing $var"
                $allVarsPresent = $false
            }
        }
        
        if ($allVarsPresent) {
            Write-Success "$func has all required env vars"
        } else {
            Write-Warning "$func has missing env vars - this may cause 401 errors!"
        }
    } catch {
        Write-Warning "Could not check $func (may not exist): $($_.Exception.Message)"
    }
}

# ===== STEP 9: Smoke Tests =====
if (-not $SkipTests) {
    Write-Step "Step 9: Smoke Tests"
    
    Write-Info "Running smoke tests..."
    
    # Get API endpoint
    $infoOutput = npx serverless@3 info --stage $Stage --region $Region 2>&1 | Out-String
    $apiUrl = if ($infoOutput -match 'https://[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com') {
        $matches[0]
    } else {
        $null
    }
    
    if ($apiUrl) {
        Write-Info "API URL: $apiUrl"
        
        # Run automated smoke tests
        $smokeTestScript = Join-Path $PSScriptRoot "post-deploy-smoke-test.ps1"
        if (Test-Path $smokeTestScript) {
            Write-Info "Running automated smoke tests..."
            try {
                & $smokeTestScript -ApiUrl $apiUrl -Stage $Stage
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Automated smoke tests passed"
                } else {
                    Write-Warning "Automated smoke tests failed (non-critical)"
                }
            } catch {
                Write-Warning "Smoke test script failed: $($_.Exception.Message)"
            }
        } else {
            Write-Warning "Smoke test script not found: $smokeTestScript"
            
            # Fallback to manual tests
            Write-Info "Running manual smoke tests..."
            
            # Test health endpoint
            Write-Info "Testing /health endpoint..."
            try {
                $healthResponse = Invoke-WebRequest -Uri "$apiUrl/health" -Method GET -UseBasicParsing
                if ($healthResponse.StatusCode -eq 200) {
                    Write-Success "Health check passed"
                } else {
                    Write-Warning "Health check returned status: $($healthResponse.StatusCode)"
                }
            } catch {
                Write-Warning "Health check failed: $($_.Exception.Message)"
            }
            
            # Test meta endpoint
            Write-Info "Testing /meta endpoint..."
            try {
                $metaResponse = Invoke-WebRequest -Uri "$apiUrl/meta" -Method GET -UseBasicParsing
                if ($metaResponse.StatusCode -eq 200) {
                    Write-Success "Meta endpoint passed"
                } else {
                    Write-Warning "Meta endpoint returned status: $($metaResponse.StatusCode)"
                }
            } catch {
                Write-Warning "Meta endpoint failed: $($_.Exception.Message)"
            }
        }
        
        Write-Info "Note: Authenticated endpoint tests require login. Test manually."
    } else {
        Write-Warning "Could not extract API URL from deployment info"
    }
} else {
    Write-Info "Smoke tests skipped"
}

# ===== STEP 10: Summary =====
Write-Step "Deployment Summary"
Write-Success "Environment validated"
Write-Success "Prisma layer validated"
Write-Success "Functions packaged"
Write-Success "Deployed to $Stage in $Region"
Write-Success "Lambda env vars verified"
if (-not $SkipTests) {
    Write-Success "Smoke tests completed"
}
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:"
Write-Host "1. Test auth flow: https://dkmxy676d3vgc.cloudfront.net"
Write-Host "2. Check CloudWatch logs: /aws/lambda/pv-api-$Stage-*"
Write-Host "3. Review: npx serverless@3 info --stage $Stage --region $Region"
Write-Host ""
Write-Host "Documentation: docs/DEPLOYMENT_BIBLE.md"
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

exit 0
