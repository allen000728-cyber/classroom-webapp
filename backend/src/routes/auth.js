import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'
import { verifyPassword } from '../password.js'
import { asyncHandler } from '../asyncHandler.js'

export const router = Router()

// POST /api/auth/login { username, password } — 公開，驗證帳密後發一個 7 天效期的 JWT
// 先查 teachers，查不到再查 parents（一個帳號只會是其中一種身份）
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: '需要 username 和 password' })
  }

  const teacherRes = await pool.query(
    'SELECT id, password_hash FROM teachers WHERE username = $1',
    [username]
  )
  const teacher = teacherRes.rows[0]
  if (teacher && (await verifyPassword(password, teacher.password_hash))) {
    const token = jwt.sign(
      { role: 'teacher', teacherId: teacher.id, username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    return res.json({ token, role: 'teacher' })
  }

  const parentRes = await pool.query(
    `SELECT p.id, p.password_hash, s.id AS student_id, s.seat_no
     FROM parents p JOIN students s ON s.id = p.student_id
     WHERE p.username = $1`,
    [username]
  )
  const parent = parentRes.rows[0]
  if (parent && (await verifyPassword(password, parent.password_hash))) {
    const token = jwt.sign(
      { role: 'parent', parentId: parent.id, studentId: parent.student_id, username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    return res.json({ token, role: 'parent', seatNo: parent.seat_no })
  }

  return res.status(401).json({ error: '帳號或密碼錯誤' })
}))
