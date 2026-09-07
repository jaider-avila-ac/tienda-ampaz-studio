import { tokenStore } from './tokenStore'

const BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/public`
// Respaldo SOLO para desarrollo local (Vite sirve en un puerto propio, así que el Host que ve
// el backend es el del backend mismo, nunca coincide con ningún dominio real registrado) — el
// backend (TenantInterceptor) siempre prefiere el dominio real de la solicitud sobre esto, y en
// producción, con el dominio de cada tienda correctamente registrado, este valor nunca se usa.
// Configurar VITE_TENANT_ID al duplicar este proyecto para otra tienda — NUNCA hardcodear el id.
const TND = import.meta.env.VITE_TENANT_ID || '1'

// Se lanza cuando el fetch nunca llegó a obtener respuesta (backend caído, sin red, timeout) —
// a diferencia de un Error normal, que significa que el servidor SÍ respondió (con un status de error).
export class BackendOfflineError extends Error {
  constructor() {
    super('No se pudo conectar con el servidor')
    this.offline = true
  }
}

// Notifica a toda la app cuando el backend deja de responder o vuelve a estar disponible,
// para que las páginas puedan dejar de mostrar datos cacheados como si fueran en vivo.
function markOffline() {
  window.dispatchEvent(new Event('backend:offline'))
}
function markOnline() {
  window.dispatchEvent(new Event('backend:online'))
}

async function doFetch(url, options) {
  try {
    const res = await fetch(url, options)
    markOnline() // si respondió (aunque sea con un status de error), el backend está vivo
    return res
  } catch {
    markOffline()
    throw new BackendOfflineError()
  }
}

async function throwWithBackendMessage(res) {
  const data = await res.json().catch(() => ({}))
  throw Object.assign(new Error(data.message || `Error ${res.status}`), { status: res.status, data })
}

export async function fetchPublic(path) {
  const res = await doFetch(`${BASE}${path}`, {
    headers: { 'X-Tenant-Id': TND },
  })
  if (!res.ok) await throwWithBackendMessage(res)
  return res.json()
}

export async function fetchAuth(path, options = {}) {
  const token = tokenStore.getToken()
  // Con sesión iniciada, el tenant lo determina EXCLUSIVAMENTE el JWT (firmado, no falsificable
  // desde el navegador) — el backend rechaza con 403 cualquier X-Tenant-Id que no coincida
  // exactamente con el del token, así que mandarlo acá solo arriesgaría romper la sesión si
  // este valor local alguna vez queda desactualizado. Sin sesión, sigue siendo el respaldo de
  // dev local de siempre.
  const res = await doFetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : { 'X-Tenant-Id': TND }),
      ...options.headers,
    },
  })
  if (res.status === 401 && token) {
    // Token inválido o vencido: cerramos la sesión para que la UI vuelva al estado no-logueado
    // en vez de quedar mostrando errores 401 silenciosos en cada llamada autenticada.
    tokenStore.clear()
    window.dispatchEvent(new Event('auth:expired'))
  }
  if (!res.ok) await throwWithBackendMessage(res)
  if (res.status === 204) return null
  return res.json().catch(() => null)
}
