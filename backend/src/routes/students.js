import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireTeacher } from '../middleware/auth.js'
import { asyncHandler } from '../asyncHandler.js'

export const router = Router()

// GET /api/students — 需登入；老師看全班，家長只看得到自己小孩那一筆
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role === 'parent') {
    const { rows } = await pool.query(
      'SELECT id, seat_no, active FROM students WHERE id = $1',
      [req.user.studentId]
    )
    return res.json(rows)
  }
  const { rows } = await pool.query(
    'SELECT id, seat_no, active FROM students ORDER BY seat_no'
  )
  res.json(rows)
}))

// POST /api/students { seatNo } — 老師專用，新增座號
router.post('/', requireTeacher, asyncHandler(async (req, res) => {
  const seatNo = parseInt(req.body.seatNo, 10)
  if (!seatNo || seatNo < 1) {
    return res.status(400).json({ error: 'seatNo 必須是正整數' })
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO students (seat_no, active) VALUES ($1, true) RETURNING id, seat_no, active',
      [seatNo]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: `座號 ${seatNo} 已經存在` })
    }
    throw err
  }
}))

// PATCH /api/students/:id { active } — 老師專用，標記座號啟用/排除
router.patch('/:id', requireTeacher, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!id) return res.status(400).json({ error: 'id 必須是整數' })
  const { rows } = await pool.query(
    'UPDATE students SET active = $1 WHERE id = $2 RETURNING id, seat_no, active',
    [!!req.body.active, id]
  )
  if (!rows.length) return res.status(404).json({ error: '找不到這個學生' })
  res.json(rows[0])
}))
