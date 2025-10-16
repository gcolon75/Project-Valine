# Phase 5 Rollout Plan

This document outlines the staged rollout plan for Phase 5 observability, alerting, and testing features.

## Overview

Phase 5 introduces:
- Structured JSON logging with trace IDs
- `/debug-last` command for debugging
- Discord alerting for critical failures
- CI bot-smoke tests
- AWS X-Ray tracing
- Comprehensive test coverage (207 tests)

## Feature Flags

All Phase 5 features are controlled by environment variables:

| Feature | Environment Variable | Dev Default | Prod Default | Description |
|---------|---------------------|-------------|--------------|-------------|
| JSON Logging | `ENABLE_JSON_LOGGING` | `true` | `true` | Structured JSON logs |
| /debug-last | `ENABLE_DEBUG_CMD` | `true` | `false` | Debug trace retrieval |
| Alerts | `ENABLE_ALERTS` | `false` | `false` | Discord critical alerts |
| X-Ray Tracing | `Tracing: Active` | `Active` | `Active` | AWS X-Ray distributed tracing |

## Rollout Stages

### Stage 0: Pre-Deployment (✅ Complete)

**Goals:**
- ✅ All code complete and tested
- ✅ 207 tests passing
- ✅ Documentation complete (README, TESTING_GUIDE, RUNBOOK)
- ✅ CI bot-smoke workflow configured

**Validation:**
- Run full test suite: `pytest tests/ -v`
- Run linter: `flake8 app tests/`
- Verify documentation is up to date

### Stage 1: Development Environment (Week 1)

**Deployment:**
```bash
cd orchestrator

# Deploy to dev with Phase 5 features enabled
sam build
sam deploy --config-env dev --parameter-overrides \
  "Stage=dev" \
  "ENABLE_JSON_LOGGING=true" \
  "ENABLE_DEBUG_CMD=true" \
  "ENABLE_ALERTS=false"
```

**Environment Variables (Dev):**
- `ENABLE_JSON_LOGGING=true`
- `ENABLE_DEBUG_CMD=true`
- `ENABLE_ALERTS=false` (will enable after testing)

**Testing Checklist:**
- [ ] Deploy to dev Lambda
- [ ] Verify JSON logs in CloudWatch
- [ ] Test `/debug-last` command in dev Discord channel
- [ ] Verify trace IDs appear in logs
- [ ] Test trace store LRU eviction (create 100+ traces)
- [ ] Verify secret redaction works
- [ ] Check X-Ray traces in AWS Console
- [ ] Run bot-smoke CI on PR

**Success Criteria:**
- All commands working normally
- JSON logs are parseable and contain trace IDs
- `/debug-last` returns accurate traces
- No secrets in logs
- X-Ray traces show proper segmentation

**Duration:** 3-5 days

**Rollback Plan:**
If issues occur:
```bash
git checkout <previous-stable-commit>
sam build
sam deploy --config-env dev
```

### Stage 2: Alert Testing (Week 2)

**Deployment:**
Enable alerts in dev:
```bash
sam deploy --config-env dev --parameter-overrides \
  "ENABLE_ALERTS=true" \
  "DISCORD_ALERT_CHANNEL_ID=${DEV_ALERT_CHANNEL}"
```

**Environment Variables (Dev):**
- `ENABLE_ALERTS=true`
- `DISCORD_ALERT_CHANNEL_ID=<dev-ops-channel>`

**Testing Checklist:**
- [ ] Configure dev ops channel for alerts
- [ ] Trigger test failure to verify alert format
- [ ] Verify alert deduplication (trigger same error twice within 5 minutes)
- [ ] Test critical failure alerts
- [ ] Test dispatch failure alerts
- [ ] Test verification failure alerts
- [ ] Verify alert rate limiting works
- [ ] Check alert messages have proper links and trace IDs

**Success Criteria:**
- Alerts appear in Discord with correct formatting
- Deduplication prevents alert spam
- All alert types work correctly
- Trace IDs are clickable and useful

**Duration:** 2-3 days

**Rollback Plan:**
Set `ENABLE_ALERTS=false` if alerts are too noisy or broken.

### Stage 3: Staging/Preview (Week 3)

**Deployment:**
Deploy to staging environment (if available) or continue testing in dev:
```bash
sam deploy --config-env staging --parameter-overrides \
  "Stage=staging" \
  "ENABLE_JSON_LOGGING=true" \
  "ENABLE_DEBUG_CMD=true" \
  "ENABLE_ALERTS=true"
```

**Allowlist Setup:**
Configure allowlist for early access users:
- Add trusted users to test channel
- Document feedback process
- Set up monitoring dashboard

**Testing Checklist:**
- [ ] Deploy to staging environment
- [ ] Invite 3-5 trusted users for testing
- [ ] Collect feedback on `/debug-last` usability
- [ ] Monitor alert volume and quality
- [ ] Check CloudWatch Logs Insights queries work
- [ ] Verify X-Ray traces are useful for debugging
- [ ] Test error scenarios and verify logs are helpful
- [ ] Performance testing (response time <5s)

**Success Criteria:**
- Positive user feedback
- No performance degradation
- Alerts are actionable
- Logs help with debugging

**Duration:** 1 week

**Rollback Plan:**
If critical issues found, disable problematic features via environment variables.

### Stage 4: Production Pilot (Week 4)

**Deployment:**
Deploy to production with `/debug-last` disabled for general users:
```bash
sam deploy --config-env prod --parameter-overrides \
  "Stage=prod" \
  "ENABLE_JSON_LOGGING=true" \
  "ENABLE_DEBUG_CMD=false" \
  "ENABLE_ALERTS=false"
```

**Environment Variables (Prod):**
- `ENABLE_JSON_LOGGING=true` ✅
- `ENABLE_DEBUG_CMD=false` (keep disabled initially)
- `ENABLE_ALERTS=false` (keep disabled initially)

**Monitoring:**
- Set up CloudWatch alarms:
  - Lambda errors > 5%
  - Lambda duration > 30 seconds
  - Invocation count > 1000/hour (anomaly detection)
- Create CloudWatch Dashboard with key metrics
- Schedule daily review of error logs

**Testing Checklist:**
- [ ] Deploy to production Lambda
- [ ] Verify JSON logs in production CloudWatch
- [ ] Monitor error rates for 48 hours
- [ ] Check Lambda performance metrics
- [ ] Verify no secrets in logs
- [ ] Test trace ID correlation across services
- [ ] Confirm X-Ray traces are useful

**Success Criteria:**
- Error rate <1%
- No performance degradation
- No security issues (secrets exposed)
- Logs are helpful for debugging production issues

**Duration:** 48 hours monitoring

**Rollback Plan:**
If error rate exceeds 5% or critical issues found:
```bash
git checkout <previous-stable-commit>
sam build
sam deploy --config-env prod
```

### Stage 5: Full Production Rollout (Week 5)

**Deployment:**
Enable all Phase 5 features in production:
```bash
sam deploy --config-env prod --parameter-overrides \
  "Stage=prod" \
  "ENABLE_JSON_LOGGING=true" \
  "ENABLE_DEBUG_CMD=false" \
  "ENABLE_ALERTS=true" \
  "DISCORD_ALERT_CHANNEL_ID=${PROD_OPS_CHANNEL}"
```

**Environment Variables (Prod):**
- `ENABLE_JSON_LOGGING=true` ✅
- `ENABLE_DEBUG_CMD=false` (keep disabled in prod for privacy)
- `ENABLE_ALERTS=true` ✅
- `DISCORD_ALERT_CHANNEL_ID=<prod-ops-channel>`

**Post-Deployment:**
- [ ] Monitor alerts for 24 hours
- [ ] Verify alert volume is reasonable (<10 per day expected)
- [ ] Adjust alert thresholds if needed
- [ ] Update team on new debugging tools
- [ ] Share CloudWatch Logs Insights queries
- [ ] Schedule training on `/debug-last` (if enabled later)

**Success Criteria:**
- All features working in production
- Alert volume is manageable
- Team is trained on new tools
- Documentation is accurate and helpful

**Duration:** Ongoing monitoring

## Rollback Strategy

### Immediate Rollback (Critical Issues)

If critical issues occur (bot down, excessive costs, security breach):

1. **Disable problematic feature:**
   ```bash
   sam deploy --config-env prod --parameter-overrides \
     "ENABLE_ALERTS=false"  # or other problematic feature
   ```

2. **Or full rollback:**
   ```bash
   git checkout <last-known-good-commit>
   sam build
   sam deploy --config-env prod
   ```

3. **Communicate:**
   - Post incident update to team channel
   - Create GitHub Issue tracking the problem
   - Document what went wrong

### Partial Rollback (Non-Critical Issues)

If non-critical issues occur (noisy alerts, minor bugs):

1. **Adjust feature flags** to disable specific features
2. **Fix issues** in development
3. **Redeploy** with fixes

## Monitoring Dashboards

### CloudWatch Dashboard Widgets

Create a CloudWatch Dashboard with:

1. **Lambda Invocations** (line graph, 1 hour)
2. **Lambda Errors** (line graph, 1 hour)
3. **Lambda Duration** (line graph, 1 hour)
4. **Error Rate** (gauge, last 5 minutes)
5. **Recent Errors** (Logs Insights query)

### Saved Logs Insights Queries

Save these queries in CloudWatch:

**Errors in last hour:**
```
fields @timestamp, level, message, trace_id, user_id, command
| filter level = "ERROR"
| sort @timestamp desc
| limit 100
```

**Command performance:**
```
fields command, duration_ms
| filter command != ""
| stats avg(duration_ms) as avg_duration, max(duration_ms) as max_duration, count() as executions by command
```

**Trace lookup:**
```
fields @timestamp, function, message, fields
| filter trace_id = "<trace-id>"
| sort @timestamp asc
```

## Success Metrics

Track these metrics to measure Phase 5 success:

| Metric | Baseline | Target | How to Measure |
|--------|----------|--------|----------------|
| Mean Time to Detect (MTTD) | 30 min | 5 min | Time from error to alert/detection |
| Mean Time to Resolve (MTTR) | 2 hours | 30 min | Time from detection to resolution |
| Test Coverage | 80% | 85% | `pytest --cov` |
| Error Rate | 2% | <1% | CloudWatch metrics |
| Alert Accuracy | N/A | >90% | % of alerts that are actionable |

## Post-Rollout Review

After 2 weeks of full production:

- [ ] Review metrics against targets
- [ ] Collect feedback from team
- [ ] Identify improvements needed
- [ ] Update documentation based on learnings
- [ ] Plan Phase 6 enhancements

## Communication Plan

### Pre-Rollout
- Notify team 1 week before Stage 4 (production pilot)
- Share documentation links
- Schedule training session (optional)

### During Rollout
- Daily standup updates during production stages
- Slack/Discord updates on deployment status
- Immediate notification of any issues

### Post-Rollout
- Summary email with metrics and learnings
- Documentation update announcement
- Feedback survey for team

## Support Resources

- **Runbook**: [RUNBOOK.md](RUNBOOK.md)
- **Testing Guide**: [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **README**: [README.md](README.md)
- **GitHub Issues**: https://github.com/gcolon75/Project-Valine/issues
- **CloudWatch Console**: https://console.aws.amazon.com/cloudwatch/
- **X-Ray Console**: https://console.aws.amazon.com/xray/
