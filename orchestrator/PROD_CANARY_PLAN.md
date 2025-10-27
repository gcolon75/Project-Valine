# Production Canary Rollout Plan

## Overview

This document outlines the controlled rollout strategy for enabling the agents-as-employees workflow and Natural Language UX Agent features in production. The plan uses a canary deployment approach with progressive enablement based on monitoring metrics and feedback.

## Rollout Phases

### Phase 0: Pre-Production (Complete)

**Status**: ✅ Complete

- [x] All features tested in development environment
- [x] Smoke tests passed
- [x] Code reviewed and approved
- [x] Documentation complete
- [x] Monitoring configured

### Phase 1: Infrastructure Deployment (Week 1)

**Goal**: Deploy infrastructure and code with features disabled

**Actions**:
1. Deploy SAM stack to production with `UseLLMParsing=false`
2. Verify all Lambda functions deployed successfully
3. Confirm DynamoDB tables created
4. Test Discord webhook endpoint responds
5. Run smoke tests with basic commands

**Success Criteria**:
- Zero errors in CloudWatch logs
- All Lambda functions healthy
- Discord commands respond correctly
- No PRs created yet (dry-run only)

**Rollback Trigger**:
- Any Lambda errors
- Discord command failures
- DynamoDB connection issues

**PM Approval Required**: ✅ Yes - before deploying to production

**Commands**:
```bash
sam deploy \
  --stack-name valine-orchestrator-prod \
  --parameter-overrides \
    Stage=prod \
    UseLLMParsing=false \
    OpenAIApiKey="" \
  --capabilities CAPABILITY_IAM
```

### Phase 2: Admin-Only Canary (Week 2)

**Goal**: Enable UX update commands for admin users only

**Actions**:
1. Test `/ux-update` command with structured input
2. Verify preview generation works
3. Test confirmation flow (confirm + cancel)
4. Create 2-3 test PRs to verify PR creation
5. Monitor for 48-72 hours

**Target Users**: Admin role only (configured in code)

**Success Criteria**:
- 5+ successful UX update flows
- No errors in Lambda logs
- PRs created successfully
- Conversation state persisted correctly in DynamoDB
- Average response time < 3 seconds

**Monitoring**:
- Lambda invocation count
- Lambda error rate (target: 0%)
- Lambda duration (target: < 5s)
- DynamoDB read/write capacity
- User feedback from admins

**Rollback Trigger**:
- Error rate > 1%
- Any data corruption in DynamoDB
- Discord bot unresponsive
- Negative feedback from admins

**PM Approval Required**: ✅ Yes - after 48-72 hours of stable operation

### Phase 3: PM Users (Week 3)

**Goal**: Expand to PM role users

**Actions**:
1. Enable for PM role in addition to admin
2. Monitor for 5-7 days
3. Collect feedback from PM users
4. Track usage metrics

**Target Users**: Admin + PM roles

**Success Criteria**:
- 20+ successful UX update flows across admin + PM users
- Error rate < 0.5%
- Positive feedback from PMs
- No performance degradation

**Monitoring** (same as Phase 2, plus):
- Usage patterns by user role
- Most common sections updated
- Average time from preview to confirmation
- Cancellation rate

**Rollback Trigger**:
- Error rate > 0.5%
- Performance degradation
- Consistent negative feedback

**PM Approval Required**: ✅ Yes - after 5-7 days

### Phase 4: Developer Role (Week 4)

**Goal**: Expand to developer role users

**Actions**:
1. Enable for developer role
2. Monitor for 5-7 days
3. Track adoption metrics

**Target Users**: Admin + PM + Developer roles

**Success Criteria**:
- 50+ successful UX update flows across all roles
- Error rate < 0.3%
- Adoption rate > 20% of eligible users

**PM Approval Required**: Yes - after 5-7 days

### Phase 5: LLM Parsing Canary (Week 5) - OPTIONAL

**Goal**: Enable LLM-based natural language parsing for admin users only

**⚠️ IMPORTANT**: This phase incurs OpenAI API costs. Proceed only if LLM parsing provides significant value.

**Actions**:
1. Set `UseLLMParsing=true` in SAM deployment
2. Configure `OPENAI_API_KEY` from Secrets Manager
3. Set initial daily budget cap to $5/day
4. Enable for admin users only
5. Monitor costs closely for 24-48 hours

**Success Criteria**:
- LLM parsing works for natural language requests
- Costs stay within budget ($5/day initial)
- Parsing accuracy > 80% (based on manual review)
- No increase in error rate

**Cost Monitoring**:
```bash
# Monitor Lambda logs for cost tracking
aws logs tail /aws/lambda/valine-orchestrator-discord-prod \
  --filter-pattern "cost_usd" \
  --follow

# Check total daily spend
# Expected: ~$0.50-2.00 per day for light usage
```

**Rollback Trigger**:
- Daily costs exceed $10
- Parsing accuracy < 60%
- Error rate increases
- OpenAI API unavailable

**PM Approval Required**: ✅ **YES - MANDATORY** before enabling LLM

### Phase 6: General Availability (Week 6+)

**Goal**: Enable for all eligible users with LLM parsing as opt-in

**Actions**:
1. Enable for all authenticated users
2. Keep LLM parsing as opt-in feature
3. Continue monitoring metrics
4. Establish SLA targets

**Success Criteria**:
- 100+ weekly active users
- Error rate < 0.2%
- P95 response time < 10s
- Sustained positive feedback

**Ongoing Monitoring**: Continue tracking all metrics from previous phases

## Monitoring Dashboard

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Error Rate | < 0.2% | > 1% |
| P50 Response Time | < 2s | > 5s |
| P95 Response Time | < 5s | > 10s |
| Lambda Timeout Rate | 0% | > 0.1% |
| DynamoDB Throttles | 0 | > 5/hour |
| Daily LLM Cost (if enabled) | < $5 | > $10 |
| Conversation TTL Expiry Rate | < 5% | > 20% |

### CloudWatch Dashboards

Create a dashboard named "Valine-UX-Agent-Production" with:

1. **Lambda Metrics**:
   - Invocation count (per hour)
   - Error count and rate
   - Duration (P50, P95, P99)
   - Concurrent executions

2. **DynamoDB Metrics**:
   - Read/write capacity units
   - Throttle events
   - Item count for ux-agent-conversations table

3. **Custom Metrics** (via Lambda logs):
   - UX update request count (by role, by section)
   - Confirmation rate (confirms vs cancels)
   - LLM parsing success rate (if enabled)
   - LLM cost per request (if enabled)

4. **Alarms**:
   - High error rate (> 1%)
   - High duration (> 10s)
   - Lambda throttling
   - DynamoDB throttling
   - Daily LLM cost (> $10, if enabled)

## Rollback Procedures

### Quick Rollback: Disable Feature

```bash
# Disable LLM parsing (if that's the issue)
aws lambda update-function-configuration \
  --function-name valine-orchestrator-discord-prod \
  --environment "Variables={USE_LLM_PARSING=false,...}"

# Or disable entire UX update feature
aws lambda update-function-configuration \
  --function-name valine-orchestrator-discord-prod \
  --environment "Variables={DISABLE_UX_UPDATES=true,...}"
```

### Full Rollback: Revert to Previous Version

```bash
# Tag current version for reference
git tag -a prod-rollback-$(date +%Y%m%d) -m "Rollback point"

# Checkout previous stable version
git checkout <previous-stable-tag>

# Redeploy
sam deploy --stack-name valine-orchestrator-prod
```

### Emergency Rollback: Infrastructure Issue

```bash
# Delete current stack
aws cloudformation delete-stack --stack-name valine-orchestrator-prod

# Wait for deletion
aws cloudformation wait stack-delete-complete \
  --stack-name valine-orchestrator-prod

# Deploy previous version
git checkout <previous-stable-tag>
sam deploy --stack-name valine-orchestrator-prod
```

## Risk Assessment

### Low Risk

- **Basic UX updates with structured commands**: Well-tested, deterministic
- **Confirmation flow**: User must explicitly approve
- **Draft PR creation**: Changes are reviewable before merge
- **Feature flags**: Easy to disable without redeployment

### Medium Risk

- **DynamoDB conversation state**: New table, TTL must work correctly
- **Discord button interactions**: Relies on Discord API stability
- **GitHub PR creation**: Depends on GitHub API availability

### High Risk (Phase 5 only)

- **LLM parsing costs**: Could exceed budget if not monitored
- **LLM API availability**: External dependency on OpenAI
- **LLM parsing accuracy**: May misinterpret user intent

## Communication Plan

### Before Each Phase

- [ ] Announce phase start date in team channel
- [ ] Post monitoring dashboard link
- [ ] Remind users of feedback channels
- [ ] Document known issues (if any)

### During Each Phase

- [ ] Daily status check (brief message)
- [ ] Weekly detailed report with metrics
- [ ] Immediate notification of any incidents

### After Each Phase

- [ ] Summary report with metrics and feedback
- [ ] PM approval request for next phase
- [ ] Lessons learned documentation

## Success Metrics (Overall)

### Adoption

- **Target**: 50% of eligible users try the feature within 30 days
- **Measure**: Unique users who run `/ux-update` command

### Effectiveness

- **Target**: 80%+ of UX update requests result in draft PR
- **Measure**: Confirmation rate (confirms / total previews)

### Quality

- **Target**: < 5% of created PRs rejected due to incorrect changes
- **Measure**: Manual review of sample PRs

### Performance

- **Target**: P95 response time < 5 seconds
- **Measure**: CloudWatch Lambda duration metric

## Go/No-Go Criteria for Each Phase

### Before Phase 2 (Admin Canary)
- [ ] Phase 1 metrics all green for 48 hours
- [ ] No open P0/P1 bugs
- [ ] PM approval obtained

### Before Phase 3 (PM Users)
- [ ] Phase 2 metrics all green for 72 hours
- [ ] Positive feedback from admin users
- [ ] At least 5 successful end-to-end flows
- [ ] PM approval obtained

### Before Phase 4 (Developer Users)
- [ ] Phase 3 metrics all green for 7 days
- [ ] Error rate < 0.5%
- [ ] No performance degradation
- [ ] PM approval obtained

### Before Phase 5 (LLM Parsing) - OPTIONAL
- [ ] **PM approval obtained - MANDATORY**
- [ ] OpenAI account configured with billing alerts
- [ ] Daily budget cap implemented and tested
- [ ] Cost estimation validated in development
- [ ] Fallback to structured parsing tested
- [ ] PM awareness of ongoing costs

### Before Phase 6 (General Availability)
- [ ] All previous phases successful
- [ ] SLA targets defined
- [ ] Support documentation complete
- [ ] PM approval obtained

## Incident Response

### Severity Levels

**P0 (Critical)**: Complete outage of Discord bot or widespread errors
- **Response Time**: Immediate
- **Action**: Immediate rollback

**P1 (High)**: Feature unavailable or high error rate (> 5%)
- **Response Time**: < 1 hour
- **Action**: Investigate, rollback if needed

**P2 (Medium)**: Degraded performance or isolated errors
- **Response Time**: < 4 hours
- **Action**: Investigate, fix in next deployment

**P3 (Low)**: Minor issues or feature requests
- **Response Time**: < 24 hours
- **Action**: Log for future sprint

### Escalation Path

1. On-call engineer
2. Team lead
3. Engineering manager
4. PM (for feature enablement decisions)

## Post-Rollout Review

After Phase 6 (or after any major incident):

- [ ] Metrics review meeting
- [ ] User feedback summary
- [ ] Lessons learned document
- [ ] Process improvements identified
- [ ] Celebration of success! 🎉

## Approval Sign-Off

| Phase | PM Approval | Date | Notes |
|-------|-------------|------|-------|
| Phase 1: Infrastructure | ____________ | ______ | |
| Phase 2: Admin Canary | ____________ | ______ | |
| Phase 3: PM Users | ____________ | ______ | |
| Phase 4: Developer Users | ____________ | ______ | |
| Phase 5: LLM Parsing (OPTIONAL) | ____________ | ______ | **Mandatory approval** |
| Phase 6: General Availability | ____________ | ______ | |

---

**Document Owner**: Engineering Team
**Last Updated**: 2025-10-27
**Version**: 1.0
