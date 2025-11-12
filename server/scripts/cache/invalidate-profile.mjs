#!/usr/bin/env node
/**
 * Cache Invalidation Script
 * Manual cache invalidation tool for operational support
 * 
 * Usage:
 *   node scripts/cache/invalidate-profile.mjs <userId>
 *   node scripts/cache/invalidate-profile.mjs --all-search
 *   node scripts/cache/invalidate-profile.mjs --all
 */

import 'dotenv/config'
import { createClient } from 'redis'

const args = process.argv.slice(2)

if (args.length === 0) {
  console.log(`
Cache Invalidation Script
Usage:
  node scripts/cache/invalidate-profile.mjs <userId>        - Invalidate specific user profile
  node scripts/cache/invalidate-profile.mjs --all-search    - Invalidate all search caches
  node scripts/cache/invalidate-profile.mjs --all           - Invalidate all caches (WARNING!)
  `)
  process.exit(0)
}

async function invalidateCache() {
  const cacheEnabled = process.env.CACHE_ENABLED === 'true'
  
  if (!cacheEnabled) {
    console.log('[Cache] Caching is disabled (CACHE_ENABLED=false)')
    console.log('[Cache] No action taken.')
    return
  }

  const redisUrl = process.env.REDIS_URL
  
  if (!redisUrl) {
    console.error('[Cache] REDIS_URL not configured. Cannot invalidate in-memory cache remotely.')
    console.error('[Cache] Restart the server to clear in-memory cache.')
    process.exit(1)
  }

  let client
  try {
    console.log('[Cache] Connecting to Redis...')
    client = createClient({ url: redisUrl })
    await client.connect()
    console.log('[Cache] Connected to Redis')

    const command = args[0]

    if (command === '--all') {
      console.log('[Cache] WARNING: Invalidating ALL caches')
      const keys = await client.keys('*')
      if (keys.length > 0) {
        await client.del(keys)
        console.log(`[Cache] Deleted ${keys.length} keys`)
      } else {
        console.log('[Cache] No keys found')
      }
    } else if (command === '--all-search') {
      console.log('[Cache] Invalidating all search caches')
      const keys = await client.keys('search:v1:*')
      if (keys.length > 0) {
        await client.del(keys)
        console.log(`[Cache] Deleted ${keys.length} search cache keys`)
      } else {
        console.log('[Cache] No search cache keys found')
      }
    } else {
      // Treat as userId
      const userId = command
      const profileKey = `profile:v1:${userId}:summary`
      
      console.log(`[Cache] Invalidating profile cache for user: ${userId}`)
      const deleted = await client.del(profileKey)
      
      if (deleted > 0) {
        console.log(`[Cache] Successfully deleted cache key: ${profileKey}`)
      } else {
        console.log(`[Cache] No cache found for key: ${profileKey}`)
      }
      
      // Also invalidate search caches since profile may appear in search
      console.log('[Cache] Also invalidating all search caches...')
      const searchKeys = await client.keys('search:v1:*')
      if (searchKeys.length > 0) {
        await client.del(searchKeys)
        console.log(`[Cache] Deleted ${searchKeys.length} search cache keys`)
      }
    }

    console.log('[Cache] Invalidation complete')
  } catch (error) {
    console.error('[Cache] Error:', error.message)
    process.exit(1)
  } finally {
    if (client) {
      await client.quit()
    }
  }
}

invalidateCache()
