> **ARCHIVED:** 2026-01-05
> **Reason:** Consolidated into canonical documentation
> **See:** [Documentation Index](../README.md) for current docs

---
# Auth Backend Investigation Runbook

## Overview

This runbook provides step-by-step guidance for diagnosing and fixing authentication backend connectivity issues, particularly `net::ERR_NAME_NOT_RESOLVED` errors that prevent the frontend from reaching auth endpoints.

**Common symptoms:**
- Login fails with network errors in browser console
- Browser shows: `net::ERR_NAME_NOT_RESOLVED` for auth endpoints
- Repeated failed requests to `/auth/login`, `/auth/logout`, `/auth/me`
- Frontend loads correctly but authentication doesn't work

---

## Quick Diagnostics

Before diving into detailed troubleshooting, run the diagnostic script:

### Node.js (Cross-platform)
```powershell
node scripts/check-auth-backend.js --domain fb9pxd6m09.execute-api.us-west-2.amazonaws.com
```

### PowerShell (Windows)
```powershell
.\scripts\check-auth-backend.ps1 -Domain "fb9pxd6m09.execute-api.us-west-2.amazonaws.com"
```

### GitHub Actions (Manual Workflow)
1. Go to Actions → Auth Backend Diagnostics
2. Click "Run workflow"
3. Enter the API domain
4. Download the diagnostic report from artifacts

The script will identify the failure point (DNS, TCP, or HTTP) and provide targeted recommendations.

---

## Priority-Ordered Troubleshooting

### 1. Verify Environment Configuration (Most Common)

**Symptom:** DNS resolution fails, or wrong hostname is being used.

**Check:**
```powershell
# In the frontend repository, check environment files
Get-Content .env.production
Get-Content .env.local

# Look for these variables:
# VITE_API_BASE=https://fb9pxd6m09.execute-api.us-west-2.amazonaws.com
# VITE_API_URL=https://fb9pxd6m09.execute-api.us-west-2.amazonaws.com
# VITE_FRONTEND_URL=https://your-domain.com
```

**Fix:**
1. Verify `VITE_API_BASE` points to the correct API Gateway URL
2. Check for typos in the domain name
3. If using a custom domain, ensure it's configured correctly
4. Rebuild and redeploy frontend if environment variables changed:
   ```powershell
   npm run build
   # Deploy updated build
   ```

**AWS Console Check:**
```powershell
# List all API Gateway REST APIs
aws apigateway get-rest-apis \
  --query 'items[*].[name,id]' \
  --output table

# Get API Gateway endpoint for a specific API
aws apigateway get-rest-api --rest-api-id YOUR_API_ID \
  --query '[id,name,createdDate]'

# Alternative: List API Gateway V2 APIs (HTTP APIs)
aws apigatewayv2 get-apis \
  --query 'Items[*].[Name,ApiId,ApiEndpoint]' \
  --output table
```

---

### 2. Verify DNS Resolution

**Symptom:** DNS lookup fails, domain doesn't resolve to an IP address.

**Test DNS locally:**
```powershell
# Test with nslookup
nslookup fb9pxd6m09.execute-api.us-west-2.amazonaws.com

# Test with dig (more detailed)
dig fb9pxd6m09.execute-api.us-west-2.amazonaws.com

# Test with host
host fb9pxd6m09.execute-api.us-west-2.amazonaws.com

# PowerShell
Resolve-DnsName -Name fb9pxd6m09.execute-api.us-west-2.amazonaws.com
```

**Expected result:** Should return IP addresses (e.g., AWS IP ranges)

**If DNS fails:**

1. **Check if API Gateway endpoint exists:**
   ```powershell
   # List stages for a REST API
   aws apigateway get-stages --rest-api-id YOUR_API_ID
   
   # Expected output shows stage name (e.g., 'prod', 'dev')
   # The hostname format is: {api-id}.execute-api.{region}.amazonaws.com
   ```

2. **Check if the API was deleted or stage removed:**
   - Log into AWS Console → API Gateway
   - Verify the API exists and is deployed to the expected stage
   - Check if the stage name matches the URL being used

3. **If using a custom domain (e.g., api.valine.com):**
   ```powershell
   # List custom domain names
   aws apigateway get-domain-names \
     --query 'items[*].[domainName,regionalDomainName]' \
     --output table
   
   # Check base path mappings
   aws apigateway get-base-path-mappings \
     --domain-name api.valine.com
   
   # Check Route53 DNS record
   aws route53 list-resource-record-sets \
     --hosted-zone-id YOUR_HOSTED_ZONE_ID \
     --query "ResourceRecordSets[?Name == 'api.valine.com.']"
   ```

4. **DNS propagation issues:**
   - If DNS record was recently added, wait 5-15 minutes for propagation
   - Test from different DNS servers: `dig @8.8.8.8 api.valine.com`
   - Clear local DNS cache:
     ```powershell
     # Linux
     sudo systemd-resolve --flush-caches
     
     # macOS
     sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
     
     # Windows
     ipconfig /flushdns
     ```

---

### 3. Check API Gateway Deployment

**Symptom:** DNS resolves but API doesn't respond, or returns 403/404.

**Verify API is deployed:**
```powershell
# Check deployment status for REST API
aws apigateway get-deployments --rest-api-id YOUR_API_ID

# Get deployment for a specific stage
aws apigateway get-stage \
  --rest-api-id YOUR_API_ID \
  --stage-name prod

# For HTTP APIs (API Gateway V2)
aws apigatewayv2 get-stages --api-id YOUR_API_ID
```

**Check if deployment is recent:**
- If backend code was recently deployed, verify the API Gateway deployment timestamp
- API Gateway deployments are separate from Lambda deployments

**Force new deployment:**
```powershell
# Create a new deployment (REST API)
aws apigateway create-deployment \
  --rest-api-id YOUR_API_ID \
  --stage-name prod \
  --description "Manual deployment for troubleshooting"

# For HTTP APIs
aws apigatewayv2 create-deployment --api-id YOUR_API_ID
```

---

### 4. Check CloudFront Distribution (If Applicable)

**Symptom:** API is behind CloudFront and requests are being blocked or not routed correctly.

**Check if CloudFront is in front of API:**
```powershell
# List CloudFront distributions
aws cloudfront list-distributions \
  --query 'DistributionList.Items[*].[Id,DomainName,Origins.Items[0].DomainName]' \
  --output table

# Get specific distribution config
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID
```

**Verify origin configuration:**
```powershell
# Check if API Gateway is configured as an origin
aws cloudfront get-distribution-config \
  --id YOUR_DISTRIBUTION_ID \
  --query 'DistributionConfig.Origins.Items[*].[Id,DomainName,CustomHeaders]'
```

**Test CloudFront directly:**
```powershell
# Get CloudFront domain name
CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
  --id YOUR_DISTRIBUTION_ID \
  --query 'Distribution.DomainName' \
  --output text)

# Test requests
Invoke-WebRequest -Uri "https://d2vj0jjqgov8e1.cloudfront.net/" -Method Get
Invoke-WebRequest -Uri "https://d2vj0jjqgov8e1.cloudfront.net/" -Method Get
```

**Check CloudFront Function (if SPA routing is needed):**
```powershell
# List CloudFront functions
aws cloudfront list-functions

# Get function details
aws cloudfront describe-function --name YOUR_FUNCTION_NAME

# Check if function is associated with distribution
aws cloudfront get-distribution-config --id YOUR_DISTRIBUTION_ID \
  --query 'DistributionConfig.DefaultCacheBehavior.FunctionAssociations'
```

---

### 5. Check WAF Rules (If Applicable)

**Symptom:** Requests reach CloudFront but are blocked by WAF.

**Check if WAF is attached:**
```powershell
# For CloudFront (WAFv2)
aws wafv2 list-web-acls --scope CLOUDFRONT --region us-east-1

# Get WAF web ACL details
aws wafv2 get-web-acl \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --id YOUR_WEB_ACL_ID \
  --name YOUR_WEB_ACL_NAME
```

**Check WAF rules:**
```powershell
# List rules in web ACL
aws wafv2 get-web-acl \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --id YOUR_WEB_ACL_ID \
  --name YOUR_WEB_ACL_NAME \
  --query 'WebACL.Rules[*].[Name,Priority,Action]'
```

**Check WAF logs (if enabled):**
```powershell
# WAF logs are stored in S3 or CloudWatch Logs
# Check S3 bucket for WAF logs
aws s3 ls s3://aws-waf-logs-YOUR_BUCKET/

# Check recent blocks
aws s3 cp s3://aws-waf-logs-YOUR_BUCKET/RECENT_LOG.gz - | gunzip | jq '.action'
```

**Temporarily disable WAF for testing:**
```powershell
# Get current web ACL configuration
aws wafv2 get-web-acl \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --id YOUR_WEB_ACL_ID \
  --name YOUR_WEB_ACL_NAME > webacl.json

# Disassociate WAF from CloudFront (requires updating distribution)
# This is risky in production - only do in test environments
```

---

### 6. Check CORS Configuration

**Symptom:** Browser shows CORS errors in console alongside network errors.

**Test CORS with OPTIONS request:**
```powershell
# Test OPTIONS request
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Get -Headers @{
    "Origin" = "https://your-frontend-domain.com"
    "Access-Control-Request-Method" = "POST"
    "Access-Control-Request-Headers" = "Content-Type"
}```

**Check API Gateway CORS settings (REST API):**
```powershell
# Get resource methods
aws apigateway get-resources --rest-api-id YOUR_API_ID

# Get method response for OPTIONS
aws apigateway get-method-response \
  --rest-api-id YOUR_API_ID \
  --resource-id YOUR_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200
```

**Fix CORS in API Gateway:**
- AWS Console → API Gateway → Your API → Resource → Actions → Enable CORS
- Or use AWS CLI to update method responses with CORS headers

---

### 7. Check Network and Firewall

**Symptom:** DNS resolves, but TCP connection fails or times out.

**Test basic connectivity:**
```powershell
# Test TCP connection
nc -zv fb9pxd6m09.execute-api.us-west-2.amazonaws.com 443
telnet fb9pxd6m09.execute-api.us-west-2.amazonaws.com 443

# PowerShell
Test-NetConnection -ComputerName fb9pxd6m09.execute-api.us-west-2.amazonaws.com -Port 443
```

**Check local firewall:**
```powershell
# Linux (iptables)
sudo iptables -L -n -v | Select-String 443

# macOS
sudo pfctl -s rules | Select-String 443

# Windows (PowerShell as Administrator)
Get-NetFirewallRule | Where-Object {$_.LocalPort -eq 443}
```

**Test from different network:**
- Test from a different machine/network to rule out local issues
- Test from AWS Cloud9, EC2, or a bastion host in the same region
- Use a VPN or mobile hotspot to bypass corporate firewalls

**Check VPC Security Groups (if accessing from within AWS):**
```powershell
# List security groups
aws ec2 describe-security-groups \
  --query 'SecurityGroups[*].[GroupId,GroupName,VpcId]'

# Check outbound rules
aws ec2 describe-security-groups \
  --group-ids sg-YOUR_SG_ID \
  --query 'SecurityGroups[*].IpPermissionsEgress'
```

---

### 8. Check Backend Lambda Functions

**Symptom:** API Gateway responds but Lambda functions are failing.

**Check Lambda function logs:**
```powershell
# List log groups
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/

# Tail recent logs
aws logs tail /aws/lambda/YOUR_FUNCTION_NAME --follow

# Filter for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/YOUR_FUNCTION_NAME \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

**Test Lambda function directly:**
```powershell
# Invoke Lambda function
aws lambda invoke \
  --function-name YOUR_FUNCTION_NAME \
  --payload '{"httpMethod":"GET","path":"/auth/me"}' \
  response.json

Get-Content response.json
```

**Check Lambda function configuration:**
```powershell
# Get function configuration
aws lambda get-function-configuration \
  --function-name YOUR_FUNCTION_NAME

# Check environment variables
aws lambda get-function-configuration \
  --function-name YOUR_FUNCTION_NAME \
  --query 'Environment.Variables'
```

---

## Common Root Causes and Solutions

### Cause 1: Typo in Environment Variable

**Symptoms:** DNS fails with NXDOMAIN or similar error.

**Solution:**
1. Check `.env.production` and `.env.local` for typos
2. Verify `VITE_API_BASE` matches actual API Gateway URL
3. Rebuild and redeploy frontend

### Cause 2: API Gateway Stage Deleted or Renamed

**Symptoms:** DNS fails or returns 403 Forbidden.

**Solution:**
1. Recreate the API Gateway deployment/stage
2. Or update frontend environment to use correct stage name
3. Re-deploy backend to ensure stage is active

### Cause 3: Route53 DNS Record Missing

**Symptoms:** DNS fails for custom domain (e.g., api.valine.com).

**Solution:**
1. Create or restore Route53 A/ALIAS record pointing to API Gateway regional domain or CloudFront
2. Wait 5-15 minutes for DNS propagation
3. Test with `dig` or `nslookup`

### Cause 4: CloudFront Origin Misconfigured

**Symptoms:** CloudFront returns 502 or 504, or requests don't reach API Gateway.

**Solution:**
1. Update CloudFront origin to point to correct API Gateway domain
2. Ensure origin protocol is HTTPS
3. Check origin custom headers if API Gateway requires them
4. Invalidate CloudFront cache: `aws cloudfront create-invalidation --distribution-id ID --paths "/*"`

### Cause 5: WAF Blocking Requests

**Symptoms:** Requests blocked with 403 Forbidden, WAF logs show blocks.

**Solution:**
1. Review WAF rules and adjust IP-based restrictions
2. Add frontend domain to allowlist if using origin-based filtering
3. Temporarily disable problematic WAF rule for testing
4. Update WAF rule to allow legitimate traffic

### Cause 6: CORS Not Configured

**Symptoms:** Browser shows CORS errors, OPTIONS requests fail.

**Solution:**
1. Enable CORS in API Gateway for affected resources
2. Ensure CORS headers include frontend domain in `Access-Control-Allow-Origin`
3. Redeploy API Gateway after CORS changes
4. If using CloudFront, configure response headers policy

---

## Testing and Verification

### Test Login Flow End-to-End

Use the test auth login helper scripts (see below) to verify credentials work:

```powershell
# Bash
$env:TEST_EMAIL = "user@example.com"
$env:TEST_PASSWORD = "password123"
./scripts/test-auth-login.sh

# PowerShell
$env:TEST_EMAIL = "user@example.com"
$env:TEST_PASSWORD = "password123"
.\scripts\test-auth-login.ps1
```

### Test from Browser Console

```javascript
// In browser console on your frontend domain
fetch('https://fb9pxd6m09.execute-api.us-west-2.amazonaws.com/auth/me', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include'
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### Test CORS

```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Get -Headers @{
    "Origin" = "https://your-frontend-domain.com"
    "Access-Control-Request-Method" = "POST"
    "Access-Control-Request-Headers" = "Content-Type"
}```

---

## Prevention and Monitoring

### 1. Environment Variable Validation

Add a pre-build check to validate environment variables:

```powershell
# In package.json scripts or CI/CD
if [ -z "$VITE_API_BASE" ]; then
  echo "Error: VITE_API_BASE not set"
  exit 1
fi

# Validate format (should start with https://)
if [[ ! "$VITE_API_BASE" =~ ^https:// ]]; then
  echo "Error: VITE_API_BASE must start with https://"
  exit 1
fi
```

### 2. DNS Monitoring

Set up CloudWatch alarms or external monitoring (e.g., Pingdom, UptimeRobot) to:
- Monitor DNS resolution for custom domains
- Alert on DNS failures or changes
- Track API Gateway endpoint availability

### 3. API Gateway Health Checks

Create a simple health check endpoint:

```powershell
# Test health endpoint
Invoke-RestMethod -Uri "https://fb9pxd6m09.execute-api.us-west-2.amazonaws.com/health" -Method Get

# Expected: {"status":"ok","timestamp":"2025-11-19T21:00:00Z"}
```

Schedule regular health checks in CI/CD or monitoring tool.

### 4. Deployment Verification

Add post-deployment verification:

```powershell
# After deploying backend
node scripts/check-auth-backend.js --domain $API_DOMAIN

# After deploying frontend
npm run verify:post-merge
```

---

## Emergency Contact and Escalation

If issue persists after following this runbook:

1. **Collect diagnostic information:**
   ```powershell
   # Run diagnostic script and save output
   node scripts/check-auth-backend.js --domain YOUR_DOMAIN --verbose > diagnostic-output.txt 2>&1
   
   # Collect AWS resource information
   aws apigateway get-rest-apis > api-gateway-apis.json
   aws cloudfront list-distributions > cloudfront-distributions.json
   ```

2. **Check CloudWatch logs:**
   - Frontend error logs: CloudWatch Logs → `/aws/lambda/pv-api-prod-logEvent`
   - API Gateway logs: CloudWatch Logs → API Gateway execution logs
   - Lambda function logs: CloudWatch Logs → `/aws/lambda/YOUR_FUNCTION`

3. **Document timeline:**
   - When did the issue start?
   - What changed recently (deployments, configuration)?
   - Is this affecting all users or specific users/regions?

4. **Escalate with:**
   - Diagnostic script output
   - CloudWatch logs showing errors
   - Timeline of recent changes
   - AWS Console screenshots showing configuration

---

## Related Documentation

- [API Base Validation Guide](./API_BASE_VALIDATION.md) - Validate and troubleshoot API configuration
- [White Screen Runbook](./white-screen-runbook.md) - Frontend loading issues
- [Deployment Guide](./deployment/deployment-guide.md) - Deployment procedures
- [API Reference](./api/reference.md) - API endpoint documentation
- [Security Guide](./security/guide.md) - Security configuration

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-19 | 1.1 | Added API Base Validation Guide reference |
| 2025-11-19 | 1.0 | Initial runbook creation |

**Maintained by:** DevOps Team  
**Last Updated:** 2025-11-19
