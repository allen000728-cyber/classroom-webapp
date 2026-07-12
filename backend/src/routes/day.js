import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireTeacher } from '../middleware/auth.js'
import { asyncHandler } from '../asyncHandler.js'

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
// 老師看全班，家長只看得到自己小孩那一筆（notes/assignments 是全班共用資訊，維持不篩選）
router.get('/:date', requireAuth, asyncHandler(async (req, res) => {
  const { date } = req.params
  const scopeToStudentId = req.user.role === 'parent' ? req.user.studentId : null

  const attendanceQuery = scopeToStudentId
    ? `SELECT s.seat_no, a.status FROM attendance_records a JOIN students s ON s.id = a.student_id
       WHERE a.date = $1 AND s.id = $2`
    : `SELECT s.seat_no, a.status FROM attendance_records a JOIN students s ON s.id = a.student_id
       WHERE a.date = $1`
  const attendanceParams = scopeToStudentId ? [date, scopeToStudentId] : [date]

  const [notesRes, attendanceRes, assignmentsRes] = await Promise.all([
    pool.query('SELECT notes FROM daily_notes WHERE date = $1', [date]),
    pool.query(attendanceQuery, attendanceParams),
    pool.query('SELECT id, name, seq FROM assignments WHERE date = $1 ORDER BY seq', [date]),
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
    notes: notesRes.rows[0]?.notes ?? '',
    attendance,
    assignments: assignmentsRes.rows,
    submissions,
  })
}))

// PUT /api/day/:date/notes { notes } — 老師專用
router.put('/:date/notes', requireTeacher, asyncHandler(async (req, res) => {
  const { date } = req.params
  const notes = req.body.notes ?? ''
  await pool.query(
    `INSERT INTO daily_notes (date, notes) VALUES ($1, $2)
     ON CONFLICT (date) DO UPDATE SET notes = EXCLUDED.notes`,
    [date, notes]
  )
  res.json({ date, notes })
}))

// PUT /api/day/:date/attendance { seatNo, status } — 老師專用，單一座號點名狀態
router.put('/:date/attendance', requireTeacher, asyncHandler(async (req, res) => {
  const { date } = req.params
  const seatNo = parseInt(req.body.seatNo, 10)
  const status = parseInt(req.body.status, 10)
  if (!seatNo || seatNo < 1) {
    return res.status(400).json({ error: 'seatNo 必須是正整數' })
  }
  if (![0, 1, 2, 3].includes(status)) {
    return res.status(400).json({ error: 'status 必須是 0-3' })
  }

  const student = await pool.query('SELECT id FROM students WHERE seat_no = $1', [seatNo])
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

// POST /api/day/:date/reset — 老師專用，清除當天點名/作業繳交紀錄（保留作業項目名稱）
router.post('/:date/reset', requireTeacher, asyncHandler(async (req, res) => {
  const { date } = req.params
  await pool.query('DELETE FROM attendance_records WHERE date = $1', [date])
  await pool.query(
    `UPDATE homework_submissions SET missing = false
     WHERE assignment_id IN (SELECT id FROM assignments WHERE date = $1)`,
    [date]
  )
  res.status(204).end()
}))

// POST /api/day/:date/assignments { name } — 老師專用，新增當天作業項目
router.post('/:date/assignments', requireTeacher, asyncHandler(async (req, res) => {
  const { date } = req.params
  const name = req.body.name ?? ''
  const { rows } = await pool.query(
    `INSERT INTO assignments (date, name, seq)
     VALUES ($1, $2, (SELECT COALESCE(MAX(seq), 0) + 1 FROM assignments WHERE date = $1))
     RETURNING id, name, seq`,
    [date, name]
  )
  res.status(201).json(rows[0])
}))
