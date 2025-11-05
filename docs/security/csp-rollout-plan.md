# Content Security Policy (CSP) Rollout Plan

## Overview
Phased rollout plan for implementing Content Security Policy (CSP) in Project Valine, from report-only monitoring to full enforcement.

**Last Updated**: 2025-11-05  
**Owner**: Security Engineering Team  
**Status**: Planned - Ready for Implementation  
**Timeline**: 4-6 weeks (phased rollout)

---

## Table of Contents
- [What is CSP?](#what-is-csp)
- [Rollout Strategy](#rollout-strategy)
- [Phase 1: Report-Only Mode](#phase-1-report-only-mode)
- [Phase 2: Analysis & Refinement](#phase-2-analysis--refinement)
- [Phase 3: Enforced Mode (Staging)](#phase-3-enforced-mode-staging)
- [Phase 4: Enforced Mode (Production)](#phase-4-enforced-mode-production)
- [Configuration Reference](#configuration-reference)
- [Monitoring & Alerts](#monitoring--alerts)
- [Troubleshooting](#troubleshooting)

---

## What is CSP?

### Purpose
Content Security Policy (CSP) is a security layer that helps detect and mitigate certain types of attacks:
- **XSS (Cross-Site Scripting)**
- **Data injection attacks**
- **Clickjacking**
- **Mixed content issues**

### How It Works
CSP uses HTTP headers to specify:
- Which sources can load scripts, styles, images, etc.
- Whether inline scripts/styles are allowed
- Whether eval() and similar functions are allowed
- Reporting endpoints for violations

### Example Header
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' https://cdn.valine.app;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  report-uri /api/csp-report
```

---

## Rollout Strategy

### Phased Approach

```
Week 1-2: Report-Only Mode
  ↓ Collect violation reports
  ↓ Fix legitimate violations
  
Week 3: Analysis & Refinement
  ↓ Update CSP policy
  ↓ Test fixes
  
Week 4: Enforced Mode (Staging)
  ↓ Deploy to staging
  ↓ Monitor for issues
  
Week 5-6: Enforced Mode (Production)
  ↓ Gradual rollout
  ↓ Monitor and adjust
```

### Success Criteria
- ✅ <1% violation rate in report-only mode
- ✅ No critical app functionality broken
- ✅ All third-party resources whitelisted
- ✅ Inline scripts/styles eliminated or nonce-protected
- ✅ Monitoring and alerting configured

### Rollback Plan
- Immediate: Remove CSP header via feature flag
- Quick: Revert to report-only mode
- Conservative: Loosen specific directive

---

## Phase 1: Report-Only Mode

**Duration**: 2 weeks  
**Goal**: Identify all CSP violations without breaking functionality

### 1.1 Initial Configuration

**Vite Configuration** (`vite.config.js`):
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'csp-header',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          res.setHeader(
            'Content-Security-Policy-Report-Only',
            [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.valine.app https://*.amazonaws.com",
              "media-src 'self' https://cdn.valine.app",
              "object-src 'none'",
              "frame-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "report-uri /api/csp-report"
            ].join('; ')
          )
          next()
        })
      }
    }
  ]
})
```

**Serverless Configuration** (`serverless/api/csp-report.js`):
```javascript
/**
 * CSP Violation Report Endpoint
 * Receives and logs CSP violation reports
 */
export async function handler(event) {
  try {
    const report = JSON.parse(event.body)
    
    // Log to CloudWatch
    console.log('CSP Violation:', JSON.stringify({
      documentUri: report['csp-report']?.['document-uri'],
      blockedUri: report['csp-report']?.['blocked-uri'],
      violatedDirective: report['csp-report']?.['violated-directive'],
      originalPolicy: report['csp-report']?.['original-policy'],
      timestamp: new Date().toISOString()
    }))
    
    // Store in database for analysis (optional)
    await db.cspViolations.create({
      documentUri: report['csp-report']?.['document-uri'],
      blockedUri: report['csp-report']?.['blocked-uri'],
      violatedDirective: report['csp-report']?.['violated-directive'],
      sourceFile: report['csp-report']?.['source-file'],
      lineNumber: report['csp-report']?.['line-number'],
      createdAt: new Date()
    })
    
    return {
      statusCode: 204, // No Content
      body: ''
    }
  } catch (error) {
    console.error('CSP report error:', error)
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid report' })
    }
  }
}
```

**API Gateway Configuration** (`serverless.yml`):
```yaml
functions:
  cspReport:
    handler: serverless/api/csp-report.handler
    events:
      - http:
          path: api/csp-report
          method: post
          cors: false
```

### 1.2 Deploy to Production

```bash
# Deploy serverless CSP endpoint
cd serverless
npm run deploy -- --stage prod

# Deploy frontend with report-only CSP
cd ..
npm run build
npm run deploy:frontend
```

### 1.3 Monitor Violations

**CloudWatch Insights Query**:
```
fields @timestamp, @message
| filter @message like /CSP Violation/
| stats count() by violatedDirective
| sort count desc
```

**Expected Violations** (to fix):
- Inline scripts (event handlers)
- Inline styles (style attributes)
- Third-party scripts (analytics, social widgets)
- Data URIs in unusual places
- eval() usage (if any)

---

## Phase 2: Analysis & Refinement

**Duration**: 1 week  
**Goal**: Fix violations and refine CSP policy

### 2.1 Analyze Violation Reports

**Query Top Violations**:
```sql
SELECT 
  violated_directive,
  blocked_uri,
  COUNT(*) as violation_count,
  COUNT(DISTINCT document_uri) as affected_pages
FROM csp_violations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY violated_directive, blocked_uri
ORDER BY violation_count DESC
LIMIT 50;
```

### 2.2 Common Fixes

#### Fix 1: Remove Inline Event Handlers
**Before**:
```jsx
<button onClick="handleClick()">Click me</button>
```

**After**:
```jsx
<button onClick={handleClick}>Click me</button>
```

#### Fix 2: Convert Inline Styles to CSS
**Before**:
```jsx
<div style={{ color: 'red', fontSize: '16px' }}>Text</div>
```

**After**:
```jsx
// styles.css
.text-red { color: red; font-size: 16px; }

// Component
<div className="text-red">Text</div>
```

#### Fix 3: Use Nonces for Dynamic Scripts
```javascript
// Generate nonce per request
const nonce = crypto.randomBytes(16).toString('base64')

// Add to CSP header
res.setHeader(
  'Content-Security-Policy',
  `script-src 'self' 'nonce-${nonce}'`
)

// Use in script tag
<script nonce={nonce}>
  // Inline script here
</script>
```

#### Fix 4: Whitelist Third-Party Domains
```javascript
// CSP policy
"script-src 'self' https://www.google-analytics.com https://cdn.segment.com",
"connect-src 'self' https://api.valine.app https://analytics.google.com"
```

### 2.3 Updated CSP Policy (After Fixes)

```javascript
// Refined CSP policy
const cspDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    'https://cdn.valine.app',
    'https://www.google-analytics.com',
    'https://cdn.segment.com'
  ],
  'style-src': [
    "'self'",
    'https://cdn.valine.app',
    "'unsafe-inline'" // Temporarily until all styles externalized
  ],
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'blob:'
  ],
  'font-src': [
    "'self'",
    'data:',
    'https://fonts.gstatic.com'
  ],
  'connect-src': [
    "'self'",
    'https://api.valine.app',
    'https://*.amazonaws.com',
    'https://www.google-analytics.com'
  ],
  'media-src': [
    "'self'",
    'https://cdn.valine.app',
    'blob:'
  ],
  'object-src': ["'none'"],
  'frame-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
}

// Convert to header string
const cspHeader = Object.entries(cspDirectives)
  .map(([key, values]) => `${key} ${values.join(' ')}`)
  .join('; ')
```

### 2.4 Test Thoroughly

```bash
# Run automated tests
npm run test

# Test CSP with Chrome DevTools
# 1. Open DevTools
# 2. Go to Console
# 3. Look for CSP violation warnings
# 4. Fix any violations

# Test with CSP Evaluator
# https://csp-evaluator.withgoogle.com/
```

---

## Phase 3: Enforced Mode (Staging)

**Duration**: 1 week  
**Goal**: Deploy enforced CSP to staging and validate

### 3.1 Deploy to Staging

**Update Vite Config**:
```javascript
// Change from Report-Only to Enforced
res.setHeader('Content-Security-Policy', cspHeader) // Not Report-Only
res.setHeader('Content-Security-Policy-Report-Only', stricterPolicy) // Keep report-only for stricter policy
```

**Deploy**:
```bash
npm run deploy:staging
```

### 3.2 Staging Validation Checklist

- [ ] Home page loads without errors
- [ ] User registration works
- [ ] User login works
- [ ] Profile pages render correctly
- [ ] Media upload/playback works
- [ ] Messages send/receive
- [ ] Search functionality works
- [ ] All third-party integrations function
- [ ] Analytics tracking works
- [ ] No console CSP errors

### 3.3 Load Testing

```bash
# Run load tests
artillery run load-tests/csp-staging.yml

# Monitor for:
# - Increased error rates
# - Broken functionality
# - Performance degradation
```

---

## Phase 4: Enforced Mode (Production)

**Duration**: 2 weeks  
**Goal**: Gradual rollout to production with monitoring

### 4.1 Gradual Rollout Strategy

**Week 1: 10% of traffic**
```javascript
// Feature flag / gradual rollout
const enableCSP = (userId) => {
  const hash = crypto.createHash('md5').update(userId).digest('hex')
  const numeric = parseInt(hash.substring(0, 8), 16)
  return (numeric % 100) < 10 // 10% rollout
}

if (enableCSP(req.userId)) {
  res.setHeader('Content-Security-Policy', cspHeader)
} else {
  res.setHeader('Content-Security-Policy-Report-Only', cspHeader)
}
```

**Week 2: 50% → 100%**
- Day 1-2: 50% rollout
- Day 3-4: 75% rollout
- Day 5+: 100% rollout

### 4.2 Production Monitoring

**CloudWatch Dashboard**:
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["CSP", "Violations", { "stat": "Sum" }]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "CSP Violations"
      }
    },
    {
      "type": "log",
      "properties": {
        "query": "SOURCE '/aws/lambda/valine-api-prod' | fields @timestamp, violatedDirective | stats count() by violatedDirective",
        "region": "us-east-1",
        "title": "Top CSP Violations"
      }
    }
  ]
}
```

**Alerts**:
```yaml
# serverless.yml
custom:
  alerts:
    - CSPViolationSpike:
        metric: CSPViolations
        threshold: 100
        period: 300
        evaluationPeriods: 2
        statistic: Sum
        comparisonOperator: GreaterThanThreshold
```

### 4.3 Rollback Procedures

**Immediate Rollback (Emergency)**:
```javascript
// Disable CSP via environment variable
process.env.ENABLE_CSP = 'false'

// Or via feature flag
await featureFlags.disable('csp-enforcement')
```

**Gradual Rollback**:
```javascript
// Revert to report-only mode
res.setHeader('Content-Security-Policy-Report-Only', cspHeader)
```

---

## Configuration Reference

### Development Environment

```javascript
// vite.config.js - development
const devCSP = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow eval for HMR
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:', 'http:', 'https:'],
  'connect-src': ["'self'", 'ws:', 'wss:', 'http://localhost:*']
}
```

### Staging Environment

```javascript
// Staging - stricter than dev, but allows debugging
const stagingCSP = {
  'default-src': ["'self'"],
  'script-src': ["'self'", 'https://cdn.valine.app'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://cdn.valine.app'],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'connect-src': ["'self'", 'https://api-staging.valine.app']
}
```

### Production Environment

```javascript
// Production - strictest policy
const prodCSP = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    'https://cdn.valine.app',
    'https://www.google-analytics.com'
  ],
  'style-src': ["'self'", 'https://cdn.valine.app'],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
  'connect-src': [
    "'self'",
    'https://api.valine.app',
    'https://*.amazonaws.com'
  ],
  'media-src': ["'self'", 'https://cdn.valine.app', 'blob:'],
  'object-src': ["'none'"],
  'frame-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
}
```

### Environment-Aware Configuration

```javascript
// config/csp.js
export const getCSPPolicy = (env) => {
  const policies = {
    development: devCSP,
    staging: stagingCSP,
    production: prodCSP
  }
  
  return policies[env] || policies.development
}

// Usage
const csp = getCSPPolicy(process.env.NODE_ENV)
res.setHeader('Content-Security-Policy', formatCSP(csp))
```

---

## Monitoring & Alerts

### Key Metrics

1. **Violation Rate**: Violations per 1000 requests
2. **Violation Types**: Most common violated directives
3. **Blocked Resources**: Top blocked URIs
4. **User Impact**: Error rates, page load times

### Grafana Queries

```
# Violation rate
sum(rate(csp_violations_total[5m])) / sum(rate(http_requests_total[5m])) * 1000

# Top violations
topk(10, sum by (violated_directive) (rate(csp_violations_total[1h])))

# Blocked domains
topk(10, sum by (blocked_uri) (rate(csp_violations_total[1h])))
```

### Alert Thresholds

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High Violation Rate | >5 per 1000 requests | P2 | Investigate policy |
| New Violation Type | New directive violated | P3 | Review and whitelist |
| Blocked Critical Resource | Known CDN blocked | P1 | Emergency fix |
| User Error Spike | >2% error rate increase | P1 | Consider rollback |

---

## Troubleshooting

### Issue: Script Not Loading

**Symptom**: Console error: "Refused to load the script..."

**Solutions**:
1. Add script domain to `script-src` directive
2. Use nonce for inline scripts
3. Move inline scripts to external files

### Issue: Styles Not Applied

**Symptom**: Elements appear unstyled

**Solutions**:
1. Add style domain to `style-src` directive
2. Use nonce for inline styles
3. Convert inline styles to CSS classes

### Issue: Images Not Loading

**Symptom**: Broken image icons

**Solutions**:
1. Add image domain to `img-src` directive
2. Ensure `data:` and `blob:` allowed for data URIs
3. Check for mixed content (HTTP images on HTTPS site)

### Issue: API Calls Blocked

**Symptom**: Network errors, failed API requests

**Solutions**:
1. Add API domain to `connect-src` directive
2. Include websocket protocols if needed (`ws:`, `wss:`)
3. Whitelist CDN domains for asset loading

### Issue: Third-Party Widget Broken

**Symptom**: Social media embeds, analytics not working

**Solutions**:
1. Identify required domains via console errors
2. Add to appropriate directives (`script-src`, `frame-src`)
3. Consider `frame-src` for iframe embeds

---

## Best Practices

### DO
- ✅ Start with report-only mode
- ✅ Monitor for at least 1 week before enforcing
- ✅ Use nonces for legitimate inline scripts
- ✅ Keep policies as strict as possible
- ✅ Document all whitelisted domains with reasons
- ✅ Review CSP policy quarterly

### DON'T
- ❌ Use `'unsafe-inline'` or `'unsafe-eval'` in production
- ❌ Whitelist entire CDNs unless necessary
- ❌ Deploy enforced mode without testing
- ❌ Ignore violation reports
- ❌ Use wildcards in domains (`https://*`)

---

## Related Documentation
- [Security Best Practices](../qa/security.md)
- [Incident Response: Security Breach](./incident-response-security-breach.md)
- [Environment Variables Matrix](./environment-variables.md)
- [Release Checklist](../deployment/checklist.md)

---

**Version**: 1.0  
**Review Schedule**: Quarterly or after major frontend changes  
**Next Review**: 2026-02-05
