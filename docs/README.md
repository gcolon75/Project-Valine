# Project Valine Documentation Index

Welcome to the **Project Valine (Joint)** documentation hub. This is your central reference for all technical documentation.

---

## 📚 Canonical Documentation (8 Core Documents)

All documentation has been consolidated into these **8 canonical documents**. Everything else has been archived.

### 1. [PROJECT_BIBLE.md](./PROJECT_BIBLE.md) 📖
**Complete Master Reference & Single Source of Truth**

The Bible contains everything:
- Executive summary and project overview
- Complete architecture details
- Database schema reference (all 15 tables)
- API endpoints reference
- Authentication & security
- Deployment procedures
- Environment configuration
- Testing strategy
- Agent instructions
- Project status & roadmap
- Quick reference cards

**Read this first** if you're new to the project or need comprehensive information.

---

### 2. [DEPLOYMENT_BIBLE.md](./DEPLOYMENT_BIBLE.md) 🚀
**Canonical Deployment Guide (PowerShell Only)**

Everything you need to deploy Project Valine:
- One-button deploy with `.\scripts\deploy.ps1`
- Prerequisites and tooling setup
- Environment configuration (with DATABASE_URL format requirements)
- Build process and packaging
- Post-deploy verification
- Rollback procedures
- Common deployment issues and fixes
- Security checklist

**Use this** when deploying to staging or production.

---

### 3. [ARCHITECTURE.md](./ARCHITECTURE.md) 🏗️
**High-Level System Architecture Overview**

Technical architecture deep-dive:
- System overview and component diagram
- Frontend (React + CloudFront CDN)
- Backend (Lambda + API Gateway)
- Database (RDS PostgreSQL + Prisma)
- Storage (S3 buckets)
- Data flow diagrams
- Security architecture
- Scalability and performance
- Disaster recovery

**Read this** to understand how the system is built and interconnected.

---

### 4. [OPERATIONS.md](./OPERATIONS.md) ⚙️
**Operations Runbook & Monitoring**

Day-to-day operations and incident response:
- On-call quick reference
- Monitoring and alerts (CloudWatch)
- Common operations (deploy, scale, cache invalidation)
- Incident response workflows (P0-P3 severity levels)
- Maintenance windows and procedures
- Runbook procedures (WSOD, connection pool exhausted, S3 failures)
- Discord bot operations

**Use this** during on-call shifts, incidents, or routine maintenance.

---

### 5. [API_REFERENCE.md](./API_REFERENCE.md) 📡
**Complete API Endpoints Documentation**

All API endpoints with examples:
- Authentication (signup, login, logout, password reset)
- User endpoints (profile CRUD, public profiles)
- Post endpoints (create, read, update, delete)
- Media endpoints (presigned URLs, uploads)
- Social endpoints (follow, unfollow, followers)
- Search endpoints (users, posts)
- Error codes and rate limiting
- PowerShell examples for all endpoints

**Use this** when integrating with the API or debugging endpoint behavior.

---

### 6. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) 🔧
**Common Issues & Fixes**

Quick troubleshooting guide:
- Discord command registration issues (401, 403, 429 errors)
- White screen of death (WSOD)
- Database connection issues
- CloudFront and CDN problems
- Authentication failures
- Deployment failures

**Use this** when something breaks or you encounter a known issue.

---

### 7. [DUPLICATE_USER_MITIGATION.md](./DUPLICATE_USER_MITIGATION.md) 🛡️
**Duplicate User Records - Root Cause & Fix**

Documents the duplicate user issue:
- Problem summary (two versions of same user)
- Root cause analysis (missing `normalizedEmail`)
- Schema drift fix
- Verification steps
- Prevention measures

**Read this** to understand the duplicate user issue and how it was resolved.

---

### 8. [README.md](./README.md) (this file) 📋
**Documentation Index**

You are here! This file serves as the navigation hub for all documentation.

---

## 🗂️ Archive

All other documentation (423 files) has been moved to **[docs/archive/](./archive/)** to preserve history. The archive includes:

- Old deployment guides
- Postmortems and incident reports
- Investigation and archaeology docs
- Fix summaries
- Deprecated runbooks
- Historical reference material

**Archived files have a header indicating:**
- Date archived: 2026-01-05
- Reason: Consolidated into canonical docs
- Canonical reference: Link to current doc

---

## 📊 Production Endpoints (Quick Reference)

| Service | URL/Identifier |
|---------|----------------|
| **Frontend** | https://dkmxy676d3vgc.cloudfront.net |
| **CloudFront Distribution** | E16LPJDBIL5DEE |
| **API Base** | https://wkndtj22ab.execute-api.us-west-2.amazonaws.com |
| **Frontend Bucket** | valine-frontend-prod |
| **Media Bucket** | valine-media-uploads |
| **Database Host** | project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com |

---

## 🔐 Database Connection (Quick Reference)

**Canonical DATABASE_URL (no spaces):**
```
postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require
```

**⚠️ CRITICAL:** Database URLs must NEVER contain spaces. Spaces cause authentication failures.

---

## 👥 New Contributors / Contractors

**Are you a contractor or temporary engineer joining the project?**

Start here: **[CONTRACTOR_ONBOARDING.md](./CONTRACTOR_ONBOARDING.md)**

This guide provides:
- 10-minute project orientation with architecture diagram
- Step-by-step local setup (PowerShell)
- Access checklist (GitHub, AWS, environment variables)
- Feature implementation guide with file paths and status
- Testing and debugging workflows
- Links to all canonical documentation

**Note:** The contractor onboarding guide is a navigation aid that links to canonical documentation. It is not part of the 8 canonical docs listed above.

---

## 🚦 Quick Start Guide

### For New Developers

1. Read **[PROJECT_BIBLE.md](./PROJECT_BIBLE.md)** (section 1-2) for project overview
2. Read **[ARCHITECTURE.md](./ARCHITECTURE.md)** to understand system design
3. Set up local environment (see PROJECT_BIBLE.md section 8)
4. Run tests: `npm test` (frontend) or `npm run test` (backend)
5. Deploy to staging: `.\scripts\deploy.ps1 -Stage staging -Region us-west-2`

### For On-Call Engineers

1. Bookmark **[OPERATIONS.md](./OPERATIONS.md)** for quick reference
2. Bookmark **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** for common issues
3. Set up CloudWatch dashboard access
4. Test emergency procedures (rollback, scale up, etc.)

### For API Consumers

1. Read **[API_REFERENCE.md](./API_REFERENCE.md)** for all endpoints
2. Use PowerShell examples provided in each endpoint section
3. Check rate limits and error codes
4. Test against staging before production

---

## 🛠️ PowerShell-Only Policy

**All commands and scripts in this documentation use PowerShell only.**

- ✅ PowerShell: `.\scripts\deploy.ps1 -Stage prod`
- ❌ Bash: `./scripts/deploy.sh --stage prod` (NOT SUPPORTED)

This ensures consistency across Windows environments and avoids cross-platform issues.

---

## 🔄 Documentation Maintenance

### When to Update Canonical Docs

- **New features added:** Update PROJECT_BIBLE.md, API_REFERENCE.md, and ARCHITECTURE.md
- **Schema changes:** Update PROJECT_BIBLE.md (section 4), ARCHITECTURE.md (data layer)
- **New deployment steps:** Update DEPLOYMENT_BIBLE.md
- **New operational procedures:** Update OPERATIONS.md
- **New known issues:** Update TROUBLESHOOTING.md
- **API endpoint changes:** Update API_REFERENCE.md

### Documentation Update Process

1. Make changes directly to canonical docs (no PRs to archive)
2. Update "Last Updated" date in doc header
3. Cross-link related docs if necessary
4. Test all code examples before committing
5. Notify team of significant changes

---

## 📞 Support & Contact

- **GitHub Issues:** [Project Valine Issues](https://github.com/yourusername/Project-Valine/issues)
- **Discord Bot:** Use `/help` command for admin operations
- **On-Call:** Check PagerDuty rotation

---

## 📈 Documentation Statistics

- **Total markdown files (before consolidation):** 620
- **Files in docs/ (before consolidation):** 424
- **Canonical documents (after consolidation):** 8
- **Files archived:** 616
- **Reduction:** 99% fewer active docs

---

**Last Updated:** 2026-01-05  
**Maintainer:** Project Valine Team  
**Status:** ✅ Current

---

## Quick Links

- [🏠 Back to Project Root](../README.md)
- [📖 Project Bible](./PROJECT_BIBLE.md) - Start here!
- [🚀 Deploy to Production](./DEPLOYMENT_BIBLE.md)
- [📡 API Documentation](./API_REFERENCE.md)
- [🗂️ Archived Docs](./archive/)
