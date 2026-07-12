import '../src/env.js'
import { pool } from '../src/db.js'
import { hashPassword } from '../src/password.js'

const [, , username, password] = process.argv
if (!username || !password) {
  console.error('用法: node scripts/create-teacher.js <username> <password>')
  process.exit(1)
}

const passwordHash = await hashPassword(password)
await pool.query(
  `INSERT INTO teachers (username, password_hash) VALUES ($1, $2)
   ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
  [username, passwordHash]
)
console.log(`老師帳號 '${username}' 已建立（或密碼已更新）`)
await pool.end()
