import { Router } from 'express'
import { pool } from '../db.js'
import { requireTeacher } from '../middleware/auth.js'
import { asyncHandler } from '../asyncHandler.js'
import { requireClass } from '../classScope.js'

export const router = Router()

router.param('id', (req, res, next, value) => {
  if (!/^\d+$/.test(value)) return res.status(400).json({ error: 'id 必須是整數' })
  next()
})

// PATCH /api/assignments/:id { name } — 老師專用，改自己班上作業項目名稱
router.patch('/:id', requireTeacher, requireClass, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'UPDATE assignments SET name = $1 WHERE id = $2 AND class_id = $3 RETURNING id, name, seq',
    [req.body.name ?? '', req.params.id, req.classId]
  )
  if (!rows.length) return res.status(404).json({ error: '找不到這個作業項目' })
  res.json(rows[0])
}))

// DELETE /api/assignments/:id — 老師專用，刪除自己班上作業項目(連同繳交紀錄一起刪)
router.delete('/:id', requireTeacher, requireClass, asyncHandler(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM assignments WHERE id = $1 AND class_id = $2', [req.params.id, req.classId])
  if (!rowCount) return res.status(404).json({ error: '找不到這個作業項目' })
  res.status(204).end()
}))

// PUT /api/assignments/:id/submissions { seatNo, missing } — 老師專用，標記自己班上單一學生缺交狀態
router.put('/:id/submissions', requireTeacher, requireClass, asyncHandler(async (req, res) => {
  const assignmentId = req.params.id
  const seatNo = parseInt(req.body.seatNo, 10)
  const missing = !!req.body.missing
  if (!seatNo || seatNo < 1) {
    return res.status(400).json({ error: 'seatNo 必須是正整數' })
  }

  const assignment = await pool.query('SELECT id FROM assignments WHERE id = $1 AND class_id = $2', [assignmentId, req.classId])
  if (!assignment.rows.length) {
    return res.status(404).json({ error: '找不到這個作業項目' })
  }

  const student = await pool.query('SELECT id FROM students WHERE seat_no = $1 AND class_id = $2', [seatNo, req.classId])
  if (!student.rows.length) {
    return res.status(404).json({ error: `座號 ${seatNo} 不存在` })
  }

  await pool.query(
    `INSERT INTO homework_submissions (assignment_id, student_id, missing) VALUES ($1, $2, $3)
     ON CONFLICT (assignment_id, student_id) DO UPDATE SET missing = EXCLUDED.missing`,
    [assignmentId, student.rows[0].id, missing]
  )
  res.json({ assignmentId: Number(assignmentId), seatNo, missing })
}))
