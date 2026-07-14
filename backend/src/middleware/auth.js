import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const header = req.get('Authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '')
  if (!token) {
    return res.status(401).json({ error: '未授權，請先登入' })
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
    next()
  } catch {
    return res.status(401).json({ error: '登入已過期或無效，請重新登入' })
  }
}

export function requireTeacher(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: '只有老師可以執行這個操作' })
    }
    next()
  })
}
