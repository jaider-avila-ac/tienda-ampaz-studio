// Caché persistente en localStorage — best effort. Si el navegador no lo permite
// (modo privado, cuota llena, storage deshabilitado por el usuario) se degrada a
// caché en memoria sin romper nada: nunca debe tumbar la app por un fallo de storage.
const PREFIX = 'cc:'
const memoryFallback = new Map()

function detectStorage() {
  try {
    const testKey = `${PREFIX}__test__`
    window.localStorage.setItem(testKey, '1')
    window.localStorage.removeItem(testKey)
    return window.localStorage
  } catch {
    return null
  }
}

const storage = typeof window !== 'undefined' ? detectStorage() : null

export function getPersisted(key) {
  const fullKey = PREFIX + key
  try {
    if (storage) {
      const raw = storage.getItem(fullKey)
      return raw ? JSON.parse(raw) : undefined
    }
  } catch {
    // dato corrupto o storage falló a mitad de camino — seguir sin romper
  }
  return memoryFallback.get(fullKey)
}

export function setPersisted(key, value) {
  const fullKey = PREFIX + key
  try {
    if (storage) {
      storage.setItem(fullKey, JSON.stringify(value))
      return
    }
  } catch {
    // cuota llena u otro error — nos quedamos con memoria, no rompe la app
  }
  memoryFallback.set(fullKey, value)
}
