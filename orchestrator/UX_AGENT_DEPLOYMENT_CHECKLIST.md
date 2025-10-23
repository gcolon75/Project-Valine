# UX Agent Deployment Checklist

This checklist ensures a smooth deployment of the UX Agent to staging and production environments.

## Pre-Deployment Checklist

### ✅ Code Quality
- [x] All unit tests passing (19/19)
- [x] Code syntax validated
- [x] No security vulnerabilities
- [x] No hardcoded secrets
- [x] Documentation complete
- [x] Demo script working

### ✅ Security Review
- [x] Input validation implemented
- [x] No SQL injection vectors
- [x] No XSS vulnerabilities
- [x] No shell command injection
- [x] No eval/exec usage
- [x] Secrets use environment variables
- [x] Draft PRs only (no auto-merge)

### ✅ Documentation
- [x] README created
- [x] Quickstart guide created
- [x] Implementation summary created
- [x] Code comments added
- [x] API documentation complete

---

## Staging Deployment

### Step 1: Prepare Environment
```bash
[ ] Clone repository
[ ] Checkout branch: copilot/update-ui-ux-elements
[ ] Install dependencies: pip install -r orchestrator/requirements.txt
[ ] Verify Python version (3.9+)
```

### Step 2: Configure Discord (Staging)
```bash
[ ] Get Discord Application ID
[ ] Get Discord Bot Token (staging)
[ ] Get Discord Guild ID (staging server)
[ ] Set environment variables:
    export DISCORD_APPLICATION_ID="..."
    export DISCORD_BOT_TOKEN="..."
    export DISCORD_GUILD_ID="..."
```

### Step 3: Register Command (Staging)
```bash
[ ] cd orchestrator
[ ] python register_ux_command.py
[ ] Verify success message
[ ] Wait 60 seconds for Discord propagation
```

### Step 4: Deploy Lambda (Staging)
```bash
[ ] cd orchestrator
[ ] sam build
[ ] sam deploy --config-env staging
[ ] Verify deployment success
[ ] Check CloudWatch logs
```

### Step 5: Test in Discord (Staging)
```bash
[ ] Open Discord staging server
[ ] Type / in any channel
[ ] Verify /ux-update appears in autocomplete
[ ] Test: /ux-update section:header text:"Test"
[ ] Verify Discord response received
[ ] Check CloudWatch logs for any errors
[ ] Verify GitHub PR not actually created (mock mode)
```

### Step 6: Staging Validation
Test each supported section:
```bash
[ ] Test header text update
[ ] Test footer color update
[ ] Test navbar brand update
[ ] Test home hero-text update
[ ] Test invalid section (expect error)
[ ] Test invalid property (expect error)
[ ] Test invalid color format (expect error)
[ ] Test missing parameters (expect error)
```

### Step 7: Review Results
```bash
[ ] All success cases work
[ ] All error cases show helpful messages
[ ] CloudWatch logs clean
[ ] No unexpected errors
[ ] Response times acceptable (<3s)
```

---

## Production Deployment

**⚠️ Only proceed after successful staging validation**

### Step 1: Production Preparation
```bash
[ ] Staging tests all passed
[ ] Team approval obtained
[ ] Deployment window scheduled
[ ] Rollback plan prepared
```

### Step 2: Configure Discord (Production)
```bash
[ ] Get Discord Application ID (production)
[ ] Get Discord Bot Token (production)
[ ] Get Discord Guild ID (production server)
[ ] Set environment variables (production)
```

### Step 3: Register Command (Production)
```bash
[ ] cd orchestrator
[ ] python register_ux_command.py
[ ] Verify success message
[ ] Wait 60 seconds for Discord propagation
```

### Step 4: Deploy Lambda (Production)
```bash
[ ] cd orchestrator
[ ] sam build
[ ] sam deploy --config-env production
[ ] Verify deployment success
[ ] Monitor CloudWatch logs
```

### Step 5: Test in Production
```bash
[ ] Open Discord production server
[ ] Type / to verify /ux-update appears
[ ] Test with safe command: /ux-update section:header text:"Test"
[ ] Verify response received
[ ] Check PR creation works (if enabled)
[ ] Monitor for 15 minutes
```

### Step 6: Enable for Users
```bash
[ ] Announce feature in Discord
[ ] Post usage examples
[ ] Monitor initial usage
[ ] Be available for questions
```

### Step 7: Post-Deployment Monitoring
```bash
[ ] Monitor CloudWatch logs (first hour)
[ ] Check for error patterns
[ ] Review first few PRs created
[ ] Gather user feedback
[ ] Document any issues
```

---

## Rollback Plan

If issues occur, follow this rollback procedure:

### Immediate Rollback
```bash
[ ] Stop new command registrations
[ ] Revert Lambda deployment:
    sam deploy --config-env <previous-version>
[ ] Remove /ux-update command from Discord:
    # Use Discord API to delete command
[ ] Notify users of rollback
[ ] Document issues encountered
```

### Investigation
```bash
[ ] Review CloudWatch logs
[ ] Identify root cause
[ ] Create bug report
[ ] Fix issues in code
[ ] Re-test in staging
[ ] Re-deploy when ready
```

---

## Monitoring & Maintenance

### Daily Checks (First Week)
```bash
[ ] Check CloudWatch logs for errors
[ ] Review PRs created by UX Agent
[ ] Monitor user feedback
[ ] Track command usage frequency
[ ] Note any patterns or issues
```

### Weekly Checks (After First Week)
```bash
[ ] Review command usage metrics
[ ] Analyze most requested updates
[ ] Check for any edge cases
[ ] Review user feedback
[ ] Plan improvements
```

### Monthly Checks
```bash
[ ] Review all PRs created
[ ] Analyze usage patterns
[ ] Gather user satisfaction data
[ ] Plan feature enhancements
[ ] Update documentation as needed
```

---

## Troubleshooting Guide

### Issue: Command not appearing in Discord
**Solution:**
1. Wait 60 seconds after registration
2. Refresh Discord (Ctrl+R / Cmd+R)
3. Verify bot has `applications.commands` scope
4. Check command registration output

### Issue: Discord response timeout
**Solution:**
1. Check CloudWatch logs for errors
2. Verify Lambda has sufficient timeout (>3s)
3. Check network connectivity
4. Verify Discord API token is valid

### Issue: PR creation fails
**Solution:**
1. Check GitHub token permissions
2. Verify repository access
3. Check branch naming conflicts
4. Review CloudWatch logs for details

### Issue: Unexpected errors in logs
**Solution:**
1. Review full error stack trace
2. Check input validation
3. Verify section/property mappings
4. Test locally with demo script

---

## Success Metrics

Track these metrics after deployment:

### Usage Metrics
- [ ] Total commands executed
- [ ] Commands per day/week
- [ ] Most used sections
- [ ] Most used properties
- [ ] Error rate
- [ ] Success rate

### Performance Metrics
- [ ] Average response time
- [ ] Lambda execution time
- [ ] PR creation time
- [ ] Error response time

### Quality Metrics
- [ ] User satisfaction score
- [ ] PRs merged vs rejected
- [ ] Bugs reported
- [ ] Feature requests
- [ ] Documentation clarity

---

## Contact Information

**For Issues:**
- CloudWatch Logs: `aws logs tail /aws/lambda/discord-handler --follow`
- GitHub Issues: https://github.com/gcolon75/Project-Valine/issues
- Team Slack: #project-valine

**Documentation:**
- Quick Start: `UX_AGENT_QUICKSTART.md`
- Full Docs: `UX_AGENT_README.md`
- Summary: `UX_AGENT_IMPLEMENTATION_SUMMARY.md`

---

## Sign-Off

### Staging Deployment
- [ ] Deployed by: _________________
- [ ] Date: _________________
- [ ] All tests passed: Yes / No
- [ ] Issues found: _________________

### Production Deployment
- [ ] Deployed by: _________________
- [ ] Date: _________________
- [ ] All tests passed: Yes / No
- [ ] Team approval: Yes / No
- [ ] Monitoring active: Yes / No

---

**Last Updated**: October 23, 2025  
**Version**: 1.0.0  
**Status**: Ready for Deployment
