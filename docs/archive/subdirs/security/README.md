# Security & Operational Documentation

## Overview
Comprehensive security, privacy, and operational documentation for Project Valine.

**Last Updated**: 2025-11-05  
**Maintained By**: Security, Privacy, and DevOps Teams

---

## Quick Navigation

### 🔐 Security & Compliance
- [CSP Rollout Plan](./csp-rollout-plan.md) - Content Security Policy implementation guide
- [Environment Variables Matrix](./environment-variables.md) - Complete configuration reference
- [Security Best Practices](../qa/security.md) - General security guidelines

### 🚨 Incident Response
- [Auth Abuse Response](./incident-response-auth-abuse.md) - Brute force, credential stuffing, account takeover

### 📋 Operational Runbooks
- [Password Reset](../runbooks/password-reset.md) - User and admin-initiated password reset procedures
- [Email Verification](../runbooks/email-verification.md) - Email verification and change flows
- [2FA Enablement](../runbooks/2fa-enablement.md) - Two-factor authentication setup and recovery

### 🔒 Privacy & Compliance
- [Data Export (GDPR/CCPA)](../privacy/data-export.md) - User data export procedures
- [Data Deletion (Right to be Forgotten)](../privacy/data-deletion.md) - Account and data deletion procedures

### 🚀 Deployment
- [Release & Canary Deployment Checklist](../deployment/release-checklist.md) - Production deployment procedures
- [Deployment Guide](../deployment/deployment-guide.md) - General deployment instructions

---

## Document Categories

### Runbooks
Operational procedures for day-to-day tasks and common scenarios.

| Document | Purpose | Audience |
|----------|---------|----------|
| [Password Reset](../runbooks/password-reset.md) | Handle password reset requests | Support, Ops |
| [Email Verification](../runbooks/email-verification.md) | Manage email verification flows | Support, Ops |
| [2FA Enablement](../runbooks/2fa-enablement.md) | Setup and recover 2FA | Support, Security |

### Security Guides
Security implementation and configuration documentation.

| Document | Purpose | Audience |
|----------|---------|----------|
| [CSP Rollout Plan](./csp-rollout-plan.md) | Implement Content Security Policy | DevOps, Security |
| [Environment Variables](./environment-variables.md) | Configure all environments | DevOps, Engineers |
| [Security Best Practices](../qa/security.md) | General security guidelines | All Engineers |

### Incident Playbooks
Step-by-step response procedures for security incidents.

| Document | Purpose | Audience |
|----------|---------|----------|
| [Auth Abuse Response](./incident-response-auth-abuse.md) | Respond to authentication attacks | Security, On-Call |

### Privacy & Compliance
GDPR, CCPA, and privacy-related procedures.

| Document | Purpose | Audience |
|----------|---------|----------|
| [Data Export](../privacy/data-export.md) | Handle data export requests | Support, Legal |
| [Data Deletion](../privacy/data-deletion.md) | Process deletion requests | Support, Legal |

### Deployment
Production deployment and release procedures.

| Document | Purpose | Audience |
|----------|---------|----------|
| [Release Checklist](../deployment/release-checklist.md) | Production deployment steps | DevOps, Engineers |
| [Deployment Guide](../deployment/deployment-guide.md) | General deployment procedures | DevOps |

---

## Common Scenarios

### User Account Issues

**"User forgot password"**
→ [Password Reset Runbook](../runbooks/password-reset.md) - Section: User-Initiated Password Reset

**"User can't verify email"**
→ [Email Verification Runbook](../runbooks/email-verification.md) - Section: Resend Verification Email

**"User lost 2FA device"**
→ [2FA Enablement Runbook](../runbooks/2fa-enablement.md) - Section: 2FA Recovery

**"User wants to delete account"**
→ [Data Deletion Runbook](../privacy/data-deletion.md) - Section: User Self-Service Deletion

**"User requests their data"**
→ [Data Export Runbook](../privacy/data-export.md) - Section: User Self-Service Export

### Security Incidents

**"Unusual login activity detected"**
→ [Auth Abuse Response](./incident-response-auth-abuse.md) - Section: Detection & Assessment

**"Multiple failed login attempts"**
→ [Auth Abuse Response](./incident-response-auth-abuse.md) - Section: Brute Force Attacks

**"Account appears compromised"**
→ [Auth Abuse Response](./incident-response-auth-abuse.md) - Section: Account Takeover

### Deployment & Configuration

**"Deploying to production"**
→ [Release Checklist](../deployment/release-checklist.md) - Section: Canary Deployment Process

**"Setting up environment variables"**
→ [Environment Variables Matrix](./environment-variables.md) - Section: Configuration by Environment

**"Implementing CSP"**
→ [CSP Rollout Plan](./csp-rollout-plan.md) - Section: Phase 1: Report-Only Mode

**"Need to rollback deployment"**
→ [Release Checklist](../deployment/release-checklist.md) - Section: Rollback Procedures

---

## Getting Started

### For New Team Members

1. **Read**: [Security Best Practices](../qa/security.md)
2. **Understand**: [Environment Variables Matrix](./environment-variables.md)
3. **Review**: [Deployment Guide](../deployment/deployment-guide.md)
4. **Familiarize**: Browse relevant runbooks for your role

### For On-Call Engineers

**Must Read**:
- [ ] [Auth Abuse Response Playbook](./incident-response-auth-abuse.md)
- [ ] [Release Checklist](../deployment/release-checklist.md)
- [ ] [Password Reset Runbook](../runbooks/password-reset.md)

**Should Review**:
- [ ] [Environment Variables Matrix](./environment-variables.md)
- [ ] All runbooks in [../runbooks/](../runbooks/)

### For Support Team

**Essential Runbooks**:
- [ ] [Password Reset](../runbooks/password-reset.md)
- [ ] [Email Verification](../runbooks/email-verification.md)
- [ ] [2FA Enablement](../runbooks/2fa-enablement.md)
- [ ] [Data Export](../privacy/data-export.md)
- [ ] [Data Deletion](../privacy/data-deletion.md)

### For Security Team

**Security Documentation**:
- [ ] [CSP Rollout Plan](./csp-rollout-plan.md)
- [ ] [Security Best Practices](../qa/security.md)
- [ ] [Auth Abuse Response](./incident-response-auth-abuse.md)
- [ ] [Environment Variables Matrix](./environment-variables.md)

---

## Maintenance

### Document Review Schedule

| Category | Review Frequency | Next Review |
|----------|-----------------|-------------|
| Runbooks | Quarterly | 2026-02-05 |
| Security Guides | Quarterly | 2026-02-05 |
| Incident Playbooks | After each incident | As needed |
| Privacy Docs | Annually or on regulation changes | 2026-11-05 |
| Deployment Guides | After major changes | As needed |

### How to Update Documentation

1. **Make Changes**: Edit relevant markdown file
2. **Update "Last Updated" Date**: At top of document
3. **Test Procedures**: Verify steps still accurate
4. **Submit PR**: Request review from document owner
5. **Update This Index**: If adding new documents

### Document Owners

| Area | Owner | Contact |
|------|-------|---------|
| Security | Security Team | security@valine.app |
| Privacy | Legal/Compliance | legal@valine.app |
| Deployment | DevOps Team | devops@valine.app |
| Runbooks | Operations Team | ops@valine.app |

---

## Contributing

### Creating New Documents

**Runbook Template**:
```markdown
# [Title] Runbook

## Overview
[Brief description]

**Last Updated**: YYYY-MM-DD
**Owner**: [Team Name]
**Severity**: [P1/P2/P3]

## Prerequisites
- [List prerequisites]

## Procedure
### Step 1: [Action]
[Detailed instructions]

## Troubleshooting
[Common issues and solutions]

## Related Documentation
- [Link to related docs]
```

**Incident Playbook Template**:
```markdown
# Incident Response: [Type]

## Overview
[Brief description]

## Detection
[How to detect the incident]

## Response Procedures
### Phase 1: Detection (0-5 min)
### Phase 2: Containment (5-15 min)
### Phase 3: Investigation (15-30 min)
### Phase 4: Remediation (30-60 min)

## Post-Incident
[Follow-up actions]
```

### Style Guidelines

- **Use clear, actionable language**
- **Include code examples** where applicable
- **Add screenshots** for UI procedures
- **Link to related documentation**
- **Keep procedures step-by-step**
- **Update timestamps** regularly

---

## Contact

### Questions or Feedback?
- **Slack**: #documentation or #security
- **Email**: docs@valine.app
- **Issues**: [GitHub Issues](https://github.com/gcolon75/Project-Valine/issues)

### Report Security Issue
- **DO NOT** open public GitHub issues for security vulnerabilities
- **Email**: security@valine.app
- **Use**: [GitHub Private Security Advisory](https://github.com/gcolon75/Project-Valine/security/advisories)

---

**Version**: 1.0  
**Last Updated**: 2025-11-05  
**Maintained By**: Documentation Team
