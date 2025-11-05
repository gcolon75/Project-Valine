import { Router } from 'express'
import { createError } from '../utils/validators.js'

const router = Router()

// Valid time ranges
const VALID_RANGES = ['7d', '30d', '90d', 'all']

/**
 * GET /dashboard/stats
 * Get dashboard statistics for a user
 * Query params: 
 *   - range: '7d' | '30d' | '90d' | 'all' (default: '30d')
 *   - userId: User ID (required for now, will come from auth later)
 */
router.get('/stats', (req, res) => {
  const { range = '30d', userId } = req.query
  
  // Validate userId (temporary - will come from auth token later)
  if (!userId) {
    return res.status(400).json(
      createError('MISSING_USER_ID', 'userId query parameter is required', {
        field: 'userId',
        note: 'This will be extracted from auth token in production'
      })
    )
  }
  
  // Validate range
  if (!VALID_RANGES.includes(range)) {
    return res.status(400).json(
      createError('INVALID_RANGE', `Range must be one of: ${VALID_RANGES.join(', ')}`, {
        field: 'range',
        value: range,
        allowedValues: VALID_RANGES
      })
    )
  }
  
  // TODO: Replace with actual database queries
  // For now, return mock data
  const stats = {
    range,
    period: getRangePeriod(range),
    profile: {
      views: generateMockValue(range, 150, 2000),
      uniqueVisitors: generateMockValue(range, 80, 1200),
      viewTrend: '+15%'
    },
    engagement: {
      totalLikes: generateMockValue(range, 45, 350),
      totalComments: generateMockValue(range, 12, 120),
      totalShares: generateMockValue(range, 8, 65),
      engagementRate: '12.5%'
    },
    content: {
      postsCreated: generateMockValue(range, 3, 25),
      reelsUploaded: generateMockValue(range, 1, 8),
      scriptsShared: generateMockValue(range, 0, 5)
    },
    network: {
      newConnections: generateMockValue(range, 5, 45),
      connectionRequests: generateMockValue(range, 8, 60),
      messagesReceived: generateMockValue(range, 12, 150)
    },
    topContent: [
      {
        id: 'post_1',
        type: 'post',
        title: 'Voice Acting Tips for Beginners',
        views: 342,
        likes: 28,
        comments: 5
      },
      {
        id: 'reel_1',
        type: 'reel',
        title: 'Character Voice Demo',
        views: 521,
        likes: 45,
        comments: 12
      }
    ]
  }
  
  // Add cache headers
  res.set({
    'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
    'Vary': 'Authorization'
  })
  
  return res.json({ stats })
})

/**
 * Helper function to get human-readable period
 */
function getRangePeriod(range) {
  const periods = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    'all': 'All time'
  }
  return periods[range] || 'Last 30 days'
}

// Range multipliers for scaling mock data
// 7d = ~1 week (0.25x base), 30d = ~1 month (1x base), 90d = ~3 months (3x base), all = ~10x base
const RANGE_MULTIPLIERS = {
  '7d': 0.25,   // One week of activity
  '30d': 1,     // One month baseline
  '90d': 3,     // Three months (3x monthly)
  'all': 10     // All-time (10x monthly)
}

/**
 * Helper function to generate mock values scaled by range
 */
function generateMockValue(range, baseMin, baseMax) {
  const mult = RANGE_MULTIPLIERS[range] || 1
  const min = Math.floor(baseMin * mult)
  const max = Math.floor(baseMax * mult)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export default router
