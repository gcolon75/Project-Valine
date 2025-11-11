# Rate Limiting

## Overview

Project Valine implements distributed rate limiting to protect against abuse, brute force attacks, and excessive API usage. The rate limiting system uses Redis for distributed state management across Lambda instances, with an in-memory fallback for local development.

## Architecture

### Components

1. **Rate Limit Middleware** (`src/middleware/rateLimit.js`)
   - Core rate limiting logic
   - Redis client management
   - In-memory fallback implementation
   - Response header management

2. **Rate Limit Configuration** (`src/config/rateLimits.js`)
   - Endpoint-specific rate limit definitions
   - Route classification logic
   - Configurable thresholds and time windows

3. **Redis Backend**
   - AWS ElastiCache for Redis (production)
   - Local Redis instance (development)
   - Automatic failover to in-memory store

## Rate Limit Strategy

### Identifier-based Limiting

Rate limits are tracked using a composite identifier:

- **Authenticated requests**: `user:<userId>` - Limits per user account
- **Unauthenticated requests**: `ip:<ipAddress>` - Limits per IP address

This ensures:
- Authenticated users can't bypass limits by changing IPs
- Multiple users behind the same IP (NAT) aren't unfairly restricted
- Attacks from a single IP are effectively throttled

### IP Address Extraction

The middleware extracts client IP addresses from:

1. **API Gateway requestContext** (`requestContext.http.sourceIp`) - Primary source
2. **X-Forwarded-For header** - Fallback for proxy scenarios
3. Takes the first IP from comma-separated list in X-Forwarded-For

## Rate Limits by Endpoint Type

### Authentication Endpoints (`/auth/*`)

**Limit**: 10 requests per 15 minutes

**Applies to**:
- `/auth/login`
- `/auth/register`
- `/auth/verify-email`
- `/auth/resend-verification`
- `/auth/refresh`
- `/auth/logout`

**Rationale**: Strict limits prevent brute force attacks and credential stuffing.

### Write Endpoints (POST/PUT/DELETE/PATCH)

**Limit**: 100 requests per hour

**Applies to**:
- Profile creation/updates
- Media uploads
- Settings changes
- Content creation
- Connection requests

**Rationale**: Moderate limits prevent spam and abuse while allowing normal usage.

### Read Endpoints (GET)

**Limit**: 1000 requests per hour

**Applies to**:
- Profile viewing
- Content browsing
- Search queries
- Settings retrieval

**Rationale**: Lenient limits accommodate high-traffic browsing patterns.

### Health Check Endpoints

**Limit**: None

**Exempt routes**:
- `/health`
- `/meta`

**Rationale**: Monitoring systems need unrestricted access for health checks.

## Configuration

### Environment Variables

#### `REDIS_URL`

**Required for production**: Yes  
**Format**: `redis://hostname:port` or `rediss://hostname:port` (SSL)

**Examples**:
```bash
# Local development
REDIS_URL=redis://localhost:6379

# AWS ElastiCache (production)
REDIS_URL=redis://your-cluster.cache.amazonaws.com:6379

# AWS ElastiCache with SSL (recommended)
REDIS_URL=rediss://your-cluster.cache.amazonaws.com:6379
```

**Behavior when not set**:
- Middleware falls back to in-memory storage
- Warning logged on first request
- Works for single-instance development only
- **NOT suitable for production** (no state sharing between Lambdas)

#### `RATE_LIMITING_ENABLED`

**Default**: `true`  
**Values**: `true` | `false`

**Purpose**: Feature flag to disable rate limiting

**Use cases**:
- Testing scenarios requiring unlimited requests
- Debugging rate limit issues
- Temporary bypass during incident response

**Example**:
```bash
# Disable rate limiting
RATE_LIMITING_ENABLED=false
```

### Redis Setup

#### Local Development

**Install Redis**:
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Windows (WSL or Docker)
docker run -d -p 6379:6379 redis:alpine
```

**Configure**:
```bash
# .env
REDIS_URL=redis://localhost:6379
```

#### AWS ElastiCache (Production)

**Create ElastiCache Cluster**:

1. **Console**:
   - Navigate to ElastiCache → Redis
   - Click "Create"
   - Choose cluster mode (disabled for simple setup)
   - Select node type (t3.micro for small workloads)
   - Configure VPC and security groups
   - Enable encryption in transit (recommended)

2. **Terraform** (example):
```hcl
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "pv-rate-limit-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  security_group_ids   = [aws_security_group.redis.id]
  subnet_group_name    = aws_elasticache_subnet_group.main.name
}
```

3. **Network Configuration**:
   - Ensure Lambda functions can access ElastiCache (same VPC or VPC peering)
   - Security group rules: Allow inbound on port 6379 from Lambda security group
   - Use VPC endpoints for better performance

**Environment Configuration**:
```bash
# serverless.yml
environment:
  REDIS_URL: ${env:REDIS_URL}
```

## Key Pattern

Rate limit keys follow this pattern:

```
rl:<route>:<identifier>
```

**Examples**:
```
rl:/auth/login:ip:192.168.1.1
rl:/auth/login:user:abc123
rl:/api/profiles:user:xyz789
rl:/api/reels:ip:10.0.0.5
```

**TTL**: Keys automatically expire after the rate limit window

## Response Headers

All rate-limited responses include these headers:

### Success Responses (200-299)

```
X-RateLimit-Limit: 10          # Maximum requests allowed
X-RateLimit-Remaining: 7       # Requests remaining in window
X-RateLimit-Reset: 1699564800  # Unix timestamp when limit resets
```

### Rate Limit Exceeded (429)

```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 850                           # Seconds until retry allowed
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699564800

{
  "error": "Too many authentication attempts. Please try again later.",
  "retryAfter": 850
}
```

## Usage

### Applying to Lambda Handlers

#### Method 1: Using `withRateLimit` Wrapper

**Recommended for new handlers**:

```javascript
import { withRateLimit } from '../middleware/rateLimit.js';

const myHandler = async (event) => {
  // Handler logic
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};

// Export wrapped handler
export const handler = withRateLimit(myHandler);
```

#### Method 2: Manual Integration

**For handlers with existing middleware**:

```javascript
import { rateLimit } from '../middleware/rateLimit.js';

export const handler = async (event) => {
  // Check rate limit
  const rateLimitResult = await rateLimit(event);
  
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }
  
  // Handler logic
  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      // Add rate limit headers
      ...event.rateLimitHeaders
    },
    body: JSON.stringify({ success: true })
  };
  
  return response;
};
```

#### Method 3: Custom Route Grouping

**For grouping multiple routes under one limit**:

```javascript
import { withRateLimit } from '../middleware/rateLimit.js';

const profileHandler = async (event) => {
  // Handler logic
};

// Group all profile operations under same limit
export const handler = withRateLimit(profileHandler, '/api/profiles');
```

## Testing

### Unit Tests

Run the test suite:

```bash
cd serverless
npm test tests/rateLimit.test.js
```

### Manual Testing

#### Test Rate Limiting

```bash
# Test auth endpoint limit (10 requests/15min)
for i in {1..12}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test123"}' \
    -i
  echo "Request $i"
done

# Should see 429 on requests 11 and 12
```

#### Verify Response Headers

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  -i | grep -E "X-RateLimit|Retry-After"
```

#### Test Different IPs

```bash
# Request 1 (IP 1)
curl -X POST http://localhost:3000/auth/login \
  -H "X-Forwarded-For: 192.168.1.1" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Request 2 (IP 2 - different limit)
curl -X POST http://localhost:3000/auth/login \
  -H "X-Forwarded-For: 192.168.1.2" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## Troubleshooting

### Issue: Rate limiting not working

**Symptoms**:
- Unlimited requests succeed
- No rate limit headers in responses

**Solutions**:
1. Check `RATE_LIMITING_ENABLED` environment variable:
   ```bash
   echo $RATE_LIMITING_ENABLED
   # Should be 'true' or unset (defaults to true)
   ```

2. Verify middleware is applied to handler:
   ```javascript
   // Check handler file has withRateLimit or manual rateLimit call
   ```

3. Check route exemption:
   ```javascript
   // /health and /meta are exempt by default
   ```

### Issue: Redis connection failures

**Symptoms**:
- Logs show Redis errors
- Rate limiting still works (fallback active)
- Warning: "Using in-memory fallback"

**Solutions**:
1. Verify Redis URL:
   ```bash
   echo $REDIS_URL
   redis-cli -u $REDIS_URL ping
   # Should return PONG
   ```

2. Check network connectivity:
   - Lambda functions in VPC? Ensure Redis is in same VPC
   - Security groups allow port 6379?
   - ElastiCache subnet accessible?

3. Check Redis server status:
   ```bash
   redis-cli ping
   # Local: redis-cli
   # Remote: redis-cli -h hostname -p 6379
   ```

4. Review Lambda logs:
   ```bash
   # Look for Redis connection errors
   aws logs tail /aws/lambda/your-function-name --follow
   ```

### Issue: Different Lambda instances show different counts

**Symptoms**:
- Rate limit count inconsistent
- Same IP sometimes allowed after limit
- Using `REDIS_URL` but issues persist

**Cause**: In-memory fallback is active (Redis connection failed)

**Solutions**:
1. Verify Redis is actually being used:
   ```bash
   # Check Redis for keys
   redis-cli --scan --pattern 'rl:*'
   ```

2. Check Lambda can connect to Redis:
   - VPC configuration
   - Security group rules
   - Subnet routing

### Issue: Legitimate users blocked

**Symptoms**:
- Users behind corporate NAT report 429 errors
- Shared IPs hitting limits

**Solutions**:
1. Encourage users to create accounts (user-based limits)
2. Adjust limits for specific endpoints if needed
3. Whitelist specific IPs (requires code change):
   ```javascript
   // In rateLimit.js
   const WHITELISTED_IPS = ['203.0.113.0', '198.51.100.0'];
   if (WHITELISTED_IPS.includes(ip)) {
     return { allowed: true };
   }
   ```

### Issue: Need to reset limits for testing

**Solutions**:

1. **Clear specific key**:
   ```bash
   redis-cli DEL "rl:/auth/login:ip:192.168.1.1"
   ```

2. **Clear all rate limit keys**:
   ```bash
   redis-cli --scan --pattern 'rl:*' | xargs redis-cli DEL
   ```

3. **Disable rate limiting temporarily**:
   ```bash
   export RATE_LIMITING_ENABLED=false
   ```

4. **Restart Lambda (local)**:
   ```bash
   # Kill and restart serverless offline
   pkill -f "serverless offline"
   npm run dev
   ```

## Monitoring

### CloudWatch Metrics

Create custom metrics for rate limiting:

```javascript
// In rateLimit.js
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatch({ region: process.env.AWS_REGION });

async function recordRateLimitMetric(allowed) {
  await cloudwatch.putMetricData({
    Namespace: 'ProjectValine/RateLimiting',
    MetricData: [{
      MetricName: allowed ? 'AllowedRequests' : 'BlockedRequests',
      Value: 1,
      Unit: 'Count',
      Timestamp: new Date()
    }]
  });
}
```

### Recommended Alarms

1. **High Block Rate**:
   - Metric: `BlockedRequests`
   - Threshold: > 100 per 5 minutes
   - Indicates possible attack or overly strict limits

2. **Redis Connection Failures**:
   - Metric: Custom log-based metric
   - Filter: `[RateLimit] Redis error`
   - Threshold: > 5 per minute

## Security Considerations

### Attack Vectors

1. **Distributed Attack**:
   - Attacker uses many IPs
   - Mitigation: User-based limits for authenticated endpoints

2. **IP Spoofing**:
   - API Gateway provides real source IP
   - X-Forwarded-For used as fallback only
   - Difficult to spoof in AWS environment

3. **Slowloris**:
   - Rate limits prevent connection exhaustion
   - Lambda concurrency limits provide additional protection

### Best Practices

1. **Always use Redis in production**:
   - In-memory fallback not distributed
   - Limits only effective per Lambda instance

2. **Monitor rate limit metrics**:
   - Track legitimate vs malicious blocks
   - Adjust limits based on usage patterns

3. **Combine with other security measures**:
   - WAF rules for known attack patterns
   - IP allowlists/blocklists
   - CAPTCHA for repeated failures

4. **Regular limit review**:
   - Analyze normal usage patterns
   - Adjust limits to balance security and UX

## Performance Impact

### Overhead

- **Redis mode**: ~2-5ms per request (network latency)
- **In-memory mode**: <1ms per request
- **Impact**: Minimal compared to database/business logic

### Optimization Tips

1. **Use ElastiCache in same VPC as Lambda**:
   - Reduces latency
   - No internet gateway needed

2. **Configure Redis connection pooling**:
   - ioredis handles this automatically
   - Reuses connections across invocations

3. **Monitor Redis memory usage**:
   - Keys auto-expire after window
   - Monitor with CloudWatch

## Future Enhancements

Potential improvements for consideration:

1. **Dynamic rate limits**:
   - Adjust based on user tier (free vs paid)
   - Geographic rate limits

2. **Sliding window algorithm**:
   - Current: Fixed window
   - Future: More precise sliding window

3. **Rate limit exemptions**:
   - API keys with higher limits
   - Trusted partner IPs

4. **Advanced analytics**:
   - Rate limit violation patterns
   - Anomaly detection

## References

- [Redis Rate Limiting Patterns](https://redis.io/docs/manual/patterns/rate-limiting/)
- [AWS ElastiCache Best Practices](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/BestPractices.html)
- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [RFC 6585 - HTTP Status Code 429](https://tools.ietf.org/html/rfc6585#section-4)
