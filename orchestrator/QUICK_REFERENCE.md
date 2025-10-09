# Quick Reference Guide - Project Valine Orchestrator

## 🚀 Quick Deploy (5 Minutes)

```bash
# 1. Setup
cd orchestrator
cp samconfig.toml.example samconfig.toml
# Edit samconfig.toml with your secrets

# 2. Deploy
./deploy.sh

# 3. Configure Discord
./register_discord_commands.sh
# Set Interactions Endpoint in Discord Developer Portal

# 4. Configure GitHub
# Add webhook with GitHubWebhookUrl from deploy output
```

## 📋 Discord Commands

| Command | Parameters | Description |
|---------|-----------|-------------|
| `/plan` | channel_id (optional) | Create a daily plan from GitHub issues with `ready` label |
| `/approve` | run_id (required) | Approve and execute a plan |
| `/status` | run_id (optional) | Check orchestrator status or specific run |
| `/ship` | run_id (required) | Finalize and ship a completed run |

## 🔧 AWS Commands

### View Logs
```bash
# Discord handler
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow

# GitHub webhook handler
aws logs tail /aws/lambda/valine-orchestrator-github-dev --follow

# Both at once (use separate terminals)
```

### DynamoDB Operations
```bash
# List all runs
aws dynamodb scan --table-name valine-orchestrator-runs-dev

# Get specific run
aws dynamodb get-item --table-name valine-orchestrator-runs-dev \
  --key '{"run_id": {"S": "YOUR-RUN-ID"}}'

# Count items
aws dynamodb describe-table --table-name valine-orchestrator-runs-dev \
  --query 'Table.ItemCount'
```

### Stack Management
```bash
# View stack outputs
aws cloudformation describe-stacks \
  --stack-name valine-orchestrator \
  --query 'Stacks[0].Outputs' \
  --output table

# List stack resources
aws cloudformation list-stack-resources \
  --stack-name valine-orchestrator

# Delete stack (careful!)
sam delete
```

## 🔐 Required Secrets

### Discord
- **Application ID**: From Discord Developer Portal > General Information
- **Bot Token**: From Discord Developer Portal > Bot
- **Public Key**: From Discord Developer Portal > General Information

### GitHub
- **Personal Access Token**: Settings > Developer settings > Personal access tokens
  - Scopes needed: `repo`, `write:discussion`, `workflow`
- **Webhook Secret**: Generate with:
  ```bash
  python3 -c "import secrets; print(secrets.token_hex(32))"
  ```

## 📊 Monitoring

### CloudWatch Insights Queries

**Find errors:**
```sql
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
```

**Count events by type:**
```sql
fields @timestamp, @message
| filter @message like /GitHub event:/
| parse @message "GitHub event: *" as event_type
| stats count() by event_type
```

**Discord command usage:**
```sql
fields @timestamp, @message
| filter @message like /command/
| parse @message "* command" as command_name
| stats count() by command_name
```

### Metrics to Watch
- Lambda invocation count
- Lambda error rate
- Lambda duration
- DynamoDB read/write capacity
- API Gateway 4xx/5xx errors

## 🐛 Common Issues

### Discord Signature Verification Fails
```bash
# Check logs
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow

# Verify public key matches Discord Developer Portal
# Redeploy if needed
```

### GitHub Webhook Fails
```bash
# Check delivery in GitHub: Settings > Webhooks > Recent Deliveries
# Verify secret matches samconfig.toml
# Check logs
aws logs tail /aws/lambda/valine-orchestrator-github-dev --follow
```

### Lambda Timeout
```bash
# Increase timeout in template.yaml
Timeout: 60  # Increase from 30 to 60 seconds

# Redeploy
sam build && sam deploy
```

### Permission Errors
```bash
# Check Lambda execution role
aws iam get-role --role-name valine-orchestrator-DiscordHandlerRole-*

# View attached policies
aws iam list-attached-role-policies --role-name valine-orchestrator-DiscordHandlerRole-*
```

## 🔄 Update Workflow

```bash
# 1. Make code changes in app/

# 2. Build and deploy
cd orchestrator
sam build
sam deploy

# 3. Verify in logs
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow

# 4. Test with Discord commands
```

## 📁 File Locations

| File | Purpose |
|------|---------|
| `template.yaml` | AWS infrastructure definition |
| `samconfig.toml` | Deployment configuration (with secrets) |
| `app/handlers/discord_handler.py` | Discord slash commands |
| `app/handlers/github_handler.py` | GitHub webhook events |
| `app/services/github.py` | GitHub API client |
| `app/services/discord.py` | Discord API client |
| `app/services/run_store.py` | DynamoDB operations |
| `app/orchestrator/graph.py` | Workflow logic |

## 🌐 Important URLs

### Discord
- Developer Portal: https://discord.com/developers/applications
- API Docs: https://discord.com/developers/docs

### GitHub
- Settings: https://github.com/gcolon75/Project-Valine/settings
- Webhooks: https://github.com/gcolon75/Project-Valine/settings/hooks
- API Docs: https://docs.github.com/en/rest

### AWS
- CloudFormation: https://console.aws.amazon.com/cloudformation
- Lambda: https://console.aws.amazon.com/lambda
- DynamoDB: https://console.aws.amazon.com/dynamodb
- CloudWatch: https://console.aws.amazon.com/cloudwatch

## 📞 Getting Help

1. **Check Logs First**: Most issues show up in CloudWatch Logs
2. **Review Documentation**:
   - README.md - Complete guide
   - INTEGRATION_GUIDE.md - Setup details
   - TESTING_GUIDE.md - Test scenarios
   - DEPLOYMENT_CHECKLIST.md - Step-by-step
3. **Verify Configuration**: Secrets, URLs, permissions
4. **Test Components**: Discord ping, GitHub webhook delivery
5. **Check Status Pages**: AWS, Discord, GitHub

## 💡 Pro Tips

- **Use separate terminals** for monitoring Discord and GitHub logs simultaneously
- **Enable Developer Mode** in Discord to easily get channel IDs
- **Test with staging first** before deploying to production
- **Document run IDs** for troubleshooting specific workflows
- **Set up CloudWatch alarms** for proactive monitoring
- **Rotate secrets regularly** for security
- **Use descriptive issue labels** for better organization
- **Keep logs retention short** (7 days) to save costs

## 🎯 Typical Workflow

1. **Team creates issues** with `ready` label in GitHub
2. **Run `/plan` in Discord** to generate daily plan
3. **Review plan in Discord thread** and discuss
4. **Run `/approve run_id:XXX`** to start execution
5. **Orchestrator processes tasks** and updates Discord
6. **Run `/status`** to check progress
7. **Run `/ship run_id:XXX`** when complete
8. **Review summary** in Discord thread

## 📈 Cost Optimization

- Use Lambda free tier (1M requests/month)
- Keep CloudWatch log retention short (7 days)
- Use DynamoDB on-demand billing for variable load
- Delete old runs from DynamoDB periodically
- Monitor with CloudWatch to catch issues early

**Estimated monthly cost: ~$5-10 for moderate usage**

## 🎓 Learning Resources

- **AWS SAM**: https://docs.aws.amazon.com/serverless-application-model/
- **Discord Bots**: https://discord.com/developers/docs/intro
- **GitHub Apps**: https://docs.github.com/en/developers/apps
- **Lambda Best Practices**: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html
- **DynamoDB Guide**: https://docs.aws.amazon.com/dynamodb/

---

**Last Updated**: 2025-10-09
**Version**: 1.0
**Status**: Production Ready ✅
