import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireTeacher } from '../middleware/auth.js'
import { asyncHandler } from '../asyncHandler.js'

export const router = Router()

// GET /api/class — 需登入；回傳自己班級的年級/班別，還沒建班則回傳 null
// 老師看自己帶的班；家長看自己小孩所在的班
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role === 'parent') {
    const { rows } = await pool.query(
      `SELECT ci.grade, ci.class_number FROM class_info ci
       JOIN students s ON s.class_id = ci.id
       WHERE s.id = $1`,
      [req.user.studentId]
    )
    return res.json(rows[0] ?? null)
  }
  const { rows } = await pool.query(
    'SELECT grade, class_number FROM class_info WHERE teacher_id = $1',
    [req.user.teacherId]
  )
  res.json(rows[0] ?? null)
}))

// POST /api/class { grade, classNumber } — 老師專用，建立班級（自己已經有班級的話擋掉）
router.post('/', requireTeacher, asyncHandler(async (req, res) => {
  const grade = parseInt(req.body.grade, 10)
  const classNumber = parseInt(req.body.classNumber, 10)
  if (!grade || grade < 1 || !classNumber || classNumber < 1) {
    return res.status(400).json({ error: 'grade 和 classNumber 必須是正整數' })
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO class_info (teacher_id, grade, class_number) VALUES ($1, $2, $3) RETURNING grade, class_number',
      [req.user.teacherId, grade, classNumber]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: '已經有班級了，請先讓班級畢業才能建立新班級' })
    }
    throw err
  }
}))

// POST /api/class/graduate — 老師專用，清空這個班級的所有資料（不可復原）
// class_id/teacher_id 的外鍵都是 ON DELETE CASCADE，刪這一列就會連帶清掉學生、
// 點名、作業、待辦事項、家長帳號與邀請碼，不用再手動一張一張刪
router.post('/graduate', requireTeacher, asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM class_info WHERE teacher_id = $1', [req.user.teacherId])
  res.status(204).end()
}))
