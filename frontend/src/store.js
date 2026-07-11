import { reactive } from 'vue'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, getToken, setToken, clearToken } from './api'

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

export const store = reactive({
  date: todayStr(),
  notes: '',
  students: [],       // [{id, seat_no, active}]
  attendance: {},     // { [seat_no]: status(0-3) }
  assignments: [],    // [{id, name, seq}]
  submissions: {},    // { [assignmentId]: { [seat_no]: boolean } }
  countInput: 28,
  excludedInput: '',
  token: getToken(),
  loading: false,
  saveLabel: '儲存',
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

function syncExcludedInputFromStudents() {
  store.excludedInput = store.students.filter(s => !s.active).map(s => s.seat_no).join(', ')
}

function syncCountInputFromStudents() {
  store.countInput = store.students.length
    ? Math.max(...store.students.map(s => s.seat_no))
    : 28
}

export async function loadStudents() {
  store.students = await apiGet('/api/students')
  syncExcludedInputFromStudents()
  syncCountInputFromStudents()
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

export async function init() {
  await withErrorHandling(async () => {
    await loadStudents()
    await loadDay(store.date)
  })
}

export function changeDate(newDate) {
  withErrorHandling(() => loadDay(newDate))
}

export function saveNotes() {
  return withErrorHandling(async () => {
    store.saveLabel = '儲存中…'
    await apiPut(`/api/day/${store.date}/notes`, { notes: store.notes })
    store.saveLabel = '✓ 已儲存'
    setTimeout(() => { store.saveLabel = '儲存' }, 1500)
  })
}

let notesTimer
export function autoSaveNotes() {
  clearTimeout(notesTimer)
  notesTimer = setTimeout(saveNotes, 600)
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

export function setStudentCount(v) {
  const count = parseInt(v, 10)
  if (!count || count < 1 || count > 60) { syncCountInputFromStudents(); return }
  return withErrorHandling(async () => {
    const existing = new Map(store.students.map(s => [s.seat_no, s]))
    for (let seat = 1; seat <= count; seat++) {
      if (!existing.has(seat)) await apiPost('/api/students', { seatNo: seat })
    }
    for (const s of store.students) {
      if (s.seat_no > count && s.active) await apiPatch(`/api/students/${s.id}`, { active: false })
    }
    await loadStudents()
  })
}

export function applyExcluded() {
  const excludedSeats = new Set(
    store.excludedInput.split(/[,，\s]+/)
      .map(v => parseInt(v.trim(), 10))
      .filter(v => !isNaN(v))
  )
  return withErrorHandling(async () => {
    for (const s of store.students) {
      const shouldBeActive = !excludedSeats.has(s.seat_no)
      if (s.active !== shouldBeActive) await apiPatch(`/api/students/${s.id}`, { active: shouldBeActive })
    }
    await loadStudents()
  })
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

export function teacherLogin(token) {
  setToken(token)
  store.token = token
}

export function teacherLogout() {
  clearToken()
  store.token = ''
}

export const ROLL_LABEL = ['', '到', '缺', '假']
export const ROLL_CLASS = ['', 's-arr', 's-abs', 's-lv']
