# Enhancement: Extended Secret Redaction Patterns

**Labels:** `enhancement`, `analyzer`, `security`  
**Dependency:** None

## Context

The orchestration analysis tool currently has basic secret redaction for GitHub tokens in error logs and artifact content. However, modern applications use many types of secrets that need redaction:
- JWT tokens
- Private keys (PEM format)
- Cloud provider credentials (AWS, GCP, Azure)
- API keys from third-party services
- Database connection strings
- OAuth tokens and refresh tokens

## Problem Statement

Current limitations:
- Only redacts basic GitHub token patterns (`ghp_*`, `ghs_*`)
- No redaction for cloud provider keys (AWS access keys, etc.)
- JWTs and other bearer tokens are not detected
- Private keys in PEM format leak into reports
- Database URLs with embedded credentials exposed
- No customizable redaction patterns per repository

This creates:
- **Security risk**: Secrets accidentally exposed in CI artifacts
- **Compliance issues**: PCI/SOC2 audit failures
- **Credential leakage**: Tokens end up in PR comments or reports
- **Audit trail**: Hard to prove secrets were properly handled

## Rationale

Extended secret redaction provides:
- **Security**: Prevent accidental credential exposure
- **Compliance**: Meet security audit requirements
- **Confidence**: Safe to share analysis reports publicly
- **Flexibility**: Support custom secret patterns per project

## Proposed Solution

Expand secret redaction patterns and make them configurable:

```javascript
// Enhanced secret patterns
const SECRET_PATTERNS = {
  // GitHub tokens
  github_pat: /ghp_[a-zA-Z0-9]{36}/g,
  github_oauth: /gho_[a-zA-Z0-9]{36}/g,
  github_app: /ghs_[a-zA-Z0-9]{36}/g,
  github_refresh: /ghr_[a-zA-Z0-9]{76}/g,
  
  // AWS credentials
  aws_access_key_id: /AKIA[0-9A-Z]{16}/g,
  aws_secret_access_key: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g,
  aws_session_token: /(?:aws_session_token|AWS_SESSION_TOKEN)["\s:=]+([A-Za-z0-9/+=]{100,})/gi,
  
  // Google Cloud
  gcp_api_key: /AIza[0-9A-Za-z\-_]{35}/g,
  gcp_oauth: /ya29\.[0-9A-Za-z\-_]+/g,
  
  // Azure
  azure_client_secret: /[a-zA-Z0-9~_-]{34,40}/g,
  
  // JWTs (standard format)
  jwt: /eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g,
  
  // Private keys
  rsa_private_key: /-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----/g,
  ssh_private_key: /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]*?-----END OPENSSH PRIVATE KEY-----/g,
  
  // Database URLs
  postgres_url: /postgres(?:ql)?:\/\/[^:]+:[^@]+@[^\/]+\/[^\s"']*/gi,
  mysql_url: /mysql:\/\/[^:]+:[^@]+@[^\/]+\/[^\s"']*/gi,
  mongodb_url: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@[^\s"']*/gi,
  
  // Generic API keys (common patterns)
  api_key_header: /(?:api[_-]?key|apikey|x-api-key)["'\s:=]+([a-zA-Z0-9_\-]{20,})/gi,
  bearer_token: /Bearer\s+([a-zA-Z0-9_\-\.=]+)/gi,
  
  // Stripe
  stripe_secret_key: /sk_live_[0-9a-zA-Z]{24,}/g,
  stripe_restricted_key: /rk_live_[0-9a-zA-Z]{24,}/g,
  
  // Slack
  slack_token: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,}/g,
  slack_webhook: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/g,
  
  // SendGrid
  sendgrid_api_key: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g,
  
  // Twilio
  twilio_api_key: /SK[a-f0-9]{32}/g,
  
  // NPM tokens
  npm_token: /npm_[a-zA-Z0-9]{36}/g,
  
  // Generic hex secrets (256-bit)
  hex_256: /[a-fA-F0-9]{64}(?![a-fA-F0-9])/g
};

// Redaction function
function redactSecrets(text, patterns = SECRET_PATTERNS) {
  let redacted = text;
  
  for (const [type, pattern] of Object.entries(patterns)) {
    redacted = redacted.replace(pattern, (match) => {
      // Keep first and last 4 chars for debugging
      const preview = match.length > 12 
        ? `${match.slice(0, 4)}***${match.slice(-4)}`
        : '***REDACTED***';
      
      return `[${type.toUpperCase()}_REDACTED:${preview}]`;
    });
  }
  
  return redacted;
}
```

## Acceptance Criteria

- [ ] Implement extended secret pattern library (20+ patterns)
- [ ] Support custom patterns via config file (see Enhancement #3)
- [ ] Redact secrets in:
  - [ ] Artifact file contents (JSON, HTML, logs)
  - [ ] Error messages and stack traces
  - [ ] PR comment output
  - [ ] Console output / debug logs
  - [ ] Exported reports (Markdown, JSON)
- [ ] Preserve partial secret for debugging (first/last 4 chars)
- [ ] Add secret detection scoring (reduce false positives)
- [ ] Include entropy analysis for generic secrets
- [ ] Log redaction events (count, types detected)
- [ ] Support allowlist for known non-secrets (test fixtures)
- [ ] Add unit tests with real-world secret examples
- [ ] Document all supported secret types
- [ ] Include performance benchmark (redaction overhead)
- [ ] Add `--no-redact` flag for debugging (developer only)

## Example Usage

```bash
# Automatic redaction (default)
node scripts/analyze-orchestration-run.mjs 123456

# Custom patterns via config
node scripts/analyze-orchestration-run.mjs 123456 \
  --config .orchestrator-config.json

# Debug: show redaction stats
node scripts/analyze-orchestration-run.mjs 123456 --log-level debug
# Output: Redacted 12 secrets: 5 GitHub tokens, 3 JWTs, 2 AWS keys, 2 database URLs

# Disable redaction (use carefully!)
node scripts/analyze-orchestration-run.mjs 123456 --no-redact
```

## Redaction Example

**Before:**
```
Error: API request failed
URL: https://api.stripe.com/v1/customers
Authorization: Bearer sk_test_EXAMPLE1234567890abcdefghij
Database: postgres://admin:EXAMPLE_PASSWORD@db.example.com:5432/production
```

**After:**
```
Error: API request failed
URL: https://api.stripe.com/v1/customers
Authorization: Bearer [STRIPE_SECRET_KEY_REDACTED:sk_t***ghij]
Database: [POSTGRES_URL_REDACTED:post***tion]
```

## Technical Notes

### False Positive Mitigation

- **Entropy analysis**: Check randomness of detected strings
- **Context awareness**: Don't redact in code comments
- **Allowlist**: Support known test fixtures
- **Validation**: Verify checksum if pattern supports it (e.g., AWS keys)

### Performance Considerations

- Compile regex patterns once at startup
- Process files in parallel
- Skip binary files
- Limit line length for regex matching (prevent ReDoS)

### Custom Pattern Config

```json
// In .orchestrator-config.json
{
  "secret_redaction": {
    "patterns": [
      {
        "name": "custom_api_key",
        "regex": "MYAPP_[A-Z0-9]{32}",
        "description": "Our app's custom API key format"
      }
    ],
    "allowlist": [
      "TEST_KEY_12345",
      "DEMO_SECRET_xyz"
    ]
  }
}
```

## Security Considerations

- **Never log original secrets**: Even in debug mode
- **Audit redaction failures**: Alert if patterns stop matching
- **Rate limits**: Don't over-redact (performance impact)
- **False sense of security**: Document that redaction isn't perfect

## Testing Strategy

```javascript
// Test with real-world examples (FAKE EXAMPLE SECRETS - NOT REAL)
describe('Secret Redaction', () => {
  it('redacts GitHub PAT', () => {
    const text = 'Token: ghp_EXAMPLE1234567890abcdefghijklmnop';
    expect(redactSecrets(text)).toContain('[GITHUB_PAT_REDACTED:ghp_***nop]');
  });
  
  it('redacts AWS access key', () => {
    const text = 'AWS_ACCESS_KEY_ID=AKIAEXAMPLE12345';
    expect(redactSecrets(text)).toContain('[AWS_ACCESS_KEY_ID_REDACTED:AKIA***345]');
  });
  
  it('redacts JWT', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    expect(redactSecrets(jwt)).toContain('[JWT_REDACTED:');
  });
});
```

## References

- GitHub Secret Scanning: https://docs.github.com/en/code-security/secret-scanning
- AWS Security Best Practices: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- OWASP Secrets Management: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- Regex101 (test patterns): https://regex101.com/
- Entropy Calculation: https://en.wikipedia.org/wiki/Entropy_(information_theory)

## Related Issues

- Enhancement #3: Externalized config (for custom patterns)
- Enhancement #8: PR comment templating (needs redaction)

## Priority

**P1** - Security critical, should be implemented soon to prevent credential leakage.
