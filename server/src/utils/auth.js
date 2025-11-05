/**
 * Authentication middleware and utilities
 */

/**
 * Middleware to verify authentication and extract user ID from token
 * For this demo implementation, we use a simple Bearer token scheme
 * In production, this would validate JWT tokens and extract user ID
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
export function requireAuth(req, res, next) {
  const authHeader = req.header('authorization') || ''
  
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        details: {
          hint: 'Include Authorization header with Bearer token'
        }
      }
    })
  }
  
  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  
  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing token',
        details: {}
      }
    })
  }
  
  // TODO: In production, validate JWT and extract real userId from token
  // This is a development stub that returns a fixed user ID for testing
  // SECURITY WARNING: This must be replaced before production deployment
  // Example production implementation:
  //   const decoded = jwt.verify(token, process.env.JWT_SECRET)
  //   req.userId = decoded.userId
  req.userId = 'user_123'
  
  next()
}
