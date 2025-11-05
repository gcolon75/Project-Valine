import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

// Import security middleware
import { applySecurity } from './middleware/security.js'
import { setCSRFToken } from './middleware/csrf.js'

// Import routes
import authRouter from './routes/auth.js'
import authSecurityRouter from './routes/authSecurity.js'
import twoFactorRouter from './routes/twoFactor.js'
import privacyRouter from './routes/privacy.js'
import healthRouter from './routes/health.js'
import preferencesRouter from './routes/preferences.js'
import profilesRouter from './routes/profiles.js'
import dashboardRouter from './routes/dashboard.js'

const app = express()

const PORT = process.env.PORT || 5000
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'

// Apply security headers first
applySecurity(app)

// CORS configuration
app.use(cors({ origin: ORIGIN, credentials: true }))

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Logging
app.use(morgan('dev'))

// CSRF token generation for safe requests
app.use(setCSRFToken)

// Health check (no auth required)
app.use('/health', healthRouter)

// Original auth routes (legacy, for backward compatibility)
app.use('/auth', authRouter)

// Enhanced security routes
app.use('/auth', authSecurityRouter)
app.use('/api/2fa', twoFactorRouter)
app.use('/api/privacy', privacyRouter)

// Application routes
app.use('/api', preferencesRouter)
app.use('/profiles', profilesRouter)
app.use('/dashboard', dashboardRouter)

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    ok: true, 
    name: 'Project Valine API',
    security: {
      csrfEnabled: process.env.CSRF_ENABLED === 'true',
      sessionTracking: process.env.USE_SESSION_TRACKING === 'true',
      twoFactorEnabled: process.env.FEATURE_2FA_ENABLED === 'true'
    }
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? 'An error occurred' 
      : err.message
  })
})

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`Security features:`)
  console.log(`  - CSRF Protection: ${process.env.CSRF_ENABLED === 'true' ? 'enabled' : 'disabled'}`)
  console.log(`  - Session Tracking: ${process.env.USE_SESSION_TRACKING === 'true' ? 'enabled' : 'disabled'}`)
  console.log(`  - 2FA: ${process.env.FEATURE_2FA_ENABLED === 'true' ? 'enabled' : 'disabled'}`)
  console.log(`  - Email Sending: ${process.env.EMAIL_ENABLED === 'true' ? 'enabled' : 'disabled (dev mode)'}`)
})
