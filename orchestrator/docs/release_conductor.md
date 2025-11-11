# Release Conductor MVP

The Release Conductor provides orchestrated deployments with automated verification and interactive promote/rollback controls.

## Overview

The `/ship` command initiates a deployment workflow with:

1. **Automated deployment** via GitHub Actions
2. **Verification checks** for critical endpoints
3. **Interactive controls** to promote or rollback
4. **State tracking** for deployment history

## Usage

### Basic Deployment

```
/ship env:staging strategy:full
```

### Parameters

| Parameter | Required | Values | Default | Description |
|-----------|----------|--------|---------|-------------|
| `env` | No | `staging`, `prod` | `staging` | Target environment |
| `strategy` | No | `canary`, `full` | `full` | Deployment strategy |

### Deployment Strategies

**Full Deployment**
- Deploys to all instances immediately
- Fastest path to production
- Higher risk if issues exist

**Canary Deployment**
- Deploys to subset of instances first
- Monitor metrics before full rollout
- Lower risk, slower deployment

## Workflow

### 1. Initiation

When you run `/ship`, the conductor:

1. Validates parameters
2. Generates unique deploy ID
3. Stores deployment info in State Store
4. Triggers GitHub Actions workflow
5. Returns deployment status

**Example Response:**
```
🚀 Deployment Initiated

Environment: Staging
Strategy: Full
Deploy ID: ship-staging-1699747200

Status: ⏳ Running deployment workflow...

[View Run](https://github.com/.../actions/runs/123)
```

### 2. Verification

After deployment completes, verification checks run automatically:

- **Frontend Ping**: Check homepage loads
- **API Health**: Verify `/health` endpoint
- **Auth Flow**: Test login capability
- **Search Functionality**: Verify search works
- **Media Presign**: Check S3 presigned URL generation

Each check returns:
- ✅ Success: Check passed
- ⚠️ Warning: Check passed with issues
- ❌ Failure: Check failed

### 3. Decision

Based on verification results, the conductor posts an interactive embed:

```
📊 Deployment Verification Results

✅ Frontend: 200 OK (45ms)
✅ API: 200 OK (32ms)
✅ Auth: Login successful
⚠️ Search: Slow response (850ms)
✅ Media: Presign working

Overall: 4/5 checks passed

[Promote] [Rollback] [Details]
```

### 4. Actions

**Promote**
- Proceeds with full rollout (for canary)
- Marks deployment as successful
- Triggers production promotion if staging

**Rollback**
- Reverts to previous version
- Marks deployment as rolled back
- Triggers rollback workflow

**Details**
- Shows detailed check results
- Displays error messages
- Provides troubleshooting links

## Verification Checks

### Frontend Checks

```python
{
  'endpoint': 'https://valine.app/',
  'expected_status': 200,
  'max_latency_ms': 500,
  'checks': [
    'Page loads',
    'Cache headers present',
    'No JavaScript errors'
  ]
}
```

### API Checks

```python
{
  'endpoint': 'https://api.valine.app/health',
  'expected_status': 200,
  'max_latency_ms': 200,
  'checks': [
    'Health check passes',
    'Database connected',
    'Redis available'
  ]
}
```

### Synthetic Checks

**Login Test:**
```
1. POST /auth/login with test credentials
2. Verify 200 OK
3. Verify JWT cookie set
4. Verify user data returned
```

**Search Test:**
```
1. GET /api/search?q=test
2. Verify 200 OK
3. Verify results returned
4. Verify <1s response time
```

**Media Test:**
```
1. POST /api/media/presign
2. Verify 200 OK
3. Verify S3 URL returned
4. Verify URL is accessible
```

## State Tracking

### Deploy State Schema

```python
{
  'deploy_id': 'ship-staging-1699747200',
  'env': 'staging',
  'strategy': 'full',
  'status': 'initiated|verified|promoted|rolled_back',
  'initiated_by': 'discord_user_id',
  'initiated_at': 1699747200,
  'workflow_run_id': 123456,
  'workflow_run_url': 'https://github.com/.../runs/123',
  'verification_results': {
    'frontend': {'status': 'pass', 'latency_ms': 45},
    'api': {'status': 'pass', 'latency_ms': 32},
    'auth': {'status': 'pass'},
    'search': {'status': 'warning', 'latency_ms': 850},
    'media': {'status': 'pass'}
  },
  'promoted_at': 1699747500,
  'promoted_by': 'discord_user_id',
  'rolled_back_at': None,
  'rolled_back_by': None
}
```

### State TTL

- **1 hour** for active deployments
- Extended to **24 hours** after completion
- Cleanup job runs daily to remove old state

## Button Interactions

### Custom ID Format

```
ship_{action}_{deploy_id}
```

Examples:
- `ship_promote_ship-staging-1699747200`
- `ship_rollback_ship-staging-1699747200`
- `ship_details_ship-staging-1699747200`

### Handling Button Clicks

1. Parse `custom_id` to extract action and deploy ID
2. Retrieve deploy state from State Store
3. Verify user has permission (optional)
4. Execute action (promote/rollback/details)
5. Update message to show result
6. Remove buttons after action

## Deployment Thresholds

### Auto-Promote Criteria

If all checks meet these criteria, conductor can auto-promote:

```python
thresholds = {
  'frontend_latency_ms': 500,
  'api_latency_ms': 200,
  'search_latency_ms': 1000,
  'min_checks_passing': 4,
  'min_pass_percentage': 80
}
```

### Auto-Rollback Criteria

If checks fail these criteria, conductor can auto-rollback:

```python
rollback_triggers = {
  'frontend_down': True,
  'api_down': True,
  'auth_broken': True,
  'critical_errors': True,
  'min_checks_passing': 3
}
```

## Configuration

### Environment Variables

```bash
# Required
FRONTEND_BASE_URL=https://valine.app
VITE_API_BASE=https://api.valine.app
GITHUB_TOKEN=ghp_xxx

# Optional
SHIP_AUTO_PROMOTE=false
SHIP_AUTO_ROLLBACK=true
SHIP_VERIFICATION_TIMEOUT_MS=30000
```

### GitHub Workflows

The conductor triggers these workflows:

**Client Deploy** (`env: staging`)
```yaml
name: Client Deploy
on:
  workflow_dispatch:
    inputs:
      environment:
        required: true
        type: choice
        options: [staging, prod]
      strategy:
        required: false
        type: choice
        options: [canary, full]
```

**Backend Deploy** (`env: prod`)
```yaml
name: Backend Deploy
on:
  workflow_dispatch:
    inputs:
      environment:
        required: true
        type: choice
        options: [staging, prod]
      strategy:
        required: false
        type: choice
        options: [canary, full]
```

## Rollback Strategies

### Blue-Green Rollback

If using blue-green deployment:

1. Switch traffic back to blue (previous version)
2. Verify traffic switch successful
3. Keep green (new version) for investigation

### Canary Rollback

If using canary deployment:

1. Remove canary instances
2. Cancel pending full rollout
3. Keep current stable version

### Full Rollback

If full deployment was made:

1. Trigger rollback workflow
2. Deploy previous version
3. Verify rollback successful

## Monitoring & Alerts

### Success Metrics

Track these metrics in CloudWatch:

- Deployment success rate
- Verification pass rate
- Average deployment time
- Rollback frequency

### Alert Conditions

Alert on these conditions:

- Deployment fails
- Verification failure rate >20%
- Rollback triggered
- Deployment duration >10 minutes

## Troubleshooting

### Deployment Stuck

**Problem**: Workflow doesn't complete

**Solutions**:
- Check GitHub Actions logs
- Verify workflow file is valid
- Check secrets are configured
- Review workflow permissions

### Verification Fails

**Problem**: All checks return errors

**Solutions**:
- Verify endpoints are accessible
- Check authentication credentials
- Review network connectivity
- Check environment URLs are correct

### Buttons Don't Work

**Problem**: Clicking promote/rollback does nothing

**Solutions**:
- Check State Store has deploy info
- Verify custom_id format is correct
- Review button handler logs
- Check TTL hasn't expired

### Promote Doesn't Roll Out

**Problem**: Promote completes but no change

**Solutions**:
- Verify promotion workflow exists
- Check workflow is triggered
- Review workflow execution logs
- Confirm environment variables

## Best Practices

### Pre-Deployment

1. **Run tests locally**: Ensure changes work
2. **Review recent deployments**: Learn from history
3. **Check status page**: Ensure system is healthy
4. **Notify team**: Let others know deployment is coming

### During Deployment

1. **Monitor logs**: Watch for errors
2. **Check metrics**: Verify latency/errors normal
3. **Be ready to rollback**: Don't wait if issues appear
4. **Communicate**: Update team on progress

### Post-Deployment

1. **Verify manually**: Test critical paths yourself
2. **Monitor for 15 minutes**: Watch for delayed issues
3. **Check error rates**: Ensure no spike in errors
4. **Document issues**: Note any problems for next time

## Future Enhancements

- **Gradual rollout**: Percentage-based canary
- **Automated rollback**: Based on metrics
- **Slack integration**: Post updates to Slack
- **Deployment history**: View past deployments
- **Performance baselines**: Compare against history
- **Custom check scripts**: Add project-specific checks

## Related Documentation

- [Architecture](architecture.md) - Modular command system
- [State Store](../services/state_store.py) - State management
- [Verification](../verification/) - Health checks
