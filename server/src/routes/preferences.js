import { Router } from 'express'
import { validateTheme, createError } from '../utils/validators.js'

const router = Router()

/**
 * GET /preferences/:userId
 * Get user preferences including theme
 */
router.get('/:userId', (req, res) => {
  const { userId } = req.params
  
  // TODO: Replace with actual database lookup
  // For now, return mock data
  const preferences = {
    theme: 'light', // 'light' | 'dark' | null (system default)
  }
  
  return res.json({ preferences })
})

/**
 * PATCH /preferences/:userId
 * Update user preferences
 * Body: { theme?: 'light' | 'dark' }
 */
router.patch('/:userId', (req, res) => {
  const { userId } = req.params
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
  
  // TODO: Replace with actual database update
  // For now, return success
  const updatedPreferences = {
    theme: theme || null,
  }
  
  return res.json({ 
    success: true,
    preferences: updatedPreferences 
  })
})

export default router
