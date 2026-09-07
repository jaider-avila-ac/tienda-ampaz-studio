import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, MessageSquareWarning, PackageCheck, Truck } from 'lucide-react'
import { fmt } from '../../../utils/format'
import { pedidoService } from '../../../services/pedidoService'
import { useOrders } from '../../../context/OrdersContext'
import StatusStepper from './StatusStepper'
import DevolucionPanel from './DevolucionPanel'

const ESTADOS_CONFIRMABLES = new Set(['enviado', 'entregado'])

const MOTIVO_CANCELACION_LABEL = {
  producto_agotado: 'Producto agotado',
  producto_inconveniente: 'Producto con inconvenientes',
  error_precio: 'Error en el precio o la publicación',
  envio_imposible: 'Imposibilidad de realizar el envío',
  compra_duplicada: 'Compra duplicada',
  acordado_cliente: 'Solicitud acordada contigo',
  otro: 'Otro motivo',
}

const METODO_PAGO_LABEL = { CARD: 'tarjeta', NEQUI: 'Nequi', PSE: 'PSE', BANCOLOMBIA_TRANSFER: 'transferencia Bancolombia', EFECTIVO: 'efectivo', OTRO: 'el método usado' }

const REEMBOLSO_ESTADO_LABEL = { pendiente: 'Pendiente', en_proceso: 'En proceso', completado: 'Completado', rechazado: 'Rechazado', error: 'Requiere revisión' }

const ESTADO_BADGE = {
  pagado: 'bg-blue-100 text-blue-700',
  preparando: 'bg-gray-100 text-gray-700',
  enviado: 'bg-violet-100 text-violet-700',
  entregado: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-600',
  devuelto: 'bg-orange-100 text-orange-700',
}

const ESTADO_LABEL = {
  pagado: 'Recibido',
  preparando: 'Preparando',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  devuelto: 'Devuelto',
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [errorConfirmar, setErrorConfirmar] = useState('')
  const { reload } = useOrders()
  const badge = ESTADO_BADGE[order.estado] ?? 'bg-gray-100 text-gray-600'

  const puedeConfirmar = ESTADOS_CONFIRMABLES.has(order.estado) && !order.confirmadoClienteEn
  const mostrarCodigo = order.codigoRastreo && order.mostrarSeguimiento !== 'link'
  const mostrarLink = order.linkSeguimiento && order.mostrarSeguimiento !== 'codigo'

  const handleConfirmarRecibido = async () => {
    setConfirmando(true)
    setErrorConfirmar('')
    try {
      await pedidoService.confirmarRecibido(order.id)
      await reload()
    } catch (err) {
      setErrorConfirmar(err.message || 'No se pudo confirmar. Intenta de nuevo.')
      setConfirmando(false)
    }
  }

  return (
    <div className="bg-white border border-gray-100 overflow-hidden">

      {/* Encabezado */}
      <div className="flex flex-wrap items-start gap-3 p-4 sm:p-5">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-sm font-black text-black">#{order.id}</span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 ${badge}`}>
              {ESTADO_LABEL[order.estado] ?? order.estado}
            </span>
          </div>
          <p className="text-xs text-gray-400">{formatDate(order.fecha)}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-base font-black text-black">{fmt(order.total)}</p>
          <p className="text-xs text-gray-400">
            {order.items.length} {order.items.length === 1 ? 'artículo' : 'artículos'}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="px-4 sm:px-5 pb-4 overflow-x-auto no-scrollbar">
        <StatusStepper estado={order.estado} />
      </div>

      {/* Mensaje de la tienda — solo si fue cancelado por el admin (con motivo real, a
          diferencia de un "cancelado" por pago rechazado, que no tiene cancelMotivo) */}
      {order.estado === 'cancelado' && order.cancelMotivo && (
        <div className="mx-4 sm:mx-5 mb-4 p-4 bg-red-50 border border-red-100 space-y-1.5">
          <p className="text-xs font-black text-red-700 flex items-center gap-1.5">
            <MessageSquareWarning size={14} /> Mensaje de la tienda
          </p>
          <p className="text-xs text-red-700">
            Tu pedido fue cancelado. Motivo: <span className="font-semibold">{MOTIVO_CANCELACION_LABEL[order.cancelMotivo] ?? order.cancelMotivo}</span>
            {order.cancelMotivoOtro && ` — ${order.cancelMotivoOtro}`}
          </p>
          {order.cancelNota && <p className="text-xs text-red-600">{order.cancelNota}</p>}
          <p className="text-[11px] text-red-400">Cancelado el {formatDate(order.canceladoEn)}</p>

          {order.reembolso && (
            <div className="pt-1.5 mt-1.5 border-t border-red-200 text-xs text-red-700 space-y-0.5">
              <p>
                Reembolso: <span className="font-semibold">{REEMBOLSO_ESTADO_LABEL[order.reembolso.estado] ?? order.reembolso.estado}</span>
                {' '}({fmt(order.reembolso.monto)}{order.metodoPago ? ` a ${METODO_PAGO_LABEL[order.metodoPago] ?? order.metodoPago}` : ''})
              </p>
              {order.reembolso.estado === 'completado' && order.reembolso.confirmadoEn && (
                <p className="text-red-500">Confirmado el {formatDate(order.reembolso.confirmadoEn)}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Transportadora, código de rastreo y/o link + confirmar recibido */}
      {(mostrarCodigo || mostrarLink || puedeConfirmar || order.confirmadoClienteEn) && (
        <div className="px-4 sm:px-5 pb-3 flex flex-wrap items-center gap-2">
          {mostrarCodigo && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 px-3 py-1.5">
              <Truck size={13} />
              {order.transportadora ? `${order.transportadora}: ` : ''}{order.codigoRastreo}
            </span>
          )}
          {mostrarLink && (
            <a
              href={order.linkSeguimiento}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-black border border-gray-200 px-3 py-1.5 hover:border-black transition-colors"
            >
              <Truck size={13} /> Rastrear pedido
            </a>
          )}

          {puedeConfirmar && (
            <button
              type="button"
              onClick={handleConfirmarRecibido}
              disabled={confirmando}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-black px-3 py-1.5 hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              {confirmando
                ? <><Loader2 size={13} className="animate-spin" /> Confirmando…</>
                : <><PackageCheck size={13} /> Confirmar que ya lo recibí</>
              }
            </button>
          )}

          {order.confirmadoClienteEn && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
              <CheckCircle2 size={13} /> Recibido confirmado
            </span>
          )}
        </div>
      )}
      {errorConfirmar && (
        <p className="px-4 sm:px-5 pb-3 text-xs text-red-600">{errorConfirmar}</p>
      )}

      <DevolucionPanel numero={order.id} estadoPedido={order.estado} />

      {/* Miniaturas */}
      <div className="px-4 sm:px-5 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {order.items.slice(0, 5).map((item, i) => (
          // Si el producto ya no existe (se borró), no hay a dónde llevar el click — se ve
          // igual pero sin el link, en vez de mandar a /producto/null.
          item.productId ? (
            <Link
              key={i}
              to={`/producto/${item.productId}`}
              className="flex-shrink-0 w-14 h-14 overflow-hidden bg-gray-50 border border-gray-100 hover:border-gray-300 transition-colors"
            >
              <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" />
            </Link>
          ) : (
            <div
              key={i}
              title={`${item.nombre} — Ya no disponible`}
              className="flex-shrink-0 w-14 h-14 overflow-hidden bg-gray-50 border border-gray-100 relative"
            >
              <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover opacity-60" />
            </div>
          )
        ))}
        {order.items.length > 5 && (
          <div className="flex-shrink-0 w-14 h-14 bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
            +{order.items.length - 5}
          </div>
        )}
      </div>

      {/* Toggle detalle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-gray-100 text-xs font-semibold text-gray-500 hover:text-black hover:bg-gray-50 transition-colors"
      >
        {expanded
          ? <><ChevronUp size={13} /> Ocultar detalle</>
          : <><ChevronDown size={13} /> Ver detalle</>}
      </button>

      {/* Detalle expandido */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 sm:px-5 py-4 space-y-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex gap-3 items-center">
              <img
                src={item.imagen}
                alt={item.nombre}
                className="w-12 h-12 object-cover bg-gray-50 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-black line-clamp-1">{item.nombre}</p>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                  {Object.entries(item.variantes ?? {}).map(([k, v]) => (
                    <span key={k} className="text-xs text-gray-400">{k}: {v}</span>
                  ))}
                  <span className="text-xs text-gray-400">×{item.cantidad}</span>
                  {!item.productId && (
                    <span className="text-xs text-gray-400 italic">Ya no disponible</span>
                  )}
                </div>
              </div>
              <p className="text-sm font-bold text-black flex-shrink-0">
                {fmt(item.subtotal)}
              </p>
            </div>
          ))}

          <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Envío</span>
              <span className={order.envio === 0 ? 'text-accent font-semibold' : ''}>
                {order.envioContraEntrega ? 'Pagado contra entrega' : order.envio === 0 ? 'Gratis' : fmt(order.envio)}
              </span>
            </div>
            <div className="flex justify-between font-black text-black pt-1 border-t border-gray-100">
              <span>Total</span><span>{fmt(order.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
