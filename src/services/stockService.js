// ── Stock en vivo ──────────────────────────────────────────────────────────────
// Se inicializa desde la API cuando se carga un producto y persiste en localStorage.

import { fetchAuth } from './api'

const KEY          = 'ampaz_studio_stock'
const KEY_VARIANTS = 'ampaz_studio_stock_variants' // productId -> nombre de la variante de stock
const KEY_COMBO_DIMENSIONS = 'ampaz_studio_stock_combo_dimensions' // productId -> ["Talla", "Color"]

// Determina qué variante controla el stock para un producto dado.
// Prioridad: talla > color con stock por opción > nivel de producto.
function stockVarianteOf(product) {
  if (!product) return null
  return (
    product.variantes?.find((v) => v.tipo === 'talla') ??
    product.variantes?.find((v) => v.tipo === 'color' && v.opciones[0]?.stock !== undefined) ??
    null
  )
}

function initStock() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return {}
}

function loadVariantMap() {
  try {
    const saved = localStorage.getItem(KEY_VARIANTS)
    if (saved) return JSON.parse(saved)
  } catch {}
  return {}
}

function loadComboDimensions() {
  try {
    const saved = localStorage.getItem(KEY_COMBO_DIMENSIONS)
    if (saved) return JSON.parse(saved)
  } catch {}
  return {}
}

function comboDimensionsOf(product) {
  const combos = product?.stockVariantes ?? []
  const dims = []
  if (combos.some((v) => v.talla)) dims.push('Talla')
  if (combos.some((v) => v.color)) dims.push('Color')
  return dims
}

function comboKey(productId, dims, variantes) {
  const values = dims.map((dim) => variantes?.[dim])
  if (values.some((value) => !value)) return null
  return `${productId}-combo-${values.join('|')}`
}

// Clave única para una combinación producto+variante seleccionada.
// Retorna null si la variante que controla el stock aún no fue seleccionada.
function buildKey(productId, variantes) {
  const variantMap = loadVariantMap()
  const comboDimensions = loadComboDimensions()
  const comboDims = comboDimensions[String(productId)]
  if (Array.isArray(comboDims) && comboDims.length > 0) {
    return comboKey(productId, comboDims, variantes)
  }

  const svNombre   = variantMap[String(productId)]
  if (svNombre !== undefined) {
    if (svNombre) {
      const val = variantes?.[svNombre]
      return val ? `${productId}-${svNombre}-${val}` : null
    }
    return `${productId}-product`
  }
  return null
}

// ── API pública ──────────────────────────────────────────────────────────────

/** Carga el stock de un producto desde datos de la API y lo persiste en localStorage.
 *  Llamar al cargar ProductDetailPage para tener stock real. */
export function initStockFromProduct(product) {
  const map        = initStock()
  const variantMap = loadVariantMap()
  const comboDimensions = loadComboDimensions()
  const comboDims = comboDimensionsOf(product)

  if (comboDims.length > 0) {
    comboDimensions[String(product.id)] = comboDims
    ;(product.stockVariantes ?? []).forEach((v) => {
      const values = comboDims.map((dim) => dim === 'Talla' ? v.talla : v.color)
      if (values.every(Boolean)) {
        map[`${product.id}-combo-${values.join('|')}`] = v.stock ?? 0
      }
    })
    localStorage.setItem(KEY, JSON.stringify(map))
    localStorage.setItem(KEY_COMBO_DIMENSIONS, JSON.stringify(comboDimensions))
    return
  }

  delete comboDimensions[String(product.id)]
  const sv         = stockVarianteOf(product)

  variantMap[String(product.id)] = sv?.nombre ?? null

  if (sv) {
    sv.opciones.forEach((o) => {
      map[`${product.id}-${sv.nombre}-${o.valor}`] = o.stock ?? 0
    })
  } else {
    map[`${product.id}-product`] = 0
  }

  localStorage.setItem(KEY,          JSON.stringify(map))
  localStorage.setItem(KEY_VARIANTS, JSON.stringify(variantMap))
  localStorage.setItem(KEY_COMBO_DIMENSIONS, JSON.stringify(comboDimensions))
}

/** Stock disponible para un producto con las variantes dadas.
 *  Retorna null si la variante que controla el stock no está seleccionada aún. */
export function getStock(productId, variantes) {
  const map = initStock()
  const key = buildKey(productId, variantes)
  if (key === null) return null
  return map[key] ?? 0
}

// ── Validación en tiempo real contra la API ──────────────────────────────────

/** Valida los ítems del carrito contra el stock real en la DB.
 *  Retorna null si falla la API (usar getStock como fallback). */
export async function validateCart(cartItems) {
  if (!cartItems || cartItems.length === 0) return []
  try {
    const results = await fetchAuth('/carrito/validar', {
      method: 'POST',
      body: JSON.stringify({
        items: cartItems.map((item) => ({
          product_id: item.productId,
          talla: item.variantes?.['Talla'] ?? null,
          color: item.variantes?.['Color'] ?? null,
          cantidad: item.cantidad,
        })),
      }),
    })
    return Array.isArray(results) ? results : null
  } catch {
    return null
  }
}
