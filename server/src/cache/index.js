/**
 * Cache Layer
 * Provides Redis-based caching with in-memory fallback
 * Includes instrumentation for cache hit/miss metrics
 */

import { createClient } from 'redis'

// Cache metrics
const metrics = {
  hits: 0,
  misses: 0
}

// In-memory fallback cache
const memoryCache = new Map()

// Redis client instance
let redisClient = null
let isRedisConnected = false

/**
 * Initialize cache client
 * Connects to Redis if REDIS_URL is provided, otherwise uses in-memory fallback
 */
async function initCache() {
  const cacheEnabled = process.env.CACHE_ENABLED === 'true'
  const redisUrl = process.env.REDIS_URL

  if (!cacheEnabled) {
    console.log('[Cache] Caching is disabled (CACHE_ENABLED=false)')
    return
  }

  if (redisUrl) {
    try {
      redisClient = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.error('[Cache] Redis reconnection failed after 3 retries, falling back to in-memory cache')
              isRedisConnected = false
              return new Error('Redis connection failed')
            }
            return Math.min(retries * 100, 3000)
          }
        }
      })

      redisClient.on('error', (err) => {
        console.error('[Cache] Redis error:', err.message)
        isRedisConnected = false
      })

      redisClient.on('connect', () => {
        console.log('[Cache] Redis connected')
        isRedisConnected = true
      })

      redisClient.on('disconnect', () => {
        console.log('[Cache] Redis disconnected')
        isRedisConnected = false
      })

      await redisClient.connect()
      console.log('[Cache] Redis cache initialized')
    } catch (error) {
      console.error('[Cache] Failed to initialize Redis, using in-memory cache:', error.message)
      redisClient = null
      isRedisConnected = false
    }
  } else {
    console.warn('[Cache] REDIS_URL not provided, using in-memory cache (not recommended for production)')
  }

  console.log('[Cache] Cache layer initialized')
}

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached value or null if not found
 */
async function get(key) {
  const cacheEnabled = process.env.CACHE_ENABLED === 'true'
  
  if (!cacheEnabled) {
    return null
  }

  try {
    let value = null

    if (isRedisConnected && redisClient) {
      const rawValue = await redisClient.get(key)
      if (rawValue) {
        value = JSON.parse(rawValue)
      }
    } else {
      // Fallback to in-memory cache
      const cached = memoryCache.get(key)
      if (cached && (!cached.expiresAt || cached.expiresAt > Date.now())) {
        value = cached.value
      } else if (cached) {
        // Remove expired entry
        memoryCache.delete(key)
      }
    }

    if (value !== null) {
      metrics.hits++
      return value
    } else {
      metrics.misses++
      return null
    }
  } catch (error) {
    console.error('[Cache] Error getting key:', key, error.message)
    metrics.misses++
    return null
  }
}

/**
 * Set value in cache with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (will be JSON serialized)
 * @param {number} ttlSeconds - Time to live in seconds
 * @returns {Promise<boolean>} Success status
 */
async function set(key, value, ttlSeconds = 300) {
  const cacheEnabled = process.env.CACHE_ENABLED === 'true'
  
  if (!cacheEnabled) {
    return false
  }

  try {
    // JSON serialize with stable ordering for consistency
    const serialized = JSON.stringify(value, Object.keys(value).sort())

    if (isRedisConnected && redisClient) {
      await redisClient.setEx(key, ttlSeconds, serialized)
    } else {
      // Fallback to in-memory cache with expiration
      const expiresAt = ttlSeconds > 0 ? Date.now() + (ttlSeconds * 1000) : null
      memoryCache.set(key, { value, expiresAt })
      
      // Enforce max keys limit for in-memory cache
      const maxKeys = parseInt(process.env.CACHE_MAX_KEYS_PROFILE || '1000', 10)
      if (memoryCache.size > maxKeys) {
        // Remove oldest entry (simple FIFO eviction)
        const firstKey = memoryCache.keys().next().value
        memoryCache.delete(firstKey)
      }
    }

    return true
  } catch (error) {
    // Fire-and-forget: log error but don't throw
    console.error('[Cache] Error setting key:', key, error.message)
    return false
  }
}

/**
 * Delete value from cache
 * @param {string} key - Cache key or pattern (for Redis)
 * @returns {Promise<boolean>} Success status
 */
async function del(key) {
  const cacheEnabled = process.env.CACHE_ENABLED === 'true'
  
  if (!cacheEnabled) {
    return false
  }

  try {
    if (isRedisConnected && redisClient) {
      // Support pattern matching for Redis
      if (key.includes('*')) {
        const keys = await redisClient.keys(key)
        if (keys.length > 0) {
          await redisClient.del(keys)
        }
      } else {
        await redisClient.del(key)
      }
    } else {
      // For in-memory cache, delete exact key or pattern
      if (key.includes('*')) {
        // Escape special regex characters except * which we want to use as wildcard
        const escaped = key.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        const pattern = escaped.replace(/\*/g, '.*')
        const regex = new RegExp(`^${pattern}$`)
        const keysToDelete = []
        for (const k of memoryCache.keys()) {
          if (regex.test(k)) {
            keysToDelete.push(k)
          }
        }
        keysToDelete.forEach(k => memoryCache.delete(k))
      } else {
        memoryCache.delete(key)
      }
    }

    return true
  } catch (error) {
    console.error('[Cache] Error deleting key:', key, error.message)
    return false
  }
}

/**
 * Get cache metrics
 * @returns {object} Cache hit/miss metrics and hit ratio
 */
function getMetrics() {
  const total = metrics.hits + metrics.misses
  const hitRatio = total > 0 ? (metrics.hits / total) : 0
  
  return {
    hits: metrics.hits,
    misses: metrics.misses,
    total,
    hitRatio: Math.round(hitRatio * 100) / 100,
    cacheType: isRedisConnected ? 'redis' : 'memory'
  }
}

/**
 * Reset cache metrics
 */
function resetMetrics() {
  metrics.hits = 0
  metrics.misses = 0
}

/**
 * Close cache connection
 */
async function close() {
  if (redisClient && isRedisConnected) {
    await redisClient.quit()
    isRedisConnected = false
  }
  memoryCache.clear()
}

export {
  initCache,
  get,
  set,
  del,
  getMetrics,
  resetMetrics,
  close
}
