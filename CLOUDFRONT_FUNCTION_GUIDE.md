# CloudFront Function: API Prefix Stripper

## Purpose

This CloudFront Function removes the `/api` prefix from incoming requests before forwarding them to the API Gateway origin. This allows the frontend to make requests to `/api/*` which are transparently routed to the serverless backend.

## Current Implementation

**File:** `strip-api-prefix.js`

```javascript
function handler(event) {
  var req = event.request;
  if (req.uri.startsWith('/api/')) {
    // remove leading "/api"
    req.uri = req.uri.substring(4);
  }
  return req;
}
```

**Example Transformations:**
- `/api/health` → `/health`
- `/api/auth/login` → `/auth/login`
- `/api/profiles/johndoe` → `/profiles/johndoe`

## Deployment to CloudFront

### 1. Create/Update Function

AWS Console → CloudFront → Functions → Create/Edit function

1. Name: `stripApiPrefix`
2. Code: (paste code above)
3. Click **Save**
4. Click **Publish** ⚠️ **CRITICAL: Must publish, not just save!**
5. Verify Status shows **Live**

### 2. Associate with Distribution

AWS Console → CloudFront → Distributions → E16LPJDBIL5DEE

1. Go to **Behaviors** tab
2. Select or create behavior for pattern: `/api/*`
3. Edit behavior:
   - **Path pattern:** `/api/*`
   - **Origin:** API Gateway (i72dxlcfcc.execute-api.us-west-2.amazonaws.com)
   - **Cache policy:** CachingDisabled
   - **Origin request policy:** AllViewerExceptHostHeader
   - **Function associations:**
     - **Viewer request:** stripApiPrefix (Live)
4. Save changes
5. Wait for distribution status to change from "Deploying" to "Deployed"

### 3. Test Function

```bash
# Test health endpoint
curl -v https://dkmxy676d3vgc.cloudfront.net/api/health

# Expected response:
# HTTP/2 200
# content-type: application/json
# {"status":"ok"}

# If you get HTML instead of JSON, the function is not working correctly
```

## API Gateway Stage Prefix

**Important:** Serverless Framework with HTTP API (not REST API) creates routes **without** a stage prefix by default.

### How to Check

1. AWS Console → API Gateway → APIs
2. Find your API (likely named `pv-api-prod` or similar)
3. Click **Routes**
4. Check if routes are:
   - ✅ `/health`, `/auth/login` (no stage prefix) → Use current function as-is
   - ❌ `/prod/health`, `/prod/auth/login` (has stage prefix) → Update function (see below)

### If Stage Prefix Required

If your API Gateway uses a stage prefix like `/prod`, update the function:

```javascript
function handler(event) {
  var req = event.request;
  if (req.uri.startsWith('/api/')) {
    // remove "/api" and prepend "/prod"
    req.uri = '/prod' + req.uri.substring(4);
  }
  return req;
}
```

**Example Transformations with /prod:**
- `/api/health` → `/prod/health`
- `/api/auth/login` → `/prod/auth/login`

## Testing After Changes

### 1. Publish Function

After editing, always click **Publish** to create a new Live version.

### 2. Invalidate CloudFront Cache

```bash
aws cloudfront create-invalidation \
  --distribution-id E16LPJDBIL5DEE \
  --paths "/*" \
  --region us-east-1
```

Wait for invalidation to complete before testing.

### 3. Test Routing

```bash
# Test that /api/* returns JSON (not HTML)
curl -v https://dkmxy676d3vgc.cloudfront.net/api/health

# Check response headers
# Should see:
# - content-type: application/json
# - via: CloudFront (indicates routing through CloudFront)
# - NOT "Server: S3" (that would indicate SPA fallback)
```

### 4. Check CloudFront Logs (Optional)

Enable CloudFront logging to see exact URIs being forwarded:

1. CloudFront → Distribution → Edit
2. Standard logging → On
3. S3 bucket: Create or select bucket for logs
4. Review logs after test requests to see transformed URIs

## Troubleshooting

### Problem: /api/* returns HTML instead of JSON

**Symptoms:**
- `curl /api/health` returns SPA index.html
- Content-Type: text/html

**Causes:**
1. Function not published (still in "draft" state)
2. Function not associated with /api/* behavior
3. Function associated as "Viewer response" instead of "Viewer request"
4. CloudFront cache not invalidated

**Solutions:**
1. Verify function status is **Live** (not draft)
2. Check Behaviors tab → /api/* → Function associations → Viewer request
3. Invalidate cache: `aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"`
4. Wait 5-10 minutes for CloudFront to propagate changes

### Problem: API returns 404 or 403

**Symptoms:**
- `curl /api/health` returns 404 Not Found or 403 Forbidden
- Response is JSON (so routing is working)

**Causes:**
1. Stage prefix mismatch (function strips /api but API requires /prod)
2. API Gateway endpoint not configured correctly
3. Lambda function permissions issue

**Solutions:**
1. Check API Gateway routes (see "API Gateway Stage Prefix" section above)
2. If routes have /prod prefix, update function to prepend it
3. Test API Gateway directly: `curl https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health`
4. If direct API works but CloudFront doesn't, update function code

### Problem: CORS errors in browser

**Symptoms:**
- Browser console shows CORS error
- Preflight OPTIONS requests fail

**Causes:**
1. API Gateway CORS not configured
2. Lambda not returning CORS headers
3. CloudFront removing CORS headers

**Solutions:**
1. Verify serverless.yml has `httpApi: cors: true`
2. Check Lambda response includes:
   - Access-Control-Allow-Origin: https://dkmxy676d3vgc.cloudfront.net
   - Access-Control-Allow-Credentials: true
3. Verify CloudFront behavior allows CORS headers through

## Alternative: CloudFront Origin Path

Instead of using a function, you can configure the CloudFront origin to strip the prefix:

1. CloudFront → Origins → Edit API Gateway origin
2. Set **Origin path:** (leave empty for no prefix, or `/prod` if needed)
3. This automatically prepends the origin path to all requests

**Note:** This approach is simpler but less flexible than using a function.

## Security Considerations

### Function Code Review

CloudFront Functions run in a restricted JavaScript environment:
- No access to external resources
- No sensitive data should be in function code
- Function code is visible in AWS Console to anyone with CloudFront access

### Request Modification Safety

This function only modifies the URI path, which is safe. Avoid:
- Reading/modifying request headers with sensitive data
- Making external API calls
- Complex string manipulation that could introduce injection vulnerabilities

### Monitoring

Set up CloudWatch alarms for:
- CloudFront 4xx/5xx error rates
- Function execution errors
- Abnormal request patterns to /api/*

---

**Function Status:** ⬜ Not Deployed / ⬜ Live / ⬜ Needs Update  
**Stage Prefix:** ⬜ None / ⬜ /prod / ⬜ Other: _______________  
**Last Updated:** _______________  
**Tested By:** _______________
