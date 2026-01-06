# SLO Definitions - Phase 3

**Project Valine - Observability & Service Level Objectives**

**Last Updated:** 2025-11-11  
**Status:** Active  
**Owner:** Operations Team

---

## Executive Summary

This document defines Service Level Objectives (SLOs) for Project Valine, establishing measurable targets for reliability, performance, and availability.

---

## Service Level Objectives

### 1. Availability SLO

**Target:** 99.5% uptime monthly

**Measurement:**
- Monthly uptime percentage
- Calculated from health check pings
- Excludes scheduled maintenance windows

**Error Budget:** 0.5% = ~3.6 hours downtime per month

**Breach Response:**
- P0: Complete outage (immediate escalation)
- P1: Degraded service (1-hour response)

---

### 2. Latency SLO

#### Authentication Endpoints

| Endpoint | p50 Target | p95 Target | p99 Target |
|----------|------------|------------|------------|
| POST /auth/login | < 200ms | < 500ms | < 800ms |
| POST /auth/register | < 250ms | < 600ms | < 1000ms |
| GET /auth/me | < 100ms | < 300ms | < 500ms |
| POST /auth/refresh | < 150ms | < 400ms | < 700ms |

#### Profile Endpoints

| Endpoint | p50 Target | p95 Target | p99 Target |
|----------|------------|------------|------------|
| GET /profiles/{id} | < 150ms | < 400ms | < 700ms |
| PUT /profiles/{id} | < 200ms | < 500ms | < 900ms |

#### Search Endpoints

| Endpoint | p50 Target | p95 Target | p99 Target |
|----------|------------|------------|------------|
| GET /search | < 300ms | < 800ms | < 1500ms |

#### Media Endpoints

| Endpoint | p50 Target | p95 Target | p99 Target |
|----------|------------|------------|------------|
| POST /media/upload-url | < 200ms | < 500ms | < 800ms |

**Error Budget:** 5% of requests may exceed p95 target

---

### 3. Error Rate SLO

**Target:** < 1% error rate for all endpoints

**Measurement:**
- 5xx errors / total requests
- Measured per endpoint and globally
- Calculated hourly and daily

**Error Budget:** 1% = up to 10 errors per 1000 requests

**Exclusions:**
- 4xx client errors (not counted)
- Health check endpoints

---

### 4. Success Rate SLO

**Target:** > 99% success rate for critical flows

**Critical Flows:**
- User registration
- Login
- Password reset
- Profile creation
- Media upload

**Measurement:**
- Successful completions / total attempts
- End-to-end journey tracking

---

## Instrumentation Requirements

### Metrics to Collect

1. **Request Latency**
   - Start time, end time, duration
   - By endpoint, method, status code
   - Percentiles: p50, p95, p99

2. **Error Rates**
   - 5xx errors by endpoint
   - Error types and messages
   - Stack traces (redacted)

3. **Availability**
   - Health check results
   - Synthetic journey outcomes
   - External probe status

4. **Resource Utilization**
   - Lambda execution time
   - Memory usage
   - Concurrent executions

### Metrics Exporter

**Implementation:**
- CloudWatch Metrics (AWS native)
- Custom metrics namespace: `ProjectValine/API`

**Metrics Schema:**
```json
{
  "Namespace": "ProjectValine/API",
  "MetricName": "RequestLatency",
  "Dimensions": [
    {"Name": "Endpoint", "Value": "/auth/login"},
    {"Name": "Method", "Value": "POST"},
    {"Name": "StatusCode", "Value": "200"}
  ],
  "Value": 245,
  "Unit": "Milliseconds",
  "Timestamp": "2025-11-11T22:00:00Z"
}
```

---

## Alerting Rules

### Critical Alerts (P0)

1. **Availability < 99%**
   - Trigger: 3 consecutive health check failures
   - Action: Page on-call engineer

2. **Error Rate > 5%**
   - Trigger: > 5% 5xx errors in 5-minute window
   - Action: Immediate investigation

3. **p95 Latency > 2x Target**
   - Trigger: p95 exceeds 2x target for 10 minutes
   - Action: Performance investigation

### Warning Alerts (P1)

1. **Availability 99-99.5%**
   - Trigger: Approaching SLO limit
   - Action: Monitor closely

2. **Error Rate 1-5%**
   - Trigger: Elevated but not critical
   - Action: Investigate within 1 hour

3. **p95 Latency > Target**
   - Trigger: Exceeds target but < 2x
   - Action: Performance review

---

## Monitoring & Dashboards

### CloudWatch Dashboard

**Metrics to Display:**
1. Availability (last 24h, 7d, 30d)
2. Error rate by endpoint
3. Latency percentiles (p50/p95/p99)
4. Request volume
5. Lambda execution metrics

### Daily Health Digest

**Automated Report (Sent Daily):**
- Yesterday's SLO compliance
- Top 5 slowest endpoints
- Error summary
- Upcoming maintenance windows

**Format:**
```
Project Valine - Daily Health Digest
Date: 2025-11-11

✅ Availability: 99.8% (Target: 99.5%)
✅ Error Rate: 0.3% (Target: < 1%)
⚠️ Latency: p95 login 520ms (Target: 500ms)

Top Slowest Endpoints:
1. GET /search - p95: 850ms
2. POST /auth/login - p95: 520ms
3. GET /profiles/{id} - p95: 420ms

Errors:
- 12 x 500 Internal Server Error (auth handler)
- 5 x 503 Service Unavailable (rate limit)

Action Items:
- Investigate login latency spike
- Review error logs for auth handler
```

---

## Error Budget Management

### Monthly Error Budget

**Formula:**
```
Error Budget (hours) = (1 - SLO) × Total Hours in Month
                     = (1 - 0.995) × 730 hours
                     = 3.65 hours
```

**Tracking:**
- Track burn rate daily
- Alert when 50% consumed
- Freeze deployments at 80% consumed

### Burn Rate Alerts

| Budget Consumed | Action |
|-----------------|--------|
| 0-50% | Normal operations |
| 50-80% | Reduce deployment frequency |
| 80-100% | Deployment freeze, bug fixes only |
| 100%+ | Post-mortem required |

---

## Implementation Checklist

- [ ] Instrument latency metrics for key endpoints
- [ ] Deploy CloudWatch metrics exporter
- [ ] Create CloudWatch dashboard
- [ ] Configure alerting rules
- [ ] Set up daily health digest automation
- [ ] Document incident response procedures
- [ ] Test alerting thresholds
- [ ] Establish on-call rotation

---

## Rollback Plan

**To disable metrics collection:**
```powershell
# Set feature flag
$env:METRICS_ENABLED = "false"

# Redeploy
serverless deploy --stage prod
```

**To disable alerting:**
- Disable CloudWatch alarms via AWS Console
- Comment out alert configurations

---

## References

- [Observability Guide](../ops/observability.md)
- [Incident Response Playbook](../runbooks/incident-response.md)
- [CloudWatch Setup](../CLOUDWATCH_SETUP.md)
- [Google SRE Book - SLO](https://sre.google/sre-book/service-level-objectives/)

---

**Version:** 1.0  
**Next Review:** After Phase 3 implementation
