/**
 * Cache Layer Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as cache from '../index.js'

describe('Cache Layer', () => {
  beforeEach(() => {
    // Set cache enabled for tests
    process.env.CACHE_ENABLED = 'true'
    cache.resetMetrics()
  })

  afterEach(async () => {
    await cache.close()
    delete process.env.CACHE_ENABLED
    delete process.env.REDIS_URL
  })

  describe('In-Memory Cache', () => {
    it('should set and get values', async () => {
      await cache.initCache()
      
      const key = 'test:key'
      const value = { foo: 'bar', count: 123 }
      
      await cache.set(key, value, 60)
      const retrieved = await cache.get(key)
      
      expect(retrieved).toEqual(value)
    })

    it('should return null for non-existent keys', async () => {
      await cache.initCache()
      
      const retrieved = await cache.get('non:existent:key')
      expect(retrieved).toBeNull()
    })

    it('should delete keys', async () => {
      await cache.initCache()
      
      const key = 'test:delete'
      await cache.set(key, { data: 'test' }, 60)
      
      let retrieved = await cache.get(key)
      expect(retrieved).toBeTruthy()
      
      await cache.del(key)
      retrieved = await cache.get(key)
      expect(retrieved).toBeNull()
    })

    it('should support pattern deletion', async () => {
      await cache.initCache()
      
      await cache.set('search:v1:test1:page:1', { results: [] }, 60)
      await cache.set('search:v1:test2:page:1', { results: [] }, 60)
      await cache.set('profile:v1:user123:summary', { id: 'user123' }, 60)
      
      await cache.del('search:v1:*')
      
      const search1 = await cache.get('search:v1:test1:page:1')
      const search2 = await cache.get('search:v1:test2:page:1')
      const profile = await cache.get('profile:v1:user123:summary')
      
      expect(search1).toBeNull()
      expect(search2).toBeNull()
      expect(profile).toBeTruthy()
    })

    it('should track cache hits and misses', async () => {
      await cache.initCache()
      cache.resetMetrics()
      
      const key = 'test:metrics'
      
      // Miss
      await cache.get(key)
      let metrics = cache.getMetrics()
      expect(metrics.hits).toBe(0)
      expect(metrics.misses).toBe(1)
      
      // Set and hit
      await cache.set(key, { data: 'test' }, 60)
      await cache.get(key)
      
      metrics = cache.getMetrics()
      expect(metrics.hits).toBe(1)
      expect(metrics.misses).toBe(1)
      expect(metrics.total).toBe(2)
      expect(metrics.hitRatio).toBe(0.5)
    })

    it('should respect TTL expiration', async () => {
      await cache.initCache()
      
      const key = 'test:ttl'
      const value = { data: 'expires' }
      
      // Set with 1 second TTL
      await cache.set(key, value, 1)
      
      let retrieved = await cache.get(key)
      expect(retrieved).toEqual(value)
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      retrieved = await cache.get(key)
      expect(retrieved).toBeNull()
    })

    it('should not cache when CACHE_ENABLED is false', async () => {
      process.env.CACHE_ENABLED = 'false'
      await cache.initCache()
      
      const key = 'test:disabled'
      await cache.set(key, { data: 'test' }, 60)
      const retrieved = await cache.get(key)
      
      expect(retrieved).toBeNull()
    })

    it('should calculate hit ratio correctly', async () => {
      await cache.initCache()
      cache.resetMetrics()
      
      const key = 'test:ratio'
      await cache.set(key, { data: 'test' }, 60)
      
      // 3 hits, 2 misses
      await cache.get(key)
      await cache.get(key)
      await cache.get(key)
      await cache.get('nonexistent1')
      await cache.get('nonexistent2')
      
      const metrics = cache.getMetrics()
      expect(metrics.hits).toBe(3)
      expect(metrics.misses).toBe(2)
      expect(metrics.total).toBe(5)
      expect(metrics.hitRatio).toBe(0.6)
    })
  })

  describe('Cache Metrics', () => {
    it('should return correct metrics structure', async () => {
      await cache.initCache()
      
      const metrics = cache.getMetrics()
      
      expect(metrics).toHaveProperty('hits')
      expect(metrics).toHaveProperty('misses')
      expect(metrics).toHaveProperty('total')
      expect(metrics).toHaveProperty('hitRatio')
      expect(metrics).toHaveProperty('cacheType')
      expect(metrics.cacheType).toBe('memory')
    })

    it('should reset metrics', async () => {
      await cache.initCache()
      
      await cache.set('key1', { data: 1 }, 60)
      await cache.get('key1')
      await cache.get('key2')
      
      let metrics = cache.getMetrics()
      expect(metrics.total).toBeGreaterThan(0)
      
      cache.resetMetrics()
      metrics = cache.getMetrics()
      expect(metrics.hits).toBe(0)
      expect(metrics.misses).toBe(0)
      expect(metrics.total).toBe(0)
    })
  })
})
