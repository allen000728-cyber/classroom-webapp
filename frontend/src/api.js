const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const SESSION_KEY = 'classroom_session'

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || {}
  } catch {
    return {}
  }
}

export function getSession() {
  return readSession()
}

export function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function getToken() {
  return readSession().token || ''
}

async function request(method, path, body) {
  const headers = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const data = await res.json()
      if (data.error) message = data.error
    } catch {
      // 回應不是 JSON，用預設訊息就好
    }
    throw new Error(message)
  }
  if (res.status === 204) return null
  return res.json()
}

export const apiGet = (path) => request('GET', path)
export const apiPost = (path, body) => request('POST', path, body ?? {})
export const apiPut = (path, body) => request('PUT', path, body ?? {})
export const apiPatch = (path, body) => request('PATCH', path, body ?? {})
export const apiDelete = (path) => request('DELETE', path)
