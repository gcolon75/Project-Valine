# CloudWatch Monitoring Setup Guide

**Version:** 1.0.0  
**Last Updated:** 2025-11-03  

---

## Overview

This guide covers setting up AWS CloudWatch monitoring, alarms, and dashboards for Project Valine's production infrastructure.

## Prerequisites

- AWS CLI configured with appropriate permissions
- Project Valine deployed to AWS
- Understanding of your AWS resource names and IDs

## Architecture Components to Monitor

### Frontend
- CloudFront Distribution
- S3 Bucket

### Backend
- API Gateway
- Lambda Functions
- RDS Database (if applicable)
- DynamoDB Tables (if applicable)

---

## CloudWatch Metrics

### Automatic Metrics

AWS automatically collects metrics for:
- Lambda invocations, duration, errors, throttles
- API Gateway requests, latency, errors
- CloudFront requests, cache hits, errors
- RDS CPU, connections, IOPS
- DynamoDB read/write capacity, throttles

### Custom Metrics

Add custom application metrics:

```javascript
// src/utils/cloudwatch-metrics.js
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

const client = new CloudWatchClient({ region: "us-west-2" });

export async function putMetric(metricName, value, unit = "Count") {
  // Only in production
  if (import.meta.env.MODE !== 'production') return;
  
  const params = {
    Namespace: "ProjectValine/Frontend",
    MetricData: [
      {
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date(),
        Dimensions: [
          {
            Name: "Environment",
            Value: "production",
          },
        ],
      },
    ],
  };
  
  try {
    await client.send(new PutMetricDataCommand(params));
  } catch (error) {
    console.error("Failed to put metric:", error);
  }
}

// Usage examples
export const metrics = {
  // User actions
  userLogin: () => putMetric("UserLogins", 1),
  postCreated: () => putMetric("PostsCreated", 1),
  videoViewed: () => putMetric("VideosViewed", 1),
  
  // Performance
  pageLoadTime: (duration) => putMetric("PageLoadTime", duration, "Milliseconds"),
  apiLatency: (duration) => putMetric("APILatency", duration, "Milliseconds"),
  
  // Errors
  apiError: () => putMetric("APIErrors", 1),
  jsError: () => putMetric("JavaScriptErrors", 1),
};
```

---

## CloudWatch Alarms

### Critical Alarms (Page On-Call)

#### 1. Lambda High Error Rate

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "valine-prod-lambda-high-errors" \
  --alarm-description "Lambda error rate > 5% for 5 minutes" \
  --namespace "AWS/Lambda" \
  --metric-name "Errors" \
  --dimensions Name=FunctionName,Value=valine-prod-posts \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "arn:aws:sns:us-west-2:ACCOUNT_ID:critical-alerts" \
  --treat-missing-data notBreaching
```

#### 2. API Gateway High Latency

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "valine-prod-api-high-latency" \
  --alarm-description "API p95 latency > 3 seconds" \
  --namespace "AWS/ApiGateway" \
  --metric-name "Latency" \
  --dimensions Name=ApiId,Value=abc123xyz \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 3000 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "arn:aws:sns:us-west-2:ACCOUNT_ID:critical-alerts"
```

#### 3. Database Connection Exhaustion

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "valine-prod-db-connections-high" \
  --alarm-description "Database connections > 80% of max" \
  --namespace "AWS/RDS" \
  --metric-name "DatabaseConnections" \
  --dimensions Name=DBInstanceIdentifier,Value=valine-prod \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "arn:aws:sns:us-west-2:ACCOUNT_ID:critical-alerts"
```

#### 4. Lambda Throttling

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "valine-prod-lambda-throttles" \
  --alarm-description "Lambda throttles detected" \
  --namespace "AWS/Lambda" \
  --metric-name "Throttles" \
  --dimensions Name=FunctionName,Value=valine-prod-posts \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "arn:aws:sns:us-west-2:ACCOUNT_ID:critical-alerts"
```

### Warning Alarms (Slack/Email)

#### 5. CloudFront Low Cache Hit Rate

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "valine-prod-cf-low-cache-hit" \
  --alarm-description "CloudFront cache hit rate < 80%" \
  --namespace "AWS/CloudFront" \
  --metric-name "CacheHitRate" \
  --dimensions Name=DistributionId,Value=E1234567890 \
  --statistic Average \
  --period 900 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator LessThanThreshold \
  --alarm-actions "arn:aws:sns:us-west-2:ACCOUNT_ID:warning-alerts"
```

#### 6. Lambda Cold Starts

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "valine-prod-lambda-cold-starts" \
  --alarm-description "High cold start rate" \
  --namespace "AWS/Lambda" \
  --metric-name "InitDuration" \
  --dimensions Name=FunctionName,Value=valine-prod-posts \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "arn:aws:sns:us-west-2:ACCOUNT_ID:warning-alerts"
```

---

## SNS Topics for Alerts

### Create SNS Topics

```bash
# Critical alerts (PagerDuty)
aws sns create-topic --name critical-alerts
aws sns subscribe \
  --topic-arn "arn:aws:sns:us-west-2:ACCOUNT_ID:critical-alerts" \
  --protocol email \
  --notification-endpoint oncall@projectvaline.com

# Warning alerts (Slack)
aws sns create-topic --name warning-alerts
aws sns subscribe \
  --topic-arn "arn:aws:sns:us-west-2:ACCOUNT_ID:warning-alerts" \
  --protocol email \
  --notification-endpoint devops@projectvaline.com
```

### Slack Integration

Use AWS Chatbot to forward SNS to Slack:

1. Go to AWS Chatbot console
2. Create new Slack channel configuration
3. Authorize Slack workspace
4. Select SNS topics to forward
5. Choose Slack channel (#alerts)

---

## CloudWatch Dashboards

### Create Production Dashboard

```bash
# Save this as dashboard.json
cat > dashboard.json << 'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/Lambda", "Invocations", { "stat": "Sum" } ],
          [ ".", "Errors", { "stat": "Sum" } ],
          [ ".", "Duration", { "stat": "Average" } ]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-west-2",
        "title": "Lambda Overview"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/ApiGateway", "Count", { "stat": "Sum" } ],
          [ ".", "4XXError", { "stat": "Sum" } ],
          [ ".", "5XXError", { "stat": "Sum" } ],
          [ ".", "Latency", { "stat": "Average" } ]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-west-2",
        "title": "API Gateway Metrics"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/CloudFront", "Requests", { "stat": "Sum" } ],
          [ ".", "BytesDownloaded", { "stat": "Sum" } ],
          [ ".", "4xxErrorRate", { "stat": "Average" } ],
          [ ".", "5xxErrorRate", { "stat": "Average" } ]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "CloudFront Metrics"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/RDS", "CPUUtilization", { "stat": "Average" } ],
          [ ".", "DatabaseConnections", { "stat": "Average" } ],
          [ ".", "ReadLatency", { "stat": "Average" } ],
          [ ".", "WriteLatency", { "stat": "Average" } ]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-west-2",
        "title": "Database Metrics"
      }
    }
  ]
}
EOF

# Create dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "ProjectValine-Production" \
  --dashboard-body file://dashboard.json
```

### Access Dashboard

Visit: https://console.aws.amazon.com/cloudwatch/home?region=us-west-2#dashboards:name=ProjectValine-Production

---

## CloudWatch Logs

### Lambda Logs

All Lambda functions automatically log to CloudWatch Logs:

```bash
# View logs
aws logs tail /aws/lambda/valine-prod-posts --follow

# Filter logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/valine-prod-posts \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s000)

# Create metric filter for errors
aws logs put-metric-filter \
  --log-group-name /aws/lambda/valine-prod-posts \
  --filter-name ErrorCount \
  --filter-pattern "ERROR" \
  --metric-transformations \
    metricName=ErrorCount,\
metricNamespace=ProjectValine/Lambda,\
metricValue=1,\
defaultValue=0
```

### API Gateway Logs

Enable API Gateway logging:

```bash
# Enable execution logging
aws apigatewayv2 update-stage \
  --api-id abc123 \
  --stage-name prod \
  --access-log-settings \
    DestinationArn=arn:aws:logs:us-west-2:ACCOUNT_ID:log-group:/aws/apigateway/valine-prod,\
    Format='$context.requestId $context.error.message $context.error.messageString'
```

### CloudFront Logs

Enable CloudFront access logs:

```bash
aws cloudfront update-distribution \
  --id E1234567890 \
  --distribution-config '{
    "Logging": {
      "Enabled": true,
      "IncludeCookies": false,
      "Bucket": "valine-cloudfront-logs.s3.amazonaws.com",
      "Prefix": "production/"
    }
  }'
```

---

## Log Insights Queries

### Common Queries

#### 1. Error Rate by Function

```sql
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by bin(5m)
```

#### 2. Slowest API Calls

```sql
fields @timestamp, @message, @duration
| filter @type = "REPORT"
| sort @duration desc
| limit 20
```

#### 3. Most Common Errors

```sql
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by @message
| sort count desc
| limit 10
```

#### 4. Cold Start Analysis

```sql
fields @timestamp, @initDuration
| filter @type = "REPORT"
| filter @initDuration > 0
| stats avg(@initDuration), max(@initDuration), count()
```

---

## Performance Monitoring

### Lambda Performance

```bash
# Get function performance metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=valine-prod-posts \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum \
  --unit Milliseconds
```

### API Gateway Performance

```bash
# Get API latency
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Latency \
  --dimensions Name=ApiId,Value=abc123 \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum \
  --unit Milliseconds
```

---

## Cost Optimization

### CloudWatch Costs

- **Metrics:** $0.30 per metric per month (first 10,000 free)
- **Alarms:** $0.10 per alarm per month (first 10 free)
- **Logs:** $0.50 per GB ingested, $0.03 per GB stored
- **Dashboards:** $3.00 per dashboard per month (first 3 free)

### Reduce Costs

1. **Set log retention:**
```bash
aws logs put-retention-policy \
  --log-group-name /aws/lambda/valine-prod-posts \
  --retention-in-days 14
```

2. **Use metric filters instead of custom metrics**

3. **Sample high-volume metrics**

4. **Delete unused alarms:**
```bash
aws cloudwatch delete-alarms --alarm-names old-alarm-name
```

---

## Automation Scripts

### Setup All Alarms

Create `scripts/setup-cloudwatch.sh`:

```bash
#!/bin/bash

# Configuration
REGION="us-west-2"
ACCOUNT_ID="123456789012"
CRITICAL_TOPIC="arn:aws:sns:$REGION:$ACCOUNT_ID:critical-alerts"
WARNING_TOPIC="arn:aws:sns:$REGION:$ACCOUNT_ID:warning-alerts"

# Lambda functions to monitor
FUNCTIONS=("valine-prod-posts" "valine-prod-users" "valine-prod-reels")

# Create alarms for each function
for FUNCTION in "${FUNCTIONS[@]}"; do
  # Error rate alarm
  aws cloudwatch put-metric-alarm \
    --region $REGION \
    --alarm-name "$FUNCTION-high-errors" \
    --alarm-description "High error rate for $FUNCTION" \
    --namespace "AWS/Lambda" \
    --metric-name "Errors" \
    --dimensions Name=FunctionName,Value=$FUNCTION \
    --statistic Sum \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 10 \
    --comparison-operator GreaterThanThreshold \
    --alarm-actions $CRITICAL_TOPIC
  
  # Duration alarm
  aws cloudwatch put-metric-alarm \
    --region $REGION \
    --alarm-name "$FUNCTION-high-duration" \
    --alarm-description "High duration for $FUNCTION" \
    --namespace "AWS/Lambda" \
    --metric-name "Duration" \
    --dimensions Name=FunctionName,Value=$FUNCTION \
    --statistic Average \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 5000 \
    --comparison-operator GreaterThanThreshold \
    --alarm-actions $WARNING_TOPIC
done

echo "CloudWatch alarms created successfully"
```

Make it executable:
```bash
chmod +x scripts/setup-cloudwatch.sh
./scripts/setup-cloudwatch.sh
```

---

## Monitoring Checklist

### Initial Setup
- [ ] Create SNS topics for alerts
- [ ] Configure email/Slack subscriptions
- [ ] Create CloudWatch dashboard
- [ ] Set up critical alarms
- [ ] Set up warning alarms
- [ ] Enable Lambda logging
- [ ] Enable API Gateway logging
- [ ] Enable CloudFront logging
- [ ] Set log retention policies

### Daily Tasks
- [ ] Check dashboard for anomalies
- [ ] Review new alarms
- [ ] Check error logs

### Weekly Tasks
- [ ] Review alarm history
- [ ] Analyze performance trends
- [ ] Check CloudWatch costs
- [ ] Update alarm thresholds if needed

---

## Resources

- **CloudWatch Docs:** https://docs.aws.amazon.com/cloudwatch/
- **Lambda Metrics:** https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html
- **API Gateway Metrics:** https://docs.aws.amazon.com/apigateway/latest/developerguide/monitoring-cloudwatch.html
- **CloudWatch Logs Insights:** https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-03  
**Next Review:** 2025-12-03
