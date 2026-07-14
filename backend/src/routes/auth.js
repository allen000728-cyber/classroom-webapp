import { Router } from 'express'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { pool } from '../db.js'
import { verifyPassword, hashPassword } from '../password.js'
import { asyncHandler } from '../asyncHandler.js'

export const router = Router()

// 帳號不存在時也要跑一次密碼驗證，讓「帳號存在但密碼錯」跟「帳號根本不存在」
// 兩種情況的回應時間一樣，不會被拿來側錄猜帳號。內容不重要，反正永遠不會真的用來登入。
const DUMMY_HASH = await hashPassword('not-a-real-account-' + Math.random())

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '嘗試登入次數過多，請稍後再試' },
})

// POST /api/auth/login { username, password } — 公開，驗證帳密後發一個 7 天效期的 JWT
// 先查 teachers，查不到再查 parents（一個帳號只會是其中一種身份）
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: '需要 username 和 password' })
  }

  const teacherRes = await pool.query(
    'SELECT id, password_hash FROM teachers WHERE username = $1',
    [username]
  )
  const teacher = teacherRes.rows[0]

  let parent = null
  if (!teacher) {
    const parentRes = await pool.query(
      `SELECT p.id, p.password_hash, s.id AS student_id, s.seat_no
       FROM parents p JOIN students s ON s.id = p.student_id
       WHERE p.username = $1`,
      [username]
    )
    parent = parentRes.rows[0] ?? null
  }

  const account = teacher || parent
  const passwordOk = await verifyPassword(password, account ? account.password_hash : DUMMY_HASH)

  if (!account || !passwordOk) {
    return res.status(401).json({ error: '帳號或密碼錯誤' })
  }

  if (teacher) {
    const token = jwt.sign(
      { role: 'teacher', teacherId: teacher.id, username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    return res.json({ token, role: 'teacher' })
  }

  const token = jwt.sign(
    { role: 'parent', parentId: parent.id, studentId: parent.student_id, username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
  res.json({ token, role: 'parent', seatNo: parent.seat_no })
}))
