import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { pedidoService } from '../services/pedidoService'

const OrdersContext = createContext(null)

function normalizeOrder(row) {
  return {
    id: row.numero,
    estado: row.estado,
    fecha: row.creado_en,
    subtotal: row.subtotal,
    envio: row.envio,
    envioContraEntrega: row.envio_contra_entrega ?? false,
    total: row.total,
    notas: row.notas,
    alertaStock: row.alerta_stock,
    linkSeguimiento: row.link_seguimiento,
    transportadora: row.transportadora,
    codigoRastreo: row.codigo_rastreo,
    mostrarSeguimiento: row.mostrar_seguimiento ?? 'ambos',
    confirmadoClienteEn: row.confirmado_cliente_en,
    cancelMotivo: row.cancel_motivo,
    cancelMotivoOtro: row.cancel_motivo_otro,
    cancelNota: row.cancel_nota,
    canceladoEn: row.cancelado_en,
    metodoPago: row.metodo_pago,
    reembolso: row.reembolso ? {
      estado: row.reembolso.estado,
      monto: row.reembolso.monto,
      errorMensaje: row.reembolso.error_mensaje,
      creadoEn: row.reembolso.creado_en,
      confirmadoEn: row.reembolso.confirmado_en,
    } : null,
    direccion: row.dir_snapshot,
    items: (row.items ?? []).map((item) => ({
      productId: item.producto_id,
      nombre: item.nombre,
      imagen: item.imagen ?? '',
      variantes: item.variantes ?? {},
      cantidad: item.cantidad,
      precio: item.precio,
      subtotal: item.subtotal,
    })),
  }
}

export function OrdersProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)

  const reload = async () => {
    if (!isAuthenticated) { setOrders([]); return }
    setLoading(true)
    try {
      const rows = await pedidoService.misCompras()
      setOrders((rows ?? []).map(normalizeOrder))
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  return (
    <OrdersContext.Provider value={{ orders, loading, reload }}>
      {children}
    </OrdersContext.Provider>
  )
}

export function useOrders() {
  const ctx = useContext(OrdersContext)
  if (!ctx) throw new Error('useOrders must be used within OrdersProvider')
  return ctx
}
