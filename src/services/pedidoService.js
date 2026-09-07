import { fetchAuth } from './api'
import { tokenStore } from './tokenStore'

const BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/public`

export const pedidoService = {
  // idempotencyKey: obligatorio — el llamador lo genera (crypto.randomUUID()) y lo conserva
  // mientras dure ese intento de pago concreto. Ver CartPage.jsx (mutex + generación) y
  // IdempotenciaGuard en el backend: sin esta clave el backend rechaza la solicitud.
  checkoutHospedado: (direccionId, idempotencyKey) =>
    fetchAuth('/pedidos/checkout', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ direccion_id: direccionId }),
    }),

  checkoutTarjeta: ({ direccionId, cardToken, acceptanceToken, personalAuthToken, idempotencyKey }) =>
    fetchAuth('/pedidos/checkout/tarjeta', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({
        direccion_id: direccionId,
        card_token: cardToken,
        acceptance_token: acceptanceToken,
        personal_auth_token: personalAuthToken,
      }),
    }),

  misCompras: () => fetchAuth('/pedidos'),

  estadoPedido: (numero) => fetchAuth(`/pedidos/${numero}`),

  confirmarRecibido: (numero) => fetchAuth(`/pedidos/${numero}/confirmar-recibido`, { method: 'POST' }),

  crearDevolucion: (numero, { motivo, fotoUrls }) =>
    fetchAuth(`/pedidos/${numero}/devolucion`, {
      method: 'POST',
      body: JSON.stringify({ motivo, foto_urls: fotoUrls }),
    }),

  getDevolucion: (numero) => fetchAuth(`/pedidos/${numero}/devolucion`),

  registrarCodigoRastreoDevolucion: (numero, codigo) =>
    fetchAuth(`/pedidos/${numero}/devolucion/codigo-rastreo`, {
      method: 'PATCH',
      body: JSON.stringify({ codigo }),
    }),

  cancelarDevolucion: (numero) =>
    fetchAuth(`/pedidos/${numero}/devolucion/cancelar`, { method: 'POST' }),
}

// Multipart: no puede pasar por fetchAuth (siempre fija Content-Type: application/json,
// lo que rompe el boundary del multipart) — fetch directo, mismo patrón que wompiService.js.
export async function uploadFotoDevolucion(file, numeroPedido) {
  const token = tokenStore.getToken()
  const fd = new FormData()
  fd.append('file', file)
  fd.append('numeroPedido', numeroPedido)
  // Igual criterio que fetchAuth en api.js: con token real, el JWT ya identifica la tienda —
  // mandar X-Tenant-Id junto a él arriesga un 403 si el respaldo de dev local no coincide.
  const res = await fetch(`${BASE}/upload/devolucion`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : { 'X-Tenant-Id': import.meta.env.VITE_TENANT_ID || '1' },
    body: fd,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.message || 'No se pudo subir la foto'), { status: res.status })
  return data.url
}
