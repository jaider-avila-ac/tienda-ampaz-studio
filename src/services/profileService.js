import { fetchAuth } from './api'

export const EMPTY_PROFILE = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  tipoDocumento: 'CC',
  numeroDocumento: '',
  aceptaPromo: true,
  direcciones: [],
}

function normalizeDireccion(d = {}) {
  return {
    id: d.id,
    direccion: d.direccion ?? '',
    complemento: d.complemento ?? '',
    departamento: d.departamento ?? '',
    municipio: d.municipio ?? '',
    barrio: d.barrio ?? '',
    apartamento: d.apartamento ?? '',
    contactoNombre: d.contacto_nombre ?? d.contactoNombre ?? '',
    contactoTelefono: d.contacto_telefono ?? d.contactoTelefono ?? '',
  }
}

function normalizeProfile(data = {}) {
  return {
    ...EMPTY_PROFILE,
    id: data.id,
    nombre: data.nombre ?? '',
    apellido: data.apellido ?? '',
    email: data.email ?? '',
    telefono: data.telefono ?? '',
    tipoDocumento: data.tipo_documento ?? data.tipoDocumento ?? 'CC',
    numeroDocumento: data.numero_documento ?? data.numeroDocumento ?? '',
    aceptaPromo: data.acepta_promo ?? data.aceptaPromo ?? true,
    direcciones: Array.isArray(data.direcciones) ? data.direcciones.map(normalizeDireccion) : [],
  }
}

// aceptaPromo se manda solo si viene explícito (true/false) — así los formularios que no tocan
// esta preferencia (datos personales, direcciones) no la pisan sin querer (ver COALESCE en
// TiendaClientePerfilService.updatePerfil, que conserva el valor guardado cuando llega null).
function toProfilePayload(data = {}) {
  return {
    nombre: data.nombre ?? '',
    apellido: data.apellido ?? '',
    telefono: data.telefono ?? '',
    tipo_documento: data.tipoDocumento ?? 'CC',
    numero_documento: data.numeroDocumento ?? '',
    acepta_promo: typeof data.aceptaPromo === 'boolean' ? data.aceptaPromo : null,
  }
}

function toDireccionPayload(data = {}) {
  return {
    direccion: data.direccion ?? '',
    complemento: data.complemento ?? '',
    departamento: data.departamento ?? '',
    municipio: data.municipio ?? '',
    barrio: data.barrio ?? '',
    apartamento: data.apartamento ?? '',
    contacto_nombre: data.contactoNombre ?? '',
    contacto_telefono: data.contactoTelefono ?? '',
  }
}

export async function getProfile() {
  return normalizeProfile(await fetchAuth('/clientes/me'))
}

export async function saveProfile(data) {
  return normalizeProfile(await fetchAuth('/clientes/me', {
    method: 'PUT',
    body: JSON.stringify(toProfilePayload(data)),
  }))
}

export async function changePassword({ actual, nueva }) {
  return fetchAuth('/clientes/me/password', {
    method: 'PUT',
    body: JSON.stringify({ password_actual: actual, password_nueva: nueva }),
  })
}

export async function getDirecciones() {
  const profile = await getProfile()
  return profile.direcciones
}

export async function addDireccion(data) {
  const rows = await fetchAuth('/clientes/me/direcciones', {
    method: 'POST',
    body: JSON.stringify(toDireccionPayload(data)),
  })
  return rows.map(normalizeDireccion)
}

export async function updateDireccion(id, data) {
  const rows = await fetchAuth(`/clientes/me/direcciones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toDireccionPayload(data)),
  })
  return rows.map(normalizeDireccion)
}

export async function deleteDireccion(id) {
  const rows = await fetchAuth(`/clientes/me/direcciones/${id}`, { method: 'DELETE' })
  return rows.map(normalizeDireccion)
}
