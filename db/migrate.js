import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { Client } from 'pg'

const dir = dirname(fileURLToPath(import.meta.url))

function loadEnv(path) {
  if (!existsSync(path)) {
    console.error(`找不到 ${path}，請先照 .env.example 建立 db/.env`)
    process.exit(1)
  }
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) process.env[m[1]] = m[2]
  }
}

loadEnv(join(dir, '.env'))

if (!process.env.DATABASE_URL) {
  console.error('db/.env 裡沒有 DATABASE_URL')
  process.exit(1)
}

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function run() {
  await client.connect()
  console.log('已連線，開始建立資料表...')
  await client.query(readFileSync(join(dir, 'schema.sql'), 'utf8'))
  console.log('schema.sql 執行完成')
  await client.query(readFileSync(join(dir, 'seed.sql'), 'utf8'))
  console.log('seed.sql 執行完成')
  const { rows } = await client.query('SELECT count(*) FROM students')
  console.log(`students 表目前有 ${rows[0].count} 筆`)
  await client.end()
}

run().catch(async (err) => {
  console.error('執行失敗：', err.message)
  await client.end()
  process.exit(1)
})
