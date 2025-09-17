import { Router } from 'express'
const router = Router()

// Very simple stub auth: accepts any email/password, returns a token + user
router.post('/login', (req, res) => {
  const { email } = req.body || {}
  const role = /observer/i.test(email) ? 'observer' : 'artist'
  const user = {
    id: 'user_123',
    email: email || 'demo@valine.app',
    name: 'Valine User',
    role
  }
  return res.json({
    token: 'dev-token',
    user
  })
})

// GET /auth/me — returns a stub user if an Authorization header is present
router.get('/me', (req, res) => {
  const auth = req.header('authorization') || ''
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' })
  const user = {
    id: 'user_123',
    email: 'demo@valine.app',
    name: 'Valine User',
    role: 'artist'
  }
  return res.json({ user })
})

export default router
