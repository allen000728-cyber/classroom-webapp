import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'
import { verifyPassword, hashPassword } from '../password.js'
import { asyncHandler } from '../asyncHandler.js'
import { loginRateLimiter } from '../rateLimiter.js'

export const router = Router()

// 帳號不存在時也要跑一次密碼驗證，讓「帳號存在但密碼錯」跟「帳號根本不存在」
// 兩種情況的回應時間一樣，不會被拿來側錄猜帳號。內容不重要，反正永遠不會真的用來登入。
const DUMMY_HASH = await hashPassword('not-a-real-account-' + Math.random())

// POST /api/auth/login { username, password } — 公開，驗證帳密後發一個 7 天效期的 JWT
// 先查 teachers，查不到再查 parents（一個帳號只會是其中一種身份）
router.post('/login', asyncHandler(loginRateLimiter), asyncHandler(async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: '需要 username 和 password' })
  }

  const teacherRes = await pool.query(
    'SELECT id, password_hash, status FROM teachers WHERE username = $1',
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
    if (teacher.status !== 'active') {
      return res.status(403).json({ error: '帳號還沒有啟用，請聯絡我們完成開通' })
    }
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

// 共用：查邀請碼是否存在且未過期，過期的話順便刪掉。回傳 { studentId } 或 { error }
async function resolveInvite(code) {
  const inviteRes = await pool.query(
    'SELECT student_id, expires_at FROM parent_invites WHERE code = $1',
    [String(code || '').trim().toUpperCase()]
  )
  if (!inviteRes.rows.length) {
    return { error: '邀請連結無效或已經用過，請跟老師確認' }
  }
  if (new Date(inviteRes.rows[0].expires_at) < new Date()) {
    await pool.query('DELETE FROM parent_invites WHERE student_id = $1', [inviteRes.rows[0].student_id])
    return { error: '邀請連結已經過期，請跟老師要一組新的' }
  }
  return { studentId: inviteRes.rows[0].student_id }
}

// GET /api/auth/invite-info?code=CODE — 公開，家長註冊前先確認邀請碼對應到哪個學生
router.get('/invite-info', asyncHandler(loginRateLimiter), asyncHandler(async (req, res) => {
  const { studentId, error } = await resolveInvite(req.query.code)
  if (error) return res.status(401).json({ error })

  const { rows } = await pool.query('SELECT seat_no, name FROM students WHERE id = $1', [studentId])
  res.json({ seatNo: rows[0].seat_no, name: rows[0].name })
}))

// POST /api/auth/register-parent { code, username, password } — 公開，家長拿邀請連結上的碼自行設定帳密
router.post('/register-parent', asyncHandler(loginRateLimiter), asyncHandler(async (req, res) => {
  const { code, username, password } = req.body
  if (!code || !username || !password) {
    return res.status(400).json({ error: '需要 code、username 和 password' })
  }

  const { studentId, error } = await resolveInvite(code)
  if (error) return res.status(401).json({ error })

  const teacherClash = await pool.query('SELECT 1 FROM teachers WHERE username = $1', [username])
  if (teacherClash.rows.length) {
    return res.status(409).json({ error: '這個帳號已經被使用了' })
  }

  const passwordHash = await hashPassword(password)

  let parent
  try {
    const { rows } = await pool.query(
      `INSERT INTO parents (student_id, username, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (student_id) DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash
       RETURNING id, student_id`,
      [studentId, username, passwordHash]
    )
    parent = rows[0]
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: '這個帳號已經被使用了' })
    throw err
  }

  await pool.query('DELETE FROM parent_invites WHERE student_id = $1', [studentId])

  const seatRes = await pool.query('SELECT seat_no FROM students WHERE id = $1', [studentId])
  const token = jwt.sign(
    { role: 'parent', parentId: parent.id, studentId, username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
  res.status(201).json({ token, role: 'parent', seatNo: seatRes.rows[0].seat_no })
}))

// POST /api/auth/register-teacher { username, password } — 公開，老師自行註冊帳號
// （沒有邀請碼門檻，任何人都能建立老師帳號，靠 loginRateLimiter 擋自動化濫用）
router.post('/register-teacher', asyncHandler(loginRateLimiter), asyncHandler(async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: '需要 username 和 password' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: '密碼至少需要 8 個字元' })
  }

  // 老師名字不能跟現有家長帳號撞名，不然那個家長以後永遠登入不了
  // （login 會先查 teachers 再查 parents，撞名的話 teachers 那筆永遠先比對到）
  const parentClash = await pool.query('SELECT 1 FROM parents WHERE username = $1', [username])
  if (parentClash.rows.length) {
    return res.status(409).json({ error: '這個帳號已經被使用了' })
  }

  const passwordHash = await hashPassword(password)

  let teacher
  try {
    const { rows } = await pool.query(
      'INSERT INTO teachers (username, password_hash) VALUES ($1, $2) RETURNING id, status',
      [username, passwordHash]
    )
    teacher = rows[0]
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: '這個帳號已經被使用了' })
    throw err
  }

  if (teacher.status !== 'active') {
    return res.status(201).json({ pending: true })
  }

  const token = jwt.sign(
    { role: 'teacher', teacherId: teacher.id, username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
  res.status(201).json({ token, role: 'teacher' })
}))
