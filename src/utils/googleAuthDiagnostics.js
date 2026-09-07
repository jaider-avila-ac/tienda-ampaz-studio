const STORAGE_KEY = 'ampaz-studio.google-auth-diagnostics.v1'
const EVENT_NAME = 'google-auth:diagnostic'
const MAX_EVENTS = 80

function safeRead() {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

// Nunca registrar el ID token, correo, nombre ni cuerpo de las respuestas.
export function recordGoogleAuthEvent(stage, details = {}) {
  const event = {
    at: new Date().toISOString(),
    elapsed_ms: Math.round(performance.now()),
    stage,
    details,
  }
  const events = [...safeRead(), event].slice(-MAX_EVENTS)
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events)) } catch { /* storage bloqueado */ }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: event }))
  return event
}

export function getGoogleAuthEvents() {
  return safeRead()
}

export function clearGoogleAuthEvents() {
  try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* storage bloqueado */ }
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

export function subscribeGoogleAuthEvents(listener) {
  window.addEventListener(EVENT_NAME, listener)
  return () => window.removeEventListener(EVENT_NAME, listener)
}

export function googleAuthEnvironment(flow) {
  return {
    flow,
    page: location.pathname,
    origin: location.origin,
    online: navigator.onLine,
    language: navigator.language,
    cookies_enabled: navigator.cookieEnabled,
    visibility: document.visibilityState,
    user_agent: navigator.userAgent,
  }
}
