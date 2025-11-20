# Secrets Management Guide

This document provides a comprehensive inventory of all environment variables and secrets used in Project Valine, including their purpose, scope, rotation policy, and security guidelines.

## Table of Contents

1. [Overview](#overview)
2. [Environment Variables Inventory](#environment-variables-inventory)
3. [Secrets Rotation Policy](#secrets-rotation-policy)
4. [Secret Scanning & Detection](#secret-scanning--detection)
5. [Runtime Guardrails](#runtime-guardrails)
6. [Best Practices](#best-practices)

## Overview

Project Valine uses environment variables for configuration across frontend (Vite), backend (Serverless/Lambda), and CI/CD (GitHub Actions). This guide documents each variable to prevent misconfiguration, accidental exposure, and security vulnerabilities.

### Key Principles

- **Never commit secrets** to version control
- **Use GitHub Secrets** for CI/CD sensitive values
- **Use AWS Systems Manager Parameter Store** for production Lambda secrets
- **Rotate secrets** on a regular schedule (see rotation policy below)
- **Validate at runtime** that production deployments don't use default/placeholder values

## Environment Variables Inventory

### Authentication & Security

#### JWT_SECRET
- **Purpose**: Signs and verifies JWT tokens for user authentication
- **Scope**: Backend (Serverless/Lambda)
- **Type**: Secret
- **Rotation Policy**: Every 90 days or on suspected compromise
- **Source of Truth**: GitHub Secrets (CI/CD), AWS Parameter Store (production)
- **Default Allowed**: No - Must be set to secure random value (32+ characters)
- **Validation**: Runtime check fails if default value detected in production
- **Notes**: Current default `dev-secret-key-change-in-production` is for development only

#### ALLOWED_USER_EMAILS
- **Purpose**: Email allowlist for owner-only authentication mode
- **Scope**: Backend (Serverless/Lambda)
- **Type**: Configuration (contains user emails, not highly sensitive but should be controlled)
- **Rotation Policy**: As needed when access changes
- **Source of Truth**: GitHub Secrets, AWS Parameter Store
- **Default Allowed**: Yes (empty list allows all users, but not recommended for production)
- **Format**: Comma-separated email addresses (e.g., `user1@example.com,user2@example.com`)

#### VITE_ALLOWED_USER_EMAILS
- **Purpose**: Frontend email allowlist for UI validation (should match backend)
- **Scope**: Frontend (Vite build-time)
- **Type**: Configuration
- **Rotation Policy**: Keep in sync with ALLOWED_USER_EMAILS
- **Source of Truth**: GitHub Secrets
- **Default Allowed**: Yes (empty allows all)
- **Notes**: Frontend validation only; backend is authoritative

### Database

#### DATABASE_URL
- **Purpose**: PostgreSQL connection string for Prisma ORM
- **Scope**: Backend (Serverless/Lambda)
- **Type**: Secret (contains credentials)
- **Rotation Policy**: Every 90 days or on security incident
- **Source of Truth**: AWS Parameter Store, GitHub Secrets (staging)
- **Default Allowed**: No - Must be valid connection string
- **Format**: `postgresql://username:password@host:5432/database?schema=public`
- **Notes**: Use SSL in production (`?sslmode=require`)

### AWS Configuration

#### AWS_REGION
- **Purpose**: AWS region for resource deployment
- **Scope**: Backend, CI/CD
- **Type**: Configuration
- **Rotation Policy**: N/A (infrastructure config)
- **Source of Truth**: GitHub Variables, serverless.yml
- **Default Allowed**: Yes (us-west-2)

#### AWS_ACCOUNT_ID
- **Purpose**: AWS account identifier for IAM role assumption
- **Scope**: CI/CD (GitHub Actions)
- **Type**: Configuration (not secret, but should be controlled)
- **Rotation Policy**: N/A
- **Source of Truth**: GitHub Variables
- **Default Allowed**: Yes

#### AWS_ROLE_TO_ASSUME
- **Purpose**: IAM role ARN for OIDC authentication in GitHub Actions
- **Scope**: CI/CD
- **Type**: Configuration
- **Rotation Policy**: N/A
- **Source of Truth**: GitHub Variables
- **Default Allowed**: Yes
- **Format**: `arn:aws:iam::{account-id}:role/{role-name}`

#### S3_BUCKET
- **Purpose**: S3 bucket name for file uploads
- **Scope**: Backend
- **Type**: Configuration
- **Rotation Policy**: N/A
- **Source of Truth**: GitHub Variables, serverless.yml
- **Default Allowed**: Yes

#### CLOUDFRONT_DISTRIBUTION_ID
- **Purpose**: CloudFront distribution ID for frontend invalidation
- **Scope**: CI/CD
- **Type**: Configuration
- **Rotation Policy**: N/A
- **Source of Truth**: GitHub Variables
- **Default Allowed**: Yes

### Frontend Configuration

#### FRONTEND_URL (Canonical)
- **Purpose**: Frontend application base URL for CORS, redirects, and configuration
- **Scope**: Backend, CI/CD
- **Type**: Configuration
- **Rotation Policy**: N/A (changes with domain)
- **Source of Truth**: GitHub Variables
- **Default Allowed**: Yes (http://localhost:5173 for development)
- **Notes**: **This is the canonical variable**. Use this instead of FRONTEND_BASE_URL

#### FRONTEND_BASE_URL (Deprecated)
- **Purpose**: Legacy variable for frontend URL (use FRONTEND_URL instead)
- **Scope**: Backend
- **Type**: Configuration
- **Rotation Policy**: N/A - Being phased out
- **Source of Truth**: GitHub Variables (legacy)
- **Default Allowed**: Yes (for backward compatibility)
- **Deprecation**: Migrate to FRONTEND_URL. Compatibility shim logs warning if used.

#### VITE_FRONTEND_URL
- **Purpose**: Frontend URL for client-side configuration
- **Scope**: Frontend
- **Type**: Configuration
- **Rotation Policy**: N/A
- **Source of Truth**: GitHub Variables
- **Default Allowed**: Yes (http://localhost:5173)

#### VITE_API_BASE
- **Purpose**: Backend API base URL (API Gateway endpoint)
- **Scope**: Frontend
- **Type**: Configuration
- **Rotation Policy**: N/A (changes with API deployment)
- **Source of Truth**: GitHub Variables
- **Default Allowed**: Yes (http://localhost:3001)
- **Notes**: Use API Gateway URL, not CloudFront

### Test Credentials (Development/Staging Only)

#### TEST_USER_EMAIL
- **Purpose**: Email for automated test accounts
- **Scope**: Test harness, staging validation
- **Type**: Configuration (not secret)
- **Rotation Policy**: N/A
- **Source of Truth**: GitHub Variables
- **Default Allowed**: Yes (test environments only)
- **Production Usage**: MUST NOT be set in production environment

#### TEST_USER_PASSWORD
- **Purpose**: Password for automated test accounts
- **Scope**: Test harness, staging validation
- **Type**: Secret (test-only)
- **Rotation Policy**: Every 90 days
- **Source of Truth**: GitHub Secrets
- **Default Allowed**: Only in test/staging
- **Production Usage**: MUST NOT be set in production environment
- **Validation**: Runtime check fails if set in production

### Discord Integration

#### DISCORD_BOT_TOKEN
- **Purpose**: Discord bot authentication token for orchestration
- **Scope**: Backend orchestration, CI/CD
- **Type**: Secret
- **Rotation Policy**: Every 90 days or on compromise
- **Source of Truth**: GitHub Secrets
- **Default Allowed**: No - Must be valid Discord bot token
- **Format**: Discord token format (check for pattern in secret scanning)

#### DISCORD_WEBHOOK
- **Purpose**: Discord webhook URL for notifications
- **Scope**: CI/CD
- **Type**: Secret (contains webhook token)
- **Rotation Policy**: Every 90 days or regenerate if exposed
- **Source of Truth**: GitHub Secrets
- **Default Allowed**: No

#### DISCORD_PUBLIC_KEY
- **Purpose**: Discord application public key for signature verification
- **Scope**: Backend
- **Type**: Configuration (public key, not secret)
- **Rotation Policy**: N/A (rotate only if private key compromised)
- **Source of Truth**: GitHub Variables
- **Default Allowed**: Yes

#### DISCORD_CHANNEL_IDS
- **Purpose**: Discord channel IDs for notifications and orchestration
- **Scope**: Backend, CI/CD
- **Type**: Configuration
- **Rotation Policy**: N/A
- **Source of Truth**: GitHub Variables
- **Default Allowed**: Yes

#### DISCORD_APPLICATION_ID
- **Purpose**: Discord application identifier
- **Scope**: Backend
- **Type**: Configuration
- **Rotation Policy**: N/A
- **Source of Truth**: GitHub Variables
- **Default Allowed**: Yes

#### STAGING_DISCORD_* (Staging Variants)
- **Purpose**: Staging-specific Discord configuration
- **Scope**: Staging environment
- **Type**: Configuration/Secret (depending on specific variable)
- **Rotation Policy**: Same as production counterparts
- **Source of Truth**: GitHub Secrets (staging)
- **Default Allowed**: Yes (staging only)

### GitHub Integration

#### PAT (Personal Access Token)
- **Purpose**: GitHub Personal Access Token for API operations
- **Scope**: CI/CD orchestration
- **Type**: Secret
- **Rotation Policy**: Every 90 days or on compromise
- **Source of Truth**: GitHub Secrets
- **Default Allowed**: No - Must be valid GitHub PAT
- **Format**: `github_pat_*` or `ghp_*`
- **Permissions**: Repo scope (minimum required)

#### ORCHESTRATION_BOT_PAT
- **Purpose**: GitHub PAT for Discord bot orchestration operations
- **Scope**: Backend orchestration
- **Type**: Secret
- **Rotation Policy**: Every 90 days or on compromise
- **Source of Truth**: GitHub Secrets
- **Default Allowed**: No - Must be valid GitHub PAT

### Email (SMTP)

#### SMTP_HOST
- **Purpose**: SMTP server hostname for email sending
- **Scope**: Backend
- **Type**: Configuration
- **Rotation Policy**: N/A
- **Source of Truth**: GitHub Variables
- **Default Allowed**: Yes

#### SMTP_PORT
- **Purpose**: SMTP server port
- **Scope**: Backend
- **Type**: Configuration
- **Rotation Policy**: N/A
- **Source of Truth**: GitHub Variables
- **Default Allowed**: Yes (587 for TLS)

#### SMTP_USER
- **Purpose**: SMTP authentication username
- **Scope**: Backend
- **Type**: Secret
- **Rotation Policy**: Every 90 days
- **Source of Truth**: GitHub Secrets
- **Default Allowed**: No

#### SMTP_PASS
- **Purpose**: SMTP authentication password
- **Scope**: Backend
- **Type**: Secret
- **Rotation Policy**: Every 90 days or on compromise
- **Source of Truth**: GitHub Secrets
- **Default Allowed**: No

### Staging Environment

#### STAGING_URL
- **Purpose**: Staging environment frontend URL
- **Scope**: CI/CD, Backend
- **Type**: Configuration
- **Rotation Policy**: N/A
- **Source of Truth**: GitHub Variables
- **Default Allowed**: Yes

#### STAGING_ENABLE_*
- **Purpose**: Feature flags for staging environment
- **Scope**: Staging backend
- **Type**: Configuration
- **Rotation Policy**: N/A
- **Source of Truth**: GitHub Variables
- **Default Allowed**: Yes

## Secrets Rotation Policy

| Secret Type | Rotation Frequency | Trigger Events |
|-------------|-------------------|----------------|
| JWT_SECRET | Every 90 days | Security incident, suspected compromise |
| DATABASE_URL | Every 90 days | Security incident, credential leak |
| DISCORD_BOT_TOKEN | Every 90 days | Token exposure, security incident |
| PAT / ORCHESTRATION_BOT_PAT | Every 90 days | Exposure, permission changes |
| SMTP_PASS | Every 90 days | Security incident |
| TEST_USER_PASSWORD | Every 90 days | After staging tests complete |

### Rotation Process

1. **Generate new secret** using secure random generator (e.g., `openssl rand -base64 32`)
2. **Update GitHub Secrets** or AWS Parameter Store
3. **Deploy changes** to staging environment first
4. **Verify functionality** with new secret
5. **Deploy to production** after validation
6. **Revoke old secret** after 24-hour grace period
7. **Document rotation** in security audit log

## Secret Scanning & Detection

### Automated Tools

- **scripts/secret-audit.mjs**: Scans repository for accidental secret commits
- **workflows/secret-hygiene.yml**: CI workflow for continuous secret scanning
- **Pre-commit hook**: Developer-installed hook for local scanning

### Detection Patterns

The secret-audit script detects:

- AWS access keys (AKIA*, ASIA*)
- High-entropy strings (Shannon entropy threshold)
- GitHub tokens (`github_pat_*`, `ghp_*`)
- Discord bot tokens (specific format patterns)
- JWT-like base64 segments
- Common secret patterns (password=, secret=, token=)

### Allowlist Management

Use `.secret-allowlist` file to whitelist known false positives:
- Test fixture data
- Example configurations in documentation
- Public keys or non-sensitive base64 data

## Runtime Guardrails

### Secret Validation

The application validates secrets at runtime to prevent deployment with insecure defaults:

1. **JWT_SECRET validation**: Fails if default dev secret detected in production
2. **Test credential check**: Fails if TEST_USER_PASSWORD set in production
3. **Discord token validation**: Checks token format and length
4. **Database URL validation**: Ensures SSL for production connections

### Health Endpoint

`GET /health` returns `secretsStatus` object:

```json
{
  "status": "ok",
  "secretsStatus": {
    "jwtSecretValid": true,
    "discordConfigured": true,
    "smtpConfigured": false,
    "databaseConfigured": true,
    "insecureDefaults": []
  }
}
```

**Security Note**: The health endpoint returns only boolean flags and never exposes actual secret values.

### Structured Logging

Secret misconfiguration events are logged with:
- `correlationId`: Request tracing identifier
- `event`: `secret_misconfiguration`
- `level`: `error`
- `details`: Misconfiguration type (no secret values)

Example:
```json
{
  "timestamp": "2025-11-20T02:35:08.015Z",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "secret_misconfiguration",
  "level": "error",
  "details": {
    "type": "jwt_secret_invalid",
    "environment": "production"
  }
}
```

## Best Practices

### Development

- Use `.env.example` template for local setup
- Never commit `.env` or `.env.local` files
- Use development-specific defaults where safe
- Install pre-commit hook: `cp scripts/hooks/pre-commit-secret-scan.sh .git/hooks/pre-commit`

### Production

- Use AWS Systems Manager Parameter Store for secrets
- Enable all runtime guardrails
- Set `NODE_ENV=production`
- Use HTTPS and secure cookies (`Secure` flag)
- Enable CSRF protection
- Validate all secrets before deployment with `scripts/verify-env-contract.mjs`

### Secret Handling

- **Generate secrets**: Use cryptographically secure random generators
- **Minimum length**: 32 characters for JWT_SECRET and similar
- **No patterns**: Avoid dictionary words or predictable sequences
- **No sharing**: Each environment has its own secrets
- **Redaction**: Use `redactValue()` utility for logging sensitive keys

### Incident Response

If a secret is compromised:

1. **Immediately rotate** the compromised secret
2. **Audit logs** for unauthorized access using the secret
3. **Revoke old secret** immediately (no grace period)
4. **Document incident** in security log
5. **Review access patterns** that led to exposure
6. **Update detection rules** if new pattern identified

## Validation Script

Run pre-deployment validation:

```bash
node scripts/verify-env-contract.mjs
```

This script checks:
- Required production variables are set
- No test-only variables in production
- No insecure default values
- Variable naming conformity
- FRONTEND_URL vs FRONTEND_BASE_URL usage

## References

- [AUTH_RECOVERY_CHECKLIST.md](./AUTH_RECOVERY_CHECKLIST.md) - Authentication troubleshooting
- [.env.example](./.env.example) - Environment variable template
- [serverless/.env.example](./serverless/.env.example) - Backend environment template
- [scripts/secret-audit.mjs](./scripts/secret-audit.mjs) - Secret scanning tool
- [workflows/secret-hygiene.yml](./.github/workflows/secret-hygiene.yml) - CI secret scanning

## Change Log

- **2025-11-20**: Initial secrets management documentation
- **2025-11-20**: FRONTEND_URL canonicalization, FRONTEND_BASE_URL deprecated
- **2025-11-20**: Added runtime guardrails and health endpoint secretsStatus
