import '../src/env.js'
import { pool } from '../src/db.js'
import { hashPassword } from '../src/password.js'

const [, , seatNoArg, username, password] = process.argv
const seatNo = parseInt(seatNoArg, 10)
if (!seatNo || !username || !password) {
  console.error('用法: node scripts/create-parent.js <座號> <username> <password>')
  process.exit(1)
}

const student = await pool.query('SELECT id FROM students WHERE seat_no = $1', [seatNo])
if (!student.rows.length) {
  console.error(`座號 ${seatNo} 不存在`)
  process.exit(1)
}

const passwordHash = await hashPassword(password)
await pool.query(
  `INSERT INTO parents (student_id, username, password_hash) VALUES ($1, $2, $3)
   ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, student_id = EXCLUDED.student_id`,
  [student.rows[0].id, username, passwordHash]
)
console.log(`座號 ${seatNo} 的家長帳號 '${username}' 已建立（或密碼已更新）`)
await pool.end()
