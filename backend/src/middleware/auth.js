export function requireTeacher(req, res, next) {
  const header = req.get('Authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '')
  if (!token || token !== process.env.TEACHER_TOKEN) {
    return res.status(401).json({ error: '未授權，需要老師端 token' })
  }
  next()
}
