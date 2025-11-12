# Cache Operations Support Guide

## Overview

This guide provides instructions for common cache maintenance and troubleshooting tasks for Project Valine's caching layer.

## Prerequisites

- Access to server environment variables
- Redis connection details (if using Redis)
- Node.js environment

## Common Operations

### 1. Check Cache Status

**Via API Endpoint**:

```bash
curl http://localhost:5000/api/cache/metrics
```

**Expected Response** (cache enabled):

```json
{
  "enabled": true,
  "metrics": {
    "hits": 250,
    "misses": 75,
    "total": 325,
    "hitRatio": 0.77,
    "cacheType": "redis"
  },
  "timestamp": "2024-11-12T10:30:00.000Z"
}
```

**Expected Response** (cache disabled):

```json
{
  "enabled": false,
  "message": "Caching is disabled"
}
```

### 2. Invalidate Specific User Profile

**Use Case**: User reports stale profile data, or after manual database correction.

**Command**:

```bash
cd /path/to/project-valine/server
node scripts/cache/invalidate-profile.mjs <userId>
```

**Example**:

```bash
node scripts/cache/invalidate-profile.mjs user-123abc
```

**Output**:

```
[Cache] Connecting to Redis...
[Cache] Connected to Redis
[Cache] Invalidating profile cache for user: user-123abc
[Cache] Successfully deleted cache key: profile:v1:user-123abc:summary
[Cache] Also invalidating all search caches...
[Cache] Deleted 42 search cache keys
[Cache] Invalidation complete
```

### 3. Invalidate All Search Caches

**Use Case**: After bulk profile updates, content moderation, or search algorithm changes.

**Command**:

```bash
node scripts/cache/invalidate-profile.mjs --all-search
```

**Output**:

```
[Cache] Connecting to Redis...
[Cache] Connected to Redis
[Cache] Invalidating all search caches
[Cache] Deleted 128 search cache keys
[Cache] Invalidation complete
```

### 4. Flush All Caches (Emergency)

**Use Case**: Critical bug in cached data, emergency rollback, or major data migration.

**⚠️ WARNING**: This will clear ALL cached data. Use with caution.

**Command**:

```bash
node scripts/cache/invalidate-profile.mjs --all
```

**Confirmation**:

```
[Cache] WARNING: Invalidating ALL caches
[Cache] Deleted 523 keys
[Cache] Invalidation complete
```

### 5. Enable Caching

**In Development**:

```bash
# Set environment variable
export CACHE_ENABLED=true
export REDIS_URL=redis://localhost:6379

# Restart server
npm run dev
```

**In Production** (depends on deployment method):

**Docker**:
```bash
docker run -e CACHE_ENABLED=true -e REDIS_URL=redis://redis:6379 ...
```

**Environment File** (`.env`):
```bash
CACHE_ENABLED=true
REDIS_URL=redis://your-redis-host:6379
```

**Verify**:

```bash
# Check server logs for:
[Cache] Redis cache initialized
[Cache] Cache layer initialized

# Or check metrics endpoint:
curl http://localhost:5000/api/cache/metrics
```

### 6. Disable Caching

**Quick Disable** (no code changes):

```bash
# Set environment variable
export CACHE_ENABLED=false

# Restart server
```

**Verify**:

```bash
# Check server logs for:
[Cache] Caching is disabled (CACHE_ENABLED=false)

# Metrics endpoint will return:
{
  "enabled": false,
  "message": "Caching is disabled"
}
```

## Troubleshooting

### Issue: Cache Not Working

**Symptoms**:
- Metrics show all misses, no hits
- `X-Cache-Hit` header always `false`

**Diagnosis Steps**:

1. **Check if caching is enabled**:
   ```bash
   curl http://localhost:5000/api/cache/metrics
   ```
   Should show `"enabled": true`

2. **Check server logs** for initialization:
   ```bash
   grep -i cache server.log
   ```
   Look for: `[Cache] Cache layer initialized`

3. **Verify environment variables**:
   ```bash
   echo $CACHE_ENABLED
   echo $REDIS_URL
   ```

**Solutions**:

- Ensure `CACHE_ENABLED=true` in environment
- Verify Redis is running: `redis-cli ping` (should return `PONG`)
- Check Redis connection string format: `redis://host:port` or `rediss://host:port` for TLS
- Restart server after environment changes

### Issue: Low Cache Hit Ratio

**Symptoms**:
- Hit ratio < 50% for repeated requests
- Expected cache hits not occurring

**Diagnosis Steps**:

1. **Check TTL settings**:
   ```bash
   echo $CACHE_TTL_PROFILE
   echo $CACHE_TTL_SEARCH
   ```
   Should be reasonable values (e.g., 300, 60)

2. **Monitor cache invalidations** in logs:
   ```bash
   grep -i "invalidat" server.log
   ```

3. **Test cache directly**:
   ```bash
   # First request (should be cache miss)
   curl -i http://localhost:5000/profiles/user-123
   # Check header: X-Cache-Hit: false

   # Second request immediately after (should be cache hit)
   curl -i http://localhost:5000/profiles/user-123
   # Check header: X-Cache-Hit: true
   ```

**Solutions**:

- Increase TTL if data changes infrequently
- Check for frequent profile updates causing invalidations
- Verify search query normalization (case/whitespace differences)
- Review application load patterns

### Issue: Redis Connection Errors

**Symptoms**:
- Server logs show Redis connection errors
- Cache falls back to in-memory
- "Redis error" messages in logs

**Diagnosis Steps**:

1. **Test Redis connectivity**:
   ```bash
   redis-cli -h <host> -p <port> ping
   ```

2. **Check Redis server status**:
   ```bash
   redis-cli info server
   ```

3. **Verify credentials** (if using AUTH):
   ```bash
   redis-cli -h <host> -p <port> -a <password> ping
   ```

**Solutions**:

- Verify `REDIS_URL` format: `redis://[user:password@]host:port[/db]`
- For TLS: Use `rediss://` protocol
- Check firewall rules allow connection to Redis port
- Verify Redis server is running: `systemctl status redis` (Linux)
- Check Redis configuration allows remote connections
- Application will automatically fall back to in-memory cache

### Issue: Out of Memory (Redis)

**Symptoms**:
- Redis returns `OOM` errors
- Cache writes fail
- Eviction policies kicking in

**Diagnosis Steps**:

1. **Check Redis memory usage**:
   ```bash
   redis-cli info memory
   ```

2. **Check key count**:
   ```bash
   redis-cli DBSIZE
   ```

3. **Check largest keys**:
   ```bash
   redis-cli --bigkeys
   ```

**Solutions**:

- Increase Redis memory limit: Edit `redis.conf` → `maxmemory`
- Set eviction policy: `maxmemory-policy allkeys-lru`
- Reduce cache TTLs to encourage faster expiration
- Reduce `CACHE_MAX_SEARCH_PAGES` to limit search cache size
- Consider cache warming only essential profiles

### Issue: Stale Cache Data

**Symptoms**:
- Users see outdated profile information
- Search results don't reflect recent changes

**Immediate Fix**:

```bash
# Invalidate affected user
node scripts/cache/invalidate-profile.mjs <userId>

# Or flush all caches
node scripts/cache/invalidate-profile.mjs --all
```

**Long-term Solutions**:

- Reduce TTLs for frequently updated data
- Ensure invalidation triggers are working
- Check application logic for proper invalidation calls
- Review cache key patterns for collisions

### Issue: In-Memory Cache Not Clearing

**Symptoms**:
- Cache persists across expected boundaries
- Invalidation script doesn't work

**Explanation**:

In-memory cache resides in server process memory and cannot be externally invalidated.

**Solutions**:

- **Restart server** to clear in-memory cache
- **Switch to Redis** for remote invalidation support
- **Use cache bypass header** for testing: `X-Cache-Bypass: true`

## Monitoring Best Practices

### Key Metrics to Track

1. **Hit Ratio**:
   - Target: ≥70% for profiles, ≥50% for search
   - Alert if < 40%

2. **Response Times**:
   - Monitor `X-Response-Time` header
   - Compare warm vs. cold requests
   - Alert on p95 latency increases

3. **Cache Size** (Redis):
   ```bash
   redis-cli INFO memory | grep used_memory_human
   ```

4. **Error Rate**:
   ```bash
   grep -c "Cache.*error" server.log
   ```

### Automated Monitoring Setup

**Prometheus** (if using):

```yaml
# Expose metrics endpoint
scrape_configs:
  - job_name: 'valine-cache'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/api/cache/metrics'
```

**CloudWatch** (AWS):

- Log cache metrics to CloudWatch
- Set alarms on hit ratio thresholds
- Dashboard for cache performance

## Maintenance Schedule

### Daily

- Check hit ratio: `curl http://localhost:5000/api/cache/metrics`
- Review error logs for cache issues

### Weekly

- Analyze cache usage patterns
- Adjust TTLs if needed
- Review Redis memory usage

### Monthly

- Run performance baseline tests
- Compare against historical data
- Update documentation with findings

## Emergency Contacts

**Cache Issues**:
1. Check this guide for common solutions
2. Review server logs: `tail -f /var/log/valine/server.log`
3. Disable caching if critical: `CACHE_ENABLED=false` + restart
4. Escalate to development team if unresolved

## Quick Reference

### Environment Variables

```bash
CACHE_ENABLED=true              # Enable/disable caching
REDIS_URL=redis://localhost:6379  # Redis connection string
CACHE_TTL_PROFILE=300           # Profile cache TTL (seconds)
CACHE_TTL_SEARCH=60             # Search cache TTL (seconds)
CACHE_MAX_SEARCH_PAGES=3        # Max cacheable search pages
CACHE_MAX_KEYS_PROFILE=1000     # Max in-memory cache size
```

### Useful Commands

```bash
# Check cache status
curl http://localhost:5000/api/cache/metrics

# Invalidate user profile
node scripts/cache/invalidate-profile.mjs <userId>

# Invalidate all search
node scripts/cache/invalidate-profile.mjs --all-search

# Flush all caches
node scripts/cache/invalidate-profile.mjs --all

# Test Redis connection
redis-cli -h <host> -p <port> ping

# Monitor Redis
redis-cli MONITOR

# Get cache key count
redis-cli DBSIZE
```

## Additional Resources

- [Caching Layer Documentation](./CACHING_LAYER.md)
- [Performance Testing Guide](./METRICS_QUERIES.md)
- [Redis Documentation](https://redis.io/documentation)
