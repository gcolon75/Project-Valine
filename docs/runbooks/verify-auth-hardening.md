# Auth Hardening Verification Runbook

## Overview

Step-by-step manual verification procedures for authentication and authorization security controls in Project Valine. Use this runbook after deployments, security updates, or WAF configuration changes to ensure all hardening measures are functioning correctly.

**Last Updated**: 2025-11-13  
**Owner**: Security Team  
**Risk Level**: Medium  
**Estimated Time**: 20-30 minutes

---

## Table of Contents

1. [Pre-Verification Setup](#1-pre-verification-setup)
2. [Test Scenarios](#2-test-scenarios)
3. [Verification Checklist](#3-verification-checklist)
4. [Expected Results Matrix](#4-expected-results-matrix)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Pre-Verification Setup

### Required Tools

- [ ] Web browser (Chrome/Firefox recommended)
- [ ] Browser DevTools (F12)
- [ ] `curl` command-line tool
- [ ] Valid credentials for allowlisted test user
- [ ] Credentials for non-allowlisted test user (or create one in test DB)

### Environment URLs

| Environment | Frontend URL | API URL |
|-------------|-------------|---------|
| **Production** | `https://dkmxy676d3vgc.cloudfront.net` | `https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com` |
| **Localhost** | `http://localhost:5173` | `http://localhost:3001` (if running local backend) |

### Test User Accounts

Prepare the following test accounts:

**Allowlisted User:**
- Email: `owner@example.com` (replace with actual allowlisted email)
- Password: Valid password for this account
- Expected: Should be able to log in successfully

**Non-Allowlisted User:**
- Email: `testuser@example.com` (ensure NOT in `ALLOWED_USER_EMAILS`)
- Password: Valid password for this account
- Expected: Authentication succeeds, but access denied (403)

**Invalid Credentials:**
- Email: `owner@example.com`
- Password: `wrongpassword123`
- Expected: Authentication fails (401)

---

## 2. Test Scenarios

### Scenario 1: Allowlisted User Login (Success)

**Purpose:** Verify that users in the email allowlist can log in successfully.

**Steps:**

1. Navigate to login page:
   ```
   https://dkmxy676d3vgc.cloudfront.net/login
   ```

2. Open Browser DevTools → Network tab

3. Enter credentials for allowlisted user:
   - Email: `owner@example.com`
   - Password: `<valid-password>`

4. Click "Login" button

5. Observe response in Network tab:
   - Find POST request to `/auth/login`
   - Check status code
   - Check response headers for `Set-Cookie`
   - Check response body for user object

**Expected Results:**

- ✅ HTTP Status: `200 OK`
- ✅ Response body contains: `{"user": {...}, "requiresTwoFactor": false}`
- ✅ Response headers contain: `Set-Cookie: access_token=...`
- ✅ Response headers contain: `Set-Cookie: refresh_token=...`
- ✅ User redirected to dashboard/home page
- ✅ No error message displayed

**cURL Test:**
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"owner@example.com","password":"<valid-password>"}' -ContentType 'application/json'
```

---

### Scenario 2: Non-Allowlisted User Login (403 Forbidden)

**Purpose:** Verify that users NOT in the email allowlist are blocked after authentication.

**Steps:**

1. Navigate to login page

2. Open Browser DevTools → Network tab

3. Enter credentials for non-allowlisted user:
   - Email: `testuser@example.com`
   - Password: `<valid-password>`

4. Click "Login" button

5. Observe response

**Expected Results:**

- ✅ HTTP Status: `403 Forbidden`
- ✅ Response body contains: `{"error": "Account not authorized for access"}`
- ✅ No `Set-Cookie` headers (no session created)
- ✅ User remains on login page
- ✅ Error message displayed: "Access denied" or similar

**cURL Test:**
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"testuser@example.com","password":"<valid-password>"}' -ContentType 'application/json'
```

**Important:** This test verifies that password authentication SUCCEEDS first (user exists, password correct), but access is denied due to email allowlist. This is Layer 2 protection (application-level).

---

### Scenario 3: Invalid Credentials (401 Unauthorized)

**Purpose:** Verify that invalid passwords are rejected before allowlist check.

**Steps:**

1. Navigate to login page

2. Open Browser DevTools → Network tab

3. Enter invalid credentials:
   - Email: `owner@example.com` (allowlisted)
   - Password: `wrongpassword123` (incorrect)

4. Click "Login" button

5. Observe response

**Expected Results:**

- ✅ HTTP Status: `401 Unauthorized`
- ✅ Response body contains: `{"error": "Invalid email or password"}`
- ✅ No `Set-Cookie` headers
- ✅ User remains on login page
- ✅ Error message displayed: "Invalid credentials" or similar

**cURL Test:**
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"owner@example.com","password":"wrongpassword123"}' -ContentType 'application/json'
```

---

### Scenario 4: Dev Bypass Absence in Production

**Purpose:** Verify that dev bypass feature is disabled in production builds.

**Steps:**

1. Navigate to login page:
   ```
   https://dkmxy676d3vgc.cloudfront.net/login
   ```

2. Open Browser DevTools → Console tab

3. Check for dev bypass environment variable:
   ```javascript
   console.log('Dev Bypass Enabled:', import.meta.env.VITE_ENABLE_DEV_BYPASS);
   ```

4. Visually inspect login page for "Dev Bypass" button

**Expected Results:**

- ✅ Console output: `Dev Bypass Enabled: undefined` OR `Dev Bypass Enabled: false`
- ✅ No "Dev Bypass" button visible on login page
- ✅ No purple/pink gradient button below login form
- ✅ No DEV SESSION banner anywhere on the site

**Browser Inspection:**
```javascript
// In DevTools Console
document.querySelector('[data-testid="dev-bypass-button"]');
// Expected: null (element not found)

localStorage.getItem('devUserSession');
// Expected: null (no dev session in storage)
```

---

### Scenario 5: Dev Bypass Functionality on Localhost

**Purpose:** Verify that dev bypass works correctly on localhost for development.

**Prerequisites:**
- Local development server running
- `.env.local` configured with `VITE_ENABLE_DEV_BYPASS=true`

**Steps:**

1. Navigate to local login page:
   ```
   http://localhost:5173/login
   ```

2. Verify "Dev Bypass" button is visible

3. Click "Dev Bypass" button

4. Observe behavior

**Expected Results:**

- ✅ Purple/pink gradient "Dev Bypass" button visible below login form
- ✅ Clicking button redirects to dashboard
- ✅ No backend API call made (check Network tab)
- ✅ DEV SESSION banner visible at top: "DEV SESSION (NO REAL AUTH) - Localhost Only"
- ✅ localStorage contains: `devUserSession` with mock user object
- ✅ User can navigate to protected routes

**Console Check:**
```javascript
// After clicking Dev Bypass
localStorage.getItem('devUserSession');
// Expected: JSON string with mock user object

JSON.parse(localStorage.getItem('devUserSession'));
// Expected:
// {
//   id: 'dev-user',
//   email: 'dev@local',
//   roles: ['DEV_BYPASS'],
//   ...
// }
```

**Cleanup:**
```javascript
// Clear dev session
localStorage.removeItem('devUserSession');
location.reload();
// Expected: Redirected to login page
```

---

### Scenario 6: Cookie Security Flags

**Purpose:** Verify that authentication cookies have correct security flags.

**Steps:**

1. Log in successfully (use Scenario 1)

2. Open Browser DevTools → Application tab → Cookies

3. Select `https://dkmxy676d3vgc.cloudfront.net` domain

4. Inspect `access_token` and `refresh_token` cookies

**Expected Results:**

**access_token Cookie:**
- ✅ Name: `access_token`
- ✅ Value: JWT string (starts with `eyJ...`)
- ✅ Domain: `.cloudfront.net` or specific subdomain
- ✅ Path: `/`
- ✅ Expires: ~30 minutes from now
- ✅ HttpOnly: ✅ (checked)
- ✅ Secure: ✅ (checked) - HTTPS only
- ✅ SameSite: `Strict` or `Lax`

**refresh_token Cookie:**
- ✅ Name: `refresh_token`
- ✅ Value: JWT string
- ✅ Domain: Same as access_token
- ✅ Path: `/`
- ✅ Expires: ~7 days from now
- ✅ HttpOnly: ✅ (checked)
- ✅ Secure: ✅ (checked)
- ✅ SameSite: `Strict` or `Lax`

**Security Verification:**
```javascript
// In DevTools Console
// Attempt to access cookies via JavaScript (should fail due to HttpOnly)
document.cookie;
// Expected: Empty string or cookies WITHOUT access_token/refresh_token
```

---

### Scenario 7: CORS Policy Enforcement

**Purpose:** Verify that API only accepts requests from allowed origins.

**Steps:**

1. Open Browser DevTools → Console

2. Attempt cross-origin request from disallowed domain:
   ```javascript
   fetch('https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/me', {
     credentials: 'include',
     headers: {
       'Origin': 'https://evil-site.com'
     }
   })
   .then(r => r.json())
   .catch(err => console.error('CORS blocked:', err));
   ```

3. Observe browser console error

**Expected Results:**

- ✅ Browser blocks request with CORS error
- ✅ Console error: "Access to fetch at '...' from origin 'https://evil-site.com' has been blocked by CORS policy"
- ✅ API does not return `Access-Control-Allow-Origin: *`

**cURL Test (Allowed Origin):**
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Get -Headers @{
    "Origin" = "https://dkmxy676d3vgc.cloudfront.net"
    "Access-Control-Request-Method" = "POST"
}
```

**cURL Test (Disallowed Origin):**
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts/{id}" -Method Get -Headers @{
    "Origin" = "https://evil-site.com"
    "Access-Control-Request-Method" = "POST"
}
```

---

### Scenario 8: Public Access After WAF Detachment

**Purpose:** Verify that frontend is publicly accessible after removing IP allowlist WAF.

**Steps:**

1. Access frontend from non-allowlisted IP:
   ```powershell
   # Use mobile hotspot, VPN, or different network
Invoke-WebRequest -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Get
   ```

2. Check that static assets load:
   ```powershell
Invoke-WebRequest -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Get
   ```

3. Attempt to access login page

**Expected Results:**

- ✅ HTTP Status: `200 OK` (not 403 Forbidden)
- ✅ HTML content returned
- ✅ Static assets (JS, CSS) load successfully
- ✅ Login page renders in browser
- ✅ No WAF block message

**From Different IP:**
```powershell
# Test from mobile hotspot or VPN
Invoke-RestMethod -Uri "https://dkmxy676d3vgc.cloudfront.net" -Method Get -Headers @{
    "User-Agent" = "Mozilla/5.0"
}
```

---

### Scenario 9: Registration Disabled

**Purpose:** Verify that registration endpoint returns 403 when disabled.

**Steps:**

1. Attempt to register new user:
   ```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/register" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "email": "newuser@example.com", "password": "password123", "username": "newuser", "displayName": "New User" }' -ContentType 'application/json'
```

2. Check response

**Expected Results:**

- ✅ HTTP Status: `403 Forbidden`
- ✅ Response body: `{"error": "Registration is currently disabled"}`
- ✅ No user created in database

**Environment Variable Check:**
```powershell
# In Lambda environment
echo $ENABLE_REGISTRATION
# Expected: "false" or empty
```

---

## 3. Verification Checklist

Use this checklist after each deployment or security update:

### Authentication & Authorization
- [ ] Allowlisted user can log in successfully (200 OK)
- [ ] Non-allowlisted user blocked after auth (403 Forbidden)
- [ ] Invalid credentials rejected (401 Unauthorized)
- [ ] User not found returns 401 (not 404 - prevents enumeration)

### Dev Bypass Security
- [ ] Dev bypass button NOT visible in production
- [ ] Dev bypass environment variable is false/undefined in prod
- [ ] No dev session in localStorage on production site
- [ ] Dev bypass works correctly on localhost (if tested locally)
- [ ] Build guard prevents production builds with dev bypass enabled

### Cookie Security
- [ ] access_token cookie has HttpOnly flag
- [ ] access_token cookie has Secure flag (HTTPS only)
- [ ] refresh_token cookie has HttpOnly flag
- [ ] refresh_token cookie has Secure flag
- [ ] Both cookies have SameSite=Strict or Lax
- [ ] Cookies scoped to correct domain
- [ ] JavaScript cannot access cookies (HttpOnly protection)

### CORS & Origin Security
- [ ] API returns correct Access-Control-Allow-Origin header
- [ ] API only allows configured frontend origins
- [ ] Credentials (cookies) only sent to allowed origins
- [ ] OPTIONS preflight requests handled correctly

### Registration Lockdown
- [ ] Registration endpoint returns 403 when disabled
- [ ] ENABLE_REGISTRATION environment variable is false

### WAF & Edge Security (if applicable)
- [ ] Frontend accessible from non-owner IPs (after detachment)
- [ ] WAF rate limiting active (if configured)
- [ ] No static IP gating blocking legitimate users

### Session Management
- [ ] Logout clears cookies
- [ ] Token refresh works correctly
- [ ] Expired tokens rejected
- [ ] Invalid tokens rejected

---

## 4. Expected Results Matrix

| Scenario | Email | Password | Expected Status | Expected Behavior |
|----------|-------|----------|----------------|-------------------|
| Valid allowlisted user | In allowlist | Correct | 200 OK | Login succeeds, cookies set |
| Valid non-allowlisted user | NOT in allowlist | Correct | 403 Forbidden | Auth succeeds, access denied |
| Invalid password (allowlisted) | In allowlist | Wrong | 401 Unauthorized | Auth fails, no session |
| Invalid password (non-allowlisted) | NOT in allowlist | Wrong | 401 Unauthorized | Auth fails before allowlist check |
| User does not exist | Any | Any | 401 Unauthorized | User not found |
| Empty allowlist | Any | Correct | 200 OK | All users allowed |

---

## 5. Troubleshooting

### Issue: Allowlisted User Blocked (403)

**Possible Causes:**
1. Email not in `ALLOWED_USER_EMAILS` environment variable
2. Typo in email address (case-sensitive)
3. Whitespace in allowlist configuration

**Debugging:**
```powershell
# Check Lambda environment variable
aws lambda get-function-configuration \
  --function-name pv-api-prod-login \
  --query 'Environment.Variables.ALLOWED_USER_EMAILS'

# Expected: "owner@example.com,friend@example.com"

# Check CloudWatch logs
aws logs tail /aws/lambda/pv-api-prod-login --follow

# Look for: "Login blocked: Email X not in allowlist"
```

**Solution:**
```powershell
# Update environment variable
aws lambda update-function-configuration \
  --function-name pv-api-prod-login \
  --environment Variables="{ALLOWED_USER_EMAILS=owner@example.com,friend@example.com}"
```

---

### Issue: Non-Allowlisted User Can Log In

**Possible Causes:**
1. `ALLOWED_USER_EMAILS` is empty (allows all users)
2. Email allowlist not enforced (code issue)

**Debugging:**
```powershell
# Verify environment variable is set
aws lambda get-function-configuration \
  --function-name pv-api-prod-login \
  --query 'Environment.Variables.ALLOWED_USER_EMAILS'

# If empty or null, that's the issue
```

**Solution:**
Set `ALLOWED_USER_EMAILS` in `serverless/serverless.yml` and redeploy.

---

### Issue: Dev Bypass Button Visible in Production

**Possible Causes:**
1. `VITE_ENABLE_DEV_BYPASS=true` in production build
2. Build guard did not run
3. Wrong build deployed

**Debugging:**
```powershell
# Check production build
Invoke-RestMethod -Uri "https://dkmxy676d3vgc.cloudfront.net/assets/index-*.js" -Method Get

# If found, dev bypass was enabled during build
```

**Solution:**
```powershell
# Rebuild with correct environment
VITE_ENABLE_DEV_BYPASS=false npm run build

# Redeploy
aws s3 sync dist/ s3://valine-frontend-prod/ --delete
aws cloudfront create-invalidation --distribution-id dkmxy676d3vgc --paths "/*"
```

---

### Issue: Cookies Not Set After Login

**Possible Causes:**
1. CORS issue (wrong origin)
2. Backend not returning Set-Cookie headers
3. Browser blocking cookies (SameSite/Secure mismatch)

**Debugging:**
```powershell
# Check response headers
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"owner@example.com","password":"<password>"}' -ContentType 'application/json'
```

**Solution:**
- Verify `multiValueHeaders` in Lambda response includes Set-Cookie
- Check CORS configuration allows credentials
- Ensure frontend requests include `credentials: 'include'`

---

### Issue: CORS Errors in Browser

**Possible Causes:**
1. API not configured to allow frontend origin
2. Missing `Access-Control-Allow-Credentials` header

**Debugging:**
```powershell
# Test OPTIONS preflight
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Get -Headers @{
    "Origin" = "https://dkmxy676d3vgc.cloudfront.net"
    "Access-Control-Request-Method" = "POST"
}
```

**Solution:**
Update `FRONTEND_URL` in `serverless/serverless.yml` to match actual origin.

---

## Related Runbooks

- [Production Deployment & Routing](./prod-deploy-and-routing.md) - Comprehensive production operations
- [Frontend Deployment](./frontend-deployment.md) - Frontend-specific deployment
- [Add User](./add-user.md) - User access management

---

## Change Log

| Date | Change | Operator |
|------|--------|----------|
| 2025-11-13 | Initial verification runbook created | Documentation Agent |

---

**Document Version**: 1.0  
**Next Review**: 2025-12-13
