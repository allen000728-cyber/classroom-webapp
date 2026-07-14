import { pool } from './db.js'

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

// 存在資料庫而不是記憶體裡，這樣不管背後有幾個 process/instance 在跑，
// 大家看到的都是同一份計數（記憶體型的 rate limiter 在多 instance 環境下每個
// process 各算各的，形同虛設 —— 這個專案部署後實測就是這樣）。
export async function loginRateLimiter(req, res, next) {
  const ip = req.ip
  const windowStart = new Date(Date.now() - WINDOW_MS)

  const { rows } = await pool.query(
    'SELECT count(*) FROM login_attempts WHERE ip = $1 AND attempted_at > $2',
    [ip, windowStart]
  )
  if (Number(rows[0].count) >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: '嘗試登入次數過多，請稍後再試' })
  }

  await pool.query('INSERT INTO login_attempts (ip) VALUES ($1)', [ip])
  // 順手清掉這個 IP 過期的舊紀錄，避免表一直長大（不用等回應，失敗也無所謂）
  pool.query('DELETE FROM login_attempts WHERE ip = $1 AND attempted_at < $2', [ip, windowStart]).catch(() => {})

  next()
}
