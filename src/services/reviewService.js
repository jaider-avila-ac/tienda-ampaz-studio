import { fetchPublic, fetchAuth } from './api'

function adaptResena(r) {
  return {
    id:          r.id,
    calificacion: r.calificacion,
    titulo:      r.titulo,
    cuerpo:      r.cuerpo,
    autor:       r.autor,
    creadoEn:    r.creado_en,
  }
}

export async function getResenas(prdId) {
  const data = await fetchPublic(`/productos/${prdId}/resenas`)
  return {
    ratingPromedio: data?.rating_promedio ?? null,
    totalResenas:   data?.total_resenas ?? 0,
    distribucion:   data?.distribucion ?? [],
    items:          (data?.items ?? []).map(adaptResena),
  }
}

export async function getEstadoResena(prdId) {
  const data = await fetchAuth(`/productos/${prdId}/resenas/estado`)
  return { compro: Boolean(data?.compro), yaReseno: Boolean(data?.ya_reseno) }
}

export async function crearResena(prdId, { calificacion, titulo, cuerpo }) {
  const data = await fetchAuth(`/productos/${prdId}/resenas`, {
    method: 'POST',
    body: JSON.stringify({ calificacion, titulo, cuerpo }),
  })
  return adaptResena(data)
}
