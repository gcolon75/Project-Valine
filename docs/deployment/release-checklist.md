# Release & Canary Deployment Checklist

## Overview
Comprehensive checklist for production releases and canary deployments for Project Valine, ensuring safe and reliable deployments.

**Last Updated**: 2025-11-05  
**Owner**: DevOps & Engineering Team  
**Applies To**: All production releases

---

## Table of Contents
- [Pre-Release Checklist](#pre-release-checklist)
- [Canary Deployment Process](#canary-deployment-process)
- [Full Production Rollout](#full-production-rollout)
- [Post-Deployment Validation](#post-deployment-validation)
- [Rollback Procedures](#rollback-procedures)
- [Communication Templates](#communication-templates)

---

## Pre-Release Checklist

### 1. Code Review & Testing (1-2 days before)

#### Code Quality
- [ ] All pull requests reviewed and approved by at least 2 engineers
- [ ] All GitHub Actions CI checks passing (lint, build, test)
- [ ] Code coverage meets threshold (>80% for critical paths)
- [ ] No unresolved merge conflicts
- [ ] Changelog updated with user-facing changes

#### Testing
- [ ] Unit tests pass locally and in CI
- [ ] Integration tests pass in staging environment
- [ ] E2E tests pass for critical user flows:
  - [ ] User registration and login
  - [ ] Profile creation and editing
  - [ ] Content upload (posts, reels)
  - [ ] Messaging functionality
  - [ ] Search and discovery
- [ ] Performance tests show no regressions
- [ ] Load tests validate capacity under expected traffic
- [ ] Visual regression tests reviewed (Percy/Chromatic)

#### Security
- [ ] Security scan completed (CodeQL, Snyk)
- [ ] No critical or high vulnerabilities
- [ ] Dependencies updated and audited (`npm audit`)
- [ ] Secrets properly configured (not hardcoded)
- [ ] CSP violations reviewed (if CSP enabled)
- [ ] OWASP ZAP scan completed (if significant changes)

### 2. Database & Infrastructure (1 day before)

#### Database Migrations
- [ ] Migrations tested in staging environment
- [ ] Rollback migration script prepared and tested
- [ ] No destructive changes without data backup
- [ ] Migration execution time estimated (<5 min preferred)
- [ ] Database backup completed before migration
- [ ] Migration documentation updated

```bash
# Verify migration
cd api
npx prisma migrate status --preview-feature

# Test rollback
npx prisma migrate resolve --rolled-back <migration_name>
```

#### Infrastructure
- [ ] AWS infrastructure changes reviewed (if applicable)
- [ ] CloudFormation/Terraform changes validated
- [ ] DNS changes scheduled (if applicable)
- [ ] SSL certificates valid and up-to-date
- [ ] CDN cache invalidation plan prepared
- [ ] Auto-scaling policies reviewed

### 3. Monitoring & Alerting (1 day before)

#### Observability Setup
- [ ] CloudWatch dashboards updated for new metrics
- [ ] Alerts configured for critical metrics:
  - [ ] Error rate (>2% triggers P2, >5% triggers P1)
  - [ ] Latency (p95 >2s triggers P3, >5s triggers P2)
  - [ ] Availability (<99.9% triggers P1)
  - [ ] Database connections (>80% pool triggers P2)
- [ ] Sentry error tracking configured
- [ ] Log aggregation working (CloudWatch Logs Insights)
- [ ] Synthetic monitoring configured (Pingdom/Datadog)

#### Metrics Baseline
- [ ] Capture baseline metrics from current production:
  - [ ] Average response time: _____
  - [ ] Error rate: _____
  - [ ] CPU utilization: _____
  - [ ] Memory utilization: _____
  - [ ] Database connections: _____

### 4. Communication (Day before)

#### Internal
- [ ] Release notes shared with team
- [ ] On-call schedule confirmed
- [ ] War room scheduled (Zoom/Slack huddle)
- [ ] Stakeholders notified of deployment window

#### External (if user-impacting)
- [ ] Status page update scheduled
- [ ] User notification prepared (email/in-app)
- [ ] Support team briefed on changes
- [ ] Social media updates drafted (if major release)

---

## Canary Deployment Process

### What is Canary Deployment?
Gradual rollout of changes to a small percentage of users to detect issues before full rollout.

### Canary Strategy

```
Stage 1: 5% traffic (30 min)
  ↓ Monitor & validate
Stage 2: 25% traffic (1 hour)
  ↓ Monitor & validate
Stage 3: 50% traffic (1 hour)
  ↓ Monitor & validate
Stage 4: 100% traffic (full rollout)
```

### Stage 1: 5% Canary (30 minutes)

#### Deploy Canary
```bash
# Tag release
git tag -a v1.2.3 -m "Release v1.2.3: Profile links feature"
git push origin v1.2.3

# Deploy backend (Lambda with alias routing)
cd serverless
npm run deploy -- --stage prod --alias canary --traffic 5

# Deploy frontend (CloudFront weighted routing)
cd ..
npm run build
aws s3 sync dist/ s3://valine-frontend-canary/
```

#### Validation Checklist (5% traffic)
- [ ] **Deployment successful**: All services deployed without errors
- [ ] **Health checks pass**: `/health` endpoint returns 200
- [ ] **Error rate normal**: <1% in canary group
- [ ] **Latency acceptable**: p95 <2s, p99 <5s
- [ ] **No critical errors**: Sentry shows no new P1 issues
- [ ] **Database stable**: Connection pool <50%, query performance normal
- [ ] **User reports**: No complaints in support channels

**Dashboard to Monitor**:
```
CloudWatch Dashboard: Valine Canary
- Error rate (canary vs stable)
- Latency p50, p95, p99 (canary vs stable)
- Request count
- 5xx errors
- Database query time
```

**Go/No-Go Decision**:
- ✅ **PROCEED**: All metrics within acceptable range
- 🛑 **ROLLBACK**: Any critical issue or error rate >2%

### Stage 2: 25% Canary (1 hour)

#### Increase Traffic
```bash
# Backend
cd serverless
npm run deploy -- --stage prod --alias canary --traffic 25

# Frontend (update CloudFront distribution)
aws cloudfront update-distribution \
  --id $DISTRIBUTION_ID \
  --distribution-config file://canary-25percent.json
```

#### Validation Checklist (25% traffic)
- [ ] Error rate <1% in canary group
- [ ] Latency p95 <2s
- [ ] No new critical errors in Sentry
- [ ] User experience positive (check user feedback, support tickets)
- [ ] Database performance stable
- [ ] CPU/Memory utilization normal

**Additional Checks**:
- [ ] Check specific feature usage:
  ```sql
  -- Example: Profile links feature usage
  SELECT COUNT(*) as new_profile_links
  FROM profile_links
  WHERE created_at > NOW() - INTERVAL '1 hour';
  ```
- [ ] Verify third-party integrations working
- [ ] Check CDN cache hit rate

**Go/No-Go Decision**:
- ✅ **PROCEED**: All metrics stable, no degradation
- 🛑 **ROLLBACK**: Error rate >1.5%, latency increase >20%

### Stage 3: 50% Canary (1 hour)

#### Increase Traffic
```bash
# Backend
cd serverless
npm run deploy -- --stage prod --alias canary --traffic 50

# Frontend
aws cloudfront update-distribution \
  --id $DISTRIBUTION_ID \
  --distribution-config file://canary-50percent.json
```

#### Validation Checklist (50% traffic)
- [ ] Error rate <1%
- [ ] Latency p95 <2s
- [ ] No business-critical issues reported
- [ ] Database and infrastructure scaling appropriately
- [ ] Cost within expected range (check AWS billing)

**Additional Monitoring**:
- [ ] Business metrics:
  - [ ] User signups (no drop-off)
  - [ ] Content uploads (normal volume)
  - [ ] Messages sent (normal volume)
  - [ ] Login success rate (>95%)
- [ ] Monitor for edge cases and unusual patterns

**Go/No-Go Decision**:
- ✅ **PROCEED**: Confident in stability, ready for full rollout
- 🛑 **ROLLBACK**: Any concerning trend or pattern

---

## Full Production Rollout

### Stage 4: 100% Deployment

#### Deploy to All Users
```bash
# Backend - promote canary to stable
cd serverless
npm run deploy -- --stage prod --alias stable --traffic 100

# Frontend - switch all traffic to new version
npm run deploy:frontend -- --env production
```

#### Validation Checklist (100% traffic)
- [ ] All health checks pass
- [ ] Error rate remains <1%
- [ ] Latency p95 <2s
- [ ] All critical user flows working
- [ ] No spike in support tickets
- [ ] Business metrics healthy

#### Post-Rollout Tasks (within 1 hour)
- [ ] Confirm deployment in #deployments Slack channel
- [ ] Update status page (if maintenance)
- [ ] Send "all clear" to stakeholders
- [ ] Monitor for 2 hours before signing off
- [ ] Document any issues encountered

---

## Post-Deployment Validation

### Immediate (0-15 minutes)

#### Smoke Tests
- [ ] Homepage loads correctly
- [ ] User can log in
- [ ] User can view profile
- [ ] Media assets load from CDN
- [ ] API endpoints respond correctly

**Automated Smoke Tests**:
```bash
# Run smoke test suite
npm run test:smoke:prod

# Expected output:
# ✓ Homepage accessible (200)
# ✓ Login endpoint working
# ✓ API health check passed
# ✓ CDN serving assets
# ✓ Database responsive
```

#### Critical User Flows
Run through manually:
1. **Registration**: Create new account
2. **Login**: Log in with test account
3. **Profile**: View and edit profile
4. **Content**: Upload image/video
5. **Social**: Send message, follow user
6. **Search**: Search for users and content

### Short-term (15-60 minutes)

#### Monitoring Dashboard
- [ ] Error rates stable (<1%)
- [ ] Latency within SLA (p95 <2s)
- [ ] No memory leaks (stable memory usage)
- [ ] Database connections stable
- [ ] Third-party API calls succeeding

#### User Feedback
- [ ] Check support channels (email, chat, social media)
- [ ] Monitor in-app feedback submissions
- [ ] Review app store ratings/reviews (if mobile)

### Long-term (1-24 hours)

#### Performance Metrics
- [ ] Response times stable over time
- [ ] Error rate remains low
- [ ] Database query performance stable
- [ ] Cost metrics within expected range

#### Business Metrics
- [ ] User engagement normal
- [ ] Conversion rates stable
- [ ] Retention metrics normal
- [ ] No unexpected user drop-off

---

## Rollback Procedures

### When to Rollback

**Immediate Rollback (P1)**:
- Error rate >5%
- Complete service outage
- Data corruption/loss
- Security vulnerability actively exploited
- Database unavailable

**Considered Rollback (P2)**:
- Error rate 2-5%
- Significant performance degradation (>50% latency increase)
- Feature completely broken
- High volume of user complaints

### Rollback Process

#### Quick Rollback (Frontend)
```bash
# Rollback frontend to previous version
aws s3 sync s3://valine-frontend-backup/ s3://valine-frontend-prod/

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

#### Quick Rollback (Backend)
```bash
# Rollback Lambda to previous version
aws lambda update-alias \
  --function-name valine-api-prod \
  --name prod \
  --function-version $(aws lambda list-versions-by-function \
    --function-name valine-api-prod \
    --query 'Versions[-2].Version' \
    --output text)
```

#### Database Rollback
```bash
# Rollback migration (if needed)
cd api
npx prisma migrate resolve --rolled-back <migration_name>

# Restore from backup (if data corruption)
# DO NOT run unless absolutely necessary
# pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME backup.dump
```

#### Full Rollback Checklist
- [ ] Rollback frontend to previous version
- [ ] Rollback backend to previous version
- [ ] Rollback database migration (if applicable)
- [ ] Clear CDN cache
- [ ] Verify services healthy
- [ ] Notify team and stakeholders
- [ ] Update status page
- [ ] Post-mortem scheduled

---

## Communication Templates

### Pre-Deployment Announcement

**Internal (Slack #deployments)**:
```
🚀 Deployment Starting: v1.2.3

**Time**: 2025-11-05 14:00 UTC
**Duration**: ~2 hours (canary deployment)
**Changes**: Profile links feature, performance improvements
**Impact**: None expected

**War Room**: #deploy-v1-2-3
**On-Call**: @engineer-name

Checklist: https://github.com/org/repo/issues/123
```

**External (Status Page)** (if user-impacting):
```
Scheduled Maintenance - Feature Deployment

We'll be deploying new features on November 5, 2025 at 14:00-16:00 UTC.

Expected impact: None
Affected services: None

We'll keep you updated here.
```

### Deployment In Progress

**Internal Update** (every 30 min):
```
📊 Canary Update: 25% deployed

**Status**: ✅ Healthy
**Error Rate**: 0.3% (baseline: 0.4%)
**Latency p95**: 1.2s (baseline: 1.3s)
**Issues**: None

Proceeding to 50% in 30 minutes.
```

### Deployment Complete

**Internal (Slack)**:
```
✅ Deployment Complete: v1.2.3

**Completed**: 2025-11-05 16:00 UTC
**Status**: Healthy
**Issues**: None

Monitoring for 2 hours. Will sign off at 18:00 UTC.

Release notes: https://github.com/org/repo/releases/tag/v1.2.3
```

**External (Status Page)**:
```
Resolved - Feature Deployment

New features successfully deployed. All systems operational.

Thank you for your patience!
```

### Rollback Announcement

**Internal (Slack)**:
```
🔴 ROLLBACK IN PROGRESS: v1.2.3

**Reason**: Error rate exceeded 5%
**Status**: Rolling back to v1.2.2
**ETA**: 10 minutes

Post-mortem scheduled for tomorrow.
```

**External (Status Page)**:
```
Investigating - Service Degradation

We're experiencing higher than normal error rates and are 
rolling back to a previous version. We'll update you shortly.
```

---

## Emergency Contacts

### On-Call Rotation
- **Primary**: Listed in PagerDuty
- **Secondary**: Listed in PagerDuty
- **Escalation**: Engineering Manager

### Key Contacts
- **DevOps Lead**: devops-lead@valine.app
- **Security Team**: security@valine.app
- **Product Manager**: pm@valine.app
- **Customer Support**: support@valine.app

### Communication Channels
- **War Room**: #deploy-war-room (Slack)
- **Incidents**: #incidents (Slack)
- **Status Updates**: status.valine.app
- **PagerDuty**: https://valine.pagerduty.com

---

## Best Practices

### DO ✅
- Deploy during low-traffic hours (avoid peak times)
- Use canary deployments for all production changes
- Monitor metrics closely during deployment
- Have rollback plan ready before deploying
- Test rollback procedure in staging
- Communicate early and often
- Document issues and learnings

### DON'T ❌
- Deploy on Fridays or before holidays
- Skip testing in staging environment
- Deploy multiple changes simultaneously
- Ignore monitoring alerts
- Rush through canary stages
- Deploy without rollback plan
- Forget to notify stakeholders

---

## Related Documentation
- [Deployment Guide](./deployment-guide.md)
- [Monitoring Setup](../security/monitoring-setup.md)
- [Incident Response](../security/incident-response-auth-abuse.md)
- [Environment Variables](../security/environment-variables.md)
- [Database Migrations](./database-migrations.md)

---

**Version**: 1.0  
**Review Schedule**: After each major deployment  
**Last Updated**: 2025-11-05
