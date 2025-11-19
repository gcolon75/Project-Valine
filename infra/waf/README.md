# WAF Reattachment Plan

## Overview

This directory contains documentation and infrastructure-as-code stubs for reattaching AWS WAF (Web Application Firewall) to the CloudFront distribution. The WAF was previously disabled to diagnose white screen issues. This plan ensures safe reattachment with appropriate allow rules to prevent legitimate traffic from being blocked.

## Current Status

- **WAF Status**: Detached (disabled during white screen troubleshooting)
- **Distribution**: Protected by CloudFront default security
- **Next Step**: Staged reattachment with allow rules

## Recommended Allow Rules

### 1. Static Assets
Allow all requests to static assets that are required for the SPA to function:

```
PathPattern: /assets/*
Action: ALLOW
Priority: 100
```

### 2. Theme Initialization Script
Critical for preventing flash of unstyled content:

```
PathPattern: /theme-init.js
Action: ALLOW
Priority: 110
```

### 3. Favicons and PWA Manifest
Browser-requested files that should always be accessible:

```
PathPattern: /favicon*
Action: ALLOW
Priority: 120

PathPattern: /manifest.json
Action: ALLOW
Priority: 130
```

### 4. Robots and SEO
Allow search engine crawlers:

```
PathPattern: /robots.txt
Action: ALLOW
Priority: 140

PathPattern: /sitemap.xml
Action: ALLOW
Priority: 150
```

### 5. API Endpoints
Allow authenticated API requests:

```
PathPattern: /api/*
Action: ALLOW (with rate limiting)
Priority: 200
```

### 6. SPA Entry Point
Allow index.html and root path:

```
PathPattern: /
Action: ALLOW
Priority: 300

PathPattern: /index.html
Action: ALLOW
Priority: 310
```

## Block Rules (Placeholder)

These rules should be configured to block known malicious patterns while allowing legitimate traffic:

### 1. SQL Injection Attempts
```
RuleType: SQLInjection
Action: BLOCK
Priority: 1000
```

### 2. Cross-Site Scripting (XSS)
```
RuleType: XSS
Action: BLOCK
Priority: 1010
```

### 3. Rate Limiting
```
RuleType: RateLimit
Limit: 2000 requests per 5 minutes per IP
Action: BLOCK
Priority: 1020
```

### 4. Geographic Restrictions (Optional)
```
RuleType: Geo
AllowedCountries: [List of countries]
Action: BLOCK (for non-allowed countries)
Priority: 1030
```

## Terraform Configuration Stub

See `terraform-stub.tf` for infrastructure-as-code template to attach WebACL to CloudFront distribution.

## CloudFormation Alternative

See `cloudformation-stub.yaml` for CloudFormation template alternative.

## Deployment Process

### Phase 1: Create WebACL with Allow Rules (DRY RUN)
1. Create new WebACL or update existing one
2. Add allow rules for static assets and API paths
3. Set default action to ALLOW (initially permissive)
4. **DO NOT ATTACH** to distribution yet

### Phase 2: Test WebACL in Count Mode
1. Attach WebACL to distribution in COUNT mode
2. Monitor CloudWatch metrics for 24-48 hours
3. Review sampled requests to identify any false positives
4. Adjust rules as needed

### Phase 3: Enable Block Mode (Staged)
1. Switch default action to BLOCK for known attack patterns only
2. Keep static asset and API allows active
3. Monitor for 24 hours
4. If no issues, proceed to full enforcement

### Phase 4: Full Enforcement
1. Enable all block rules
2. Set up CloudWatch alarms for blocked requests spike
3. Document rollback procedure

## Monitoring

### CloudWatch Metrics to Watch
- `AllowedRequests`: Should remain steady
- `BlockedRequests`: Should only spike during actual attacks
- `CountedRequests`: Used during testing phase

### Alarms
Create CloudWatch alarms for:
- Spike in blocked requests (may indicate false positive)
- Sudden drop in allowed requests (may indicate misconfiguration)

## Rollback Procedure

If legitimate traffic is being blocked:

1. **Immediate**: Detach WebACL from distribution
   ```bash
   aws cloudfront update-distribution --id <DIST_ID> --if-match <ETAG> \
     --distribution-config file://dist-config-no-waf.json
   ```

2. **Review**: Check sampled requests in WAF console to identify rule causing blocks

3. **Fix**: Update allow rules or adjust block rule conditions

4. **Retest**: Attach WebACL in COUNT mode again before re-enabling BLOCK

## Scripts

- `../../scripts/waf-attach-plan.ps1`: PowerShell script to preview current vs planned WebACL association (dry-run only)

## Security Considerations

- **Start Permissive**: Begin with ALLOW mode and gradually restrict
- **Monitor First**: Use COUNT mode before BLOCK mode
- **Test Deep Links**: Ensure SPA routing still works with WAF enabled
- **API Rate Limits**: Configure separate rate limits for API vs static assets
- **False Positive Plan**: Have a rollback plan ready

## References

- [AWS WAF Developer Guide](https://docs.aws.amazon.com/waf/latest/developerguide/)
- [CloudFront + WAF Best Practices](https://docs.aws.amazon.com/waf/latest/developerguide/cloudfront-features.html)
- Project Documentation: `../../docs/waf-reattachment-checklist.md`
- Previous WAF Configuration: `../../WAF_CONFIGURATION.md` (root directory)

## Next Steps

1. Review this plan with team
2. Create WebACL with allow rules in AWS Console or via IaC
3. Run dry-run script to preview changes
4. Schedule reattachment during low-traffic period
5. Follow phased rollout process above

---

**Last Updated**: 2025-11-19  
**Status**: Planning / Not Yet Implemented
