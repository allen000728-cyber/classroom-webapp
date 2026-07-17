import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireTeacher } from '../middleware/auth.js'
import { asyncHandler } from '../asyncHandler.js'
import { getTeacherClassId, getStudentClassId, requireClass } from '../classScope.js'

export const router = Router()

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function requireValidDate(req, res, next) {
  if (!DATE_RE.test(req.params.date)) {
    return res.status(400).json({ error: '日期格式必須是 YYYY-MM-DD' })
  }
  next()
}

router.param('date', requireValidDate)

// GET /api/day/:date — 需登入；把某一天的點名/作業資料整理成一份回應
// 用座號 (seat_no) 當 key，跟前端 store.js 的 roll[]/sub[] 概念直接對應
// 老師看自己班全班，家長只看得到自己小孩那一筆（notes/assignments 是同班共用資訊，維持不篩選）
router.get('/:date', requireAuth, asyncHandler(async (req, res) => {
  const { date } = req.params
  const scopeToStudentId = req.user.role === 'parent' ? req.user.studentId : null

  const classId = scopeToStudentId
    ? await getStudentClassId(scopeToStudentId)
    : await getTeacherClassId(req.user.teacherId)
  if (!classId) {
    return res.json({ date, notes: [], attendance: {}, assignments: [], submissions: {} })
  }

  const attendanceQuery = scopeToStudentId
    ? `SELECT s.seat_no, a.status FROM attendance_records a JOIN students s ON s.id = a.student_id
       WHERE a.date = $1 AND s.id = $2`
    : `SELECT s.seat_no, a.status FROM attendance_records a JOIN students s ON s.id = a.student_id
       WHERE a.date = $1 AND s.class_id = $2`
  const attendanceParams = scopeToStudentId ? [date, scopeToStudentId] : [date, classId]

  const [notesRes, attendanceRes, assignmentsRes] = await Promise.all([
    pool.query('SELECT id, text, seq FROM daily_notes WHERE date = $1 AND class_id = $2 ORDER BY seq', [date, classId]),
    pool.query(attendanceQuery, attendanceParams),
    pool.query('SELECT id, name, seq FROM assignments WHERE date = $1 AND class_id = $2 ORDER BY seq', [date, classId]),
  ])

  const assignmentIds = assignmentsRes.rows.map((a) => a.id)
  const submissionsQuery = scopeToStudentId
    ? `SELECT hs.assignment_id, s.seat_no, hs.missing FROM homework_submissions hs JOIN students s ON s.id = hs.student_id
       WHERE hs.assignment_id = ANY($1::int[]) AND s.id = $2`
    : `SELECT hs.assignment_id, s.seat_no, hs.missing FROM homework_submissions hs JOIN students s ON s.id = hs.student_id
       WHERE hs.assignment_id = ANY($1::int[])`
  const submissionsParams = scopeToStudentId ? [assignmentIds, scopeToStudentId] : [assignmentIds]

  const submissionsRes = assignmentIds.length
    ? await pool.query(submissionsQuery, submissionsParams)
    : { rows: [] }

  const attendance = {}
  for (const r of attendanceRes.rows) attendance[r.seat_no] = r.status

  const submissions = {}
  for (const r of submissionsRes.rows) {
    submissions[r.assignment_id] ??= {}
    submissions[r.assignment_id][r.seat_no] = r.missing
  }

  res.json({
    date,
    notes: notesRes.rows,
    attendance,
    assignments: assignmentsRes.rows,
    submissions,
  })
}))

// POST /api/day/:date/notes { text } — 老師專用，在自己班上新增一筆早自修交待事項
router.post('/:date/notes', requireTeacher, requireClass, asyncHandler(async (req, res) => {
  const { date } = req.params
  const text = req.body.text ?? ''
  const { rows } = await pool.query(
    `INSERT INTO daily_notes (class_id, date, text, seq)
     VALUES ($1, $2, $3, (SELECT COALESCE(MAX(seq), 0) + 1 FROM daily_notes WHERE class_id = $1 AND date = $2))
     RETURNING id, text, seq`,
    [req.classId, date, text]
  )
  res.status(201).json(rows[0])
}))

// PUT /api/day/:date/attendance { seatNo, status } — 老師專用，自己班上單一座號點名狀態
router.put('/:date/attendance', requireTeacher, requireClass, asyncHandler(async (req, res) => {
  const { date } = req.params
  const seatNo = parseInt(req.body.seatNo, 10)
  const status = parseInt(req.body.status, 10)
  if (!seatNo || seatNo < 1) {
    return res.status(400).json({ error: 'seatNo 必須是正整數' })
  }
  if (![0, 1, 2, 3].includes(status)) {
    return res.status(400).json({ error: 'status 必須是 0-3' })
  }

  const student = await pool.query('SELECT id FROM students WHERE seat_no = $1 AND class_id = $2', [seatNo, req.classId])
  if (!student.rows.length) {
    return res.status(404).json({ error: `座號 ${seatNo} 不存在` })
  }

  await pool.query(
    `INSERT INTO attendance_records (date, student_id, status) VALUES ($1, $2, $3)
     ON CONFLICT (date, student_id) DO UPDATE SET status = EXCLUDED.status`,
    [date, student.rows[0].id, status]
  )
  res.json({ date, seatNo, status })
}))

// POST /api/day/:date/reset — 老師專用，清除自己班上當天點名/作業繳交紀錄（保留作業項目名稱）
router.post('/:date/reset', requireTeacher, requireClass, asyncHandler(async (req, res) => {
  const { date } = req.params
  await pool.query(
    `DELETE FROM attendance_records
     WHERE date = $1 AND student_id IN (SELECT id FROM students WHERE class_id = $2)`,
    [date, req.classId]
  )
  await pool.query(
    `UPDATE homework_submissions SET missing = false
     WHERE assignment_id IN (SELECT id FROM assignments WHERE date = $1 AND class_id = $2)`,
    [date, req.classId]
  )
  res.status(204).end()
}))

// POST /api/day/:date/assignments { name } — 老師專用，在自己班上新增當天作業項目
router.post('/:date/assignments', requireTeacher, requireClass, asyncHandler(async (req, res) => {
  const { date } = req.params
  const name = req.body.name ?? ''
  const { rows } = await pool.query(
    `INSERT INTO assignments (class_id, date, name, seq)
     VALUES ($1, $2, $3, (SELECT COALESCE(MAX(seq), 0) + 1 FROM assignments WHERE class_id = $1 AND date = $2))
     RETURNING id, name, seq`,
    [req.classId, date, name]
  )
  res.status(201).json(rows[0])
}))
