import { Router } from 'express'
import { randomBytes } from 'crypto'
import { pool } from '../db.js'
import { requireAuth, requireTeacher } from '../middleware/auth.js'
import { asyncHandler } from '../asyncHandler.js'

export const router = Router()

// GET /api/students — 需登入；老師看全班，家長只看得到自己小孩那一筆
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role === 'parent') {
    const { rows } = await pool.query(
      'SELECT id, seat_no, name, active FROM students WHERE id = $1',
      [req.user.studentId]
    )
    return res.json(rows)
  }
  const { rows } = await pool.query(
    'SELECT id, seat_no, name, active FROM students ORDER BY seat_no'
  )
  res.json(rows)
}))

// POST /api/students { seatNo, name? } — 老師專用，新增座號
router.post('/', requireTeacher, asyncHandler(async (req, res) => {
  const seatNo = parseInt(req.body.seatNo, 10)
  const name = String(req.body.name ?? '')
  if (!seatNo || seatNo < 1) {
    return res.status(400).json({ error: 'seatNo 必須是正整數' })
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO students (seat_no, name, active) VALUES ($1, $2, true) RETURNING id, seat_no, name, active',
      [seatNo, name]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: `座號 ${seatNo} 已經存在` })
    }
    throw err
  }
}))

// PATCH /api/students/:id { active?, name?, seatNo? } — 老師專用，修改座號/姓名/啟用狀態
router.patch('/:id', requireTeacher, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!id) return res.status(400).json({ error: 'id 必須是整數' })

  const fields = []
  const values = []
  let i = 1

  if ('active' in req.body) {
    fields.push(`active = $${i++}`)
    values.push(!!req.body.active)
  }
  if ('name' in req.body) {
    fields.push(`name = $${i++}`)
    values.push(String(req.body.name ?? ''))
  }
  if ('seatNo' in req.body) {
    const seatNo = parseInt(req.body.seatNo, 10)
    if (!seatNo || seatNo < 1) {
      return res.status(400).json({ error: 'seatNo 必須是正整數' })
    }
    fields.push(`seat_no = $${i++}`)
    values.push(seatNo)
  }
  if (!fields.length) {
    return res.status(400).json({ error: '沒有要更新的欄位' })
  }

  values.push(id)
  try {
    const { rows } = await pool.query(
      `UPDATE students SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, seat_no, name, active`,
      values
    )
    if (!rows.length) return res.status(404).json({ error: '找不到這個學生' })
    res.json(rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: '座號已經有人使用了' })
    }
    throw err
  }
}))

// POST /api/students/:id/invite — 老師專用，產生（或重新產生）這個學生的家長註冊邀請碼
router.post('/:id/invite', requireTeacher, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!id) return res.status(400).json({ error: 'id 必須是整數' })

  const student = await pool.query('SELECT id FROM students WHERE id = $1', [id])
  if (!student.rows.length) return res.status(404).json({ error: '找不到這個學生' })

  const code = randomBytes(4).toString('hex').toUpperCase()
  await pool.query(
    `INSERT INTO parent_invites (student_id, code) VALUES ($1, $2)
     ON CONFLICT (student_id) DO UPDATE SET code = EXCLUDED.code`,
    [id, code]
  )
  res.json({ code })
}))

// DELETE /api/students/:id — 老師專用，真的刪除這個學生（連同他的點名/作業/家長帳號一起刪，無法復原）
router.delete('/:id', requireTeacher, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!id) return res.status(400).json({ error: 'id 必須是整數' })
  const { rowCount } = await pool.query('DELETE FROM students WHERE id = $1', [id])
  if (!rowCount) return res.status(404).json({ error: '找不到這個學生' })
  res.status(204).end()
}))
