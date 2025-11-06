# Project Valine Documentation

Welcome to the Project Valine documentation! This directory contains comprehensive documentation for the entire project.

## 🚀 Quick Navigation

### For Developers
- **New to the project?** Start with [Quick Start Guide](quickstart/README.md)
- **API Development?** See [API Documentation](api/)
- **Backend work?** Check [Backend Documentation](backend/)
- **Frontend work?** Visit [Frontend Documentation](frontend/)
- **UX Audits?** See [UX Audit Documentation](UX_AUDIT_AGENT.md) and [UX Audit to Issues Guide](UX_AUDIT_TO_ISSUES_GUIDE.md)

### For Operations
- **Deploying?** See [Deployment Guides](deployment/)
- **Issues?** Check [Troubleshooting](troubleshooting/)
- **Monitoring?** Review [CloudWatch Setup](CLOUDWATCH_SETUP.md)
- **Quality Assurance?** See [QA Documentation](qa/)

### For Project Managers
- **Project overview?** Read [Project Summary](reference/project-summary.md)
- **Current status?** See [Project Status](reference/project-status.md)
- **Planning?** Review [Roadmap](reference/roadmap.md)

## 📚 Documentation Structure

```
docs/
├── SUMMARY.md                     # Complete documentation index
├── README.md                      # This file
│
├── api/                           # API documentation
│   ├── reference.md               # API endpoint reference
│   ├── contract.md                # API contracts
│   ├── integration-guide.md       # Integration guide
│   └── development.md             # Development practices
│
├── backend/                       # Backend documentation
│   ├── agent-instructions.md      # Development guidelines
│   └── profile-implementation.md  # Feature implementations
│
├── frontend/                      # Frontend documentation
│   ├── agent-instructions.md      # Development guidelines
│   └── api-integration-complete.md
│
├── deployment/                    # Deployment documentation
│   ├── overview.md                # Deployment overview
│   ├── aws-guide.md               # AWS deployment
│   ├── backend-instructions.md    # Backend deployment
│   ├── serverless-guide.md        # Serverless deployment
│   ├── quick-deploy.md            # Quick deployment
│   └── checklist.md               # Pre-deployment checklist
│
├── qa/                            # Quality Assurance & CI/CD
│   ├── ci-overview.md             # CI/CD workflow overview
│   ├── a11y-checklist.md          # Accessibility checklist
│   ├── lighthouse.md              # Performance guide
│   ├── bundle-optimization.md     # Bundle size optimization
│   └── security.md                # Security best practices
│
├── troubleshooting/               # Troubleshooting guides
│   ├── README.md                  # General troubleshooting
│   └── discord/                   # Discord-specific issues
│
├── quickstart/                    # Quick start guides
│   ├── README.md                  # Main quickstart
│   ├── agents.md                  # AI agents quickstart
│   └── orchestrator.md            # Orchestrator quickstart
│
├── guides/                        # Development guides
│   ├── handoff.md                 # Project handoff
│   ├── next-steps.md              # Next steps
│   ├── backlog.md                 # Feature backlog
│   ├── sanity-setup.md            # CMS setup
│   ├── supabase-setup.md          # Database setup
│   └── profile-settings.md        # Profile features
│
├── reference/                     # Reference documentation
│   ├── project-summary.md         # Project overview
│   ├── project-status.md          # Current status
│   ├── roadmap.md                 # Feature roadmap
│   ├── release-notes.md           # Version history
│   └── changes.md                 # Change log
│
├── archive/                       # Historical documentation
│   ├── historical/                # AI agent summaries
│   ├── merged/                    # Merged documents
│   └── ...                        # Other archived docs
│
├── diagnostics/                   # Diagnostic reports
│
└── ci/                            # CI/CD documentation
    ├── markdown-inventory.yml     # Doc inventory
    ├── reorganization-log.json    # Reorganization log
    └── docs-cleanup-report.md     # Cleanup report
```

## 🔍 Finding What You Need

### By Task
- **Setting up locally**: [Quick Start](quickstart/README.md)
- **Deploying to production**: [AWS Deployment Guide](deployment/aws-guide.md)
- **Adding a new API endpoint**: [API Development](api/development.md)
- **Debugging Discord integration**: [Discord Troubleshooting](troubleshooting/discord/)
- **Understanding the architecture**: [Project Summary](reference/project-summary.md)

### By Technology
- **AWS Lambda**: [Serverless Documentation](../serverless/README.md)
- **React Frontend**: [Frontend Documentation](frontend/)
- **PostgreSQL/Prisma**: [Backend Documentation](backend/)
- **Discord Bot**: [Orchestrator Documentation](../orchestrator/README.md)
- **Sanity CMS**: [Sanity Setup](guides/sanity-setup.md)

## 📋 Complete Index

For a complete, categorized list of all documentation, see [SUMMARY.md](SUMMARY.md).

## 🤝 Contributing to Documentation

When adding or updating documentation:

1. **Placement**: Put docs in the appropriate subdirectory
2. **Naming**: Use kebab-case for filenames (e.g., `my-guide.md`)
3. **Links**: Use relative links to other docs
4. **Index**: Update [SUMMARY.md](SUMMARY.md) when adding new docs
5. **Format**: Follow existing markdown formatting conventions

See [CONTRIBUTING.md](../CONTRIBUTING.md) for more details.

## 🗂️ Recent Changes

This documentation structure was reorganized on **2025-11-04** to improve discoverability and reduce duplication. Key changes:

- ✅ Consolidated duplicate documentation
- ✅ Organized into clear categories
- ✅ Archived historical documents
- ✅ Standardized file naming
- ✅ Updated all internal links

For details on the reorganization, see:
- [Reorganization Summary](REORGANIZATION_SUMMARY.md)
- [Cleanup Report](ci/docs-cleanup-report.md)

## 📞 Getting Help

- **General questions**: See [Project Summary](reference/project-summary.md)
- **Technical issues**: Check [Troubleshooting](troubleshooting/)
- **Can't find what you need?** Check the [Archive](archive/) for historical docs
- **Documentation issues?** Please open a GitHub issue

---

**Last Updated**: 2025-11-04  
**Documentation Version**: 2.0 (Post-reorganization)
