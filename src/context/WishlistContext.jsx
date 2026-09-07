import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { wishlistService } from '../services/wishlistService'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [ids, setIds] = useState([])

  useEffect(() => {
    if (!isAuthenticated) {
      setIds([])
      return undefined
    }
    let alive = true
    wishlistService.listIds().then((data) => { if (alive) setIds(data ?? []) }).catch(() => {})
    return () => { alive = false }
  }, [isAuthenticated])

  const isFavorito = useCallback((prdId) => ids.includes(Number(prdId)), [ids])

  // Actualiza el estado local de inmediato (UI instantánea) y revierte si la llamada falla.
  const toggle = useCallback(async (prdId) => {
    const id = Number(prdId)
    const yaEstaba = ids.includes(id)
    setIds((prev) => (yaEstaba ? prev.filter((x) => x !== id) : [...prev, id]))
    try {
      if (yaEstaba) await wishlistService.remove(id)
      else await wishlistService.add(id)
    } catch {
      setIds((prev) => (yaEstaba ? [...prev, id] : prev.filter((x) => x !== id)))
    }
  }, [ids])

  return (
    <WishlistContext.Provider value={{ ids, isFavorito, toggle }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
