import { fetchPublic } from './api'

export async function getTiendaConfig() {
  try {
    return await fetchPublic('/tienda/config')
  } catch {
    return { envio_gratis_activo: true, envio_gratis_desde: 200000 }
  }
}
