# Project Valine

A collaborative platform for voice actors, writers, and artists to create and share scripts, auditions, and creative content.

## Features

- **Client Application**: React + Vite client with authentication and role-based access
- **Serverless Backend**: AWS Lambda functions with API Gateway
- **AI Orchestrator**: Automated workflow management via Discord and GitHub integration
- **Content Management**: Sanity CMS for structured content

## Quickstart

### Client Development

```bash
npm install
npm run dev   # opens on http://localhost:3000
```

### Backend Deployment

See `serverless/` and `infra/` directories for serverless function deployment.

### AI Orchestrator

⚠️ **Note**: The orchestrator code is currently in this repository but is planned to be migrated to its canonical location at `ghawk75-ai-agent/orchestrator` for better separation of concerns. See [ORCHESTRATOR_CONSOLIDATION.md](ORCHESTRATOR_CONSOLIDATION.md) for the migration plan.

The orchestrator manages automated workflows between Discord and GitHub:

```bash
cd orchestrator
# See orchestrator/README.md for deployment instructions
```

## Project Structure

- `/src` - React client application
- `/serverless` - API Lambda functions
- `/infra` - Infrastructure as code
- `/orchestrator` - AI workflow orchestrator (Discord + GitHub integration)
- `/sanity` - Sanity CMS configuration
- `/api` - API utilities and Prisma schema
- `/.github` - GitHub workflows and templates

## Routes

### Public Pages
- `/` - Home page
- `/about` - About page
- `/login` - Authentication

### Authenticated Pages
- `/feed` - Main content feed
- `/search` - Search functionality
- `/messages` - Messaging system
- `/bookmarks` - Saved content
- `/notifications` - User notifications
- `/settings` - User settings
- `/profile/:id` - User profiles
- `/scripts/*` - Script management
- `/auditions/*` - Audition management
- `/requests` - Access requests

## Development

- Both `npm run dev` and `npm start` work (they run Vite)
- Build with `npm run build`, preview with `npm run preview`
- Edit pages in `src/pages/` and routes in `src/App.jsx`

## Deployment Verification

The repository includes a comprehensive verification script to validate deployments:

```bash
./scripts/verify-deployment.sh --help
```

This script checks:
- GitHub Actions workflows and configuration files
- S3 and CloudFront deployment status
- Frontend accessibility and API health endpoints
- Discord bot and webhook integration

See [scripts/VERIFICATION_GUIDE.md](scripts/VERIFICATION_GUIDE.md) for detailed usage instructions.

## Documentation

### Orchestrator Consolidation
- [Orchestrator Consolidation Plan](ORCHESTRATOR_CONSOLIDATION.md) - Migration plan to ghawk75-ai-agent
- [Consolidation Status Report](CONSOLIDATION_STATUS_REPORT.md) - Current status and blockers

### Orchestrator (Current Location - To Be Migrated)
- [Orchestrator Documentation](orchestrator/README.md) - AI workflow automation
- [Integration Guide](orchestrator/INTEGRATION_GUIDE.md) - Discord and GitHub setup
- [Testing Guide](orchestrator/TESTING_GUIDE.md) - End-to-end testing

### Deployment
- [Deployment Verification](DEPLOYMENT_VERIFICATION.md) - Comprehensive deployment verification system
- [Verification Guide](scripts/VERIFICATION_GUIDE.md) - Detailed verification usage and troubleshooting

### Other Documentation
- [Sanity Setup](SANITY_SETUP.md) - CMS configuration
