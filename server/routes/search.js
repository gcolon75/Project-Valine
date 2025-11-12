import { Router } from 'express'
import { store } from '../db/store.js'
import * as cache from '../src/cache/index.js'
import { normalizeSearchQuery, getSearchCacheKey } from '../src/cache/profileSummary.js'

const r = Router()

r.get('/', async (req, res) => {
  const query = req.query.q || ''
  const page = parseInt(req.query.page || '1', 10)
  const bypassCache = req.headers['x-cache-bypass'] === 'true'
  const startTime = Date.now()
  
  let results = null
  let cacheHit = false
  
  try {
    // Try cache first (unless bypassing)
    if (!bypassCache && query) {
      const cacheKey = getSearchCacheKey(query, page)
      const cached = await cache.get(cacheKey)
      
      if (cached) {
        results = cached
        cacheHit = true
      }
    }
    
    // Fetch from store if not in cache
    if (!results) {
      const q = query.toLowerCase()
      const list = [
        ...store.scripts.map(s => ({ id: s.id, kind: 'script', title: s.title })),
        ...store.auditions.map(a => ({ id: a.id, kind: 'audition', title: a.title }))
      ]
      
      const filteredResults = list.filter(x => x.title.toLowerCase().includes(q))
      
      results = {
        results: filteredResults,
        resultCount: filteredResults.length,
        page,
        query: query,
        createdAt: new Date().toISOString()
      }
      
      // Cache results if not bypassing and within cacheable page limit
      const maxCachePages = parseInt(process.env.CACHE_MAX_SEARCH_PAGES || '3', 10)
      if (!bypassCache && query && page <= maxCachePages) {
        const ttl = parseInt(process.env.CACHE_TTL_SEARCH || '60', 10)
        const cacheKey = getSearchCacheKey(query, page)
        await cache.set(cacheKey, results, ttl)
      }
    }
    
    const duration = Date.now() - startTime
    
    // Add cache metrics to response headers (for observability)
    if (process.env.CACHE_ENABLED === 'true') {
      res.setHeader('X-Cache-Hit', cacheHit ? 'true' : 'false')
      res.setHeader('X-Response-Time', `${duration}ms`)
    }
    
    res.json(results.results || results)
  } catch (error) {
    console.error('Error in search:', error)
    // Fallback to basic search on error
    const q = query.toLowerCase()
    const list = [
      ...store.scripts.map(s => ({ id: s.id, kind: 'script', title: s.title })),
      ...store.auditions.map(a => ({ id: a.id, kind: 'audition', title: a.title }))
    ]
    res.json(list.filter(x => x.title.toLowerCase().includes(q)))
  }
})

export default r

