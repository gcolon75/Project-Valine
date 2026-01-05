> **ARCHIVED:** 2026-01-05
> **Reason:** Consolidated into canonical documentation
> **See:** [Documentation Index](../README.md) for current docs

---
# WAF Reattachment Checklist

## Overview

This checklist guides you through safely reattaching AWS WAF (Web Application Firewall) to the CloudFront distribution after it was disabled for white screen troubleshooting. The goal is to restore security protection without breaking legitimate traffic.

## Prerequisites

- [ ] White screen issues fully resolved and verified
- [ ] SPA routing confirmed working (deep links return 200)
- [ ] All critical assets accessible (JS bundles, CSS, theme-init.js)
- [ ] AWS CLI installed and configured
- [ ] CloudWatch access for monitoring
- [ ] Rollback plan prepared (see below)

## Phase 1: Preparation (1-2 hours)

### 1.1 Document Current State

- [ ] Run current distribution diagnostic
  ```powershell
  ./scripts/guard-cloudfront-config.sh --distribution-id $DISTRIBUTION_ID
  ```

- [ ] Capture current access patterns
  ```powershell
  # Save current CloudWatch metrics
  aws cloudwatch get-metric-statistics \
    --namespace AWS/CloudFront \
    --metric-name Requests \
    --dimensions Name=DistributionId,Value=$DISTRIBUTION_ID \
    --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 300 \
    --statistics Sum
  ```

- [ ] Save current distribution config
  ```powershell
  aws cloudfront get-distribution-config \
    --id $DISTRIBUTION_ID \
    > dist-config-no-waf.json
  ```

### 1.2 Review Allow Rules

Review `infra/waf/README.md` and confirm allow rules cover:

- [ ] `/assets/*` - Static assets
- [ ] `/theme-init.js` - Theme initialization
- [ ] `/favicon*` - Favicons
- [ ] `/manifest.json` - PWA manifest
- [ ] `/robots.txt` - SEO
- [ ] `/sitemap.xml` - SEO
- [ ] `/api/*` - API endpoints
- [ ] `/` and `/index.html` - SPA entry points

### 1.3 Create or Update WebACL

- [ ] Create new WebACL or update existing one with allow rules
- [ ] Set default action to **ALLOW** (permissive mode initially)
- [ ] Add AWS managed rule groups in **COUNT** mode:
  - SQL Injection protection
  - Known bad inputs
  - Core rule set
- [ ] Configure CloudWatch metrics and logging
- [ ] Note the WebACL ARN

## Phase 2: Testing in COUNT Mode (24-48 hours)

### 2.1 Attach WebACL in COUNT Mode

- [ ] Run dry-run preview first
  ```powershell
  .\scripts\waf-attach-plan.ps1 -DistributionId $DISTRIBUTION_ID -WebAclArn $WEB_ACL_ARN
  ```

- [ ] Attach WebACL to distribution
  ```powershell
  # Update distribution config with WebACL ARN
  # Edit dist-config.json and add: "WebACLId": "arn:aws:wafv2:..."
  
  aws cloudfront update-distribution \
    --id $DISTRIBUTION_ID \
    --if-match $ETAG \
    --distribution-config file://dist-config.json
  ```

- [ ] Wait for distribution to deploy (Status: `Deployed`)
  ```powershell
  aws cloudfront wait distribution-deployed --id $DISTRIBUTION_ID
  ```

### 2.2 Monitor COUNT Mode Metrics

Monitor for 24-48 hours and check:

- [ ] CloudWatch WAF metrics:
  - `AllowedRequests` - Should match current traffic
  - `CountedRequests` - Requests that would be blocked
  - `BlockedRequests` - Should be 0 (COUNT mode)

- [ ] Review sampled requests in AWS Console
  - WAF → Web ACLs → [Your WebACL] → Sampled requests
  - Look for legitimate traffic being "counted" as blocked

- [ ] Test critical user flows:
  - [ ] Home page loads
  - [ ] Deep links work (e.g., `/profile/username`)
  - [ ] API calls succeed
  - [ ] Static assets load
  - [ ] Theme initializes correctly

### 2.3 Analyze False Positives

If legitimate requests are being counted:

- [ ] Identify the rule causing the count
- [ ] Review the request pattern
- [ ] Add specific allow rule or exception
- [ ] Update WebACL and monitor for 24 more hours

## Phase 3: Enable BLOCK Mode (Staged - 48 hours)

### 3.1 Switch Managed Rules to BLOCK

- [ ] Change AWS managed rules from COUNT to BLOCK mode:
  ```
  SQL Injection: COUNT → none (blocks)
  Known Bad Inputs: COUNT → none (blocks)
  ```

- [ ] Keep default action as **ALLOW** (only blocking on specific rules)

- [ ] Update WebACL
  ```powershell
  aws wafv2 update-web-acl \
    --scope CLOUDFRONT \
    --id $WEB_ACL_ID \
    --region us-east-1 \
    --lock-token $LOCK_TOKEN \
    --cli-input-json file://web-acl-config.json
  ```

### 3.2 Monitor BLOCK Mode

Monitor for 24-48 hours:

- [ ] `BlockedRequests` metric should only show malicious traffic
- [ ] `AllowedRequests` should remain steady (no drop)
- [ ] No user reports of accessibility issues
- [ ] API success rate unchanged
- [ ] No spike in 403 errors in CloudFront logs

### 3.3 Set Up Alerts

- [ ] Create CloudWatch alarm for spike in blocked requests
  ```powershell
  aws cloudwatch put-metric-alarm \
    --alarm-name waf-blocked-requests-spike \
    --alarm-description "Alert when WAF blocks more than expected" \
    --metric-name BlockedRequests \
    --namespace AWS/WAFV2 \
    --statistic Sum \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 100 \
    --comparison-operator GreaterThanThreshold
  ```

- [ ] Alert for drop in allowed requests (may indicate false positives)

## Phase 4: Full Enforcement (Ongoing)

### 4.1 Add Rate Limiting

- [ ] Configure rate-based rules for API endpoints
  - Typical: 2000 requests per 5 minutes per IP
  - Adjust based on actual traffic patterns

### 4.2 Optional: Geographic Restrictions

If applicable:

- [ ] Add geo-blocking rules for known attack sources
- [ ] Monitor for impact on legitimate users

### 4.3 Ongoing Monitoring

- [ ] Weekly review of WAF metrics
- [ ] Monthly review of sampled requests
- [ ] Quarterly review of allow/block rules
- [ ] Update rules as application changes

## Rollback Procedure

If legitimate traffic is being blocked after any phase:

### Immediate Rollback

1. **Detach WAF immediately**
   ```powershell
   aws cloudfront update-distribution \
     --id $DISTRIBUTION_ID \
     --if-match $ETAG \
     --distribution-config file://dist-config-no-waf.json
   ```

2. **Verify traffic restored**
   - Check site loads correctly
   - Test critical user flows
   - Monitor error rates

3. **Wait for distribution deployment**
   ```powershell
   aws cloudfront wait distribution-deployed --id $DISTRIBUTION_ID
   ```

### Root Cause Analysis

4. **Review WAF logs**
   - Identify which rule blocked legitimate traffic
   - Check sampled requests for the pattern
   - Document the false positive

5. **Update allow rules**
   - Add specific exception for the legitimate pattern
   - Test updated WebACL in staging if available

6. **Retest**
   - Attach WebACL again in COUNT mode
   - Monitor for 24 hours before switching to BLOCK

## Communication Plan

### Before Reattachment

- [ ] Notify team of scheduled reattachment
- [ ] Document expected behavior
- [ ] Prepare status page update (if applicable)

### During COUNT Mode

- [ ] Daily status update to team
- [ ] Share CloudWatch metrics link

### During BLOCK Mode

- [ ] Announce switch to BLOCK mode
- [ ] Monitor support channels for user reports
- [ ] Be ready for immediate rollback

### Post-Deployment

- [ ] Document final WebACL configuration
- [ ] Update runbooks with new procedures
- [ ] Share metrics summary with stakeholders

## Success Criteria

- [ ] WebACL attached and active
- [ ] Zero impact on legitimate user traffic
- [ ] CloudWatch metrics stable:
  - `AllowedRequests` matches pre-WAF levels
  - `BlockedRequests` only shows attack traffic
  - No spike in 403 errors
- [ ] All critical user flows tested and working
- [ ] Rollback plan tested and ready
- [ ] Team trained on monitoring and rollback

## Related Documentation

- [WAF Plan README](../infra/waf/README.md) - Detailed allow/block rules
- [White Screen Runbook](white-screen-runbook.md) - Troubleshooting guide
- [CloudFront Config Guard](../scripts/guard-cloudfront-config.sh) - Diagnostic script
- [WAF Attach Plan Script](../scripts/waf-attach-plan.ps1) - Dry-run preview

## Contacts

- **Primary**: DevOps team
- **Escalation**: Engineering lead
- **AWS Support**: Premium support ticket if needed

---

**Last Updated**: 2025-11-19  
**Next Review**: After successful reattachment
