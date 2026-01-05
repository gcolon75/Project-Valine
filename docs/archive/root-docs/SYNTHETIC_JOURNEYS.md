> **ARCHIVED:** 2026-01-05
> **Reason:** Consolidated into canonical documentation
> **See:** [Documentation Index](../README.md) for current docs

---
# Synthetic Journeys

Synthetic journeys are automated end-to-end tests that simulate real user workflows through the application. They help validate that critical user paths are working correctly in deployed environments.

## Overview

A synthetic journey consists of multiple steps that mimic real user actions:

1. **Register** - Create a new user account
2. **Verify** - Verify email address
3. **Login** - Authenticate the user
4. **Create Profile** - Set up user profile
5. **Upload Media** - Test media upload functionality
6. **Search** - Verify search functionality
7. **Export Data** - Test data export
8. **Logout** - End the session

## Modes

### Simulated Mode
- Uses mock responses
- Fast execution
- No external dependencies
- Useful for testing the journey framework itself

### Real Mode
- Makes actual HTTP requests to the API
- Creates real test data
- Tests the entire stack end-to-end
- Requires a running API server

## Usage

### Command Line

```powershell
# Run simulated journey
Invoke-RestMethod -Uri "http://localhost:3000/internal/journey/run" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"mode": "simulated"}' -ContentType 'application/json'
```

### Using the Test Script

```powershell
# Run the comprehensive test suite
& .\scripts\test-observability-v2.ps1

# Test against a different API
$env:API_URL = "https://staging.example.com"
& .\scripts\test-observability-v2.ps1
```

### Programmatically

```javascript
// Using fetch
const response = await fetch('http://localhost:3000/internal/journey/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'real',
    scenarios: ['register', 'verify', 'login']
  })
});

const result = await response.json();
console.log('Journey status:', result.journey.status);
console.log('Success rate:', result.journey.summary.successRate + '%');
```

## Configuration

### Environment Variables

```powershell
# Enable synthetic journeys
SYNTHETIC_JOURNEY_ENABLED=true

# Use real HTTP requests (default: true)
SYNTHETIC_USE_REAL_REQUESTS=true

# API base URL for real journeys
API_BASE_URL=http://localhost:3000
```

### serverless.yml

The synthetic journey endpoint is configured as:

```yaml
runSyntheticJourney:
  handler: src/handlers/syntheticJourney.runSyntheticJourney
  events:
    - httpApi:
        path: /internal/journey/run
        method: post
```

## Response Format

```json
{
  "journey": {
    "status": "passed",
    "mode": "real",
    "totalDuration": 2345,
    "steps": [
      {
        "step": "register",
        "status": "passed",
        "duration": 456,
        "result": {
          "email": "synthetic-1699999999@valine-test.local",
          "username": "synthetic1699999999",
          "userId": "123"
        }
      },
      {
        "step": "login",
        "status": "passed",
        "duration": 234,
        "result": {
          "loggedIn": true,
          "userId": "123",
          "accessToken": "..."
        }
      }
    ],
    "summary": {
      "total": 2,
      "passed": 2,
      "failed": 0,
      "successRate": 100
    }
  },
  "metadata": {
    "timestamp": "2025-11-11T23:44:00.000Z",
    "apiBaseUrl": "http://localhost:3000",
    "mode": "real"
  }
}
```

## Journey Steps Detail

### 1. Register
Creates a new test user account with:
- Unique email: `synthetic-{timestamp}@valine-test.local`
- Unique username: `synthetic{timestamp}`
- Random password
- Default display name

**Passes context:**
- `email`
- `username`
- `password`
- `userId`
- `verificationToken`

### 2. Verify
Verifies the email address using the token from registration.

**Requires context:**
- `verificationToken`

**Passes context:**
- `verified: true`

### 3. Login
Authenticates the user with credentials from registration.

**Requires context:**
- `email`
- `password`

**Passes context:**
- `loggedIn: true`
- `userId`
- `accessToken`
- `refreshToken`

### 4. Create Profile
Creates a user profile with test data.

**Requires context:**
- `accessToken`

**Passes context:**
- `profileId`

### 5. Upload Media
Tests media upload by requesting a presigned URL.

**Requires context:**
- `accessToken`

**Passes context:**
- `mediaId`
- `presignedUrl`

### 6. Search Self
Searches for the created user to verify search functionality.

**Requires context:**
- `username`

**Passes context:**
- `found`
- `resultsCount`

### 7. Export Data
Requests a data export for the user.

**Requires context:**
- `accessToken`

**Passes context:**
- `exportRequested`
- `exportId`

### 8. Logout
Logs out the user session.

**Requires context:**
- `accessToken`

**Passes context:**
- `loggedOut: true`

## Monitoring

### Integration with Observability v2

Journey results are automatically tracked in the observability system:

```javascript
// Check journey metrics
const response = await fetch(
  'http://localhost:3000/internal/observability/metrics?type=journey'
);
const data = await response.json();
console.log('Journey metrics:', data.metrics);
```

### Scheduled Runs

Set up a cron job or GitHub Actions workflow to run journeys regularly:

```yaml
# .github/workflows/synthetic-journey.yml
name: Synthetic Journey Monitor
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  journey:
    runs-on: ubuntu-latest
    steps:
      - name: Run Synthetic Journey
        run: |
          $response = Invoke-RestMethod -Uri "${{ secrets.API_URL }}/internal/journey/run" -Method Post -Headers @{
              "Content-Type" = "application/json"
          } -Body '{"mode": "real"}' -ContentType 'application/json'
          
          $response | ConvertTo-Json
          
          if ($response.journey.status -ne "passed") {
              Write-Error "Journey failed!"
              exit 1
          }
```

## Troubleshooting

### Journey Fails Immediately

- Check `SYNTHETIC_JOURNEY_ENABLED=true`
- Verify API_BASE_URL is correct
- Ensure the API server is running

### Individual Steps Fail

- Check the error message in the step result
- Verify the API endpoint is working
- Check that previous steps passed (steps depend on each other)
- Review the step's required context

### Real Mode Not Working

- Ensure `SYNTHETIC_USE_REAL_REQUESTS=true`
- Verify API_BASE_URL points to a running API
- Check network connectivity
- Review API logs for errors

### Simulated Mode Issues

- Simulated mode should always pass
- If it fails, check the journey handler code
- Verify JSON parsing is working

## Best Practices

1. **Run simulated journeys in CI/CD** to verify the journey framework
2. **Run real journeys against staging** before production deployments
3. **Monitor journey success rates** over time
4. **Set up alerts** for journey failures
5. **Clean up test data** periodically (synthetic-* users)
6. **Use unique test domains** (e.g., @valine-test.local)
7. **Don't run real journeys too frequently** to avoid rate limits
8. **Review failed journeys** promptly

## Security Considerations

- Journey endpoint is under `/internal/*` - should not be publicly accessible
- Test users have predictable patterns - not suitable for production use
- Consider IP allowlisting for journey endpoint
- Don't include sensitive data in journey responses
- Regularly clean up synthetic test accounts

## Future Enhancements

- [ ] Parameterized journeys (custom test data)
- [ ] Journey chaining (multiple journeys in sequence)
- [ ] Journey branching (conditional steps)
- [ ] Performance benchmarking per step
- [ ] Screenshot capture for failed steps
- [ ] Journey replay from saved state
- [ ] Custom journey templates
- [ ] Journey scheduling via API
- [ ] Journey result history
- [ ] Alerting integration

## See Also

- [Observability v2 Documentation](../docs/OBSERVABILITY_V2.md)
- [API Documentation](../serverless/API_DOCUMENTATION.md)
- [Testing Guide](../tests/README.md)
