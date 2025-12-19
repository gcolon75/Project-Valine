# Onboarding: Start Here

Welcome to **Project Valine (Joint)**! This onboarding pack will help you understand the architecture, build processes, and deployment workflows for this LinkedIn-style professional networking platform for creative professionals.

## What This Repo Is

**Joint** is a professional networking platform specifically designed for creative professionals in the entertainment industry—voice actors, writers, and artists. Built with:

- **Frontend:** React 18 + Vite 5 SPA, deployed to AWS CloudFront + S3
- **Backend:** Node.js 20.x serverless API (AWS Lambda + API Gateway), canonical implementation in `/serverless`
- **Database:** PostgreSQL (AWS RDS) with Prisma ORM
- **Orchestrator:** Python 3.11 Discord bot for deployment automation and diagnostics

For complete details, see the **[Project Bible](../PROJECT_BIBLE.md)** (the single source of truth for this project).

## What You Will Learn

This onboarding guide covers:

- 🏗️ **Architecture** - Component overview, request flow, and where to look first
- 💻 **Local Development** - Running the frontend and backend on your machine
- 🚀 **Frontend Deployment** - Building and deploying the SPA to AWS
- 🔧 **Backend Deployment** - Deploying serverless functions via Serverless Framework
- ⚙️ **CI/CD** - How GitHub Actions automate quality checks and deployments

## Primary Components

The repository is organized into these major components:

- **`src/`** - Frontend React SPA
  - Components, pages, routes, services, contexts, and hooks
  - Built with Vite, styled with Tailwind CSS

- **`serverless/`** - Backend API (CANONICAL for production)
  - Node.js Lambda functions via Serverless Framework
  - Express-style routing with Prisma ORM for database access

- **`api/prisma/`** - Database schema and migrations
  - `schema.prisma` - Database schema definition
  - `migrations/` - Migration history and rollback scripts

- **`infra/`** - Infrastructure code
  - CloudFront Functions (SPA routing)
  - WAF configuration
  - Presign function for S3 uploads

- **`orchestrator/`** - Discord bot for automation
  - Python 3.11 AWS SAM application
  - Deployment, diagnostics, triage, and status agents

## Next Steps

Start with the architecture overview to understand how components interact, then proceed to the build and deployment guides:

1. **[Architecture Overview](architecture.md)** - Understand the system design
2. **[Build and Run Locally](build-and-run-locally.md)** - Set up your development environment
3. **[Frontend Build and Deploy](frontend-build-and-deploy.md)** - Learn the frontend build pipeline
4. **[Backend Build and Deploy](backend-build-and-deploy.md)** - Deploy the serverless backend
5. **[CI/CD Overview](ci-cd-overview.md)** - Understand automated workflows

## Additional Resources

- **[Project Bible](../PROJECT_BIBLE.md)** - Complete master reference
- **[Documentation Index](../README.md)** - All documentation organized by category
- **[Troubleshooting Guide](../PROJECT_BIBLE.md#troubleshooting-guide)** - Common issues and solutions
- **[Contributing Guidelines](../../CONTRIBUTING.md)** - How to contribute to the project

---

**Need Help?**
- Check the [Troubleshooting section](../PROJECT_BIBLE.md#troubleshooting-guide) in the Bible
- Review the [Documentation Index](../README.md) for specific topics
- Open an issue on [GitHub](https://github.com/gcolon75/Project-Valine/issues)
