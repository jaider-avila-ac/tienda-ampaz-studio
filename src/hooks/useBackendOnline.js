import { useEffect, useState } from 'react'

// Refleja si el backend respondió a la última petición o no (ver services/api.js,
// que dispara 'backend:offline'/'backend:online' en cada fetch). Útil para dejar de
// mostrar datos cacheados como si fueran en vivo cuando el servidor está caído.
export function useBackendOnline() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const goOffline = () => setOnline(false)
    const goOnline = () => setOnline(true)
    window.addEventListener('backend:offline', goOffline)
    window.addEventListener('backend:online', goOnline)
    return () => {
      window.removeEventListener('backend:offline', goOffline)
      window.removeEventListener('backend:online', goOnline)
    }
  }, [])

  return online
}
