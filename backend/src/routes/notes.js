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

// PATCH /api/notes/:id { text } — 老師專用，改自己班上一筆早自修交待事項內容
router.patch('/:id', requireTeacher, requireClass, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'UPDATE daily_notes SET text = $1 WHERE id = $2 AND class_id = $3 RETURNING id, text, seq',
    [req.body.text ?? '', req.params.id, req.classId]
  )
  if (!rows.length) return res.status(404).json({ error: '找不到這筆待辦事項' })
  res.json(rows[0])
}))

// DELETE /api/notes/:id — 老師專用，刪除自己班上一筆早自修交待事項
router.delete('/:id', requireTeacher, requireClass, asyncHandler(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM daily_notes WHERE id = $1 AND class_id = $2', [req.params.id, req.classId])
  if (!rowCount) return res.status(404).json({ error: '找不到這筆待辦事項' })
  res.status(204).end()
}))
