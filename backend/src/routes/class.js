import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireTeacher } from '../middleware/auth.js'
import { asyncHandler } from '../asyncHandler.js'

export const router = Router()

// GET /api/class — 需登入；回傳目前班級的年級/班別，還沒建班則回傳 null
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT grade, class_number FROM class_info LIMIT 1')
  res.json(rows[0] ?? null)
}))

// POST /api/class { grade, classNumber } — 老師專用，建立班級（已經有班級的話擋掉）
router.post('/', requireTeacher, asyncHandler(async (req, res) => {
  const grade = parseInt(req.body.grade, 10)
  const classNumber = parseInt(req.body.classNumber, 10)
  if (!grade || grade < 1 || !classNumber || classNumber < 1) {
    return res.status(400).json({ error: 'grade 和 classNumber 必須是正整數' })
  }

  const existing = await pool.query('SELECT 1 FROM class_info LIMIT 1')
  if (existing.rows.length) {
    return res.status(409).json({ error: '已經有班級了，請先讓班級畢業才能建立新班級' })
  }

  const { rows } = await pool.query(
    'INSERT INTO class_info (grade, class_number) VALUES ($1, $2) RETURNING grade, class_number',
    [grade, classNumber]
  )
  res.status(201).json(rows[0])
}))

// POST /api/class/graduate — 老師專用，清空這個班級的所有資料（不可復原）
router.post('/graduate', requireTeacher, asyncHandler(async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM homework_submissions')
    await client.query('DELETE FROM attendance_records')
    await client.query('DELETE FROM parents')
    await client.query('DELETE FROM assignments')
    await client.query('DELETE FROM daily_notes')
    await client.query('DELETE FROM students')
    await client.query('DELETE FROM class_info')
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
  res.status(204).end()
}))
