# Legal & Compliance Baseline

**Version:** 1.0.0  
**Last Updated:** November 12, 2025  
**Status:** MVP - Subject to Legal Counsel Review

## Overview

This document summarizes the legal and compliance baseline implementation for Project Valine. It provides a minimum viable set of policies and disclosures to enable safe public account creation with transparent data handling practices.

## Implemented Policies

### 1. Privacy Policy (`/legal/privacy`)
Comprehensive privacy policy covering:
- Data collection (account info, operational logs, technical data)
- Purpose of processing (account operation, security, reliability)
- Cookies and session tokens
- User rights (access, export, delete, correction, opt-out)
- Security measures (HttpOnly cookies, CSRF, rate limiting, 2FA, encryption)
- Data retention policies
- Data sharing and disclosure practices
- Storage locations (US-based cloud infrastructure)
- International users notice
- Children's privacy (13+ age requirement)
- Policy update procedures
- Contact information

### 2. Terms of Service (`/legal/terms`)
Standard terms covering:
- Acceptance of terms
- User responsibilities (accurate information, account protection, lawful use)
- Prohibited conduct (malicious activity, spam, unauthorized access, abuse)
- Intellectual property (platform ownership, user content license)
- Account termination (voluntary and involuntary)
- Data portability and deletion rights
- Limitation of liability
- Indemnification
- Dispute resolution
- Changes to terms
- Governing law (United States)
- Severability and entire agreement

### 3. Cookie & Session Disclosure (`/legal/cookies`)
Detailed cookie disclosure covering:
- What cookies are and why we use them
- Specific cookies used:
  - Access Token (authentication, 15-30 min, HttpOnly)
  - Refresh Token (session renewal, 7-30 days, HttpOnly)
  - XSRF-TOKEN (CSRF protection, session duration)
- Analytics cookies (currently disabled, future feature-flagged)
- Security rationale for each cookie
- Storage and duration details
- Third-party cookie policy (none currently used)
- Opt-out and browser controls
- Account deletion impact

## Endpoint Mapping

| Endpoint | Purpose | User Right | Status | Verification Method |
|----------|---------|------------|--------|---------------------|
| `GET /legal/privacy` | Privacy policy metadata | Public access | ✅ Implemented | API call returns policy metadata |
| `GET /legal/terms` | Terms of service metadata | Public access | ✅ Implemented | API call returns terms metadata |
| `GET /legal/cookies` | Cookie disclosure metadata | Public access | ✅ Implemented | API call returns cookie metadata |
| `POST /api/account/export` | Data export | Access/Export | 📋 Planned | Manual curl test (future) |
| `DELETE /api/account` | Account deletion | Delete | 📋 Planned | Manual curl test (future) |
| `PATCH /api/profile` | Profile updates | Correction | ✅ Existing | Profile edit functionality |
| `GET /api/me/preferences` | Preference access | Access | ✅ Existing | Settings page |
| `PATCH /api/me/preferences` | Preference updates | Correction | ✅ Existing | Settings page |

**Legend:**
- ✅ Implemented and verified
- 📋 Planned for future release
- ⚠️ Partially implemented

## Data Retention Matrix

| Data Type | Retention Period | Category | Rationale |
|-----------|------------------|----------|-----------|
| Account Data | Active + 30 days post-deletion | User Data | Recovery window |
| Verification Tokens | 24 hours | Security | Email verification, password reset |
| Access Tokens | 15-30 minutes | Session | Short-lived for security |
| Refresh Tokens | 7-30 days | Session | Persistent sessions |
| XSRF Tokens | Session duration | Security | CSRF protection |
| Login/Logout Events | 90 days | Audit Logs | Security monitoring |
| Security Events | 30-90 days | Audit Logs | Incident investigation |
| Profile Modifications | 30 days | Audit Logs | Change tracking |

## UI Integration

### Footer Links
- Added "Legal" column to MarketingFooter component
- Links to Privacy Policy and Terms of Service
- Accessible from all marketing pages

### Signup Consent
- Added inline consent text on Join page
- "By signing up, you agree to our Terms of Service and Privacy Policy"
- Links to both legal documents for review before signup

### SEO Integration
- Added metadata for all legal pages (title, description, canonical)
- Included in sitemap.xml with appropriate priority (0.4-0.5) and changefreq (yearly)
- No noIndex flag - legal pages are publicly discoverable

### Accessibility
- Proper heading hierarchy (single h1 per page)
- Skip-to-content links in marketing layout
- Focus management and keyboard navigation
- ARIA labels on interactive elements
- Color contrast compliant

## Security Measures Summary

Current security implementations referenced in policies:

1. **Authentication & Session Security**
   - HttpOnly cookies for tokens (XSS protection)
   - Secure flag (HTTPS only)
   - SameSite=Lax (CSRF mitigation)
   - Token rotation on refresh
   - Short-lived access tokens (15-30 min)

2. **Input Validation & Sanitization**
   - Server-side validation for all inputs
   - DOMPurify for client-side sanitization
   - SQL injection prevention via Prisma ORM

3. **Rate Limiting**
   - Login attempts
   - Registration attempts
   - API endpoints

4. **Two-Factor Authentication**
   - Optional TOTP-based 2FA
   - Feature-flagged (VITE_TWO_FACTOR_ENABLED)

5. **Encryption**
   - HTTPS/TLS for data in transit
   - Bcrypt for password hashing
   - Encryption at rest via managed cloud services

## Audit Logging

Current audit logging as documented in policies:

| Event Type | Retention | Description |
|------------|-----------|-------------|
| Login | 90 days | Successful and failed login attempts |
| Logout | 90 days | User-initiated logout events |
| Password Reset | 30 days | Password reset requests and completions |
| Profile Edits | 30 days | Changes to profile information |
| Security Events | 30-90 days | 2FA enrollment, suspicious activity |
| Session Events | 30 days | Session creation, refresh, revocation |

**Implementation Notes:**
- Logs stored securely with access controls
- Personal data minimized in logs
- Retention aligns with security monitoring needs
- Future: Implement user-accessible audit log view

## Feature Flags

### LEGAL_PAGES_ENABLED
- **Type:** Backend environment variable
- **Default:** `true`
- **Purpose:** Enable/disable legal pages for rollback
- **Impact:**
  - `true`: Legal pages accessible, included in sitemap
  - `false`: Legal pages return 404, excluded from sitemap
  - Footer links hidden when disabled

### Sitemap Integration
- Legal pages conditionally included based on feature flag
- Automatic generation during build (`npm run postbuild`)
- URLs normalized (trailing slash removal)
- Proper priority and changefreq settings

## Gap List (Future Phases)

### Moderation & Abuse Reporting
- [ ] User reporting system for content/abuse
- [ ] Moderation queue and workflow
- [ ] Content takedown procedures
- [ ] Appeals process

### Regional Compliance
- [ ] GDPR compliance (EU users)
  - [ ] Cookie consent banners for EU
  - [ ] Data processing agreements
  - [ ] Right to be forgotten automation
  - [ ] Data protection officer contact
- [ ] CCPA compliance (California users)
  - [ ] "Do Not Sell My Info" mechanism
  - [ ] California privacy rights disclosure
- [ ] Region-specific data residency options

### Data Subject Rights Automation
- [ ] Self-service data export (POST /api/account/export)
- [ ] Self-service account deletion (DELETE /api/account)
- [ ] Automated deletion workflow (30-day grace period)
- [ ] Export format (JSON, CSV options)
- [ ] Deletion confirmation emails

### Analytics & Tracking
- [ ] Analytics cookie implementation (feature-flagged)
- [ ] Opt-in/opt-out mechanism for analytics
- [ ] Privacy-respecting analytics solution (e.g., Plausible, Fathom)
- [ ] Update cookie disclosure with analytics details

### Internationalization (i18n)
- [ ] Multi-language support for legal documents
- [ ] Locale-specific privacy policies
- [ ] Translation workflow and versioning

### Contact & Support
- [ ] Contact form for privacy/legal inquiries
- [ ] Dedicated DSAR request form
- [ ] Support ticket system integration
- [ ] Response time SLAs

### Version Management
- [ ] Automated changelog integration
- [ ] Policy diff viewer (show changes between versions)
- [ ] User notification system for policy updates
- [ ] Acceptance tracking for updated terms

### Legal Review
- [ ] Formal legal counsel review of all documents
- [ ] Jurisdiction-specific customization
- [ ] Insurance and liability assessment
- [ ] Regular compliance audits

## Testing & Verification

### Unit Tests
- ✅ Legal page rendering tests
- ✅ Required sections presence validation (regex)
- ✅ Footer links integration
- ✅ Signup consent text presence

### Integration Tests
- ✅ Legal pages load with 200 status
- ✅ Links visible on landing page
- ✅ Links visible on signup page
- ✅ SEO metadata correct

### Manual Verification
- ✅ Visual inspection of all three legal pages
- ✅ Cross-linking between legal pages works
- ✅ Footer links navigate correctly
- ✅ Signup consent text displays
- ✅ Accessibility (keyboard navigation, screen reader)
- ✅ Mobile responsiveness

### Evidence
- Screenshots attached to PR
- Test output summary
- Manual curl transcripts (redacted)

## Rollback Plan

### Quick Rollback (Feature Flag)
1. Set `LEGAL_PAGES_ENABLED=false` in environment
2. Restart backend service
3. Legal routes return 404
4. Frontend still shows pages (client-side rendered)
5. Sitemap excludes legal pages on next build

### Full Rollback (Git Revert)
1. Revert branch merge
2. Rebuild and redeploy
3. Sitemap automatically updates

### Considerations
- Legal pages are client-side rendered, so backend flag only affects API
- Complete removal requires frontend code rollback
- Sitemap updates on build, not runtime

## Contact Information

For legal/compliance questions:
- **Privacy:** privacy@projectvaline.com (placeholder)
- **Legal:** legal@projectvaline.com (placeholder)
- **Support:** support@projectvaline.com (placeholder)

**Note:** Email addresses are placeholders. Configure actual email aliases before production deployment.

## Disclaimers

1. **MVP Status:** All legal documents are minimum viable versions designed to establish a baseline. They have not been reviewed by legal counsel.

2. **Formal Legal Review Required:** Before production deployment, all documents should undergo formal legal review and jurisdiction-specific customization.

3. **Ongoing Compliance:** Legal and regulatory requirements evolve. Regular reviews and updates are necessary to maintain compliance.

4. **Regional Variations:** Current policies are US-centric. International operations may require additional disclosures and compliance measures.

5. **User Rights Implementation:** Some user rights (export, delete) are documented but not fully implemented in automated workflows. Manual processes should be in place.

## Maintenance Schedule

- **Monthly:** Review for minor updates and clarifications
- **Quarterly:** Assess gap list and prioritize next compliance items
- **Annually:** Comprehensive legal review and update
- **As Needed:** Emergency updates for security incidents or legal changes

## References

- [GDPR Official Text](https://gdpr-info.eu/)
- [CCPA Official Text](https://oag.ca.gov/privacy/ccpa)
- [NIST Privacy Framework](https://www.nist.gov/privacy-framework)
- [OWASP Privacy Best Practices](https://owasp.org/www-project-top-10-privacy-risks/)

---

**Document Version:** 1.0.0  
**Last Reviewed:** November 12, 2025  
**Next Review:** February 12, 2026
