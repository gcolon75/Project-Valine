# Deploy Verification Demo Transcript

This document shows example interactions with the deploy verification commands.

## Scenario 1: Successful Deployment Verification

**User in Discord:**
```
/verify-latest
```

**Bot Response (after ~20 seconds):**
```
✅ Client deploy OK | Frontend: https://d3abc123xyz.cloudfront.net | API: https://api.projectvaline.com | cf: ok | build: 42.3s
```

**Embed Details:**
```
📋 Deploy Verification

✅ Actions: success | build: 42.3s | s3 sync: 8.1s | cf invalidation: ok
✅ Frontend: 200 OK | index.html: 200 OK | cache-control=no-cache
✅ API: /health 200 | /hello 200

Workflow Run: View on GitHub
Run ID: 8234567890
```

---

## Scenario 2: API Endpoint Failure

**User in Discord:**
```
/verify-latest
```

**Bot Response:**
```
❌ Client deploy check failed | API checks failed | run: https://github.com/gcolon75/Project-Valine/actions/runs/8234567890
```

**Embed Details:**
```
❌ Deploy Verification

✅ Actions: success | build: 45.2s | s3 sync: 9.3s | cf invalidation: ok
✅ Frontend: 200 OK | index.html: 200 OK | cache-control=no-cache
❌ API: /health 500 | /hello 500

Workflow Run: View on GitHub

🔧 Suggested Fixes:
• Confirm API /health and /hello endpoints are deployed and reachable
• Check VITE_API_BASE secret matches the deployed API URL

Run ID: 8234567890
```

---

## Scenario 3: CloudFront Invalidation Missing

**User in Discord:**
```
/verify-run 8234567800
```

**Bot Response:**
```
❌ Client deploy check failed | Actions failed | run: https://github.com/gcolon75/Project-Valine/actions/runs/8234567800
```

**Embed Details:**
```
❌ Deploy Verification

❌ Actions: success | build: 43.1s | s3 sync: 7.8s | cf invalidation: missing
✅ Frontend: 200 OK | index.html: 200 OK | cache-control=no-cache
✅ API: /health 200 | /hello 200

Workflow Run: View on GitHub

🔧 Suggested Fixes:
• Confirm CLOUDFRONT_DISTRIBUTION_ID and that the Invalidate CloudFront step ran successfully

Run ID: 8234567800
```

---

## Scenario 4: Cache-Control Header Issue

**User in Discord:**
```
/verify-latest
```

**Bot Response:**
```
❌ Client deploy check failed | Frontend checks failed | run: https://github.com/gcolon75/Project-Valine/actions/runs/8234567900
```

**Embed Details:**
```
❌ Deploy Verification

✅ Actions: success | build: 44.5s | s3 sync: 8.9s | cf invalidation: ok
❌ Frontend: 200 OK | index.html: 200 OK | cache-control=public, max-age=300
✅ API: /health 200 | /hello 200

Workflow Run: View on GitHub

🔧 Suggested Fixes:
• Set Cache-Control: no-cache on index.html in deploy step

Run ID: 8234567900
```

---

## Scenario 5: Verification with Specific URL

**User in Discord:**
```
/verify-latest https://github.com/gcolon75/Project-Valine/actions/runs/8234567950
```

**Bot Response:**
```
✅ Client deploy OK | Frontend: https://d3abc123xyz.cloudfront.net | API: https://api.projectvaline.com | cf: ok | build: 41.8s
```

**Embed Details:**
```
📋 Deploy Verification

✅ Actions: success | build: 41.8s | s3 sync: 7.5s | cf invalidation: ok
✅ Frontend: 200 OK | index.html: 200 OK | cache-control=no-cache
✅ API: /health 200 | /hello 200

Workflow Run: View on GitHub
Run ID: 8234567950
```

---

## Scenario 6: No Workflow Runs Found

**User in Discord:**
```
/verify-latest
```

**Bot Response:**
```
❌ No Client Deploy workflow run found
```

**Embed Details:**
```
Deploy Verification

No workflow run found for Client Deploy on main branch

Run ID: unknown
```

---

## Scenario 7: Invalid Run ID

**User in Discord:**
```
/verify-run not-a-number
```

**Bot Response:**
```
❌ Invalid run_id: must be a number
```

*This response is ephemeral (only visible to the user who ran the command)*

---

## Scenario 8: Run Not Found

**User in Discord:**
```
/verify-run 999999999
```

**Bot Response:**
```
❌ Workflow run 999999999 not found
```

---

## Performance Benchmarks

Based on typical usage:

| Check Type | Typical Duration |
|------------|------------------|
| GitHub API fetch (run + jobs) | 3-5 seconds |
| Frontend HTTP checks (2 endpoints) | 1-3 seconds |
| API HTTP checks (2 endpoints) | 1-3 seconds |
| Message composition | < 1 second |
| **Total typical execution** | **5-12 seconds** |
| **Maximum execution** | **60 seconds** (Lambda timeout) |

---

## Command Syntax Summary

```
# Verify latest run on main branch
/verify-latest

# Verify latest run with specific URL
/verify-latest https://github.com/owner/repo/actions/runs/123456

# Verify specific run by ID
/verify-run 123456
```

---

## Error Handling Examples

### Network Timeout
```
❌ Client deploy check failed | Frontend checks failed | run: https://...

❌ Actions: success | build: 45s | s3 sync: 8s | cf invalidation: ok
❌ Frontend: error | index.html: error | cache-control=missing
✅ API: /health 200 | /hello 200

🔧 Suggested Fixes:
• Check FRONTEND_BASE_URL secret is set correctly
```

### GitHub API Rate Limit
```
❌ Error: GitHub API rate limit exceeded

Please try again in a few minutes.
```

### Missing Environment Variables
```
❌ Error: Frontend base URL not provided

Configuration issue: FRONTEND_BASE_URL environment variable not set.
Contact your administrator.
```

---

## Visual Command Flow

```
User types: /verify-latest
        ↓
Discord sends interaction to Lambda
        ↓
Lambda validates signature
        ↓
DeployVerifier orchestrates checks
        ↓
    ┌───────────────┬──────────────┬─────────────┐
    ↓               ↓              ↓             ↓
GitHub API    Frontend HTTP   API HTTP    Message
   fetch         checks         checks    Composer
    ↓               ↓              ↓             ↓
Run info +   Status codes + Status codes = Discord
durations     headers                       Embed
        ↓
Lambda returns response
        ↓
Discord displays result (5-12s later)
```

---

## Testing Checklist

When testing the deployed commands:

- [ ] `/verify-latest` with successful run
- [ ] `/verify-latest` with failed run
- [ ] `/verify-latest [url]` with valid URL
- [ ] `/verify-latest [url]` with invalid URL
- [ ] `/verify-run <id>` with valid ID
- [ ] `/verify-run <id>` with invalid ID (non-numeric)
- [ ] `/verify-run <id>` with non-existent ID
- [ ] Check CloudWatch Logs for errors
- [ ] Verify response times < 60s
- [ ] Test with API down
- [ ] Test with frontend down
- [ ] Test with missing CloudFront invalidation

---

This transcript demonstrates the complete user experience and error handling for the deploy verification feature.
