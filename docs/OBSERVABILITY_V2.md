# Observability v2 and Real Synthetic Journeys

This document describes the Observability v2 features and real synthetic journeys implementation for Project Valine.

## Overview

The Observability v2 system provides:

- **Real Synthetic Journeys**: End-to-end user journey testing with actual HTTP requests
- **Metrics Collection**: Frontend and backend performance metrics
- **Health Monitoring**: System health checks and statistics
- **Error Tracking**: Automatic error capture and reporting
- **Structured Logging**: Centralized logging with context

## Components

### Backend Components

#### 1. Synthetic Journey Handler (`serverless/src/handlers/syntheticJourney.js`)

**Enhanced Features:**
- Real HTTP requests instead of simulations
- Configurable mode (real vs simulated)
- Step-by-step journey execution
- Comprehensive error reporting

**Available Journey Steps:**
1. `register` - Create a new test user account
2. `verify` - Verify email address
3. `login` - Authenticate user
4. `createProfile` - Create user profile
5. `uploadMedia` - Test media upload flow
6. `searchSelf` - Search for the created user
7. `exportData` - Request data export
8. `logout` - End user session

**Endpoint:**
```
POST /internal/journey/run
```

**Request Body:**
```json
{
  "scenarios": ["register", "login", "logout"],
  "mode": "real"  // or "simulated"
}
```

**Response:**
```json
{
  "journey": {
    "status": "passed",
    "mode": "real",
    "totalDuration": 1234,
    "steps": [
      {
        "step": "register",
        "status": "passed",
        "duration": 456,
        "result": { ... }
      }
    ],
    "summary": {
      "total": 3,
      "passed": 3,
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

#### 2. Observability Handler (`serverless/src/handlers/observability.js`)

**Endpoints:**

##### Ingest Metrics
```
POST /internal/observability/metrics
```
Store metrics from frontend or backend sources.

**Request:**
```json
{
  "type": "performance",
  "data": {
    "pageLoadTime": 1234,
    "firstContentfulPaint": 567
  }
}
```

##### Get Metrics
```
GET /internal/observability/metrics?type=performance&since=1699999999000
```
Retrieve aggregated metrics.

**Response:**
```json
{
  "metrics": [ ... ],
  "aggregates": {
    "total": 100,
    "byType": {
      "performance": 50,
      "error": 10
    },
    "timeRange": {
      "start": 1699999999000,
      "end": 1700000000000
    }
  }
}
```

##### Health Check
```
GET /internal/observability/health
```
Comprehensive system health status.

**Response:**
```json
{
  "timestamp": "2025-11-11T23:44:00.000Z",
  "status": "healthy",
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 0
    },
    "memory": {
      "status": "healthy",
      "heapUsed": "45MB",
      "heapTotal": "100MB"
    },
    "metricsStore": {
      "status": "healthy",
      "totalMetrics": 234
    }
  },
  "environment": {
    "nodeVersion": "v20.x.x",
    "platform": "linux",
    "arch": "x64"
  }
}
```

##### Get Stats
```
GET /internal/observability/stats
```
System statistics and performance metrics.

##### Log Event
```
POST /internal/observability/log
```
Send structured log events.

**Request:**
```json
{
  "level": "error",
  "message": "User authentication failed",
  "context": {
    "userId": "123",
    "reason": "invalid_credentials"
  }
}
```

### Frontend Components

#### 1. Performance Monitor (`src/utils/performanceMonitor.js`)

**Enhanced Features:**
- Automatic performance metrics collection
- Integration with observability backend
- Core Web Vitals tracking
- Custom metrics support

**Usage:**
```javascript
import performanceMonitor from './utils/performanceMonitor';

// Track custom interaction
performanceMonitor.trackInteraction('button_click', 123);

// Track custom metric
performanceMonitor.trackCustomMetric('api_calls', 5);

// Get current metrics
const metrics = performanceMonitor.getMetrics();
```

#### 2. Observability Client (`src/utils/observabilityClient.js`)

**Features:**
- Batch metric processing
- Automatic error tracking
- Page view tracking
- API request tracking
- Structured logging

**Usage:**
```javascript
import observabilityClient from './utils/observabilityClient';

// Track custom metric
observabilityClient.track('custom', { value: 42 });

// Track error
try {
  // ... code
} catch (error) {
  observabilityClient.trackError(error, { context: 'user_action' });
}

// Track page view
observabilityClient.trackPageView('/dashboard', { userId: '123' });

// Track interaction
observabilityClient.trackInteraction('click', 'signup_button', { source: 'homepage' });

// Track API request
observabilityClient.trackApiRequest('POST', '/api/users', 234, 200);

// Send log
await observabilityClient.log('info', 'User logged in', { userId: '123' });

// Get health status
const health = await observabilityClient.getHealth();

// Get stats
const stats = await observabilityClient.getStats();
```

**Automatic Features:**
- Global error handler registration
- Unhandled promise rejection tracking
- Automatic metric batching
- Graceful degradation when backend unavailable

## Configuration

### Environment Variables

#### Backend (serverless/.env)
```powershell
# Synthetic Journey
SYNTHETIC_JOURNEY_ENABLED=true
SYNTHETIC_USE_REAL_REQUESTS=true
API_BASE_URL=http://localhost:3000

# Observability
OBSERVABILITY_ENABLED=true
```

#### Frontend (.env or .env.local)
```powershell
VITE_API_URL=http://localhost:3000
VITE_OBSERVABILITY_ENABLED=true
```

### Serverless Configuration

The observability endpoints are automatically configured in `serverless.yml`:

```yaml
functions:
  runSyntheticJourney:
    handler: src/handlers/syntheticJourney.runSyntheticJourney
    events:
      - httpApi:
          path: /internal/journey/run
          method: post

  ingestMetrics:
    handler: src/handlers/observability.ingestMetrics
    events:
      - httpApi:
          path: /internal/observability/metrics
          method: post

  getMetrics:
    handler: src/handlers/observability.getMetrics
    events:
      - httpApi:
          path: /internal/observability/metrics
          method: get

  observabilityHealth:
    handler: src/handlers/observability.healthCheck
    events:
      - httpApi:
          path: /internal/observability/health
          method: get

  getStats:
    handler: src/handlers/observability.getStats
    events:
      - httpApi:
          path: /internal/observability/stats
          method: get

  logEvent:
    handler: src/handlers/observability.logEvent
    events:
      - httpApi:
          path: /internal/observability/log
          method: post
```

## Testing

### Running Synthetic Journeys

```powershell
# Using curl
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
    "Content-Type" = "application/json"
} -Body '{"mode": "real", "scenarios": ["register", "login", "logout"]}' -ContentType 'application/json'
```

### Checking Health

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/internal/observability/health" -Method Get
```

### Viewing Stats

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/internal/observability/stats" -Method Get
```

### Sending Test Metrics

```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "type": "performance", "data": { "pageLoadTime": 1234, "metric": "test" } }' -ContentType 'application/json'
```

### Retrieving Metrics

```powershell
# All metrics from last 15 minutes
Invoke-RestMethod -Uri "http://localhost:3000/internal/observability/metrics" -Method Get

# Only performance metrics
Invoke-RestMethod -Uri "http://localhost:3000/internal/observability/metrics?type=performance" -Method Get

# Metrics since specific timestamp
Invoke-RestMethod -Uri "http://localhost:3000/internal/observability/metrics?since=1699999999000" -Method Get
```

## Monitoring Best Practices

### 1. Error Tracking

Always wrap critical code sections with error tracking:

```javascript
try {
  await criticalOperation();
} catch (error) {
  observabilityClient.trackError(error, {
    operation: 'criticalOperation',
    userId: user.id,
  });
  throw error; // Re-throw if needed
}
```

### 2. Performance Monitoring

Track key user interactions:

```javascript
const startTime = Date.now();
await performAction();
const duration = Date.now() - startTime;

performanceMonitor.trackInteraction('action_name', duration);
```

### 3. API Request Tracking

Wrap API calls with observability:

```javascript
const startTime = Date.now();
const response = await fetch(url, options);
const duration = Date.now() - startTime;

observabilityClient.trackApiRequest(
  'POST',
  url,
  duration,
  response.status,
  { endpoint: 'users.create' }
);
```

### 4. Synthetic Journey Monitoring

Run synthetic journeys regularly:

```powershell
# Set up a cron job or scheduled task
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Body '{"mode": "real"}' -ContentType 'application/json'
```

## Architecture Notes

### Metrics Storage

**Current Implementation:**
- In-memory storage with automatic cleanup
- Max 1000 metrics per type
- 1-hour retention window

**Production Recommendations:**
- Use Redis or similar for distributed metric storage
- Implement proper time-series database (InfluxDB, TimescaleDB)
- Set up alerting based on metric thresholds
- Configure metric aggregation and rollups

### Scalability

The current implementation is suitable for:
- Development environments
- Small to medium-scale applications
- Proof of concept deployments

For production scale:
- Move to dedicated observability platform (Datadog, New Relic, Grafana)
- Implement sampling for high-volume metrics
- Use message queues for metric ingestion
- Set up distributed tracing (OpenTelemetry)

### Security

**Internal Endpoints:**
All observability endpoints are under `/internal/*` and should be:
- Protected by VPC or IP allowlisting
- Not exposed to public internet
- Accessed only by authorized services
- Rate-limited to prevent abuse

**Sensitive Data:**
- Do not include passwords or tokens in metrics
- Sanitize user data before logging
- Implement PII filtering
- Use secure transport (HTTPS) in production

## Troubleshooting

### Metrics Not Appearing

1. Check if observability is enabled:
   ```powershell
   echo $OBSERVABILITY_ENABLED
   ```

2. Verify backend is receiving metrics:
   ```powershell
Invoke-RestMethod -Uri "http://localhost:3000/internal/observability/health" -Method Get
   ```

3. Check browser console for errors

### Synthetic Journey Failures

1. Verify environment variables:
   ```powershell
   echo $SYNTHETIC_JOURNEY_ENABLED
   echo $SYNTHETIC_USE_REAL_REQUESTS
   echo $API_BASE_URL
   ```

2. Test in simulated mode first:
   ```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Body '{"mode": "simulated"}' -ContentType 'application/json'
```

3. Check individual step failures in the response

### High Memory Usage

1. Reduce metrics retention:
   - Modify `METRICS_RETENTION_MS` in observability.js
   - Reduce `MAX_METRICS_IN_MEMORY`

2. Increase cleanup frequency:
   - Modify cleanup probability in `ingestMetrics`

3. Implement external metric storage

## Future Enhancements

- [ ] Add dashboard UI for metrics visualization
- [ ] Implement alerting system
- [ ] Add distributed tracing support
- [ ] Integrate with APM platforms
- [ ] Add custom metric queries
- [ ] Implement metric aggregation
- [ ] Add real-time metric streaming
- [ ] Support for custom journey scenarios
- [ ] Add journey scheduling
- [ ] Implement metric retention policies

## Support

For issues or questions about observability features:
1. Check logs in the serverless function
2. Review metrics in the observability endpoints
3. Run health checks
4. Consult this documentation
5. Open an issue with detailed error information
