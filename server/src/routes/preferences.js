import { Router } from 'express'
import { validateTheme, createError } from '../utils/validators.js'
import { requireAuth } from '../utils/auth.js'
import { getPrisma } from '../utils/db.js'

const router = Router()

/**
 * GET /api/me/preferences
 * Get authenticated user's preferences including theme
 * Requires authentication
 */
router.get('/me/preferences', requireAuth, async (req, res) => {
  try {
    const prisma = getPrisma()
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { theme: true }
    })
    
    if (!user) {
      return res.status(404).json(
        createError('USER_NOT_FOUND', 'User not found', {})
      )
    }
    
    return res.json({ 
      theme: user.theme 
    })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return res.status(500).json(
      createError('INTERNAL_ERROR', 'Failed to fetch preferences', {})
    )
  }
})

/**
 * PATCH /api/me/preferences
 * Update authenticated user's preferences
 * Body: { theme: 'light' | 'dark' }
 * Requires authentication
 */
router.patch('/me/preferences', requireAuth, async (req, res) => {
  const { theme } = req.body || {}
  
  // Validate theme value
  const validation = validateTheme(theme)
  if (!validation.valid) {
    return res.status(400).json(
      createError('INVALID_THEME', validation.error, {
        field: 'theme',
        value: theme,
        allowedValues: ['light', 'dark']
      })
    )
  }
  
  try {
    const prisma = getPrisma()
    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: { theme: theme || null },
      select: { theme: true }
    })
    
    return res.json({ 
      theme: updatedUser.theme 
    })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return res.status(500).json(
      createError('INTERNAL_ERROR', 'Failed to update preferences', {})
    )
  }
})

export default router
