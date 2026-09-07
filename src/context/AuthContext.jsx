import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { tokenStore } from '../services/tokenStore'
import { authService } from '../services/authService'
import { clearIdempotencyKey } from '../services/checkoutIntent'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => tokenStore.getUser())
  const [isAuthenticated, setIsAuthenticated] = useState(() => tokenStore.isLoggedIn())

  const login = useCallback((data) => {
    if (data?.token) tokenStore.set(data.token, data)
    setUser(tokenStore.getUser())
    setIsAuthenticated(tokenStore.isLoggedIn())
  }, [])

  const logout = useCallback(async () => {
    // Invalida el token en el backend (best-effort) antes de borrarlo localmente —
    // si no, seguiría siendo válido hasta su vencimiento aunque alguien más lo tuviera.
    await authService.logout()
    tokenStore.clear()
    // La Idempotency-Key de checkout está en sessionStorage, atada solo a dirección/carrito, no
    // a quién está logueado (ver checkoutIntent.js) — si no se limpia acá, alguien que cierra
    // sesión y entra con OTRA cuenta en la misma pestaña puede heredar una clave de un intento de
    // pago de la cuenta anterior, y Wompi la rechaza por referencia ya usada al reintentar.
    clearIdempotencyKey()
    setUser(null)
    setIsAuthenticated(false)
  }, [])

  // El token pudo vencer/invalidarse entre requests (ver fetchAuth en services/api.js);
  // cuando eso pasa cerramos sesión en vez de dejar la UI mostrando 401 repetidos.
  useEffect(() => {
    window.addEventListener('auth:expired', logout)
    return () => window.removeEventListener('auth:expired', logout)
  }, [logout])

  return (
    <AuthCtx.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
