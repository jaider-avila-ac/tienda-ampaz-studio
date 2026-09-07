import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { addItem, clearCarrito, getCarrito, removeItem, updateItem } from '../services/cartService'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [cart, setCart] = useState([])
  const [total, setTotal] = useState(0)
  const [count, setCount] = useState(0)
  const [shipping, setShipping] = useState(0)
  const [shippingContraEntrega, setShippingContraEntrega] = useState(false)
  const [grandTotal, setGrandTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [freeShip, setFreeShip] = useState({ activo: false, desde: 0, alcanzado: false, faltante: 0, progreso: 0 })

  const applyCarrito = (data) => {
    setCart(data.items)
    setTotal(data.total)
    setCount(data.count)
    setShipping(data.shipping)
    setShippingContraEntrega(data.shippingContraEntrega)
    setGrandTotal(data.grandTotal)
    setFreeShip(data.freeShip)
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setCart([])
      setTotal(0)
      setCount(0)
      return
    }
    let alive = true
    setLoading(true)
    getCarrito()
      .then((data) => { if (alive) applyCarrito(data) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [isAuthenticated])

  const addToCart = async (item) => {
    const data = await addItem({
      productId: item.productId,
      talla: item.variantes?.Talla,
      color: item.variantes?.Color,
      cantidad: item.cantidad ?? 1,
    })
    applyCarrito(data)
  }

  const updateQty = async (key, cantidad) => {
    try {
      const data = await updateItem(key, cantidad)
      applyCarrito(data)
    } catch (err) {
      // El backend ahora revalida stock en cada PUT (antes no lo hacía) — si el stock bajó
      // entre que se pintó el carrito y el click (otra compra, otra pestaña), esto puede
      // rechazar el +1 con 400. Se refresca el carrito real en vez de dejar la UI desincronizada.
      const fresh = await getCarrito().catch(() => null)
      if (fresh) applyCarrito(fresh)
      throw err
    }
  }

  const removeFromCart = async (key) => {
    const data = await removeItem(key)
    applyCarrito(data)
  }

  const clearCart = async () => {
    const data = await clearCarrito()
    applyCarrito(data)
  }

  // Tras un pago aprobado el backend ya vació carrito_items por su cuenta
  // (ver PagoConfirmacionService) — esto solo refresca el estado local para reflejarlo.
  const refreshCart = async () => {
    if (!isAuthenticated) return
    const data = await getCarrito()
    applyCarrito(data)
  }

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, refreshCart, total, shipping, shippingContraEntrega, grandTotal, count, loading, freeShip }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
