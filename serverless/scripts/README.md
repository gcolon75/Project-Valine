# Serverless Scripts

This directory contains utility scripts for building, validating, deploying, and recovering Lambda deployments.

## Deployment Scripts

### `deploy.ps1` (Windows PowerShell)
**The canonical one-button deployment script for production.**

Runs all preflight checks, validates environment, builds Prisma layer, deploys to AWS Lambda, and runs post-deployment verification.

**Usage:**
```powershell
cd serverless
.\scripts\deploy.ps1 -Stage prod -Region us-west-2
```

**Parameters:**
- `-Stage`: Deployment stage (prod, staging, dev). Default: prod
- `-Region`: AWS region. Default: us-west-2
- `-SkipTests`: Skip smoke tests after deployment
- `-Force`: Force redeployment even if no changes detected

**Features:**
- Validates npm, node, and aws CLI are installed
- Checks serverless-esbuild plugin is present
- Runs environment drift detection
- Validates Prisma layer structure (including Lambda binary)
- Packages and deploys functions
- Runs smoke tests and verifies Lambda environment variables

### `deploy.sh` (Linux/Mac)
**Bash equivalent of deploy.ps1 for Unix-like systems.**

---

## Setup & Validation Scripts

### `setup.ps1` (Windows PowerShell) - NEW
**Installs serverless/ project dependencies deterministically.**

**Usage:**
```powershell
# From repository root
.\scripts\setup.ps1
```

**What it does:**
- Runs `npm ci` if `package-lock.json` exists (deterministic install)
- Falls back to `npm install` if no lockfile
- Verifies critical plugins (`serverless-esbuild`, `serverless`) are installed

**When to use:**
- After cloning the repository
- Before first deployment
- When dependency installation fails
- To ensure serverless-esbuild is properly installed

---

### `check-env-drift.ps1` (Windows PowerShell) - NEW
**Detects environment drift before deployment to prevent 401 errors.**

**Usage:**
```powershell
cd serverless
.\scripts\check-env-drift.ps1 -Stage prod
```

**Parameters:**
- `-Stage`: Deployment stage (prod, staging, dev). Default: prod
- `-FailFast`: Exit immediately on first validation error

**Validates:**
- `NODE_ENV` is set to `production` for prod stage
- `JWT_SECRET` is not using default/placeholder values (and is at least 32 chars)
- `ALLOWED_USER_EMAILS` contains valid production emails (not placeholders)
- `DATABASE_URL` is properly formatted with no spaces
- `FRONTEND_URL` and `API_BASE_URL` are set correctly for prod

**Exit Codes:**
- `0`: All checks passed, safe to deploy
- `1`: One or more checks failed, fix issues before deploying

**Why this matters:**
Incorrect `NODE_ENV` causes `SameSite=Lax` cookies that aren't sent cross-site, resulting in 401 errors on authenticated endpoints. This script prevents that by validating environment before deployment.

---

### `validate-required-env.ps1` (Windows PowerShell)
**Validates that all required environment variables are set.**

Checks for critical environment variables like `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_USER_EMAILS`.

**Usage:**
```powershell
cd serverless
.\scripts\validate-required-env.ps1 -Strict
```

---

## Layer Build Scripts

### `build-prisma-layer.sh` (Linux/Mac)
Builds the Prisma Lambda Layer with the correct binary for AWS Lambda.

**Usage:**
```bash
./scripts/build-prisma-layer.sh
```

**What it does:**
1. Cleans previous build artifacts
2. Generates Prisma client with Lambda binary (rhel-openssl-3.0.x)
3. Copies only essential files to minimize layer size
4. Creates `layers/prisma-layer.zip` (~9-12 MB compressed)
5. Excludes WASM files, source maps, tests, docs, README, LICENSE

**Output:**
- `layers/prisma-layer.zip` - The layer artifact used by serverless.yml

### `build-prisma-layer.ps1` (Windows)
Windows PowerShell version of the layer build script.

**Usage:**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-prisma-layer.ps1
```

**Features:**
- Same functionality as the bash version
- Validates uncompressed size < 150 MB
- Provides detailed output of layer contents
- Verifies Prisma 6.x structure (default.js)

## Validation Scripts

### `validate-layer.sh`
Validates the Prisma layer structure and contents.

**Usage:**
```bash
./scripts/validate-layer.sh
```

**Checks:**
- Layer zip exists at `layers/prisma-layer.zip`
- Contains Lambda binary (libquery_engine-rhel-openssl-3.0.x.so.node)
- Contains Prisma client files (.prisma/client/default.js)
- Contains @prisma/client runtime
- Size is reasonable (5+ MB, typically 9-12 MB)
- No Debian binaries included (not needed for Lambda)

### `validate-layers.ps1` (Windows)
PowerShell script to validate layer attachments in packaged functions.

**Usage:**
```powershell
# First package the application
npx serverless package --stage prod --region us-west-2 --verbose

# Then validate
.\scripts\validate-layers.ps1
```

**Checks:**
- No function has duplicate layer attachments
- Layer sizes are within AWS limits
- Function package sizes are reasonable

### `verify-layer.sh`
Quick verification of layer contents without full validation.

**Usage:**
```bash
./scripts/verify-layer.sh
```

## Recovery Scripts

### `recover-failed-stack.sh`
Recovers from CloudFormation DELETE_FAILED or UPDATE_ROLLBACK_FAILED states.

**Usage:**
```bash
./scripts/recover-failed-stack.sh [stack-name] [region]

# Default values if not specified:
# stack-name: pv-api-prod
# region: us-west-2

# Example:
./scripts/recover-failed-stack.sh pv-api-prod us-west-2
```

**What it does:**
1. Checks current stack status
2. Identifies resources that failed to delete
3. Provides recovery options:
   - Manual cleanup (recommended for production)
   - Force delete with resource retention
4. Guides through deletion process
5. Provides next steps for rebuilding

**When to use:**
- Stack shows DELETE_FAILED status
- Deployment fails with "Stack is in DELETE_FAILED state" error
- Cannot update or delete stack through normal means
- Lambda layer references are broken

**See also:** [CloudFormation DELETE_FAILED Recovery Guide](../../docs/troubleshooting/CLOUDFORMATION_DELETE_FAILED.md)

## Build Selector

### `build-layer-selector.js`
Helper script to select the appropriate layer build script for the current platform.

**Usage:**
```bash
node scripts/build-layer-selector.js
```

This is used internally by deployment scripts to automatically choose between bash and PowerShell versions.

## Common Workflows

### First-Time Setup
```powershell
# Windows PowerShell
# 1. Install dependencies
.\scripts\setup.ps1

# 2. Build Prisma layer
cd serverless
.\scripts\build-prisma-layer.ps1
```

```bash
# Linux/Mac
# 1. Install dependencies
cd serverless
npm ci

# 2. Build the layer
./scripts/build-prisma-layer.sh

# 3. Validate it
./scripts/validate-layer.sh
```

### Before Deployment
```powershell
# Windows PowerShell
cd serverless

# 1. Set environment variables (load from .env.prod or set manually)
Get-Content .env.prod | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# 2. Check for environment drift (NEW!)
.\scripts\check-env-drift.ps1 -Stage prod

# 3. Validate environment
.\scripts\validate-required-env.ps1 -Strict
```

### Full Deployment (Windows)
```powershell
cd serverless
.\scripts\deploy.ps1 -Stage prod -Region us-west-2
```

### Fresh Deployment (Linux/Mac)
```bash
# 1. Build the layer
./scripts/build-prisma-layer.sh

# 2. Validate it
./scripts/validate-layer.sh

# 3. Deploy
cd ..
./deploy.sh
```

### Recovery from DELETE_FAILED
```bash
# 1. Recover the stack
./scripts/recover-failed-stack.sh

# 2. Build the layer (this is usually the root cause)
./scripts/build-prisma-layer.sh

# 3. Verify layer
./scripts/validate-layer.sh

# 4. Deploy fresh stack
cd ..
./deploy.sh
```

### Validation Before Deployment
```bash
# Full deployment validation
cd ..
./validate-deployment.sh

# If validation passes, deploy
./deploy.sh
```

## Why the Layer Must Be Built Locally

The Prisma layer zip file (`layers/prisma-layer.zip`) is **not committed to git** because:

1. **Size**: 9-12 MB compressed - too large for git
2. **Binary artifact**: Contains platform-specific native binaries
3. **Regeneratable**: Can be rebuilt from source at any time
4. **Git hygiene**: Binary artifacts don't belong in version control

The `.gitignore` file excludes:
- `serverless/layers/prisma-layer.zip`
- `serverless/prisma-layer.zip`
- `serverless/.layer-build/`

## CI/CD vs Local Deployment

### GitHub Actions (Automated)
The workflow at `.github/workflows/backend-deploy.yml` automatically:
1. Installs dependencies
2. Generates Prisma client
3. Builds the layer
4. Validates the layer artifact
5. Deploys to AWS

### Local Deployment (Manual)
You must manually:
1. Build the layer: `./scripts/build-prisma-layer.sh`
2. Verify it exists: `ls -lh layers/prisma-layer.zip`
3. Deploy: `./deploy.sh` (now validates layer exists)

## Troubleshooting

### "Layer artifact not found"
**Symptom:** Deployment fails with missing layer error

**Solution:**
```bash
./scripts/build-prisma-layer.sh
ls -lh layers/prisma-layer.zip  # Should show ~9-12 MB
```

### "Lambda binary not found in layer"
**Symptom:** Layer validation fails

**Solution:**
```bash
# Ensure Prisma dependencies are installed
npm ci

# Ensure Prisma client is generated
npx prisma generate --schema=prisma/schema.prisma

# Rebuild layer
./scripts/build-prisma-layer.sh
```

### "Layer is suspiciously small"
**Symptom:** Layer is < 5 MB (probably just package.json)

**Solution:**
The layer build likely failed partway through. Check for:
- Missing Prisma dependencies in node_modules
- Prisma client not generated
- Build script errors

Fix and rebuild:
```bash
npm ci
npx prisma generate --schema=prisma/schema.prisma
./scripts/build-prisma-layer.sh
```

### CloudFormation DELETE_FAILED
**Symptom:** Stack won't update or delete

**Solution:**
```bash
# Use the recovery script
./scripts/recover-failed-stack.sh pv-api-prod us-west-2

# After recovery, always build the layer
./scripts/build-prisma-layer.sh

# Then deploy fresh
cd ..
./deploy.sh
```

See the [comprehensive recovery guide](../../docs/troubleshooting/CLOUDFORMATION_DELETE_FAILED.md) for detailed instructions.

## Script Permissions

All `.sh` scripts should be executable. If you get "Permission denied" errors:

```bash
chmod +x scripts/*.sh
```

Or for a specific script:
```bash
chmod +x scripts/build-prisma-layer.sh
```

## Related Documentation

- [Backend Deployment Guide](../../docs/BACKEND-DEPLOYMENT.md) - Main deployment documentation
- [CloudFormation DELETE_FAILED Recovery](../../docs/troubleshooting/CLOUDFORMATION_DELETE_FAILED.md) - Stack recovery guide
- [Prisma Layer README](../layers/README.md) - Layer structure and contents
- [GitHub Actions Workflow](../../.github/workflows/backend-deploy.yml) - Automated deployment
