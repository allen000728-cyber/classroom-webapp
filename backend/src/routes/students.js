import { Router } from 'express'
import { pool } from '../db.js'
import { requireTeacher } from '../middleware/auth.js'

export const router = Router()

// GET /api/students — 公開，家長也看得到座位表
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, seat_no, active FROM students ORDER BY seat_no'
  )
  res.json(rows)
})

// POST /api/students { seatNo } — 老師專用，新增座號
router.post('/', requireTeacher, async (req, res) => {
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
})

// PATCH /api/students/:id { active } — 老師專用，標記座號啟用/排除
router.patch('/:id', requireTeacher, async (req, res) => {
  const { rows } = await pool.query(
    'UPDATE students SET active = $1 WHERE id = $2 RETURNING id, seat_no, active',
    [!!req.body.active, req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: '找不到這個學生' })
  res.json(rows[0])
})
