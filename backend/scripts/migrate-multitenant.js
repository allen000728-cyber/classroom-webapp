// 一次性 migration：把「全站只有一個班級」改成「每個老師一個班級」
// 新增 teacher_id / class_id 欄位、回填現有資料、補上約束。全程一個 transaction，
// 失敗就整個 rollback，不會留下半套的 schema。
import '../src/env.js'
import { pool } from '../src/db.js'

const client = await pool.connect()

try {
  await client.query('BEGIN')

  // class_info：一個老師同時只會有一個班級（跟現有「畢業後才能建新班」邏輯一致）
  await client.query('ALTER TABLE class_info ADD COLUMN IF NOT EXISTS teacher_id integer REFERENCES teachers(id) ON DELETE CASCADE')
  await client.query('UPDATE class_info SET teacher_id = (SELECT id FROM teachers ORDER BY id LIMIT 1) WHERE teacher_id IS NULL')
  await client.query('ALTER TABLE class_info ALTER COLUMN teacher_id SET NOT NULL')
  await client.query(`
    DO $$ BEGIN
      ALTER TABLE class_info ADD CONSTRAINT class_info_teacher_id_key UNIQUE (teacher_id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `)

  // students：座號改成「同一班內」唯一，不再是全站唯一
  await client.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS class_id integer REFERENCES class_info(id) ON DELETE CASCADE')
  await client.query('UPDATE students SET class_id = (SELECT id FROM class_info ORDER BY id LIMIT 1) WHERE class_id IS NULL')
  await client.query('ALTER TABLE students ALTER COLUMN class_id SET NOT NULL')
  await client.query('ALTER TABLE students DROP CONSTRAINT IF EXISTS students_seat_no_key')
  await client.query(`
    DO $$ BEGIN
      ALTER TABLE students ADD CONSTRAINT students_class_id_seat_no_key UNIQUE (class_id, seat_no);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `)

  // daily_notes：早自修待辦事項改成每班各自的
  await client.query('ALTER TABLE daily_notes ADD COLUMN IF NOT EXISTS class_id integer REFERENCES class_info(id) ON DELETE CASCADE')
  await client.query('UPDATE daily_notes SET class_id = (SELECT id FROM class_info ORDER BY id LIMIT 1) WHERE class_id IS NULL')
  await client.query('ALTER TABLE daily_notes ALTER COLUMN class_id SET NOT NULL')
  await client.query('DROP INDEX IF EXISTS idx_daily_notes_date')
  await client.query('CREATE INDEX IF NOT EXISTS idx_daily_notes_class_date ON daily_notes(class_id, date)')

  // assignments：作業項目改成每班各自的
  await client.query('ALTER TABLE assignments ADD COLUMN IF NOT EXISTS class_id integer REFERENCES class_info(id) ON DELETE CASCADE')
  await client.query('UPDATE assignments SET class_id = (SELECT id FROM class_info ORDER BY id LIMIT 1) WHERE class_id IS NULL')
  await client.query('ALTER TABLE assignments ALTER COLUMN class_id SET NOT NULL')
  await client.query('DROP INDEX IF EXISTS idx_assignments_date')
  await client.query('CREATE INDEX IF NOT EXISTS idx_assignments_class_date ON assignments(class_id, date)')

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
