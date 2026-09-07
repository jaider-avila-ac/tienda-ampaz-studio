import { fetchPublic } from './api'
import { getPersisted, setPersisted } from '../utils/persistentCache'

// Adapta la respuesta de la API pública al formato que espera la tienda
export function adaptProduct(p) {
  return {
    id:             p.id,
    nombre:         p.nombre,
    slug:           p.slug,
    descripcion:    p.descripcion,
    precio:         p.precio,          // precio base (tachado cuando hay descuento)
    precioFinal:    p.precio_final,    // precio real a cobrar — ya viene calculado del backend
    descuento:      p.descuento ?? 0,  // % — solo para el badge, nunca para calcular el precio
    marca:          p.marca,
    genero:         p.genero,
    categoriaId:    p.categoria_id,
    categoriaNombre: p.categoria_nombre,
    subcategoria:   p.subcategoria,
    etiquetas:      p.etiquetas ?? [],
    activo:         p.activo,
    // imagenes viene como [{url, var_id}] desde el backend
    imagenes:       (p.imagenes ?? []).map((img) =>
      typeof img === 'string' ? { url: img, varId: null } : { url: img.url, varId: img.var_id ?? null }
    ),
    tallas:         p.tallas ?? [],
    variantes:      (p.variantes ?? []).map((v) => ({
      nombre:    v.nombre,
      tipo:      v.tipo,
      requerido: v.requerido,
      opciones:  (v.opciones ?? []).map((o) => ({
        valor:      o.valor,
        stock:      o.stock,
        hex:        o.hex ?? null,
        precioExtra: 0,
        varId:      o.var_id ?? null,  // permite cambiar imagen al seleccionar color
      })),
    })),
    stockVariantes: (p.stock_variantes ?? []).map((v) => ({
      id:    v.id,
      talla: v.talla ?? '',
      color: v.color ?? '',
      stock: v.stock ?? 0,
    })),
    stockTotal:      p.stock_total ?? 0,
    video:           p.video ?? null,
    caracteristicas: p.caracteristicas ?? {},
    ratingPromedio: p.rating_promedio ?? null,
    totalResenas:   p.total_resenas ?? 0,
  }
}

// Caché del listado completo — se persiste en localStorage (si el navegador lo permite)
// para que una visita nueva pinte de inmediato con lo último visto, y siempre se
// refresca en segundo plano contra el servidor (stale-while-revalidate).
const ALL_CACHE_KEY = 'productos:all'
let _cache = getPersisted(ALL_CACHE_KEY) ?? null
let _promise = null
const _listeners = new Set()

function notifyAll() {
  _listeners.forEach((fn) => fn(_cache))
}

export function subscribeProducts(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

export function getProductsSnapshot() {
  return _cache
}

function fetchAllFresh() {
  if (_promise) return _promise
  _promise = fetchPublic('/productos')
    .then((data) => {
      _cache = Array.isArray(data) ? data.map(adaptProduct) : []
      setPersisted(ALL_CACHE_KEY, _cache)
      notifyAll()
      return _cache
    })
    .finally(() => { _promise = null })
  return _promise
}

async function loadAll() {
  return _cache ?? fetchAllFresh()
}

export async function getProducts() {
  if (_cache) {
    fetchAllFresh().catch(() => {}) // refresca en 2do plano; si falla (ej. backend caído),
    return _cache                   // ya se notificó vía 'backend:offline' en services/api.js
  }
  return fetchAllFresh()
}

// Siempre en vivo contra el servidor — nunca se sirve desde caché, para confirmar
// que el producto sigue existiendo/activo justo antes de mostrarlo o comprarlo.
export async function getProductById(id) {
  const data = await fetchPublic(`/productos/${id}`)
  return adaptProduct(data)
}

// Página del catálogo de una categoría — usada por el scroll infinito.
export async function getProductsPage({ catId, q, page = 0, size = 24 } = {}) {
  const params = new URLSearchParams({ page, size })
  if (catId) params.set('catId', catId)
  if (q) params.set('q', q)
  const data = await fetchPublic(`/productos/paginado?${params.toString()}`)
  return {
    content: Array.isArray(data?.content) ? data.content.map(adaptProduct) : [],
    page: data?.page ?? page,
    totalPages: data?.total_pages ?? 0,
    totalElements: data?.total_elements ?? 0,
  }
}

export async function getProductsByCategory(categoriaId, limit) {
  const list = await loadAll()
  const result = list.filter((p) => p.activo && p.categoriaId === Number(categoriaId))
  return limit ? result.slice(0, limit) : result
}

export async function searchProducts(query = '') {
  const q = query.toLowerCase().trim()
  if (!q) return getProducts()
  const list = await loadAll()
  return list.filter(
    (p) =>
      p.activo && (
        p.nombre.toLowerCase().includes(q)         ||
        (p.marca ?? '').toLowerCase().includes(q)  ||
        (p.subcategoria ?? '').toLowerCase().includes(q) ||
        (p.descripcion ?? '').toLowerCase().includes(q)
      )
  )
}

export async function getRelatedProducts(productId, categoriaId, limit = 4) {
  const list = await loadAll()
  return list
    .filter((p) => p.activo && p.id !== Number(productId) && p.categoriaId === Number(categoriaId))
    .slice(0, limit)
}

// Invalida el caché (útil para forzar recarga)
export function clearCache() {
  _cache = null
  _promise = null
}
