import { fetchAuth } from './api'
import { tokenStore } from './tokenStore'
import { adaptProduct } from './productService'

// Solo registra si el usuario está logueado
export async function registrarEvento(tipo, entidadTipo, entidadId) {
  if (!tokenStore.isLoggedIn()) return
  try {
    await fetchAuth('/eventos', {
      method: 'POST',
      body: JSON.stringify({ tipo, entidad_tipo: entidadTipo, entidad_id: entidadId }),
    })
  } catch {
    // Silencioso — los eventos no deben bloquear la UI
  }
}

export async function getRecientesDB(limit = 8) {
  if (!tokenStore.isLoggedIn()) return []
  try {
    const data = await fetchAuth(`/eventos/recientes?limit=${limit}`)
    return Array.isArray(data) ? data.map(adaptProduct) : []
  } catch {
    return []
  }
}

export async function getCategoriaFavoritaDB() {
  if (!tokenStore.isLoggedIn()) return null
  try {
    const data = await fetchAuth('/eventos/categoria-favorita')
    return data && data.id ? data : null
  } catch {
    return null
  }
}
