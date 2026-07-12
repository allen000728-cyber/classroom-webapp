import './env.js'

import express from 'express'
import cors from 'cors'
import { router as authRouter } from './routes/auth.js'
import { router as studentsRouter } from './routes/students.js'
import { router as dayRouter } from './routes/day.js'
import { router as assignmentsRouter } from './routes/assignments.js'
import { router as notesRouter } from './routes/notes.js'

const app = express()

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
