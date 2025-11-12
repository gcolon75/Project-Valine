/**
 * Cache Metrics Route
 * Provides observability into cache performance
 */

import { Router } from 'express'
import { getMetrics } from '../cache/index.js'

const router = Router()

/**
 * GET /api/cache/metrics
 * Get cache performance metrics
 * Returns hit/miss counts, hit ratio, and cache type
 */
router.get('/metrics', (req, res) => {
  const cacheEnabled = process.env.CACHE_ENABLED === 'true'
  
  if (!cacheEnabled) {
    return res.json({
      enabled: false,
      message: 'Caching is disabled'
    })
  }
  
  const metrics = getMetrics()
  
  res.json({
    enabled: true,
    metrics,
    timestamp: new Date().toISOString()
  })
})

export default router
