import express from 'express'

const router = express.Router()

// Feature flag check
const isLegalPagesEnabled = () => {
  return process.env.LEGAL_PAGES_ENABLED !== 'false'
}

/**
 * GET /legal/privacy - Privacy Policy
 * Returns privacy policy metadata for frontend rendering
 */
router.get('/privacy', (req, res) => {
  if (!isLegalPagesEnabled()) {
    return res.status(404).json({ 
      error: 'NOT_FOUND',
      message: 'Legal pages are currently disabled' 
    })
  }

  res.json({
    title: 'Privacy Policy',
    lastUpdated: '2025-11-12',
    version: '1.0.0',
    status: 'MVP - Subject to legal counsel review',
    note: 'This is a minimal viable privacy policy. Formal legal review pending.'
  })
})

/**
 * GET /legal/terms - Terms of Service
 * Returns terms of service metadata for frontend rendering
 */
router.get('/terms', (req, res) => {
  if (!isLegalPagesEnabled()) {
    return res.status(404).json({ 
      error: 'NOT_FOUND',
      message: 'Legal pages are currently disabled' 
    })
  }

  res.json({
    title: 'Terms of Service',
    lastUpdated: '2025-11-12',
    version: '1.0.0',
    status: 'MVP - Subject to legal counsel review',
    note: 'This is a minimal viable terms of service. Formal legal review pending.'
  })
})

/**
 * GET /legal/cookies - Cookie & Session Disclosure
 * Returns cookie policy metadata for frontend rendering
 */
router.get('/cookies', (req, res) => {
  if (!isLegalPagesEnabled()) {
    return res.status(404).json({ 
      error: 'NOT_FOUND',
      message: 'Legal pages are currently disabled' 
    })
  }

  res.json({
    title: 'Cookie & Session Disclosure',
    lastUpdated: '2025-11-12',
    version: '1.0.0',
    status: 'MVP - Subject to legal counsel review',
    note: 'This is a minimal viable cookie disclosure. Formal legal review pending.'
  })
})

export default router
