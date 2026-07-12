import jwt from 'jsonwebtoken'

export function requireTeacher(req, res, next) {
  const header = req.get('Authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '')
  if (!token) {
    return res.status(401).json({ error: '未授權，請先登入' })
  }
  try {
    req.teacher = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: '登入已過期或無效，請重新登入' })
  }
}
