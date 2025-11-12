# Update IP Allowlist Runbook

## Overview
Operational procedures for updating Web Application Firewall (WAF) IP allowlists in Project Valine when the owner's IP address changes. This runbook covers both CloudFront Global WAF and API Gateway resource policy updates.

**Last Updated**: 2025-11-12  
**Owner**: Security & Operations Team  
**Risk Level**: High (Owner access)  
**Estimated Time**: 10-15 minutes

---

## Table of Contents
- [When to Update IP Allowlist](#when-to-update-ip-allowlist)
- [Prerequisites](#prerequisites)
- [Layer 1: CloudFront Global WAF](#layer-1-cloudfront-global-waf)
- [Layer 2: API Gateway Resource Policy](#layer-2-api-gateway-resource-policy)
- [Verification Steps](#verification-steps)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

---

## When to Update IP Allowlist

### Required Scenarios
- 🌐 **ISP IP Change**: Your internet provider assigned you a new IP address
- 🏢 **Location Change**: Working from a new office or home
- 🛫 **Travel**: Accessing production from a different location
- 🔧 **Network Reconfiguration**: Router or ISP equipment change

### How to Check Your Current IP

```bash
# Method 1: Using curl
curl -s https://api.ipify.org
# Output: 203.0.113.42

# Method 2: Using dig
dig +short myip.opendns.com @resolver1.opendns.com
# Output: 203.0.113.42

# Method 3: Browser
# Visit: https://whatismyipaddress.com/
```

**Expected Format:**
- IPv4: `203.0.113.42` (most common)
- IPv6: `2001:0db8:85a3:0000:0000:8a2e:0370:7334` (if supported)

---

## Prerequisites

### Required Access
- [x] AWS CLI configured with appropriate IAM permissions
- [x] AWS WAFv2:UpdateIPSet permission (Global scope)
- [x] AWS API Gateway:UpdateRestApiPolicy permission
- [x] AWS CloudFront:GetDistribution permission

### Required Tools
```bash
# Verify AWS CLI
aws --version
aws sts get-caller-identity

# Verify jq for JSON parsing
jq --version
```

### Important Infrastructure Details

```yaml
# CloudFront Distribution
Distribution ID: dkmxy676d3vgc
Region: Global (CloudFront)
WAF Scope: CLOUDFRONT

# API Gateway
API ID: i72dxlcfcc
Region: us-west-2
Type: HTTP API

# Current IP Allowlist
Owner IP: <YOUR-CURRENT-IP>/32
```

---

## Layer 1: CloudFront Global WAF

CloudFront WAF operates at the edge and blocks traffic before it reaches your infrastructure.

### Step 1: Get Current IP Set Configuration

```bash
# List all IP sets in CloudFront scope (us-east-1 for global)
aws wafv2 list-ip-sets \
  --scope CLOUDFRONT \
  --region us-east-1 \
  | jq '.IPSets[] | select(.Name | contains("valine") or contains("owner"))'
```

**Expected Output:**
```json
{
  "Name": "valine-owner-ip-allowlist",
  "Id": "12345678-abcd-1234-5678-abcdefghijkl",
  "Description": "Project Valine owner IP allowlist",
  "LockToken": "abc123-def456-ghi789",
  "ARN": "arn:aws:wafv2:us-east-1:123456789012:global/ipset/valine-owner-ip-allowlist/12345678-abcd-1234-5678-abcdefghijkl"
}
```

**Save these values:**
```bash
IP_SET_ID="12345678-abcd-1234-5678-abcdefghijkl"
IP_SET_NAME="valine-owner-ip-allowlist"
```

### Step 2: Get Current Lock Token

> ⚠️ **Important**: WAFv2 requires a lock token for updates to prevent concurrent modifications.

```bash
# Get current IP set details including lock token
aws wafv2 get-ip-set \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --id "$IP_SET_ID" \
  --name "$IP_SET_NAME" \
  > /tmp/current-ipset.json

# Extract lock token
LOCK_TOKEN=$(jq -r '.LockToken' /tmp/current-ipset.json)
echo "Lock Token: $LOCK_TOKEN"

# View current IPs
jq -r '.IPSet.Addresses[]' /tmp/current-ipset.json
```

**Expected Output:**
```
203.0.113.10/32
```

### Step 3: Update IP Set with New IP

```bash
# Get your new IP address
NEW_IP=$(curl -s https://api.ipify.org)
echo "New IP address: $NEW_IP"

# Update IP set (replace old IP with new IP)
aws wafv2 update-ip-set \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --id "$IP_SET_ID" \
  --name "$IP_SET_NAME" \
  --addresses "${NEW_IP}/32" \
  --lock-token "$LOCK_TOKEN"
```

> 💡 **Multiple IPs**: To allow multiple IPs (e.g., office + home), use:
> ```bash
> --addresses "${IP1}/32" "${IP2}/32" "${IP3}/32"
> ```

**Expected Output:**
```json
{
  "NextLockToken": "xyz789-uvw456-rst123"
}
```

### Step 4: Verify CloudFront WAF Update

```bash
# Confirm new IP is in the set
aws wafv2 get-ip-set \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --id "$IP_SET_ID" \
  --name "$IP_SET_NAME" \
  | jq -r '.IPSet.Addresses[]'
```

**Expected Output:**
```
203.0.113.42/32
```

---

## Layer 2: API Gateway Resource Policy

API Gateway resource policy provides an additional layer of IP-based access control.

### Step 1: Get Current Resource Policy

```bash
# Get API Gateway details
aws apigatewayv2 get-api \
  --api-id i72dxlcfcc \
  --region us-west-2 \
  > /tmp/api-gateway.json

# View current policy (if exists)
jq -r '.Policy' /tmp/api-gateway.json | jq '.' || echo "No policy set"
```

**Expected Output:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-west-2:123456789012:i72dxlcfcc/*",
      "Condition": {
        "NotIpAddress": {
          "aws:SourceIp": ["203.0.113.10/32"]
        }
      }
    }
  ]
}
```

### Step 2: Create Updated Policy

```bash
# Get your new IP
NEW_IP=$(curl -s https://api.ipify.org)

# Create new policy JSON
cat > /tmp/new-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-west-2:*:i72dxlcfcc/*",
      "Condition": {
        "NotIpAddress": {
          "aws:SourceIp": ["${NEW_IP}/32"]
        }
      }
    }
  ]
}
EOF

# View the policy
cat /tmp/new-policy.json | jq
```

> 💡 **Multiple IPs**: To allow multiple IPs:
> ```json
> "aws:SourceIp": ["203.0.113.42/32", "198.51.100.10/32"]
> ```

### Step 3: Update API Gateway Policy

```bash
# Update the resource policy
aws apigatewayv2 update-api \
  --api-id i72dxlcfcc \
  --region us-west-2 \
  --policy file:///tmp/new-policy.json
```

**Expected Output:**
```json
{
  "ApiId": "i72dxlcfcc",
  "Name": "valine-api-prod",
  "ProtocolType": "HTTP",
  "Policy": "{\"Version\":\"2012-10-17\",\"Statement\":[...]}",
  "CreatedDate": "2025-01-15T10:30:00Z"
}
```

> ⚠️ **Important**: Changes to API Gateway resource policy take effect immediately (no deployment required).

### Step 4: Verify API Gateway Update

```bash
# Confirm new policy
aws apigatewayv2 get-api \
  --api-id i72dxlcfcc \
  --region us-west-2 \
  --query 'Policy' \
  --output text \
  | jq '.Statement[0].Condition.NotIpAddress."aws:SourceIp"'
```

**Expected Output:**
```json
[
  "203.0.113.42/32"
]
```

---

## Verification Steps

### Test 1: Access from New IP (Should Work)

```bash
# Test frontend (CloudFront)
curl -I https://valine.app
```

**Expected Response:**
```
HTTP/2 200
content-type: text/html
...
```

**Failed Response (if WAF blocks):**
```
HTTP/2 403
x-amz-cf-id: ...
```

### Test 2: Access API Directly (Should Work)

```bash
# Test API Gateway endpoint directly
curl -I https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/
```

**Expected Response:**
```
HTTP/2 200
content-type: application/json
...
```

**Failed Response (if resource policy blocks):**
```
HTTP/2 403
{"message":"Forbidden"}
```

### Test 3: Full Login Flow

```bash
# Test complete authentication flow
curl -X POST https://api.valine.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@example.com",
    "password": "YourPassword123!"
  }' | jq
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "usr_123",
    "email": "owner@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Test 4: Access from Old IP (Should Fail)

> ⚠️ **Testing Limitation**: You can only test this if you still have access to the old IP.

```bash
# If you have VPN or old network access
# This should return 403 Forbidden
curl -I https://valine.app
```

**Expected Response:**
```
HTTP/2 403
```

---

## Rollback Procedures

### Scenario: Accidentally Blocked Yourself

If you lose access after updating the IP allowlist:

#### Option 1: Using AWS Console (Mobile/Different Network)

1. **Use Mobile Hotspot**: Connect to AWS Console via phone's internet
2. **Navigate to WAF Console**: https://console.aws.amazon.com/wafv2/
3. **Select Region**: `Global (CloudFront)` from dropdown
4. **Find IP Set**: `valine-owner-ip-allowlist`
5. **Edit IP Addresses**: Add your current IP or `0.0.0.0/0` (temporary)
6. **Save Changes**

> ⚠️ **Warning**: Using `0.0.0.0/0` allows all IPs. Only use temporarily to regain access, then update with correct IP.

#### Option 2: Using AWS CLI from Different Network

```bash
# From a different network (mobile hotspot, coffee shop, etc.)
# Get your current IP
NEW_IP=$(curl -s https://api.ipify.org)

# Update WAF IP set
aws wafv2 update-ip-set \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --id "$IP_SET_ID" \
  --name "$IP_SET_NAME" \
  --addresses "${NEW_IP}/32" \
  --lock-token "$(aws wafv2 get-ip-set --scope CLOUDFRONT --region us-east-1 --id $IP_SET_ID --name $IP_SET_NAME --query 'LockToken' --output text)"
```

#### Option 3: Emergency Access (Open Temporarily)

```bash
# EMERGENCY ONLY: Open access to all IPs
aws wafv2 update-ip-set \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --id "$IP_SET_ID" \
  --name "$IP_SET_NAME" \
  --addresses "0.0.0.0/0" \
  --lock-token "<get-from-console>"

# Set reminder to restrict within 1 hour
echo "URGENT: Restore IP allowlist restrictions!" | mail -s "Security Alert" ops@example.com
```

### Restore Previous IP

```bash
# Restore to previous IP (from backup)
OLD_IP="203.0.113.10"

aws wafv2 update-ip-set \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --id "$IP_SET_ID" \
  --name "$IP_SET_NAME" \
  --addresses "${OLD_IP}/32" \
  --lock-token "$(aws wafv2 get-ip-set --scope CLOUDFRONT --region us-east-1 --id $IP_SET_ID --name $IP_SET_NAME --query 'LockToken' --output text)"
```

---

## Troubleshooting

### Issue: "Forbidden" Error on Frontend

**Symptoms:**
```
HTTP/2 403
x-amz-cf-id: ABCDEFGHIJKLMNOPQRSTUVWXYZ-1234567890
```

**Diagnosis:**
```bash
# Check if your IP is in CloudFront WAF allowlist
MY_IP=$(curl -s https://api.ipify.org)
echo "My IP: $MY_IP"

aws wafv2 get-ip-set \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --id "$IP_SET_ID" \
  --name "$IP_SET_NAME" \
  | jq -r '.IPSet.Addresses[]' \
  | grep "$MY_IP"
```

**Solution:**
- If no match → Update CloudFront WAF (see Layer 1 steps)
- If match exists → Check for CloudFront cache issue (wait 1-2 minutes)

### Issue: "Forbidden" Error on API

**Symptoms:**
```json
{"message":"Forbidden"}
```

**Diagnosis:**
```bash
# Check API Gateway resource policy
aws apigatewayv2 get-api \
  --api-id i72dxlcfcc \
  --region us-west-2 \
  --query 'Policy' \
  --output text \
  | jq '.Statement[0].Condition.NotIpAddress."aws:SourceIp"[]' \
  | grep "$(curl -s https://api.ipify.org)"
```

**Solution:**
- If no match → Update API Gateway policy (see Layer 2 steps)
- If match exists → Check for policy syntax errors

### Issue: Cannot Update IP Set (Lock Token Error)

**Symptoms:**
```
An error occurred (WAFOptimisticLockException): 
The lock token provided is stale.
```

**Solution:**
```bash
# Get fresh lock token
LOCK_TOKEN=$(aws wafv2 get-ip-set \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --id "$IP_SET_ID" \
  --name "$IP_SET_NAME" \
  --query 'LockToken' \
  --output text)

# Retry update with fresh token
aws wafv2 update-ip-set \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --id "$IP_SET_ID" \
  --name "$IP_SET_NAME" \
  --addresses "${NEW_IP}/32" \
  --lock-token "$LOCK_TOKEN"
```

### Issue: Dynamic IP Keeps Changing

**Symptoms:**
- IP changes daily or weekly
- Frequently locked out of production

**Solutions:**

1. **Allow IP Range** (if consistent ISP):
   ```bash
   # Use CIDR block for your ISP's range
   # Example: Allow 203.0.113.0 - 203.0.113.255
   --addresses "203.0.113.0/24"
   ```

2. **Use VPN with Static IP**:
   - Subscribe to VPN service with dedicated IP
   - Update allowlist to VPN IP (remains constant)

3. **Multiple IPs** (home + office + VPN):
   ```bash
   --addresses "203.0.113.42/32" "198.51.100.10/32" "192.0.2.5/32"
   ```

4. **Dynamic DNS + Lambda Updater** (advanced):
   - Set up Dynamic DNS service
   - Create Lambda to auto-update IP allowlist
   - Schedule every 15 minutes

---

## AWS Console Steps (With Screenshot Placeholders)

For operators who prefer GUI:

### Update CloudFront WAF via Console

1. **Navigate to WAF Console**
   - URL: https://console.aws.amazon.com/wafv2/
   - Region selector → **Global (CloudFront)**

2. **Find IP Set**
   - Left menu → **IP sets**
   - Search: `valine-owner-ip-allowlist`
   - Click IP set name

3. **Edit IP Addresses**
   - Click **Edit**
   - Under "IP addresses":
     - Remove old IP
     - Add new IP in format: `203.0.113.42/32`
   - Click **Save**

4. **Verify Change**
   - IP addresses section shows new IP
   - Status: Active

### Update API Gateway via Console

1. **Navigate to API Gateway Console**
   - URL: https://console.aws.amazon.com/apigateway/
   - Region: **us-west-2**

2. **Find API**
   - Select: `valine-api-prod` (ID: i72dxlcfcc)

3. **Edit Resource Policy**
   - Left menu → **Resource policy**
   - Update `aws:SourceIp` array with new IP
   - Click **Save**

4. **Verify Change**
   - Policy shows updated IP
   - No deployment needed (immediate effect)

---

## Monitoring & Alerts

### CloudWatch Metrics

```bash
# Monitor WAF blocked requests
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=Rule,Value=valine-ip-allowlist Name=Region,Value=us-east-1 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region us-east-1
```

### Set Up Alerts

```bash
# Alert when owner is blocked
aws cloudwatch put-metric-alarm \
  --alarm-name valine-owner-blocked \
  --alarm-description "Alert when legitimate traffic is blocked by WAF" \
  --metric-name BlockedRequests \
  --namespace AWS/WAFV2 \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --region us-east-1
```

---

## Security Best Practices

1. **Use CIDR /32**: Always specify exact IP with `/32` suffix
2. **Minimize IP Count**: Only allow necessary IPs
3. **Document Changes**: Keep log of all IP updates
4. **Test Before Saving**: Verify new IP is correct
5. **Backup Access**: Have mobile hotspot or VPN as backup
6. **Regular Audits**: Review IP allowlist monthly

---

## Quick Reference

```bash
# Get my current IP
curl -s https://api.ipify.org

# Update CloudFront WAF
aws wafv2 update-ip-set --scope CLOUDFRONT --region us-east-1 \
  --id <IP_SET_ID> --name <IP_SET_NAME> \
  --addresses "<NEW_IP>/32" --lock-token <LOCK_TOKEN>

# Update API Gateway
aws apigatewayv2 update-api --api-id i72dxlcfcc --region us-west-2 \
  --policy file:///tmp/new-policy.json

# Test access
curl -I https://valine.app
curl -I https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/
```

---

## Related Runbooks

- [Add User](./add-user.md) - Application-level user access
- [Rotate JWT Secret](./rotate-jwt-secret.md) - Session security
- [Frontend Deployment](./frontend-deployment.md) - Production deployment

---

## Change Log

| Date | Change | Operator |
|------|--------|----------|
| 2025-11-12 | Initial runbook creation | Documentation Agent |

