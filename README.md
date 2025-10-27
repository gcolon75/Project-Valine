# Project Valine

A collaborative platform for voice actors, writers, and artists to create and share scripts, auditions, and creative content.

> 📖 **New to Project Valine?** Check out [PROJECT_VALINE_SUMMARY.md](PROJECT_VALINE_SUMMARY.md) for a comprehensive overview of the project, architecture, current status, and next steps.

## Table of Contents

- [Overview](#overview)
- [Current Status](#current-status)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Available Routes](#available-routes)
- [Deployment & Verification](#deployment--verification)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Development](#development)
- [Technology Stack](#technology-stack)

## Overview

Project Valine is a **LinkedIn-style collaborative platform** specifically designed for voice actors, writers, and artists. The platform enables creative professionals to create and share scripts, auditions, and creative content while managing collaboration workflows through an AWS-hosted serverless infrastructure with AI-powered automation via Discord bots.

### High-Level Goals

1. **Professional Networking** - User profiles, connections, content feeds
2. **Creative Content Management** - Script creation, audition submissions, collaborative workflows
3. **AI-Powered Automation** - Discord bot orchestration, automated deployments, intelligent triage
4. **AWS Cloud Infrastructure** - Serverless backend with Lambda, API Gateway, DynamoDB, S3, and CloudFront

## Current Status

✅ **Active Development** - Phase 6 Complete

### Recent Achievements

- **Discord Bot Integration**: Unified "Rin" bot with specialized agent personalities for deployment, triage, and monitoring
- **DynamoDB Persistence**: Conversation state and audit logs stored in DynamoDB with TTL auto-cleanup
- **Staged Deployment Flow**: GitHub Actions workflows for automated client and orchestrator deployments
- **Automated Triage**: `/triage` command analyzes CI/CD failures and proposes fixes
- **Deployment Verification**: Comprehensive health checks with `/verify-latest` and `/diagnose` commands

### Quick Links

- [Latest Changes](CHANGELOG.md)
- [Setup Discord Bot](orchestrator/README.md)
- [Deployment Guide](orchestrator/docs/)
- [Troubleshooting](docs/troubleshooting/)

## Key Features

### Platform Features
- **Client Application**: React + Vite client with authentication and role-based access
- **User Profiles**: Portfolio management, connections, and professional networking
- **Content Management**: Sanity CMS for structured content
- **Messaging System**: Real-time communication between users
- **Script & Audition Management**: Create, share, and manage creative content

### Infrastructure & Automation
- **Serverless Backend**: AWS Lambda functions with API Gateway
- **Discord Bot Orchestrator**: Unified "Rin" bot with specialized agent personalities
  - Deployment automation (`/deploy-client`)
  - Infrastructure diagnostics (`/diagnose`, `/verify-latest`)
  - CI/CD triage (`/triage`)
  - Status reporting (`/status`, `/status-digest`)
- **DynamoDB Persistence**: State management with automatic TTL cleanup
- **GitHub Actions Integration**: Automated workflows for CI/CD
- **Staged Deployment**: Separate staging and production environments

## Architecture

### Frontend
- **Technology**: React 18 + Vite 5
- **Styling**: Tailwind CSS 3
- **Routing**: React Router v6
- **Deployment**: AWS S3 + CloudFront CDN

### Backend
- **API Framework**: Serverless Framework v3, AWS SAM
- **Runtime**: Node.js 20.x (API), Python 3.11 (Orchestrator)
- **Database**: DynamoDB (orchestrator state), Prisma ORM (API)
- **File Storage**: S3 with presigned URLs

### Orchestrator (Discord Bot)
- **Framework**: AWS SAM
- **Runtime**: Python 3.11
- **State Storage**: DynamoDB with TTL
- **Integrations**: Discord API, GitHub Actions API

### Key AWS Resources
- **S3**: Frontend hosting, file uploads, build artifacts
- **CloudFront**: CDN for global distribution
- **Lambda**: Serverless functions for API and orchestrator
- **API Gateway**: REST APIs for orchestrator and backend
- **DynamoDB**: State management and audit logs
- **SSM Parameter Store**: Configuration and feature flags

## Quick Start

### Prerequisites
- Node.js 20.x or later
- Python 3.11 (for orchestrator)
- AWS CLI configured (for deployment)
- Discord bot token (for orchestrator)
- GitHub personal access token (for orchestrator)

### Client Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   # Opens on http://localhost:5173 (Vite default)
   ```

3. **Build for production:**
   ```bash
   npm run build
   npm run preview  # Preview production build locally
   ```

### Backend Deployment

**Serverless API** (`/serverless`):
```bash
cd serverless
npm install
npx serverless deploy --stage dev
```

**Infrastructure API** (`/infra`):
```bash
cd infra
npx serverless deploy --stage dev
```

See [serverless/README.md](serverless/) and [infra/README.md](infra/) for detailed configuration.

### Orchestrator Setup

The orchestrator manages Discord bot interactions and GitHub Actions automation.

**Quick Setup:**
```bash
cd orchestrator

# Configure credentials
cp samconfig.toml.example samconfig.toml
# Edit samconfig.toml with your Discord and GitHub credentials

# Build and deploy
sam build
sam deploy --guided
```

**Register Discord Commands:**
```bash
# For staging (instant visibility)
./scripts/register_staging_slash_commands.sh

# Configure Discord Interactions Endpoint in Developer Portal
# Use the DiscordWebhookUrl from deployment outputs
```

**Detailed Guide:** [orchestrator/README.md](orchestrator/README.md)

## Project Structure

```
Project-Valine/
├── src/                    # React client source
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components
│   ├── routes/            # Route definitions
│   └── services/          # API services
│
├── serverless/            # Serverless API
│   ├── handler.js         # API router
│   └── serverless.yml     # Configuration
│
├── infra/                 # Infrastructure code
│   └── serverless.yml     # Presign function config
│
├── orchestrator/          # Discord bot & automation
│   ├── app/              # Application code
│   │   ├── handlers/     # Lambda handlers
│   │   ├── agents/       # Agent implementations
│   │   └── services/     # External service clients
│   ├── tests/            # Test suite
│   ├── scripts/          # Automation scripts
│   └── template.yaml     # SAM template
│
├── api/                   # API utilities
│   └── prisma/           # Database schema
│
├── docs/                  # Documentation
│   ├── diagnostics/      # Reports and diagnostics
│   ├── troubleshooting/  # Issue resolution guides
│   └── archive/          # Historical documentation
│
├── .github/
│   ├── workflows/        # CI/CD pipelines
│   └── agents/           # AI agent configurations
│
├── scripts/              # Utility scripts
├── public/               # Static assets
└── sanity/               # Sanity CMS config
```

## Available Routes

### Public Routes
- `/` - Home page
- `/about` - About page
- `/login` - Authentication

### Authenticated Routes
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

## Deployment & Verification

### Automated Deployment

**Client Deployment:**
- Triggered automatically on push to `main` branch
- Manual trigger via `/deploy-client` Discord command
- Deploys to S3 + CloudFront
- Workflow: `.github/workflows/client-deploy.yml`

**Orchestrator Deployment:**
- Triggered on changes to `orchestrator/` directory
- Uses AWS SAM for Lambda deployment
- Workflow: `.github/workflows/deploy-orchestrator.yml`

### Verification Tools

**Automated Health Checks:**
```bash
# Verify latest deployment
cd scripts
./verify-deployment.sh --help
```

**Discord Commands:**
- `/verify-latest` - Verify most recent deployment
- `/diagnose` - Run infrastructure diagnostics
- `/status` - Check GitHub Actions workflow status

**Manual Testing:**
```bash
cd orchestrator/scripts
./test-discord-endpoint.sh  # Test Discord Lambda health
```

See [scripts/VERIFICATION_GUIDE.md](scripts/VERIFICATION_GUIDE.md) for comprehensive verification procedures.

## Documentation

### Getting Started
- **[Project Summary](PROJECT_VALINE_SUMMARY.md)** - Comprehensive overview, architecture, and current status
- **[Changelog](CHANGELOG.md)** - Notable changes and version history
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project

### Orchestrator & Discord Bot
- **[Orchestrator README](orchestrator/README.md)** - Setup and usage guide
- **[Bot Unifier Guide](orchestrator/BOT_UNIFIER_GUIDE.md)** - Unified bot architecture
- **[Discord Slash Commands](orchestrator/DISCORD_SLASH_CMD_QUICK_REF.md)** - Available commands reference

### Deployment & Operations
- **[Deployment Verification](docs/diagnostics/DEPLOYMENT_VERIFICATION.md)** - Verification system overview
- **[Verification Guide](scripts/VERIFICATION_GUIDE.md)** - Detailed verification procedures

### Troubleshooting
- **[Discord Issues](docs/troubleshooting/discord/)** - Discord bot debugging and fixes
- **[Start Here - Discord Issues](orchestrator/START_HERE_DISCORD_ISSUES.md)** - Quick troubleshooting guide

### Development
- **[UX Changes](CHANGES.md)** - User experience improvements log
- **[Sanity Setup](SANITY_SETUP.md)** - CMS configuration guide

### Archive
- **[Historical Documentation](docs/archive/)** - Completed phases and deprecated guides

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development workflow and best practices
- Code style guidelines
- Testing requirements
- Pull request process
- Folder structure overview

## Development

### Running Locally

**Frontend:**
```bash
npm run dev  # Starts Vite dev server with hot reload (localhost:5173)
```

**Backend (Local Testing):**
```bash
cd serverless
npx serverless invoke local -f api
```

### Testing

**Orchestrator Tests:**
```bash
cd orchestrator
python -m pytest tests/
```

### Code Quality

- **Linting**: ESLint for JavaScript/React code
- **Formatting**: Follow existing code style
- **Security**: CodeQL scanning enabled in CI

### Environment Variables

See example configuration files:
- `.env.example` - Client environment variables
- `orchestrator/.env.example` - Orchestrator configuration
- `serverless/.env.example` - Backend API configuration

**Important**: Never commit actual `.env` files or credentials to the repository.

## Technology Stack

**Frontend**: React 18, Vite 5, Tailwind CSS 3, React Router v6  
**Backend**: Node.js 20.x, Python 3.11, Serverless Framework v3, AWS SAM  
**Database**: DynamoDB, Prisma ORM  
**Infrastructure**: AWS (S3, CloudFront, Lambda, API Gateway, SSM)  
**DevOps**: GitHub Actions, AWS OIDC  
**Integrations**: Discord Bot API, GitHub API, Sanity CMS

---

## Support

- **Issues**: [GitHub Issues](https://github.com/gcolon75/Project-Valine/issues)
- **Discord**: Join our Discord server for real-time support
- **Documentation**: See [docs/](docs/) for comprehensive guides
