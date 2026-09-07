const KEY = 'ampaz_studio_recientes'
const MAX = 12

function snapshot(product) {
  return {
    id:          product.id,
    nombre:      product.nombre,
    slug:        product.slug,
    precio:      product.precio,
    precioFinal: product.precioFinal,
    descuento:   product.descuento ?? 0,
    imagenes:    product.imagenes ?? [],
    categoriaId: product.categoriaId,
    categoriaNombre: product.categoriaNombre ?? '',
    activo:      product.activo,
    tallas:      product.tallas ?? [],
    variantes:   product.variantes ?? [],
    caracteristicas: product.caracteristicas ?? {},
    etiquetas:   product.etiquetas ?? [],
    marca:       product.marca ?? '',
  }
}

export function addReciente(product) {
  const list = getRecientes().filter((p) => p.id !== product.id)
  const updated = [snapshot(product), ...list].slice(0, MAX)
  try { localStorage.setItem(KEY, JSON.stringify(updated)) } catch {}
}

export function getRecientes(limit = MAX) {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(data) ? data.slice(0, limit) : []
  } catch {
    return []
  }
}

// Categoría que el usuario más ha visitado
export function getCategoriaFavorita() {
  const list = getRecientes()
  if (!list.length) return null
  const freq = {}
  list.forEach((p) => {
    if (p.categoriaId) freq[p.categoriaId] = (freq[p.categoriaId] ?? 0) + 1
  })
  const topId = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0]
  if (!topId) return null
  const ejemplo = list.find((p) => String(p.categoriaId) === topId)
  return { id: Number(topId), nombre: ejemplo?.categoriaNombre ?? '' }
}

export function clearRecientes() {
  try { localStorage.removeItem(KEY) } catch {}
}

// Quita del historial los productos que ya no existen o fueron desactivados,
// y persiste la lista limpia para que no vuelvan a aparecer.
export function pruneRecientes(validIds) {
  const list = getRecientes(MAX).filter((p) => validIds.has(p.id))
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {}
  return list
}
