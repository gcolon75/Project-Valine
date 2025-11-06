/**
 * Security headers and protection middleware
 */

import helmet from 'helmet'

const isProd = process.env.NODE_ENV === 'production'
const CSP_REPORT_URI = process.env.CSP_REPORT_URI
const CSP_REPORT_ONLY = process.env.CSP_REPORT_ONLY !== 'false' // Report-only by default

/**
 * Configure Content Security Policy
 */
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      ...(isProd ? [] : ["'unsafe-inline'", "'unsafe-eval'"]) // Allow inline scripts in dev
    ],
    styleSrc: ["'self'", "'unsafe-inline'"], // Inline styles often needed for component libraries
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: ["'self'", 'data:'],
    connectSrc: [
      "'self'",
      ...(process.env.API_DOMAINS ? process.env.API_DOMAINS.split(',') : [])
    ],
    mediaSrc: ["'self'", 'https:'],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"]
  },
  reportOnly: CSP_REPORT_ONLY
}

// Add report URI if configured
if (CSP_REPORT_URI) {
  cspConfig.directives.reportUri = [CSP_REPORT_URI]
}

/**
 * Helmet configuration for security headers
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: cspConfig,
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  
  // Remove X-Powered-By header
  hidePoweredBy: true,
  
  // X-DNS-Prefetch-Control
  dnsPrefetchControl: {
    allow: false
  },
  
  // X-Download-Options
  ieNoOpen: true,
  
  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none'
  }
})

/**
 * Middleware to add custom security headers
 */
export function customSecurityHeaders(req, res, next) {
  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  )
  
  // X-XSS-Protection (legacy, but doesn't hurt)
  res.setHeader('X-XSS-Protection', '1; mode=block')
  
  next()
}

/**
 * Combined security middleware
 */
export function applySecurity(app) {
  // Apply helmet security headers
  app.use(securityHeaders)
  
  // Apply custom headers
  app.use(customSecurityHeaders)
}

export default {
  securityHeaders,
  customSecurityHeaders,
  applySecurity
}
