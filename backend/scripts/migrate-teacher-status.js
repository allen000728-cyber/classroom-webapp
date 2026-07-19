// 一次性 migration：teachers 加 status 欄位，為以後「付款才能啟用帳號」預留掛鉤。
// 現在預設值是 'active'，所以自助註冊馬上就能用；以後要開付款闗卡時，
// 把 INSERT 預設值改成 'pending'，並在確認付款後才把該帳號的 status 改成 'active'。
import '../src/env.js'
import { pool } from '../src/db.js'

const client = await pool.connect()

try {
  await client.query('BEGIN')
  await client.query("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'")
  await client.query(`
    DO $$ BEGIN
      ALTER TABLE teachers ADD CONSTRAINT teachers_status_check CHECK (status IN ('pending', 'active'));
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `)
  await client.query('COMMIT')
  console.log('migration 完成')
} catch (err) {
  await client.query('ROLLBACK')
  console.error('migration 失敗，已 rollback：', err.message)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}
