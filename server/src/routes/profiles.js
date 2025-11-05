import { Router } from 'express'
import { validateUrl, validateStringLength, createError, sanitizeString } from '../utils/validators.js'

const router = Router()

// Valid social link keys
const VALID_SOCIAL_LINKS = ['website', 'instagram', 'imdb', 'linkedin', 'showreel']

/**
 * GET /profiles/:userId
 * Get user profile including title, headline, and social links
 */
router.get('/:userId', (req, res) => {
  const { userId } = req.params
  
  // TODO: Replace with actual database lookup
  // For now, return mock data
  const profile = {
    userId,
    vanityUrl: 'demo-user',
    headline: 'Voice Actor - Classical & Contemporary',
    title: 'Senior Voice Actor',
    bio: 'Experienced voice actor specializing in character work and commercial voice-over.',
    socialLinks: {
      website: 'https://example.com',
      instagram: 'https://instagram.com/demouser',
      imdb: 'https://imdb.com/name/nm1234567',
      linkedin: 'https://linkedin.com/in/demouser',
      showreel: 'https://example.com/reel'
    }
  }
  
  return res.json({ profile })
})

/**
 * PATCH /profiles/:userId
 * Update user profile including title, headline, and social links
 * Body: { 
 *   title?: string,
 *   headline?: string,
 *   socialLinks?: { website?, instagram?, imdb?, linkedin?, showreel? }
 * }
 */
router.patch('/:userId', (req, res) => {
  const { userId } = req.params
  const { title, headline, socialLinks } = req.body || {}
  
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
  
  // Validate socialLinks
  if (socialLinks !== undefined && socialLinks !== null) {
    if (typeof socialLinks !== 'object' || Array.isArray(socialLinks)) {
      return res.status(400).json(
        createError('INVALID_SOCIAL_LINKS', 'socialLinks must be an object', {
          field: 'socialLinks',
          type: typeof socialLinks
        })
      )
    }
    
    // Validate each social link URL
    for (const [key, url] of Object.entries(socialLinks)) {
      // Check if key is valid
      if (!VALID_SOCIAL_LINKS.includes(key)) {
        return res.status(400).json(
          createError('INVALID_SOCIAL_LINK_KEY', `Invalid social link key: ${key}`, {
            field: `socialLinks.${key}`,
            validKeys: VALID_SOCIAL_LINKS
          })
        )
      }
      
      // Skip validation if URL is null or empty (allows removal)
      if (!url) continue
      
      // Validate URL format and protocol
      const urlValidation = validateUrl(url)
      if (!urlValidation.valid) {
        return res.status(400).json(
          createError('INVALID_URL', urlValidation.error, {
            field: `socialLinks.${key}`,
            value: url
          })
        )
      }
    }
  }
  
  // TODO: Replace with actual database update
  // For now, return success
  const updatedProfile = {
    userId,
    ...(title !== undefined && { title: sanitizeString(title) }),
    ...(headline !== undefined && { headline: sanitizeString(headline) }),
    ...(socialLinks && { socialLinks })
  }
  
  return res.json({ 
    success: true,
    profile: updatedProfile 
  })
})

export default router
