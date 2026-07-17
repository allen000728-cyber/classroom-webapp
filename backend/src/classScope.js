import { pool } from './db.js'

// 老師目前的班級 id；還沒建班則回傳 null
export async function getTeacherClassId(teacherId) {
  const { rows } = await pool.query('SELECT id FROM class_info WHERE teacher_id = $1', [teacherId])
  return rows[0]?.id ?? null
}

// 家長小孩所在的班級 id
export async function getStudentClassId(studentId) {
  const { rows } = await pool.query('SELECT class_id FROM students WHERE id = $1', [studentId])
  return rows[0]?.class_id ?? null
}

// 老師專用路由的 middleware：把 req.classId 準備好，老師還沒建班就 404
// （目前前端流程本來就會擋在 ClassSetup 畫面，這裡是伺服器端多一層保險）
export function requireClass(req, res, next) {
  getTeacherClassId(req.user.teacherId).then((classId) => {
    if (!classId) return res.status(404).json({ error: '請先建立班級' })
    req.classId = classId
    next()
  }, next)
}
