import { fetchPublic } from './api'

// Mapa local de emojis por slug (no existe en la DB)
const EMOJI_MAP = {
  mujer:       '👠',
  hombre:      '👞',
  ninos:       '👟',
  ropa:        '👗',
  sandalias:   '🩴',
  accesorios:  '👜',
}

function adaptCategory(c) {
  return {
    id:           c.id,
    nombre:       c.nombre,
    slug:         c.slug,
    imagenUrl:    c.imagen_url,
    subcategorias: c.subcategorias ?? [],
    emoji:        EMOJI_MAP[c.slug] ?? '🛍️',
  }
}

// Caché de módulo: una sola petición en toda la sesión
let _cache = null
let _promise = null

async function loadCategories() {
  if (_cache) return _cache
  if (!_promise) _promise = fetchPublic('/categorias').then((data) => {
    _cache = Array.isArray(data) ? data.map(adaptCategory) : []
    return _cache
  })
  return _promise
}

export async function getCategories() {
  return loadCategories()
}

export async function getCategoryById(id) {
  const list = await loadCategories()
  return list.find((c) => c.id === Number(id)) ?? null
}

// Todas las categorías con al menos subcategorías (se usa en sidebar y home)
export async function getActiveCategories() {
  const list = await loadCategories()
  return list.filter((c) => c.subcategorias.length >= 0) // todas las activas vienen de la API
}
