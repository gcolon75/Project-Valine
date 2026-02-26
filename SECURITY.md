# Security Policy

## Overview

Project Valine is a LinkedIn-style collaborative platform for voice actors, writers, and artists. This document outlines our security policies, current protection mechanisms, vulnerability reporting procedures, and deployment best practices.

## Supported Versions

| Version | Status | Security Updates |
|---------|--------|------------------|
| 0.0.1 (current) | ✅ Production | Actively supported |
| Development branches | ⚠️ Testing | Not supported |

**Security Update Policy:**
- Critical vulnerabilities: Patched within 24-48 hours
- High severity: Patched within 1 week
- Medium/Low severity: Included in next scheduled release
- Security patches deployed via AWS Lambda function updates

---

## Defense-in-Depth Access Control

Project Valine implements a multi-layered security architecture with four independent protection levels:

### Layer 1: Edge Protection (CloudFront WAF)

**⚠️ DEPRECATION NOTICE**: Static IP allowlisting at the network edge (CloudFront WAF + API Gateway Resource Policy) has been retired as of 2025-11-13. The platform now relies on application-level email allowlist enforcement for access control, providing better flexibility for remote access while maintaining security.

**Current Edge Security (WAF Rate Limiting & DDoS Protection):**

CloudFront WAF is configured for rate limiting and basic threat mitigation, NOT static IP gating:

```yaml
# CloudFront Distribution: dkmxy676d3vgc
# WAF Configuration: Rate limiting only (optional)
- Rate Limit: 100 requests/5 minutes per IP
- Action: BLOCK excessive traffic
- DDoS Protection: AWS Shield Standard (automatic)
```

**Benefits of Removing Static IP Gating:**
- ✅ Authorized users can access from any location (home, office, mobile)
- ✅ No manual IP updates when users' ISPs change
- ✅ VPN and mobile access supported
- ✅ Better audit trail (CloudWatch logs show who logged in, not just IP)
- ✅ Scales to multiple authorized users without infrastructure changes

**If you need to detach legacy IP restrictions:**  
See `docs/runbooks/prod-deploy-and-routing.md` Section 13: WAF Detachment Procedures

**API Gateway Resource Policy (Post-Detachment):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-west-2:*:ce73w43mga/*"
    }
  ]
}
```

### Layer 2: Application-Level Enforcement

**Registration Lockdown**

```bash
# Environment variable (serverless/serverless.yml)
ENABLE_REGISTRATION=false

# Endpoint: POST /auth/register
# Response: 403 Forbidden
# Message: "Registration is currently disabled"
```

**Email Allowlist (Post-Authentication Gate)**

```bash
# Environment variable
ALLOWED_USER_EMAILS=owner@example.com,friend@example.com

# Flow:
# 1. User submits valid credentials → authentication succeeds
# 2. Middleware checks email against ALLOWED_USER_EMAILS
# 3. If NOT in allowlist → 403 Forbidden (no session created)
# 4. If in allowlist → session tokens issued
```

**Code Reference:**
```javascript
// serverless/src/middleware/auth.js
if (process.env.ALLOWED_USER_EMAILS) {
  const allowedEmails = process.env.ALLOWED_USER_EMAILS.split(',');
  if (!allowedEmails.includes(user.email)) {
    return {
      statusCode: 403,
      body: JSON.stringify({ 
        error: 'Access denied: email not in allowlist' 
      })
    };
  }
}
```

### Layer 3: Session & Cookie Security

**JWT Token Configuration**

| Setting | Development | Production |
|---------|-------------|------------|
| Access Token TTL | 30 minutes | 30 minutes |
| Refresh Token TTL | 7 days | 7 days |
| Algorithm | HS256 | HS256 |
| Secret Storage | Environment variable | AWS Systems Manager Parameter Store (recommended) |

**Cookie Security Headers**

```javascript
// Production cookie configuration
{
  httpOnly: true,              // ✅ XSS protection (no JavaScript access)
  secure: NODE_ENV === 'production',  // ✅ HTTPS only
  sameSite: 'Strict',          // ✅ CSRF protection
  domain: COOKIE_DOMAIN,       // Scoped to application domain
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days (refresh token)
}
```

**CORS Protection**

```javascript
// No wildcard origins allowed
const allowedOrigins = [
  process.env.FRONTEND_URL,           // CloudFront distribution
  'https://dkmxy676d3vgc.cloudfront.net'
];

// Credentials only allowed for whitelisted origins
cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true
})
```

### Layer 4: Local Development Bypass (Localhost Only)

**Dev Bypass - UX Iteration Tool**

For rapid local development and UX iteration, a localhost-only "Dev Bypass" feature is available with multiple security gates:

```bash
# Environment flags
VITE_ENABLE_DEV_BYPASS=false  # Must be 'true' to enable
VITE_FRONTEND_URL=http://localhost:5173  # Must NOT contain production domains
```

**Triple-Gate Security:**
1. **Hostname Check**: Button only renders when `window.location.hostname === 'localhost'`
2. **Environment Flag**: Requires `VITE_ENABLE_DEV_BYPASS === 'true'`
3. **Build Guard**: Build fails if enabled AND `VITE_FRONTEND_URL` contains `cloudfront.net` or `projectvaline.com`

**Implementation:**
- Dev Bypass button appears on login page only when all gates pass
- Clicking creates mock user: `{ id: 'dev-user', email: 'dev@local', roles: ['DEV_BYPASS'] }`
- Prominent banner displays: "DEV SESSION (NO REAL AUTH) - Localhost Only"
- No backend token generated, pure frontend session
- Automatically cleared on logout

**Production Safety:**
```javascript
// scripts/prebuild.js validates before every build
if (VITE_ENABLE_DEV_BYPASS === 'true' && 
    /cloudfront\.net|projectvaline\.com/.test(VITE_FRONTEND_URL)) {
  throw new Error('Dev bypass cannot be enabled in production!');
}
```

⚠️ **CRITICAL**: `VITE_ENABLE_DEV_BYPASS` MUST be `false` in all production deployments.

**Backend Dev Bypass Stub:**

A disabled backend endpoint stub exists at `serverless/src/handlers/devBypass.js` for future expansion. It is **NOT wired** to API Gateway and requires `DEV_BYPASS_ENABLED=false` (default). See stub file for implementation guidance if server-side dev bypass is needed in the future.

// Credentials only allowed for whitelisted origins
cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true
})
```

---

## Current Production Configuration

### Backend (serverless/serverless.yml)

```bash
# Security
ENABLE_REGISTRATION=false
ALLOWED_USER_EMAILS=owner@example.com  # ⚠️ Replace with actual owner email
JWT_SECRET=<generated-256-bit-secret>  # Generate: openssl rand -base64 32

# Environment
NODE_ENV=production
STAGE=prod
AWS_REGION=us-west-2

# Frontend Integration
FRONTEND_URL=https://dkmxy676d3vgc.cloudfront.net
COOKIE_DOMAIN=.cloudfront.net

# Protection Toggles
CSRF_ENABLED=true
RATE_LIMITING_ENABLED=true
EMAIL_ENABLED=true
```

### Frontend (Vite build environment)

```bash
# API Configuration
VITE_API_BASE=https://ce73w43mga.execute-api.us-west-2.amazonaws.com
VITE_ENABLE_REGISTRATION=false

# Build Environment
NODE_ENV=production
```

### Infrastructure Identifiers

| Resource | ID/Domain | Purpose |
|----------|-----------|---------|
| CloudFront Distribution | `dkmxy676d3vgc.cloudfront.net` | Frontend CDN + WAF |
| API Gateway HTTP API | `ce73w43mga` | Backend REST API (primary) |
| API Gateway REST API (legacy) | `oocr9ahsyk` | Deprecated, protected by Regional WAF |
| S3 Media Bucket | `valine-media-uploads` | User-uploaded media |
| RDS PostgreSQL | (private subnet) | Application database |

---

## Reporting a Vulnerability

### Contact Methods

**Primary:** Create a [Private Security Advisory](https://github.com/gcolon75/Project-Valine/security/advisories/new) on GitHub

**Alternative:** Email `security@projectvaline.com` (monitored by project owner)

### Response Timeline

| Severity | Initial Response | Fix Timeline | Disclosure |
|----------|------------------|--------------|------------|
| **Critical** | 24 hours | 48 hours | After fix deployment |
| **High** | 48 hours | 1 week | After fix deployment |
| **Medium** | 5 days | 2 weeks | After fix deployment |
| **Low** | 1 week | Next release | With release notes |

### Severity Classification

**Critical:**
- Remote code execution
- SQL injection leading to data breach
- Authentication bypass
- Privilege escalation to admin

**High:**
- XSS with session token theft
- CSRF bypassing SameSite protection
- Sensitive data exposure (PII, passwords)
- Hardcoded credentials in code

**Medium:**
- Denial of service attacks
- Information disclosure (non-sensitive)
- Missing rate limiting
- Insecure dependencies (CVSS 7.0+)

**Low:**
- Security misconfigurations
- Missing security headers
- Verbose error messages
- Deprecated cryptographic algorithms

### Bug Bounty Program

⚠️ **Not currently available.** This is a personal portfolio project used by the owner and one collaborator. We appreciate responsible disclosure but cannot offer monetary rewards.

---

## Known Limitations & Accepted Risks

### 1. Password Reset Flow

**Status:** ❌ Not implemented

**Rationale:** Only 2 users (owner + friend) have access. Password resets handled manually via database update.

**Mitigation:**
```sql
-- Manual password reset (run by owner via psql)
UPDATE "User" 
SET "password" = '$2b$10$[bcrypt-hash]' 
WHERE email = 'user@example.com';
```

### 2. Email Verification Enforcement

**Status:** ⚠️ Implemented but not enforced for existing users

**Rationale:** Owner verifies new accounts immediately upon creation.

**Current Behavior:**
- New registrations require email verification (when enabled)
- Existing users can log in without verified email
- Verification token expires after 24 hours

### 3. Rate Limiting on Authentication Endpoints

**Status:** ✅ Partially implemented

**Details:**
- Rate limiting middleware exists (`RATE_LIMITING_ENABLED=true`)
- Requires Redis/ElastiCache (not provisioned in current deployment)
- Fallback: CloudFront/WAF IP allowlist provides primary protection

**Future Enhancement:**
```bash
# Provision ElastiCache Redis cluster
REDIS_URL=redis://valine-cache.xxxxxx.cache.amazonaws.com:6379
RATE_LIMITING_ENABLED=true

# Limits (src/middleware/rateLimiter.js)
/auth/login: 5 requests/15 minutes per IP
/auth/register: 3 requests/hour per IP
/api/*: 100 requests/15 minutes per authenticated user
```

### 4. JWT Secret Storage

**Current:** Environment variable in AWS Lambda

**Risk:** Secrets visible in Lambda console to IAM users with `lambda:GetFunctionConfiguration`

**Recommended:** Migrate to AWS Secrets Manager

**Implementation:**
```javascript
// serverless/src/utils/getSecret.js
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-west-2' });

export async function getJwtSecret() {
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: 'valine/prod/jwt-secret' })
  );
  return response.SecretString;
}
```

**Migration Steps:**
1. Create secret: `aws secretsmanager create-secret --name valine/prod/jwt-secret --secret-string "$(openssl rand -base64 32)"`
2. Grant Lambda IAM role `secretsmanager:GetSecretValue` permission
3. Update `serverless/src/utils/jwt.js` to fetch secret at runtime
4. Remove `JWT_SECRET` from environment variables
5. Rotate secret after migration

### 5. HTTPS Enforcement

**Status:** ✅ Fully enforced

**Mechanisms:**
- CloudFront `ViewerProtocolPolicy: redirect-to-https`
- Cookies with `Secure` flag in production
- HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`

---

## Security Best Practices for Deployment

### 1. Strong JWT Secret Generation

```bash
# Generate cryptographically secure secret (256 bits)
openssl rand -base64 32

# Expected output format:
# 8zM3vN9qR5wX2jK7hF4dL6gP1sT0yU8aB3cE5fG7iH9

# Set in production environment
export JWT_SECRET="<generated-secret>"
```

⚠️ **Never:**
- Use dictionary words or predictable strings
- Reuse secrets across environments
- Commit secrets to Git (`.env` is gitignored)

### 2. JWT Secret Rotation

**Frequency:** Every 90 days or after suspected compromise

**Procedure:** See `docs/runbooks/rotate-jwt-secret.md` (to be created)

**Zero-Downtime Rotation:**
```bash
# 1. Add new secret to environment (both old and new supported)
JWT_SECRET_NEW=<new-secret>
JWT_SECRET_OLD=<current-secret>

# 2. Update verification logic to accept both secrets
# 3. Wait 7 days (refresh token TTL)
# 4. Remove JWT_SECRET_OLD
# 5. Rename JWT_SECRET_NEW → JWT_SECRET
```

### 3. Legacy IP Allowlist Management (Deprecated)

**⚠️ DEPRECATION NOTICE**: IP allowlist management at CloudFront/API Gateway layer is deprecated. Use application-level email allowlist instead.

**For WAF Detachment:** See `docs/runbooks/prod-deploy-and-routing.md` Section 13

**Legacy Update Instructions (If Not Yet Detached):**

**Update CloudFront WAF:**
```bash
# Get current WAF IP set
aws wafv2 get-ip-set --scope CLOUDFRONT --id <ip-set-id> --name valine-owner-ips

# Update IP set
aws wafv2 update-ip-set \
  --scope CLOUDFRONT \
  --id <ip-set-id> \
  --addresses <new-owner-ip>/32 \
  --lock-token <lock-token>
```

**Update API Gateway Resource Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-west-2:*:ce73w43mga/*",
      "Condition": {
        "NotIpAddress": {
          "aws:SourceIp": ["<new-owner-ip>/32"]
        }
      }
    }
  ]
}
```

### 4. Monitor Failed Login Attempts

**CloudWatch Logs Insights Query:**
```sql
fields @timestamp, @message
| filter @message like /login failed/
| stats count() as attempts by sourceIp
| sort attempts desc
| limit 20
```

**Alert Threshold:** >10 failed attempts from single IP in 5 minutes

**Response:** Temporarily block IP via WAF (manual intervention)

### 5. Enable CSRF Protection

**Production requirement:**
```bash
CSRF_ENABLED=true
```

**CSRF Token Flow:**
```javascript
// 1. Client requests CSRF token
GET /auth/csrf-token
Response: { csrfToken: "xyz123..." }

// 2. Client includes token in state-changing requests
POST /api/profile
Headers: { "X-CSRF-Token": "xyz123..." }

// 3. Server validates token before processing
```

**Exempt endpoints:**
- `GET /health`
- `GET /meta`
- `POST /auth/login` (protected by SameSite=Strict cookies)

### 6. Secrets Management Checklist

- [ ] `JWT_SECRET`: 256-bit random string, never committed
- [ ] `DATABASE_URL`: Includes password, stored in Parameter Store
- [ ] `SMTP_PASS`: API key for SendGrid/SES, rotated quarterly
- [ ] `PR_INTEL_WEBHOOK_SECRET`: GitHub webhook HMAC secret
- [ ] All `.env` files added to `.gitignore`
- [ ] No secrets in CloudFormation/Serverless templates
- [ ] Secrets encrypted at rest in AWS Parameter Store/Secrets Manager

### 7. Post-WAF Detachment Validation Checklist

After removing IP allowlist restrictions from CloudFront WAF and API Gateway, verify that security controls are functioning correctly:

**Public Access (Edge Layer):**
- [ ] Frontend accessible from non-allowlisted IP addresses
- [ ] Login page loads without 403 errors from CloudFront
- [ ] Static assets (JS, CSS, images) load correctly
- [ ] No WAF IP block messages

**Test Command:**
```bash
# From any IP (not owner IP)
curl -I https://dkmxy676d3vgc.cloudfront.net
# Expected: HTTP/2 200
```

**Application-Level Email Allowlist (Layer 2):**
- [ ] Allowlisted user can log in successfully (200 OK)
- [ ] Non-allowlisted user blocked after authentication (403 Forbidden)
- [ ] Invalid credentials rejected before allowlist check (401 Unauthorized)
- [ ] CloudWatch logs show "Login blocked: Email X not in allowlist" for denied users

**Test Commands:**
```bash
# Allowlisted user (should succeed)
curl -X POST https://ce73w43mga.execute-api.us-west-2.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"validpassword"}' \
  -v
# Expected: 200 OK, Set-Cookie headers

# Non-allowlisted user (should fail at app layer)
curl -X POST https://ce73w43mga.execute-api.us-west-2.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"unauthorized@example.com","password":"validpassword"}' \
  -v
# Expected: 403 Forbidden, "not authorized" message
```

**Session Security (Layer 3):**
- [ ] Cookies have HttpOnly flag (not accessible via JavaScript)
- [ ] Cookies have Secure flag (HTTPS only in production)
- [ ] Cookies have SameSite=Strict or Lax flag
- [ ] JWT tokens properly signed and validated

**Dev Bypass Disabled (Layer 4):**
- [ ] No "Dev Bypass" button on production login page
- [ ] `VITE_ENABLE_DEV_BYPASS` is false or undefined in production
- [ ] Build guard prevents accidental production builds with dev bypass

**Detailed Manual Verification:**  
See `docs/runbooks/verify-auth-hardening.md` for comprehensive step-by-step verification procedures.

---

## OWASP Top 10 Mitigations

| Vulnerability | Mitigation | Implementation |
|---------------|------------|----------------|
| **A01: Broken Access Control** | Email allowlist + role checks | `ALLOWED_USER_EMAILS`, middleware auth |
| **A02: Cryptographic Failures** | HTTPS everywhere, bcrypt (10 rounds) | CloudFront SSL, Prisma password hashing |
| **A03: Injection** | Prisma ORM (parameterized queries) | No raw SQL, input validation |
| **A04: Insecure Design** | Defense-in-depth, fail-secure defaults | 3-layer protection model |
| **A05: Security Misconfiguration** | Secure defaults, environment-based config | `serverless.yml`, `.env.example` |
| **A06: Vulnerable Components** | Dependabot, `npm audit` | Automated PR updates, CI checks |
| **A07: Authentication Failures** | JWT + HttpOnly cookies, bcrypt | Session management, password hashing |
| **A08: Data Integrity Failures** | CORS policies, SRI (future) | Strict origin validation |
| **A09: Security Logging Failures** | CloudWatch Logs, structured logging | Lambda auto-logging, audit trails |
| **A10: SSRF** | URL validation, allowlist domains | `URL_ALLOWED_DOMAINS` config |

---

## Compliance & Standards

### HTTPS Enforcement

✅ **Implemented:**
- CloudFront serves all traffic over HTTPS
- HTTP requests automatically redirected to HTTPS
- TLS 1.2+ required (TLS 1.0/1.1 disabled)

**Verification:**
```bash
curl -I https://dkmxy676d3vgc.cloudfront.net
# Expected: HTTP/2 200, strict-transport-security header
```

### XSS Protection

✅ **Implemented:**
- HttpOnly cookies (JavaScript cannot access session tokens)
- DOMPurify sanitization for user-generated content
- React automatic escaping for JSX

**Frontend Sanitization:**
```javascript
import DOMPurify from 'dompurify';

// Sanitize user bio before rendering
const safeBio = DOMPurify.sanitize(user.bio, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
  ALLOWED_ATTR: ['href']
});
```

### CSRF Protection

✅ **Implemented:**
- SameSite=Strict cookies (primary defense)
- CSRF tokens for state-changing requests (when `CSRF_ENABLED=true`)
- Double-submit cookie pattern

**Attack Prevention:**
```javascript
// Malicious site: evil.com
<form action="https://dkmxy676d3vgc.cloudfront.net/api/profile" method="POST">
  <input name="bio" value="hacked" />
</form>

// ❌ Browser blocks request due to SameSite=Strict
// ❌ No session cookie sent to cross-site request
// ❌ Server returns 401 Unauthorized
```

### Content Security Policy (CSP)

⚠️ **Planned for future release:**
```http
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'nonce-{random}'; 
  style-src 'self' 'unsafe-inline'; 
  img-src 'self' https://valine-media-uploads.s3.amazonaws.com;
  connect-src 'self' https://ce73w43mga.execute-api.us-west-2.amazonaws.com;
  frame-ancestors 'none';
```

---

## Security Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| **Primary Security Contact** | [Project Owner Email] | Vulnerability triage, incident response |
| **GitHub Security Advisories** | [Repository Security Tab](https://github.com/gcolon75/Project-Valine/security/advisories) | Private disclosure, CVE coordination |
| **Operational Runbooks** | `docs/runbooks/` | JWT rotation, IP updates, incident playbooks |

---

## Security Audit History

| Date | Auditor | Scope | Findings | Status |
|------|---------|-------|----------|--------|
| 2025-11-12 | GitHub Copilot Security Agent | Full stack (auth, infra, frontend) | 15 recommendations | Resolved (see `SECURITY_AUDIT_REPORT.md`) |

---

## Additional Documentation

- **Architecture Diagrams:** `docs/architecture/security-architecture.md` (to be created)
- **Incident Response Plan:** `docs/runbooks/security-incident-response.md` (to be created)
- **JWT Rotation Procedure:** `docs/runbooks/rotate-jwt-secret.md` (to be created)
- **Dependency Security:** `.github/dependabot.yml` (automated updates)
- **Security Testing:** `tests/security/` (penetration test scripts)

---

## License

This security policy is part of Project Valine and follows the same license as the main project.

**Last Updated:** 2025-11-12  
**Policy Version:** 1.0  
**Next Review:** 2025-12-12 (quarterly reviews)
