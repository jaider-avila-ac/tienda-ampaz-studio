// Persiste la Idempotency-Key de un intento de pago en sessionStorage, atada a una firma estable
// de la intención (dirección + método + contenido del carrito) — así sobrevive a que la respuesta
// se pierda por timeout/corte de red y a una recarga de página, en vez de perderse apenas el
// componente vuelve a montar (ver TERCERA_AUDITORIA_FUNCIONAL_E_IDEMPOTENCIA.md, hallazgo I-02).
//
// Se limpia cuando el intento llega a un resultado DEFINITIVO (ver PedidoResultadoPage/CartPage),
// pero además — comparado contra el proyecto zampy, que jamás reutiliza una referencia de Wompi
// y por eso nunca pisa este problema — la clave expira sola pasados unos minutos aunque nada la
// haya limpiado explícitamente: sin este límite, cualquier caso no contemplado (cerrar la pestaña
// de Wompi a medias, probar varias veces seguidas, etc.) deja al cliente reintentando para
// siempre con una referencia que Wompi ya cerró, sin ninguna forma de salir de ahí.
const STORAGE_KEY = 'checkout_idempotency_v1'
const MAX_EDAD_MS = 3 * 60 * 1000 // 3 min — mismo margen que el polling de PedidoResultadoPage

function firmaIntencion({ direccionId, metodo, cart }) {
  const items = [...(cart ?? [])]
    .map((item) => `${item.itemId ?? item.id}:${item.cantidad}`)
    .sort()
    .join(',')
  return `${direccionId}|${metodo}|${items}`
}

export function getOrCreateIdempotencyKey({ direccionId, metodo, cart }) {
  const firma = firmaIntencion({ direccionId, metodo, cart })
  let guardado = null
  try {
    guardado = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    guardado = null
  }
  const vigente = guardado && guardado.firma === firma && guardado.key
    && typeof guardado.creadoEn === 'number' && (Date.now() - guardado.creadoEn) < MAX_EDAD_MS
  if (vigente) return guardado.key

  const key = crypto.randomUUID()
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ firma, key, creadoEn: Date.now() }))
  return key
}

export function clearIdempotencyKey() {
  sessionStorage.removeItem(STORAGE_KEY)
}
