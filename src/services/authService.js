import { tokenStore } from './tokenStore'
import { recordGoogleAuthEvent } from '../utils/googleAuthDiagnostics'

const BASE  = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/public/auth/tienda`
// Ver el comentario de TND en api.js — mismo respaldo de dev local, mismo criterio: nunca se
// manda junto con un JWT real (ver logout() abajo).
const TND   = import.meta.env.VITE_TENANT_ID || '1'

async function post(path, body, { timeoutMs = 20000, diagnostic = false } = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  if (diagnostic) recordGoogleAuthEvent('backend_request_started', { path, timeout_ms: timeoutMs })
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TND },
    body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    if (diagnostic) recordGoogleAuthEvent(error.name === 'AbortError' ? 'backend_request_timeout' : 'backend_network_error', {
      name: error.name,
      online: navigator.onLine,
    })
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
  if (diagnostic) recordGoogleAuthEvent('backend_response_received', { status: res.status, ok: res.ok })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.message ?? 'Error'), { status: res.status, data })
  return data
}

// El logout necesita el Bearer del propio token que se está cerrando para poder
// invalidarlo en el backend (ver JwtService.invalidate) — post() no lo agrega.
async function logout() {
  const token = tokenStore.getToken()
  if (!token) return
  // Sin X-Tenant-Id a propósito: el JWT ya identifica la tienda, y mandar acá el respaldo de
  // dev local junto con un token real arriesgaría un 403 si algún día no coinciden.
  await fetch(`${BASE}/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {})
}

export const authService = {
  register:       (email, password, nombre, apellido, numeroDocumento, aceptaTerminos, aceptaPromo) =>
    post('/register', {
      email, password, nombre, apellido,
      tipo_documento: numeroDocumento ? 'CC' : undefined,
      numero_documento: numeroDocumento || undefined,
      acepta_terminos: aceptaTerminos,
      acepta_promo: aceptaPromo,
    }),

  verify:         (email, code) =>
    post('/verify', { email, code }),

  resendCode:     (email) =>
    post('/resend-code', { email }),

  login:          (email, password) =>
    post('/login', { email, password }),

  googleLogin:    (idToken) =>
    post('/google', { id_token: idToken }, { diagnostic: true }),

  forgotPassword: (email) =>
    post('/forgot-password', { email }),

  resetPassword:  (code, newPassword) =>
    post('/reset-password', { code, new_password: newPassword }),

  logout,
}
