# Project Valine Operations Runbook

**Version:** 1.0.0  
**Last Updated:** 2025-11-03  
**Maintainer:** DevOps Team  

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Monitoring & Alerts](#monitoring--alerts)
4. [Common Operations](#common-operations)
5. [Incident Response](#incident-response)
6. [Rollback Procedures](#rollback-procedures)
7. [Maintenance Tasks](#maintenance-tasks)
8. [Troubleshooting](#troubleshooting)
9. [Contact Information](#contact-information)

---

## Overview

### Purpose
This runbook provides operational procedures for managing Project Valine in production, including deployment, monitoring, incident response, and maintenance tasks.

### System Architecture Summary
- **Frontend:** React SPA hosted on AWS S3 + CloudFront
- **Backend:** AWS Lambda functions with API Gateway
- **Database:** RDS PostgreSQL (or DynamoDB)
- **File Storage:** S3
- **Monitoring:** CloudWatch, Sentry (optional)

### Key URLs
- **Production:** https://projectvaline.com
- **Staging:** https://staging.projectvaline.com
- **API:** https://api.projectvaline.com
- **Admin:** https://admin.projectvaline.com (if applicable)

---

## Architecture

### Frontend Stack
```
User → CloudFront CDN → S3 (Static Assets)
      ↓
    API Gateway → Lambda → Database
```

### Backend Components
- **API Gateway:** HTTP API routing
- **Lambda Functions:**
  - `users` - User CRUD operations
  - `posts` - Post management
  - `connections` - Connection requests
  - `reels` - Video content
  - `messages` - Messaging system
  - `notifications` - Notification system

### Data Flow
1. User requests hit CloudFront
2. Static assets served from S3
3. API calls routed through API Gateway
4. Lambda functions process requests
5. Database queries via Prisma ORM
6. Responses cached where appropriate

---

## Monitoring & Alerts

### CloudWatch Metrics

#### Frontend Metrics
- **CloudFront Requests** - Total request count
- **Cache Hit Rate** - CDN effectiveness
- **4xx/5xx Errors** - Client/server errors
- **Data Transfer** - Bandwidth usage

#### Backend Metrics
- **Lambda Invocations** - Function execution count
- **Duration** - Function execution time
- **Errors** - Failed invocations
- **Throttles** - Concurrent execution limits
- **Cold Starts** - Function initialization time

#### Database Metrics
- **CPU Utilization** - Database load
- **Database Connections** - Active connections
- **Read/Write IOPS** - I/O operations
- **Storage Space** - Disk usage

### Critical Alerts

#### High Priority (Page Immediately)
```yaml
ErrorRate:
  Condition: Error rate > 5% for 5 minutes
  Action: Page on-call engineer
  
DatabaseConnections:
  Condition: Connection count > 80% of max
  Action: Page on-call engineer
  
APILatency:
  Condition: P95 latency > 3 seconds for 5 minutes
  Action: Page on-call engineer
```

#### Medium Priority (Slack/Email)
```yaml
CacheHitRate:
  Condition: Cache hit rate < 80% for 15 minutes
  Action: Alert DevOps channel
  
LambdaColdStarts:
  Condition: Cold starts > 20% for 10 minutes
  Action: Alert DevOps channel
```

### Setting Up CloudWatch Alarms

```bash
# Example: Create high error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "production-api-high-error-rate" \
  --alarm-description "API error rate exceeds 5%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-west-2:ACCOUNT_ID:ops-alerts
```

### Sentry Integration (Optional)

#### Installation
```bash
npm install @sentry/react @sentry/tracing
```

#### Configuration
```javascript
// src/utils/sentry.js
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [new BrowserTracing()],
    tracesSampleRate: 0.1, // 10% of transactions
    environment: import.meta.env.MODE,
    
    // PII Scrubbing
    beforeSend(event) {
      // Remove email addresses from error data
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}
```

#### Usage
```javascript
// Capture exceptions
try {
  // risky operation
} catch (error) {
  Sentry.captureException(error);
  throw error;
}

// Add context
Sentry.setContext("user", {
  id: user.id,
  username: user.username,
  // NO email or PII
});
```

---

## Common Operations

### Deploy New Version

#### Frontend Deployment
```bash
# 1. Build production bundle
npm run build

# 2. Run performance audit
npm run perf:audit

# 3. Deploy to S3
aws s3 sync dist/ s3://projectvaline-production/ --delete \
  --cache-control "max-age=31536000,public" \
  --exclude "index.html"

# 4. Deploy index.html with no-cache
aws s3 cp dist/index.html s3://projectvaline-production/index.html \
  --cache-control "no-cache,no-store,must-revalidate"

# 5. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"

# 6. Verify deployment
curl -I https://projectvaline.com
```

#### Backend Deployment
```bash
# 1. Navigate to serverless directory
cd serverless

# 2. Install dependencies
npm install

# 3. Run tests
npm test

# 4. Deploy to production
serverless deploy --stage prod --region us-west-2

# 5. Verify endpoints
export API_BASE="https://api-id.execute-api.us-west-2.amazonaws.com/prod"
curl $API_BASE/health

# 6. Run smoke tests
npm run test:smoke
```

### Scaling Operations

#### Increase Lambda Concurrency
```bash
# Set reserved concurrency for high-traffic functions
aws lambda put-function-concurrency \
  --function-name valine-prod-posts \
  --reserved-concurrent-executions 100
```

#### Scale Database
```bash
# Increase RDS instance size
aws rds modify-db-instance \
  --db-instance-identifier valine-prod \
  --db-instance-class db.t3.large \
  --apply-immediately
```

### Database Operations

#### Create Backup
```bash
# Manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier valine-prod \
  --db-snapshot-identifier valine-prod-$(date +%Y%m%d-%H%M%S)
```

#### Restore from Backup
```bash
# Restore to new instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier valine-prod-restored \
  --db-snapshot-identifier valine-prod-20251103-120000

# Update Lambda environment variables to point to new instance
serverless deploy --stage prod --region us-west-2
```

---

## Incident Response

### Severity Levels

#### P0 - Critical (Response: Immediate)
- Complete service outage
- Data loss or corruption
- Security breach

#### P1 - High (Response: 30 minutes)
- Major feature unavailable
- Significant performance degradation
- Authentication issues

#### P2 - Medium (Response: 4 hours)
- Minor feature broken
- Non-critical bug affecting users
- Performance issues affecting subset of users

#### P3 - Low (Response: Next business day)
- Cosmetic issues
- Non-urgent improvements
- Documentation errors

### Incident Response Workflow

1. **Detect & Acknowledge**
   ```bash
   # Acknowledge alert
   # Update status page: https://status.projectvaline.com
   ```

2. **Assess Impact**
   - Check CloudWatch metrics
   - Review error logs
   - Identify affected users/features

3. **Communicate**
   - Post to #incidents Slack channel
   - Update status page
   - Notify stakeholders if needed

4. **Mitigate**
   - Apply immediate fix or rollback
   - Monitor metrics

5. **Resolve**
   - Verify fix
   - Close incident
   - Update status page

6. **Post-Mortem**
   - Write incident report
   - Identify root cause
   - Create prevention tasks

### Common Incident Scenarios

#### High Error Rate
```bash
# 1. Check recent deployments
aws lambda list-versions-by-function \
  --function-name valine-prod-posts

# 2. Check error logs
aws logs tail /aws/lambda/valine-prod-posts --follow

# 3. Rollback if needed (see Rollback Procedures)
```

#### Database Connection Issues
```bash
# 1. Check connection count
aws rds describe-db-instances \
  --db-instance-identifier valine-prod \
  --query 'DBInstances[0].DBInstanceStatus'

# 2. Check Lambda metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# 3. Increase connection limit or scale database
```

#### CloudFront/S3 Issues
```bash
# 1. Check CloudFront status
aws cloudfront get-distribution \
  --id E1234567890ABC

# 2. Verify S3 bucket accessibility
aws s3 ls s3://projectvaline-production/

# 3. Check CloudFront logs
aws s3 sync s3://cloudfront-logs-bucket/E1234567890ABC/ ./logs/
```

---

## Rollback Procedures

### Frontend Rollback

#### Option 1: Redeploy Previous Version
```bash
# 1. Checkout previous version
git checkout <previous-commit>

# 2. Build and deploy
npm run build
aws s3 sync dist/ s3://projectvaline-production/ --delete

# 3. Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

#### Option 2: S3 Versioning
```bash
# 1. List previous versions
aws s3api list-object-versions \
  --bucket projectvaline-production \
  --prefix index.html

# 2. Copy previous version as current
aws s3api copy-object \
  --bucket projectvaline-production \
  --copy-source projectvaline-production/index.html?versionId=VERSION_ID \
  --key index.html
```

### Backend Rollback

#### Serverless Framework Rollback
```bash
# 1. List deployments
serverless deploy list --stage prod

# 2. Rollback to previous deployment
serverless rollback --timestamp 1699027200000 --stage prod

# 3. Verify rollback
curl https://api.projectvaline.com/health
```

#### Manual Lambda Version Rollback
```bash
# 1. List function versions
aws lambda list-versions-by-function \
  --function-name valine-prod-posts

# 2. Update alias to point to previous version
aws lambda update-alias \
  --function-name valine-prod-posts \
  --name prod \
  --function-version 42

# 3. Verify
aws lambda get-alias \
  --function-name valine-prod-posts \
  --name prod
```

### Database Rollback

**⚠️ WARNING:** Database rollbacks are risky. Always have recent backups.

```bash
# 1. Create backup of current state
aws rds create-db-snapshot \
  --db-instance-identifier valine-prod \
  --db-snapshot-identifier valine-prod-pre-rollback-$(date +%Y%m%d)

# 2. Restore from backup (creates new instance)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier valine-prod-temp \
  --db-snapshot-identifier valine-prod-good-state

# 3. Test restored instance

# 4. Swap instances (requires downtime)
# - Update Lambda environment variables
# - Redeploy backend
```

---

## Maintenance Tasks

### Daily Tasks
- [ ] Review error logs in CloudWatch
- [ ] Check alert notifications
- [ ] Monitor key metrics (latency, error rate)
- [ ] Review Sentry errors (if configured)

### Weekly Tasks
- [ ] Review CloudWatch costs
- [ ] Check database performance
- [ ] Update dependencies (security patches)
- [ ] Review and close old incidents

### Monthly Tasks
- [ ] Security audit
- [ ] Cost optimization review
- [ ] Backup verification
- [ ] Documentation updates
- [ ] Performance review

### Quarterly Tasks
- [ ] Disaster recovery drill
- [ ] Capacity planning
- [ ] Third-party dependency audit
- [ ] Architecture review

### Backup Verification

```bash
# Test restore process
# 1. Create test instance from backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier valine-test-restore \
  --db-snapshot-identifier latest-automated-backup

# 2. Connect and verify data
psql -h valine-test-restore.xxx.us-west-2.rds.amazonaws.com \
     -U valine_user -d valine_db

# 3. Delete test instance
aws rds delete-db-instance \
  --db-instance-identifier valine-test-restore \
  --skip-final-snapshot
```

---

## Troubleshooting

### High Latency

**Symptoms:** P95 latency > 3 seconds

**Diagnosis:**
```bash
# Check Lambda duration metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=valine-prod-posts \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum \
  --unit Milliseconds

# Check database performance
aws rds describe-db-instances \
  --db-instance-identifier valine-prod \
  --query 'DBInstances[0].{CPU:CPUUtilization,Connections:DatabaseConnections}'
```

**Solutions:**
1. Increase Lambda memory (increases CPU)
2. Optimize database queries (add indexes)
3. Implement caching (ElastiCache)
4. Enable CloudFront caching for API responses

### Cold Starts

**Symptoms:** Intermittent slow responses, high Duration metrics

**Diagnosis:**
```bash
# Check cold start frequency
aws logs filter-pattern "REPORT" \
  --log-group-name /aws/lambda/valine-prod-posts \
  --start-time $(date -u -d '1 hour ago' +%s000) | \
  grep "Init Duration"
```

**Solutions:**
1. Enable Provisioned Concurrency
```bash
aws lambda put-provisioned-concurrency-config \
  --function-name valine-prod-posts \
  --provisioned-concurrent-executions 5 \
  --qualifier prod
```

2. Reduce package size
3. Use lighter dependencies

### Out of Memory Errors

**Symptoms:** Lambda errors with "Runtime exited with error: signal: killed"

**Diagnosis:**
```bash
# Check memory usage
aws logs filter-pattern "Max Memory Used" \
  --log-group-name /aws/lambda/valine-prod-posts \
  --start-time $(date -u -d '1 hour ago' +%s000)
```

**Solution:**
```bash
# Increase Lambda memory
aws lambda update-function-configuration \
  --function-name valine-prod-posts \
  --memory-size 1024
```

### Database Connection Exhaustion

**Symptoms:** "too many connections" errors

**Diagnosis:**
```bash
# Check current connections
psql -h valine-prod.xxx.rds.amazonaws.com \
     -U valine_user -d valine_db \
     -c "SELECT count(*) FROM pg_stat_activity;"
```

**Solutions:**
1. Increase `max_connections` parameter
2. Implement connection pooling (RDS Proxy)
3. Reduce Lambda concurrency
4. Optimize connection lifecycle

---

## Contact Information

### On-Call Rotation
- **Primary:** DevOps Engineer (rotating weekly)
- **Secondary:** Backend Lead
- **Escalation:** CTO

### Communication Channels
- **Slack:** #incidents (critical), #devops (general)
- **PagerDuty:** Integration configured
- **Email:** ops@projectvaline.com

### External Support
- **AWS Support:** Support case via AWS Console
- **Sentry:** support@sentry.io
- **Database:** DBA team or AWS RDS support

### Escalation Matrix

| Severity | First Contact | If No Response (15 min) | If No Response (30 min) |
|----------|---------------|-------------------------|-------------------------|
| P0       | On-call engineer | Secondary on-call | CTO |
| P1       | On-call engineer | Backend lead | CTO |
| P2       | DevOps team | Backend lead | - |
| P3       | Create ticket | - | - |

---

## Emergency Contacts

**⚠️ Use only for P0 incidents**

- On-Call Engineer: (555) 123-4567
- Backend Lead: (555) 234-5678
- CTO: (555) 345-6789

---

## Useful Commands Cheat Sheet

### AWS CLI
```bash
# List Lambda functions
aws lambda list-functions --region us-west-2

# Get function logs
aws logs tail /aws/lambda/FUNCTION_NAME --follow

# Describe CloudFront distribution
aws cloudfront get-distribution --id DISTRIBUTION_ID

# List RDS instances
aws rds describe-db-instances

# Create CloudWatch alarm
aws cloudwatch put-metric-alarm --alarm-name NAME --metric-name METRIC
```

### Serverless Framework
```bash
# Deploy
serverless deploy --stage prod

# Rollback
serverless rollback --timestamp TIMESTAMP --stage prod

# View logs
serverless logs -f FUNCTION_NAME --stage prod --tail

# Invoke function
serverless invoke -f FUNCTION_NAME --stage prod --data '{"test": true}'

# Remove stack (DANGEROUS)
serverless remove --stage staging
```

### Database
```bash
# Connect to database
psql -h HOSTNAME -U USERNAME -d DATABASE

# Create backup
pg_dump -h HOSTNAME -U USERNAME DATABASE > backup.sql

# Restore backup
psql -h HOSTNAME -U USERNAME DATABASE < backup.sql

# Check database size
psql -h HOSTNAME -U USERNAME -d DATABASE -c "SELECT pg_size_pretty(pg_database_size('DATABASE'));"
```

---

## Appendix

### A. PII Scrubbing Guidelines

**Never Log:**
- Email addresses
- Passwords (obviously)
- Credit card numbers
- Social security numbers
- Full names (use user IDs instead)
- IP addresses (unless required for security)
- Phone numbers

**Safe to Log:**
- User IDs (UUIDs)
- Usernames (if not email-based)
- Error messages (sanitized)
- Request IDs
- Timestamps
- HTTP status codes

**Example: Good vs Bad Logging**

```javascript
// ❌ BAD
console.error('Login failed for user@example.com');

// ✅ GOOD
console.error('Login failed for user', { userId: 'user-123' });
```

### B. Disaster Recovery Plan

**RTO (Recovery Time Objective):** 4 hours  
**RPO (Recovery Point Objective):** 15 minutes (automated backups)

**Disaster Scenarios:**

1. **Complete Region Failure**
   - Use CloudFormation to provision in alternate region
   - Restore database from latest backup
   - Update DNS to point to new region

2. **Data Corruption**
   - Restore database from point-in-time backup
   - Verify data integrity
   - Resume operations

3. **Security Breach**
   - Immediately revoke compromised credentials
   - Rotate all API keys and secrets
   - Deploy patched version
   - Notify affected users

---

**Document Version:** 1.0.0  
**Last Review:** 2025-11-03  
**Next Review:** 2025-12-03  
**Owner:** DevOps Team
