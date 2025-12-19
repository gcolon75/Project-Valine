# Build and Run Locally

This guide explains how to run Project Valine on your local machine for development. All commands use **PowerShell only**.

For complete environment variable documentation, see [ENV_CHECKLIST.md](../ENV_CHECKLIST.md).

## Prerequisites

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 20.x or later | Frontend and backend runtime |
| **npm** | 10.x or later | Package management |
| **Git** | Latest | Version control |
| **PowerShell** | 5.1+ or PowerShell Core 7+ | Command execution |

**Verify installations:**
```powershell
node --version   # Should show v20.x or higher
npm --version    # Should show 10.x or higher
git --version    # Any recent version
$PSVersionTable.PSVersion  # PowerShell version
```

See the [Project Bible - Prerequisites](../PROJECT_BIBLE.md#prerequisites) for additional optional tools (AWS CLI, Serverless Framework, etc.).

## Clone the Repository

```powershell
# Clone the repository
git clone https://github.com/gcolon75/Project-Valine.git

# Navigate to the project directory
cd Project-Valine
```

## Frontend Local Development

### Step 1: Install Dependencies

```powershell
# Install frontend dependencies
npm install
```

### Step 2: Configure Environment Variables

Create a `.env` or `.env.local` file in the project root:

```powershell
# Copy the example file
Copy-Item .env.local.example .env
```

**Edit `.env` with your preferred text editor:**

```powershell
# Open in VS Code
code .env

# Or open in Notepad
notepad .env
```

**Minimum Required Configuration for Local Development:**

```env
# Backend API URL (local serverless offline or deployed backend)
VITE_API_BASE=http://localhost:3001

# Enable dev bypass for quick UX testing (localhost only)
VITE_ENABLE_DEV_BYPASS=true

# Frontend URL (for CORS)
VITE_FRONTEND_URL=http://localhost:5173

# Disable registration UI (matches production)
VITE_ENABLE_REGISTRATION=false
```

**Environment Variable Templates:**
- **`.env.example`** - Complete reference with all available variables
- **`.env.local.example`** - Local development template with explanations

See the [Project Bible - Environment Configuration](../PROJECT_BIBLE.md#environment-configuration) for complete variable descriptions.

### Step 3: Start Development Server

```powershell
# Start the Vite dev server
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

Open your browser to `http://localhost:5173/`

**Dev Server Features:**
- Hot Module Replacement (HMR) - Changes reflect instantly
- Fast refresh for React components
- Error overlay for build/runtime errors

### Step 4: Verify Frontend is Running

```powershell
# Test the local server (in a new PowerShell window)
Invoke-WebRequest -Uri http://localhost:5173/ -Method GET
```

Expected: Status 200 with HTML content

## Backend Local Development

The backend can be run locally using Serverless Offline, but this is **optional** for frontend development.

### Option A: Use Staging/Production Endpoints

The easiest approach for frontend development is to point your frontend at the deployed staging or production backend:

```env
# .env file
VITE_API_BASE=https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com
```

This avoids the need to run the backend locally and matches the production environment.

### Option B: Run Backend Locally (Advanced)

**Note:** Local backend setup requires additional configuration. See the [Backend Deployment Guide](../BACKEND-DEPLOYMENT.md) for complete instructions.

```powershell
# Navigate to serverless directory
cd serverless

# Install backend dependencies
npm ci

# Set database connection string
$env:DATABASE_URL = "postgresql://user:pass@localhost:5432/valine_db"
$env:JWT_SECRET = "your-32-character-secret-for-local-dev"

# Generate Prisma client
npx prisma generate --schema=../api/prisma/schema.prisma

# Start serverless offline
npx serverless offline
```

**Expected Output:**
```
Starting Offline at stage dev (us-west-2)

Offline [http for lambda] listening on http://localhost:3002
Function names exposed for local invocation by aws-sdk:
           * api: pv-api-dev-api

   ┌─────────────────────────────────────────────────────────────────────┐
   │                                                                       │
   │   ANY | http://localhost:3001/{proxy*}                               │
   │   POST | http://localhost:3001/2015-03-31/functions/api/invocations │
   │                                                                       │
   └─────────────────────────────────────────────────────────────────────┘

Server ready: http://localhost:3001 🚀
```

**Update frontend `.env`:**
```env
VITE_API_BASE=http://localhost:3001
```

## Environment Variables

### Frontend Environment Variables

All frontend environment variables must be prefixed with `VITE_` to be exposed to the client.

**Key Variables:**
- `VITE_API_BASE` - Backend API URL (required for production builds)
- `VITE_ENABLE_DEV_BYPASS` - Enable dev bypass button (localhost only)
- `VITE_FRONTEND_URL` - Frontend URL for CORS validation
- `VITE_ENABLE_REGISTRATION` - Show/hide registration UI
- `VITE_ALLOWED_USER_EMAILS` - Email allowlist (production)

**Templates:**
- **Development:** Use `.env.local.example` as a starting point
- **Production:** Use `.env.example` and set `VITE_API_BASE` to your production API Gateway URL

See `vite.config.js` for the build-time validation that enforces `VITE_API_BASE` in production builds.

### Backend Environment Variables

Backend variables are NOT prefixed with `VITE_` and are set in the serverless environment:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (32+ characters)
- `ALLOWED_USER_EMAILS` - Email allowlist (comma-separated)
- `ENABLE_REGISTRATION` - Enable/disable registration endpoint

## Troubleshooting

### Frontend Won't Start

**Error:** `Cannot find module '@vitejs/plugin-react'`

**Solution:**
```powershell
# Clean install
Remove-Item -Recurse -Force node_modules
npm install
```

### API Connection Failures

**Symptoms:** Frontend shows "API Unavailable" banner, automatic fallback to mock data

**Diagnosis:**
1. Check `VITE_API_BASE` in `.env` file
2. Verify backend is running (if local) or reachable (if deployed)
3. Check browser console for diagnostics: `window.__diagnostics.summary()`

**Solutions:**
- **Backend not running:** Start serverless offline or use deployed endpoint
- **CORS issues:** Verify backend CORS configuration allows your frontend URL
- **Wrong URL:** Double-check `VITE_API_BASE` format (no trailing slash)

See the [Auth Backend Investigation](../AUTH_BACKEND_INVESTIGATION.md) for DNS and connectivity troubleshooting.

### Hot Reload Not Working

**Solution:**
```powershell
# Restart the dev server
# Press Ctrl+C to stop, then:
npm run dev
```

### Build Failures

**Error:** Build fails during `npm run build`

**Common Causes:**
1. Missing `VITE_API_BASE` in production mode
2. Dev bypass enabled with production frontend URL
3. Corrupted `node_modules`

**Solutions:**
```powershell
# Check prebuild validation
npm run prebuild

# Clean rebuild
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force dist
npm install
npm run build
```

See `scripts/prebuild.js` and `scripts/postbuild-validate.js` for validation logic.

## Additional Development Commands

```powershell
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests (requires Playwright)
npx playwright install          # First time only
npm run test:e2e

# Lint code
npm run lint                    # If lint script exists

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

## Next Steps

- **[Frontend Build and Deploy](frontend-build-and-deploy.md)** - Learn the build and deployment process
- **[Backend Build and Deploy](backend-build-and-deploy.md)** - Deploy the serverless backend
- **[CI/CD Overview](ci-cd-overview.md)** - Understand automated workflows
- **[Troubleshooting Guide](../PROJECT_BIBLE.md#troubleshooting-guide)** - Common issues and solutions

## Additional Resources

- **[Project Bible - Developer Quick Start](../PROJECT_BIBLE.md#developer-quick-start)** - Quick reference commands
- **[Environment Variables Checklist](../ENV_CHECKLIST.md)** - Complete env var reference
- **[Frontend Deployment Guide](../DEPLOYMENT.md)** - MIME types, cache headers, and CloudFront configuration
- **[Backend Deployment Guide](../BACKEND-DEPLOYMENT.md)** - Canonical backend deployment documentation
