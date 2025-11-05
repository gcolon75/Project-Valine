import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

import authRouter from './routes/auth.js'
import healthRouter from './routes/health.js'
import preferencesRouter from './routes/preferences.js'

const app = express()

const PORT = process.env.PORT || 5000
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'

app.use(cors({ origin: ORIGIN, credentials: true }))
app.use(express.json())
app.use(morgan('dev'))

app.use('/auth', authRouter)
app.use('/health', healthRouter)
app.use('/preferences', preferencesRouter)

app.get('/', (req, res) => {
  res.json({ ok: true, name: 'Project Valine API' })
})

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
