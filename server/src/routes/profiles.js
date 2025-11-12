import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import {
  validateUrl,
  validateStringLength,
  createError,
  sanitizeString,
  sanitizeUrl,
  validateProfileLink,
  VALID_LINK_TYPES
} from '../utils/validators.js'
import { etagMiddleware } from '../middleware/etag.js'
import { rateLimitMiddleware } from '../middleware/rateLimit.js'
import * as cache from '../cache/index.js'
import { buildProfileSummary, getProfileCacheKey } from '../cache/profileSummary.js'

const router = Router()
const prisma = new PrismaClient()

// Valid social link keys (kept for backward compatibility)
const VALID_SOCIAL_LINKS = ['website', 'instagram', 'imdb', 'linkedin', 'showreel']

/**
 * GET /profiles/:userId
 * Get user profile including title, headline, and profile links
 * Supports ETag/caching via If-None-Match header
 * Supports cache bypass via X-Cache-Bypass header
 */
router.get('/:userId', etagMiddleware({ maxAge: 300 }), async (req, res) => {
  const { userId } = req.params
  const bypassCache = req.headers['x-cache-bypass'] === 'true'
  const startTime = Date.now()
  
  try {
    let profile = null
    let cacheHit = false

    // Try cache first (unless bypassing)
    if (!bypassCache) {
      const cacheKey = getProfileCacheKey(userId)
      const cached = await cache.get(cacheKey)
      
      if (cached) {
        profile = cached
        cacheHit = true
      }
    }

    // Fetch from database if not in cache
    if (!profile) {
      profile = await prisma.profile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              avatar: true
            }
          },
          links: {
            orderBy: [
              { position: 'asc' },
              { createdAt: 'asc' }
            ]
          }
        }
      })
      
      if (!profile) {
        return res.status(404).json(
          createError('PROFILE_NOT_FOUND', 'Profile not found', {
            userId
          })
        )
      }

      // Build and cache summary
      if (!bypassCache) {
        const summary = buildProfileSummary(profile)
        const ttl = parseInt(process.env.CACHE_TTL_PROFILE || '300', 10)
        const cacheKey = getProfileCacheKey(userId)
        await cache.set(cacheKey, summary, ttl)
        profile = summary
      }
    }
    
    const duration = Date.now() - startTime
    
    // Add cache metrics to response headers (for observability)
    if (process.env.CACHE_ENABLED === 'true') {
      res.setHeader('X-Cache-Hit', cacheHit ? 'true' : 'false')
      res.setHeader('X-Response-Time', `${duration}ms`)
    }
    
    return res.json({ profile })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return res.status(500).json(
      createError('DATABASE_ERROR', 'Failed to fetch profile', {
        message: error.message
      })
    )
  }
})

/**
 * PATCH /profiles/:userId
 * Update user profile including title, headline, and profile links
 * Body: { 
 *   title?: string,
 *   headline?: string,
 *   links?: Array<{ id?: string, label: string, url: string, type: string }>
 * }
 */
router.patch('/:userId', async (req, res) => {
  const { userId } = req.params
  const { title, headline, links } = req.body || {}
  
  try {
    // Validate title
    if (title !== undefined) {
      const titleValidation = validateStringLength(sanitizeString(title), 0, 100, 'title')
      if (!titleValidation.valid) {
        return res.status(400).json(
          createError('INVALID_TITLE', titleValidation.error, {
            field: 'title',
            value: title
          })
        )
      }
    }
    
    // Validate headline
    if (headline !== undefined) {
      const headlineValidation = validateStringLength(sanitizeString(headline), 0, 200, 'headline')
      if (!headlineValidation.valid) {
        return res.status(400).json(
          createError('INVALID_HEADLINE', headlineValidation.error, {
            field: 'headline',
            value: headline
          })
        )
      }
    }
    
    // Validate links if provided
    if (links !== undefined) {
      if (!Array.isArray(links)) {
        return res.status(400).json(
          createError('INVALID_LINKS', 'links must be an array', {
            field: 'links',
            type: typeof links
          })
        )
      }
      
      // Validate each link
      for (let i = 0; i < links.length; i++) {
        const linkValidation = validateProfileLink(links[i])
        if (!linkValidation.valid) {
          return res.status(400).json(
            createError('INVALID_LINK', linkValidation.error, {
              field: `links[${i}].${linkValidation.field}`,
              index: i
            })
          )
        }
      }
      
      // Check max links (reasonable limit)
      if (links.length > 20) {
        return res.status(400).json(
          createError('TOO_MANY_LINKS', 'Maximum 20 links allowed', {
            count: links.length,
            max: 20
          })
        )
      }
    }
    
    // Check if profile exists
    const profile = await prisma.profile.findUnique({
      where: { userId }
    })
    
    if (!profile) {
      return res.status(404).json(
        createError('PROFILE_NOT_FOUND', 'Profile not found', {
          userId
        })
      )
    }
    
    // Start transaction to update profile and links
    const result = await prisma.$transaction(async (tx) => {
      // Update profile fields
      const updateData = {}
      if (title !== undefined) {
        updateData.title = sanitizeString(title) || null
      }
      if (headline !== undefined) {
        updateData.headline = sanitizeString(headline) || null
      }
      
      let updatedProfile = profile
      if (Object.keys(updateData).length > 0) {
        updatedProfile = await tx.profile.update({
          where: { userId },
          data: updateData
        })
      }
      
      // Handle links upsert if provided
      if (links !== undefined) {
        // Delete existing links not in the new set
        const linkIds = links.filter(l => l.id).map(l => l.id)
        await tx.profileLink.deleteMany({
          where: {
            profileId: profile.id,
            ...(linkIds.length > 0 ? { id: { notIn: linkIds } } : {})
          }
        })
        
        // Upsert each link with position
        // Links are processed in order, so array index is used as fallback position
        // This ensures predictable ordering when positions are not explicitly set
        for (let i = 0; i < links.length; i++) {
          const link = links[i]
          const linkData = {
            userId,
            profileId: profile.id,
            label: sanitizeString(link.label),
            url: sanitizeUrl(link.url),
            type: link.type,
            position: link.position !== undefined ? link.position : i
          }
          
          if (link.id) {
            // Update existing link
            await tx.profileLink.update({
              where: { id: link.id },
              data: linkData
            })
          } else {
            // Create new link
            await tx.profileLink.create({
              data: linkData
            })
          }
        }
      }
      
      // Fetch updated profile with links ordered by position
      return await tx.profile.findUnique({
        where: { userId },
        include: {
          links: {
            orderBy: [
              { position: 'asc' },
              { createdAt: 'asc' }
            ]
          }
        }
      })
    })
    
    // Invalidate cache after successful update
    const cacheKey = getProfileCacheKey(userId)
    await cache.del(cacheKey)
    
    // Also invalidate search cache (eventual consistency approach)
    // Delete all search cache entries as profile may appear in search results
    await cache.del('search:v1:*')
    
    return res.json({
      success: true,
      profile: result
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return res.status(500).json(
      createError('DATABASE_ERROR', 'Failed to update profile', {
        message: error.message
      })
    )
  }
})

/**
 * GET /profiles/:userId/links
 * Get all profile links for a user
 * Supports ETag/caching via If-None-Match header
 */
router.get('/:userId/links', etagMiddleware({ maxAge: 300 }), async (req, res) => {
  const { userId } = req.params
  
  try {
    // Check if profile exists
    const profile = await prisma.profile.findUnique({
      where: { userId }
    })
    
    if (!profile) {
      return res.status(404).json(
        createError('PROFILE_NOT_FOUND', 'Profile not found', {
          userId
        })
      )
    }
    
    // Fetch links ordered by position, then createdAt
    const links = await prisma.profileLink.findMany({
      where: { userId },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'asc' }
      ]
    })
    
    return res.json({ links })
  } catch (error) {
    console.error('Error fetching links:', error)
    return res.status(500).json(
      createError('DATABASE_ERROR', 'Failed to fetch links', {
        message: error.message
      })
    )
  }
})

/**
 * POST /profiles/:userId/links
 * Create a new profile link
 * Body: { label: string, url: string, type: string, position?: number }
 * Rate limited: 10 requests per minute per userId
 */
router.post('/:userId/links', rateLimitMiddleware({ windowMs: 60000, maxRequests: 10 }), async (req, res) => {
  const { userId } = req.params
  const { label, url, type, position } = req.body || {}
  
  try {
    // Validate link
    const linkValidation = validateProfileLink({ label, url, type })
    if (!linkValidation.valid) {
      return res.status(400).json(
        createError('INVALID_LINK', linkValidation.error, {
          field: linkValidation.field
        })
      )
    }
    
    // Check if profile exists
    const profile = await prisma.profile.findUnique({
      where: { userId }
    })
    
    if (!profile) {
      return res.status(404).json(
        createError('PROFILE_NOT_FOUND', 'Profile not found', {
          userId
        })
      )
    }
    
    // Check link count
    const linkCount = await prisma.profileLink.count({
      where: { userId }
    })
    
    if (linkCount >= 20) {
      return res.status(400).json(
        createError('TOO_MANY_LINKS', 'Maximum 20 links allowed', {
          count: linkCount,
          max: 20
        })
      )
    }
    
    // Determine position - use provided position or append to end
    const finalPosition = position !== undefined ? position : linkCount
    
    // Create link
    const link = await prisma.profileLink.create({
      data: {
        userId,
        profileId: profile.id,
        label: sanitizeString(label),
        url: sanitizeUrl(url),
        type,
        position: finalPosition
      }
    })
    
    // Invalidate cache after successful link creation
    const cacheKey = getProfileCacheKey(userId)
    await cache.del(cacheKey)
    
    return res.status(201).json({
      success: true,
      link
    })
  } catch (error) {
    console.error('Error creating link:', error)
    return res.status(500).json(
      createError('DATABASE_ERROR', 'Failed to create link', {
        message: error.message
      })
    )
  }
})

/**
 * PATCH /profiles/:userId/links/:linkId
 * Update a profile link
 * Body: { label?: string, url?: string, type?: string, position?: number }
 */
router.patch('/:userId/links/:linkId', async (req, res) => {
  const { userId, linkId } = req.params
  const { label, url, type, position } = req.body || {}
  
  try {
    // Check if link exists and belongs to user
    const existingLink = await prisma.profileLink.findFirst({
      where: {
        id: linkId,
        userId
      }
    })
    
    if (!existingLink) {
      return res.status(404).json(
        createError('LINK_NOT_FOUND', 'Link not found', {
          linkId,
          userId
        })
      )
    }
    
    // Build update data
    const updateData = {}
    if (label !== undefined) {
      const labelValidation = validateStringLength(label, 1, 40, 'label')
      if (!labelValidation.valid) {
        return res.status(400).json(
          createError('INVALID_LABEL', labelValidation.error, {
            field: 'label'
          })
        )
      }
      updateData.label = sanitizeString(label)
    }
    
    if (url !== undefined) {
      if (!url) {
        return res.status(400).json(
          createError('INVALID_URL', 'URL is required', {
            field: 'url'
          })
        )
      }
      const urlValidation = validateUrl(url)
      if (!urlValidation.valid) {
        return res.status(400).json(
          createError('INVALID_URL', urlValidation.error, {
            field: 'url'
          })
        )
      }
      updateData.url = sanitizeUrl(url)
    }
    
    if (type !== undefined) {
      if (!VALID_LINK_TYPES.includes(type)) {
        return res.status(400).json(
          createError('INVALID_TYPE', `Type must be one of: ${VALID_LINK_TYPES.join(', ')}`, {
            field: 'type',
            validTypes: VALID_LINK_TYPES
          })
        )
      }
      updateData.type = type
    }
    
    if (position !== undefined) {
      if (typeof position !== 'number' || position < 0) {
        return res.status(400).json(
          createError('INVALID_POSITION', 'Position must be a non-negative number', {
            field: 'position'
          })
        )
      }
      updateData.position = position
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json(
        createError('NO_UPDATES', 'No valid fields provided for update')
      )
    }
    
    // Update link
    const link = await prisma.profileLink.update({
      where: { id: linkId },
      data: updateData
    })
    
    // Invalidate cache after successful link update
    const cacheKey = getProfileCacheKey(userId)
    await cache.del(cacheKey)
    
    return res.json({
      success: true,
      link
    })
  } catch (error) {
    console.error('Error updating link:', error)
    return res.status(500).json(
      createError('DATABASE_ERROR', 'Failed to update link', {
        message: error.message
      })
    )
  }
})

/**
 * DELETE /profiles/:userId/links/:linkId
 * Delete a profile link
 * Rate limited: 10 requests per minute per userId
 */
router.delete('/:userId/links/:linkId', rateLimitMiddleware({ windowMs: 60000, maxRequests: 10 }), async (req, res) => {
  const { userId, linkId } = req.params
  
  try {
    // Check if link exists and belongs to user
    const existingLink = await prisma.profileLink.findFirst({
      where: {
        id: linkId,
        userId
      }
    })
    
    if (!existingLink) {
      return res.status(404).json(
        createError('LINK_NOT_FOUND', 'Link not found', {
          linkId,
          userId
        })
      )
    }
    
    // Delete link
    await prisma.profileLink.delete({
      where: { id: linkId }
    })
    
    // Invalidate cache after successful link deletion
    const cacheKey = getProfileCacheKey(userId)
    await cache.del(cacheKey)
    
    return res.json({
      success: true,
      message: 'Link deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting link:', error)
    return res.status(500).json(
      createError('DATABASE_ERROR', 'Failed to delete link', {
        message: error.message
      })
    )
  }
})

export default router
