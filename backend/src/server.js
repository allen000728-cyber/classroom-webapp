import './env.js'

import express from 'express'
import cors from 'cors'
import { router as authRouter } from './routes/auth.js'
import { router as studentsRouter } from './routes/students.js'
import { router as dayRouter } from './routes/day.js'
import { router as assignmentsRouter } from './routes/assignments.js'
import { router as notesRouter } from './routes/notes.js'

const app = express()

// Render's traffic passes through more than one hop of infra proxy (their own
// edge is Cloudflare-backed) before reaching this app, and the exact hop count
// isn't documented/guaranteed. trust proxy:1 was tested in production and
// resolved req.ip to Cloudflare's own edge IP (a different one per request)
// instead of the real client — trusting the whole XFF chain and taking the
// left-most entry actually gets the real client IP here.
app.set('trust proxy', true)

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api/auth', authRouter)
app.use('/api/students', studentsRouter)
app.use('/api/day', dayRouter)
app.use('/api/assignments', assignmentsRouter)
app.use('/api/notes', notesRouter)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: '伺服器錯誤' })
})

const port = process.env.PORT || 3001
app.listen(port, () => console.log(`API listening on http://localhost:${port}`))
