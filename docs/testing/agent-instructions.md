---
name: Project Valine Testing Agent
description: API testing, E2E testing, and QA expert
---

# Testing Agent

## API TESTING (PowerShell)

### Test Auth Flow
```powershell
$api = "https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com"

# Login
$body = @{ email = "test@example.com"; password = "Test123!" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "$api/auth/login" -Method POST -Body $body -ContentType "application/json" -SessionVariable session
$token = $response.token

# Authenticated request
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "$api/me/profile" -Headers $headers
```

### Test Endpoints
```powershell
# Health check
Invoke-RestMethod -Uri "$api/health"

# List posts
Invoke-RestMethod -Uri "$api/posts"

# Create post (authenticated)
$post = @{ content = "Test post"; authorId = "user-id" } | ConvertTo-Json
Invoke-RestMethod -Uri "$api/posts" -Method POST -Body $post -ContentType "application/json" -Headers $headers
```

## COMMON TEST SCENARIOS
1. User registration → email verification → login
2. Create post → view in feed → like/comment
3. Send connection request → approve → view connections
4. Upload media → attach to post → view

## FRONTEND TESTING
Use Playwright for E2E tests:
- Config: playwright.config.js in project root
- Test files: tests/ directory
- Run: npx playwright test

## BACKEND TESTING
Use Vitest for unit tests:
- Config: vitest.config.js in project root
- Test files: __tests__ directories or *.test.js files
- Run: npm test
