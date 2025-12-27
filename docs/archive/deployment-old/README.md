# Archived Deployment Documentation

**Status**: ARCHIVED - For reference only  
**Date Archived**: 2025-12-27  
**Superseded By**: [docs/DEPLOYMENT_BIBLE.md](../../DEPLOYMENT_BIBLE.md)

---

## ⚠️ Important Notice

These deployment documents are **archived** and **no longer maintained**. They contain outdated or redundant information that has been consolidated into the canonical deployment guide.

**DO NOT USE** these guides for new deployments.

### Use Instead

For all deployment needs, refer to the **single source of truth**:

📖 **[docs/DEPLOYMENT_BIBLE.md](../../DEPLOYMENT_BIBLE.md)**

This comprehensive guide includes:
- Up-to-date environment configuration
- One-button deploy scripts
- Post-deploy verification
- Troubleshooting (including the 401 auth regression fix)
- Security checklist

---

## Archived Documents

These documents are kept for historical reference only:

| Document | Original Purpose | Why Archived |
|----------|------------------|--------------|
| `DEPLOYMENT_GUIDE.md` | General deployment guide | Superseded by DEPLOYMENT_BIBLE.md |
| `DEPLOYMENT_INSTRUCTIONS.md` | Quick deployment steps | Consolidated into DEPLOYMENT_BIBLE.md |
| `DEPLOYMENT_CHECKLIST.md` | Pre/post-deployment checklist | Integrated into DEPLOYMENT_BIBLE.md verification section |
| `AUTH-DEPLOYMENT.md` | Auth-specific deployment guide | Merged into DEPLOYMENT_BIBLE.md |
| `COOKIE_AUTH_DEPLOYMENT.md` | Cookie auth deployment guide | Merged into DEPLOYMENT_BIBLE.md |
| `REGISTRATION_FIX_DEPLOYMENT.md` | Registration fix deployment | Historical; functionality now stable |
| `AUTH-TROUBLESHOOTING.md` | Auth troubleshooting guide | Updated troubleshooting in DEPLOYMENT_BIBLE.md |

---

## Migration Notes

If you have bookmarks or references to these old docs:

- Replace links to any `serverless/*DEPLOYMENT*.md` with `docs/DEPLOYMENT_BIBLE.md`
- Update CI/CD pipelines to use new deploy scripts: `serverless/scripts/deploy.{ps1,sh}`
- Update runbooks to reference DEPLOYMENT_BIBLE.md

---

## Contact

Questions about deployment? See:
- 📖 [DEPLOYMENT_BIBLE.md](../../DEPLOYMENT_BIBLE.md)
- 🐛 [Route to Function Mapping](../debug/route-to-function.md) (for 401 troubleshooting)
- 💬 Create a GitHub issue if you need help

---

*Last Updated: 2025-12-27*
