/**
 * ETag middleware for caching support
 * Generates ETags based on response content and handles If-None-Match headers
 */

import crypto from 'crypto'

/**
 * Generate ETag from content
 * @param {string|object} content - Content to generate ETag from
 * @returns {string} ETag value
 */
function generateETag(content) {
  const str = typeof content === 'string' ? content : JSON.stringify(content)
  return `"${crypto.createHash('md5').update(str).digest('hex')}"`
}

/**
 * ETag middleware
 * Adds ETag header to responses and checks If-None-Match for 304 responses
 * 
 * @param {object} options - Configuration options
 * @param {number} options.maxAge - Cache-Control max-age in seconds (default: 300)
 * @returns {Function} Express middleware
 */
export function etagMiddleware(options = {}) {
  const { maxAge = 300 } = options

  return (req, res, next) => {
    // Only apply to GET and HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next()
    }

    // Store original json method
    const originalJson = res.json.bind(res)

    // Override json method to add ETag
    res.json = function(data) {
      // Generate ETag from response data
      const etag = generateETag(data)

      // Set ETag header
      res.set('ETag', etag)

      // Set Cache-Control header
      res.set('Cache-Control', `public, max-age=${maxAge}`)

      // Check If-None-Match header
      const ifNoneMatch = req.get('If-None-Match')
      if (ifNoneMatch && ifNoneMatch === etag) {
        // Content hasn't changed, return 304 Not Modified
        return res.status(304).end()
      }

      // Return response with data
      return originalJson(data)
    }

    next()
  }
}

export default etagMiddleware
