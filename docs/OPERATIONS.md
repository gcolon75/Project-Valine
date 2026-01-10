# Project Valine - Operations Runbook

**Version:** 1.0  
**Last Updated:** 2026-01-05  
**Purpose:** Operational procedures, monitoring, and on-call runbook for Project Valine

---

## Table of Contents

1. [On-Call Quick Reference](#on-call-quick-reference)
2. [Monitoring & Alerts](#monitoring--alerts)
3. [Common Operations](#common-operations)
4. [Incident Response](#incident-response)
5. [Maintenance Windows](#maintenance-windows)
6. [Runbook Procedures](#runbook-procedures)
7. [Discord Bot Operations](#discord-bot-operations)

---

## On-Call Quick Reference

### Emergency Contacts

- **Primary On-Call:** Check PagerDuty rotation
- **Escalation:** Project owner
- **AWS Support:** Enterprise support ticket

### Critical Systems Health Check

```powershell
# 1. Check CloudFront distribution
aws cloudfront get-distribution --id E16LPJDBIL5DEE | ConvertFrom-Json | Select -ExpandProperty Distribution | Select -ExpandProperty Status

# 2. Check API Gateway health
$apiBase = Get-Content .deploy/last-api-base.txt
Invoke-WebRequest -Uri "$apiBase/health" -Method GET

# 3. Check RDS instance status
aws rds describe-db-instances --db-instance-identifier project-valine-dev --query 'DBInstances[0].DBInstanceStatus'

# 4. Check Lambda errors (last 1 hour)
aws cloudwatch get-metric-statistics `
  --namespace AWS/Lambda `
  --metric-name Errors `
  --dimensions Name=FunctionName,Value=valine-prod-api `
  --start-time (Get-Date).AddHours(-1).ToString("yyyy-MM-ddTHH:mm:ss") `
  --end-time (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss") `
  --period 3600 `
  --statistics Sum
```

### Quick Triage Decision Tree

```
Is the frontend loading?
├─ NO → Check CloudFront distribution, S3 bucket, DNS
└─ YES
    └─ Are API calls working?
        ├─ NO → Check API Gateway, Lambda functions, RDS connection
        └─ YES → Check specific feature (auth, posts, media, etc.)
```

---

## Monitoring & Alerts

### CloudWatch Dashboards

**Production Dashboard:**
- URL: https://console.aws.amazon.com/cloudwatch/home?region=us-west-2#dashboards:name=Valine-Production
- Metrics: Lambda invocations, errors, duration, API Gateway requests, RDS connections

**Staging Dashboard:**
- URL: https://console.aws.amazon.com/cloudwatch/home?region=us-west-2#dashboards:name=Valine-Staging
- Purpose: Pre-production monitoring and testing

### Key Metrics to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| **Lambda Error Rate** | > 5% over 5 minutes | Investigate logs, rollback if needed |
| **Lambda Duration** | > 10 seconds (p99) | Check cold starts, optimize code |
| **API Gateway 5xx** | > 10 requests/minute | Check Lambda health, RDS connection |
| **API Gateway 4xx** | > 100 requests/minute | Check for API abuse, CORS issues |
| **RDS CPU** | > 80% sustained | Scale up instance, optimize queries |
| **RDS Connections** | > 80 (max 100) | Check connection pooling, restart if needed |
| **S3 Errors** | > 0 | Check bucket permissions, access policies |
| **CloudFront 5xx** | > 5 requests/minute | Check origin health (S3, API Gateway) |

### Alert Configuration

**Critical Alerts (page on-call):**
- Lambda error rate > 10% for 5 minutes
- API Gateway 5xx > 50 requests/minute
- RDS instance down or unreachable
- CloudFront distribution disabled or error rate > 5%

**Warning Alerts (email only):**
- Lambda cold start duration > 3 seconds (p95)
- RDS CPU > 70% for 10 minutes
- S3 4xx errors > 10 requests/minute
- API Gateway throttling > 5% of requests

### Log Locations

```powershell
# Lambda function logs
aws logs tail /aws/lambda/valine-prod-api --follow

# API Gateway access logs
aws logs tail /aws/apigateway/valine-prod --follow

# Discord orchestrator logs
aws logs tail /aws/lambda/valine-orchestrator-prod --follow

# RDS slow query log (if enabled)
aws rds download-db-log-file-portion `
  --db-instance-identifier project-valine-dev `
  --log-file-name slowquery/postgresql.log.2026-01-05-23
```

---

## Common Operations

### Deploy New Version

**Prerequisites:**
- Code merged to `main` branch
- All tests passing
- Reviewed and approved

**Procedure:**
```powershell
# 1. Deploy backend (staging first)
cd serverless
.\scripts\deploy.ps1 -Stage staging -Region us-west-2

# 2. Run smoke tests
.\scripts\smoke-test.ps1 -Stage staging

# 3. Deploy to production (if staging OK)
.\scripts\deploy.ps1 -Stage prod -Region us-west-2

# 4. Run production smoke tests
.\scripts\smoke-test.ps1 -Stage prod

# 5. Monitor for 15 minutes
# Watch CloudWatch metrics and logs
```

**Rollback if needed:**
```powershell
cd serverless
serverless rollback --stage prod --timestamp <previous-timestamp>
```

### Scale Database Instance

**Upscale (more traffic expected):**
```powershell
# Modify instance class (requires ~5 min downtime)
aws rds modify-db-instance `
  --db-instance-identifier project-valine-dev `
  --db-instance-class db.t3.large `
  --apply-immediately
```

**Downscale (less traffic, cost savings):**
```powershell
# Schedule during maintenance window (no --apply-immediately)
aws rds modify-db-instance `
  --db-instance-identifier project-valine-dev `
  --db-instance-class db.t3.small
```

### Invalidate CloudFront Cache

**All files (after frontend deployment):**
```powershell
aws cloudfront create-invalidation `
  --distribution-id E16LPJDBIL5DEE `
  --paths "/*"
```

**Specific files only:**
```powershell
aws cloudfront create-invalidation `
  --distribution-id E16LPJDBIL5DEE `
  --paths "/index.html" "/manifest.json"
```

### Restart Lambda Function

**Force new container (clear memory leaks, reset connections):**
```powershell
# Update environment variable to force restart
aws lambda update-function-configuration `
  --function-name valine-prod-api `
  --environment Variables="{FORCE_RESTART=$(Get-Date -Format 'yyyyMMddHHmmss')}"
```

### Database Maintenance

**Run migrations:**
```powershell
cd api
$env:DATABASE_URL = "postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"
npx prisma migrate deploy
```

**Vacuum/analyze (performance optimization):**
```powershell
# Connect to database using psql
$env:PGPASSWORD = "Crypt0J01nt75"
psql -h project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com -U ValineColon_75 -d postgres -c "VACUUM ANALYZE;"
```

---

## Incident Response

### Severity Levels

| Severity | Definition | Response Time | Examples |
|----------|------------|---------------|----------|
| **P0 (Critical)** | Complete service outage | < 15 minutes | Frontend down, API returning 5xx, database unreachable |
| **P1 (High)** | Major feature broken | < 1 hour | Login broken, uploads failing, search not working |
| **P2 (Medium)** | Minor feature impaired | < 4 hours | Notifications delayed, profile images not loading |
| **P3 (Low)** | Cosmetic issue or workaround available | < 24 hours | UI glitch, non-critical bug |

### Incident Response Workflow

```
1. Acknowledge Alert
   ├─ Log into PagerDuty/on-call system
   └─ Acknowledge within 5 minutes

2. Assess Impact
   ├─ Determine severity level (P0-P3)
   ├─ Identify affected users/features
   └─ Check status page / user reports

3. Communicate
   ├─ Update status page (if P0 or P1)
   ├─ Notify team on Slack/Discord
   └─ Set expectations for resolution time

4. Investigate
   ├─ Check CloudWatch logs
   ├─ Review recent deployments
   ├─ Verify external dependencies (AWS status)
   └─ Reproduce issue if possible

5. Mitigate
   ├─ Apply temporary fix/workaround
   ├─ Rollback if recent deployment caused issue
   └─ Scale resources if capacity issue

6. Resolve
   ├─ Apply permanent fix
   ├─ Verify fix in production
   └─ Monitor for 30 minutes

7. Document
   ├─ Write postmortem (for P0/P1)
   ├─ Update runbook with lessons learned
   └─ Create follow-up tickets for improvements
```

### Incident Communication Template

```
🚨 INCIDENT ALERT

Severity: P0 | P1 | P2 | P3
Status: Investigating | Identified | Mitigating | Resolved
Started: 2026-01-05 14:32 UTC
Updated: 2026-01-05 14:45 UTC

Issue: [Brief description]
Impact: [What's broken, how many users affected]
Root Cause: [If known]
Mitigation: [What we're doing]
ETA: [Expected resolution time]

Next update in: 15 minutes
```

---

## Maintenance Windows

### Scheduled Maintenance

**Preferred Time:** Sundays 02:00-04:00 UTC (Saturday evening in US timezones)

**Notification Requirements:**
- Email to all users: 72 hours advance notice
- Status page banner: 24 hours advance notice
- In-app notification: 24 hours advance notice

**Maintenance Checklist:**
```powershell
# 1. Announce maintenance window
# 2. Set status page to "maintenance"
# 3. Enable maintenance mode on frontend (if needed)
# 4. Perform maintenance tasks
#    ├─ Database migrations
#    ├─ Instance resizing
#    ├─ Certificate renewals
#    └─ Major version upgrades
# 5. Run post-maintenance smoke tests
# 6. Disable maintenance mode
# 7. Update status page to "operational"
# 8. Send completion email to users
```

### Emergency Maintenance

**Trigger:** Critical security vulnerability, data integrity issue, or P0 incident requiring immediate fix

**Procedure:**
1. Assess urgency (can it wait for scheduled window?)
2. Notify team immediately
3. Update status page
4. Apply fix with minimal downtime
5. Send apology email to users afterward

---

## Runbook Procedures

### Procedure: White Screen of Death (WSOD)

**Symptoms:** Frontend loads blank white screen, React errors in console

**Common Causes:**
1. CloudFront serving stale/corrupted `index.html`
2. API base URL misconfiguration
3. CORS errors blocking API calls
4. JavaScript bundle parsing errors

**Resolution:**
```powershell
# 1. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"

# 2. Check frontend environment variables
# Verify API_BASE in .env.production matches deployed API Gateway URL

# 3. Check browser console for errors
# Look for CORS errors, 404s on chunks, syntax errors

# 4. If still broken, redeploy frontend from known good commit
cd frontend
npm run build
aws s3 sync dist/ s3://valine-frontend-prod/ --delete
```

### Procedure: Database Connection Pool Exhausted

**Symptoms:** API returns 500 errors, Lambda logs show "Unable to acquire connection from pool"

**Causes:**
- Too many concurrent Lambda invocations
- Connection leaks (not releasing connections)
- Prisma connection pool size too small

**Resolution:**
```powershell
# 1. Check current RDS connections
$env:PGPASSWORD = "Crypt0J01nt75"
psql -h project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com -U ValineColon_75 -d postgres -c "SELECT count(*) FROM pg_stat_activity;"

# 2. Terminate idle connections (if > 80)
psql -h project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com -U ValineColon_75 -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 minutes';"

# 3. Increase Prisma connection pool in serverless.yml
# connection_limit = 10 → 20 (requires redeployment)

# 4. Force Lambda restart to clear connections
aws lambda update-function-configuration `
  --function-name valine-prod-api `
  --environment Variables="{FORCE_RESTART=$(Get-Date -Format 'yyyyMMddHHmmss')}"
```

### Procedure: S3 Upload Failures

**Symptoms:** Users report upload errors, presigned URLs not working

**Common Causes:**
1. Presigned URL expired (> 15 minutes old)
2. S3 bucket permissions misconfigured
3. CORS policy missing/incorrect on bucket
4. File size exceeds limit

**Resolution:**
```powershell
# 1. Check S3 bucket CORS configuration
aws s3api get-bucket-cors --bucket valine-media-uploads

# Expected CORS rules:
# - AllowedOrigins: https://dkmxy676d3vgc.cloudfront.net
# - AllowedMethods: GET, PUT, POST
# - AllowedHeaders: *

# 2. Verify bucket policy allows presigned URLs
aws s3api get-bucket-policy --bucket valine-media-uploads

# 3. Check CloudWatch logs for presigned URL generation errors
aws logs tail /aws/lambda/valine-prod-media --follow --filter-pattern "presigned"

# 4. Test presigned URL generation manually
# Use Postman or curl to call /media/upload endpoint
```

### Procedure: Discord Bot Not Responding

**Symptoms:** Slash commands not appearing or not responding in Discord

**Causes:**
1. Commands not registered with Discord API
2. Lambda function not deployed or failing
3. DynamoDB state table issues
4. Discord bot token expired/invalid

**Resolution:**
```powershell
# 1. Re-register Discord commands
cd orchestrator
.\scripts\min_register_global.ps1

# 2. Check Lambda function logs
aws logs tail /aws/lambda/valine-orchestrator-prod --follow

# 3. Verify bot token is valid
$token = $env:STAGING_DISCORD_BOT_TOKEN
Invoke-WebRequest -Uri "https://discord.com/api/v10/users/@me" `
  -Headers @{Authorization="Bot $token"} | Select -ExpandProperty Content

# 4. Check DynamoDB table exists and is accessible
aws dynamodb describe-table --table-name valine-orchestrator-state-prod
```

---

## Discord Bot Operations

### Command Registration

**Register all commands globally:**
```powershell
cd orchestrator
.\scripts\min_register_global.ps1
```

**Verify registration:**
```powershell
# List registered commands
$appId = "1428568840958251109"
$token = $env:STAGING_DISCORD_BOT_TOKEN
Invoke-WebRequest -Uri "https://discord.com/api/v10/applications/$appId/commands" `
  -Headers @{Authorization="Bot $token"} | Select -ExpandProperty Content
```

### Bot Deployment

**Deploy orchestrator:**
```powershell
cd orchestrator
sam build
sam deploy --stack-name valine-orchestrator-prod --region us-west-2 --guided
```

### User Management Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `/user-info` | Get user details by email | `/user-info email:user@example.com` |
| `/list-users` | List all users | `/list-users` |
| `/add-to-allowlist` | Add email to allowlist | `/add-to-allowlist email:newuser@example.com` |
| `/remove-from-allowlist` | Remove email from allowlist | `/remove-from-allowlist email:user@example.com` |

---

## Related Documentation

- **[Project Bible](./PROJECT_BIBLE.md)** - Complete master reference
- **[Architecture](./ARCHITECTURE.md)** - System architecture overview
- **[Deployment Bible](./DEPLOYMENT_BIBLE.md)** - Deployment procedures
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and fixes
- **[API Reference](./API_REFERENCE.md)** - API endpoint documentation

---

**Last Updated:** 2026-01-05  
**Maintainer:** Project Valine Team  
**Status:** ✅ Current
