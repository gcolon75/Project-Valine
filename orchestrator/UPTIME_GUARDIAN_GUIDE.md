# UptimeGuardian Agent - Quick Reference

## 🎯 Overview

UptimeGuardian is an AI agent in Project-Valine that monitors the Discord bot and critical services for 24/7 uptime. It detects downtime instantly, provides health checks with response times, and alerts the squad when services go offline.

## 🚀 Quick Start

### Discord Command
```
/uptime-check
```

Simply run `/uptime-check` in Discord to get an instant health report on all monitored services.

## 📊 Example Responses

### All Services Online ✅
```
✅ **All systems operational, loot secured!** 🎮

✅ **Discord Bot**: Online (85ms)
✅ **API**: Online (92ms)
✅ **Frontend**: Online (78ms)

🏆 Average ping: **85ms** | Status: **Poggers** 🔥

🔍 **Trace ID:** `a1b2c3d4...` | Checked by: username
```

### Services Down ❌
```
❌ **ALERT: Services down, squad assemble!** 🚨

✅ **Discord Bot**: Online (85ms)
❌ **API**: **OFFLINE** - Connection failed
✅ **Frontend**: Online (78ms)

⚠️ **1/3 services down**
💡 Attempted auto-recovery not implemented yet. Manual intervention required.

🔍 **Trace ID:** `a1b2c3d4...` | Checked by: username
```

### No Services Configured ⚠️
```
⚠️ **No services configured for monitoring**

Configure endpoints via environment variables:
- `DISCORD_HANDLER_URL`
- `API_BASE_URL`
- `FRONTEND_URL`

🔍 **Trace ID:** `a1b2c3d4...` | Checked by: username
```

## 🔧 Configuration

UptimeGuardian reads service URLs from environment variables:

```bash
# Discord bot Lambda endpoint
DISCORD_HANDLER_URL=https://your-lambda-url.execute-api.region.amazonaws.com/prod

# API base URL (will ping /health endpoint)
API_BASE_URL=https://api.yourproject.com

# Frontend URL
FRONTEND_URL=https://app.yourproject.com
```

### Setting in AWS Lambda

1. Go to AWS Lambda Console
2. Select your Discord handler function
3. Navigate to Configuration → Environment variables
4. Add the URLs above

### Setting in SSM Parameter Store (Alternative)

```bash
aws ssm put-parameter \
  --name "/valine/prod/DISCORD_HANDLER_URL" \
  --value "https://your-url.com" \
  --type "String"
```

## 📝 How It Works

1. **User triggers `/uptime-check`** in Discord
2. **UptimeGuardian pings all configured endpoints** using HTTP HEAD requests
3. **Measures response time** for each service
4. **Generates a formatted report** with Gen Z/gaming themed messages
5. **Returns results** to Discord (visible to everyone)

## 🎮 Features

- ✅ **Instant health checks** - Response in seconds
- 📊 **Response time tracking** - Shows ping in milliseconds
- 🎨 **Gen Z themed messages** - Fun, engaging status updates
- 🔍 **Trace IDs** - For debugging and audit trails
- ⚠️ **Smart error handling** - Distinguishes timeouts, connection errors, HTTP errors
- 🏆 **Average ping calculation** - Overall performance metric

## 🧪 Testing

Run the comprehensive test suite:

```bash
cd orchestrator
python3 -m pytest tests/test_uptime_guardian.py -v
```

All 15 tests should pass:
- Initialization tests
- Ping endpoint tests (success, timeout, connection error, 404)
- Check all services tests
- Message formatting tests
- Integration tests

## 📦 Agent Registry

UptimeGuardian is registered in `app/agents/registry.py`:

```python
AgentInfo(
    id='uptime_guardian',
    name='Uptime Guardian',
    description='Monitors Discord bot and critical services for 24/7 uptime...',
    command='/uptime-check'
)
```

## 🔗 Related Files

- **Agent:** `orchestrator/app/agents/uptime_guardian.py`
- **Handler:** `orchestrator/app/handlers/discord_handler.py` (handle_uptime_check_command)
- **Tests:** `orchestrator/tests/test_uptime_guardian.py`
- **Registry:** `orchestrator/app/agents/registry.py`

## 🚀 Deployment

### Register Discord Command

```bash
# For production
cd orchestrator
./register_discord_commands.sh

# For staging
./register_discord_commands_staging.sh
```

### Deploy Lambda

The handler is already integrated into `discord_handler.py`. Just redeploy your Lambda:

```bash
cd orchestrator
sam build
sam deploy
```

## 🎯 Future Enhancements

- 🔄 **Auto-recovery** - Automatically restart failed services
- 📈 **Uptime scoreboard** - Track uptime percentage over time
- ⏰ **Scheduled checks** - CloudWatch Events or GitHub Actions cron
- 📧 **Alert notifications** - DM admins when services go down
- 📊 **Historical data** - Store uptime metrics in DynamoDB

## 💡 Tips

1. **Test in staging first** - Use staging registration script before production
2. **Monitor CloudWatch logs** - Check `/aws/lambda/discord-handler` for errors
3. **Set appropriate timeouts** - Default is 10 seconds, adjust as needed
4. **Use trace IDs** - For debugging, cross-reference with CloudWatch logs

## 🤝 Contributing

Found a bug or want to add a feature? 
1. Create an issue in GitHub
2. Reference this guide in your PR
3. Add tests for new functionality
4. Update this guide with changes

## 📚 See Also

- [SUMMARY_AGENT_GUIDE.md](SUMMARY_AGENT_GUIDE.md) - Similar agent pattern
- [DISCORD_SLASH_CMD_AGENT.md](DISCORD_SLASH_CMD_AGENT.md) - Discord command setup
- [OPERATIONAL_READINESS_AGENT_GUIDE.md](OPERATIONAL_READINESS_AGENT_GUIDE.md) - Related monitoring

---

**Last Updated:** 2025-10-24  
**Agent Version:** 1.0  
**Status:** ✅ Production Ready
