# Caching Layer Documentation

## Overview

Project Valine implements a Redis-based caching layer with in-memory fallback to reduce p95 latency for profile and search endpoints. The cache layer is designed with safety, observability, and graceful degradation in mind.

## Architecture

### Cache Storage

- **Primary**: Redis (recommended for production)
- **Fallback**: In-memory Map (automatic fallback if Redis unavailable)
- **Feature Flag**: `CACHE_ENABLED` environment variable (default: `false`)

### Key Patterns

All cache keys follow a versioned pattern to allow for safe schema evolution:

#### Profile Cache
```
profile:v1:<userId>:summary
```

Example: `profile:v1:user-123:summary`

#### Search Cache
```
search:v1:<normalizedQuery>:page:<n>
```

Example: `search:v1:voice actor:page:1`

**Note**: Search queries are normalized (lowercase, trimmed, collapsed whitespace) to maximize cache hit rate for equivalent queries.

## Configuration

### Environment Variables

```bash
# Enable/disable caching
CACHE_ENABLED=false

# Redis connection (optional, uses in-memory if not provided)
REDIS_URL=redis://localhost:6379

# Time-to-live settings (seconds)
CACHE_TTL_PROFILE=300  # 5 minutes
CACHE_TTL_SEARCH=60    # 1 minute

# Maximum cacheable search pages (default: 3)
CACHE_MAX_SEARCH_PAGES=3

# Maximum keys in in-memory cache (default: 1000)
CACHE_MAX_KEYS_PROFILE=1000
```

### TTL Rationale

- **Profile Cache (300s)**: Profiles change infrequently, longer TTL provides better hit rate
- **Search Cache (60s)**: Search results can become stale quickly with new content, shorter TTL maintains freshness

## Cached Endpoints

### 1. GET /profiles/:userId

**What's Cached**: Profile summary with essential fields (id, userId, vanityUrl, headline, title, bio, roles, tags, location, links, metadata)

**TTL**: Configurable via `CACHE_TTL_PROFILE` (default: 300 seconds)

**Cache Key**: `profile:v1:<userId>:summary`

**Bypass**: Send `X-Cache-Bypass: true` header to force fresh fetch

**Response Headers** (when caching enabled):
- `X-Cache-Hit`: `true` or `false`
- `X-Response-Time`: Request duration in milliseconds

**Invalidation Triggers**:
- Profile PATCH
- Profile link create/update/delete
- User account deletion

### 2. GET /search

**What's Cached**: Search results including result array, count, page number, and query

**TTL**: Configurable via `CACHE_TTL_SEARCH` (default: 60 seconds)

**Cache Key**: `search:v1:<normalizedQuery>:page:<n>`

**Bypass**: Send `X-Cache-Bypass: true` header to force fresh search

**Response Headers** (when caching enabled):
- `X-Cache-Hit`: `true` or `false`
- `X-Response-Time`: Request duration in milliseconds

**Page Limit**: Only first N pages are cached (configurable via `CACHE_MAX_SEARCH_PAGES`, default: 3)

**Invalidation**: Eventual consistency via TTL expiration (also invalidated on profile updates for simplicity)

### 3. GET /api/cache/metrics

**What's Returned**: Cache performance metrics

```json
{
  "enabled": true,
  "metrics": {
    "hits": 150,
    "misses": 50,
    "total": 200,
    "hitRatio": 0.75,
    "cacheType": "redis"
  },
  "timestamp": "2024-11-12T10:00:00.000Z"
}
```

## Cache Invalidation Strategy

### Profile Updates

When a profile is updated (title, headline, links, etc.):

1. Delete specific profile cache: `profile:v1:<userId>:summary`
2. Delete all search caches: `search:v1:*` (eventual consistency approach)

**Rationale**: Profile may appear in search results, and tracking which searches include a profile is complex. TTL-based expiration ensures eventual consistency without reverse indexing overhead.

### Link Operations

When profile links are created, updated, or deleted:

1. Delete specific profile cache: `profile:v1:<userId>:summary`

**Note**: Links are part of the profile summary, so profile cache must be invalidated.

### Media Completion

When media upload completes and affects profile avatar:

1. Delete specific profile cache: `profile:v1:<userId>:summary`

(Currently handled by profile update invalidation)

### Account Deletion

When a user account is deleted:

1. Delete specific profile cache: `profile:v1:<userId>:summary`
2. Optional: Let search caches expire naturally (lazy eviction)

## Observability

### Metrics

The cache layer tracks:

- **Cache Hits**: Number of successful cache retrievals
- **Cache Misses**: Number of cache lookups that resulted in database fetch
- **Hit Ratio**: `hits / (hits + misses)`
- **Cache Type**: `redis` or `memory`

### Accessing Metrics

**Via API**:
```bash
curl http://localhost:5000/api/cache/metrics
```

**Via Code**:
```javascript
import { getMetrics } from './cache/index.js'

const metrics = getMetrics()
console.log('Cache hit ratio:', metrics.hitRatio)
```

### Performance Testing

Run baseline performance tests:

```bash
# Set test configuration
export API_URL=http://localhost:5000
export TEST_USER_ID=<valid-user-id>
export TEST_SEARCH_QUERY=<search-term>

# Run baseline (cache disabled)
CACHE_ENABLED=false node server/scripts/perf/baseline-profiles-search.mjs

# Run with cache enabled
CACHE_ENABLED=true node server/scripts/perf/baseline-profiles-search.mjs
```

Results are saved to:
- JSON: `docs/performance/BASELINE_<date>.json`
- Markdown: `docs/performance/BASELINE_<date>.md`

## Security Considerations

### What's NOT Cached

The following sensitive data is excluded from cache:

- Email addresses
- Password hashes
- Email verification tokens
- Password reset tokens
- Two-factor authentication secrets
- Session tokens
- Audit log details
- Internal system fields

### Cache Storage Security

- **Redis**: Recommend TLS encryption in transit (`rediss://` protocol)
- **At-Rest Encryption**: Depends on Redis provider (AWS ElastiCache, Redis Cloud, etc.)
- **Access Control**: Ensure Redis instance is not publicly accessible
- **In-Memory Fallback**: Data resides in server process memory (secure but lost on restart)

### Rate Limiting

Cache does NOT bypass rate limiting. All security checks remain in place.

### Cache Poisoning Prevention

- Input validation occurs BEFORE caching
- Cache keys use server-side normalization
- User input doesn't directly control cache keys

## Operational Tasks

### Manual Cache Invalidation

Use the provided script for manual cache operations:

```bash
# Invalidate specific user profile
node server/scripts/cache/invalidate-profile.mjs <userId>

# Invalidate all search caches
node server/scripts/cache/invalidate-profile.mjs --all-search

# Invalidate ALL caches (WARNING!)
node server/scripts/cache/invalidate-profile.mjs --all
```

**Note**: Script requires Redis connection. In-memory cache can only be cleared by server restart.

### Monitoring

Monitor these metrics:

- **Hit Ratio**: Target ≥70% for profiles, ≥50% for search
- **Cache Size**: Ensure Redis doesn't exceed memory limits
- **Error Rate**: Watch for cache connection errors in logs

### Troubleshooting

#### Cache not working

1. Check `CACHE_ENABLED=true` in environment
2. Verify Redis connection if using Redis
3. Check server logs for cache initialization errors
4. Test cache metrics endpoint: `GET /api/cache/metrics`

#### Low hit ratio

1. Verify TTL isn't too short
2. Check if cache is being invalidated too frequently
3. Ensure search query normalization is working
4. Review cache size limits (in-memory only)

#### Redis connection errors

1. Verify `REDIS_URL` is correct
2. Check Redis server is running
3. Verify network connectivity
4. Check Redis authentication credentials
5. Server will fall back to in-memory cache automatically

## Rollback Plan

### Disable Caching

Set environment variable and restart:

```bash
CACHE_ENABLED=false
```

Application continues to function normally with all requests hitting the database directly.

### Flush Cache

If Redis cache needs to be cleared:

```bash
# Using provided script
node server/scripts/cache/invalidate-profile.mjs --all

# Or directly with redis-cli
redis-cli KEYS "profile:*" | xargs redis-cli DEL
redis-cli KEYS "search:*" | xargs redis-cli DEL
```

### Full Rollback

If caching introduces unexpected issues:

1. Set `CACHE_ENABLED=false`
2. Redeploy or restart server
3. Optionally flush Redis keys
4. Latencies will revert to pre-caching baseline

**Code Changes**: Can be reverted via git without risk, as caching is feature-flagged.

## Future Improvements

### Stale-While-Revalidate

Serve stale cache while fetching fresh data in background:

- Improves perceived latency
- Reduces cache miss impact
- Requires async background refresh mechanism

### Adaptive TTL

Adjust TTL based on content change frequency:

- Frequently updated profiles: shorter TTL
- Static profiles: longer TTL
- Requires tracking update patterns

### Bloom Filter for Search Invalidation

Use Bloom filter to track which profiles appear in which search results:

- Precise invalidation instead of deleting all search caches
- Reduces cache churn on profile updates
- Adds complexity and memory overhead

### Cache Warming

Proactively cache popular profiles:

- Reduce cold start latency
- Requires identifying "popular" profiles
- Can be triggered on deployment

### Distributed Caching

For multi-instance deployments:

- Redis already supports distributed caching
- Consider Redis Cluster for horizontal scaling
- Implement cache coherency checks

## Performance Goals

### Target Metrics

- **p95 Profile Latency**: Reduce by ≥15% (stretch: ≥25%)
- **p95 Search Latency**: Reduce by ≥15% (stretch: ≥25%)
- **Cache Hit Ratio**: ≥70% for profiles, ≥50% for search
- **No Degradation**: No regression in p99 latencies

### Success Criteria

- [x] Cache implementation complete
- [ ] Performance tests show ≥15% p95 improvement
- [x] Zero errors with `CACHE_ENABLED=false`
- [x] No sensitive data in cache
- [ ] All tests pass
- [ ] Security scan clean

## References

- [Performance Testing Script](../server/scripts/perf/baseline-profiles-search.mjs)
- [Cache Invalidation Script](../server/scripts/cache/invalidate-profile.mjs)
- [Cache Implementation](../server/src/cache/index.js)
- [Profile Summary Builder](../server/src/cache/profileSummary.js)
