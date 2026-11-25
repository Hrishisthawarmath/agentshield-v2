// REST client for the FastAPI security engine. Falls back to the in-browser engine when unavailable.
const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const apiConfigured = Boolean(API)

export async function health() {
  if (!API) return 'local'
  try {
    const r = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(2500) })
    return r.ok ? 'online' : 'offline'
  } catch { return 'offline' }
}

export async function call(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(6000),
  })
  if (!r.ok) throw new Error(`Security engine responded ${r.status}`)
  return r.json()
}

export const fireAndForget = (path, body) => { if (API) call(path, body).catch(() => {}) }
