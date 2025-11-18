# WAF Configuration for CloudFront Asset Access

## Overview

This guide explains how to configure AWS WAF to allow legitimate asset requests while maintaining security for the Project Valine CloudFront distribution.

## Current Issue

The WAF WebACL `AllowOnlyMyIP-CloudFront` (ID: `136aae39-43db-4bf4-a93a-8e8c63cce450`) is attached to the CloudFront distribution and blocks asset requests from users outside the allowed IP range, resulting in 403 errors.

## Solution Options

### Option 1: Detach WAF (Recommended for Testing)

**Pros**:
- Quick fix for testing
- Eliminates WAF as a variable during troubleshooting

**Cons**:
- Removes all IP-based access control
- Not suitable for production

**Implementation**:
```bash
aws cloudfront get-distribution-config --id E16LPJDBIL5DEE > dist-config.json

# Edit dist-config.json: Set WebACLId to empty string ""
# Make sure to extract the DistributionConfig section only

aws cloudfront update-distribution \
  --id E16LPJDBIL5DEE \
  --if-match <ETag from get-distribution-config> \
  --distribution-config file://dist-config-updated.json
```

### Option 2: Add ALLOW Rules for Assets (Recommended for Production)

**Pros**:
- Maintains IP-based access control for sensitive paths
- Allows public access to static assets

**Cons**:
- Requires careful rule ordering and testing

**Implementation**:

#### Step 1: Get Current WebACL Configuration

```bash
aws wafv2 get-web-acl \
  --scope CLOUDFRONT \
  --id 136aae39-43db-4bf4-a93a-8e8c63cce450 \
  --name AllowOnlyMyIP-CloudFront \
  --region us-east-1 > webacl-current.json
```

#### Step 2: Create ALLOW Rule for Assets

Add a new rule to the WebACL with the following properties:

**Rule Name**: `AllowPublicAssets`
**Priority**: `0` (must be BEFORE IP restriction rule)
**Action**: `ALLOW`

**Statement** (ByteMatch on URI):
```json
{
  "Name": "AllowPublicAssets",
  "Priority": 0,
  "Statement": {
    "OrStatement": {
      "Statements": [
        {
          "ByteMatchStatement": {
            "FieldToMatch": {
              "UriPath": {}
            },
            "TextTransformations": [
              {
                "Type": "NONE",
                "Priority": 0
              }
            ],
            "PositionalConstraint": "STARTS_WITH",
            "SearchString": "/assets/"
          }
        },
        {
          "ByteMatchStatement": {
            "FieldToMatch": {
              "UriPath": {}
            },
            "TextTransformations": [
              {
                "Type": "NONE",
                "Priority": 0
              }
            ],
            "PositionalConstraint": "ENDS_WITH",
            "SearchString": ".js"
          }
        },
        {
          "ByteMatchStatement": {
            "FieldToMatch": {
              "UriPath": {}
            },
            "TextTransformations": [
              {
                "Type": "NONE",
                "Priority": 0
              }
            ],
            "PositionalConstraint": "ENDS_WITH",
            "SearchString": ".css"
          }
        },
        {
          "ByteMatchStatement": {
            "FieldToMatch": {
              "UriPath": {}
            },
            "TextTransformations": [
              {
                "Type": "NONE",
                "Priority": 0
              }
            ],
            "PositionalConstraint": "ENDS_WITH",
            "SearchString": ".json"
          }
        },
        {
          "ByteMatchStatement": {
            "FieldToMatch": {
              "UriPath": {}
            },
            "TextTransformations": [
              {
                "Type": "NONE",
                "Priority": 0
              }
            ],
            "PositionalConstraint": "ENDS_WITH",
            "SearchString": ".png"
          }
        },
        {
          "ByteMatchStatement": {
            "FieldToMatch": {
              "UriPath": {}
            },
            "TextTransformations": [
              {
                "Type": "NONE",
                "Priority": 0
              }
            ],
            "PositionalConstraint": "ENDS_WITH",
            "SearchString": ".jpg"
          }
        },
        {
          "ByteMatchStatement": {
            "FieldToMatch": {
              "UriPath": {}
            },
            "TextTransformations": [
              {
                "Type": "NONE",
                "Priority": 0
              }
            ],
            "PositionalConstraint": "ENDS_WITH",
            "SearchString": ".svg"
          }
        },
        {
          "ByteMatchStatement": {
            "FieldToMatch": {
              "UriPath": {}
            },
            "TextTransformations": [
              {
                "Type": "NONE",
                "Priority": 0
              }
            ],
            "PositionalConstraint": "ENDS_WITH",
            "SearchString": ".ico"
          }
        },
        {
          "ByteMatchStatement": {
            "FieldToMatch": {
              "UriPath": {}
            },
            "TextTransformations": [
              {
                "Type": "NONE",
                "Priority": 0
              }
            ],
            "PositionalConstraint": "ENDS_WITH",
            "SearchString": ".webp"
          }
        },
        {
          "ByteMatchStatement": {
            "FieldToMatch": {
              "UriPath": {}
            },
            "TextTransformations": [
              {
                "Type": "NONE",
                "Priority": 0
              }
            ],
            "PositionalConstraint": "ENDS_WITH",
            "SearchString": ".woff"
          }
        },
        {
          "ByteMatchStatement": {
            "FieldToMatch": {
              "UriPath": {}
            },
            "TextTransformations": [
              {
                "Type": "NONE",
                "Priority": 0
              }
            ],
            "PositionalConstraint": "ENDS_WITH",
            "SearchString": ".woff2"
          }
        },
        {
          "ByteMatchStatement": {
            "FieldToMatch": {
              "UriPath": {}
            },
            "TextTransformations": [
              {
                "Type": "NONE",
                "Priority": 0
              }
            ],
            "PositionalConstraint": "ENDS_WITH",
            "SearchString": ".ttf"
          }
        },
        {
          "ByteMatchStatement": {
            "FieldToMatch": {
              "UriPath": {}
            },
            "TextTransformations": [
              {
                "Type": "NONE",
                "Priority": 0
              }
            ],
            "PositionalConstraint": "ENDS_WITH",
            "SearchString": ".xml"
          }
        }
      ]
    }
  },
  "Action": {
    "Allow": {}
  },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "AllowPublicAssets"
  }
}
```

#### Step 3: Update Existing Rule Priorities

Increment the priority of all existing rules by 1 to make room for the new ALLOW rule at priority 0.

Example:
- Old IP restriction rule: Priority 0 → New Priority: 1
- Other rules: Increment by 1

#### Step 4: Apply Updated WebACL

```bash
# Edit webacl-current.json to add the new rule and update priorities
# Remove LockToken from the JSON before updating

aws wafv2 update-web-acl \
  --scope CLOUDFRONT \
  --id 136aae39-43db-4bf4-a93a-8e8c63cce450 \
  --name AllowOnlyMyIP-CloudFront \
  --region us-east-1 \
  --cli-input-json file://webacl-updated.json
```

### Option 3: Create Separate WebACL for Admin Paths

**Pros**:
- Clean separation between public assets and admin paths
- More maintainable

**Cons**:
- Requires CloudFront cache behavior configuration
- More complex setup

**Implementation**:

1. Create a new WebACL `AllowOnlyMyIP-Admin` with IP restrictions
2. Keep the existing WebACL or create a new one without IP restrictions for assets
3. Configure CloudFront cache behaviors:
   - Default behavior (assets): No WAF or permissive WAF
   - `/admin/*` behavior: Attach `AllowOnlyMyIP-Admin` WebACL

## Testing

After applying WAF changes, verify asset access:

```bash
# Test from an external IP (not in your allowed list)
curl -I https://dkmxy676d3vgc.cloudfront.net/assets/index-yrgN6q4Q.js

# Should return 200, not 403
# HTTP/2 200
# content-type: application/javascript; charset=utf-8

# Test restricted path (if applicable)
curl -I https://dkmxy676d3vgc.cloudfront.net/admin

# Should return 403 from non-allowed IPs
```

## Monitoring

After WAF changes, monitor:

1. **CloudWatch Metrics**:
   - `AllowedRequests`: Should increase for asset paths
   - `BlockedRequests`: Should decrease overall
   - Custom metric `AllowPublicAssets`: Shows how many requests matched the ALLOW rule

2. **WAF Sampled Requests**:
   ```bash
   aws wafv2 get-sampled-requests \
     --web-acl-arn arn:aws:wafv2:us-east-1:579939802800:global/webacl/AllowOnlyMyIP-CloudFront/136aae39-43db-4bf4-a93a-8e8c63cce450 \
     --rule-metric-name AllowPublicAssets \
     --scope CLOUDFRONT \
     --time-window StartTime=$(date -u -d '1 hour ago' +%s),EndTime=$(date -u +%s) \
     --max-items 100 \
     --region us-east-1
   ```

3. **CloudFront Access Logs**:
   - Filter for `sc-status = 403` on asset paths
   - Should see 403s disappear after WAF update

## Rollback

If issues occur, quickly rollback by:

**Option 1 rollback** (detached WAF):
```bash
# Re-attach original WebACL
aws cloudfront get-distribution-config --id E16LPJDBIL5DEE > dist-config.json
# Edit: Set WebACLId back to original ARN
aws cloudfront update-distribution --id E16LPJDBIL5DEE --if-match <ETag> --distribution-config file://dist-config.json
```

**Option 2 rollback** (added ALLOW rules):
```bash
# Remove the AllowPublicAssets rule
aws wafv2 update-web-acl \
  --scope CLOUDFRONT \
  --id 136aae39-43db-4bf4-a93a-8e8c63cce450 \
  --name AllowOnlyMyIP-CloudFront \
  --region us-east-1 \
  --cli-input-json file://webacl-original.json
```

## Recommended Approach

For **Project Valine**, we recommend:

1. **Short-term** (testing/development): **Detach WAF** (Option 1)
   - Quick fix to verify CloudFront configuration
   - Eliminate WAF as a variable during troubleshooting

2. **Long-term** (production): **Add ALLOW rules** (Option 2)
   - Maintain security for admin/sensitive paths
   - Allow public access to frontend assets
   - Monitor and adjust rules as needed

## Resources

- [AWS WAF Documentation](https://docs.aws.amazon.com/waf/latest/developerguide/waf-chapter.html)
- [WAF Rule Statements](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statements.html)
- [CloudFront with WAF](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-awswaf.html)
