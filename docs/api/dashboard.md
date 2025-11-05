# Dashboard Statistics API

API endpoint for retrieving aggregated dashboard statistics including profile views, engagement metrics, and content performance.

## Endpoints

### GET /dashboard/stats

Get aggregated statistics for the user's dashboard.

**Query Parameters:**
- `userId` (required*) - User ID (*temporary - will be extracted from auth token)
- `range` (optional) - Time range for statistics. Default: `7d`
  - `7d` - Last 7 days (default, minimal data)
  - `30d` - Last 30 days  
  - `90d` - Last 90 days
  - `all` - All time

**Response:** `200 OK`
```json
{
  "stats": {
    "range": "7d",
    "period": "Last 7 days",
    "profile": {
      "views": 1247,
      "uniqueVisitors": 892,
      "viewTrend": "+15%"
    },
    "engagement": {
      "totalLikes": 156,
      "totalComments": 42,
      "totalShares": 23,
      "engagementRate": "12.5%"
    },
    "content": {
      "postsCreated": 12,
      "reelsUploaded": 3,
      "scriptsShared": 2
    },
    "network": {
      "newConnections": 18,
      "connectionRequests": 25,
      "messagesReceived": 67
    },
    "topContent": [
      {
        "id": "post_1",
        "type": "post",
        "title": "Voice Acting Tips for Beginners",
        "views": 342,
        "likes": 28,
        "comments": 5
      },
      {
        "id": "reel_1",
        "type": "reel",
        "title": "Character Voice Demo",
        "views": 521,
        "likes": 45,
        "comments": 12
      }
    ]
  }
}
```

**Response Headers:**
```
Cache-Control: private, max-age=60
Vary: Authorization
```

**Error Response:** `400 Bad Request`

Invalid range:
```json
{
  "error": {
    "code": "INVALID_RANGE",
    "message": "Range must be one of: 7d, 30d, 90d, all",
    "details": {
      "field": "range",
      "value": "invalid",
      "allowedValues": ["7d", "30d", "90d", "all"]
    }
  }
}
```

Missing userId:
```json
{
  "error": {
    "code": "MISSING_USER_ID",
    "message": "userId query parameter is required",
    "details": {
      "field": "userId",
      "note": "This will be extracted from auth token in production"
    }
  }
}
```

**Example Requests:**

Default range (7 days):
```bash
curl -X GET "http://localhost:5000/dashboard/stats?userId=user_123"
```

Last 7 days:
```bash
curl -X GET "http://localhost:5000/dashboard/stats?userId=user_123&range=7d"
```

All time:
```bash
curl -X GET "http://localhost:5000/dashboard/stats?userId=user_123&range=all"
```

With authentication header:
```bash
curl -X GET "http://localhost:5000/dashboard/stats?userId=user_123&range=30d" \
  -H "Authorization: Bearer dev-token"
```

---

## Statistics Breakdown

### Profile Stats
- **views**: Total profile page views
- **uniqueVisitors**: Unique visitors (deduplicated by session/user)
- **viewTrend**: Percentage change compared to previous period

### Engagement Stats

**Engagement Metric Definition:**
Total engagement is the sum of all user interactions with content, including:
- **totalLikes**: Sum of likes across all content
- **totalComments**: Sum of comments across all content
- **totalShares**: Sum of shares across all content

**Total Engagement Formula:**
```
totalEngagement = totalLikes + totalComments + totalShares
```

- **engagementRate**: Percentage calculated as `(totalEngagement / views) × 100`

### Content Stats
- **postsCreated**: Number of new posts published
- **reelsUploaded**: Number of new reels uploaded
- **scriptsShared**: Number of scripts made public

### Network Stats
- **newConnections**: New connections accepted
- **connectionRequests**: Pending connection requests
- **messagesReceived**: New messages received

### Top Content
Array of top-performing content items:
- **id**: Content ID
- **type**: `post` | `reel` | `script`
- **title**: Content title
- **views**: Number of views
- **likes**: Number of likes
- **comments**: Number of comments

---

## Caching Strategy

### Response Caching

The endpoint returns cache headers to optimize performance:

```
Cache-Control: private, max-age=60
Vary: Authorization
```

**Explanation:**
- `private`: Response is specific to the user, don't cache in CDN
- `max-age=60`: Cache for 1 minute (60 seconds) - short cache for minimal data
- `Vary: Authorization`: Cache varies by auth token

### Client-Side Caching

Frontend should respect cache headers:

```javascript
// Fetch with cache support (default 7d range)
const response = await fetch(
  `/dashboard/stats?userId=${userId}&range=7d`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
)
```

### Backend Caching (Future Enhancement)

Consider implementing server-side caching for expensive queries:

**Option 1: In-Memory Cache (Redis)**
```javascript
// Pseudocode
const cacheKey = `stats:${userId}:${range}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

const stats = await calculateStats(userId, range)
await redis.setex(cacheKey, 60, JSON.stringify(stats))  // 1 minute cache
return stats
```

**Option 2: Database Materialized Views**
- Pre-compute daily aggregates
- Query from aggregated tables instead of raw data
- Refresh views nightly or on-demand

---

## Time Range Considerations

### Data Scaling

Statistics scale based on time range:

| Range | Multiplier | Example Views |
|-------|-----------|---------------|
| 7d    | 0.25x     | 300-500       |
| 30d   | 1x        | 1000-2000     |
| 90d   | 3x        | 3000-6000     |
| all   | 10x       | 10000-20000   |

### Performance Notes

- **7d**: Fast query, minimal data (default, recommended)
- **30d**: Moderate data size
- **90d**: Slower query, more data processing
- **all**: May require pagination for large datasets

**Default Behavior:**
- Default range is 7 days to minimize data transfer and server processing
- Short 1-minute cache reduces server load while keeping data fresh
- Optimal for dashboard widgets that need frequent updates

---

## Integration with Frontend

### Fetching Statistics

```javascript
// Fetch dashboard stats
async function getDashboardStats(userId, range = '30d') {
  const response = await fetch(
    `/dashboard/stats?userId=${userId}&range=${range}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  )
  
  if (!response.ok) {
    const { error } = await response.json()
    throw new Error(error.message)
  }
  
  return response.json()
}

// Usage
const { stats } = await getDashboardStats('user_123', '30d')
console.log('Profile views:', stats.profile.views)
```

### Using with React

```javascript
import { useState, useEffect } from 'react'

function DashboardStats({ userId }) {
  const [stats, setStats] = useState(null)
  const [range, setRange] = useState('30d')
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      try {
        const { stats } = await getDashboardStats(userId, range)
        setStats(stats)
      } catch (error) {
        console.error('Failed to load stats:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [userId, range])
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      <select value={range} onChange={e => setRange(e.target.value)}>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
        <option value="all">All time</option>
      </select>
      
      <div>
        <h3>Profile Views: {stats.profile.views}</h3>
        <p>Trend: {stats.profile.viewTrend}</p>
      </div>
      
      <div>
        <h3>Engagement</h3>
        <p>Likes: {stats.engagement.totalLikes}</p>
        <p>Comments: {stats.engagement.totalComments}</p>
        <p>Rate: {stats.engagement.engagementRate}</p>
      </div>
    </div>
  )
}
```

### Caching in React

```javascript
// Use React Query for automatic caching
import { useQuery } from '@tanstack/react-query'

function useDashboardStats(userId, range = '7d') {
  return useQuery({
    queryKey: ['dashboard-stats', userId, range],
    queryFn: () => getDashboardStats(userId, range),
    staleTime: 1 * 60 * 1000, // 1 minute (matches server cache)
    cacheTime: 5 * 60 * 1000, // 5 minutes
  })
}
```

---

## Database Queries (Future Implementation)

### Profile Views Query
```sql
SELECT 
  COUNT(*) as views,
  COUNT(DISTINCT visitor_id) as unique_visitors
FROM profile_views
WHERE profile_id = $1
  AND viewed_at >= NOW() - INTERVAL '30 days'
```

### Engagement Query
```sql
SELECT 
  SUM(likes_count) as total_likes,
  SUM(comments_count) as total_comments,
  SUM(shares_count) as total_shares
FROM content_engagement
WHERE user_id = $1
  AND created_at >= NOW() - INTERVAL '30 days'
```

### Top Content Query
```sql
SELECT 
  id,
  type,
  title,
  views,
  likes,
  comments
FROM (
  SELECT *, 'post' as type FROM posts WHERE author_id = $1
  UNION ALL
  SELECT *, 'reel' as type FROM reels WHERE author_id = $1
  UNION ALL
  SELECT *, 'script' as type FROM scripts WHERE author_id = $1
) content
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY views DESC
LIMIT 5
```

---

## Future Enhancements

### Pagination

For large datasets, add pagination:
```javascript
GET /dashboard/stats?userId=user_123&range=all&page=1&limit=10
```

### Comparison Mode

Compare periods:
```javascript
GET /dashboard/stats?userId=user_123&range=30d&compare=true
// Returns current period vs previous period
```

### Export Stats

Download as CSV/PDF:
```javascript
GET /dashboard/stats/export?userId=user_123&range=30d&format=csv
```

### Real-time Updates

WebSocket support for live stats:
```javascript
ws://localhost:5000/dashboard/stats?userId=user_123
```

### Custom Date Ranges

Allow custom start/end dates:
```javascript
GET /dashboard/stats?userId=user_123&start=2025-01-01&end=2025-01-31
```

---

## Testing

### Manual Testing

Test default range:
```bash
curl "http://localhost:5000/dashboard/stats?userId=user_123"
```

Test different ranges:
```bash
curl "http://localhost:5000/dashboard/stats?userId=user_123&range=7d"
curl "http://localhost:5000/dashboard/stats?userId=user_123&range=90d"
curl "http://localhost:5000/dashboard/stats?userId=user_123&range=all"
```

Test invalid range (should return 400):
```bash
curl "http://localhost:5000/dashboard/stats?userId=user_123&range=invalid"
```

Test missing userId (should return 400):
```bash
curl "http://localhost:5000/dashboard/stats"
```

### Contract Tests

Contract tests are located in `server/src/routes/__tests__/dashboard.test.js`

Run tests:
```bash
cd server
npm test -- dashboard.test.js
```

---

## Notes

- Currently returns mock data for development
- `userId` query param is temporary - will use auth token in production
- Cache headers optimize performance (5-minute cache)
- Statistics scale based on time range
- Consider implementing database indexes for performance
- All time queries may need pagination for active users
