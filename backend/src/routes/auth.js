import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'
import { verifyPassword } from '../password.js'
import { asyncHandler } from '../asyncHandler.js'

export const router = Router()

// POST /api/auth/login { username, password } — 公開，驗證帳密後發一個 7 天效期的 JWT
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: '需要 username 和 password' })
  }

  const { rows } = await pool.query(
    'SELECT id, password_hash FROM teachers WHERE username = $1',
    [username]
  )
  const teacher = rows[0]
  if (!teacher || !(await verifyPassword(password, teacher.password_hash))) {
    return res.status(401).json({ error: '帳號或密碼錯誤' })
  }

  const token = jwt.sign({ teacherId: teacher.id, username }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  })
  res.json({ token })
}))
