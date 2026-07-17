import { reactive } from 'vue'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, getSession, setSession, clearSession } from './api'

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

const session = getSession()

export const store = reactive({
  classInfo: null,    // {grade, class_number} | null（null = 老師還沒建班）
  classInfoReady: false, // 還沒問過後端之前，classInfo 是 null 不代表真的沒班級
  date: todayStr(),
  notes: [],          // [{id, text, seq}]
  students: [],       // [{id, seat_no, active}]
  attendance: {},     // { [seat_no]: status(0-3) }
  assignments: [],    // [{id, name, seq}]
  submissions: {},    // { [assignmentId]: { [seat_no]: boolean } }
  token: session.token || '',
  role: session.role || '',     // 'teacher' | 'parent'
  seatNo: session.seatNo || null, // 家長登入時，自己小孩的座號
  loading: false,
  error: '',
})

async function withErrorHandling(fn) {
  try {
    store.error = ''
    await fn()
  } catch (err) {
    store.error = err.message
  }
}

export async function loadStudents() {
  store.students = await apiGet('/api/students')
}

export function addStudent(seatNo, name) {
  return withErrorHandling(async () => {
    const created = await apiPost('/api/students', { seatNo, name })
    store.students.push(created)
  })
}

export function updateStudent(id, fields) {
  return withErrorHandling(async () => {
    const updated = await apiPatch(`/api/students/${id}`, fields)
    const idx = store.students.findIndex((s) => s.id === id)
    if (idx !== -1) store.students[idx] = updated
  })
}

export function deleteStudent(student) {
  const label = student.name ? `座號 ${student.seat_no}（${student.name}）` : `座號 ${student.seat_no}`
  if (!confirm(`確定要刪除${label}嗎？\n這個學生的點名、作業紀錄與家長帳號都會一併永久刪除，無法復原！`)) return
  return withErrorHandling(async () => {
    await apiDelete(`/api/students/${student.id}`)
    store.students = store.students.filter((s) => s.id !== student.id)
  })
}

let latestRequestedDate = null

export async function loadDay(date) {
  latestRequestedDate = date
  store.loading = true
  try {
    const day = await apiGet(`/api/day/${date}`)
    if (date !== latestRequestedDate) return // 這期間又切了別的日期，這筆回應已經過時，丟棄
    store.date = day.date
    store.notes = day.notes
    store.attendance = day.attendance
    store.assignments = day.assignments
    store.submissions = day.submissions
  } finally {
    if (date === latestRequestedDate) store.loading = false
  }
}

export async function loadClassInfo() {
  store.classInfo = await apiGet('/api/class')
}

export async function init() {
  store.classInfoReady = false
  await withErrorHandling(async () => {
    await loadClassInfo()
    if (store.classInfo) {
      await loadStudents()
      await loadDay(store.date)
    }
  })
  store.classInfoReady = true
}

export function createClass(grade, classNumber) {
  return withErrorHandling(async () => {
    store.classInfo = await apiPost('/api/class', { grade, classNumber })
    await loadStudents()
    await loadDay(store.date)
  })
}

export function graduateClass() {
  const answer = prompt(
    '確定要讓這個班級畢業嗎？\n\n' +
    '這個動作會永久刪除所有學生、點名、作業、待辦事項與家長帳號資料，無法復原！\n\n' +
    '請輸入「畢業」以確認：'
  )
  if (answer !== '畢業') return
  return withErrorHandling(async () => {
    await apiPost('/api/class/graduate', {})
    store.classInfo = null
    store.students = []
    store.attendance = {}
    store.assignments = []
    store.submissions = {}
    store.notes = []
  })
}

export function changeDate(newDate) {
  withErrorHandling(() => loadDay(newDate))
}

export function addNote() {
  return withErrorHandling(async () => {
    const created = await apiPost(`/api/day/${store.date}/notes`, { text: '' })
    store.notes.push(created)
  })
}

export function renameNote(id, text) {
  withErrorHandling(() => apiPatch(`/api/notes/${id}`, { text }))
}

export function removeNote(id) {
  return withErrorHandling(async () => {
    await apiDelete(`/api/notes/${id}`)
    store.notes = store.notes.filter(n => n.id !== id)
  })
}

export function cycleRoll(seatNo) {
  const next = ((store.attendance[seatNo] || 0) + 1) % 4
  store.attendance[seatNo] = next
  withErrorHandling(() => apiPut(`/api/day/${store.date}/attendance`, { seatNo, status: next }))
}

export function addAssignment() {
  return withErrorHandling(async () => {
    const created = await apiPost(`/api/day/${store.date}/assignments`, { name: '' })
    store.assignments.push(created)
  })
}

export function renameAssignment(id, name) {
  withErrorHandling(() => apiPatch(`/api/assignments/${id}`, { name }))
}

export function removeAssignment(id) {
  return withErrorHandling(async () => {
    await apiDelete(`/api/assignments/${id}`)
    store.assignments = store.assignments.filter(a => a.id !== id)
    delete store.submissions[id]
  })
}

export function toggleSub(seatNo, assignmentId) {
  store.submissions[assignmentId] ??= {}
  const next = !store.submissions[assignmentId][seatNo]
  store.submissions[assignmentId][seatNo] = next
  withErrorHandling(() => apiPut(`/api/assignments/${assignmentId}/submissions`, { seatNo, missing: next }))
}

export function clearDay() {
  if (!confirm('確定清除今日所有點名和作業紀錄？\n（日期、待事項、作業名稱保留）')) return
  return withErrorHandling(async () => {
    await apiPost(`/api/day/${store.date}/reset`, {})
    await loadDay(store.date)
  })
}

export function visibleStudents() {
  return store.students.filter(s => s.active).slice().sort((a, b) => a.seat_no - b.seat_no)
}

export function login(username, password) {
  return withErrorHandling(async () => {
    const { token, role, seatNo } = await apiPost('/api/auth/login', { username, password })
    setSession({ token, role, seatNo })
    store.token = token
    store.role = role
    store.seatNo = seatNo || null
  })
}

export function logout() {
  clearSession()
  store.token = ''
  store.role = ''
  store.seatNo = null
}

export const ROLL_LABEL = ['', '到', '缺', '假']
export const ROLL_CLASS = ['', 's-arr', 's-abs', 's-lv']
