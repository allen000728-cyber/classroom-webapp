import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// node-postgres 的 Pool 會對閒置連線的背景錯誤(例如 Neon 休眠喚醒時偶發的斷線)
// 觸發一個 'error' event；不接的話這個 event 沒有 listener 會直接讓整個 process crash。
pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err)
})
