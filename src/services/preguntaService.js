import { fetchAuth } from './api'

function adaptPregunta(p) {
  return {
    id:             p.id,
    texto:          p.texto,
    editada:        Boolean(p.editada),
    autor:          p.autor_nombre,
    esMia:          Boolean(p.es_mia),
    respuestaTexto: p.respuesta_texto,
    respondidaEn:   p.respondida_en,
    creadoEn:       p.creado_en,
  }
}

// fetchAuth (no fetchPublic): manda el token si hay sesión — así el backend puede marcar
// "esMia" en las preguntas propias — pero funciona igual sin sesión (el backend acepta el
// listado sin Authorization, ver PreguntaPublicController.extractIdsOpcional).
export async function getPreguntas(prdId) {
  const data = await fetchAuth(`/productos/${prdId}/preguntas`)
  return (Array.isArray(data) ? data : []).map(adaptPregunta)
}

export async function crearPregunta(prdId, texto) {
  const data = await fetchAuth(`/productos/${prdId}/preguntas`, {
    method: 'POST',
    body: JSON.stringify({ texto }),
  })
  return adaptPregunta(data)
}

export async function editarPregunta(prdId, pregId, texto) {
  await fetchAuth(`/productos/${prdId}/preguntas/${pregId}`, {
    method: 'PUT',
    body: JSON.stringify({ texto }),
  })
}

export async function eliminarPregunta(prdId, pregId) {
  await fetchAuth(`/productos/${prdId}/preguntas/${pregId}`, { method: 'DELETE' })
}
