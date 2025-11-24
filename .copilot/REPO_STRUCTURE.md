# Repository Structure

## Top-Level Directories

### `/client` - Client-Specific Files
- `src/lib/sanityClient.js` - Sanity CMS client
- `.env.sanity.example` - Sanity environment template

### `/src` - Frontend (React + Vite)
- `/components` - React components
- `/pages` - Page components (routes)
- `/lib` - Utilities and helpers
- `/context` - React contexts (Auth, Theme, Feed, Toast, Unread)
- `/hooks` - Custom React hooks
- `/services` - API service modules
- `/layouts` - Layout components (AppLayout, MarketingLayout)
- `/routes` - Route configuration
- `/styles` - Global styles
- `/utils` - Utility functions
- `/mocks` - MSW mock handlers
- `/analytics` - Analytics tracking
- `/seo` - SEO utilities

### `/serverless` - Backend (AWS Lambda + Serverless Framework)
- `/src/handlers` - Lambda function handlers
- `/src/utils` - Utility functions
- `/prisma` - Prisma schema and migrations
- `/layers` - Lambda layers (Prisma)
- `serverless.yml` - Serverless Framework configuration
- `build-prisma-layer.sh` - Builds Prisma Lambda layer

### `/api` - Database & Prisma
- `/prisma/schema.prisma` - Database schema
- `/prisma/migrations` - Database migrations

### `/scripts` - Deployment & Utility Scripts
- `deploy-ux-only.sh` - UX-only deployment
- `provision-production-accounts.mjs` - Create user accounts
- `admin-upsert-user.mjs` - User upsert utility
- `admin-set-password.mjs` - Password reset utility
- `verify-production-deployment.mjs` - Post-deployment checks
- `prebuild.js` - Pre-build validation
- `postbuild-validate.js` - Post-build validation
- `/seo/` - SEO generation scripts
- `/a11y/` - Accessibility scripts
- `/deployment/` - Deployment utilities

### `/.copilot` - Copilot Knowledge Base
- `README.md` - Quick overview
- `CHANGELOG.md` - All PRs and changes
- `DECISIONS.md` - Architectural decisions
- `AGENT_TASKS.md` - Agent task history
- `REPO_STRUCTURE.md` - This file

### `/.github` - GitHub Configuration
- `/workflows/` - GitHub Actions workflows
- `/ISSUE_TEMPLATE/` - Issue templates
- `CODEOWNERS` - Code ownership
- `pull_request_template.md` - PR template

### `/tests` - Test Files
- `/e2e/` - End-to-end tests
- Unit tests are co-located with source files (`__tests__/`)

### `/docs` - Documentation
- Various markdown documentation files

### `/orchestrator` - SAM Orchestrator (AWS)
- SAM templates for deployment orchestration

### `/infra` - Infrastructure
- Infrastructure-as-code configurations

## Key Files

### Configuration
- `package.json` - Node.js dependencies and scripts
- `vite.config.js` - Vite configuration
- `vitest.config.js` - Vitest test configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `playwright.config.js` - Playwright E2E configuration

### Documentation
- `README.md` - Main readme
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Complete deployment instructions
- `DEV_MODE.md` - Dev bypass mode documentation
- `ALLOWED_USERS.md` - Production user allowlist
- `SECRETS_MANAGEMENT.md` - Secrets handling guide
- `UX_DEPLOYMENT_CHECKLIST.md` - UX deployment checklist

### Environment
- `.env.example` - Environment variable template
- `.env.local.example` - Local development template
- `client/.env.local.example` - Client-specific dev template
- `.gitignore` - Git ignore rules

### Entry Points
- `index.html` - HTML entry point
- `src/main.jsx` - React entry point
- `src/App.jsx` - Main App component

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| React Components | PascalCase | `ProfileCard.jsx` |
| Pages | PascalCase | `Dashboard.jsx` |
| Hooks | camelCase with `use` prefix | `useAuth.js` |
| Utilities | camelCase | `formatDate.js` |
| Scripts | kebab-case | `deploy-ux-only.sh` |
| Node Scripts | camelCase.mjs | `admin-upsert-user.mjs` |
| Tests | Original + `.test.js` | `auth.test.js` |
| Contexts | PascalCase + Context | `AuthContext.jsx` |

## Important Patterns

### Authentication Flow
```
AuthContext.jsx → authService.js → API Endpoints
```

### Route Protection
```
PrivateRoute → AuthContext.user → Redirect if null
```

### API Calls
```
Component → services/*.js → axios → Backend API
```

### State Management
```
React Context (Auth, Theme, Feed, Toast, Unread)
```

### Styling
```
Tailwind CSS (utility-first)
```
