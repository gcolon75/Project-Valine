# Health Snapshot

The Health Snapshot service provides proactive monitoring and reporting of system health metrics through automated daily summaries and on-demand status checks.

## Overview

Health Snapshot gathers real-time metrics about the Project Valine platform:

- **Frontend Latency**: p50, p95, and average response times for frontend endpoints
- **API Latency**: p50, p95, and average response times for API endpoints
- **Error Rates**: Success/failure rates across all monitored endpoints
- **Overall Health**: Aggregated health status (healthy/degraded/critical)

## Features

### Daily Automated Reports

A GitHub Actions workflow runs daily at **09:00 PST/PDT (16:00 UTC)** to:

1. Check all configured frontend and API endpoints
2. Calculate latency percentiles and error rates
3. Post a formatted health summary to the designated Discord channel

### On-Demand Status Check

Use the `/status-digest` Discord command to get an instant health snapshot:

```
/status-digest
```

This returns an ephemeral message (visible only to you) with current health metrics.

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_STATUS_CHANNEL_ID` | Yes | Discord channel ID where daily health snapshots are posted |
| `FRONTEND_BASE_URL` | Yes | Base URL of the frontend to monitor |
| `VITE_API_BASE` | Yes | Base URL of the API to monitor |
| `DISCORD_BOT_TOKEN` | Yes | Discord bot token for posting messages |

### Secrets Setup

Add these secrets in GitHub repository settings and AWS SAM parameters:

```bash
# GitHub Secrets (for scheduled workflow)
DISCORD_STATUS_CHANNEL_ID=<your_channel_id>
FRONTEND_BASE_URL=https://your-frontend.com
VITE_API_BASE=https://your-api.com

# AWS SAM Parameters (for Discord command)
sam deploy \
  --parameter-overrides \
  DiscordStatusChannelId=<your_channel_id> \
  FrontendBaseUrl=https://your-frontend.com \
  ViteApiBase=https://your-api.com
```

### Finding Your Discord Channel ID

1. Enable Developer Mode in Discord (User Settings → App Settings → Advanced → Developer Mode)
2. Right-click the channel where you want health reports posted
3. Click "Copy ID"
4. Use this ID as `DISCORD_STATUS_CHANNEL_ID`

## Health Metrics

### Latency Metrics

- **p50 (median)**: Half of requests complete faster than this time
- **p95**: 95% of requests complete faster than this time
- **Average**: Mean response time across all requests

### Success Rates

- **Success Rate %**: Percentage of requests that returned 2xx status codes
- **Errors**: Number of failed requests (timeouts, 4xx, 5xx errors)

### Health Status

- **🟢 Healthy**: All checks passing, no errors
- **🟡 Degraded**: Some errors detected, but majority of checks passing
- **🔴 Critical**: Majority of checks failing

## Example Health Report

```
✅ System Health Snapshot

📊 Overall Status
Health: Healthy
Success Rate: 100%
Total Checks: 8
Errors: 0

🌐 Frontend ➡️
Success Rate: 100%
Latency (p50): 45ms
Latency (p95): 120ms
Errors: 0/4

⚙️ API ➡️
Success Rate: 100%
Latency (p50): 32ms
Latency (p95): 85ms
Errors: 0/4
```

### Trend Indicators

When historical data is available, trend arrows show performance changes:

- **📈** Performance improving compared to 7-day average
- **➡️** Performance stable (within ±5% of average)
- **📉** Performance degrading compared to 7-day average

## Scheduled Workflow

The daily health snapshot runs via GitHub Actions:

**Workflow**: `.github/workflows/daily-health-snapshot.yml`

**Schedule**: Daily at 09:00 PST/PDT (16:00 UTC)

**Manual Trigger**: Available via GitHub Actions UI

### Viewing Workflow Runs

1. Go to repository → Actions tab
2. Select "Daily Health Snapshot" workflow
3. View run history and logs

## Monitored Endpoints

### Frontend Endpoints

Configured in `orchestrator/app/config/verification_config.py`:

- `/` - Home page
- `/discover` - Discovery page
- `/profile` - Profile page
- `/settings` - Settings page

### API Endpoints

- `/health` - Health check
- `/api/profiles` - Profiles API
- `/api/auth/status` - Auth status
- `/api/media/validate` - Media validation

## Troubleshooting

### Health Snapshot Not Posting

1. **Check channel ID**: Verify `DISCORD_STATUS_CHANNEL_ID` is correct
2. **Check bot permissions**: Ensure bot has "Send Messages" and "Embed Links" permissions in the channel
3. **Check workflow logs**: Review GitHub Actions run logs for errors
4. **Verify secrets**: Ensure all required secrets are set in GitHub

### `/status-digest` Command Not Working

1. **Check Discord command registration**: Run `/agents` to verify command is registered
2. **Check bot token**: Verify `DISCORD_BOT_TOKEN` is valid
3. **Check endpoint URLs**: Ensure `FRONTEND_BASE_URL` and `VITE_API_BASE` are accessible

### High Latency or Errors

If health snapshot shows degraded status:

1. **Check endpoint availability**: Manually test URLs in browser
2. **Review recent deployments**: Check if issues started after a deploy
3. **Check infrastructure**: Review AWS CloudWatch metrics
4. **Scale resources**: Consider increasing Lambda memory or API capacity

## Implementation Details

### Service Architecture

```
HealthSnapshot
  ├── gather_metrics() - Collects endpoint health data
  ├── create_status_embed() - Formats Discord embed
  └── post_to_discord() - Sends to status channel
```

### Integration Points

- **HTTPChecker**: Performs endpoint health checks with retries
- **DiscordService**: Posts formatted embeds to channels
- **Discord Handler**: Processes `/status-digest` command

### Data Collection

1. HTTP requests sent to each configured endpoint
2. Response times measured in milliseconds
3. Success/failure determined by status code (2xx = success)
4. Statistics calculated (p50, p95, average, error count)
5. Results formatted into Discord embed

## Future Enhancements

Potential improvements for Phase B+:

- **Persistent storage**: Store metrics in DynamoDB for trend analysis
- **Alerting**: Trigger alerts when error rates exceed thresholds
- **Custom thresholds**: Configure acceptable latency/error bounds
- **More endpoints**: Add database health, S3 connectivity checks
- **Historical graphs**: Generate charts showing metrics over time

## Related Documentation

- [RBAC Permissions](permissions.md) - Command access control
- [Deployment Guide](guides/deployment.md) - Orchestrator deployment
- [Troubleshooting](troubleshooting/) - Common issues and solutions
