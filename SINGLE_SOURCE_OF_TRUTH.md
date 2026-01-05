# 📖 Single Source of Truth

**Project Valine uses TWO canonical reference documents. Use these instead of any other deployment or architecture guides.**

---

## 🎯 Canonical Documents

### 1. [PROJECT_BIBLE.md](docs/PROJECT_BIBLE.md)
**Complete Master Reference** - Everything about the system  
**Use for:** Architecture, features, database schemas, API endpoints, troubleshooting

### 2. [DEPLOYMENT_BIBLE.md](docs/DEPLOYMENT_BIBLE.md)
**Canonical Deployment Guide** - Step-by-step deployment procedures  
**Use for:** Deploying frontend, backend, orchestrator, environment configuration, rollback

---

## 🌐 Production Endpoints (Quick Reference)

| Resource | Value |
|----------|-------|
| Frontend (CloudFront) | https://dkmxy676d3vgc.cloudfront.net |
| Frontend S3 Bucket | `valine-frontend-prod` |
| CloudFront Distribution ID | `E16LPJDBIL5DEE` |
| Production API Base | https://wkndtj22ab.execute-api.us-west-2.amazonaws.com |
| Media Uploads Bucket | `valine-media-uploads` |

---

## 🔐 Database Connection

**Canonical DATABASE_URL (no spaces):**
```
postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require
```

⚠️ **CRITICAL:** Database URLs must NEVER contain spaces. Spaces cause authentication and connection failures.

---

## 🛠️ Schema Drift Prevention

Run this before committing schema changes:
```bash
node scripts/check-schema-drift.mjs
```

Both `api/prisma/schema.prisma` and `serverless/prisma/schema.prisma` MUST be identical.

---

## 📚 Other Important Documents

- **[README.md](README.md)** - Project overview and quick start
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines
- **[SECURITY.md](SECURITY.md)** - Security policies
- **[CHANGELOG.md](CHANGELOG.md)** - Version history
- **[docs/DOCUMENTATION_CONSOLIDATION.md](docs/DOCUMENTATION_CONSOLIDATION.md)** - What's canonical vs archived

---

## ❓ Which Document Should I Use?

| If you need to... | Use this document |
|-------------------|-------------------|
| Understand the architecture | PROJECT_BIBLE.md |
| Deploy to production | DEPLOYMENT_BIBLE.md |
| Troubleshoot an issue | PROJECT_BIBLE.md → Troubleshooting section |
| Set up environment variables | DEPLOYMENT_BIBLE.md → Environment Configuration |
| Understand database schema | PROJECT_BIBLE.md → Database Schema Reference |
| Roll back a deployment | DEPLOYMENT_BIBLE.md → Rollback Procedure |
| Find production URLs | This document or either Bible |
| Check for schema drift | Run `node scripts/check-schema-drift.mjs` |

---

**Last Updated:** 2026-01-05  
**Status:** ✅ Current

*If information conflicts between documents, the canonical bibles (PROJECT_BIBLE.md and DEPLOYMENT_BIBLE.md) take precedence.*
