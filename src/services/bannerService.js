import { fetchPublic } from './api'

function adaptBanner(b) {
  return {
    id:      b.id,
    tipo:    b.tipo,
    url:     b.url,
    titulo:  b.titulo,
    ctaLink: b.cta_link,
  }
}

export async function getBanners(posicion) {
  const data = await fetchPublic(`/banners?posicion=${posicion}`)
  return Array.isArray(data) ? data.map(adaptBanner) : []
}
